// Park Day Planner dataset: lightning_lane. Edit the CSV between the backticks (keep its first line);
// update "pulled", "until" and "review" when you refresh it. See UPDATING.md.
PDP_DATASET({
  id: "lightning_lane",
  title: "Lightning Lane rules",
  about: "How the planner uses Lightning Lane Multi Pass. Which rides are Multi Pass or Single Pass is in the Rides file.",
  source: "MickeyVisit (mickeyvisit.com) 2026 Lightning Lane guide, and our planning assumptions",
  url: "https://www.mickeyvisit.com/",
  license: "",
  pulled: "2026-10-23",
  until: "",
  review: "2027-04-25",
  refresh: "When Disney changes the rules",
  day_note: "",
  columns: { setting: "text!", value: "text!", note: "text" }
}, `setting,value,note
wait_min,10,Minutes a Lightning Lane return line takes
gap_hours,1,"Plan Multi Pass rides at least this many hours apart, since you can hold only one booking at a time"
hours_per_pass,1.75,Plan about one Multi Pass ride for every this many hours in the park
max_multi,7,Most Multi Pass rides planned in one day
rebook_rule,"Book the next one as soon as you use one, or 2 hours after booking.","Disney's booking rule, shown on the plan"
`);
