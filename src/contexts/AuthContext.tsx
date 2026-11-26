import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  getSession,
  signOut,
  subscribeToAuthChanges,
} from '../repositories/authRepository'

type AuthContextValue = {
  session: Session | null
  isLoading: boolean
  initializationError: string | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [initializationError, setInitializationError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    let receivedAuthEvent = false

    const unsubscribe = subscribeToAuthChanges((nextSession) => {
      if (!active) return
      receivedAuthEvent = true
      setSession(nextSession)
      setInitializationError(null)
      setIsLoading(false)
    })

    void getSession()
      .then((currentSession) => {
        if (active && !receivedAuthEvent) setSession(currentSession)
      })
      .catch((error: unknown) => {
        if (active && !receivedAuthEvent) {
          setInitializationError(
            error instanceof Error ? error.message : 'Could not check your sign-in status.',
          )
        }
      })
      .finally(() => {
        if (active && !receivedAuthEvent) setIsLoading(false)
      })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{
      session,
      isLoading,
      initializationError,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === null) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
