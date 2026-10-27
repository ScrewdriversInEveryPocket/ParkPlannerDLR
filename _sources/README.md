# Raw sources

What's behind the files in data/, kept so a refresh can see what was used last time. See UPDATING.md for how each dataset is refreshed.

**Don't run these one by one, and never refresh their datasets by hand: run `scripts\update-data.ps1`**, which fetches, parses, imports, bumps the version and tests in one go. See UPDATING.md, **Which script does what**. If a script breaks, fix the script and run it again.

Each folder's scripts work out where they are, so run them from anywhere, for example
`powershell -ExecutionPolicy Bypass -File .\_sources\shows\fetch-shows.ps1`. Fetch scripts default to today's date.

| Folder | What's in it | Scripts |
|---|---|---|
| `crowds/` | Queue-Times daily crowd ratings, 2015-2019 and 2023 to Oct 23, 2026 (Disneyland park 16, California Adventure park 17). | `build-crowds.ps1` (the averages; the daily file itself is collected by hand, one page at a time) |
| `dining/` | Disney's dining list and one detail record per restaurant, parsed into `disney_dining.csv` and `disney_dining_hours.csv`. See `dining/README.md`. | `fetch-dining.ps1`, `parse-dining.ps1` |
| `osm/` | OpenStreetMap extracts of both parks from Oct 25, 2026 (points of interest, and building and footpath geometry), plus the matched park_places CSVs (before and after picking ride doors). © OpenStreetMap contributors, ODbL. | `scripts\fetch-osm.ps1` |
| `park_hours/` | `park_hours_published.csv`, the CSV of `data/park_hours_published.js`, written by `shows/parse-shows.ps1` from the same calendar files (plus the first hand-copied pull, Oct 24 to Dec 5, 2026). | `shows/fetch-shows.ps1`, `shows/parse-shows.ps1` (run both with `scripts\update-data.ps1`), `build-typical-hours.ps1` (park_hours_2025 and hours_by_week, each January) |
| `restrooms/` | Disney's restroom map page, parsed into `restrooms.csv`. See `restrooms/README.md`. | `fetch-restrooms.ps1`, `parse-restrooms.ps1` |
| `rides/` | Disney's attraction list (`raw\attractions-<date>.json`) and `attractions.csv` made from it, for checking `ride_profiles`. | `check-rides.ps1` (run with `scripts\update-data.ps1 -Only rides`) |
| `shows/` | Disney's day calendar for the next 42 days, parsed into `disney_showtimes.csv` (set showtimes) and `disney_atmosphere_times.csv` (everything else). | `fetch-shows.ps1`, `parse-shows.ps1` |
| `edit/` | Where `scripts\export-dataset.ps1` puts a dataset's CSV for editing. | |
| `weather/` | Where `scripts\fetch-weather.ps1` saves Open-Meteo history, and the CSVs `build-weather.ps1` makes from it. | `scripts\fetch-weather.ps1`, `build-weather.ps1` (run both with `scripts\update-data.ps1 -Only weather`) |

**What's uploaded:** the scripts, the parsed CSVs and the OpenStreetMap and crowd files. The `raw` folders (Disney's pages and feeds, as downloaded) and `shows/js` (Disney's website code, saved while finding the showtimes feed) stay on the PC and aren't uploaded (see `.gitignore`), because they're Disney's files. A fresh download of the project can rebuild them by running the fetch scripts.
