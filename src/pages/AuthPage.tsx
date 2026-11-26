import { useState, type FormEvent } from 'react'
import { signInWithAccessCode } from '../repositories/authRepository'
import './AuthPage.css'

function AuthPage() {
  const [accessCode, setAccessCode] = useState('')
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSigningIn(true)
    setError(null)

    try {
      await signInWithAccessCode(accessCode)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign in.')
    } finally {
      setIsSigningIn(false)
    }
  }

  return (
    <main className="auth-screen">
      <section>
        <h1 id="auth-title">Lifer</h1>


        <form className="auth-form" onSubmit={signIn}>
          <div className="auth-code-field">
            <input
              id="auth-code"
              name="accessCode"
              type="text"
              autoComplete="off"
              value={accessCode}
              onChange={(event) => {
                setAccessCode(event.target.value)
                setError(null)
              }}
              autoCapitalize="none"
              spellCheck={false}
              placeholder="Enter access code"
              required
            />
          </div>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="auth-submit" type="submit" disabled={isSigningIn}>
            {isSigningIn ? 'Signing in...' : 'Continue'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default AuthPage
