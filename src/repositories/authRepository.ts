import { supabase } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw new Error(error.message)
  return data.session
}

export function subscribeToAuthChanges(
  onSessionChange: (session: Session | null) => void,
): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    onSessionChange(session)
  })

  return () => data.subscription.unsubscribe()
}

export async function signInWithAccessCode(accessCode: string): Promise<void> {
  const email = import.meta.env.VITE_LIFER_SHARED_AUTH_EMAIL?.trim()
  if (!email) {
    throw new Error('The shared sign-in account has not been configured.')
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: accessCode,
  })

  if (error) throw new Error(error.message)
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}
