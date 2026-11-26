import type { Destination } from '../data/destination'
import { initialTrips, type Trip } from '../data/trips'
import { defaultUsers } from '../data/users'

const LIFE_LISTS_KEY = 'lifer.lifeLists'
const LEGACY_LIFE_LIST_KEY = 'lifer.lifeList'
const TRIPS_KEY = 'lifer.trips'
const CURRENT_USER_KEY = 'lifer.currentUser'

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isLifeListRecord(value: unknown): value is Record<string, string[]> {
  return typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
    && Object.values(value).every(isStringArray)
}

export function loadCurrentUser(): string | null {
  return localStorage.getItem(CURRENT_USER_KEY)
}

export function saveCurrentUser(userId: string): void {
  localStorage.setItem(CURRENT_USER_KEY, userId)
}

export function loadLifeLists(): Record<string, string[]> {
  const saved = localStorage.getItem(LIFE_LISTS_KEY)
  if (saved !== null) {
    const parsed: unknown = JSON.parse(saved)
    if (!isLifeListRecord(parsed)) {
      throw new Error('Saved life lists have an invalid format.')
    }
    return parsed
  }

  const legacySaved = localStorage.getItem(LEGACY_LIFE_LIST_KEY)
  if (legacySaved === null) return {}

  const legacyList: unknown = JSON.parse(legacySaved)
  if (!isStringArray(legacyList)) {
    throw new Error('Saved life list has an invalid format.')
  }
  return { finn: legacyList }
}

export function saveLifeLists(lifeLists: Record<string, string[]>): void {
  localStorage.setItem(LIFE_LISTS_KEY, JSON.stringify(lifeLists))
}

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
    && defaultUsers.some((user) => user.id === trip.userId)
    && typeof trip.name === 'string'
    && Array.isArray(trip.destinations)
    && trip.destinations.every(isDestination)
}

export function loadTrips(): Trip[] {
  const saved = localStorage.getItem(TRIPS_KEY)
  if (saved === null) return initialTrips

  const parsed: unknown = JSON.parse(saved)
  if (!Array.isArray(parsed) || !parsed.every(isTrip)) {
    throw new Error('Saved trips have an invalid format.')
  }

  return parsed
}

export function saveTrips(trips: Trip[]): void {
  localStorage.setItem(TRIPS_KEY, JSON.stringify(trips))
}
