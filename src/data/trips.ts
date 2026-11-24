export type Trip = {
  id: string
  name: string
  cities: string[]
}

export function cityId(cityName: string) {
  return cityName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export const trips: Trip[] = [
  { id: 'rosa-euro', name: 'Rosas Europe trip', cities: ['London', 'Paris'] },
  { id: 'finn-aus', name: 'Finn Cairns', cities: ['Cairns'] },
]

export function addCity(tripId: string, cityName: string) {
  const trip = trips.find((item) => item.id === tripId)
  if (!trip) return

  trip.cities = [...trip.cities, cityName]
  return trip
}

export function removeCity(tripId: string, cityName: string) {
  const trip = trips.find((item) => item.id === tripId)
  if (!trip) return

  trip.cities = trip.cities.filter((city) => city !== cityName)
  return trip
}