# Updating the data

This guide covers refreshing the DLR Planner's bundled data. It assumes you know nothing about the project except these files. Read **How the data is stored** and **The routine** once. After that, each dataset has its own section below.

The app makes no network calls except the live weather forecast. Everything else is built in, so it only changes when someone follows this guide.

---

## Updating everything ("update all the data sources")

If you were asked to update all the data, work through this list in order. It goes from the data that expires soonest to the data that barely changes:

1. Open the app's **About the data** tab, or `check.html`. It shows which datasets have ended, are ending soon or are due for a refresh. Do those first, but go through the whole list.
2. For each dataset in **What to refresh, and when** below, follow its section:
   - get the new data from the named source;
   - update the CSV and the header dates;
   - save the raw download under `_sources`.
3. If a source hasn't published anything new, leave that dataset alone. For example, Disney may not have announced next year's events yet. Still check it, and set `review` to a date when it's worth looking again.
4. If a source is blocked or needs a login, stop for that dataset and say so. Never get around a block, and never fill gaps with guesses dressed up as data. A plan that says "typical hours" is better than one built on made-up hours.
5. Follow **The routine** below for backups, the version bump and `check.html`.
6. Finish with a short summary for the owner covering:
   - what was updated, and the new "covers to" dates;
   - what had nothing new;
   - what couldn't be done and why;
   - anything that looked odd, such as a big jump in averages.

Don't commit or push; leave that to the owner.

`_sources` is not on GitHub. A fresh download of the project won't have the raw files, such as the daily crowd history. Datasets built from them then need those raw files collected again from their sources first, as each section explains. If that's too big a job to do safely, say so instead.

---

## How the data is stored

Each dataset is its own file in `data/`, for example `data/park_hours_published.js`. `data/manifest.js` lists them all in load order. `index.html` and `sw.js` both read that list, so you never edit them to add or remove a dataset.

Every data file looks like this:

```js
PDP_DATASET({
  id: "refurbs",
  title: "Announced refurbishments",
  about: "...what it is...",
  source: "...where it came from...",
  url: "https://...",
  license: "",             // only if the source needs credit, e.g. OpenStreetMap
  pulled: "2026-10-16",    // when the data was collected
  until: "2026-12-31",     // the last date it covers ("" = any date, e.g. averages)
  review: "2026-11-25",    // refresh by this date ("" = no need)
  refresh: "Every month or two...",
  day_note: "...shown on a day's plan when that day is past `until`...",
  columns: { ride: "ride!", park: "park!", start: "date!", end: "date", note: "text" }
}, `ride,park,start,end,note
it's a small world,Disneyland,2026-10-30,2026-11-12,Closed for its holiday overlay; reopens Nov 13.
`);
```

- **The CSV** sits between the backticks. Its first line is the header and must match `columns`, in the same order. It can't contain a backtick, a backslash or `${`.
- **`columns`** sets what each column may hold. A trailing `!` means a value is required.

  | Type | Meaning |
  |---|---|
  | `text` | anything |
  | `int`, `num` | whole number, any number |
  | `pct` | number from 0 to 100 |
  | `hour` | decimal hour 0 to 30. Closing after midnight goes past 24, so 1 am is `25` and 12:30 am is `24.5` |
  | `date` | `YYYY-MM-DD` |
  | `md` | `MM-DD` (repeats every year) |
  | `week` | week of the year, 1 to 52 (see below) |
  | `mon` | `Jan` to `Dec` |
  | `dow` | `Mon` to `Sun` |
  | `park` | `Disneyland` or `California Adventure`. `park+` also allows `Both` |
  | `ride` | must match a ride name in `ride_profiles` for that park |
  | `land` | must match a land in `lands` for that park |
  | `A\|B\|` | one of the listed values. A trailing `\|` allows blank |

- **Week numbers** come from the day of the year in a non-leap year: `week = min(52, floor((day_of_year - 1) / 7) + 1)`. Feb 29 counts as Feb 28. So week 1 is Jan 1 to 7, and week 52 is Dec 24 to 31.
- **Names must match exactly** across files, including apostrophes and accents: `Tiana's Bayou Adventure`, `Café Daisy`. Ride names are the ones in `ride_profiles`.

**When the app loads**, `shim.js` checks every file against its `columns`:

- A row missing a required value, or holding a bad one, is left out.
- Ride and land names are cross-checked.
- Anything found shows under **About the data → How current the data is** and in the browser console.

**When a date is past `until`**, the planner falls back to typical hours, average ticket prices or usual event windows, and shows the file's `day_note` on that day's plan. This applies to `park_hours_published`, `events` and `refurbs`. The About table marks each file as Current, Ends soon (within 45 days), Ended or Due for a refresh.

---

## The routine

1. **Back up.** Copy the files you'll change into `_BACKUP\<date>-<what>\`, for example `_BACKUP\2027-01-10-before-hours`. `import-dataset.ps1` does this for you. `_BACKUP` is local only (see `.gitignore`); `_sources` is uploaded with the app.
2. **Get the new data** from the source named in the dataset's section below. Save raw downloads under `_sources\<dataset>\` with the date in the file name, so the next person can see what was used.
3. **Edit the CSV.**
   - Copy it out with `export-dataset.ps1`, edit it, then put it back with `import-dataset.ps1`.
   - Or edit the text between the backticks directly.
4. **Update the header.**
   - Set `pulled` to today, and change `until` and `review` if they've moved.
   - Change `source` and `url` if the source changed, and keep any `license` credit.
5. **Bump the cache.** Raise the version in `version.js` by one (e.g. `pdp-v27` → `pdp-v28`) so installed copies download the new files. The app shows this number at the top (e.g. v28), so you can tell which version you're looking at. `import-dataset.ps1` does this too.
6. **Check.**
   - Open `check.html` and look for "All datasets passed".
   - Then press **Run sample plans**. This needs a web address, so use GitHub Pages or a local server such as `python -m http.server`, then open `http://localhost:8000/check.html`.
   - Then open the app, look at **About the data**, and plan a day in each park.
7. **Update the words** if what the data covers changed:
   - the **Sources and methods** text in `index.html` (search for `id="method"`);
   - the **Where the data comes from** table in `README.md`.

### The PowerShell helpers (`scripts/`)

Windows blocks scripts by default, so run them like this from the project folder:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\export-dataset.ps1 park_hours_published
# edit _sources\edit\park_hours_published.csv in a text editor
powershell -ExecutionPolicy Bypass -File .\scripts\import-dataset.ps1 park_hours_published -Until 2027-01-31 -Review 2026-12-20
```

- **`export-dataset.ps1 <id>`** writes the CSV to `_sources\edit\<id>.csv`.
- **`import-dataset.ps1 <id> [-Csv file] [-Pulled date] [-Until date] [-Review date]`**:
  - checks the header line matches;
  - backs up the old file to `_BACKUP`;
  - writes the new CSV and dates;
  - bumps `version.js`.

  `-Pulled` defaults to today.
- **`fetch-osm.ps1`** downloads a fresh OpenStreetMap extract of both parks to `_sources\osm\`.
- **`fetch-weather.ps1`** downloads ten years of Anaheim weather history from Open-Meteo to `_sources\weather\`.

Excel rewrites dates such as `2026-11-05` and `01-01` unless you import every column as Text. Use a text editor if you can.

### Rules for sources

- **TouringPlans:** don't use it. Its terms ban automated access.
- **Queue-Times:** don't get around its Cloudflare bot check, and don't scrape it in bulk. Read pages one at a time at a human pace, or stop.
- **ThemeParks.wiki:** never bundle its data or call its API. Its terms forbid bundling. It was used once, by hand, as a reference for choosing ride doors.
- **No new runtime calls.** The only outside calls the app makes are for the weather forecast (Open-Meteo, or Xweather with the user's own keys). Data is bundled, never fetched while the app runs.
- **OpenStreetMap credit:** OpenStreetMap data is under the ODbL. Keep "© OpenStreetMap contributors" in the app, README and PDFs, and keep `park_places` under the ODbL.
- **Unofficial dates:** only put official Disney hours in `park_hours_published`. Leave dates out until Disney publishes them; the planner falls back on its own.

---

## What to refresh, and when

| Order | Dataset | File | Goes stale | How often |
|---|---|---|---|---|
| 1 | Published park hours | `park_hours_published` | at `until` | every few weeks |
| 2 | Announced refurbishments | `refurbs` | as Disney announces | every month or two |
| 3 | Seasonal events | `events` | at `until` | when Disney announces a season |
| 4 | 1-day ticket prices | `ticket_tiers` | at `until` | every few months |
| 5 | Multi-day ticket prices | `multi_day_prices` | after a price change | each fall |
| 6 | Holidays and school breaks | `holidays` | at `until` | once a year, late summer |
| 7 | Rides, Lightning Lane, restaurants | `ride_profiles`, `lightning_lane`, `dining` | when the parks change | when something opens, closes or changes |
| 8 | Typical hours | `park_hours_2025`, `hours_by_week` | slowly | once a year, in January |
| 9 | Crowds and waits | `crowd_*`, `wait_by_date`, `waits_by_hour`, `ride_closures_by_month`, `closures_by_week` | slowly | once a year |
| 10 | Locations | `park_places`, `gates`, `lands` | when the parks change | once a year |
| 11 | Weather and sun | `weather_*`, `sun_by_week` | very slowly | every two years |
| 12 | Security and tap-in lines | `security_waits` | doesn't | only if Disney changes how screening works |
| 13 | Showtimes | `disney_showtimes`, `show_estimates` | at `until` (Disney's) | every few weeks with the hours; estimates twice a year |

The **About the data** tab shows which of these are ending soon or due right now.

---

## Each dataset

### `park_hours_published`: Disney's official hours

- **Source:** Disney's Hours & Events calendar: [disneyland.disney.go.com/calendars/day/](https://disneyland.disney.go.com/calendars/day/) (pick a date; [this page](https://disneyland.disney.go.com/calendars/day/disney-california-adventure/) shows California Adventure). Disney publishes about six weeks ahead.
- **Columns:**
  - `date`, `weekday` (`Mon`), `week` (see week numbers);
  - `park`;
  - `open` and `close` as decimal hours (8 am = `8.0`, 10:30 pm = `22.5`, midnight = `24.0`, 1 am = `25.0`);
  - `note` for special nights, e.g. `Oogie Boogie Bash (party ticket required)`, which the app shows on early closes.
- **How:**
  1. For each new date, add two rows, one per park, with the general-admission hours. Early-entry hours are not included.
  2. Drop past dates if you like; they're harmless.
  3. Set `until` to the last date added, and `review` to about two weeks before that.
- **Check:** pick a newly added date in Plan a day. The info line should say "published hours" and match Disney.

### `disney_showtimes`: Disney's showtimes

- **Source:** Disney's own site, the same calendar as the hours ([disneyland.disney.go.com/calendars/day/](https://disneyland.disney.go.com/calendars/day/)). Disney publishes about six weeks ahead. Refresh it together with `park_hours_published`.
- **Columns:** `date`; `park`; `name` (Disney's show name); `times` (24-hour times split by `;`, e.g. `17:30;20:00`); `location`.
- **How:** collect fireworks, Fantasmic!, World of Color, parades and stage shows that run at set times (not character meets or roaming acts). Keep raw downloads in `_sources\shows`. Set `until` to the last date collected. Dates inside the range with no rows for a park show no Tonight note for that park.
- **Check:** pick a covered date in Plan a day. The Tonight note under the plan should match Disney's times and say "Showtimes from Disney's calendar".

### `show_estimates`: typical nighttime shows (our estimate)

- **Source:** our own estimate of the usual pattern; used for dates past `disney_showtimes`.
- **Columns:** `park`; `name`; `from_md` and `to_md` (`MM-DD`, the part of the year it runs); `min_close` (only listed when the park is open until at least this hour, 24-hour); `times` (`21:30`, or `close-45` for 45 minutes before closing).
- **How:** when Disney adds, renames or retires a nighttime show, change the rows. Keep names generic ("Fireworks") unless a show runs all year.

### `refurbs`: announced closures

- **Source:** Disney's announcements, as tracked by [Disney Tourist Blog's Disneyland Refurbishment Calendar](https://www.disneytouristblog.com/disneyland-refurbishment-calendar). Confirm each one on Disney's site where you can.
- **Columns:**
  - `ride` (exact name from `ride_profiles`) and `park`;
  - `start` and `end`. Leave `end` blank if no reopening date is announced;
  - `note`, shown to the user, e.g. "Closed for its holiday overlay; reopens Nov 13."
- **How:**
  1. Add new closures and remove ones that have ended.
  2. Set `until` to how far ahead announcements reasonably reach, usually about two months from `pulled`, or the latest announced start.
- **Check:**
  - `check.html` flags a ride name that doesn't match.
  - In Plan a day on a closure date, the ride shows ⚠ with the note.

### `events`: festivals and ticketed nights

- **Source:**
  - Disney's announcements;
  - typical windows from [Disney Tourist Blog](https://www.disneytouristblog.com), [Attractions Magazine](https://attractionsmagazine.com) and [MickeyVisit](https://www.mickeyvisit.com).
- **Columns:**
  - `name`;
  - `park` (`Disneyland`, `California Adventure` or `Both`);
  - `kind`: `Festival`, or `Ticketed nights (early close)`, which the planner treats as early closes;
  - `start` and `end` as `MM-DD`. These repeat every year, so an event crossing New Year needs two rows;
  - `start_week` and `end_week`;
  - `notes`, shown to the user. Say whether dates are announced or typical.
- **How:**
  1. When Disney announces a season, put the real dates in.
  2. Set `until` to the last date covered by announced dates.
- **Check:** the When to go and Explore charts shade the new windows.

### `ticket_tiers`: dated 1-day prices

- **Source:** Disney's 1-day ticket price calendar, for adult 1-day 1-park tickets. Disney's [ticket prices help page](https://disneyland.disney.go.com/faq/tickets/ticket-prices/) links to it.
- **Columns:** `date`, `weekday`, `week`, `tier` (1 to 7, cheapest to dearest) and `price_usd`.
- **How:**
  1. Add rows for every new date Disney prices.
  2. Set `until` to the last priced date.
  3. If the tier prices change, update every affected date.
- **Check:** the Dates step of the Trip wizard shows prices for those weeks.

### `multi_day_prices`

- **Source:** Disney's multi-day ticket prices, from the same ticket pages. Prices are the same on any dates.
- **Columns:** `days` (2 to 5) and `price_usd` (adult, 1-park per day).
- **How:** replace the prices after a price change, usually in October, and set `review` to next October.

### `holidays`: holiday weekends and school breaks

- **Source:** the federal holiday calendar, plus Orange County and Los Angeles school district calendars. [ActivityHero](https://www.activityhero.com) and [MomsLA](https://www.momsla.com) collect them.
- **Columns:**
  - `name`;
  - `kind` (`holiday` or `school`);
  - `start` and `end` as `MM-DD`;
  - `start_week` and `end_week`.
- **How:** once districts publish next school year's calendar (usually by late summer), replace the dates and set `until` to the end of that school year.

### `ride_profiles`: rides

Character meets are rows too, with `kind` `Character meet`: only the permanent spots that Queue-Times tracks with wait history (Royal Hall princesses, Mickey's House; Minnie's House has no history). `meet_from` and `meet_to` (24-hour hours, blank = all day) keep the plan inside the hours a meet usually runs.


- **What:** one row per ride:
  - `park` and `land` (must exist in `lands`);
  - `exposure` (`Indoor`, `Outdoor` or `Mixed`);
  - `wet` (`Yes` or `No`);
  - `kind`;
  - `ride_minutes`;
  - `headliner` (`1` for the big ones);
  - `avg_wait`;
  - hourly wait profile `h7` to `h23`;
  - month factors `m1` to `m12` and weekday factors `d_sun` to `d_sat`, where 1 = average;
  - `lightning_lane` (`Multi Pass`, `Single Pass` or blank);
  - `single_rider` (`Yes` or blank);
  - `min_height_in`: the minimum rider height in inches, blank if none. Use the lowest height that lets a child ride with an adult (Autopia 32, Silly Symphony Swings 40 for the tandem swings).
  - `thrill`: `gentle`, `moderate` or `thrill`. This is our own rating from Disney's ride description (drops, speed, darkness). The app shows it as gentle, some thrills or big thrills, and **Good for little kids** picks gentle rides with no height limit. Rate a new ride the same way.
- **Source:**
  - waits from [Queue-Times](https://queue-times.com)' per-ride statistics, [queue-times.com/parks/16/stats](https://queue-times.com/en-US/parks/16/stats) (park 17 for California Adventure);
  - Lightning Lane tiers from Disney or [MickeyVisit](https://www.mickeyvisit.com)'s guide;
  - heights from Disney's attraction pages, or MickeyVisit's height list, [mickeyvisit.com/disneyland-height-requirements](https://mickeyvisit.com/disneyland-height-requirements/);
  - attributes from Disney's attraction pages.
- **New ride:**
  1. Add a row. If you have no wait history yet, copy a similar ride's factors.
  2. Add it to `park_places` with its entrance and exit (see below).
  3. Put it in `waits_by_hour` and `ride_closures_by_month` when history exists.
- **Closed for good:** remove its row from `ride_profiles`, `waits_by_hour`, `ride_closures_by_month` and `park_places`. `check.html` lists any leftovers.
- **Renamed:** change the name everywhere at once. Search all `data/*.js` files.

### `lightning_lane`: planning rules

- **What:** settings the planner uses, as `setting,value,note`:
  - `wait_min`: minutes per Lightning Lane ride;
  - `gap_hours`: minimum time between Multi Pass rides;
  - `hours_per_pass`: about one Multi Pass ride per this many hours in the park;
  - `max_multi`: the most planned in one day;
  - `rebook_rule`: the sentence shown on plans.
- **Which rides are eligible** is the `lightning_lane` column of `ride_profiles`, not this file.
- **How:** update when Disney changes the rules, and keep `rebook_rule` in step.

### `dining`: restaurants

- **Source:** Disney's dining list feed, the one behind [disneyland.disney.go.com/dining/](https://disneyland.disney.go.com/dining/): `.../finder/api/v1/explorer-service/list-ancestor-entities/dlr/80008297;entityType=destination/YYYY-MM-DD/dining` for the list, and `.../details-entity-simple/dlr/<slug>/YYYY-MM-DD/` for each place. Disney's site can't be reached from a cloud sandbox, so run it on a PC.
- **Columns:** `park`, `land` (must exist in `lands`), `name`, `kind` (`quick service`, `table service`, `snack`, `lounge`, `event` for dining packages, `festival` for seasonal booths), `reservations` (`none`, `accepted`, `recommended`, `required`), `walkup` (Disney's walk-up list in the app), `mobile_order`, `price` (`$` to `$$$$`), `meals` (split by `;`), `cuisine`, `note`, `disney_id`, `url`.
- **How meals use it:**
  - Meals are planned at the nearest `quick service` place, using its `food` point in `park_places`.
  - Quick service, table service, snacks and lounges are offered as nearby alternatives. Events, festival booths and members-only places aren't suggested.
  - The **Sit-down meals** picks are the `table service` places that serve lunch or dinner, plus lounges with a walk-up list. `reservations` of `accepted` or `recommended` (and a note that isn't "only for breakfast") gives the 60-day booking reminder; `walkup` = `yes` adds the walk-up list fallback; `mobile_order` = `yes` adds the mobile order tip on quick-service meals.
- **How:**
  1. On the PC: `cd _sources\dining`, then `.\fetch-dining.ps1 -Date YYYY-MM-DD` and `.\parse-dining.ps1 -Date YYYY-MM-DD` (see the README there). That writes `disney_dining.csv` (with Disney's map pins) and `disney_dining_hours.csv` (a week of hours).
  2. Turn the CSV into `data/dining.js` with the app's land names (San Fransokyo Square is `Pacific Wharf`, the Performance Corridor wine terraces are `Pacific Wharf`; a place with no land gets the land of the nearest ride), and replace the `food` rows in `park_places` with Disney's pins (`osm` = `disney:<id>`). Carts listed for both parks go in the park where the pin is.
  3. Don't add Downtown Disney or hotel restaurants: meals are always inside the parks.
- **Check:** `check.html` shows no restaurants without a map point.

### `park_places`: map points (OpenStreetMap, ODbL)

- **What:** one row per ride, restaurant (`food`) or show:
  - `lat` and `lon`, the middle of the building;
  - `osm`, the OpenStreetMap element (`w123` = way 123, `n…` = node, `r…` = relation);
  - for rides only, `ent_lat` and `ent_lon` (queue entrance) and `exit_lat` and `exit_lon`.

  Walks run from one ride's exit to the next ride's entrance.
- **Source:** © OpenStreetMap contributors, under the ODbL.
- **Adding one place:**
  1. Find the building on [openstreetmap.org](https://www.openstreetmap.org).
  2. Right-click → "Query features" to see the element id and its coordinates.
  3. For a ride's entrance and exit, use the mapped doors (`entrance=*` nodes) on its building. Choose by Disney's park map. If nothing is mapped, use the building edge nearest the queue.
- **Full refresh:**
  1. Run `fetch-osm.ps1`. It saves the points-of-interest and building-geometry extracts.
  2. Match each ride and restaurant name to an element, keeping existing rows where nothing moved.
  3. Re-pick doors only for new or changed buildings.
  4. Keep the raw extract in `_sources\osm\`.
- **Check:** `check.html` flags rides missing from `ride_profiles`, and lists rides with no map point. Their walks fall back to `lands`.

### `lands` and `gates`

- **`lands`:** `park`, `land`, `map_x` and `map_y` (rough minutes east/north of the park's hub), `entry` (`Yes` for the land just inside the gate), and `dining_near` (lands to borrow restaurants from, separated by `;`).
  - It is only used when a place has no map point, and to name the entrance land.
  - The `Entrance` row is the gate.
  - Add a row when a land opens or is renamed.
- **`gates`:** one row per entrance: `id`, `park`, `lat`/`lon`, `name` (shown on plans), and for a hotel guests' entrance `guests` (the hotel), `opens_before_min` (minutes before the park opens) and `closes_after_min` (minutes after it closes; 0 = at close).
  - The two Esplanade rows are our own estimate, since OpenStreetMap doesn't name those turnstiles.
  - The `gc` row is the Grand Californian's own entrance into California Adventure (OpenStreetMap node 1424633555). Its hours are our estimate; outside them, plans send guests through the Esplanade.
  - Change it only if the entrances or that entrance's hours change.

### `security_waits`: security and tap-in lines

- **What:** our estimate of minutes in line when entering a park, in four kinds of row (`kind`, `at`, `minutes`, `note`):
  - `curve`: `at` = minutes from the park's opening (negative = before), `minutes` = time in the bag-check and turnstile lines on a typical day, tap-in included. The app draws a straight line between rows and holds the first or last value outside them.
  - `crowd`: `at` = how busy the day is (1 = typical, worked out from the ride wait factors), `minutes` = the multiplier for that.
  - `entrance`: `at` = a gate `id` from `gates`, `minutes` = added for that entrance (the Grand Californian's is shorter, so negative).
  - `hop`: `at` = `tapin`, `minutes` = the turnstile line for a park hop on a typical day. There's no bag check on a hop: the Esplanade is inside security.
- **Source:** Disney publishes no security wait times, and Queue-Times and Thrill Data only track rides. These are our estimates from blog reports: [Disney Tourist Blog](https://www.disneytouristblog.com/morning-plan-disneyland-rope-drop-strategy/), [Disney Dining](https://www.disneydining.com/disneylands-new-entry-rules-how-to-speed-through-security-ad1/), [Inside the Magic](https://insidethemagic.net/2025/07/disneyland-activates-all-new-entry-procedure-guests-undergo-new-security-protocol-ad1/) and [MickeyVisit](https://mickeyvisit.com/disneyland-testing-change-to-security-screening-december-15-2025/).
- **Refresh:** no yearly refresh. Revisit it if Disney changes screening (for example walk-through scanners), or if new reports show very different lines.
- **Check:** `check.html` flags curve or crowd rows that are out of order or out of range.

### `park_hours_2025` and `hours_by_week`: typical hours

- **What:**
  - `park_hours_2025` holds the hours for every day of a full year. Dates Disney hasn't published borrow the same week and weekday from it.
  - `hours_by_week` is the average hours open per week, worked out from it.
- **How:**
  1. Once a full calendar year of official hours is known (e.g. all of 2026, in January 2027), replace the rows with that year and recompute `hours_by_week`.
  2. Keep the file name and id `park_hours_2025`; the code looks for that id.
  3. Update `title`, `about` and `source` to say which year it now holds.

### Crowds and waits: `crowd_by_week`, `crowd_by_weekday`, `crowd_by_month`, `wait_by_date`, `waits_by_hour`, `ride_closures_by_month`, `closures_by_week`

**Crowd ratings**

- **Source:** [Queue-Times](https://queue-times.com)' monthly crowd calendars, `queue-times.com/parks/16/calendar/YYYY/MM` (park 17 for California Adventure). Years 2015 to 2019 and 2023 onwards are used. 2020 to 2022 are skipped because of COVID.
- **Method:**
  1. Remove each year's average.
  2. Put the result back on the 2023-onward scale.
  3. Count 2023-onward days twice, then average by week, weekday and month.
- **Raw data:** the daily file is kept in `_sources`. Append new months one page at a time, at a human pace. If you hit a bot check, stop. Don't bypass it.

**Average wait by date**

- **Source:** [Thrill Data](https://www.thrill-data.com)'s by-date wait history for the Disneyland Resort.
- **Method:** the mean posted wait across all rides for each calendar date, averaged over 2023 onwards.

**Hourly waits and closures**

- **Source:** Queue-Times' per-ride statistics, [queue-times.com/parks/16/stats](https://queue-times.com/en-US/parks/16/stats) (park 17 for California Adventure). Day-level detail is behind a login, so only use what's public.
- **Method:**
  - `closed_pct` is the share of days a ride was closed all day that month.
  - Overlay versions, such as Haunted Mansion Holiday, are merged with the regular ride.

**All of these**

- Refresh once a year.
- Compare the new values with the old file. They should move a little, not a lot. A big jump usually means a parsing mistake.
- The full method is in **About the data → Sources and methods**.

### Weather and sun: `weather_by_week`, `weather_by_month`, `weather_by_hour`, `sun_by_week`

- **Source:** the [Open-Meteo historical archive](https://open-meteo.com/en/docs/historical-weather-api) for Anaheim (33.8121, -117.919), ERA5, over the ten most recent full years. Run `fetch-weather.ps1`.
- **Method:**
  - Average by week, month, and week × hour.
  - `rain_chance_pct` is the share of days with at least 0.04 in of rain.
  - `hot_day_pct` is days with a high of 90°F or more.
  - `chilly_night_pct` is nights below 45°F.
  - Keep the other columns' definitions as they are, and compare the new values against the old ones.
  - `sun_by_week` holds sunrise and sunset as decimal hours, from the same download's daily sunrise and sunset.
- **How often:** averages barely change, so every two years is plenty.

---

## Adding a new dataset, or changing columns

1. Copy an existing `data/*.js` file, rename it, and fill in the header (`id` must match the file name) and the CSV.
2. Add its id to `data/manifest.js`.
3. Read it in the app code (`js/*.js`) with `dash.data('<id>').data` (an array of row objects whose values are all strings).
4. Bump `version.js`, then run `check.html`.

To add a column, add it to both the CSV header and `columns`. To find every place a dataset is used, search the `js` folder for its id.
