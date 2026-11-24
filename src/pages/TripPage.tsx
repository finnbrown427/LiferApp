import { useEffect, useState, type FormEvent } from 'react'
import Link from '../components/Link'
import Page from '../components/Page'
import { addCity as appendCity, cityId, trips } from '../data/trips'
import './TripPage.css'

function TripPage({ tripId }: { tripId: string }) {
  const trip = trips.find((item) => item.id === tripId)
  const [cities, setCities] = useState<string[]>(() => [...(trip?.cities ?? [])])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [cityName, setCityName] = useState('')

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
    setCityName('')
  }

  const addCity = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const name = cityName.trim()
    if (!name) return

    const updatedTrip = appendCity(tripId, name)
    setCities(updatedTrip?.cities ?? [...cities, name])
    closeModal()
  }

  return (
    <Page title={trip.name} backTo="/">
      <section className="city-section" aria-label="Cities">
        <div className="city-section-heading">
          <div className="section-heading">
            <h2>Cities</h2>
            <span>{cities.length}</span>
          </div>
          <button
            className="primary-button"
            type="button"
            onClick={() => setIsModalOpen(true)}
          >
            + Add city
          </button>
        </div>

        <div className="city-list">
          {cities.map((city, index) => (
            <Link
              key={city}
              to={`/trips/${trip.id}/cities/${cityId(city)}`}
              className="city-row"
            >
              <span className="city-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="city-name">{city}</span>
              <span className="city-arrow" aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      </section>

      {isModalOpen && (
        <div className="modal-backdrop" onMouseDown={closeModal}>
          <section
            className="city-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-city-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <p className="modal-eyebrow">New destination</p>
                <h2 id="add-city-title">Add a city</h2>
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

            <form className="city-form" onSubmit={addCity}>
              <label htmlFor="city-name">
                City name
                <input
                  id="city-name"
                  name="cityName"
                  value={cityName}
                  onChange={(event) => setCityName(event.target.value)}
                  placeholder="e.g. Rome"
                  required
                  autoFocus
                />
              </label>

              <div className="form-actions">
                <button className="secondary-button" type="button" onClick={closeModal}>
                  Cancel
                </button>
                <button className="primary-button" type="submit">
                  Add city
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
