// Park Day Planner dataset: gates. Edit the CSV between the backticks (keep its first line);
// update "pulled", "until" and "review" when you refresh it. See UPDATING.md.
PDP_DATASET({
  id: "gates",
  title: "Park gates",
  about: "Where each park's turnstiles are, the start and end of every walk, plus the Grand Californian's own entrance into California Adventure (hotel guests only).",
  source: "Our own estimate; the Grand Californian entrance is OpenStreetMap node 1424633555 (© OpenStreetMap contributors, ODbL); its hours are our estimate",
  url: "",
  license: "",
  pulled: "2026-10-25",
  until: "",
  review: "",
  refresh: "Only if the entrances move",
  day_note: "",
  columns: { id: "text!", park: "park!", lat: "lat!", lon: "lon!", guests: "Grand Californian|", opens_before_min: "int", closes_after_min: "int", name: "text!", note: "text" }
}, `id,park,lat,lon,guests,opens_before_min,closes_after_min,name,note
dl,Disneyland,33.8096,-117.9189,,,,Disneyland gate,Turnstiles on the Esplanade (our estimate; OpenStreetMap does not name them)
dca,California Adventure,33.8087,-117.9189,,,,California Adventure gate,Turnstiles on the Esplanade (our estimate; OpenStreetMap does not name them)
gc,California Adventure,33.8078,-117.9213,Grand Californian,60,0,Grand Californian entrance,"Hotel guests' own entrance into California Adventure at Grizzly Peak (OpenStreetMap: DCA Grand California Gate). Hours are our estimate: from an hour before the park opens until close; outside them guests use the Esplanade"
`);
