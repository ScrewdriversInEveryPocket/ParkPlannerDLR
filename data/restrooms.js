// Park Day Planner dataset: restrooms. Edit the CSV between the backticks (keep its first line);
// update "pulled", "until" and "review" when you refresh it. See UPDATING.md.
PDP_DATASET({
  id: "restrooms",
  title: "Restrooms",
  about: "Every guest restroom inside the two parks with its map point, from Disney's restroom map. Companion restrooms are their own rows (most share a point with the main restrooms). The plans mark a step with 🚻 when one is within about a 2-minute walk, before long lines, before leaving for a break or a hop, and otherwise about every 90 minutes. Island rows (Tom Sawyer Island, reached by raft) are never suggested.",
  source: "Disney's official restroom map (the Find Restrooms list on disneyland.disney.go.com/guest-services/restrooms/), read Oct 26, 2026",
  url: "https://disneyland.disney.go.com/guest-services/restrooms/",
  license: "",
  pulled: "2026-10-26",
  until: "",
  review: "2027-04-26",
  refresh: "Every six months, or when a land is rebuilt (scripts in _sources\\restrooms)",
  day_note: "",
  columns: { park: "park!", name: "text!", lat: "lat!", lon: "lon!", companion: "yes|no!", island: "yes|no!", disney_id: "text" }
}, `park,name,lat,lon,companion,island,disney_id
Disneyland,Adventureland Restrooms,33.811861,-117.919785,no,no,17410197
Disneyland,Black Spire Outpost Courtyard Companion Restroom,33.814214,-117.92072,yes,no,19333419
Disneyland,Black Spire Outpost Courtyard Restrooms,33.814214,-117.92072,no,no,19333416
Disneyland,Black Spire Outpost Market Companion Restroom,33.814428,-117.921967,yes,no,19333415
Disneyland,Black Spire Outpost Market Restrooms,33.814428,-117.921967,no,no,19333400
Disneyland,Carnation Café Restrooms,33.810975,-117.91926,no,no,17410236
Disneyland,City Hall Companion Restroom,33.809999,-117.919549,yes,no,17410335
Disneyland,City Hall Restrooms,33.810378,-117.919413,no,no,17410203
Disneyland,Disneyana Restrooms,33.810052,-117.918318,no,no,17410183
Disneyland,Fantasyland Theatre Companion Restroom,33.814431,-117.918562,yes,no,17410244
Disneyland,Hungry Bear Barbecue Jamboree Companion Restroom,33.812762,-117.922688,yes,no,18089435
Disneyland,Hungry Bear Barbecue Jamboree Restrooms,33.81265,-117.922474,no,no,17410240
Disneyland,King & Queen Restrooms,33.812921,-117.918414,no,no,17410202
Disneyland,Main Entrance Restrooms at Disneyland Park,33.809727,-117.920095,no,no,17410194
Disneyland,Mickey's Toontown Companion Restroom,33.815399,-117.918829,yes,no,411906431
Disneyland,Mickey's Toontown Restrooms,33.815399,-117.918829,no,no,17410200
Disneyland,New Orleans Square Restrooms,33.811003,-117.921635,no,no,17410184
Disneyland,Plaza Inn Restrooms,33.811812,-117.91819,no,no,17410186
Disneyland,Prince & Princess Restrooms,33.814431,-117.918464,no,no,17410198
Disneyland,Rancho del Zocalo Restrooms,33.812463,-117.919743,no,no,17410261
Disneyland,Red Rose Taverne Restrooms,33.813551,-117.919673,no,no,17410209
Disneyland,Space Mountain Restrooms,33.811341,-117.917668,no,no,17410195
Disneyland,Tom Sawyer Island Companion Restroom,33.81307,-117.921981,yes,yes,17410338
Disneyland,Tom Sawyer Island Fort Wilderness Restroom,33.81307,-117.921981,no,yes,17410159
Disneyland,Tom Sawyer Island Restrooms,33.812377,-117.920983,no,yes,17410210
Disneyland,Tomorrowland Station Companion Restroom,33.812283,-117.916363,yes,no,18377217
Disneyland,Tomorrowland Station Restrooms,33.812283,-117.916363,no,no,17410181
Disneyland,Walt Disney's Enchanted Tiki Room Companion Restroom,33.811771,-117.919482,yes,no,19160678
California Adventure,Avengers Campus Companion Restroom,33.806762,-117.918092,yes,no,17410327
California Adventure,Avengers Campus Restrooms,33.806762,-117.918092,no,no,17410193
California Adventure,Bay Area Companion Restroom,33.806531,-117.920824,yes,no,17410259
California Adventure,Bay Area Restrooms,33.806531,-117.920824,no,no,17410188
California Adventure,Buena Vista Street Companion Restroom,33.808473,-117.918613,yes,no,17410239
California Adventure,Buena Vista Street Restrooms,33.808483,-117.919186,no,no,17410187
California Adventure,Cars Land Companion Restroom,33.806159,-117.918076,yes,no,412868341
California Adventure,Cars Land Restrooms,33.806114,-117.918027,no,no,412868345
California Adventure,Disney California Adventure Baby Care Center Companion Restroom,33.805934,-117.919424,yes,no,17410336
California Adventure,Flo's V8 Cafe Companion Restroom,33.805642,-117.919222,yes,no,17410262
California Adventure,Flo's V8 Cafe Restrooms,33.805642,-117.919222,no,no,17410190
California Adventure,Golden Vine Winery Restrooms,33.806623,-117.91983,no,no,17410192
California Adventure,Grizzly Peak Airfield Restrooms,33.808032,-117.920322,no,no,17410199
California Adventure,Hollywood Backlot Restrooms,33.807882,-117.916925,no,no,411554807
California Adventure,Hollywood Boulevard Restrooms,33.807481,-117.918097,no,no,17410185
California Adventure,Main Entrance Restrooms at Disney California Adventure Park,33.808624,-117.918442,no,no,17410223
California Adventure,Paradise Garden Grill Restrooms,33.806226,-117.923384,no,no,17410182
California Adventure,San Fransokyo Square Restrooms,33.805646,-117.919783,no,no,17410189
California Adventure,Toy Story Midway Mania! Restrooms,33.804402,-117.921254,no,no,17410196
`);
