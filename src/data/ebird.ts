// Data layer for hotspot and species data from Ebird API and CSVs
// FUTURE: credit ebird for data

import Papa from 'papaparse';
import type { LifeListEntry } from './lifeList'

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
  obsDt: string; // "2026-11-20 08:15"
  howMany?: number | null;
};

export type RankedHotspot = {
  locId: string;
  locName: string;
  reports: number;
  lastSeen: string;
  url: string;
};

export type RecentHotspotSpecies = Taxon & {
  latestObservationDate: string;
  latestCount?: number;
};

export const HOTSPOT_RECENT_DAYS = 30;

export type DestinationHotspot = {
  locId: string;
  locName: string;
  lat: number;
  lng: number;
  totalSpecies: number;
  url: string;
};

export type LifeList = Set<string>

function parseLifeListRows(csvText: string, requireDate: boolean): Record<string, string>[] {
  const { data, errors } = Papa.parse<Record<string, string>>(csvText, {
    header: true, skipEmptyLines: true,
  })
  if (errors.length) throw new Error(errors[0].message)
  if (requireDate && data.length > 0 && !Object.hasOwn(data[0], 'Date')) {
    throw new Error('CSV must include a Date column to identify the most recently observed birds.')
  }
  return data
}

/** Parse a downloaded eBird CSV as the existing set of scientific names. */
export function importLifeListCsv(csvText: string): Set<string> {
  return lifeListFromRows(parseLifeListRows(csvText, false))
}

/** Parse life-list species with their latest observation dates from an eBird CSV. */
export function importLifeListEntriesCsv(csvText: string): LifeListEntry[] {
  const rows = parseLifeListRows(csvText, true)
  if (rows.length > 0 && !Object.hasOwn(rows[0], 'Common Name')) {
    throw new Error('CSV must include a Common Name column to display bird names.')
  }
  return lifeListEntriesFromRows(rows)
}

function normalizeObservedDate(value: string | undefined): string | null {
  const dateText = value?.trim()
  if (!dateText) return null

  const isoDate = /^(\d{4}-\d{2}-\d{2})(?:$|[T ])/.exec(dateText)?.[1]
  if (isoDate) {
    const timestamp = Date.parse(`${isoDate}T00:00:00Z`)
    if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== isoDate) {
      throw new Error(`Invalid observation date in CSV: ${dateText}`)
    }
    return isoDate
  }

  const timestamp = Date.parse(dateText)
  if (!Number.isFinite(timestamp)) {
    throw new Error(`Invalid observation date in CSV: ${dateText}`)
  }
  return new Date(timestamp).toISOString().slice(0, 10)
}

/** Build your life list (a set of lowercase scientific names) from parsed "Download my data" rows. */
export function lifeListFromRows(rows: Record<string, string>[]): Set<string> {
  return new Set(lifeListEntriesFromRows(rows).map((entry) => entry.scientificName))
}

/** Keep one entry per species, using the latest valid observation date. */
export function lifeListEntriesFromRows(rows: Record<string, string>[]): LifeListEntry[] {
  const entriesByName = new Map<string, LifeListEntry>()
  for (const row of rows) {
    const sci = row["Scientific Name"]?.trim().toLowerCase();
    // Skip blanks, slashes (e.g. gull/tern), hybrids ("x"), spuhs ("sp."), and domestic forms
    if (!sci || /[\/(]| x | sp\.$/.test(sci)) continue;
    // Keep genus + species only (drops subspecies)
    const scientificName = sci.split(" ").slice(0, 2).join(" ");
    const commonName = row["Common Name"]?.trim() || scientificName
    const observedDate = normalizeObservedDate(row.Date)
    const existing = entriesByName.get(scientificName)
    if (!existing || (observedDate && (!existing.observedDate || observedDate > existing.observedDate))) {
      entriesByName.set(scientificName, { commonName, scientificName, observedDate })
    }
  }
  return [...entriesByName.values()]
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

/** Species ranked by individual count in each species' latest recent observation. */
export async function recentSpeciesAtHotspot(
  locId: string,
): Promise<RecentHotspotSpecies[]> {
  const [taxonomy, observations] = await Promise.all([
    getTaxonomy(),
    api<Observation[]>(
      `/data/obs/${encodeURIComponent(locId)}/recent?back=${HOTSPOT_RECENT_DAYS}`,
    ),
  ]);
  const taxonomyByCode = new Map(taxonomy.map((taxon) => [taxon.speciesCode, taxon]));
  const latestObservations = new Map<string, RecentHotspotSpecies>();

  for (const observation of observations) {
    const taxon = taxonomyByCode.get(observation.speciesCode);
    if (!taxon) continue;

    const existing = latestObservations.get(taxon.speciesCode);
    if (!existing || observation.obsDt > existing.latestObservationDate) {
      latestObservations.set(taxon.speciesCode, {
        ...taxon,
        latestObservationDate: observation.obsDt,
        ...(typeof observation.howMany === 'number'
          ? { latestCount: observation.howMany }
          : {}),
      });
    }
  }

  return [...latestObservations.values()].sort(
    (a, b) => (b.latestCount ?? -1) - (a.latestCount ?? -1)
      || b.latestObservationDate.localeCompare(a.latestObservationDate)
      || a.comName.localeCompare(b.comName),
  );
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