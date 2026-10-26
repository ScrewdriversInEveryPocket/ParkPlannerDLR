// Park Day Planner dataset: lands. Edit the CSV between the backticks (keep its first line);
// update "pulled", "until" and "review" when you refresh it. See UPDATING.md.
PDP_DATASET({
  id: "lands",
  title: "Lands",
  about: "Each land's rough spot on a simple map (minutes from the park's hub), used when a place has no map point; which land is the entrance; and which lands to borrow restaurants from.",
  source: "Our own estimate",
  url: "",
  license: "",
  pulled: "2026-10-24",
  until: "",
  review: "2027-10-25",
  refresh: "When a land opens or is renamed",
  day_note: "",
  columns: { park: "park!", land: "text!", map_x: "num!", map_y: "num!", entry: "Yes|", dining_near: "text" }
}, `park,land,map_x,map_y,entry,dining_near
Disneyland,Entrance,0,-7,,
Disneyland,Adventureland,-4,1,,New Orleans Square
Disneyland,New Orleans Square,-7,2,,
Disneyland,Bayou Country,-9,4,,New Orleans Square
Disneyland,Frontierland,-5,4,,New Orleans Square
Disneyland,Galaxy's Edge,-8,9,,Frontierland
Disneyland,Fantasyland,0,6,,Main Street U.S.A.
Disneyland,Toontown,0,12,,Fantasyland
Disneyland,Tomorrowland,5,1,,Main Street U.S.A.; Fantasyland
Disneyland,Main Street U.S.A.,0,-4,Yes,
California Adventure,Entrance,0,-5,,
California Adventure,Buena Vista Street,0,-2,Yes,Hollywood Land
California Adventure,Hollywood Land,3,0,,
California Adventure,Avengers Campus,4,-2,,Hollywood Land; Buena Vista Street
California Adventure,Cars Land,5,4,,Pacific Wharf
California Adventure,Pacific Wharf,1,5,,
California Adventure,Pixar Pier,0,10,,Paradise Gardens
California Adventure,Paradise Gardens,-3,9,,Pixar Pier
California Adventure,Grizzly Peak,-4,2,,Pacific Wharf
`);
