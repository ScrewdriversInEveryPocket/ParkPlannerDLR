// Park Day Planner dataset: security_waits. Edit the CSV between the backticks (keep its first line);
// update "pulled", "until" and "review" when you refresh it. See UPDATING.md.
PDP_DATASET({
  id: "security_waits",
  title: "Security and tap-in lines",
  about: "Our estimate of minutes in the bag-check and turnstile lines when you enter a park: by time of day, scaled by how busy the day is, with the Grand Californian entrance and park hops on their own rows.",
  source: "Our own estimate from blog reports (Disney Tourist Blog, Disney Dining, Inside the Magic, MickeyVisit, 2025); Disney publishes no security wait times",
  url: "https://www.disneytouristblog.com/morning-plan-disneyland-rope-drop-strategy/",
  license: "",
  pulled: "2026-10-25",
  until: "",
  review: "",
  refresh: "Only if Disney changes how screening works (for example walk-through scanners instead of bag checks)",
  day_note: "",
  columns: { kind: "curve|crowd|entrance|hop!", at: "text!", minutes: "num!", note: "text" }
}, `kind,at,minutes,note
curve,-60,8,"at = minutes from the park's opening; minutes = time in line on a typical day, tap-in included. Security opens about an hour before the park"
curve,-45,11,
curve,-30,15,Turnstiles open about 30 min before opening: the rope-drop rush
curve,0,18,
curve,60,16,
curve,180,13,
curve,300,12,Midday
curve,540,8,Evening
crowd,0.85,0.7,"at = how busy the day is (1 = a typical day, from the ride wait factors); minutes = multiplier. Quiet day"
crowd,1,1,Typical day
crowd,1.15,1.4,Busy day
entrance,gc,-5,"Grand Californian entrance into California Adventure: shorter lines (hotel guests, no-bag lane since July 2025)"
hop,tapin,15,"Park hop: tapping in at the other park on a typical day, scaled by how busy it is. No bag check: the Esplanade is inside security"
`);
