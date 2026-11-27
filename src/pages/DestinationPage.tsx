import { useEffect, useState } from 'react'
import Page from '../components/Page'
import { navigate } from '../utils/navigation'
import { useTrips } from '../contexts/TripsContext'
import { loadDestinationHotspots } from '../application/destinationHotspots'
import {
  recentSpeciesAtHotspot,
  type DestinationHotspot,
  type RecentHotspotSpecies,
} from '../data/ebird'
import { useLifeList } from '../contexts/LifeListContext'
import { loadSpeciesImagesByCodes, type SpeciesImage } from '../repositories/speciesImageRepository'
import './DestinationPage.css'

type HotspotSpeciesResult = {
  species: Array<RecentHotspotSpecies & { image?: SpeciesImage }>
  error: string | null
  imageError: string | null
}

function DestinationPage({ tripId, destinationId }: { tripId: string; destinationId: string }) {
  const { findTrip, removeDestination } = useTrips()
  const { lifeList, isLoading: isLoadingLifeList, error: lifeListError } = useLifeList()
  const trip = findTrip(tripId)
  const destination = trip?.destinations.find(
    (item) => String(item.id) === destinationId,
  )
  const [hotspots, setHotspots] = useState<DestinationHotspot[]>([])
  const [isLoadingHotspots, setIsLoadingHotspots] = useState(false)
  const [hotspotError, setHotspotError] = useState('')
  const [speciesByHotspot, setSpeciesByHotspot] = useState<Record<string, HotspotSpeciesResult>>({})
  const [isLoadingSpecies, setIsLoadingSpecies] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)
  const [isRemovingDestination, setIsRemovingDestination] = useState(false)

  useEffect(() => {
    if (!destination) return

    let active = true
    setIsLoadingHotspots(true)
    setHotspotError('')
    setHotspots([])
    setSpeciesByHotspot({})
    setIsLoadingSpecies(false)

    loadDestinationHotspots(destination.latitude, destination.longitude)
      .then((results) => {
        if (active) setHotspots(results)
      })
      .catch((error: unknown) => {
        if (active) {
          setHotspotError(error instanceof Error ? error.message : 'Could not load hotspots.')
        }
      })
      .finally(() => {
        if (active) setIsLoadingHotspots(false)
      })

    return () => {
      active = false
    }
  }, [destination])

  useEffect(() => {
    if (hotspots.length === 0) return

    let active = true
    setIsLoadingSpecies(true)
    setSpeciesByHotspot({})

    Promise.all(
      hotspots.map(async (hotspot) => {
        try {
          const species = await recentSpeciesAtHotspot(hotspot.locId)
          try {
            const images = await loadSpeciesImagesByCodes(species.map((bird) => bird.speciesCode))
            return [
              hotspot.locId,
              {
                species: species.map((bird) => ({ ...bird, image: images[bird.speciesCode] })),
                error: null,
                imageError: null,
              },
            ] as const
          } catch (error) {
            return [
              hotspot.locId,
              {
                species,
                error: null,
                imageError: error instanceof Error ? error.message : 'Could not load species photos.',
              },
            ] as const
          }
        } catch (error) {
          return [
            hotspot.locId,
            {
              species: [],
              error: error instanceof Error ? error.message : 'Could not load recent species.',
              imageError: null,
            },
          ] as const
        }
      }),
    )
      .then((results) => {
        if (active) setSpeciesByHotspot(Object.fromEntries(results))
      })
      .finally(() => {
        if (active) setIsLoadingSpecies(false)
      })

    return () => {
      active = false
    }
  }, [hotspots])

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
            {/* <span>By total species seen, with recent lifers at each hotspot</span> */}
          </div>
        </div>

        {isLoadingHotspots && <p className="hotspot-status">Loading hotspots...</p>}
        {hotspotError && <p className="hotspot-status hotspot-error">{hotspotError}</p>}
        {!isLoadingLifeList && lifeListError && (
          <p className="hotspot-status hotspot-error" role="alert">
            Could not load your life list: {lifeListError}
          </p>
        )}
        {!isLoadingLifeList && !lifeListError && lifeList === null && (
          <p className="hotspot-status">
            if you import life list you can see species u need!!! !!!!
          </p>
        )}

        {!isLoadingHotspots && !hotspotError && hotspots.length === 0 && (
          <p className="hotspot-status">No recent hotspots found nearby.</p>
        )}

        {hotspots.length > 0 && (
          <ol className="hotspot-list">
            {hotspots.map((hotspot, index) => {
              const result = speciesByHotspot[hotspot.locId]
              const missingSpecies = result?.species
                .filter((species) => !lifeList?.has(species.sciName.toLowerCase()))
                .slice(0, 5) ?? []

              return (
                <li key={hotspot.locId} className="hotspot-row">
                  <span className="hotspot-index">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="hotspot-details">
                    <a href={hotspot.url} target="_blank" rel="noreferrer">
                      {hotspot.locName}
                    </a>
                    <p>{hotspot.totalSpecies} species seen all time</p>
                    <section
                      className="hotspot-recent-species"
                      aria-label={`Species ranked by latest individual count at ${hotspot.locName}`}
                    >
                      <h3>Frequent target species:</h3>
                      <p className="hotspot-species-explainer">
                      </p>
                      {(isLoadingSpecies || !result) && (
                        <p className="hotspot-status">Loading recent species...</p>
                      )}
                      {!isLoadingSpecies && result?.error && (
                        <p className="hotspot-status hotspot-error" role="alert">
                          {result.error}
                        </p>
                      )}
                      {!isLoadingSpecies && result?.imageError && (
                        <p className="hotspot-status hotspot-error" role="alert">
                          Could not load species photos: {result.imageError}
                        </p>
                      )}
                      {isLoadingLifeList && (
                        <p className="hotspot-status">Loading your life list...</p>
                      )}
                      {!isLoadingLifeList && !lifeListError && !isLoadingSpecies
                        && result && !result.error && result.species.length === 0 && (
                          <p className="hotspot-status">
                          </p>
                        )}
                      {!isLoadingLifeList && !lifeListError && !isLoadingSpecies
                        && result && !result.error && result.species.length > 0
                        && missingSpecies.length === 0 && (
                          <p className="hotspot-status">you have everything here</p>
                        )}
                      {!isLoadingLifeList && !lifeListError && !isLoadingSpecies
                        && missingSpecies.length > 0 && (
                          <ol className="recent-species-list">
                            {missingSpecies.map((species) => (
                              <li key={species.speciesCode} className="recent-species-row">
                                <img
                                  className={`recent-species-image${species.image ? '' : ' recent-species-image--placeholder'}`}
                                  src={species.image?.imageUrl ?? '/favicon.png'}
                                  alt=""
                                  loading="lazy"
                                />
                                <div className="hotspot-details">
                                  <a
                                    href={`https://ebird.org/species/${species.speciesCode}`}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    {species.comName}
                                  </a>
                                  {/* <span className="species-count-label">
                                    {species.latestCount === undefined
                                      ? 'Count not reported'
                                      : `${species.latestCount} ${species.latestCount === 1 ? 'individual' : 'individuals'}`}
                                  </span> */}
                                </div>
                              </li>
                            ))}
                          </ol>
                        )}
                    </section>
                  </div>
                  <span className="hotspot-arrow" aria-hidden="true">→</span>
                </li>
              )
            })}
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
