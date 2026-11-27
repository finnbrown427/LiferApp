// Data layer for hotspot and species data from Ebird API and CSVs
// FUTURE: credit ebird for data

import Papa from 'papaparse';

const BASE = "/api/ebird";

async function api<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  const contentType = res.headers.get('Content-Type')?.toLowerCase() ?? '';

  if (contentType.includes('text/html')) {
    throw new Error(
      'The eBird endpoint returned HTML instead of JSON. Check that the Worker routes `/api/ebird/*` to its eBird handler and that `EBIRD_API_TOKEN` is configured.',
    );
  }

  if (!res.ok) throw new Error(`eBird API ${res.status} for ${path}`);
  return res.json() as Promise<T>;
}

export type Taxon = { speciesCode: string; comName: string; sciName: string };

type Observation = {
  speciesCode: string;
  comName: string;
  sciName: string;
  locId: string;
  locName: string;
  subId?: string;
  obsDt: string; // "2026-11-20 08:15"
  howMany?: number;
};

export type RankedHotspot = {
  locId: string;
  locName: string;
  reports: number;
  lastSeen: string;
  url: string;
};

export type FrequentSpecies = Taxon & {
  reports: number;
  specializationScore: number;
};

export type HotspotSpeciesRanking = {
  species: FrequentSpecies[];
  error: string | null;
};

export type DestinationHotspot = {
  locId: string;
  locName: string;
  lat: number;
  lng: number;
  totalSpecies: number;
  url: string;
};

export type LifeList = Set<string>

/** parse downloaded csv text with papaparse */
export function importLifeListCsv(csvText: string) {
  const { data, errors } = Papa.parse<Record<string, string>>(csvText, {
    header: true, skipEmptyLines: true,
  })
  if (errors.length) throw new Error(errors[0].message)
    return lifeListFromRows(data)
}

/** Build your life list (a set of lowercase scientific names) from parsed "Download my data" rows. */
export function lifeListFromRows(rows: Record<string, string>[]): Set<string> {
  const names = new Set<string>();
  for (const row of rows) {
    const sci = row["Scientific Name"]?.trim().toLowerCase();
    // Skip blanks, slashes (e.g. gull/tern), hybrids ("x"), spuhs ("sp."), and domestic forms
    if (!sci || /[\/(]| x | sp\.$/.test(sci)) continue;
    // Keep genus + species only (drops subspecies)
    names.add(sci.split(" ").slice(0, 2).join(" "));
  }
  return names;
}

// The taxonomy is large, so fetch it once and reuse it.
let taxonomyPromise: Promise<Taxon[]> | undefined;
function getTaxonomy(): Promise<Taxon[]> {
  taxonomyPromise ??= api<Taxon[]>("/ref/taxonomy/ebird?fmt=json&cat=species");
  return taxonomyPromise;
}

/**
 * Species reported in a region.
 * Pass recentDays (1-30) for what's been seen lately; omit it for every species ever reported.
 * regionCode examples: "US-NY-061" (a county), "US-NY" (a state), "NZ" (a country).
 */
export async function speciesInRegion(
  regionCode: string,
  recentDays?: number
): Promise<Taxon[]> {
  const taxonomy = await getTaxonomy();
  const byCode = new Map(taxonomy.map((t) => [t.speciesCode, t]));

  const codes = recentDays
    ? (
        await api<Observation[]>(`/data/obs/${regionCode}/recent?back=${recentDays}`)
      ).map((o) => o.speciesCode)
    : await api<string[]>(`/product/spplist/${regionCode}`);

  // Codes that aren't full species (spuhs, hybrids) aren't in the species-only taxonomy, so they drop out here.
  return [...new Set(codes)]
    .map((code) => byCode.get(code))
    .filter((t): t is Taxon => t !== undefined);
}

/** Species in the region that aren't on your life list. */
export function missingSpecies(regionSpecies: Taxon[], lifeList: Set<string>): Taxon[] {
  return regionSpecies.filter((t) => !lifeList.has(t.sciName.toLowerCase()));
}

/**
 * Hotspots where a species was reported recently, ranked by number of recent reports, then recency.
 * This is a proxy for "best": the page at `url` has eBird's own bar chart for a closer look.
 */
export async function hotspotsForSpecies(
  regionCode: string,
  speciesCode: string,
  days = 30
): Promise<RankedHotspot[]> {
  const obs = await api<Observation[]>(
    `/data/obs/${regionCode}/recent/${speciesCode}?back=${days}&hotspot=true`
  );

  const byLocation = new Map<string, RankedHotspot>();
  for (const o of obs) {
    const existing = byLocation.get(o.locId);
    if (existing) {
      existing.reports += 1;
      if (o.obsDt > existing.lastSeen) existing.lastSeen = o.obsDt;
    } else {
      byLocation.set(o.locId, {
        locId: o.locId,
        locName: o.locName,
        reports: 1,
        lastSeen: o.obsDt,
        url: `https://ebird.org/hotspot/${o.locId}`,
      });
    }
  }

  return [...byLocation.values()].sort(
    (a, b) => b.reports - a.reports || b.lastSeen.localeCompare(a.lastSeen)
  );
}

/** Rank hotspot species by their checklist frequency versus other nearby checklists. */
export async function rankHotspotSpeciesByRegionalFrequency(
  hotspots: Pick<DestinationHotspot, 'locId'>[],
  latitude: number,
  longitude: number,
): Promise<Record<string, HotspotSpeciesRanking>> {
  if (hotspots.length === 0) return {};

  const maxResults = 10_000;
  const params = new URLSearchParams({
    lat: String(latitude),
    lng: String(longitude),
    dist: '25',
    back: '30',
    maxResults: String(maxResults),
  });
  const [taxonomy, regionalObservations, hotspotObservationGroups] = await Promise.all([
    getTaxonomy(),
    api<Observation[]>(`/data/obs/geo/recent?${params}`),
    Promise.all(
      hotspots.map(async ({ locId }) => ({
        locId,
        observations: await api<Observation[]>(
          `/data/obs/${encodeURIComponent(locId)}/recent?back=30`,
        ),
      })),
    ),
  ]);
  if (regionalObservations.length >= maxResults) {
    throw new Error(
      'There are too many recent observations within 25 km to compare hotspot frequencies reliably.',
    );
  }

  const taxonomyByCode = new Map(taxonomy.map((taxon) => [taxon.speciesCode, taxon]));
  const checklistsByLocation = new Map<string, Map<string, Set<string>>>();

  for (const observation of regionalObservations) {
    if (!observation.subId) {
      throw new Error('eBird did not return checklist IDs needed to compare hotspot frequencies.');
    }

    let checklists = checklistsByLocation.get(observation.locId);
    if (!checklists) {
      checklists = new Map();
      checklistsByLocation.set(observation.locId, checklists);
    }

    let speciesCodes = checklists.get(observation.subId);
    if (!speciesCodes) {
      speciesCodes = new Set();
      checklists.set(observation.subId, speciesCodes);
    }

    const taxon = taxonomyByCode.get(observation.speciesCode);
    if (taxon) speciesCodes.add(taxon.speciesCode);
  }

  const hotspotObservationsByLocation = new Map(
    hotspotObservationGroups.map(({ locId, observations }) => [locId, observations]),
  );

  return Object.fromEntries(hotspots.map(({ locId }) => {
    const localChecklists = new Map<string, Set<string>>();
    for (const observation of hotspotObservationsByLocation.get(locId) ?? []) {
      if (!observation.subId) {
        throw new Error('eBird did not return checklist IDs needed to compare hotspot frequencies.');
      }

      let speciesCodes = localChecklists.get(observation.subId);
      if (!speciesCodes) {
        speciesCodes = new Set();
        localChecklists.set(observation.subId, speciesCodes);
      }

      const taxon = taxonomyByCode.get(observation.speciesCode);
      if (taxon) speciesCodes.add(taxon.speciesCode);
    }

    const regionalSpeciesReports = new Map<string, number>();
    let regionalChecklistCount = 0;

    for (const [otherLocId, checklists] of checklistsByLocation) {
      if (otherLocId === locId) continue;

      for (const speciesCodes of checklists.values()) {
        regionalChecklistCount += 1;
        for (const speciesCode of speciesCodes) {
          regionalSpeciesReports.set(
            speciesCode,
            (regionalSpeciesReports.get(speciesCode) ?? 0) + 1,
          );
        }
      }
    }

    if (localChecklists.size > 0 && regionalChecklistCount === 0) {
      return [locId, {
        species: [],
        error: 'Not enough recent observations at other nearby locations for comparison.',
      }];
    }

    const localSpeciesReports = new Map<string, number>();
    for (const speciesCodes of localChecklists.values()) {
      for (const speciesCode of speciesCodes) {
        localSpeciesReports.set(
          speciesCode,
          (localSpeciesReports.get(speciesCode) ?? 0) + 1,
        );
      }
    }

    const species = [...localSpeciesReports].flatMap(([speciesCode, reports]) => {
      const taxon = taxonomyByCode.get(speciesCode);
      if (!taxon) return [];

      // Smooth small samples so a species absent from the baseline doesn't get an infinite score.
      const localFrequency = (reports + 1) / (localChecklists.size + 2);
      const regionalFrequency =
        ((regionalSpeciesReports.get(speciesCode) ?? 0) + 1)
        / (regionalChecklistCount + 2);

      return [{
        ...taxon,
        reports,
        specializationScore: localFrequency / regionalFrequency,
      }];
    }).sort(
      (a, b) =>
        b.specializationScore - a.specializationScore
        || b.reports - a.reports
        || a.comName.localeCompare(b.comName),
    );

    return [locId, { species, error: null }];
  }));
}

/** Hotspots near coordinates, ranked by total species observed at each location. */
export async function hotspotsNearDestination(
  latitude: number,
  longitude: number,
  distanceKm = 25
): Promise<DestinationHotspot[]> {
  const hotspots = await api<Array<{
    locId: string;
    locName: string;
    lat: number;
    lng: number;
    numSpeciesAllTime?: number;
  }>>(
    `/ref/hotspot/geo?lat=${latitude}&lng=${longitude}&dist=${distanceKm}&fmt=json&cap=500`
  );

  return hotspots
    .map((hotspot) => ({
      locId: hotspot.locId,
      locName: hotspot.locName,
      lat: hotspot.lat,
      lng: hotspot.lng,
      totalSpecies: hotspot.numSpeciesAllTime ?? 0,
      url: `https://ebird.org/hotspot/${hotspot.locId}`,
    }))
    .sort(
      (a, b) => b.totalSpecies - a.totalSpecies
    );
}