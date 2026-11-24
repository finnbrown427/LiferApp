import Page from '../components/Page'
import { navigate } from '../utils/navigation'
import { cityId as citySlug, removeCity, trips } from '../data/trips'
import './CityPage.css'

function CityPage({ tripId, cityId }: { tripId: string; cityId: string }) {
  const trip = trips.find((item) => item.id === tripId)
  const cityName = trip?.cities.find(
    (city) => citySlug(city) === cityId,
  )

  if (!trip || !cityName) {
    return <Page title="City not found" backTo={`/trips/${tripId}`} />
  }

  const deleteCity = () => {
    if (!window.confirm(`Remove ${cityName} from this trip?`)) return

    removeCity(tripId, cityName)
    navigate(`/trips/${tripId}`)
  }

  return (
    <Page
      title={cityName}
      backTo={`/trips/${tripId}`}
    >
      <section className="city-placeholder">
        <p>City details will go here.</p>
      </section>
      <div className="city-actions">
        <button
          className="delete-city-button"
          type="button"
          onClick={deleteCity}
        >
          Remove city
        </button>
      </div>
    </Page>
  )
}

export default CityPage
