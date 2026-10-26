// Park Day Planner dataset: dining. Edit the CSV between the backticks (keep its first line);
// update "pulled", "until" and "review" when you refresh it. See UPDATING.md.
PDP_DATASET({
  id: "dining",
  title: "Restaurants",
  about: "Every place to eat inside the two parks, from Disney's dining list: land, type (quick service, table service, snack, lounge, or a dining event or seasonal festival booth), whether it takes reservations (none, accepted, recommended or required), has a walk-up list in the Disneyland app, or takes mobile orders, price range, meals served, cuisine and notes. Map points are in park_places. Meals are planned at the nearest quick-service place.",
  source: "Disney's official dining list and restaurant pages (the explorer-service feed behind disneyland.disney.go.com/dining/), read Oct 26, 2026. Lands are Disney's, using the app's land names (San Fransokyo Square is Pacific Wharf; the Performance Corridor wine terraces are Pacific Wharf); places with no land are given the land of the nearest ride",
  url: "https://disneyland.disney.go.com/dining/",
  license: "",
  pulled: "2026-10-26",
  until: "",
  review: "2027-04-26",
  refresh: "Every six months, or when a restaurant opens, closes or is renamed (scripts in _sources\\dining)",
  day_note: "",
  columns: { park: "park!", land: "land!", name: "text!", kind: "quick service|table service|snack|lounge|event|festival!", reservations: "none|accepted|recommended|required!", walkup: "yes|no!", mobile_order: "yes|no!", price: "text", meals: "text", cuisine: "text", note: "text", disney_id: "text", url: "text" }
}, `park,land,name,kind,reservations,walkup,mobile_order,price,meals,cuisine,note,disney_id,url
Disneyland,Adventureland,Bengal Barbecue,snack,none,no,yes,$,snacks,American,,368519,https://disneyland.disney.go.com/dining/disneyland/bengal-barbecue/
Disneyland,Adventureland,South Seas Traders,snack,none,no,no,$,snacks,American;Healthy Selections;Vegetarian,,426608,https://disneyland.disney.go.com/dining/disneyland/south-seas-traders/
Disneyland,Adventureland,The Tropical Hideaway,snack,none,no,no,$,snacks,Vegetarian,,19197204,https://disneyland.disney.go.com/dining/disneyland/tropical-hideaway/
Disneyland,Adventureland,Tiki Juice Bar,snack,none,no,yes,$,snacks,American,,354516,https://disneyland.disney.go.com/dining/disneyland/tiki-juice-bar/
Disneyland,Bayou Country,Hungry Bear Barbecue Jamboree,quick service,none,no,yes,$,lunch;dinner,American,,354303,https://disneyland.disney.go.com/dining/disneyland/hungry-bear-barbecue/
Disneyland,Bayou Country,Fruit Carts,snack,none,no,no,$,,American,Carts in both parks; the map point is one of them,18516137,https://disneyland.disney.go.com/dining/fruit/
Disneyland,Bayou Country,Lemonade Carts,snack,none,no,no,$,,American,Carts in both parks; the map point is one of them,18516133,https://disneyland.disney.go.com/dining/lemonade/
Disneyland,Fantasyland,Red Rose Taverne,quick service,none,no,yes,$,breakfast;lunch;dinner,American,,18674905,https://disneyland.disney.go.com/dining/disneyland/red-rose-taverne/
Disneyland,Fantasyland,Edelweiss Snacks,snack,none,no,yes,$,snacks,American,,369431,https://disneyland.disney.go.com/dining/disneyland/edelweiss-snacks/
Disneyland,Fantasyland,Maurice's Treats,snack,none,no,no,$,snacks,American,,17301557,https://disneyland.disney.go.com/dining/disneyland/maurices-treats/
Disneyland,Fantasyland,Pretzel Carts,snack,none,no,no,$,,American,Carts in both parks; the map point is one of them,18516135,https://disneyland.disney.go.com/dining/pretzels/
Disneyland,Fantasyland,Troubadour Tavern,snack,none,no,yes,$,snacks,American,,354228,https://disneyland.disney.go.com/dining/disneyland/troubadour-tavern/
Disneyland,Fantasyland,Turkey Leg Carts,snack,none,no,no,$,,American,Carts in both parks; the map point is one of them,18516131,https://disneyland.disney.go.com/dining/turkey-legs/
Disneyland,Frontierland,Rancho del Zocalo Restaurante,quick service,none,no,no,$,lunch;dinner,American;Mexican,,354438,https://disneyland.disney.go.com/dining/disneyland/rancho-del-zocalo-restaurante/
Disneyland,Frontierland,Stage Door Café,quick service,none,no,yes,$,lunch;dinner,American,,354465,https://disneyland.disney.go.com/dining/disneyland/stage-door-cafe/
Disneyland,Frontierland,The Golden Horseshoe,quick service,none,no,no,$,lunch;dinner,American,,354498,https://disneyland.disney.go.com/dining/disneyland/golden-horseshoe-restaurant/
Disneyland,Frontierland,River Belle Terrace,table service,recommended,yes,no,$$,lunch;dinner,American,,354450,https://disneyland.disney.go.com/dining/disneyland/river-belle-terrace/
Disneyland,Galaxy's Edge,Docking Bay 7 Food and Cargo,quick service,none,no,yes,$,lunch;dinner,American;Vegetarian,,19268345,https://disneyland.disney.go.com/dining/disneyland/docking-bay-7-food-and-cargo/
Disneyland,Galaxy's Edge,Ronto Roasters,quick service,none,no,yes,$,breakfast;lunch;dinner;late-night,American,,19268333,https://disneyland.disney.go.com/dining/disneyland/ronto-roasters/
Disneyland,Galaxy's Edge,Kat Saka's Kettle,snack,none,no,no,$,snacks,American,,19268342,https://disneyland.disney.go.com/dining/disneyland/kat-sakas-kettle/
Disneyland,Galaxy's Edge,Milk Stand,snack,none,no,yes,$,snacks,American,,19267431,https://disneyland.disney.go.com/dining/disneyland/milk-stand/
Disneyland,Galaxy's Edge,Oga's Cantina at the Disneyland Resort,lounge,none,yes,no,$,lounge,,"Walk-up only, may have a standby line",19268344,https://disneyland.disney.go.com/dining/disneyland/ogas-cantina/
Disneyland,Main Street U.S.A.,Jolly Holiday Bakery Cafe,quick service,none,no,yes,$,breakfast;lunch;dinner,Bakery,,16363584,https://disneyland.disney.go.com/dining/disneyland/jolly-holiday-bakery-cafe/
Disneyland,Main Street U.S.A.,Little Red Wagon,quick service,none,no,yes,$,lunch;dinner,American,,354348,
Disneyland,Main Street U.S.A.,Market House,quick service,none,no,no,$,breakfast;lunch;dinner,American;Healthy Selections;Vegetarian;Bakery,,17394022,https://disneyland.disney.go.com/dining/disneyland/market-house/
Disneyland,Main Street U.S.A.,Refreshment Corner,quick service,none,no,yes,$,lunch;dinner,American,,354444,https://disneyland.disney.go.com/dining/disneyland/refreshment-corner/
Disneyland,Main Street U.S.A.,Carnation Café,table service,recommended,yes,no,$,breakfast;lunch;dinner,American,,354129,https://disneyland.disney.go.com/dining/disneyland/carnation-cafe/
Disneyland,Main Street U.S.A.,Plaza Inn,table service,recommended,no,no,$$,breakfast;lunch;dinner,American,Reservations only for breakfast and seasonal offers; Characters at breakfast only,354414,https://disneyland.disney.go.com/dining/disneyland/plaza-inn/
Disneyland,Main Street U.S.A.,Gibson Girl Ice Cream Parlor,snack,none,no,yes,$,snacks,American,,354255,https://disneyland.disney.go.com/dining/disneyland/gibson-girl-ice-cream-parlor/
Disneyland,Main Street U.S.A.,Plaza Inn Dining Package,event,required,no,no,$$$$,,American,Package or event at Plaza Inn,18994149,https://disneyland.disney.go.com/dining/disneyland/plaza-inn-dining-package/
Disneyland,New Orleans Square,Harbour Galley,quick service,none,no,yes,$,lunch;dinner,American,,354273,https://disneyland.disney.go.com/dining/disneyland/harbour-galley/
Disneyland,New Orleans Square,Royal Street Veranda,quick service,none,no,yes,$,lunch;dinner,American,,354456,https://disneyland.disney.go.com/dining/disneyland/royal-street-veranda/
Disneyland,New Orleans Square,Tiana’s Palace,quick service,none,no,yes,$,lunch;dinner,Cajun-Creole,,411936931,https://disneyland.disney.go.com/dining/disneyland/tianas-palace/
Disneyland,New Orleans Square,Blue Bayou Restaurant,table service,recommended,yes,no,$$$,lunch;dinner,Cajun-Creole,,354099,https://disneyland.disney.go.com/dining/disneyland/blue-bayou-restaurant/
Disneyland,New Orleans Square,Cafe Orleans,table service,recommended,yes,no,$$,lunch;dinner,Cajun-Creole,,354117,https://disneyland.disney.go.com/dining/disneyland/cafe-orleans/
Disneyland,New Orleans Square,Mint Julep Bar,snack,none,no,yes,$,snacks,American,,354369,https://disneyland.disney.go.com/dining/disneyland/mint-julep-bar/
Disneyland,New Orleans Square,Fantasmic! Dining Packages,event,required,no,no,$$$,,American;Vegetarian,Package or event at River Belle Terrace / Cafe Orleans / Rancho del Zocalo Restaurante,17920676,https://disneyland.disney.go.com/dining/disneyland/fantasmic-dinner-packages/
Disneyland,Tomorrowland,Alien Pizza Planet,quick service,none,no,no,$,lunch;dinner,American,,354441,https://disneyland.disney.go.com/dining/disneyland/alien-pizza-planet/
Disneyland,Tomorrowland,Galactic Grill,quick service,none,no,yes,$,breakfast;lunch;dinner,American;Healthy Selections;Vegetarian,,18246297,https://disneyland.disney.go.com/dining/disneyland/galactic-grill/
Disneyland,Tomorrowland,Tomorrowland Skyline Terrace,event,required,no,no,,,,Package or event at Tomorrowland Skyline Terrace,18701288,https://disneyland.disney.go.com/dining/disneyland/tomorrowland-skyline-terrace/
Disneyland,Toontown,Café Daisy,quick service,none,no,yes,$,lunch;dinner,,May close for fireworks,411845026,https://disneyland.disney.go.com/dining/disneyland/cafe-daisy/
Disneyland,Toontown,Good Boy! Grocers,snack,none,no,no,$,snacks,,,411845225,https://disneyland.disney.go.com/dining/disneyland/good-boy-grocers/
California Adventure,Avengers Campus,Pym Test Kitchen,quick service,none,no,yes,$,breakfast;lunch;dinner,American;Healthy Selections;Vegetarian,,19530853,https://disneyland.disney.go.com/dining/disney-california-adventure/pym-test-kitchen/
California Adventure,Avengers Campus,Shawarma Palace,quick service,none,no,no,$,breakfast;snacks,,,19624439,https://disneyland.disney.go.com/dining/disney-california-adventure/shawarma-palace/
California Adventure,Avengers Campus,Popcorn Carts,snack,none,no,no,$,,American,Carts in both parks; the map point is one of them,18516125,https://disneyland.disney.go.com/dining/popcorn/
California Adventure,Avengers Campus,Terran Treats,snack,none,no,no,$,snacks,,,19624444,https://disneyland.disney.go.com/dining/disney-california-adventure/terran-treats/
California Adventure,Avengers Campus,Pym Tasting Lab,lounge,none,no,yes,$,lounge,,,19624438,https://disneyland.disney.go.com/dining/disney-california-adventure/pym-tasting-lab/
California Adventure,Buena Vista Street,"Fiddler, Fifer & Practical Cafe",quick service,none,no,no,$,breakfast;lunch;dinner,American;Bakery,,16513886,https://disneyland.disney.go.com/dining/disney-california-adventure/fiddler-fifer-and-practical-cafe/
California Adventure,Buena Vista Street,Carthay Circle Lounge,table service,recommended,yes,no,$,lunch;dinner,American,,16588263,https://disneyland.disney.go.com/dining/disney-california-adventure/carthay-circle-lounge/
California Adventure,Buena Vista Street,Carthay Circle Restaurant,table service,recommended,yes,no,$$,dinner,American,,16515009,https://disneyland.disney.go.com/dining/disney-california-adventure/carthay-circle-restaurant/
California Adventure,Buena Vista Street,Clarabelle's Hand-Scooped Ice Cream,snack,none,no,yes,$,snacks,American,,16513928,https://disneyland.disney.go.com/dining/disney-california-adventure/clarabelles-hand-scooped-ice-cream/
California Adventure,Cars Land,Flo's V8 Cafe,quick service,none,no,yes,$,lunch;dinner,American,,16486843,https://disneyland.disney.go.com/dining/disney-california-adventure/flos-v8-cafe/
California Adventure,Cars Land,Cozy Cone Motel,snack,none,no,no,$,snacks,American,,16514114,https://disneyland.disney.go.com/dining/disney-california-adventure/cozy-cone-motel/
California Adventure,Cars Land,Fillmore's Taste-In,snack,none,no,no,$,snacks,American;Healthy Selections;Vegetarian,,16505450,https://disneyland.disney.go.com/dining/disney-california-adventure/fillmores-taste-in/
California Adventure,Cars Land,World of Color Dining Package,event,required,no,no,$$$,,American;Healthy Selections;Vegetarian,Package or event at Magic Key Terrace - Magic Key Holder Dining / Wine Country Trattoria / Storytellers Cafe,17736036,https://disneyland.disney.go.com/dining/disney-california-adventure/world-of-color-dining/
California Adventure,Cars Land,Festive Food Marketplace,festival,none,no,no,$,snacks,American;Californian;Mexican,Closed on 2026-10-26; Seasonal festival only,18515597,https://disneyland.disney.go.com/dining/disney-california-adventure/festive-foods-marketplaces/
California Adventure,Grizzly Peak,Smokejumpers Grill,quick service,none,no,yes,$,breakfast;lunch;dinner,American,,354483,https://disneyland.disney.go.com/dining/disney-california-adventure/smokejumpers-grill/
California Adventure,Grizzly Peak,Churro Carts,snack,none,no,no,$,,American,Carts in both parks; the map point is one of them,18516129,https://disneyland.disney.go.com/dining/churros/
California Adventure,Grizzly Peak,Food & Wine Festival Marketplaces,festival,none,no,no,$,snacks,Californian,Closed on 2026-10-26; Seasonal festival only,18384059,https://disneyland.disney.go.com/dining/disney-california-adventure/food-and-wine-festival-marketplaces/
California Adventure,Grizzly Peak,Sip and Savor Pass,festival,none,no,no,,,Vegetarian;Californian,Seasonal festival only,19436152,https://disneyland.disney.go.com/dining/disney-california-adventure/sip-and-savor/
California Adventure,Hollywood Land,Award Wieners,quick service,none,no,yes,$,lunch;dinner,American,,354084,https://disneyland.disney.go.com/dining/disney-california-adventure/award-wieners/
California Adventure,Hollywood Land,Fairfax Market,snack,none,no,no,$,snacks,Healthy Selections;Vegetarian,,424962,https://disneyland.disney.go.com/dining/disney-california-adventure/fairfax-fruit-market/
California Adventure,Hollywood Land,Schmoozies!,snack,none,no,yes,$,snacks,American,,354462,https://disneyland.disney.go.com/dining/disney-california-adventure/schmoozies-smoothies/
California Adventure,Hollywood Land,Studio Catering Co.,snack,none,no,yes,$,snacks,American,,354477,https://disneyland.disney.go.com/dining/disney-california-adventure/studio-catering-co/
California Adventure,Hollywood Land,Hollywood Lounge,lounge,none,no,yes,$,snacks,American,,18409951,https://disneyland.disney.go.com/dining/disney-california-adventure/hollywood-lounge/
California Adventure,Pacific Wharf,Aunt Cass Café,quick service,none,no,yes,$,lunch;dinner,Asian;American,,411972544,https://disneyland.disney.go.com/dining/disney-california-adventure/aunt-cass-cafe/
California Adventure,Pacific Wharf,Cappuccino Cart,quick service,none,no,yes,$,breakfast;snacks,American,,354123,https://disneyland.disney.go.com/dining/disney-california-adventure/cappuccino-cart/
California Adventure,Pacific Wharf,Cocina Cucamonga Mexican Grill,quick service,none,no,yes,$,lunch;dinner,Mexican,,354195,https://disneyland.disney.go.com/dining/disney-california-adventure/cocina-cucamonga-mexican-grill/
California Adventure,Pacific Wharf,Lucky Fortune Cookery,quick service,none,no,yes,$,lunch;dinner,Asian,,368932,https://disneyland.disney.go.com/dining/disney-california-adventure/lucky-fortune-cookery/
California Adventure,Pacific Wharf,Magic Key Terrace - Magic Key Holder Dining,table service,accepted,yes,no,$,lunch;dinner,American,Magic Key holders only,15527906,https://disneyland.disney.go.com/dining/disney-california-adventure/magic-key-terrace/
California Adventure,Pacific Wharf,Wine Country Trattoria,table service,recommended,yes,no,$$,lunch;dinner,Healthy Selections;Italian;Vegetarian,,354555,https://disneyland.disney.go.com/dining/disney-california-adventure/wine-country-trattoria/
California Adventure,Pacific Wharf,Boudin Bread Cart,snack,none,no,no,$,snacks,,,17302464,
California Adventure,Pacific Wharf,Ghirardelli® Soda Fountain and Chocolate Shop,snack,none,no,no,$,snacks,American,,16514168,https://disneyland.disney.go.com/dining/disney-california-adventure/ghirardelli-soda-fountain-and-chocolate-shop/
California Adventure,Pacific Wharf,Port of San Fransokyo Cervecería,snack,none,no,yes,$,snacks,American,,411947320,https://disneyland.disney.go.com/dining/disney-california-adventure/port-of-san-fransokyo-cerveceria/
California Adventure,Pacific Wharf,Rita's Turbine Blenders,snack,none,no,yes,$,snacks,American,,354447,https://disneyland.disney.go.com/dining/disney-california-adventure/ritas-turbine-blenders/
California Adventure,Pacific Wharf,Mendocino Terrace,lounge,none,no,yes,$,lounge,American,,368928,https://disneyland.disney.go.com/dining/disney-california-adventure/mendocino-terrace/
California Adventure,Pacific Wharf,Sonoma Terrace,lounge,none,no,yes,$,lounge,American,,368880,https://disneyland.disney.go.com/dining/disney-california-adventure/sonoma-terrace/
California Adventure,Paradise Gardens,Boardwalk Pizza & Pasta,quick service,none,no,yes,$,lunch;dinner,Italian,,16032493,https://disneyland.disney.go.com/dining/disney-california-adventure/boardwalk-pizza-pasta/
California Adventure,Paradise Gardens,Paradise Garden Grill,quick service,none,no,yes,$,lunch;dinner,Mexican,,16032481,https://disneyland.disney.go.com/dining/disney-california-adventure/paradise-garden-grill/
California Adventure,Paradise Gardens,Bayside Brews,snack,none,no,yes,$,snacks,American,,16032494,https://disneyland.disney.go.com/dining/disney-california-adventure/bayside-brews/
California Adventure,Paradise Gardens,Corn Dog Castle,snack,none,no,yes,$,snacks,American,,354207,https://disneyland.disney.go.com/dining/disney-california-adventure/corn-dog-castle/
California Adventure,Paradise Gardens,Oogie Boogie Bash Dessert Party,event,required,no,no,$$$$,,,Separate-ticket party only; Package or event at Performance Corridor Events,18970388,https://disneyland.disney.go.com/dining/disney-california-adventure/oogie-boogie-bash-dessert-party/
California Adventure,Paradise Gardens,World of Color Dessert Party,event,required,no,no,$$$$,,,Package or event at Paradise Gardens Park Events,18090211,https://disneyland.disney.go.com/dining/disney-california-adventure/world-of-color-dessert-party/
California Adventure,Paradise Gardens,Lunar New Year Marketplaces,festival,none,no,no,$,,Asian,Closed on 2026-10-26; Seasonal festival only,18606212,https://disneyland.disney.go.com/dining/disney-california-adventure/lunar-new-year-food-marketplaces/
California Adventure,Pixar Pier,Lamplight Lounge,table service,recommended,yes,no,$$,breakfast;lunch;dinner,American;Californian;Healthy Selections;Vegetarian,,19013078,https://disneyland.disney.go.com/dining/disney-california-adventure/lamplight-lounge/
California Adventure,Pixar Pier,Lamplight Lounge - Boardwalk Dining,table service,recommended,yes,no,$$,lunch;dinner,Vegetarian;Healthy Selections;Californian;American,,19629820,https://disneyland.disney.go.com/dining/disney-california-adventure/lamplight-lounge-boardwalk-dining/
California Adventure,Pixar Pier,Adorable Snowman Frosted Treats,snack,none,no,yes,$,snacks,American,,354135,https://disneyland.disney.go.com/dining/disney-california-adventure/adorable-snowman-frosted-treats/
California Adventure,Pixar Pier,Angry Dogs,snack,none,no,no,$,snacks,American,,354396,https://disneyland.disney.go.com/dining/disney-california-adventure/angry-dogs/
California Adventure,Pixar Pier,Jack-Jack Cookie Num Nums,snack,none,no,no,$,snacks,American,,19028067,https://disneyland.disney.go.com/dining/disney-california-adventure/jack-jack-cookie-num-nums/
California Adventure,Pixar Pier,Poultry Palace,snack,none,no,no,$,snacks,American,,354405,https://disneyland.disney.go.com/dining/disney-california-adventure/poultry-palace/
California Adventure,Pixar Pier,Señor Buzz Churros,snack,none,no,no,$,snacks,American,,354171,https://disneyland.disney.go.com/dining/disney-california-adventure/senor-buzz-churros/
`);
