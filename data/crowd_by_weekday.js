// Park Day Planner dataset: crowd_by_weekday. Edit the CSV between the backticks (keep its first line);
// update "pulled", "until" and "review" when you refresh it. See UPDATING.md.
PDP_DATASET({
  id: "crowd_by_weekday",
  title: "Crowd rating by weekday",
  about: "0-100 crowd rank for each day of the week.",
  source: "Queue-Times (queue-times.com) daily crowd calendar, 2015-2019 and 2023-Oct 23, 2026",
  url: "https://queue-times.com/parks/16/calendar",
  license: "",
  pulled: "2026-10-24",
  until: "",
  review: "2027-10-25",
  refresh: "Once a year",
  day_note: "",
  columns: { day: "text!", day_order: "int!", disneyland: "num", california_adventure: "num" }
}, `day,day_order,disneyland,california_adventure
Mon,1,55.3,61.1
Tue,2,52.1,59.8
Wed,3,46.9,63.1
Thu,4,48.3,55.1
Fri,5,40.6,54.4
Sat,6,51.1,61.4
Sun,7,34.6,56.6
`);
