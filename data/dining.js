// Park Day Planner dataset: dining. Edit the CSV between the backticks (keep its first line);
// update "pulled", "until" and "review" when you refresh it. See UPDATING.md.
PDP_DATASET({
  id: "dining",
  title: "Restaurants",
  about: "Restaurants and snack stands by land, with their type. Meals are planned at the nearest quick-service place.",
  source: "Disneyland Resort dining listings (compiled by hand)",
  url: "https://disneyland.disney.go.com/",
  license: "",
  pulled: "2026-10-25",
  until: "",
  review: "2027-04-25",
  refresh: "Every six months, or when a restaurant opens, closes or is renamed",
  day_note: "",
  columns: { park: "park!", land: "land!", name: "text!", kind: "quick service|table service|snack" }
}, `park,land,name,kind
Disneyland,Main Street U.S.A.,Jolly Holiday Bakery Café,quick service
Disneyland,Main Street U.S.A.,Carnation Café,table service
Disneyland,Main Street U.S.A.,Gibson Girl Ice Cream Parlor,snack
Disneyland,Adventureland,Tropical Hideaway,quick service
Disneyland,Adventureland,Bengal Barbecue,snack
Disneyland,Adventureland,Tiki Juice Bar,snack
Disneyland,New Orleans Square,Tiana's Palace,quick service
Disneyland,New Orleans Square,Café Orléans,table service
Disneyland,New Orleans Square,Blue Bayou Restaurant,table service
Disneyland,Bayou Country,Hungry Bear Barbecue Jamboree,quick service
Disneyland,Frontierland,Rancho del Zócalo,quick service
Disneyland,Frontierland,Stage Door Café,quick service
Disneyland,Frontierland,Golden Horseshoe,quick service
Disneyland,Fantasyland,Pinocchio's Village Haus,quick service
Disneyland,Fantasyland,Red Rose Taverne,quick service
Disneyland,Fantasyland,Edelweiss Snacks,snack
Disneyland,Toontown,Café Daisy,quick service
Disneyland,Tomorrowland,Alien Pizza Planet,quick service
Disneyland,Galaxy's Edge,Docking Bay 7 Food and Cargo,quick service
Disneyland,Galaxy's Edge,Ronto Roasters,quick service
Disneyland,Galaxy's Edge,Milk Stand,snack
California Adventure,Buena Vista Street,Carthay Circle Restaurant,table service
California Adventure,Buena Vista Street,"Fiddler, Fifer & Practical Café",quick service
California Adventure,Buena Vista Street,Clarabelle's Hand-Scooped Ice Cream,snack
California Adventure,Hollywood Land,Award Wieners,quick service
California Adventure,Hollywood Land,Schmoozies,snack
California Adventure,Avengers Campus,Pym Test Kitchen,quick service
California Adventure,Avengers Campus,Shawarma Palace,quick service
California Adventure,Avengers Campus,Terran Treats,snack
California Adventure,Grizzly Peak,Smokejumpers Grill,quick service
California Adventure,Pacific Wharf,Cocina Cucamonga Mexican Grill,quick service
California Adventure,Pacific Wharf,Lucky Fortune Cookery,quick service
California Adventure,Pacific Wharf,Boudin Bakery,quick service
California Adventure,Paradise Gardens,Paradise Garden Grill,quick service
California Adventure,Paradise Gardens,Ariel's Grotto,table service
California Adventure,Paradise Gardens,Cove Bar,snack
California Adventure,Pixar Pier,Lamplight Lounge,table service
California Adventure,Pixar Pier,Angry Dogs,quick service
California Adventure,Pixar Pier,Poultry Palace,quick service
California Adventure,Cars Land,Flo's V8 Café,quick service
California Adventure,Cars Land,Fillmore's Taste-In,snack
California Adventure,Cars Land,Cozy Cone Motel,snack
`);
