// Shares the selected preset profile across the app and persists the selection in local storage.
// The profile selector is for organizing data, not for authenticating or restricting access.
import { createContext, useContext, useState, type ReactNode } from 'react'
import { defaultUsers, type UserId } from '../data/users'

type CurrentUserContextValue = {
  currentUserId: UserId
  setCurrentUserId: (userId: UserId) => void
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

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState<UserId>(getInitialUserId)

  const selectUser = (userId: UserId) => {
    localStorage.setItem(STORAGE_KEY, userId)
    setCurrentUserId(userId)
  }

  return (
    <CurrentUserContext.Provider value={{ currentUserId, setCurrentUserId: selectUser }}>
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
