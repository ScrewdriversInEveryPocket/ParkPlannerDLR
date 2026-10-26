// Park Day Planner dataset: show_estimates. Edit the CSV between the backticks (keep its first line);
// update "pulled", "until" and "review" when you refresh it. See UPDATING.md.
PDP_DATASET({
  id: "show_estimates",
  title: "Typical nighttime shows (our estimate)",
  about: "Our estimate of when the big nighttime shows usually run, for dates past Disney's published showtimes. A show is only listed on the weekdays in days (all, or e.g. Fri;Sat;Sun) when the park is open until at least min_close (24-hour clock); times are 24-hour times split by ;, or close-N for N minutes before closing. Plans label these as estimates and tell people to check the Disneyland app.",
  source: "Our own estimate, matched to the pattern in Disney's published showtimes for Oct 26 to Dec 6, 2026: Disneyland fireworks at 9:30 pm on Friday to Sunday nights and every night of the holiday season; Fantasmic! at 9 and 10:30 on Friday to Sunday nights open to 11 or later and every midnight night; World of Color at 9, plus a second show on nights open to 10 or later",
  url: "https://disneyland.disney.go.com/entertainment/",
  license: "",
  pulled: "2026-10-26",
  until: "",
  review: "2027-04-26",
  refresh: "Twice a year, or when Disney adds or retires a nighttime show",
  day_note: "",
  columns: { park: "park!", name: "text!", from_md: "text!", to_md: "text!", min_close: "num!", days: "text!", times: "text!" }
}, `park,name,from_md,to_md,min_close,days,times
Disneyland,Fireworks,01-07,11-12,22,Fri;Sat;Sun,21:30
Disneyland,Fireworks,11-13,12-31,22,all,21:30
Disneyland,Fireworks,01-01,01-06,22,all,21:30
Disneyland,Fantasmic!,01-01,12-31,23,Fri;Sat;Sun,21:00;22:30
Disneyland,Fantasmic!,01-01,12-31,24,all,21:00;22:30
California Adventure,World of Color,01-01,12-31,21,all,21:00
California Adventure,World of Color,01-01,12-31,22,all,22:15
`);
