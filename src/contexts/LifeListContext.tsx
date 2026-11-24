import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

type LifeListContextValue = {
    lifeList: Set<string> | null
    setLifeList: (lifeList: Set<string>) => void
}

const LifeListContext = createContext<LifeListContextValue | null>(null)

const STORAGE_KEY = 'lifer.lifeList'

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item: unknown) => typeof item === 'string')
}

// gets life list from local storage
function loadLifeList(): Set<string> | null {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === null) return null

  const parsed: unknown = JSON.parse(saved)
  if (!isStringArray(parsed)) {
    throw new Error('Saved life list has an invalid format.')
  }

  return new Set(parsed)
}

export function LifeListProvider({ children }: { children: ReactNode }) {
  const [lifeList, setLifeList] = useState<Set<string> | null>(() => loadLifeList())

  useEffect(() => {
    if (lifeList === null) {
      localStorage.removeItem(STORAGE_KEY)
      return
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify([...lifeList]))
  }, [lifeList])

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