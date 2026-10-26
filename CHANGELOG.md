# Changelog

What changed in each version. The number is the one in `version.js` (shown at the top of the app). Add a line here with every version bump, and tag the commit with the same number (for example `v44`) so you can go back to it. Versions before v19 weren't recorded.

| Version | Date | What changed |
|---|---|---|
| v53 | 2026-10-26 | Park Hopper days show sooner: the plan draws first and the "take X off to make room" advice fills in a moment later (Plan a day and wizard days; same advice). Walking times page: no tap-in minutes in the times; a note says the park gates may add time. No change to plans. |
| v52 | 2026-10-26 | Faster planning: walk times between places and each ride's hourly waits are worked out once instead of over and over (a busy Park Hopper day with every ride: about 11 s to 3 s). Fixed the tab bar showing markup as text after v51; new test check that no markup shows on the page. The waits-vs-steps slider and its help line sit on their own row, so the text no longer jumps. No change to plans. |
| v51 | 2026-10-26 | More time when rides don't fit: a set finish can move up to 2 h later (never past close) or the break can shrink (at least 1 h at the hotel), with a note on the plan; 33 expected plans changed. Meal times: lunch and dinner around a chosen hour (Plan a day, Trip settings, per wizard day). Rides closed for refurbishment are greyed out and can't be picked. A line under the waits-vs-steps slider. New Walking times page; When to go moved into More. New test checks. |
| v50 | 2026-10-26 | Restaurant picker: a line says which park you're in at lunch and at dinner, a tap picks the meal you're in that restaurant's park for (or the meal not yet taken), and the closest one or two places for each meal are marked "Good for lunch" or "Good for dinner". Plan a day and wizard day pages. New test check. |
| v49 | 2026-10-26 | One list of shared settings (`SETTINGS` in `js/controls.js`) keeps the Plan a day and Trip wizard controls in step and drives saving and restoring. Saved settings carry a version number (old ones still load); wizard days no longer save an unused pace. No change to plans. |
| v48 | 2026-10-26 | The planner's tuning numbers are in one place, `js/settings.js`. Hotel walking times and names moved to a new dataset, `data/hotels.js`. No change to plans. |
| v47 | 2026-10-26 | The planner takes a settings object (Plan a day's by default) instead of the wizard and trip PDF swapping a day's settings into Plan a day's; gates and hop times are passed along instead of kept in shared variables. No change to plans. |
| v46 | 2026-10-26 | Code split into smaller files: `js/engine.js` became `day`, `walks`, `scheduler`, `meals`, `restrooms`, `hopper` and `fit`; checklist and copy text moved to `js/take.js`; the wizard's first steps to `js/trip.js`. Code moved only. |
| v45 | 2026-10-26 | Code layout: long lines in `js/*.js` and `shim.js` broken up (about 160 characters at most). No change to how the app works. |
| v44 | 2026-10-26 | One-command tests: `scripts\test.ps1` (data checks, 288 sample plans against the planner's rules, a wizard trip, both PDFs, 72 plans compared with `tests/golden`). `scripts\serve.ps1`, a local web server in PowerShell. A banner when part of the app crashes. Refresh scripts in `_sources` work from any folder and default to today. Disney's downloaded pages, feeds and website code are no longer uploaded. This changelog. |
| v43 | 2026-10-26 | Restrooms: 🚻 marks from Disney's restroom map (`data/restrooms.js`), before long lines, breaks and hops, and about every 90 minutes. |
| v42 | 2026-10-26 | Sit-down meals in the other park: the planner adds a hop or says why it can't, with fixes on the Plan a day note and wizard days. Wizard quick picks reset repeats. |
| v41 | 2026-10-26 | The split: `index.html` is markup only; styles in `css/app.css`; code in `js/*.js`. Missing-file banner. |
| v40 | 2026-10-26 | The version lives only in `version.js`; the top label works when opened from the folder. |
| v39 | 2026-10-26 | Lunch before an early break when the rides run out; charts redraw when they become visible. |
| v38 | 2026-10-26 | Pick sit-down restaurants for lunch or dinner, with booking reminders. Hotel moved to the wizard's Your trip card; Lightning Lane Multi and Single Pass choices. |
| v37 | 2026-10-26 | Restaurants rebuilt from Disney's dining feed (`data/dining.js`). |
| v36 | 2026-10-26 | "Nothing" quick pick. |
| v34–35 | 2026-10-26 | Whole-app review fixes: spare time spread as rest breaks, hopper days say what didn't fit, ride details on chips, thrill ratings, "Good for little kids", Settings and More menus, school-holiday choice in the dates finder. |
| v33 | 2026-10-26 | "Break around" time, free time with rides that fit, advice on which picks cost the most time. |
| v32 | 2026-10-25 | Key times as a timeline, height wording, version shown at the top, new app name. |
| v30–31 | 2026-10-25 | Security and tap-in lines by time of day; the Grand Californian's own entrance; shortest rider warns instead of blocking. |
| v28–29 | 2026-10-25 | Trip settings regrouped; shortest rider, start and finish times; rides in refurbishment left out. |
| v24–27 | 2026-10-25 | Walking times from OpenStreetMap map points and ride doors; hotel walk times; one data file per dataset with checks, `check.html` and `UPDATING.md`. |
| v19–23 | 2026-10-25 | Trip wizard rebuilt around park days and break days; repeat rides with tap-to-cycle; PDFs reworked. |
