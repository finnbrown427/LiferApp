import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { useCurrentUser } from './CurrentUserContext'
import { loadLifeList, updateLifeList } from '../repositories/lifeListRepository'

type LifeListContextValue = {
    lifeList: Set<string> | null
    setLifeList: (lifeList: Set<string>) => Promise<void>
    isLoading: boolean
    error: string | null
  }

const LifeListContext = createContext<LifeListContextValue | null>(null)

export function LifeListProvider({ children }: { children: ReactNode }) {
  const { currentUserId } = useCurrentUser()
  const [lifeList, setLifeListState] = useState<Set<string> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)


  useEffect(() => {
    let active = true

    setIsLoading(true)
    setError(null)

  void loadLifeList(currentUserId)
    .then((loadedList) => {
      if (active) setLifeListState(loadedList)
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

const saveLifeList = async (nextLifeList: Set<string>) => {
  await updateLifeList(currentUserId, nextLifeList)
  setLifeListState(new Set(nextLifeList))
}

  return (
<LifeListContext.Provider
  value={{
    lifeList,
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