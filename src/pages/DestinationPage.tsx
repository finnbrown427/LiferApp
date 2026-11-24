import Page from '../components/Page'
import { navigate } from '../utils/navigation'
import { destinationId as destinationSlug, removeDestination, trips } from '../data/trips'
import './DestinationPage.css'

function DestinationPage({ tripId, destinationId }: { tripId: string; destinationId: string }) {
  const trip = trips.find((item) => item.id === tripId)
  const destination = trip?.destinations.find(
    (item) => destinationSlug(item) === destinationId,
  )

  if (!trip || !destination) {
    return <Page title="Destination not found" backTo={`/trips/${tripId}`} />
  }

  const deleteDestination = () => {
    if (!window.confirm(`Remove ${destination.name} from this trip?`)) return

    removeDestination(tripId, destination)
    navigate(`/trips/${tripId}`)
  }

  return (
    <Page
      title={destination.name}
      backTo={`/trips/${tripId}`}
    >
      <section className="destination-placeholder">
        <p>Destination details will go here.</p>
      </section>
      <div className="destination-actions">
        <button
          className="delete-destination-button"
          type="button"
          onClick={deleteDestination}
        >
          Remove destination
        </button>
      </div>
    </Page>
  )
}

export default DestinationPage
