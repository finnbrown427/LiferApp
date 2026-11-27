import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const API = "https://api.ebird.org/v2";
const REGION_CODE_PATTERN = /^[A-Z0-9]{1,3}(?:-[A-Z0-9]{1,3})*$/;

type TaxonomyEntry = { speciesCode: string; sciName: string };
type Observation = { speciesCode: string };

async function api<T>(apiPath: string, token: string): Promise<T> {
  const response = await fetch(`${API}${apiPath}`, {
    headers: { "X-eBirdApiToken": token },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`eBird API ${response.status} for ${apiPath}`);
  const contentType = response.headers.get("Content-Type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json") && !contentType.includes("text/csv")) {
    throw new Error(`eBird returned unexpected content type "${contentType}" for ${apiPath}`);
  }
  return response.json() as Promise<T>;
}

async function speciesInRegion(
  regionCode: string,
  token: string,
  recentDays?: number,
): Promise<TaxonomyEntry[]> {
  const taxonomy = await api<TaxonomyEntry[]>(
    "/ref/taxonomy/ebird?fmt=json&cat=species",
    token,
  );
  const sciNameByCode = new Map(taxonomy.map(({ speciesCode, sciName }) => [speciesCode, sciName]));
  const codes = recentDays
    ? (
        await api<Observation[]>(
          `/data/obs/${encodeURIComponent(regionCode)}/recent?back=${recentDays}`,
          token,
        )
      ).map((observation) => observation.speciesCode)
    : await api<string[]>(`/product/spplist/${encodeURIComponent(regionCode)}`, token);

  return [...new Set(codes)].flatMap((code) => {
    const sciName = sciNameByCode.get(code);
    return sciName ? [{ speciesCode: code, sciName }] : [];
  });
}

function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      "recent-days": { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  if (values.help || positionals.length < 1 || positionals.length > 2) {
    console.log("Usage: npm run species:export -- REGION_CODE [output.csv] [--recent-days 1-30]");
    process.exit(values.help ? 0 : 1);
  }

  const regionCode = positionals[0].toUpperCase();
  if (!REGION_CODE_PATTERN.test(regionCode)) {
    throw new Error(`Invalid eBird region code: ${regionCode}`);
  }
  let recentDays: number | undefined;
  if (values["recent-days"] !== undefined) {
    recentDays = Number(values["recent-days"]);
    if (!Number.isInteger(recentDays) || recentDays < 1 || recentDays > 30) {
      throw new Error("--recent-days must be an integer from 1 to 30.");
    }
  }

  const token = process.env.EBIRD_API_TOKEN;
  if (!token) throw new Error("Set EBIRD_API_TOKEN in the root .dev.vars file.");

  const species = await speciesInRegion(regionCode, token, recentDays);
  const output = path.resolve(positionals[1] ?? `${regionCode}-species.csv`);
  const csv = [
    "species_code,scientific_name",
    ...species.map(({ speciesCode, sciName }) => `${csvCell(speciesCode)},${csvCell(sciName)}`),
  ].join("\n");
  fs.writeFileSync(output, `${csv}\n`);
  console.log(`Wrote ${species.length} species to ${output}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
