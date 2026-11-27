/**
 * Import licensed iNaturalist photos for eBird species into Supabase Storage.
 *
 * Usage:
 *   npm run images:import -- species.csv
 *   npm run images:import -- species.csv --limit 20
 *   npm run images:import -- species.csv --retry-failed
 *   npm run images:import -- species.csv --refresh-species SPECIES_CODE
 *
 * The CSV must contain species_code and scientific_name columns. Progress and
 * attribution are saved in Supabase, so interrupted runs can be resumed.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const API = "https://api.inaturalist.org/v1";
const USER_AGENT = "liferapp-species-image-importer/1.0";
const BUCKET = "species-images";
const BATCH = 30;
const DEFAULT_ALLOWED = "cc0,cc-by,cc-by-sa";

export interface INatPhoto {
  id?: number;
  license_code?: string | null;
  attribution?: string | null;
  url?: string;
  medium_url?: string;
}

export interface INatTaxon {
  id: number;
  name: string;
  default_photo?: INatPhoto | null;
  taxon_photos?: { photo?: INatPhoto }[];
}

interface TaxaResponse {
  results: INatTaxon[];
}

export type MatchStatus = "matched" | "no_exact_match" | "not_found";
export type PhotoStatus =
  | "ok"
  | "no_photos"
  | "no_permissive_photo"
  | "download_failed"
  | "taxon_missing";

export interface SpeciesRow {
  code: string;
  sci: string;
}

type InatTaxonRow = {
  species_code: string;
  sci_name: string;
  inat_taxon_id: number | null;
  inat_name: string | null;
  match_status: MatchStatus;
  photo_status: PhotoStatus | null;
  checked_at: string | null;
};
type PhotoTodo = Pick<InatTaxonRow, "species_code" | "sci_name" | "inat_taxon_id">;
type PhotoRefresh = {
  speciesCode: string;
  currentPhotoId: string;
  currentStoragePath: string;
};
type SpeciesImageRow = {
  species_code: string;
  sci_name: string;
  source: string;
  source_photo_id: string | null;
  source_url: string | null;
  storage_path: string;
  license_code: string | null;
  attribution: string | null;
  fetched_at: string;
  manual_override: boolean;
};
type Table<Row, Insert, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};
type Database = {
  public: {
    Tables: {
      inat_taxon_map: Table<
        InatTaxonRow,
        Omit<InatTaxonRow, "photo_status"> & { photo_status?: PhotoStatus | null }
      >;
      species_images: Table<
        SpeciesImageRow,
        Omit<SpeciesImageRow, "manual_override"> & { manual_override?: boolean }
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
type Supabase = ReturnType<typeof createClient<Database>>;
let hasProcessingErrors = false;

const now = () => new Date().toISOString();
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const errMsg = (error: unknown) => (error instanceof Error ? error.message : String(error));

const log = {
  info: (message: string) => console.log(`${now()} INFO  ${message}`),
  warn: (message: string) => console.warn(`${now()} WARN  ${message}`),
  error: (message: string) => console.error(`${now()} ERROR ${message}`),
};

/** Minimal CSV parser for quoted fields, escaped quotes, CRLF, and a UTF-8 BOM. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  for (let i = 0; i < text.length; i++) {
    const character = text[i];
    if (inQuotes) {
      if (character === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += character;
      }
    } else if (character === '"') {
      inQuotes = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else {
      cell += character;
    }
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

const csvCell = (value: string) =>
  /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

type Kind = "api" | "dl";

export class Inat {
  private last: Record<Kind, number> = { api: 0, dl: 0 };

  constructor(
    private cacheDir: string,
    private delayMs: Record<Kind, number>,
  ) {}

  private async throttle(kind: Kind): Promise<void> {
    const wait = this.delayMs[kind] - (Date.now() - this.last[kind]);
    if (wait > 0) await sleep(wait);
    this.last[kind] = Date.now();
  }

  private async request(url: string, kind: Kind): Promise<Response> {
    for (let attempt = 0; attempt < 5; attempt++) {
      await this.throttle(kind);
      let response: Response;
      try {
        response = await fetch(url, {
          headers: { "User-Agent": USER_AGENT },
          signal: AbortSignal.timeout(30_000),
        });
      } catch (error) {
        log.warn(`Network error (${errMsg(error)}), retry ${attempt + 1}`);
        await sleep(2 ** attempt * 1000);
        continue;
      }
      if (response.status === 429 || response.status >= 500) {
        const wait = Number(response.headers.get("Retry-After")) || 2 ** (attempt + 1);
        log.warn(`HTTP ${response.status} from ${url}, sleeping ${wait}s`);
        await sleep(wait * 1000);
        continue;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
      return response;
    }
    throw new Error(`Giving up on ${url}`);
  }

  async getJson<T>(
    apiPath: string,
    params: Record<string, string | number> = {},
    cacheKey?: string,
  ): Promise<T> {
    const cacheFile = cacheKey ? path.join(this.cacheDir, `${cacheKey}.json`) : undefined;
    if (cacheFile && fs.existsSync(cacheFile)) {
      return JSON.parse(fs.readFileSync(cacheFile, "utf8")) as T;
    }
    const query = new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)]));
    const url = `${API}/${apiPath}${query.size ? `?${query}` : ""}`;
    const data = (await (await this.request(url, "api")).json()) as T;
    if (cacheFile) {
      fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
      fs.writeFileSync(cacheFile, JSON.stringify(data));
    }
    return data;
  }

  async fetchBytes(url: string): Promise<Buffer> {
    return Buffer.from(await (await this.request(url, "dl")).arrayBuffer());
  }
}

export async function resolveTaxon(
  inat: Inat,
  sciName: string,
): Promise<{ status: MatchStatus; taxonId: number | null; inatName: string | null }> {
  const data = await inat.getJson<TaxaResponse>(
    "taxa",
    { q: sciName, rank: "species", is_active: "true", per_page: 10 },
    `search/${slug(sciName)}`,
  );
  const results = data.results ?? [];
  const exact = results.find((taxon) => taxon.name?.toLowerCase() === sciName.toLowerCase());
  if (exact) return { status: "matched", taxonId: exact.id, inatName: exact.name };
  if (results.length) {
    return { status: "no_exact_match", taxonId: null, inatName: results[0].name ?? null };
  }
  return { status: "not_found", taxonId: null, inatName: null };
}

export function pickPhoto(
  taxon: INatTaxon,
  allowed: Set<string>,
  excludedPhotoIds: ReadonlySet<string> = new Set(),
): { photo: INatPhoto | null; status: "ok" | "no_photos" | "no_permissive_photo" } {
  const candidates: INatPhoto[] = [];
  if (taxon.default_photo) candidates.push(taxon.default_photo);
  for (const taxonPhoto of taxon.taxon_photos ?? []) {
    if (taxonPhoto.photo) candidates.push(taxonPhoto.photo);
  }

  const seen = new Set<number | undefined>();
  for (const photo of candidates) {
    if (seen.has(photo.id)) continue;
    seen.add(photo.id);
    if (photo.id != null && excludedPhotoIds.has(String(photo.id))) continue;
    if (allowed.has((photo.license_code ?? "").toLowerCase())) return { photo, status: "ok" };
  }
  return { photo: null, status: seen.size ? "no_permissive_photo" : "no_photos" };
}

export function photoUrl(photo: INatPhoto): string {
  if (photo.medium_url) return photo.medium_url;
  if (!photo.url) throw new Error("iNaturalist photo does not contain an image URL.");
  return photo.url.replace("square", "medium");
}

async function saveImage(content: Buffer, maxWidth: number): Promise<Buffer> {
  return sharp(content)
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
}

export function readSpecies(file: string): SpeciesRow[] {
  const rows = parseCsv(fs.readFileSync(file, "utf8"));
  if (!rows.length) throw new Error("Species CSV is empty.");
  const header = rows[0].map((value) => value.trim().toLowerCase().replace(/ /g, "_"));
  const codeIndex = header.findIndex((value) => value === "species_code" || value === "speciescode");
  const sciIndex = header.findIndex((value) => value === "scientific_name" || value === "sciname");
  if (codeIndex < 0 || sciIndex < 0) {
    throw new Error("CSV must have species_code and scientific_name columns.");
  }

  const seen = new Set<string>();
  const species: SpeciesRow[] = [];
  for (const values of rows.slice(1)) {
    const code = (values[codeIndex] ?? "").trim();
    const sci = (values[sciIndex] ?? "").trim();
    if (code && sci && !seen.has(code)) {
      seen.add(code);
      species.push({ code, sci });
    }
  }
  return species;
}

export async function stepResolve(
  db: Supabase,
  inat: Inat,
  species: SpeciesRow[],
): Promise<void> {
  const [knownResult, protectedResult] = await Promise.all([
    db.from("inat_taxon_map").select("species_code"),
    db.from("species_images").select("species_code").eq("manual_override", true),
  ]);
  if (knownResult.error) throw new Error(`Could not read taxon progress: ${knownResult.error.message}`);
  if (protectedResult.error) throw new Error(`Could not read manual images: ${protectedResult.error.message}`);

  const known = new Set((knownResult.data ?? []).map((row) => row.species_code));
  const protectedCodes = new Set((protectedResult.data ?? []).map((row) => row.species_code));
  const todo = species.filter((item) => !known.has(item.code) && !protectedCodes.has(item.code));
  log.info(
    `Step 1: resolving ${todo.length} taxa (${known.size} already done, ${protectedCodes.size} manual overrides skipped)`,
  );

  for (const [index, item] of todo.entries()) {
    try {
      const { status, taxonId, inatName } = await resolveTaxon(inat, item.sci);
      const { error } = await db.from("inat_taxon_map").upsert(
        {
          species_code: item.code,
          sci_name: item.sci,
          inat_taxon_id: taxonId,
          inat_name: inatName,
          match_status: status,
          checked_at: now(),
        },
        { onConflict: "species_code" },
      );
      if (error) throw new Error(error.message);
      if (status !== "matched") log.warn(`${item.code} (${item.sci}): ${status} -> ${inatName}`);
    } catch (error) {
      hasProcessingErrors = true;
      log.error(`Lookup failed for ${item.sci}: ${errMsg(error)}`);
    }
    if ((index + 1) % 100 === 0) log.info(`  resolved ${index + 1}/${todo.length}`);
  }
}

export async function stepPhotos(
  db: Supabase,
  inat: Inat,
  species: SpeciesRow[],
  allowed: Set<string>,
  maxWidth: number,
  refresh?: PhotoRefresh,
): Promise<void> {
  const taxaQuery = db.from("inat_taxon_map")
    .select("species_code, sci_name, inat_taxon_id")
    .eq("match_status", "matched");
  const [taxaResult, protectedResult] = await Promise.all([
    refresh
      ? taxaQuery.eq("species_code", refresh.speciesCode)
      : taxaQuery.is("photo_status", null),
    db.from("species_images").select("species_code").eq("manual_override", true),
  ]);
  if (taxaResult.error) throw new Error(`Could not read taxa needing photos: ${taxaResult.error.message}`);
  if (protectedResult.error) throw new Error(`Could not read manual images: ${protectedResult.error.message}`);

  const protectedCodes = new Set((protectedResult.data ?? []).map((row) => row.species_code));
  const speciesByCode = new Map(species.map((item) => [item.code, item.sci]));
  const speciesCodes = new Set(speciesByCode.keys());
  const byTaxon = new Map<number, PhotoTodo[]>();
  for (const row of taxaResult.data ?? []) {
    if (
      row.inat_taxon_id === null
      || protectedCodes.has(row.species_code)
      || !speciesCodes.has(row.species_code)
    ) continue;
    byTaxon.set(row.inat_taxon_id, [...(byTaxon.get(row.inat_taxon_id) ?? []), row]);
  }

  const ids = [...byTaxon.keys()];
  log.info(`Step 2: fetching photos for ${ids.length} taxa in batches of ${BATCH}`);

  for (let start = 0; start < ids.length; start += BATCH) {
    const chunk = ids.slice(start, start + BATCH);
    const key = `taxa/${crypto.createHash("md5").update(chunk.join(",")).digest("hex")}`;
    let data: TaxaResponse;
    try {
      data = await inat.getJson<TaxaResponse>(
        `taxa/${chunk.join(",")}`,
        {},
        refresh ? undefined : key,
      );
    } catch (error) {
      hasProcessingErrors = true;
      log.error(`Batch fetch failed: ${errMsg(error)}`);
      continue;
    }
    const returned = new Map((data.results ?? []).map((taxon) => [taxon.id, taxon]));

    for (const taxonId of chunk) {
      const taxon = returned.get(taxonId);
      for (const row of byTaxon.get(taxonId) ?? []) {
        let status: PhotoStatus;
        if (!taxon) {
          status = "taxon_missing";
        } else {
          const excludedPhotoIds = refresh?.speciesCode === row.species_code
            ? new Set([refresh.currentPhotoId])
            : undefined;
          const picked = pickPhoto(taxon, allowed, excludedPhotoIds);
          status = picked.status;
          if (picked.photo) {
            const url = photoUrl(picked.photo);
            const photoFileId = picked.photo.id ?? Date.now();
            const storagePath = refresh
              ? `${row.species_code}-${photoFileId}.jpg`
              : `${row.species_code}.jpg`;
            try {
              const content = await saveImage(await inat.fetchBytes(url), maxWidth);
              const { error: uploadError } = await db.storage.from(BUCKET).upload(storagePath, content, {
                contentType: "image/jpeg",
                cacheControl: "31536000",
                upsert: true,
              });
              if (uploadError) throw new Error(uploadError.message);

              const { error: metadataError } = await db.from("species_images").upsert(
                {
                  species_code: row.species_code,
                  sci_name: speciesByCode.get(row.species_code) ?? row.sci_name,
                  source: "inat",
                  source_photo_id: picked.photo.id == null ? null : String(picked.photo.id),
                  source_url: url,
                  storage_path: storagePath,
                  license_code: picked.photo.license_code ?? null,
                  attribution: picked.photo.attribution ?? null,
                  fetched_at: now(),
                },
                { onConflict: "species_code" },
              );
              if (metadataError) {
                if (refresh) {
                  const { error: cleanupError } = await db.storage.from(BUCKET).remove([storagePath]);
                  if (cleanupError) {
                    log.warn(`Could not remove unreferenced replacement image ${storagePath}: ${cleanupError.message}`);
                  }
                }
                throw new Error(metadataError.message);
              }
              status = "ok";
              if (refresh && refresh.currentStoragePath !== storagePath) {
                const { error: cleanupError } = await db.storage.from(BUCKET).remove([refresh.currentStoragePath]);
                if (cleanupError) {
                  log.warn(`Replacement saved, but old image cleanup failed: ${cleanupError.message}`);
                }
              }
            } catch (error) {
              hasProcessingErrors = true;
              log.error(`Upload failed for ${row.species_code}: ${errMsg(error)}`);
              status = "download_failed";
            }
          }
        }

        if (refresh?.speciesCode === row.species_code && status !== "ok") {
          hasProcessingErrors = true;
          log.error(`Could not replace the current photo for ${row.species_code}; the existing image was retained.`);
          continue;
        }

        const { error: statusError } = await db.from("inat_taxon_map")
          .update({ photo_status: status, checked_at: now() })
          .eq("species_code", row.species_code);
        if (statusError) {
          hasProcessingErrors = true;
          log.error(`Could not save photo status for ${row.species_code}: ${statusError.message}`);
        }
      }
    }
    log.info(`  photos: ${Math.min(start + BATCH, ids.length)}/${ids.length} taxa processed`);
  }
}

export async function writeReport(
  db: Supabase,
  species: SpeciesRow[],
  outPath: string,
): Promise<void> {
  const [imagesResult, taxonResult] = await Promise.all([
    db.from("species_images").select("species_code"),
    db.from("inat_taxon_map").select("species_code, match_status, inat_name, photo_status"),
  ]);
  if (imagesResult.error) throw new Error(`Could not read imported images: ${imagesResult.error.message}`);
  if (taxonResult.error) throw new Error(`Could not read taxon report: ${taxonResult.error.message}`);

  const have = new Set((imagesResult.data ?? []).map((row) => row.species_code));
  const info = new Map((taxonResult.data ?? []).map((row) => [row.species_code, row]));
  const missing = species.filter((item) => !have.has(item.code));
  const lines = [["species_code", "scientific_name", "match_status", "inat_suggested_name", "photo_status"]];
  for (const { code, sci } of missing) {
    const row = info.get(code);
    lines.push([code, sci, row?.match_status ?? "not_checked", row?.inat_name ?? "", row?.photo_status ?? ""]);
  }
  fs.writeFileSync(outPath, `${lines.map((line) => line.map(csvCell).join(",")).join("\n")}\n`);
  log.info(
    `Done: ${species.length - missing.length}/${species.length} species have images. ${missing.length} unresolved -> ${outPath}`,
  );
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      report: { type: "string", default: "unresolved.csv" },
      allowed: { type: "string", default: DEFAULT_ALLOWED },
      "max-width": { type: "string", default: "600" },
      "api-delay": { type: "string", default: "1.0" },
      "dl-delay": { type: "string", default: "0.25" },
      limit: { type: "string" },
      "retry-failed": { type: "boolean", default: false },
      "refresh-species": { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  if (values.help || positionals.length !== 1) {
    console.log("Usage: npm run images:import -- species.csv [options]");
    console.log("Run with --help for options; species.csv requires species_code,scientific_name columns.");
    console.log("Refresh one image with --refresh-species SPECIES_CODE.");
    process.exit(values.help ? 0 : 1);
  }

  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Set VITE_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) in the root .env file.",
    );
  }
  const maxWidth = Number(values["max-width"]);
  if (!Number.isInteger(maxWidth) || maxWidth < 1) throw new Error("--max-width must be a positive integer.");

  const allowed = new Set(values.allowed!.split(",").map((value) => value.trim().toLowerCase()).filter(Boolean));
  let species = readSpecies(positionals[0]);
  const refreshSpeciesCode = values["refresh-species"]?.trim();
  if (values["refresh-species"] !== undefined) {
    if (!refreshSpeciesCode) throw new Error("--refresh-species requires an eBird species code.");
    if (values.limit || values["retry-failed"]) {
      throw new Error("--refresh-species cannot be combined with --limit or --retry-failed.");
    }
    const target = species.find((item) => item.code === refreshSpeciesCode);
    if (!target) {
      throw new Error(`${refreshSpeciesCode} was not found in ${positionals[0]}.`);
    }
    species = [target];
  }
  if (values.limit) {
    const limit = Number(values.limit);
    if (!Number.isInteger(limit) || limit < 1) throw new Error("--limit must be a positive integer.");
    species = species.slice(0, limit);
  }
  log.info(`Loaded ${species.length} species; accepting licenses: ${[...allowed].sort().join(", ")}`);

  const db = createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  if (values["retry-failed"]) {
    const { error: unmatchedError } = await db.from("inat_taxon_map").delete().neq("match_status", "matched");
    if (unmatchedError) throw new Error(`Could not reset unresolved taxa: ${unmatchedError.message}`);
    const { error: failedError } = await db.from("inat_taxon_map")
      .update({ photo_status: null })
      .eq("match_status", "matched")
      .not("photo_status", "is", null)
      .neq("photo_status", "ok");
    if (failedError) throw new Error(`Could not reset failed photos: ${failedError.message}`);
  }

  const inat = new Inat(".inat-cache", {
    api: Number(values["api-delay"]) * 1000,
    dl: Number(values["dl-delay"]) * 1000,
  });
  await stepResolve(db, inat, species);

  let refresh: PhotoRefresh | undefined;
  if (refreshSpeciesCode) {
    const { data: currentImage, error: imageError } = await db.from("species_images")
      .select("source, source_photo_id, storage_path, manual_override")
      .eq("species_code", refreshSpeciesCode)
      .maybeSingle();
    if (imageError) throw new Error(`Could not read the current image: ${imageError.message}`);
    if (!currentImage) throw new Error(`No existing image for ${refreshSpeciesCode}; run the normal import first.`);
    if (currentImage.manual_override || currentImage.source !== "inat") {
      throw new Error(`${refreshSpeciesCode} is a manual image and will not be replaced by an iNaturalist refresh.`);
    }
    if (!currentImage.source_photo_id) {
      throw new Error(`The current image for ${refreshSpeciesCode} has no iNaturalist photo ID to exclude.`);
    }

    const { data: taxon, error: taxonError } = await db.from("inat_taxon_map")
      .select("inat_taxon_id, match_status")
      .eq("species_code", refreshSpeciesCode)
      .maybeSingle();
    if (taxonError) throw new Error(`Could not read the iNaturalist taxon: ${taxonError.message}`);
    if (!taxon || taxon.match_status !== "matched" || taxon.inat_taxon_id === null) {
      throw new Error(`${refreshSpeciesCode} has no resolved iNaturalist taxon to refresh.`);
    }
    refresh = {
      speciesCode: refreshSpeciesCode,
      currentPhotoId: currentImage.source_photo_id,
      currentStoragePath: currentImage.storage_path,
    };
  }

  await stepPhotos(db, inat, species, allowed, maxWidth, refresh);
  await writeReport(db, species, values.report!);
  if (hasProcessingErrors) {
    throw new Error("Import completed with processing errors; review the log and report, then rerun to resume.");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error: unknown) => {
    log.error(errMsg(error));
    process.exitCode = 1;
  });
}
