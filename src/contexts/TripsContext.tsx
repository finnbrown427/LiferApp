// Provides the selected profile's trips and trip/destination actions, persisting all profiles locally.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Destination } from '../data/destination'
import type { Trip } from '../data/trips'
import { useCurrentUser } from './CurrentUserContext'
import { loadTrips, saveTrips } from '../repositories/localStorageRepository'

type TripsContextValue = {
  trips: Trip[]
  findTrip: (tripId: string) => Trip | undefined
  createTrip: (name: string) => void
  addDestination: (tripId: string, destination: Destination) => void
  removeDestination: (tripId: string, destination: Destination) => void
}

const TripsContext = createContext<TripsContextValue | null>(null)
export function TripsProvider({ children }: { children: ReactNode }) {
  const { currentUserId } = useCurrentUser()
  const [allTrips, setAllTrips] = useState<Trip[]>(loadTrips)
  const userTrips = allTrips.filter((trip) => trip.userId === currentUserId)

  useEffect(() => {
    saveTrips(allTrips)
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
