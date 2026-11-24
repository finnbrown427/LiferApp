import type { Destination } from "./destination"

export type Trip = {
  id: string
  name: string
  destinations: Destination[]
}

export function destinationId(destination: Destination) {
  return destination.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export const trips: Trip[] = [
  { id: 'rosa-euro', name: 'Rosas Europe trip', destinations: [
    {
        id: 2643743,
        name: 'London',
        latitude: 51.5074,
        longitude: -0.1278,
        country: 'United Kingdom',
      },
      {
        id: 2988507,
        name: 'Paris',
        latitude: 48.8566,
        longitude: 2.3522,
        country: 'France',
      },
    ]
  },
  { id: 'finn-aus', name: 'Finn Cairns', destinations: [
    {
        id: 2172797,
        name: 'Cairns',
        latitude: -16.9186,
        longitude: 145.7781,
        country: 'Australia',
      },
    ] 
  },
]

export function addDestination(tripId: string, destination: Destination) {
  const trip = trips.find((item) => item.id === tripId)
  if (!trip) return

  trip.destinations = [...trip.destinations, destination]
  return trip
}

export function removeDestination(tripId: string, destination: Destination) {
  const trip = trips.find((item) => item.id === tripId)
  if (!trip) return

  trip.destinations = trip.destinations.filter((item) => item.id !== destination.id)
  return trip
}