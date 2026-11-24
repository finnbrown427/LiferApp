import './Dashboard.css'
import Link from '../components/Link'
import Page from '../components/Page'
import { trips } from '../data/trips'


function Dashboard() {
  return (
    <Page title="Dashboard">
      <div className="dashboard-actions">
        {/* TODO: make this open a trip creation form */}
        <button className="primary-button" type="button">+ Add trip</button>
      </div>

      <section className="trip-grid" aria-label="Trips">
        {trips.map((trip) => (
          <Link
            key={trip.id}
            to={`/trips/${trip.id}`}
            className="trip-card"
          >
            <span className="trip-card-label">Trip</span>
            <h2>{trip.name}</h2>
            <p>{trip.cities.length} {trip.cities.length === 1 ? 'city' : 'cities'}</p>
            <span className="card-arrow" aria-hidden="true">→</span>
          </Link>
        ))}
      </section>
    </Page>
  )
}

export default Dashboard
