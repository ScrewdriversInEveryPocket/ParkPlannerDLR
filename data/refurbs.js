// Park Day Planner dataset: refurbs. Edit the CSV between the backticks (keep its first line);
// update "pulled", "until" and "review" when you refresh it. See UPDATING.md.
PDP_DATASET({
  id: "refurbs",
  title: "Announced refurbishments",
  about: "Rides Disney has announced will close, with dates. A blank end date means no reopening date yet.",
  source: "Disney Tourist Blog's refurbishment calendar (disneytouristblog.com), checked against Disney",
  url: "https://www.disneytouristblog.com/disneyland-refurbishment-calendar",
  license: "",
  pulled: "2026-10-16",
  until: "2026-12-31",
  review: "2026-11-25",
  refresh: "Every month or two; closures are announced a few weeks to months ahead",
  day_note: "Ride closures are only announced a few weeks to months ahead (this list was checked through {until}); check Disney's site before you go.",
  columns: { ride: "ride!", park: "park!", start: "date!", end: "date", note: "text" }
}, `ride,park,start,end,note
it's a small world,Disneyland,2026-10-30,2026-11-12,Closed for its holiday overlay; reopens Nov 13.
Autopia,Disneyland,2027-02-01,,"Closing by Feb 1, 2027 to be converted to electric cars; reopening not announced (guessed summer 2027)."
`);
