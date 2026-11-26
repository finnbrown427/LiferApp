import { supabase } from '../lib/supabase'
import type { UserId } from '../data/users'

export type Profile = {
  id: UserId
  display_name: string
}

export async function loadProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('app_profiles')
    .select('id, display_name')

  if (error) throw new Error(error.message)

  if (!Array.isArray(data)) return []

  return data.flatMap((profile) => {
    if (
      typeof profile !== 'object'
      || profile === null
      || typeof profile.id !== 'string'
      || typeof profile.display_name !== 'string'
    ) {
      return []
    }

    return [{
      id: profile.id,
      display_name: profile.display_name,
    }]
  })
}
