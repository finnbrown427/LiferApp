import { supabase } from '../lib/supabase'
import type { Trip } from '../data/trips'

type DestinationRow = {
  geocoding_id: number
  name: string
  country: string | null
  latitude: number
  longitude: number
}

type TripRow = {
  id: string
  profile_id: string
  name: string
  destinations: DestinationRow[] | null
}

// Retrieves a single users trips AND there associated destinations from the database
export async function loadTrips(profileId: string): Promise<Trip[]> {
  const { data, error } = await supabase
    .from('trips')
    .select(`
      id,
      profile_id,
      name,
      destinations (geocoding_id, name, country, latitude, longitude)
    `)
    .eq('profile_id', profileId)

  if (error) throw new Error(error.message)

  return ((data ?? []) as TripRow[]).map((row) => ({
    id: row.id,
    userId: row.profile_id,
    name: row.name,
    destinations: (row.destinations ?? []).map((destination) => ({
      id: destination.geocoding_id,
      name: destination.name,
      country: destination.country ?? undefined,
      latitude: destination.latitude,
      longitude: destination.longitude,
    })),
  }))
}

export async function createTrip(profileId: string, name: string): Promise<Trip> {
  const trimmedName = name.trim()
  if (!trimmedName) {
    throw new Error('Trip name cannot be empty.')
  }

  const { data, error } = await supabase
    .from('trips')
    .insert({ profile_id: profileId, name: trimmedName })
    .select('id, profile_id, name')
    .single()

  if (error) throw new Error(error.message)

  return {
    id: data.id,
    userId: data.profile_id,
    name: data.name,
    destinations: [],
  }
}

export async function removeTrip(tripId: string): Promise<void> {
  const { data, error } = await supabase
    .from('trips')
    .delete()
    .eq('id', tripId)
    .select('id')
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Trip not found or could not be deleted.')
}

export type TripRepository = {
    loadTrips(profileId: string): Promise<Trip[]>
    createTrip(profileId: string, name: string): Promise<Trip>
    removeTrip(tripId: string): Promise<void>
}