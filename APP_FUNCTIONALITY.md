# Lifer App Functionality

Lifer is a birding trip-planning app. It lets birders keep a personal life list, organize trips by destination, and find birding hotspots near planned destinations.

## Dashboard

- Selects a preset profile (Rosa or Finn) to view that person's trips and life list.
- Shows the number of species on the imported life list.
- Imports a life list from a CSV file, including eBird's "Download my data" export.
- Creates trips and displays the selected profile's trips and destination counts.

## Life list

- Parses scientific names and observation dates from the CSV, keeping each species' most recent observation date.
- Excludes entries such as hybrids, slash taxa, and non-species records, and normalizes names to genus and species.
- Saves each profile's species and latest observation date in Supabase.
- Shows the three most recently observed life-list birds with matching licensed images and common names on the dashboard.

## Trips and destinations

- Starts with example trips and destinations assigned to Rosa and Finn.
- Creates a trip from a name entered by the user.
- Saves trips and destinations in browser local storage, separated by selected profile.
- Searches for destinations by name using Open-Meteo geocoding, then lets the user add a selected result to a trip.
- Shows a trip's destinations and opens a detail page for each destination.
- Lets the user remove a destination after confirmation.

## Destination birding information

- Looks up nearby eBird hotspots using the destination's coordinates.
- Displays up to five nearby hotspots, ranked by the all-time number of species recorded there, with links to their eBird pages. For each hotspot, it shows up to five species not on the life list, ranked by the individual count in each species' latest eBird report from the last 30 days; this is not a checklist-frequency ranking. Small, credited photos appear when available; otherwise, the app's logo is used as a placeholder.
- Shows loading, empty, and error states while retrieving hotspot data.

## Data and current limitations

- The profile selector is not authentication: anyone using the app can select Rosa or Finn and view or change either profile's data.
- Life lists, including their latest observation dates, are stored in Supabase by profile.
- The app does not currently provide sign-in, trip editing or deletion, or a UI for comparing destination species against the life list.
- The eBird data module also contains functions for retrieving species in a region and finding species missing from a life list, but those functions are not currently exposed in the app's pages.
- eBird API requests are served by a Cloudflare Worker and require the server-side `EBIRD_API_TOKEN` environment variable; do not expose this token through a `VITE_` variable.
