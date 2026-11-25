import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { useCurrentUser } from './CurrentUserContext'
import { loadLifeLists, saveLifeLists } from '../repositories/localStorageRepository'

type LifeListContextValue = {
    lifeList: Set<string> | null
    setLifeList: (lifeList: Set<string>) => void
}

const LifeListContext = createContext<LifeListContextValue | null>(null)

export function LifeListProvider({ children }: { children: ReactNode }) {
  const { currentUserId } = useCurrentUser()
  const [lifeLists, setLifeLists] = useState<Record<string, string[]>>(loadLifeLists)
  const savedLifeList = lifeLists[currentUserId]
  const lifeList = savedLifeList === undefined ? null : new Set(savedLifeList)

  useEffect(() => {
    saveLifeLists(lifeLists)
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