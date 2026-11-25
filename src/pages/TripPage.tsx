import { useEffect, useState, type FormEvent } from 'react'
import Link from '../components/Link'
import Page from '../components/Page'
import { useDestinationSearch, type Destination } from '../data/destination'
import { destinationId } from '../data/trips'
import { useTrips } from '../contexts/TripsContext'
import './TripPage.css'

function TripPage({ tripId }: { tripId: string }) {
  const { findTrip, addDestination } = useTrips()
  const trip = findTrip(tripId)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [destinationName, setDestinationName] = useState('')
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null)
  const searchResults = useDestinationSearch(destinationName)

  useEffect(() => {
    if (!isModalOpen) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsModalOpen(false)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isModalOpen])

  if (!trip) {
    return <Page title="Trip not found" backTo="/" />
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setDestinationName('')
    setSelectedDestination(null)
  }
  

  const addDestinationHandler = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedDestination) return

    addDestination(tripId, selectedDestination)
    closeModal()
  }

  return (
    <Page title={trip.name} backTo="/">
      <section className="destination-section" aria-label="Destinations">
        <div className="destination-section-heading">
          <div className="section-heading">
            <h2>Destinations</h2>
            <span>{trip.destinations.length}</span>
          </div>
          <button
            className="primary-button"
            type="button"
            onClick={() => setIsModalOpen(true)}
          >
            + Add destination
          </button>
        </div>

        <div className="destination-list">
          {trip.destinations.map((destination, index) => (
            <Link
              key={destination.id}
              to={`/trips/${trip.id}/destinations/${destinationId(destination)}`}
              className="destination-row"
            >
              <span className="destination-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="destination-name">{destination.name}</span>
              <span className="destination-arrow" aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      </section>

      {isModalOpen && (
        <div className="modal-backdrop" onMouseDown={closeModal}>
          <section
            className="destination-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-destination-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <p className="modal-eyebrow">New destination</p>
                <h2 id="add-destination-title">Add a destination</h2>
              </div>
              <button
                className="modal-close"
                type="button"
                aria-label="Close"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            <form className="destination-form" onSubmit={addDestinationHandler}>
              <label htmlFor="destination-name">
                Destination name
                <input
                  id="destination-name"
                  name="destinationName"
                  value={destinationName}
                  onChange={(event) => {
                    setDestinationName(event.target.value)
                    setSelectedDestination(null)
                  }}
                  placeholder="e.g. Rome"
                  required
                  autoFocus
                />
              </label>

              <div className="destination-search-results">
                {searchResults.map((destination) => (
                  <button
                    key={destination.id}
                    type="button"
                    className={
                      selectedDestination?.id === destination.id
                        ? 'destination-search-result destination-search-result-selected'
                        : 'destination-search-result'
                    }
                    onClick={() => {
                      setSelectedDestination(destination)
                      setDestinationName(destination.name)
                    }}
                  >
                    <span className="destination-search-result-name">{destination.name}</span>
                    {destination.country && (
                      <span className="destination-search-result-country">{destination.country}</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="form-actions">
                <button className="secondary-button" type="button" onClick={closeModal}>
                  Cancel
                </button>
                <button className="primary-button" type="submit" disabled={!selectedDestination}>
                  Add destination
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </Page>
  )
}

export default TripPage
