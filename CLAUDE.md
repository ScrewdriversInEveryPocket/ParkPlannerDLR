# CLAUDE.md

The Disneyland Resort Planning Tool by ScrewdriversInEveryPocket ("DLR Planner" when installed) is an unofficial, static, offline-first Disneyland Resort trip planner. It's plain HTML and JavaScript with no build step, licensed GPLv3. `README.md` explains what it does for users.

## Files

| Path | What it is |
|---|---|
| `index.html` | The page: all the markup (tabs, wizard steps, dialogs), then the script tags in load order. |
| `css/app.css` | All the styles, light and dark. |
| `js/*.js` | The app's code, as plain scripts (no modules, so it still opens straight from the folder). See **Where the code lives**. |
| `shim.js` | Data layer (`window.dash`). It parses and checks each dataset, runs calcs, and fetches the live forecast, live park hours (ThemeParks.wiki) and US public holidays (Nager.Date). |
| `data/*.js` | One bundled dataset per file. Each has CSV text plus a header: source, `pulled`, `until`, `review`, `columns`. |
| `data/manifest.js` | Lists every data file. Both `index.html` and `sw.js` read it. |
| `version.js` | The app's only version: `1.YYYYMM.N`, N counting the updates saved that month and back to 1 each new month (e.g. `1.202610.4`, shown as "Version 1.202610.4"; earlier `pdp-v19`–`pdp-v54`, then `2026/10/26 - v1`–`v3`). Raise it whenever any file changes: `sw.js` uses it to refresh the offline cache, and the page shows it at the top. |
| `sw.js` | Offline cache. Reads its version from `version.js`. |
| `check.html` | Quick check: every dataset, then 12 sample days in the real app. |
| `tests/` | The full test run (`tests/run.html`) and the expected plans (`tests/golden/plans.json`). See `tests/README.md`. |
| `CHANGELOG.md` | One line per version. |
| `scripts/*.ps1` | Windows PowerShell helpers: `update-data.ps1` refreshes every scripted dataset in one go, `bump-version.ps1` raises the version and adds the CHANGELOG line, `test.ps1` runs all the tests, `serve.ps1` is a local web server, plus export or import a dataset CSV and download the OSM and weather sources. Each has a header explaining it. |
| `vendor/` | d3 and jsPDF, served locally. |
| `icons/`, `manifest.webmanifest` | App icons and install manifest. |
| `_BACKUP/` | Local only, gitignored: backups. |
| `_sources/` | Raw source downloads and the scripts that fetch and parse them (Disney calendar, showtimes, dining, restrooms; Queue-Times; OpenStreetMap). Uploaded with the app, except the `raw` folders and `shows/js` (Disney's own files, kept local; see `.gitignore`). |

## Where the code lives

The scripts load in this order, and they share one set of top-level names (every function and setting is visible to every file, as if it were one script):

| File | What's in it |
|---|---|
| `js/settings.js` | The planner's tuning numbers (walking speeds, meal lengths, restroom stops, break and hop limits, more time, repeat limits, spreading a light day: `SPREAD_*`), one comment each |
| `js/core.js` | Saved settings, month names, forecast loaders, derived data (waits by week and month, highlights), colour legends |
| `js/charts.js` | Chart helpers (tooltips, axes, redraw on resize), week charts, grouped bars, the ride table |
| `js/explore.js` | Hourly and planner data, the best-dates finder (wizard Dates step), best time of day heatmaps, events chart |
| `js/controls.js` | Shared settings (`dpState`, and `SETTINGS`: one list of every setting with a control, used to bind both tabs' copies, `syncGlobals` and saving), repeat rides, ride details, tap-to-cycle and restaurant chips (`dineChips`; the tap rule `dineTap` is in `js/meals.js`), hotels (`HOTELS`, `HOTEL_WALK` and `travelMin`, from `data/hotels.js`), start and finish, break |
| `js/day.js` | The planner's day: day context (`dayContext`), closure and data notes, the About-the-data table, expected waits |
| `js/walks.js` | Gates (`GATE`, `GC_GATE`), security and tap-in lines (`SEC`, `entryInfo`), Lightning Lane settings (`LL`), places (`PLACES`), walking times (`walkMin`, remembered per pair of place objects in `WALK_MEMO`), meal and show spots (`mealSpots` builds each park's quick-service list once, so the same objects are reused and the memo hits; `dineSpot` in `js/meals.js` does the same per restaurant via `DINE_SPOTS`). Place objects are shared, so never change one |
| `js/scheduler.js` | The scheduler: break timing, free time, fit advice, Lightning Lane bookings, `scheduleBlock`, `llPlan`, `planDay`; spare time on a light day (`scheduleSpread`: longer meals and rest breaks, then `spreadTry`: rides put off to a better hour, kept via `spreadKeep`); meals held for a later park (`opts.hold`) and later visits to the same park (`opts.later`) on hopper days; meal times (`mealWin`); more time when rides or meal times don't fit (`flexFix`, `flexText`) |
| `js/meals.js` | Restaurants (`DINING`, `DINE_PICKS`), booking tips, picked meals and their notes (`dineNote`; `dineDrop` takes an other-park pick off a one-park day), meal stops near the next ride (`annotateMeals`) |
| `js/restrooms.js` | Restroom stops on plans (`RESTROOMS`, `annotateRestrooms`) |
| `js/hopper.js` | Park Hopper days (`planHopper`, `planHopperBoth`; the search, ranking and regrouping in `planHopper0`; `hopMiss`; the Starting park notes, `hopNotes`) |
| `js/fit.js` | Fit checks: which rides would still fit (`roomFor`), the summary line (`glanceText`, `fitStatus`) |
| `js/plan-day.js` | Plan a day: fit banner, ride chips, schedule list, day charts, Tonight. Slow extras (`roomFor`, `fullAdvice`) run just after the plan paints in one `dpLater` job (one job at a time: a new draw replaces it; `dpFlush()` runs it now, which the tests use); the week-at-a-glance plans fill in on a timer guarded by `weekToken`. A restaurant tap redraws only the day (`drawDay`), not trip scoring |
| `js/take.js` | Plan a day, take it with you: checklist and copy text |
| `js/trip.js` | Trip wizard, first steps: your trip, trip scoring and best dates |
| `js/wizard.js` | Trip wizard: days, rides, day pages, export step, walking chart. A day page shows its plan first; `fit.later()` (room for more via `wzMore`, take-off advice via `fullAdvice`) runs just after as `wz.laterJob` |
| `js/time-of-day.js` | Time of day overlay chart and its chips |
| `js/walk-explorer.js` | Walking times page (More menu): the walk between any two mapped spots at each pace and crowd level |
| `js/state.js` | Restoring and saving settings (localStorage `pdp-state`) |
| `js/pdf.js` | Day PDF (Plan a day) and trip PDF (Trip wizard) |
| `js/busy.js` | The "Working out your plan" overlay and quick-tap batching. Wraps `drawDay`, `drawTrip` and `drawWalk`: a tap on a quick plan runs as before; on a slow one (Park Hopper, or a draw that last took 120 ms or more) the redraws wait until taps stop for 200 ms, so several quick taps plan once, then a transform-only CSS spinner paints, the planner runs, and a busy flag swallows taps until the plan and its slow extras are done. Ride chips update at once (`chipNow`) and read their counts fresh on each tap. No planner logic changes; `?nobusy` in the page address turns it off (the tests and `check.html` use it). Loads just before `app.js` |
| `js/app.js` | Settings dialog, redraw when data loads, tabs, startup. Startup opens the Welcome tab (`panel-welcome` in `index.html`, a hidden `tab-extra` also listed first in More) on every load unless `location.hash` names a tab (`#plan`) or an element on one; nothing saves Welcome as a last tab. Welcome is information only (no settings): its `data-go` buttons and links click that tab's own button, so the More label updates, and its `data-trip-btn` buttons read "Pick up my trip" when `PDP_SAVED.wz.key` is set (a saved wizard trip with park days picked). Its styles are the `.wel-*` rules at the end of `css/app.css` |

- Put new code in the file it belongs to. Functions can be used from any file once the page has loaded.
- The planner (`planDay`, `planHopper`, `planHopperBoth`, `scheduleBlock` via `opts.S`, and helpers such as `travelMin`, `hotelGate`, `entryInfo`, `paceWalk`, `dinePicked`) takes a settings object, `dpState` (Plan a day) when none is passed. The wizard and the trip PDF pass `wzSettings(day)`, a day's own rides, break, walking choice, start and finish and meals on top of the shared settings. Don't change `dpState` to plan a wizard day.
- **Code that runs while the page loads** (not inside a function, e.g. hooking up a button) may only call functions from its own file or an earlier one, since later files haven't loaded yet.
- A new file goes in three places: a script tag in `index.html` (in order, with `onerror="pdpMissing(this)"` so a missing file is named on screen), the `js` list in `sw.js`, and the table above.

## Updating data

**Scripts first, always.** The owner's rules, which override any habit of looking data up yourself:

1. **If a script exists for a refresh, run it. Never do a scripted refresh by hand**: don't browse Disney's site, don't type hours, showtimes or restrooms into a CSV, don't hand-edit `data/park_hours_published.js`, `data/disney_showtimes.js` or `data/restrooms.js`.
2. **If a script fails, fix it or write a new one, then run it.** Never fall back to searching the web and entering data by hand; that burns tokens and makes mistakes. A dataset with no script gets one (PowerShell only) the first time it's due.
3. **Never get around a block** (bot check, 401, 429, a 403 on the first request). Stop and give the owner a one-line command to run on their PC. Disney's site can't be reached from a cloud sandbox.

| To do this | Run (from the project folder, `powershell -ExecutionPolicy Bypass -File ...`) |
|---|---|
| "Update the data" / "update all the data sources" / anything about hours, showtimes, restrooms, restaurants, rides, events or refurbishments | `.\scripts\update-data.ps1` (or `-Only calendar`, `-Only restrooms`, `-Only dining`, `-Only rides`; `-NoFetch` re-parses, `-NoTest` skips tests). It fetches, parses, imports what changed, checks closures, party nights, restaurants and rides against Disney's own feeds, bumps the version once with a CHANGELOG line, runs the tests, and lists what's due by hand. Report its **Summary** block. |
| Change a dataset by hand (only the ones with no script) | `.\scripts\export-dataset.ps1 <id>`, edit `_sources\edit\<id>.csv`, `.\scripts\import-dataset.ps1 <id> [-Until d] [-Review d]` |
| Bump the version for any change | `.\scripts\bump-version.ps1 -Note "What changed."` (writes `version.js` and the CHANGELOG line) |
| Test | `.\scripts\test.ps1`, then `-Update` if the plan changes are expected |
| Yearly: weather, crowd averages, typical hours | `.\scripts\update-data.ps1 -Only weather` (every two years), `-Only crowds` (after the daily Queue-Times file is appended by hand), `-Only typical-hours` (each January; refuses until a full year is saved) |
| OpenStreetMap download | `.\scripts\fetch-osm.ps1` (download only; matching is a hand step, see UPDATING.md) |
| Datasets that can't be scripted, and why | UPDATING.md, **Datasets with no script**: Queue-Times collection (its rules), Thrill Data `wait_by_date` (403 to scripts), ticket prices (no feed found yet), and the hand-judged files (refurb notes, events, holidays, rides, lands, gates, hotels). |

**Starting cold** (e.g. "update the data" a year or two from now): read UPDATING.md's **Updating everything** section only (scripts-first rule, script table, the table of what each Summary flag means, and the **Browser runbook** for the few datasets no script can fetch), run `update-data.ps1` with the yearly steps that are due, act on each flag, then do only the datasets it lists as **Due by hand**.

Then follow **[UPDATING.md](UPDATING.md)**: its top section, **Updating everything**, has the full script table, the datasets that have no script and why, and the routine. Each dataset has its own section with its source, format and checks. The **About the data** tab in the app, and the end of `update-data.ps1`'s output, show which datasets are ending soon or due.

## Rules

- **No outside calls for features that don't have an offline fallback.** Every feature must still work offline from what's bundled in `data/`. Runtime calls today: the weather forecast (Open-Meteo, or Xweather with the user's own keys) , live park hours and today's showtimes from ThemeParks.wiki, and US public holidays from Nager.Date (all in `shim.js`); each falls back to the bundled data on any failure.
- **Sources we don't use:**
  - Don't use TouringPlans; its terms ban automated access.
  - Don't get around Queue-Times' Cloudflare bot check or scrape it in bulk.
  - ThemeParks.wiki: call it live only (hours and showtimes), cache briefly in the browser (12 h), and never bundle its data into the app's files; its terms forbid bundling.
- **OpenStreetMap credit.** The data in `data/park_places.js` is © OpenStreetMap contributors under the ODbL. Keep that credit in the app (Plan a day card, wizard day pages, PDF footers, About) and in the README.
- **Back up before editing.** Copy files to `_BACKUP/<date>-<change>/` first.
- **Never commit or push without the owner's go-ahead.**
- **Every change:**
  - bump the version in `version.js` (`1.YYYYMM.N`: next N this month, or 1 in a new month) and add a line to `CHANGELOG.md`: `.\scripts\bump-version.ps1 -Note "..."` does both (once per update; `update-data.ps1` already does it for a refresh);
  - run the tests: `powershell -ExecutionPolicy Bypass -File .\scripts\test.ps1` (about two minutes; see `tests/README.md`);
  - if plans changed on purpose, read the listed differences, then save them with `test.ps1 -Update`;
  - plan a day in each park.
- **No Python or Node on the owner's PC:** helpers are PowerShell only. `scripts\serve.ps1` serves the folder at `http://localhost:8000/` when something needs http.
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
  - **Restaurants and parks:** a one-park day (Plan a day on one park, a wizard day on a one-park ticket) offers only that park's restaurants; a pick saved for the other park comes off that day with a note (`dineDrop`). There is no "add a hop" button: a Park Hopper day (Plan a day set to Park Hopper, every day on a Park Hopper ticket) plans the hop for a restaurant in the other park itself, even with no rides picked there ("Add rides in … if you want some there"). Never change the park, ticket or restaurant the group chose.
  - **Restaurant chips** (`dineTap` in `js/meals.js`, used by `dineChips`): tapping an unpicked chip makes it lunch if that slot is free, else dinner (replacing that pick); the second tap switches to the other meal (replacing a pick there and freeing its old slot); the third tap removes it; press and hold removes it at any point; a one-meal restaurant skips the meal it lacks. Any restaurant can be picked for any meal it serves, and any pair is reachable in either order. "✓ Good for lunch/dinner" is only a hint about which park you're in then, never a limit: the hopper arranges hops around the picks, and the plan warns, never changing the pick. Chips update at once on a tap and read `dine` live, so `js/busy.js` batching stays right.
  - **Meals the group wants always stay in the plan.** A lunch or dinner is "wanted" when they picked a restaurant for it in that park (`dinePicked`) or set a time for it (`lunchAt` / `dinnerAt` not `'auto'`); `keen` in `scheduleBlock`. When the rides run out early (or none were picked), the day doesn't leave: it waits with free time (`freeText`, "catch a show, grab a snack or shop") and then has the meal (lunch never before 11; whenever-fits dinner from 5:30 pm), then leaves. A finish time the group set before the meal moves later until the meal is over, past the usual 2 h cap if needed but never past close (`flexEnds(..., long)` candidates in `flexFix`, tried only while a wanted meal is missing; `mealsWanted`), and the plan says so with the usual "You leave … later … to have dinner" wording. On a split day dinner goes after the break; a lunch that can't finish before the break goes after it. Same for Plan a day, the wizard and Park Hopper days. "Is after you leave" is only said when the group set the finish; the "Done early … stay until" note only shows when that time is later than the plan's leave.
- **Walking times:**
  - A walk runs from one ride's exit to the next ride's entrance (`park_places`): straight-line distance × 1.35, at the group's pace.
  - Relaxed is 50 m/min, Normal 65, Go-go 80.
  - The waits-vs-steps slider (`WALK_FACTOR`, `WAIT_WEIGHT` in `js/settings.js`): a minute of walking counts at least as much as a minute in line at every position (walking is time too); towards Fewer steps it counts more, and hopper plans favour fewer hops.
  - Walks are up to 15% slower in the busiest weeks.
  - Before a break or a park hop, the plan walks to the gate.
  - Hotel times (`data/hotels.js`, read into `HOTEL_WALK` in `js/controls.js`): routed footpath metres from an average room to the turnstiles, at the group's pace, plus elevator minutes. The Grand Californian has its own California Adventure entrance. Every entry from the hotel (morning, return from a break) adds the security and tap-in line from `data/security_waits.js` (by time from opening, scaled by how busy the day is). Hops only tap in. Grand Californian guests use its own California Adventure entrance (gate `gc` in `data/gates.js`) when it's open; hops always use the Esplanade.
- **Park Hopper days** (`planHopper0`): never change the Starting park the group set. Hops only from 11 (`HOP_FIRST`), at most 2. Shapes: one park; A, hop, B; A, hop, B, hop, A; with a break: A, break, A or B (then maybe a hop), A, hop, B, break, B, and A, hop, B, break, A (on the hour only, for speed). Hop times on the half hour (back to A on the hour after 1.5 h in B), plus `HOP_MEAL_STEPS` quarter hours just before a picked restaurant meal (hop in) and just after it (hop out, from where the meal actually ended). A picked restaurant in the other park that a later visit goes to is held (`opts.hold`: no meal eaten before it); meals with no restaurant picked are eaten before hopping. A middle visit waits with free time for a wanted meal, like the last one; a visit with only a picked-restaurant meal is allowed. Ranking (`better`): wanted meals (`hopMiss`), then most picked rides, then earliest finish, then cost = minutes in line + walking (in the parks plus each hop's walk and tap-in) x `HOP_RANK_WALK[slider]` + idle minutes x `HOP_RANK_IDLE`, then fewer hops. Then on the best plan: let rides wait for a later visit to the same park when quieter (`opts.later`), and try each ride on the other visit to its park, each kept only if the day ranks better; then spread a light day on every visit. Notes (`hopNotes`): on auto, which park it starts in and why; with a Starting park set and a restaurant in the other park, when it hops over and whether starting there would save a hop.
- **Restrooms:** 🚻 marks come from `data/restrooms.js` (Disney's map points) via `annotateRestrooms` in `js/restrooms.js`: within 2 min walk (3 before a 30+ min line or the walk out), only before such lines, before a break or hop, or every 90 min. Island restrooms are skipped. PDFs write the word "Restrooms" (PDF fonts have no emoji).
- **More time when rides don't fit:** when picked rides would be left off, or a chosen meal time doesn't fit, a finish time the group set may move up to 2 h later (never past close; further, up to close, only for a meal the group wants, see **Meals**), or the midday break may shrink (always at least 1 h at the hotel after the travel each way). Whichever meets the most meal times, then fits the most rides, with the fewest extra minutes wins; on a tie the break is kept. 15-minute steps. The plan says what changed. A finish at close with no break changes nothing.
- **Spreading a light day:** when the picked rides are done `SPREAD_SPARE_MIN` (90) min or more before the end of the day, or of the morning before a break (`planDay0` runs `spreadTry` on the morning block too; `scheduleSpread` does the stay-all-day plan, the afternoon after a break and every visit of a hopper day; a hopper visit before a break uses `spreadTry` as the morning does), the block is planned again with `pad.spread`. In `scheduleBlock` the chosen ride can then be put off (`later`: ride -> { at, why }, each ride once) to the start of a later hour when that saves at least `SPREAD_GAIN_MIN` (5) min, `SPREAD_GAIN_PCT` (10%) of its wait-and-weather minutes now (`feelMin`: expected standby wait plus `SPREAD_HEAT_MIN` / `SPREAD_RAIN_MIN` / `SPREAD_COLD_WET_MIN` by `exposure` and `wet`), and `SPREAD_GAIN_PER_H` (5) min for every hour it waits; never a Lightning Lane use, never to an hour within `SPREAD_RESERVE_MIN` of the end. Other rides and meals go on meanwhile; when only put-off rides are left, the plan has one block of free time (`spread: true`, back-to-back waits merged, stopping at the next meal start, `mealNext`) saying which ride comes later and why. `spreadTry` keeps the new plan only if it put something off, every ride fits, no meal of the packed plan or wanted meal (`mealsWanted`) is lost, and at walk slider 3 or 4 it walks at most `SPREAD_WALK_MAX` (5%) more; otherwise the packed plan stands. It is deterministic (`flexFix` re-runs `planDay0`). The test group `three-rides` (first 3 headliners, golden on 10, 130 and 300 days out) covers it. Most light days still start at rope drop, since the hourly data says mornings are quietest; spreading then only reorders the rides.
- **Meal times:** lunch (whenever fits, or around 11:30 am, then each hour from noon to 3 pm; not 11, since hops only start at 11 and an 11 am lunch in the other park can't fit; a saved 11 loads as 11:30) and dinner (whenever fits, or around 4 to 9 pm), a shared setting like Break around, with a per-day override in the wizard. The meal starts within about half an hour of it; if it can't (even with more time), the plan says so and that meal goes back to whenever fits.
- **Closed rides:** a ride in `refurbs` on that date is greyed out and can't be picked for that day, and comes off the day's list if it was picked (with a note).
- **Start and finish:** each day can start at rope drop, 10 am, 1 pm or a set time, and finish at close or a set time. A start after lunch or a finish by 4 pm turns the midday break off for that day, and the plan says so.
- **Shortest rider:** rides above their height (`min_height_in` in `ride_profiles`) stay pickable but are flagged "(N in and up)" on chips and "Riders must be at least N in tall" on plans, with a Rider Switch note. Every ride's height is shown on plans and PDFs, since families may have children of different heights.
- **Refurbishments:** a ride in `refurbs` on that date is left out of the plan, and the wizard only puts it on days when it's open (see **Closed rides**).
- **Plan wording:** keep plain, short, friendly wording on plans. Dates past what the data covers fall back to typical values and say so on the plan (the `day_note` in each data file's header).
