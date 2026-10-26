# CLAUDE.md

The Disneyland Resort Planning Tool by ScrewdriversInEveryPocket ("DLR Planner" when installed) is an unofficial, static, offline-first Disneyland Resort trip planner. It's plain HTML and JavaScript with no build step, licensed GPLv3. `README.md` explains what it does for users.

## Files

| Path | What it is |
|---|---|
| `index.html` | All the UI, plus one large inline script holding the planner logic. |
| `shim.js` | Data layer (`window.dash`). It parses and checks each dataset, runs calcs, and fetches the live forecast. |
| `data/*.js` | One bundled dataset per file. Each has CSV text plus a header: source, `pulled`, `until`, `review`, `columns`. |
| `data/manifest.js` | Lists every data file. Both `index.html` and `sw.js` read it. |
| `sw.js` | Offline cache. Bump `VERSION` whenever any file changes. It's the app's only version number: the page shows it at the top (e.g. v31). |
| `check.html` | Checks every dataset, then plans sample days in the real app. |
| `scripts/*.ps1` | Windows PowerShell helpers: export or import a dataset CSV, download the OSM and weather sources. |
| `vendor/` | d3 and jsPDF, served locally. |
| `icons/`, `manifest.webmanifest` | App icons and install manifest. |
| `_BACKUP/` | Local only, gitignored: backups. |
| `_sources/` | Raw source downloads and the scripts that fetch them (Disney calendar, showtimes, dining; Queue-Times; OpenStreetMap). Uploaded with the app. |

## Updating data

Follow **[UPDATING.md](UPDATING.md)**. If you're asked to "update all the data" or "update the data sources", start at its **Updating everything** section. It covers the file format, the routine, and a section for every dataset with its source, how to refresh it, and what to check. The **About the data** tab in the app shows which datasets are ending soon or due for a refresh.

## Rules

- **No new outside calls.** The only runtime network calls allowed are for the weather forecast: Open-Meteo, or Xweather with the user's own keys. Everything else is bundled into `data/`.
- **Sources we don't use:**
  - Don't use TouringPlans; its terms ban automated access.
  - Don't get around Queue-Times' Cloudflare bot check or scrape it in bulk.
  - Never bundle or call ThemeParks.wiki; its terms forbid bundling.
- **OpenStreetMap credit.** The data in `data/park_places.js` is © OpenStreetMap contributors under the ODbL. Keep that credit in the app (Plan a day card, wizard day pages, PDF footers, About) and in the README.
- **Back up before editing.** Copy files to `_BACKUP/<date>-<change>/` first.
- **Never commit or push without the owner's go-ahead.**
- **Every change:**
  - bump `VERSION` in `sw.js`;
  - open `check.html`;
  - run its sample plans, which need http, e.g. `python -m http.server`;
  - plan a day in each park.
- **Keep the docs in step.**
  - Update `README.md` when features or sources change.
  - Update `UPDATING.md` when a dataset's source or format changes.
  - Update the Sources and methods text in `index.html` (`id="method"`).

## Planner rules the owner has set

- **The tabs are separate tools.** The Trip wizard plans whole trips. Plan a day and the other tabs are single-day tools for locals and quick visits. A change to one doesn't carry over to the others unless asked.
- **Meals:**
  - Meals are always inside the parks, never during a midday hotel break, which is for rest.
  - After a break, food goes on the way in (Main Street U.S.A. or Buena Vista Street) or near the next ride.
  - Never suggest Downtown Disney.
- **Walking times:**
  - A walk runs from one ride's exit to the next ride's entrance (`park_places`): straight-line distance × 1.35, at the group's pace.
  - Relaxed is 50 m/min, Normal 65, Go-go 80.
  - Walks are up to 15% slower in the busiest weeks.
  - Before a break or a park hop, the plan walks to the gate.
  - Hotel times (`HOTEL_WALK` in `index.html`): routed footpath metres from an average room to the turnstiles, at the group's pace, plus elevator minutes. The Grand Californian has its own California Adventure entrance. Every entry from the hotel (morning, return from a break) adds the security and tap-in line from `data/security_waits.js` (by time from opening, scaled by how busy the day is). Hops only tap in. Grand Californian guests use its own California Adventure entrance (gate `gc` in `data/gates.js`) when it's open; hops always use the Esplanade.
- **Start and finish:** each day can start at rope drop, 10 am, 1 pm or a set time, and finish at close or a set time. A start after lunch or a finish by 4 pm turns the midday break off for that day, and the plan says so.
- **Shortest rider:** rides above their height (`min_height_in` in `ride_profiles`) stay pickable but are flagged "(N in and up)" on chips and "Riders must be at least N in tall" on plans, with a Rider Switch note. Every ride's height is shown on plans and PDFs, since families may have children of different heights.
- **Refurbishments:** a ride in `refurbs` on that date is left out of the plan, and the wizard only puts it on days when it's open.
- **Plan wording:** keep plain, short, friendly wording on plans. Dates past what the data covers fall back to typical values and say so on the plan (the `day_note` in each data file's header).
