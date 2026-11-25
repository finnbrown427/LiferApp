import './Dashboard.css'
import { useEffect, useState, type FormEvent } from 'react'
import Link from '../components/Link'
import Page from '../components/Page'
import { importLifeList } from '../application/lifeList'
import { useLifeList } from '../contexts/LifeListContext'
import { useTrips } from '../contexts/TripsContext'

function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [tripName, setTripName] = useState('')
  const [lifeListStatus, setLifeListStatus] = useState<string | null>(null)

  // Read and update the selected user's life list.
  const { lifeList, setLifeList } = useLifeList()
  const { trips: dashboardTrips, createTrip: addTrip } = useTrips()

  useEffect(() => {
    if (!isModalOpen) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsModalOpen(false)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isModalOpen])

  const closeModal = () => {
    setIsModalOpen(false)
    setTripName('')
  }

  const createTrip = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const name = tripName.trim()
    if (!name) return

    addTrip(name)
    closeModal()
  }

  return (
    <Page title="Dashboard">
      <section className="life-list-feature" aria-labelledby="life-list-label">
        <div className="life-list-summary">
          <div className="life-list-metric">
            <p className="life-list-count" aria-live="polite">
              {lifeList?.size ?? 0}
            </p>
            <h2 className="life-list-label" id="life-list-label">
              Lifers
            </h2>
          </div>
          {lifeList === null && (
            <p className="life-list-prompt">Import your life list to get started.</p>
          )}
        </div>
        <div className="life-list-actions">
          <div className="life-list-import">
            <input
              id="life-list-upload"
              className="life-list-upload-input"
              type="file"
              accept=".csv,text/csv"
              onChange={async (event) => {
                const file = event.currentTarget.files?.[0]
                if (!file) return

                try {
                  const csvText = await file.text()
                  const lifeList = importLifeList(csvText)

                  // Save the parsed list in the provider so other pages can access it.
                  setLifeList(lifeList)

                  setLifeListStatus('')
                } catch (error) {
                  setLifeListStatus(
                    error instanceof Error ? error.message : 'Could not import the CSV file.'
                  )
                }
              }}
            />
            {/* TODO: add instructions for how to get CSV */}
            <label className="life-list-upload-button" htmlFor="life-list-upload">
              Import life list
            </label>
          </div>
          <button
            className="primary-button"
            type="button"
            onClick={() => setIsModalOpen(true)}
          >
            + Add trip
          </button>
        </div>
      </section>
      {lifeListStatus && <p role="alert">{lifeListStatus}</p>}

      <section className="trip-grid" aria-label="Trips">
        {dashboardTrips.map((trip) => (
          <Link
            key={trip.id}
            to={`/trips/${trip.id}`}
            className="trip-card"
          >
            <span className="trip-card-label">Trip</span>
            <h2>{trip.name}</h2>
            <p>{trip.destinations.length} {trip.destinations.length === 1 ? 'destination' : 'destinations'}</p>
            <span className="card-arrow" aria-hidden="true">→</span>
          </Link>
        ))}
      </section>

      {isModalOpen && (
        <div className="modal-backdrop" onMouseDown={closeModal}>
          <section
            className="trip-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-trip-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <p className="modal-eyebrow">New trip</p>
                <h2 id="add-trip-title">Add a trip</h2>
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

            <form className="trip-form" onSubmit={createTrip}>
              <label htmlFor="trip-name">
                Trip name
                <input
                  id="trip-name"
                  name="tripName"
                  value={tripName}
                  onChange={(event) => setTripName(event.target.value)}
                  placeholder="trip name"
                  required
                  autoFocus
                />
              </label>

              <div className="form-actions">
                <button className="secondary-button" type="button" onClick={closeModal}>
                  Cancel
                </button>
                <button className="primary-button" type="submit">
                  Create trip
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </Page>
  )
}

export default Dashboard
