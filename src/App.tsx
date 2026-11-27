import { useEffect, useState } from 'react'
import './App.css'
import DestinationPage from './pages/DestinationPage'
import Dashboard from './pages/Dashboard'
import TripPage from './pages/TripPage'
import LifeListPage from './pages/LifeListPage'
import Page from './components/Page'
import AuthPage from './pages/AuthPage'
import { useAuth } from './contexts/AuthContext'
import { CurrentUserProvider } from './contexts/CurrentUserContext'
import { LifeListProvider } from './contexts/LifeListContext'
import { TripsProvider } from './contexts/TripsContext'

function AppRoutes() {
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const handleNavigation = () => setPath(window.location.pathname)
    window.addEventListener('popstate', handleNavigation)
    return () => window.removeEventListener('popstate', handleNavigation)
  }, [])

  if (path === '/') {
    return <Dashboard />
  }

  // probably a better way/ more readable way to do this path.match stuff lol
  const destinationMatch = path.match(/^\/trips\/([^/]+)\/destinations\/([^/]+)\/?$/)
  if (destinationMatch) {
    return <DestinationPage tripId={destinationMatch[1]} destinationId={destinationMatch[2]} />
  }

  const tripMatch = path.match(/^\/trips\/([^/]+)\/?$/)
  if (tripMatch) {
    return <TripPage key={tripMatch[1]} tripId={tripMatch[1]} />
  }

if (path === '/life-list') {
  return <LifeListPage />
}

  return <Page title="Page not found" backTo="/" />
}

function App() {
  const { session, isLoading, initializationError } = useAuth()
  // replace ^ with v to use log out function
  // const { session, isLoading, initializationError, signOut } = useAuth()

  // const [isSigningOut, setIsSigningOut] = useState(false)
  // const [signOutError, setSignOutError] = useState<string | null>(null)

  if (isLoading) {
    return (
      <main className="auth-status">
        <h1>Lifer</h1>
        <p>Checking your sign-in status...</p>
      </main>
    )
  }

  if (!session && initializationError) {
    return (
      <main className="auth-status">
        <h1>Could not connect</h1>
        <p role="alert">{initializationError}</p>
        <button type="button" onClick={() => window.location.reload()}>
          Try again
        </button>
      </main>
    )
  }

  if (!session) return <AuthPage />

  // const handleSignOut = async () => {
  //   setIsSigningOut(true)
  //   setSignOutError(null)
  //   try {
  //     await signOut()
  //   } catch (error) {
  //     setSignOutError(error instanceof Error ? error.message : 'Could not sign out.')
  //   } finally {
  //     setIsSigningOut(false)
  //   }
  // }

  return (
    <>
      {/* <header className="session-bar">
        <span>{session.user.email ?? 'Signed in'}</span>
        <button type="button" onClick={() => void handleSignOut()} disabled={isSigningOut}>
          {isSigningOut ? 'Signing out...' : 'Sign out'}
        </button>
      </header>
      {signOutError && <p className="session-error" role="alert">{signOutError}</p>} */}
      <CurrentUserProvider>
        <LifeListProvider>
          <TripsProvider>
            <AppRoutes />
          </TripsProvider>
        </LifeListProvider>
      </CurrentUserProvider>
    </>
  )
}

export default App
