import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { useCurrentUser } from './CurrentUserContext'
import { loadLifeList, updateLifeList } from '../repositories/lifeListRepository'
import type { LifeListEntry } from '../data/lifeList'

type LifeListContextValue = {
    lifeList: Set<string> | null
    entries: LifeListEntry[]
    setLifeList: (entries: LifeListEntry[]) => Promise<void>
    isLoading: boolean
    error: string | null
  }

const LifeListContext = createContext<LifeListContextValue | null>(null)

export function LifeListProvider({ children }: { children: ReactNode }) {
  const { currentUserId } = useCurrentUser()
  const [lifeList, setLifeListState] = useState<Set<string> | null>(null)
  const [entries, setEntries] = useState<LifeListEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    setIsLoading(true)
    setError(null)

  void loadLifeList(currentUserId)
  .then((loadedEntries) => {
    if (active) {
      const nextEntries = loadedEntries ?? []
      setEntries(nextEntries)
      setLifeListState(
        loadedEntries
          ? new Set(loadedEntries.map((entry) => entry.scientificName))
          : null,
      )
    }
    })
    .catch((cause: unknown) => {
      if (active) {
        setError(cause instanceof Error ? cause.message : 'Could not load life list.')
      }
    })
    .finally(() => {
      if (active) setIsLoading(false)
    })

  return () => {
    active = false
  }
}, [currentUserId])

  const saveLifeList = async (nextEntries: LifeListEntry[]) => {
    await updateLifeList(currentUserId, nextEntries)
    setEntries(nextEntries)
    setLifeListState(new Set(nextEntries.map((entry) => entry.scientificName)))
  }

  return (
    <LifeListContext.Provider
      value={{
        lifeList,
        entries,
        isLoading,
        error,
        setLifeList: saveLifeList,
      }}
    >
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