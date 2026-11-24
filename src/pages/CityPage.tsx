import Page from '../components/Page'
import './CityPage.css'

function CityPage({ tripId, cityId }: { tripId: string; cityId: string }) {
  return (
    <Page
      title={`City: ${cityId}`}
      backTo={`/trips/${tripId}`}
    >
      <section className="city-placeholder">
        <p>City details will go here.</p>
      </section>
    </Page>
  )
}

export default CityPage
