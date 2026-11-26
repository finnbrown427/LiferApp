// Provides the selected profile's trips and trip/destination actions
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Destination } from '../data/destination'
import type { Trip } from '../data/trips'
import { useCurrentUser } from './CurrentUserContext'
import {
  loadTrips,
  createTrip as createTripInRepository,
  removeTrip as removeTripFromRepository,
} from '../repositories/tripRepository'
import {
  addDestination as createDestInRepository,
  removeDestination as removeDestFromRepository
} from '../repositories/destinationRepository'

type TripsContextValue = {
  trips: Trip[]
  isLoading: boolean
  error: string | null
  findTrip: (tripId: string) => Trip | undefined
  createTrip: (name: string) => Promise<Trip>
  removeTrip: (tripId: string) => Promise<void>
  addDestination: (tripId: string, destination: Destination) => Promise<void>
  removeDestination: (tripId: string, destination: Destination) => Promise<void>
}

const TripsContext = createContext<TripsContextValue | null>(null)

export function TripsProvider({ children }: { children: ReactNode }) {
  const { currentUserId } = useCurrentUser()
  const [trips, setTrips] = useState<Trip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    setTrips([])
    setIsLoading(true)
    setError(null)

    void loadTrips(currentUserId)
      .then((loadedTrips) => {
        if (active) setTrips(loadedTrips)
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Could not load trips.')
        }
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [currentUserId])

  const findTrip = (tripId: string) => trips.find((trip) => trip.id === tripId)

  const addTrip = async (name: string) => {
    const trip = await createTripInRepository(currentUserId, name)
    setTrips((currentTrips) => [...currentTrips, trip])
    return trip
  }

  const deleteTrip = async (tripId: string) => {
    await removeTripFromRepository(tripId)
    setTrips((currentTrips) => currentTrips.filter((trip) => trip.id !== tripId))
  }


  const addDestination = async (tripId: string, destination: Destination) => {
    const savedDestination = await createDestInRepository(tripId, destination)
    setTrips((currentTrips) => currentTrips.map((trip) => (
      trip.id === tripId && trip.userId === currentUserId
        ? { ...trip, destinations: [...trip.destinations, savedDestination] }
        : trip
    )))
  }

  const removeDestination = async (tripId: string, destination: Destination) => {
    await removeDestFromRepository(tripId, destination.id)
    setTrips((currentTrips) => currentTrips.map((trip) => (
      trip.id === tripId && trip.userId === currentUserId
        ? { ...trip, destinations: trip.destinations.filter((item) => item.id !== destination.id) }
        : trip
    )))
  }


  return (
    <TripsContext.Provider value={{
      trips,
      isLoading,
      error,
      findTrip,
      createTrip: addTrip,
      removeTrip: deleteTrip,
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
