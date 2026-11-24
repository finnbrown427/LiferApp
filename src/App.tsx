import { useEffect, useState } from 'react'
import './App.css'
import DestinationPage from './pages/DestinationPage'
import Dashboard from './pages/Dashboard'
import TripPage from './pages/TripPage'
import Page from './components/Page'

function App() {
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

  return <Page title="Page not found" backTo="/" />
}

export default App
