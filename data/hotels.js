// Park Day Planner dataset: hotels. Edit the CSV between the backticks (keep its first line);
// update "pulled", "until" and "review" when you refresh it. See UPDATING.md.
PDP_DATASET({
  id: "hotels",
  title: "Hotels",
  about: "How long it takes to get from each kind of hotel to the park turnstiles: walking metres from an average room (walked at the group's pace) plus minutes for elevators and hallways, or a fixed time for the ART shuttle. 'Your own minutes' is set in the app.",
  source: "Our own estimate: footpath distances routed on OpenStreetMap paths (© OpenStreetMap contributors, ODbL)",
  url: "",
  license: "",
  pulled: "2026-10-25",
  until: "",
  review: "",
  refresh: "Only if a hotel's entrance or the paths change",
  day_note: "",
  columns: { id: "text!", name: "text!", label: "text!", summary: "text!", to_dl_m: "int", to_dca_m: "int", to_gc_m: "int", lift_min: "num", fixed_min: "int", note: "text" }
}, `id,name,label,summary,to_dl_m,to_dca_m,to_gc_m,lift_min,fixed_min,note
gc,Grand Californian,Grand Californian,Grand Californian,430,430,290,1.5,,"to_gc_m: to its own California Adventure entrance (gate gc in data/gates.js)"
dlh,Disneyland Hotel,Disneyland Hotel,Disneyland Hotel,845,845,,2,,
pp,Pixar Place Hotel,Pixar Place Hotel,Pixar Place Hotel,830,830,,2.5,,
walk,your hotel,Walking‑distance hotel on Harbor Blvd,a walking-distance hotel on Harbor Blvd,975,975,,0,,"About 15 min at Normal pace"
art,your hotel (ART shuttle),Off‑site hotel using the ART shuttle bus,an off-site hotel (ART shuttle),,,,,40,"The ART bus ride and wait; doesn't change with pace"
`);
