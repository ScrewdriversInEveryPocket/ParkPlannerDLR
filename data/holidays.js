// Park Day Planner dataset: holidays. Edit the CSV between the backticks (keep its first line);
// update "pulled", "until" and "review" when you refresh it. See UPDATING.md.
PDP_DATASET({
  id: "holidays",
  title: "Holidays and school breaks",
  about: "Holiday weekends and Southern California school breaks (MM-DD, repeats each year).",
  source: "Actual 2026-27 dates: ActivityHero (activityhero.com), MomsLA (momsla.com), federal calendar",
  url: "https://www.activityhero.com/",
  license: "",
  pulled: "2026-10-24",
  until: "2027-10-31",
  review: "2027-08-01",
  refresh: "Once a year, when districts post next year's calendars",
  day_note: "",
  columns: { name: "text!", kind: "holiday|school", start: "md!", end: "md!", start_week: "week!", end_week: "week!" }
}, `name,kind,start,end,start_week,end_week
New Year / end of winter break,holiday,01-01,01-10,1,2
MLK Day weekend,holiday,01-16,01-18,3,3
Presidents' Day week (ski week),school,02-13,02-21,7,8
Spring break season (incl. Easter Mar 28),school,03-13,04-11,11,15
Memorial Day weekend,holiday,05-29,05-31,22,22
Summer break,school,06-04,08-15,23,33
Labor Day weekend,holiday,09-04,09-06,36,36
Indigenous Peoples' / Columbus Day weekend,holiday,10-09,10-11,41,41
Veterans Day,holiday,11-11,11-11,45,45
Thanksgiving week,holiday,11-21,11-29,47,48
Christmas & winter break,school,12-19,12-31,51,52
`);
