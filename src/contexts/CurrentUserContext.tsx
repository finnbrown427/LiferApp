// Shares the selected preset profile across the app and persists the selection in local storage.
// Retrieves profiles from database
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { UserId } from '../data/users'
import { loadProfiles, type Profile } from '../repositories/profileRepository'
import { loadCurrentUser, saveCurrentUser } from '../repositories/localStorageRepository'


type CurrentUserContextValue = {
  profiles: Profile[]
  profilesLoading: boolean
  profilesError: string | null
  currentUserId: UserId
  setCurrentUserId: (userId: UserId) => void
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null)

function isUserId(value: string | null): value is UserId {
  return typeof value === 'string' && value.length > 0
}

function getInitialUserId(): UserId {
  const savedUserId = loadCurrentUser()
  return isUserId(savedUserId) ? savedUserId : 'finn'
}

// Gets profiles from the db
export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState<UserId>(getInitialUserId)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [profilesLoading, setProfilesLoading] = useState(true)
  const [profilesError, setProfilesError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfiles = async () => {
      setProfilesLoading(true)
      try {
        setProfiles(await loadProfiles())
        setProfilesError(null)
      } catch (error) {
        setProfilesError(error instanceof Error ? error.message : 'Could not load profiles.')
      } finally {
        setProfilesLoading(false)
      }
    }
    void fetchProfiles()
  }, [])

  const selectUser = (userId: UserId) => {
    saveCurrentUser(userId)
    setCurrentUserId(userId)
  }

  return (
    <CurrentUserContext.Provider value={{
      profiles,
      profilesLoading,
      profilesError,
      currentUserId,
      setCurrentUserId: selectUser,
    }}>
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
