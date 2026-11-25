import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { useCurrentUser } from './CurrentUserContext'

type LifeListContextValue = {
    lifeList: Set<string> | null
    setLifeList: (lifeList: Set<string>) => void
}

const LifeListContext = createContext<LifeListContextValue | null>(null)

const STORAGE_KEY = 'lifer.lifeLists'
const LEGACY_STORAGE_KEY = 'lifer.lifeList'

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item: unknown) => typeof item === 'string')
}

function isLifeListRecord(value: unknown): value is Record<string, string[]> {
  return typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
    && Object.values(value).every(isStringArray)
}

function loadLifeLists(): Record<string, string[]> {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved !== null) {
    const parsed: unknown = JSON.parse(saved)
    if (!isLifeListRecord(parsed)) {
      throw new Error('Saved life lists have an invalid format.')
    }
    return parsed
  }

  const legacySaved = localStorage.getItem(LEGACY_STORAGE_KEY)
  if (legacySaved === null) return {}

  const legacyList: unknown = JSON.parse(legacySaved)
  if (!isStringArray(legacyList)) {
    throw new Error('Saved life list has an invalid format.')
  }
  return { finn: legacyList }
}

export function LifeListProvider({ children }: { children: ReactNode }) {
  const { currentUserId } = useCurrentUser()
  const [lifeLists, setLifeLists] = useState<Record<string, string[]>>(loadLifeLists)
  const savedLifeList = lifeLists[currentUserId]
  const lifeList = savedLifeList === undefined ? null : new Set(savedLifeList)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lifeLists))
  }, [lifeLists])

  const setLifeList = (nextLifeList: Set<string>) => {
    setLifeLists((currentLifeLists) => ({
      ...currentLifeLists,
      [currentUserId]: [...nextLifeList],
    }))
  }

  return (
    <LifeListContext.Provider value={{ lifeList, setLifeList }}>
      {children}
    </LifeListContext.Provider>
  )
}

export function useLifeList() {
  const context = useContext(LifeListContext)

  if (context === null) {
    throw new Error('useLifeList must be used within a LifeListProvider')
  }

  return context
}