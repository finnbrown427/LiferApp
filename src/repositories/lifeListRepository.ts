import { supabase } from '../lib/supabase'
import type { LifeListEntry } from '../data/lifeList'

type LifeListEntryRow = {
  scientific_name: string
  common_name: string | null
  observed_date: string | null
}

export async function loadLifeList(profileId: string): Promise<LifeListEntry[] | null> {
  const { data, error } = await supabase
    .from('life_list_entries')
    .select('scientific_name, common_name, observed_date')
    .eq('profile_id', profileId)

  if (error) throw new Error(error.message)

  if (!data || data.length === 0) return null

  return (data as LifeListEntryRow[]).map((entry) => ({
    commonName: entry.common_name ?? entry.scientific_name,
    scientificName: entry.scientific_name,
    observedDate: entry.observed_date,
  }))
}

export async function updateLifeList(profileId: string, entries: LifeListEntry[]): Promise<void> {
  const { error } = await supabase.rpc('replace_life_list_with_dates', {
    target_profile_id: profileId,
    entries: entries.map(({ commonName, scientificName, observedDate }) => ({
      common_name: commonName,
      scientific_name: scientificName,
      observed_date: observedDate,
    })),
  })

  if (error) throw new Error(error.message)
}

export type LifeListRepository = {
  loadLifeList(profileId: string): Promise<LifeListEntry[] | null>
  updateLifeList(profileId: string, entries: LifeListEntry[]): Promise<void>
}