# Disneyland Resort Planning Tool by ScrewdriversInEveryPocket

Plan a Disneyland Resort trip around quieter days, better weather and shorter lines. This planner (DLR Planner once installed) picks your best dates, chooses which days to spend in which park, and builds a ride-by-ride schedule for each day, with Lightning Lane order, meal ideas, restaurant booking reminders and a printable PDF.

It runs entirely in your browser. There's no account, no install and no tracking, and once it's loaded it works offline (the live weather forecast, park hours and holidays fall back to built-in data).

> **Unofficial.** This is a fan-made tool and is not affiliated with, endorsed by or connected to Disney. Wait times and crowds are estimates from historical data, not promises.

---

## Contents

- [Getting started](#getting-started)
- [Trip wizard: plan a whole trip](#trip-wizard-plan-a-whole-trip)
- [Plan a day: plan one visit](#plan-a-day-plan-one-visit)
- [Picking rides (and riding them more than once)](#picking-rides-and-riding-them-more-than-once)
- [The data tabs](#the-data-tabs)
- [Settings, saving and privacy](#settings-saving-and-privacy)
- [Where the data comes from](#where-the-data-comes-from)
- [Updating the data](#updating-the-data)
- [Hosting your own copy](#hosting-your-own-copy)
- [License](#license)

---

## Getting started

**Online:** open the hosted page and start with the **Trip wizard** tab. On a phone, use your browser's *Add to Home Screen* and it will work like an app, even without signal in the park.

**On your computer:** download or clone this repository and double-click `index.html`. It opens in your browser. Everything works except installing it as a phone app, which needs a web address (see [Hosting your own copy](#hosting-your-own-copy)).

Which tab should you use?

| You are... | Use |
|---|---|
| Planning a multi-day trip, staying in a hotel | **Trip wizard** |
| A local, or doing a single day | **Plan a day** |
| Curious when the parks are quietest, hottest or wettest | **When to go**, **Weather**, **Time of day**, **Explore** |

---

## Trip wizard: plan a whole trip

The wizard walks you through a trip from "how long?" to a PDF you can take to the park. The steps are shown as buttons along the top, and you can jump back to any step you've finished.

### 1. Trip

- **Park days:** how many full days you want in the parks (1 to 10).
- **Break days:** days with no park at all, for resting, the pool or other plans (0 to 5).
- **Ticket:** one park per day, Park Hopper, or a single park only. You can also ask it to visit each park at least once.
- **Hotel check-in and checkout times** (defaults 3 pm and 11 am).
- **Where you're staying:** your hotel. The list shows each hotel's time for your pace, because it's a walk (see [Hotel times](#hotel-times)). It's shared by every tab.

The wizard adds a **check-in day** before your first park day and a **checkout day** after your last. Those travel days aren't counted as park days and aren't on your ticket. A summary shows your nights and how many ticket days you need.

**Trip settings** below hold things that stay the same all trip:

- **Your group:** group pace (which sets your walking speed, see [How the schedule is built](#how-the-schedule-is-built)) and the **shortest rider's height**. Rides they're too short for are still pickable but show "(40 in and up)", and the plan reminds you about Rider Switch so the adults can take turns. Plans and PDFs show the height for every ride that has one, since your children may be different heights.
- **Your park days:** when to **start** (rope drop, mid-morning at 10 am, after lunch at 1 pm, or a set time) and **finish** (at close, or leave by a set time), the midday hotel break, and on Park Hopper trips which park to start in. A day that starts after lunch or finishes by 4 pm has no midday break, and the plan says so.
- **Rides and lines:** whether you'll buy **Lightning Lane Multi Pass** and **Lightning Lane Single Pass** (Rise of the Resistance, Radiator Springs Racers), whether repeat rides may go back to back, and the *shorter waits ↔ fewer steps* slider.

Start, finish, the break and the slider are starting points: each day's step lets you change them for that day.

### 2. Dates

Move the sliders to say what matters to you: short waits, low crowds, comfortable temperatures, avoiding rain, rides being open, long park hours, late sunsets and lower ticket prices. **School holidays** lets you say *Don't care*, *Avoid school breaks and holiday weekends*, or *Only during school breaks* (summer, spring, winter, Presidents' week and Thanksgiving week).

- The **week chart** scores every week of the year from 0 (worst for you) to 100 (best), with holidays and events shaded.
- **Best trips for you** lists exact date windows in the next 12 months that fit your trip length, best first. Each card shows check-in, the park days (with which park), break days and checkout, plus typical waits, weather and rain.
- Tap **Show trips this week** on any week to see trips around it.
- Already booked? Type your **first full park day** instead.

### 3. Days

Your trip from check-in to checkout, day by day. Park days are put on the best days of your stay and break days on the weakest, never two break days in a row. You can change any day to a break day, to Disneyland or to California Adventure. Changing a day locks in your dates, so the wizard won't pick new ones over your change.

This step also compares ticket prices: the multi-day ticket price against separate 1-day tickets for your exact dates.

### 4. Rides

Pick every ride you want across the whole trip. Each ride shows its typical wait, how long it lasts, how intense it is (gentle, some thrills, big thrills: our own rating), indoor or outdoor, and its height limit; **Hide ride details** turns that off. **Quick picks** at the top: **Headliners only**, **Good for little kids** (gentle rides with no height limit), **Everything** and **Nothing** (takes every ride off, to start from scratch). To ride something more than once, tap it again (see [Picking rides](#picking-rides-and-riding-them-more-than-once)); you can do a ride up to 6 times on a trip and 3 times on any one day. The two permanent character meets, **Meet Disney Princesses at Royal Hall** and **Mickey's House and Meet Mickey Mouse**, are listed under **Characters** after the rides and plan like a ride, with their own typical waits.

Then press **Spread across my park days**. Rides are shared out so each day has about the same amount, and repeats go on different days first. If you chose Park Hopper but all your rides fit with one park per day, it offers to drop the hopper and save you the upgrade fee.

### 5. Day 1, Day 2, ...

One page per park day, with that day's hours, weather, events and full schedule. For each day you can:

- change the **start** and **finish** times, the **break length**, **break around** (a time you'd like the break near, such as noon for a nap, or leave it to the planner) and the **waits ↔ steps** slider for just that day;
- tap rides under **On this day** to ride them more times, or press and hold to take them off;
- add a ride from **Add more**, or from **On other days** (it stays on the other day too).

As you add rides, a banner sums up the plan (when you'd leave, how many rides fit, time in lines, any free time) with a **See the plan** link, and tells you whether there's **room for more** or the **day is full**. When there's room, it names the rides that would still fit and ticks them ✓ in the list. When the day is full, it lists the rides you picked that take the most time and what taking each one off would make room for. If the plan has spare time before a break or before park hopping opens at 11 am, it shows it as free time with rides that would fit there. To keep taps quick, the plan itself shows first; the room-for-more check, the take-off advice and the week-at-a-glance plans (each of which plans the day again several times) fill in a moment later, with the same results as before.

### 6. Export

**Save trip as PDF** makes a document to print or keep on your phone:

- **Page 1:** a trip overview with your check-in day, park days, break days and checkout, and every ride you picked, grouped by park and day, with how many times you'll ride it.
- **One page per park day** with tick boxes: the schedule, Lightning Lane booking order, weather, meal ideas, closures and events.
- **Restaurant bookings:** if you picked sit-down meals, the overview lists each one with the date and time to book it.

On a phone it opens the share sheet so you can save or email it. On a computer it downloads.

---

## Plan a day: plan one visit

A quick, self-contained planner for a single day, ideal for locals and annual passholders. It doesn't touch your Trip wizard plan.

1. Pick a **date** and a **park** (Disneyland, California Adventure or Park Hopper).
2. Set your **group pace** and **shortest rider's height**, your **start** and **finish** times, a **break length** (no break, or a 1 to 5 hour midday break at your hotel) and when you'd like it (**break around**), and the **waits ↔ steps** slider. Your hotel and Lightning Lane choices come from the Trip wizard (a line under Settings shows them, with **Change in the Trip wizard**).
3. Pick your **rides**, and any **sit-down meals** you'd like (see [Sit-down meals](#sit-down-meals)).

You get:

- A summary line for the date: published hours, sunset, expected high, rain chance and how busy waits usually are, plus any seasonal event.
- A full **schedule** with times, walking order, meal stops and which rides to use Lightning Lane on. If you picked a break, it shows a **split day** and how it compares with staying all day.
- The **Lightning Lane order**: which ride to book first, second and so on. You can't choose a return time: the Disneyland app gives you the next one it has. So the schedule has 📱 **Book now** steps that say when to book each one (the first as soon as you tap in, then each next one once you've used the last or 2 hours after booking). Rides on Lightning Lane say *around this time*, because where they sit depends on the return window you get.
- **Tonight:** at the end of the plan, the day's fireworks and nighttime shows with their times, in case you have the energy to stay. Dates Disney has published showtimes for use Disney's times; later dates show our typical estimate, labelled as such, and tell you to check the Disneyland app.
- **How the day plays out:** a chart of expected waits, feels-like temperature and rain through the day.
- **That week, day by day:** suggested times for every day of that week. Click one to plan it instead.

**Take it with you:** switch between the *Stay all day* and *Split day* plans, open a **Day-of checklist** to tick off rides as you go, **Copy plan as text** to paste into a message or notes app, or **Save day as PDF** for a one-page itinerary.

### How the schedule is built

- Waits come from each ride's average wait for that hour, adjusted for the month, the day of the week and how busy that week usually is.
- Park hours are Disney's published hours where they're out (about six weeks ahead), otherwise the typical schedule.
- **Walking time between any two rides** runs from one ride's exit to the next ride's entrance: the straight-line distance, stretched by about a third because paths wind, at your group's walking speed. It also looks one ride ahead so you don't zigzag across the park. Slide towards **Fewer steps** to stay in one area longer, or towards **Shorter waits** to chase the shortest lines. A line under the slider says what each position does.
- **Group pace sets the walking speed:**

  | Pace | Who it's for | Speed through park crowds |
  |---|---|---|
  | Relaxed | Seniors or small children | about 50 m a minute, plus rest breaks |
  | Normal | Middle-aged adults | about 65 m a minute |
  | Go-go | Young adults | about 80 m a minute, quicker meals |

  Everyone walks up to 15% slower in the busiest weeks of the year.
- **Start and finish:** rope drop means arriving 30 minutes before opening. Any other start, or a finish before close, plans only those hours.
- **A little more time when rides don't fit:** if some picked rides would be left off, the plan can stay up to 2 hours past a finish time you set (never past close), or shorten your midday break (always keeping at least an hour at the hotel after the trip each way). It picks whichever fits the most rides with the fewest extra minutes, keeps the break when both are equal, adds only what's needed (in 15-minute steps), and says so as a warning at the top of the "Your day" box and in the plan's notes: "You leave 45 min later, at 8:15 pm instead of 7:30 pm, to fit Matterhorn Bobsleds." or "Your break is 1 h shorter to fit Space Mountain: 2 h, with about 1 h 35 min at your hotel, back in the park by 3:00 pm." If rides still don't fit, it says that too: "A shorter break (down to about 1 h at your hotel) still wouldn't make room for Goofy's Sky School." With no break and a finish at close, nothing changes: the plan lists what doesn't fit.
- **Hotel times:** see [Hotel times](#hotel-times).
- **Security and tap-in:** every time you come in from your hotel (the morning, and after a break), the plan adds our estimate of the bag-check and turnstile line: longest around opening (about 18 minutes on a typical day), shorter later on, and scaled up on busy days and down on quiet ones. The plan shows it next to *Leave hotel by*.
- **Grand Californian guests** starting in California Adventure, or going back to it after a break, use the hotel's own entrance at Grizzly Peak, with a shorter line, and the first walk starts from there. For Disneyland, or when that entrance is closed, they walk to the Esplanade.
- **Before a hotel break or a park hop** the plan walks you back to the gate. A hop then adds the walk across the Esplanade and the tap-in line at the other park (about 15 minutes on a typical day, longer when it's busy). There's no bag check on a hop.
- **Spare time:** when your rides are done well before the end, the plan spreads the spare time through the day as longer meals (up to 20 minutes more) and 20 to 30 minute rest breaks, and then leaves when it's done instead of padding the day with free time. The one exception is a meal you want (below): if you picked a restaurant or set a time for lunch or dinner, the day runs on to it, with free time before it (catch a show, grab a snack or shop), instead of leaving early. Lunch is never before 11. Each step shows the walk to it.
- **Restrooms:** 🚻 on a step means one of Disney's restrooms is within about a 2-minute walk at your pace (3 before a long line or the walk out), so it's a good time to go if anyone needs to. To keep it useful, only some steps get it: before a line of 30 minutes or more, before you leave for a break or a hop, and otherwise about every 90 minutes. Tap 🚻 for which one; the PDFs spell it out. Tom Sawyer Island's restrooms are left out (you need the raft).
- **Meal times:** above the restaurants you can choose **Lunch time** (whenever fits, or around 11 am to 3 pm) and **Dinner time** (whenever fits, or around 4 to 9 pm). The plan starts the meal within about half an hour of it and fits the rides around it; on a Park Hopper day it also decides which park you eat in. If the time falls in your break or after you leave, the plan tries a shorter break or a later finish (as above); if it still can't, it says so and plans that meal whenever it fits best.
- **Meals you want are always in the plan:** a lunch or dinner counts as one you want when you picked a restaurant for it in that park, or set a time for it. Even with no rides, or with your rides done by early afternoon, the plan stays in the park for it: it waits with free time (catch a show, grab a snack or shop) and then has the meal (lunch never before 11; a whenever-fits dinner from about 5:30 pm), then leaves. If you set a finish time before that meal, the finish moves later until the meal is over, even more than the usual 2 hours, but never past close, and the plan says so ("You leave 4 h 30 min later, at 7:30 pm instead of 3:00 pm, to have dinner around 7 pm."). On a split day the dinner goes after you're back from the hotel break, and a lunch that can't finish before the break goes on your way back in. Park Hopper days and Trip wizard days follow the same rule. The Trip wizard's first page sets them for the trip, and each day page can change them for that day (**Same as trip** by default).
- **Meals** are always in the park, never during the hotel break. Each meal is planned at the nearest quick-service place to where you are (on your way in from the gate after a break), with other options nearby, and the next walk starts from there.
- **Free time** names the nearest show or character spot.
- **Character meets** are only planned in the hours they usually run (Royal Hall about 10 am to 8 pm, by our estimate; Mickey's House all day). Character times change, so check the Disneyland app.
- A ride Disney has announced as closed for refurbishment on that date is greyed out (hover for when it reopens) and can't be picked for that day; if it was picked, it comes off that day's list and the plan says so. Rides often closed that month are marked ⚠. The wizard only puts a ride on days when it's open, and greys it out on the Rides step only if it's closed on every day you're in its park.

### Hotel times

The three Disneyland Resort hotels are measured as a walk from an average room to the park turnstiles along the footpaths in OpenStreetMap, plus a little for elevators and hallways, at your group's pace:

| Hotel | Normal | Relaxed | Go-go |
|---|---|---|---|
| Grand Californian, to Disneyland | 8 min | 10 min | 7 min |
| Grand Californian, into California Adventure by its own entrance | 6 min | 7 min | 5 min |
| Disneyland Hotel, either park | 15 min | 19 min | 13 min |
| Pixar Place Hotel, either park | 15 min | 19 min | 13 min |
| Harbor Blvd walking-distance hotel | 15 min | 20 min | 12 min |
| ART shuttle (off-site) | 40 min | 40 min | 40 min |

Or set your own minutes with **Custom travel time**.

---

## Picking rides (and riding them more than once)

Rides are shown as chips. The same controls work in both planners:

| Do this | What happens |
|---|---|
| **Tap** a ride that's off | It's added (ride once) |
| **Tap** it again | Ride it twice (**×2**), then three times (**×3**) |
| **Tap** once more after the limit | It's taken off again |
| **Press and hold** | Take it off straight away |

The limit is 3 per day in Plan a day and on each wizard day page, and 6 per trip on the wizard's Rides step.

Repeats are spaced at least an hour apart unless you tick **Allow repeat rides back to back**. Lightning Lane is only used for your first ride on each attraction; repeats use the standby line. A quick pick (**Headliners only**, **Good for little kids**, **Everything**, **Nothing**) starts over, so every ride it picks is back to once.

### Sit-down meals

Under the rides, on Plan a day and on each wizard day page, **Sit-down meals (optional)** lists the table-service restaurants and lounges in that day's park(s), with price, how booking works and what they serve.

A line above them says where your plan has you at each meal, such as "Lunch: you're in California Adventure · Dinner: you're in Disneyland" (on a one-park day, "Lunch and dinner: you're in Disneyland"). The one or two places closest to where you'll be at each meal are marked **✓ Good for lunch** or **✓ Good for dinner**. Hover over the chip to see the walk.

| Do this | What happens |
|---|---|
| **Tap** a restaurant | Have the meal there that you're in its park for. If you're in its park for both meals, it takes the one you haven't picked a restaurant for yet (lunch first). If you're not in its park for either meal, it's lunch. |
| **Tap** it again | Switch to its other meal (if it serves both), then take it off |
| **Press and hold** | Take it off straight away |

You can pick one restaurant for lunch and one for dinner each day. The plan books about an hour for a sit-down meal (45 minutes in a lounge, a little longer at a relaxed pace) and fits your rides around it. Every other meal is still planned at the nearest quick-service place, with a tip to **mobile order** in the Disneyland app when that place offers it.

Most sit-down places take bookings 60 days ahead. The meal step tells you **the date to book it** in the Disneyland app (at about 6 am, when new days open) and the time to ask for. If you didn't get a booking, it reminds you that you can join the **walk-up list** in the app on the day. Oga's Cantina is walk-up only. A picked meal is always kept in the plan when it can be, even if that means free time before it or a later finish (see **Meals you want are always in the plan** above); only if it still doesn't fit (say the park closes first) does the plan say so and eat somewhere nearer instead. On a Park Hopper day, a pick decides which park you're in for that meal: the hops are timed so you're there, and the rides fit around it. If you pick a restaurant in a park the day doesn't visit (say you changed the park after picking), the plan says so and offers to **add a hop** (on Plan a day) or to **pick a restaurant in this park instead**; the chip of a pick that didn't make it shows ⚠.

---

## The data tabs

**When to go**, **Weather**, **Time of day**, **Explore**, **Walking times** and **About the data** are under **More**. These tabs show the raw history behind the planners. They're useful on their own when you're deciding when to go, or just curious.

### When to go

Crowds and waits through the year.

- **Average wait by week** and **crowd rating by week:** which weeks are quietest, with holidays and school breaks shaded.
- **By month** and **by day of the week:** the same idea at a coarser level. Useful for "is a Tuesday really quieter than a Saturday?"
- **Park hours by week:** shorter days usually mean a ticketed party night, when the park closes early to day guests.
- **Seasonal events and party nights:** typical windows for Halloween Time, the holidays, Lunar New Year, Food & Wine and more.
- **Ride closures by month:** how often each ride is closed all day, which shows refurbishment seasons and overlay changeovers such as Haunted Mansion Holiday.

### Weather

- **Next 15 days:** a live hourly forecast for Anaheim.
- **Weather through the year:** 10 years of Anaheim records by week, covering highs, "feels like" highs, overnight lows, chance of rain and soaking rain, hot days, chilly nights and windy days. Rain and wind matter because outdoor rides can pause and fireworks can be cancelled.
- **Weather by month:** a sortable table of the same averages, plus daylight hours.

### Time of day

- **Average wait by hour** for each park: the first two hours after opening and the last two before close are usually the shortest.
- **When each ride is shortest:** an hour-by-hour heat map for every major ride, so you can see each one's best window.

### Explore

- **Overlay explorer:** lay any measures over each other week by week, such as waits against heat, crowds against rain, or park hours against sunset. *Scaled* lets different units share one chart; *Actual values* shows the real numbers. Presets like *Waits vs weather* are a quick start.
- **Every week, side by side:** one row per week with every measure. Sort by any column, search by month or holiday, or click a row to plan a day that week.

### Walking times

Pick any two spots (rides, restaurants, shows, restrooms, park gates or a hotel; type in the box to narrow the list, ⇄ swaps them) to see the distance along the paths and the minutes it takes at each pace, from a quiet day to the busiest weeks. It uses the same walk rules as the plans: rides are left by their exit and reached at their entrance, and between the parks the walk goes through both gates across the Esplanade. Lines at the gates (security, tap-in) aren't included; the page reminds you they may add time.

### About the data

**How current the data is** lists every dataset with its source, when it was pulled, the last date it covers and whether it's current, ending soon or due for a refresh. Below that are the full sources and methods, including how each score is calculated.

---

## Settings, saving and privacy

- **Settings** (top of the page) holds the optional weather keys and Reset. Your hotel and Lightning Lane choices are on the first page of the Trip wizard and are used by every tab.
- Your choices (sliders, rides, hotel, trip dates and settings) are saved **in your browser only**, on that device. Nothing is sent anywhere. The only things the app downloads are the weather forecast, live park hours and showtimes (ThemeParks.wiki) and US public holidays (Nager.Date); no personal data is sent. **Settings → Reset saved settings** clears them.
- The live forecast uses [Open-Meteo](https://open-meteo.com) by default, with no key needed. If you have a [Vaisala Xweather](https://www.xweather.com) account you can enter your own client ID and secret in **Settings** to use it instead. Keys stay in your browser. If you host a public copy, don't build your keys into it.
- Outside the forecast range, or offline, weather falls back to 10-year averages.
- **Live park hours:** park hours for about the next month, and today's evening showtimes, come live from [ThemeParks.wiki](https://themeparks.wiki), checked in the background and kept in your browser for up to 12 hours. Each plan says where its hours came from ("Hours: live from ThemeParks.wiki (checked 3:10 pm)"). Offline, or for later dates, the plan uses Disney's published calendar or typical hours instead.
- **Long-weekend warning:** when a Plan a day date, or your trip's dates, touch a US holiday long weekend (a Monday or Friday holiday with its weekend, or a Tuesday or Thursday one with the day between) or a Southern California school break, the plan says so: "Presidents' Day long weekend (Sat Feb 13 to Mon Feb 15): expect bigger crowds." Holidays come from [Nager.Date](https://date.nager.at), kept in your browser for 30 days; offline they're worked out from the federal rules.

---

## Where the data comes from

| Data | Source |
|---|---|
| Average wait times by date | [Thrill Data](https://www.thrill-data.com), 2023 onwards |
| Crowd ratings, ride history, hourly waits, closures | [Queue-Times](https://queue-times.com), 2015–2019 and 2023–Oct 2026 (2020–2022 skipped because of COVID closures and reservations) |
| Park hours, ticket prices, refurbishments | Disney's official calendars at [disneyland.disney.go.com](https://disneyland.disney.go.com); published hours through Dec 5, 2026, ticket prices through Jun 30, 2027 |
| Holidays and school breaks | Actual dates for Nov 2026 to Oct 2027 (federal holidays and Orange County / Los Angeles school calendars) |
| Weather history | Anaheim daily records, 2016–2025 |
| Restrooms | [Disney's restroom map](https://disneyland.disney.go.com/guest-services/restrooms/), read Oct 26, 2026 |
| Restaurants, lands, park gates, Lightning Lane rules | Compiled by hand from Disney's listings and [MickeyVisit](https://www.mickeyvisit.com)'s 2026 Lightning Lane guide; the gates, land map and hotel walking times (`data/hotels.js`, routed on OpenStreetMap paths) are our own estimates |
| Live forecast | [Open-Meteo](https://open-meteo.com), or [Vaisala Xweather](https://www.xweather.com) with your own keys |
| Live park hours and today's showtimes | [ThemeParks.wiki](https://themeparks.wiki) (api.themeparks.wiki), called live and never built into the app |
| US public holidays (long weekends) | [Nager.Date](https://date.nager.at), called live; offline, worked out from the federal rules |
| Ride, restaurant and show locations | © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), extracted Oct 25, 2026 and built into the app as `data/park_places.js`. Each ride's entrance and exit are our best guess from the doors mapped on its building; [ThemeParks.wiki](https://www.themeparks.wiki/)'s published ride locations were used once, by hand, as a reference to choose between doors. None of their data is in the app and the app never contacts them. |

The historical data is a snapshot from October 2026 and doesn't update by itself; only the forecast and park hours are live. When you plan a day past what a dataset covers (Disney's published hours, announced event dates, announced refurbishments), the planner falls back to typical values and says so on that day's plan. Walks run from one ride's exit to the next ride's entrance, as a straight line stretched for winding paths, so they're approximate; a restaurant without a location falls back to a simpler land-by-land map. Dates past Disney's published hours use the typical schedule.

---

## Updating the data

Every dataset is its own file in the `data` folder: CSV text with a short header giving its source, the date it was pulled, the last date it covers and when to refresh it. `data/manifest.js` lists them all.

- **[UPDATING.md](UPDATING.md)** is the step-by-step guide: what each dataset is, where it comes from, how to refresh it and what to check, in order of how soon each one goes out of date.
- **`scripts/`** has small PowerShell helpers that copy a dataset out to a CSV for editing and put it back (with a backup and a cache bump), plus downloaders for the OpenStreetMap and weather sources.
- **`scripts\test.ps1`** runs every test in one go (data checks, 288 sample plans, a wizard trip, both PDFs) and prints the result. Run it after any change; see [tests/README.md](tests/README.md).
- **`check.html`** is a quicker check of every dataset, plus 12 sample days.
- The app checks the data each time it loads, and **About the data** shows anything it found.

If you use Claude Code, `CLAUDE.md` gives it the same pointers and the project's rules, so "update the park hours" is enough to get started.

---

## Hosting your own copy

It's a static site: just `index.html`, `shim.js`, `sw.js`, `version.js`, `manifest.webmanifest` and the `css`, `js`, `data`, `vendor` and `icons` folders (`check.html`, `tests`, `scripts`, `_sources` and the guides are optional). Upload the folder unchanged to any static host:

- **[GitHub Pages](https://pages.github.com):** in this repository go to *Settings → Pages* and publish from the main branch.
- **[Netlify Drop](https://app.netlify.com/drop):** drag the folder onto the page.

Once it's on a web address, phones can install it with *Add to Home Screen* and it keeps working offline. If you change any files, bump the version in `version.js` (`1.YYYYMM.N`, N counting updates that month, e.g. `1.202610.5`) so installed copies pick up the update.

---

## License

The code is under the [GNU General Public License v3.0](LICENSE). You're free to use, change and share it under the same terms.

The `park_places` table (`data/park_places.js`) is derived from OpenStreetMap and is available under the [Open Database License](https://opendatacommons.org/licenses/odbl/) (© OpenStreetMap contributors). If you reuse or change that table, keep the credit and share it under the same licence.

Disneyland, California Adventure and attraction names are trademarks of Disney. This project is not affiliated with Disney.
