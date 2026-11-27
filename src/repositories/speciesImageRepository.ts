import { supabase } from '../lib/supabase'
import type { LifeListEntry } from '../data/lifeList'

type SpeciesImageRow = {
  sci_name: string
  storage_path: string
  license_code: string | null
  attribution: string | null
}

type SpeciesCodeImageRow = {
  species_code: string
  storage_path: string
  license_code: string | null
  attribution: string | null
}

export type SpeciesImage = {
  imageUrl: string
  licenseCode: string | null
  attribution: string | null
}

export type RecentLifeListImage = {
  commonName: string
  scientificName: string
  observedDate: string
  imageUrl: string
  licenseCode: string | null
  attribution: string | null
}

function eBirdScientificName(scientificName: string): string {
  return scientificName.replace(/^\p{L}/u, (firstLetter) => firstLetter.toUpperCase())
}

export async function loadSpeciesImagesByCodes(
  speciesCodes: string[],
): Promise<Record<string, SpeciesImage>> {
  const imageByCode: Record<string, SpeciesImage> = {}
  const uniqueCodes = [...new Set(speciesCodes)]

  for (let start = 0; start < uniqueCodes.length; start += 100) {
    const chunk = uniqueCodes.slice(start, start + 100)
    const { data, error } = await supabase
      .from('species_images')
      .select('species_code, storage_path, license_code, attribution')
      .in('species_code', chunk)

    if (error) throw new Error(error.message)
    for (const row of (data ?? []) as SpeciesCodeImageRow[]) {
      const { data: publicUrl } = supabase.storage
        .from('species-images')
        .getPublicUrl(row.storage_path)
      imageByCode[row.species_code] = {
        imageUrl: publicUrl.publicUrl,
        licenseCode: row.license_code,
        attribution: row.attribution,
      }
    }
  }

  return imageByCode
}

export async function loadRecentLifeListImages(
  entries: LifeListEntry[],
  limit = 3,
): Promise<RecentLifeListImage[]> {
  const recentEntries = entries
    .filter((entry): entry is LifeListEntry & { observedDate: string } => entry.observedDate !== null)
    .sort((a, b) => b.observedDate.localeCompare(a.observedDate))
  if (!recentEntries.length) return []

  const scientificNames = [...new Set(recentEntries.map((entry) => eBirdScientificName(entry.scientificName)))]
  const imageByName = new Map<string, SpeciesImageRow>()
  const chunkSize = 100
  for (let start = 0; start < scientificNames.length; start += chunkSize) {
    const chunk = scientificNames.slice(start, start + chunkSize)
    const { data, error } = await supabase
      .from('species_images')
      .select('sci_name, storage_path, license_code, attribution')
      .in('sci_name', chunk)

    if (error) throw new Error(error.message)
    for (const row of (data ?? []) as SpeciesImageRow[]) {
      imageByName.set(row.sci_name.toLowerCase(), row)
    }
  }

  return recentEntries.flatMap((entry) => {
    const image = imageByName.get(entry.scientificName.toLowerCase())
    if (!image) return []

    const { data } = supabase.storage.from('species-images').getPublicUrl(image.storage_path)
    return [{
      commonName: entry.commonName,
      scientificName: entry.scientificName,
      observedDate: entry.observedDate,
      imageUrl: data.publicUrl,
      licenseCode: image.license_code,
      attribution: image.attribution,
    }]
  }).slice(0, limit)
}
