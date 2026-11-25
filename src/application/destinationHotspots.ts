import {
  hotspotsNearDestination,
  type DestinationHotspot,
} from '../data/ebird'

export async function loadDestinationHotspots(
  latitude: number,
  longitude: number,
): Promise<DestinationHotspot[]> {
  const hotspots = await hotspotsNearDestination(latitude, longitude)
  return hotspots.slice(0, 3)
}
