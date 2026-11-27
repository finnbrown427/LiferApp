import './Dashboard.css'
import { useEffect, useState, type FormEvent, type ChangeEvent } from 'react'
import Link from '../components/Link'
import Page from '../components/Page'
import { importLifeList } from '../application/lifeList'
import { useLifeList } from '../contexts/LifeListContext'
import { loadRecentLifeListImages, type RecentLifeListImage } from '../repositories/speciesImageRepository'
import type { LifeListEntry } from '../data/lifeList'
import { useTrips } from '../contexts/TripsContext'

type RecentBirdsState = {
  entries: LifeListEntry[]
  images: RecentLifeListImage[]
  error: string | null
}

function formatObservedDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
}

function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [tripName, setTripName] = useState('')
  const [tripError, setTripError] = useState<string | null>(null)
  const [isCreatingTrip, setIsCreatingTrip] = useState(false)
  const [lifeListStatus, setLifeListStatus] = useState<string | null>(null)
  const [recentBirdsState, setRecentBirdsState] = useState<RecentBirdsState | null>(null)

  // Read and update the selected user's life list.
  const {
    lifeList,
    entries: lifeListEntries,
    isLoading: isLoadingLifeList,
    error: lifeListError,
    setLifeList,
  } = useLifeList()
  const {
    trips: dashboardTrips,
    isLoading: isLoadingTrips,
    error: tripsError,
    createTrip: addTrip,
  } = useTrips()

  const hasRecentBirdsState = recentBirdsState?.entries === lifeListEntries
  const recentBirds = hasRecentBirdsState ? recentBirdsState.images : []
  const recentBirdsError = hasRecentBirdsState ? recentBirdsState.error : null
  const isLoadingRecentBirds = !isLoadingLifeList && lifeList !== null && !hasRecentBirdsState

  useEffect(() => {
    if (isLoadingLifeList || !lifeList) return

    let active = true
    loadRecentLifeListImages(lifeListEntries)
      .then((images) => {
        if (active) setRecentBirdsState({ entries: lifeListEntries, images, error: null })
      })
      .catch((error: unknown) => {
        if (active) {
          setRecentBirdsState({
            entries: lifeListEntries,
            images: [],
            error: error instanceof Error ? error.message : 'Could not load recent bird images.',
          })
        }
      })

    return () => {
      active = false
    }
  }, [isLoadingLifeList, lifeList, lifeListEntries])

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
    setTripError(null)
  }

  const createTrip = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const name = tripName.trim()
    if (!name) return

    setIsCreatingTrip(true)
    setTripError(null)
    try {
      await addTrip(name)
      closeModal()
    } catch (error) {
      setTripError(error instanceof Error ? error.message : 'Could not create trip.')
    } finally {
      setIsCreatingTrip(false)
    }
  }

  const handleLifeListUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    if (!file) return

    try {
      const csvText = await file.text()
      const importedList = importLifeList(csvText)

      await setLifeList(importedList)
      setLifeListStatus('')
    } catch (error) {
      setLifeListStatus(
        error instanceof Error ? error.message : 'Could not import the CSV file.',
      )
    }
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
              onChange={handleLifeListUpload}
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

      <section className="recent-life-list" aria-labelledby="recent-life-list-title">
        <div className="recent-life-list-heading">
          <div>
            <p className="modal-eyebrow">Life list</p>
            <h2 id="recent-life-list-title">Recently seen birds</h2>
          </div>
          <p>Three of your latest observations, with photos.</p>
        </div>

        {isLoadingLifeList && <p>Loading your life list...</p>}
        {!isLoadingLifeList && lifeListError && (
          <p role="alert">Could not load your life list: {lifeListError}</p>
        )}
        {!isLoadingLifeList && !lifeListError && lifeList === null && (
          <p>Import your eBird life list to see recent birds here.</p>
        )}
        {!isLoadingLifeList && !lifeListError && lifeList !== null && lifeListEntries.every((entry) => !entry.observedDate) && (
          <p>Reimport an eBird CSV with a Date column to see your most recent observations.</p>
        )}
        {!isLoadingLifeList && !lifeListError && isLoadingRecentBirds && (
          <p>Loading bird photos...</p>
        )}
        {!isLoadingLifeList && !lifeListError && recentBirdsError && (
          <p role="alert">Could not load bird photos: {recentBirdsError}</p>
        )}
        {!isLoadingLifeList && !lifeListError && !isLoadingRecentBirds && !recentBirdsError && lifeList !== null && lifeListEntries.some((entry) => entry.observedDate) && recentBirds.length === 0 && (
          <p>No imported photos match the dated birds in this life list yet.</p>
        )}
        {recentBirds.length > 0 && (
          <div className="recent-bird-grid">
            {recentBirds.map((bird) => (
              <figure className="recent-bird-card" key={bird.scientificName}>
                <img
                  src={bird.imageUrl}
                  alt={bird.commonName}
                  loading="lazy"
                />
                <figcaption>
                  <span className="recent-bird-name">{bird.commonName}</span>
                  <time dateTime={bird.observedDate}>{formatObservedDate(bird.observedDate)}</time>

                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>

      <section className="trip-grid" aria-label="Trips">
        {isLoadingTrips && <p>Loading trips...</p>}
        {tripsError && <p role="alert">Could not load trips: {tripsError}</p>}
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

              {tripError && <p role="alert">{tripError}</p>}

              <div className="form-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={closeModal}
                  disabled={isCreatingTrip}
                >
                  Cancel
                </button>
                <button className="primary-button" type="submit" disabled={isCreatingTrip}>
                  {isCreatingTrip ? 'Creating...' : 'Create trip'}
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
