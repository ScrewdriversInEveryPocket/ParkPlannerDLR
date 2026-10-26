// Park Day Planner dataset: crowd_by_month. Edit the CSV between the backticks (keep its first line);
// update "pulled", "until" and "review" when you refresh it. See UPDATING.md.
PDP_DATASET({
  id: "crowd_by_month",
  title: "Crowd rating by month",
  about: "0-100 crowd rank for each month.",
  source: "Queue-Times (queue-times.com) daily crowd calendar, 2015-2019 and 2023-Oct 23, 2026",
  url: "https://queue-times.com/parks/16/calendar",
  license: "",
  pulled: "2026-10-24",
  until: "",
  review: "2027-10-25",
  refresh: "Once a year",
  day_note: "",
  columns: { month: "mon!", month_num: "int!", disneyland: "num", california_adventure: "num" }
}, `month,month_num,disneyland,california_adventure
Jan,1,46.2,56.4
Feb,2,49.2,64
Mar,3,58.2,73.9
Apr,4,56.9,71.3
May,5,55.5,65.5
Jun,6,44.9,59.7
Jul,7,40.6,57.2
Aug,8,35.9,49.1
Sep,9,32.6,42
Oct,10,52.4,60.2
Nov,11,43.5,50.1
Dec,12,47.6,54.1
`);
