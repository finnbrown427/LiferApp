import { supabase } from '../lib/supabase'
import type { LifeList } from '../data/ebird'

type LifeListEntryRow = {
  scientific_name: string
}

export async function loadLifeList(profileId: string): Promise<LifeList | null> {
  const { data, error } = await supabase
    .from('life_list_entries')
    .select('scientific_name')
    .eq('profile_id', profileId)

  if (error) throw new Error(error.message)

  if (!data || data.length === 0) return null

  return new Set(
    (data as LifeListEntryRow[]).map((entry) => entry.scientific_name),
  )
}

export async function updateLifeList(profileId: string, lifeList: LifeList): Promise<void> {
  const { error } = await supabase.rpc('replace_life_list', {
    target_profile_id: profileId,
    scientific_names: [...lifeList],
  })

  if (error) throw new Error(error.message)
}

export type TripRepository = {
    loadLifeList(profileId: string): Promise<LifeList>
    updateLifeList(profileId: string, lifeList: LifeList): Promise<void>
}