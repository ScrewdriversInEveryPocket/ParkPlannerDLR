// Park Day Planner dataset: events. Edit the CSV between the backticks (keep its first line);
// update "pulled", "until" and "review" when you refresh it. See UPDATING.md.
PDP_DATASET({
  id: "events",
  title: "Seasonal events",
  about: "Festivals and separately ticketed nights, by typical window (MM-DD, repeats each year).",
  source: "Disney Tourist Blog, Attractions Magazine, MickeyVisit; 2026 holiday dates per Disney via FOX 11",
  url: "https://www.disneytouristblog.com/",
  license: "",
  pulled: "2026-10-24",
  until: "2027-01-06",
  review: "2027-01-15",
  refresh: "Each time Disney announces a season (usually a few months ahead)",
  day_note: "Event dates after {until} weren't announced yet, so the events shown use their usual windows.",
  columns: { name: "text!", park: "park+!", kind: "text!", start: "md!", end: "md!", start_week: "week!", end_week: "week!", notes: "text" }
}, `name,park,kind,start,end,start_week,end_week,notes
Holidays at the Disneyland Resort,Both,Festival,11-13,12-31,46,52,"Holiday overlays on Haunted Mansion and small world, holiday parade and fireworks, Festival of Holidays at DCA. Announced: Nov 13, 2026 to Jan 6, 2027."
Holidays at the Disneyland Resort (end),Both,Festival,01-01,01-06,1,1,Announced end date: Jan 6, 2027.
Lunar New Year,California Adventure,Festival,01-23,02-21,4,8,"Food marketplaces, Mulan procession and character meets at DCA. 2027 dates not announced yet; typical window shown."
Disneyland After Dark nights,Disneyland,Ticketed nights (early close),01-22,06-18,4,25,"About 20 separately ticketed nights (Sweethearts, Star Wars, Pride and more); Disneyland closes early to day guests on those nights. 2027 dates not announced yet; typical window shown."
Food & Wine Festival,California Adventure,Festival,03-06,04-27,10,17,"Food marketplaces, demos and entertainment at DCA. 2027 dates not announced yet; typical window shown."
Grad Nite,California Adventure,Ticketed nights (early close),05-08,06-12,19,24,"About 15 nights; DCA closes to day guests around 9 pm, and park crowds skew teen. 2027 dates not announced yet; typical window shown."
Halloween Time,Both,Festival,08-21,10-31,34,44,"Halloween decor, Haunted Mansion Holiday, Guardians Monsters After Dark and Radiator Springs overlays."
Oogie Boogie Bash,California Adventure,Ticketed nights (early close),08-18,10-31,33,44,About 30 nights; DCA closes to day guests at 6 pm on party nights.
Plaza de la Familia,California Adventure,Festival,08-21,11-02,34,44,Día de los Muertos celebration themed to Coco at DCA.
`);
