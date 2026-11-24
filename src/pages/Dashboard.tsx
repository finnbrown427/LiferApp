import './Dashboard.css'
import { useEffect, useState, type FormEvent } from 'react'
import Link from '../components/Link'
import Page from '../components/Page'
import { trips, type Trip } from '../data/trips'

function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [tripName, setTripName] = useState('')
  const [dashboardTrips, setDashboardTrips] = useState<Trip[]>(() => [...trips])

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



    const id = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || `trip-${Date.now()}`

    const newTrip: Trip = { id, name, destinations: [] }

    trips.push(newTrip)
    setDashboardTrips((currentTrips) => [...currentTrips, newTrip])
    closeModal()
  }

  return (
    <Page title="Dashboard">
      <div className="dashboard-actions">
        <button
          className="primary-button"
          type="button"
          onClick={() => setIsModalOpen(true)}
        >
          + Add trip
        </button>
      </div>

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
