# Tests

One command runs everything, from the project folder:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\test.ps1
```

It takes about two minutes and prints what passed and what failed. It doesn't change the app, your browser or your saved settings: it runs in a throwaway Edge (or Chrome) window you don't see.

## What it checks

`tests/run.html` drives the real app in a hidden frame, as if today were **2026-11-02** (the `TODAY` setting at the top of the file), so results don't drift from day to day.
The hidden frame loads the app with `?nobusy`, which turns off the "Working out your plan" overlay and quick-tap batching (`js/busy.js`) so a tap redraws at once.

1. **Data and loading:** every data file passes its checks, the app loads with no errors, and every tab opens.
2. **Plan a day:** 392 plans (8 dates from 3 to 300 days out × Disneyland, California Adventure and Park Hopper × 13 groups of settings: breaks, pace, hotels, start and finish times, repeats, Lightning Lane, sit-down meals, and `three-rides`, a light day with only the first 3 headliners picked, for spreading a light day; plus 10 Park Hopper-only groups, `hop-*`, with a restaurant picked in one park or both: Starting park set or on auto, with and without a break, the waits ↔ steps slider at 0, 2 and 4, a set dinner time, and a park with no rides picked). Each plan is checked against the planner's rules:
   - no errors, and nothing on screen reads NaN, undefined or Invalid Date;
   - rides are planned when rides are picked;
   - steps run in time order;
   - lunch is never before 11 am, and meals are always inside the park (never during the hotel break);
   - no ride during its refurbishment, and no ride after its park closes;
   - repeat rides are at least an hour apart unless back to back is allowed;
   - a day in the park from 11:30 to 2 includes lunch;
   - the day PDF is made (once per park).

   More checks: restaurant chip taps (tagged meal if free else the other, replace when both full; untagged: lunch if free else dinner; switch, off, one-meal places, any pair in either order); a restaurant picked in the other park comes off a one-park day, with a note; lunch around 1 pm and dinner around 6 pm are kept (or the plan says why not); a ride closed for refurbishment has a greyed-out chip; and no plan leaves after close, more than 2 hours past a set finish (unless that's to fit a picked or timed meal), or with under an hour at the hotel when a break is shortened.
3. **Trip wizard:** a 3-day Park Hopper trip with a break day, through every step, then the trip PDF.
4. **Expected plans:** 101 of the plans (10 and 130 days out, including the `hop-*` groups, plus `three-rides` 300 days out, a summer day, for the heat) are compared line by line with `tests/golden/plans.json`. Any difference is listed.

## When plans are meant to change

A planner change, a wording change or a data refresh changes some plans on purpose. Run the tests, read the differences they list, and if they're what you meant, save the new plans as the expected ones:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\test.ps1 -Update
```

Commit the new `tests/golden/plans.json` with the change, so the next run compares against it.

## Other ways to run it

- `.\scripts\test.ps1 -Show` runs it in a visible browser window.
- Start `.\scripts\serve.ps1`, then open `http://localhost:8000/tests/run.html` and press **Run the tests**.
- `check.html` is the quicker data check (and 12 sample plans) from the app folder.

Results of the last run are in `tests/results/latest.json` (not uploaded).

## Adding a check

- A rule for every plan: add it to `rules()` in `tests/run.html`.
- A new group of settings: add a line to `VARIANTS`. That adds plans, so run `test.ps1 -Update` once afterwards. Give it `golden: [days]` to compare it on more days than `GOLDEN_AHEAD` (as `three-rides` does for 300 days out).
