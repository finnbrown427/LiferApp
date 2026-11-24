import Link from '../components/Link'
import Page from '../components/Page'
import { trips } from '../data/trips'
import './TripPage.css'

function TripPage({ tripId }: { tripId: string }) {
  const trip = trips.find((item) => item.id === tripId)

  if (!trip) {
    return <Page title="Trip not found" backTo="/" />
  }

  return (
    <Page title={trip.name} backTo="/">
      <section className="city-section" aria-label="Cities">
        <div className="section-heading">
          <h2>Cities</h2>
          <span>{trip.cities.length}</span>
        </div>

        <div className="city-list">
          {trip.cities.map((city, index) => (
            <Link
              key={city}
              to={`/trips/${trip.id}/cities/${city.toLowerCase()}`}
              className="city-row"
            >
              <span className="city-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="city-name">{city}</span>
              <span className="city-arrow" aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      </section>
    </Page>
  )
}

export default TripPage
