// Shares the selected preset profile across the app and persists the selection in local storage.
// Retrieves profiles from database
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { defaultUsers, type UserId } from '../data/users'
import { supabase } from '../lib/supabase'


type CurrentUserContextValue = {
  profiles: Profile[]
  currentUserId: UserId
  setCurrentUserId: (userId: UserId) => void
}

type Profile = {
  id: UserId
  display_name: string
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null)
const STORAGE_KEY = 'lifer.currentUser'

function isUserId(value: string | null): value is UserId {
  return defaultUsers.some((user) => user.id === value)
}

function getInitialUserId(): UserId {
  const savedUserId = localStorage.getItem(STORAGE_KEY)
  return isUserId(savedUserId) ? savedUserId : 'finn'
}

// Gets profiles from the db
export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState<UserId>(getInitialUserId)
  const [profiles, setProfiles] = useState<Profile[]>([])

  useEffect(() => {
    const loadProfiles = async () => {
      const { data, error } = await supabase
        .from('app_profiles')
        .select('id, display_name')

      if (error) {
        console.error('could not load profiles:', error.message)
        return
      }
      setProfiles(data ?? [])
    }
    void loadProfiles()
  }, [])

  const selectUser = (userId: UserId) => {
    localStorage.setItem(STORAGE_KEY, userId)
    setCurrentUserId(userId)
  }

  return (
    <CurrentUserContext.Provider value={{ profiles, currentUserId, setCurrentUserId: selectUser }}>
      {children}
    </CurrentUserContext.Provider>
  )
}

export function useCurrentUser() {
  const context = useContext(CurrentUserContext)
  if (context === null) {
    throw new Error('useCurrentUser must be used within CurrentUserProvider')
  }
  return context
}
