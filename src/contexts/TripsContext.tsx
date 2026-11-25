// Provides the selected profile's trips and trip/destination actions, persisting all profiles locally.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Destination } from '../data/destination'
import { initialTrips, type Trip } from '../data/trips'
import { useCurrentUser } from './CurrentUserContext'

type TripsContextValue = {
  trips: Trip[]
  findTrip: (tripId: string) => Trip | undefined
  createTrip: (name: string) => void
  addDestination: (tripId: string, destination: Destination) => void
  removeDestination: (tripId: string, destination: Destination) => void
}

const TripsContext = createContext<TripsContextValue | null>(null)
const STORAGE_KEY = 'lifer.trips'

function isDestination(value: unknown): value is Destination {
  if (typeof value !== 'object' || value === null) return false

  const destination = value as Record<string, unknown>
  return typeof destination.id === 'number'
    && typeof destination.name === 'string'
    && typeof destination.latitude === 'number'
    && typeof destination.longitude === 'number'
    && (destination.country === undefined || typeof destination.country === 'string')
}

function isTrip(value: unknown): value is Trip {
  if (typeof value !== 'object' || value === null) return false

  const trip = value as Record<string, unknown>
  return typeof trip.id === 'string'
    && (trip.userId === 'rosa' || trip.userId === 'finn')
    && typeof trip.name === 'string'
    && Array.isArray(trip.destinations)
    && trip.destinations.every(isDestination)
}

function loadTrips(): Trip[] {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === null) return initialTrips

  const parsed: unknown = JSON.parse(saved)
  if (!Array.isArray(parsed) || !parsed.every(isTrip)) {
    throw new Error('Saved trips have an invalid format.')
  }

  return parsed
}

export function TripsProvider({ children }: { children: ReactNode }) {
  const { currentUserId } = useCurrentUser()
  const [allTrips, setAllTrips] = useState<Trip[]>(loadTrips)
  const userTrips = allTrips.filter((trip) => trip.userId === currentUserId)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allTrips))
  }, [allTrips])

  const findTrip = (tripId: string) => userTrips.find((trip) => trip.id === tripId)

  const createTrip = (name: string) => {
    const trip: Trip = {
      id: crypto.randomUUID(),
      userId: currentUserId,
      name,
      destinations: [],
    }
    setAllTrips((trips) => [...trips, trip])
  }

  const addDestination = (tripId: string, destination: Destination) => {
    setAllTrips((trips) => trips.map((trip) => (
      trip.id === tripId && trip.userId === currentUserId
        ? { ...trip, destinations: [...trip.destinations, destination] }
        : trip
    )))
  }

  const removeDestination = (tripId: string, destination: Destination) => {
    setAllTrips((trips) => trips.map((trip) => (
      trip.id === tripId && trip.userId === currentUserId
        ? { ...trip, destinations: trip.destinations.filter((item) => item.id !== destination.id) }
        : trip
    )))
  }

  return (
    <TripsContext.Provider value={{
      trips: userTrips,
      findTrip,
      createTrip,
      addDestination,
      removeDestination,
    }}>
      {children}
    </TripsContext.Provider>
  )
}

export function useTrips() {
  const context = useContext(TripsContext)
  if (context === null) {
    throw new Error('useTrips must be used within TripsProvider')
  }
  return context
}
