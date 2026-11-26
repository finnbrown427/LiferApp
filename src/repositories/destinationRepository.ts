import { supabase } from '../lib/supabase'
import type { Destination } from '../data/destination'

export async function addDestination(tripId: string, destination: Destination): Promise<Destination> {
  const name = destination.name.trim()
  if (!name) throw new Error('Destination name cannot be empty.')

  const { data, error } = await supabase
    .from('destinations')
    .insert({
      trip_id: tripId,
      geocoding_id: destination.id,
      name,
      country: destination.country ?? null,
      latitude: destination.latitude,
      longitude: destination.longitude,
    })
    .select('geocoding_id, name, country, latitude, longitude')
    .single()

  if (error) throw new Error(error.message)

  return {
    id: data.geocoding_id,
    name: data.name,
    country: data.country ?? undefined,
    latitude: data.latitude,
    longitude: data.longitude,
  }
}

export async function removeDestination(tripId: string, destinationId: number): Promise<void> {
  const { data, error } = await supabase
    .from('destinations')
    .delete()
    .eq('trip_id', tripId)
    .eq('geocoding_id', destinationId)
    .select('trip_id, geocoding_id')
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Destination not found or could not be deleted.')
    
}

export type DestinationRepository = {
  addDestination(tripId: string, destination: Destination): Promise<Destination>
  removeDestination(tripId: string, destinationId: number): Promise<void>
}