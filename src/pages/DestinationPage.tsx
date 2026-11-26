import { useEffect, useState } from 'react'
import Page from '../components/Page'
import { navigate } from '../utils/navigation'
import { useTrips } from '../contexts/TripsContext'
import { loadDestinationHotspots } from '../application/destinationHotspots'
import type { DestinationHotspot } from '../data/ebird'
import './DestinationPage.css'

function DestinationPage({ tripId, destinationId }: { tripId: string; destinationId: string }) {
  const { findTrip, removeDestination } = useTrips()
  const trip = findTrip(tripId)
  const destination = trip?.destinations.find(
    (item) => String(item.id) === destinationId,
  )
  const [hotspots, setHotspots] = useState<DestinationHotspot[]>([])
  const [isLoadingHotspots, setIsLoadingHotspots] = useState(false)
  const [hotspotError, setHotspotError] = useState('')
  const [removeError, setRemoveError] = useState<string | null>(null)
  const [isRemovingDestination, setIsRemovingDestination] = useState(false)

  useEffect(() => {
    if (!destination) return

    setIsLoadingHotspots(true)
    setHotspotError('')

    loadDestinationHotspots(destination.latitude, destination.longitude)
      .then((results) => setHotspots(results))
      .catch((error: unknown) => {
        setHotspotError(error instanceof Error ? error.message : 'Could not load hotspots.')
      })
      .finally(() => setIsLoadingHotspots(false))

    return
  }, [destination])

  if (!trip || !destination) {
    return <Page title="Destination not found" backTo={`/trips/${tripId}`} />
  }

  const deleteDestination = async () => {
    if (!window.confirm(`Remove ${destination.name} from this trip?`)) return

    setIsRemovingDestination(true)
    setRemoveError(null)
    try {
      await removeDestination(tripId, destination)
      navigate(`/trips/${tripId}`)
    } catch (error) {
      setRemoveError(
        error instanceof Error ? error.message : 'Could not remove destination.',
      )
    } finally {
      setIsRemovingDestination(false)
    }
  }

  return (
    <Page
      title={destination.name}
      backTo={`/trips/${tripId}`}
    >
      <section className="destination-hotspots" aria-labelledby="hotspots-title">
        <div className="destination-section-heading">
          <div className="section-heading">
            <h2 id="hotspots-title">Top hotspots</h2>
            <span>By total species seen</span>
          </div>
        </div>

        {isLoadingHotspots && <p className="hotspot-status">Loading hotspots...</p>}
        {hotspotError && <p className="hotspot-status hotspot-error">{hotspotError}</p>}

        {!isLoadingHotspots && !hotspotError && hotspots.length === 0 && (
          <p className="hotspot-status">No recent hotspots found nearby.</p>
        )}

        {hotspots.length > 0 && (
          <ol className="hotspot-list">
            {hotspots.map((hotspot, index) => (
              <li key={hotspot.locId} className="hotspot-row">
                <span className="hotspot-index">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="hotspot-details">
                  <a href={hotspot.url} target="_blank" rel="noreferrer">
                    {hotspot.locName}
                  </a>
                  <p>{hotspot.totalSpecies} species seen all time</p>
                </div>
                <span className="hotspot-arrow" aria-hidden="true">→</span>
              </li>
            ))}
          </ol>
        )}
      </section>
      <div className="destination-actions">
        {removeError && <p role="alert">{removeError}</p>}
        <button
          className="delete-destination-button"
          type="button"
          onClick={deleteDestination}
          disabled={isRemovingDestination}
        >
          {isRemovingDestination ? 'Removing...' : 'Remove destination'}
        </button>
      </div>
    </Page>
  )
}

export default DestinationPage
