import {
  hotspotsNearDestination,
  type DestinationHotspot,
} from '../data/ebird'

const MIN_DISTANCE = 10

const EARTH_RADIUS_KM = 6371

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

// Returns distance in kilometres
function hotspotDistanceHelper(a: DestinationHotspot, b: DestinationHotspot): number {
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

// gets list of nearby hotspots from ebird data layer
// then does/will do filtering/sorting operations on it before providing hotspots to the destination page
export async function loadDestinationHotspots(
  latitude: number,
  longitude: number,
): Promise<DestinationHotspot[]> {
  const hotspots = await hotspotsNearDestination(latitude, longitude)

  const distanceFilteredHotspots: DestinationHotspot[] = []

  // Distance filtering: filters out a hotspot if there is a better one within MIN_DISTANCE
  for (let i = 0; i < hotspots.length; i++) {
    let tooCloseFlag = false
    for (let j = 0; j < distanceFilteredHotspots.length; j++) {
      const distance = hotspotDistanceHelper(distanceFilteredHotspots[j], hotspots[i])
      if (distance < MIN_DISTANCE) {
        tooCloseFlag = true
      }
    }
    if (!tooCloseFlag) {
      distanceFilteredHotspots.push(hotspots[i])
    }
  }

  // TODO: add species diversification option

  return distanceFilteredHotspots.slice(0,5)
}
