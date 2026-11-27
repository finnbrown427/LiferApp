import { useEffect, useState } from 'react'
import Page from '../components/Page'
import { useLifeList } from '../contexts/LifeListContext'
import { useCurrentUser } from '../contexts/CurrentUserContext'
import { loadRecentLifeListImages, type RecentLifeListImage } from '../repositories/speciesImageRepository'
import type { LifeListEntry } from '../data/lifeList'
import './LifeListPage.css'

type BirdLoadState = {
  entries: LifeListEntry[]
  birds: RecentLifeListImage[]
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

function LifeListPage() {
  const { entries, isLoading, error } = useLifeList()
  const [birdLoadState, setBirdLoadState] = useState<BirdLoadState | null>(null)
  const hasBirdLoadState = birdLoadState?.entries === entries
  const birds = hasBirdLoadState ? birdLoadState.birds : []
  const imageError = hasBirdLoadState ? birdLoadState.error : null
  const isLoadingImages = !isLoading && entries.length > 0 && !hasBirdLoadState
  const { currentUserId, profiles, profilesLoading } = useCurrentUser()
  const activeProfile = profiles.find((profile) => profile.id === currentUserId)

  useEffect(() => {
    if (isLoading || entries.length === 0) return

    let active = true
    loadRecentLifeListImages(entries, entries.length)
      .then((images) => {
        if (active) setBirdLoadState({ entries, birds: images, error: null })
      })
      .catch((cause: unknown) => {
        if (active) {
          setBirdLoadState({
            entries,
            birds: [],
            error: cause instanceof Error ? cause.message : 'Could not load photos.',
          })
        }
      })

    return () => {
      active = false
    }
  }, [entries, isLoading])

  return (
    <Page title="Life list" backTo="/">
      <section className="life-list-gallery" aria-labelledby="life-list-gallery-title">
        <header className="life-list-gallery-heading">
          <div>
            <h2 id="life-list-gallery-title">{profilesLoading ? 'Loading...' : activeProfile?.display_name ?? 'Your'}'s Lifers </h2>
          </div>
          <div className="life-list-gallery-count" aria-label={`${entries.length} species in your life list`}>
            <span>{entries.length}</span>
            <small>species</small>
          </div>
        </header>

        {isLoading && <p className="life-list-gallery-status">Loading your life list...</p>}
        {!isLoading && error && (
          <p className="life-list-gallery-status life-list-gallery-error" role="alert">
            Could not load your life list: {error}
          </p>
        )}
        {!isLoading && !error && entries.length === 0 && (
          <p className="life-list-gallery-status">
            Your life list is empty. Import an eBird CSV from the dashboard to get started.
          </p>
        )}
        {!isLoading && !error && isLoadingImages && (
          <p className="life-list-gallery-status">Finding photos for your life list...</p>
        )}
        {!isLoading && !error && imageError && (
          <p className="life-list-gallery-status life-list-gallery-error" role="alert">
            Could not load life-list photos: {imageError}
          </p>
        )}
        {!isLoading && !error && !isLoadingImages && !imageError && entries.length > 0 && birds.length === 0 && (
          <p className="life-list-gallery-status">
            No matching photos were found for dated entries in your life list.
          </p>
        )}

        {birds.length > 0 && (
          <div className="life-list-photo-grid">
            {birds.map((bird) => (
              <figure className="life-list-photo-card" key={bird.scientificName}>
                <img src={bird.imageUrl} alt={bird.commonName} loading="lazy" />
                <figcaption>
                  <h3>{bird.commonName}</h3>
                  <time dateTime={bird.observedDate}>{formatObservedDate(bird.observedDate)}</time>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>
    </Page>
  )
}

export default LifeListPage