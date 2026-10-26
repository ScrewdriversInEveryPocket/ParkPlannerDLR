# Raw sources

What's behind the files in data/, kept so a refresh can see what was used last time. See UPDATING.md for how each dataset is refreshed.

Each folder's scripts work out where they are, so run them from anywhere, for example
`powershell -ExecutionPolicy Bypass -File .\_sources\shows\fetch-shows.ps1`. Fetch scripts default to today's date.

| Folder | What's in it | Scripts |
|---|---|---|
| `crowds/` | Queue-Times daily crowd ratings, 2015-2019 and 2023 to Oct 23, 2026 (Disneyland park 16, California Adventure park 17). | none (collected by hand, one page at a time) |
| `dining/` | Disney's dining list and one detail record per restaurant, parsed into `disney_dining.csv` and `disney_dining_hours.csv`. See `dining/README.md`. | `fetch-dining.ps1`, `parse-dining.ps1` |
| `osm/` | OpenStreetMap extracts of both parks from Oct 25, 2026 (points of interest, and building and footpath geometry), plus the matched park_places CSVs (before and after picking ride doors). © OpenStreetMap contributors, ODbL. | `scripts\fetch-osm.ps1` |
| `park_hours/` | Disney's official hours, Oct 24 to Dec 5, 2026, from Disney's calendar. | none yet (copied by hand) |
| `restrooms/` | Disney's restroom map page, parsed into `restrooms.csv`. See `restrooms/README.md`. | `fetch-restrooms.ps1`, `parse-restrooms.ps1` |
| `shows/` | Disney's day calendar for the next 42 days, parsed into `disney_showtimes.csv` (set showtimes) and `disney_atmosphere_times.csv` (everything else). | `fetch-shows.ps1`, `parse-shows.ps1` |
| `edit/` | Where `scripts\export-dataset.ps1` puts a dataset's CSV for editing. | |
| `weather/` | Where `scripts\fetch-weather.ps1` saves Open-Meteo history. | `scripts\fetch-weather.ps1` |

**What's uploaded:** the scripts, the parsed CSVs and the OpenStreetMap and crowd files. The `raw` folders (Disney's pages and feeds, as downloaded) and `shows/js` (Disney's website code, saved while finding the showtimes feed) stay on the PC and aren't uploaded (see `.gitignore`), because they're Disney's files. A fresh download of the project can rebuild them by running the fetch scripts.
