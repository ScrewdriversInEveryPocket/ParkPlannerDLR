// Park Day Planner dataset: park_places. Edit the CSV between the backticks (keep its first line);
// update "pulled", "until" and "review" when you refresh it. See UPDATING.md.
PDP_DATASET({
  id: "park_places",
  title: "Ride, food and show locations",
  about: "Map points for rides (with queue entrance and exit), restaurants and shows, used for walking times. Restaurant points are Disney's own map pins (osm column disney:<id>); rides and shows are from OpenStreetMap.",
  source: "Rides and shows © OpenStreetMap contributors (openstreetmap.org), extracted Oct 25, 2026; restaurants from Disney's dining list map pins, read Oct 26, 2026; ride doors are our best guess from mapped building doors; Royal Hall (princess meet) is our own estimate beside the Royal Theatre, since it isn't mapped separately",
  url: "https://www.openstreetmap.org/copyright",
  license: "Open Database License (ODbL) 1.0. Credit: © OpenStreetMap contributors",
  pulled: "2026-10-25",
  until: "",
  review: "2027-10-25",
  refresh: "Once a year, and when a ride or restaurant opens or moves",
  day_note: "",
  columns: { park: "park!", kind: "ride|food|show", name: "text!", lat: "lat!", lon: "lon!", osm: "text", ent_lat: "lat", ent_lon: "lon", exit_lat: "lat", exit_lon: "lon" }
}, `park,kind,name,lat,lon,osm,ent_lat,ent_lon,exit_lat,exit_lon
Disneyland,ride,Rise of the Resistance,33.814395,-117.922717,w607524502,33.813751,-117.923316,33.813751,-117.923316
Disneyland,ride,Smugglers Run,33.815209,-117.921378,w515673763,33.814872,-117.921390,33.814869,-117.921531
Disneyland,ride,Indiana Jones Adventure,33.810296,-117.92117,w824031782,33.811026,-117.920488,33.811026,-117.920488
Disneyland,ride,Matterhorn Bobsleds,33.813074,-117.917846,w107280556,33.813400,-117.917801,33.813400,-117.917801
Disneyland,ride,Tiana's Bayou Adventure,33.811918,-117.922839,w361504826,33.812253,-117.922833,33.812201,-117.922913
Disneyland,ride,Space Mountain,33.810969,-117.917501,w122090695,33.811214,-117.917300,33.811214,-117.917300
Disneyland,ride,Haunted Mansion,33.81149,-117.92256,w178254960,33.811694,-117.922052,33.811866,-117.922182
Disneyland,ride,Roger Rabbit's Car Toon Spin,33.815308,-117.918022,w133337113,33.815207,-117.918119,33.815355,-117.918208
Disneyland,ride,Big Thunder Mountain,33.812669,-117.920359,w266074156,33.812588,-117.920285,33.812588,-117.920285
Disneyland,ride,Mickey & Minnie's Runaway Railway,33.815946,-117.918733,w868763698,33.815553,-117.918453,33.815553,-117.918453
Disneyland,ride,Peter Pan's Flight,33.8131,-117.918832,n632049634,33.813149,-117.918867,33.813319,-117.918790
Disneyland,ride,Pirates of the Caribbean,33.810792,-117.92152,w824031784,33.811299,-117.920832,33.811299,-117.920832
Disneyland,ride,Jungle Cruise,33.811405,-117.920046,w194261873,33.811434,-117.920121,33.811402,-117.920139
Disneyland,ride,Finding Nemo Submarine Voyage,33.812831,-117.917176,n632049645,33.812737,-117.916906,33.812737,-117.916906
Disneyland,ride,Autopia,33.81265,-117.916526,w168833464,33.812558,-117.916465,33.812558,-117.916465
Disneyland,ride,Star Tours,33.811693,-117.917706,w169215396,33.812015,-117.918025,33.811913,-117.917353
Disneyland,ride,Buzz Lightyear Astro Blasters,33.812393,-117.917716,w363559932,33.812183,-117.917959,33.812193,-117.917637
Disneyland,ride,it's a small world,33.815133,-117.917592,w499783300,33.814705,-117.917694,33.814705,-117.917694
Disneyland,ride,Alice in Wonderland,33.813161,-117.918366,n1444178750,33.813161,-117.918286,33.813174,-117.918312
Disneyland,ride,Snow White's Enchanted Wish,33.813089,-117.919103,n632049636,33.813149,-117.918867,33.813319,-117.918790
Disneyland,ride,Mr. Toad's Wild Ride,33.813311,-117.91872,n632049635,33.813350,-117.918754,33.813319,-117.918790
Disneyland,ride,Dumbo the Flying Elephant,33.813668,-117.918904,r7752012,33.813608,-117.918724,33.813608,-117.918724
Disneyland,ride,Chip 'n' Dale's GADGETcoaster,33.815222,-117.919491,w107280551,33.815213,-117.919440,33.815234,-117.919534
Disneyland,ride,Winnie the Pooh,33.81272,-117.923199,w122744025,33.812537,-117.922966,33.812405,-117.923278
California Adventure,ride,Radiator Springs Racers,33.804244,-117.919065,w753161662,33.804703,-117.918777,33.804703,-117.918777
California Adventure,ride,Guardians – Mission: BREAKOUT!,33.806625,-117.916905,w313039853,33.806839,-117.917154,33.806839,-117.917154
California Adventure,ride,WEB SLINGERS,33.806896,-117.918685,w721810397,33.806628,-117.918417,33.806584,-117.918608
California Adventure,ride,Incredicoaster,33.804563,-117.9205,w194882116,33.804538,-117.920588,33.804538,-117.920588
California Adventure,ride,Soarin',33.808422,-117.920019,w312369808,33.808257,-117.920000,33.808257,-117.920000
California Adventure,ride,Toy Story Midway Mania!,33.804484,-117.921779,w113878103,33.804633,-117.921950,33.804559,-117.921408
California Adventure,ride,Grizzly River Run,33.807211,-117.920202,n3167856921,33.807317,-117.920440,33.807317,-117.920440
California Adventure,ride,"Monsters, Inc.",33.80849,-117.917178,w188171538,33.808346,-117.917429,33.808399,-117.917134
California Adventure,ride,The Little Mermaid,33.806337,-117.921469,w337426362,33.806188,-117.921114,33.806213,-117.921200
California Adventure,ride,Goofy's Sky School,33.806435,-117.922868,w108865231,33.806337,-117.922850,33.806337,-117.922850
California Adventure,ride,Luigi's Rollickin' Roadsters,33.805673,-117.918122,w755354603,33.805557,-117.918472,33.805534,-117.918345
California Adventure,ride,Mater's Junkyard Jamboree,33.806467,-117.919137,w336617708,33.806301,-117.919036,33.806301,-117.919036
California Adventure,ride,Pixar Pal-A-Round,33.805135,-117.922188,w123138989,33.805159,-117.922247,33.805159,-117.922247
California Adventure,ride,Inside Out Emotional Whirlwind,33.805235,-117.922878,w690246998,33.805155,-117.922835,33.805155,-117.922835
California Adventure,ride,Golden Zephyr,33.805962,-117.922268,w342771469,33.806049,-117.922276,33.806049,-117.922276
California Adventure,ride,Silly Symphony Swings,33.805656,-117.922668,w364262516,33.805561,-117.922870,33.805561,-117.922870
California Adventure,ride,Jumpin' Jellyfish,33.805997,-117.922689,n1149646454,33.806163,-117.922507,33.806163,-117.922507
California Adventure,ride,Jessie's Critter Carousel,33.804539,-117.921177,w120639750,33.804632,-117.921159,33.804632,-117.921159
California Adventure,show,Turtle Talk with Crush,33.807286,-117.917839,n1149646686,,,,
California Adventure,show,The Sanctum,33.806283,-117.918055,n1149646783,,,,
California Adventure,show,Hollywood Backlot Stage,33.807786,-117.917258,n1231986181,,,,
California Adventure,show,Animation Academy,33.807431,-117.917297,n1232033931,,,,
California Adventure,show,Ahwahnee Camp Circle,33.806726,-117.921401,n1235708498,,,,
Disneyland,show,Pixie Hollow,33.812503,-117.918284,n1424937325,,,,
California Adventure,show,Character Close-Up with Anna & Elsa,33.807289,-117.917327,n2353146260,,,,
California Adventure,show,Five & Dime,33.80769,-117.919087,n3438492155,,,,
California Adventure,show,Guardians of the Galaxy: Awesome Dance Off!,33.806999,-117.917052,n5213383044,,,,
California Adventure,show,Pixar Promenade Band Shell,33.80489,-117.922443,n5655362203,,,,
California Adventure,show,Hyperion Theater,33.807674,-117.916615,w49824967,,,,
Disneyland,show,French Market Stage,33.811325,-117.9217,w108428278,,,,
California Adventure,show,Paradise Garden Bandstand,33.806075,-117.923274,w120076534,,,,
Disneyland,show,Fantasyland Theatre,33.814469,-117.919332,w131936892,,,,
Disneyland,show,Main Street Opera House,33.810263,-117.918337,w132551289,,,,
California Adventure,show,Disney Theater,33.807389,-117.918353,w144283156,,,,
Disneyland,show,Mickey's House,33.815544,-117.919365,w186539115,,,,
Disneyland,show,Tomorrowland Terrace Stage,33.812373,-117.917003,w288608889,,,,
Disneyland,show,Royal Theatre,33.812442,-117.919432,w359403613,,,,
Disneyland,show,The Golden Horseshoe,33.811941,-117.920191,w616075967,,,,
Disneyland,show,Walt Disney's Enchanted Tiki Room,33.811656,-117.919579,w653252856,,,,
Disneyland,ride,Meet Disney Princesses at Royal Hall,33.81255,-117.91962,,,,,
Disneyland,ride,Mickey's House and Meet Mickey Mouse,33.815544,-117.919365,w186539115,,,,
Disneyland,food,Bengal Barbecue,33.811555,-117.920299,disney:368519,,,,
Disneyland,food,South Seas Traders,33.811607,-117.920095,disney:426608,,,,
Disneyland,food,The Tropical Hideaway,33.81147,-117.91955,disney:19197204,,,,
Disneyland,food,Tiki Juice Bar,33.8118490285,-117.9195771195,disney:354516,,,,
Disneyland,food,Hungry Bear Barbecue Jamboree,33.812554,-117.922435,disney:354303,,,,
Disneyland,food,Fruit Carts,33.81239274,-117.9220131,disney:18516137,,,,
Disneyland,food,Lemonade Carts,33.81239074,-117.922499,disney:18516133,,,,
Disneyland,food,Red Rose Taverne,33.8134853951,-117.9194486939,disney:18674905,,,,
Disneyland,food,Edelweiss Snacks,33.8137108075,-117.9177229106,disney:369431,,,,
Disneyland,food,Maurice's Treats,33.8124425633,-117.9193067551,disney:17301557,,,,
Disneyland,food,Pretzel Carts,33.8141300305,-117.9180562945,disney:18516135,,,,
Disneyland,food,Troubadour Tavern,33.8145219838,-117.9187180102,disney:354228,,,,
Disneyland,food,Turkey Leg Carts,33.81371081,-117.9177229,disney:18516131,,,,
Disneyland,food,Rancho del Zocalo Restaurante,33.812463049,-117.9197774827,disney:354438,,,,
Disneyland,food,Stage Door Café,33.811889,-117.9203,disney:354465,,,,
Disneyland,food,The Golden Horseshoe,33.8120514864,-117.9203117258,disney:354498,,,,
Disneyland,food,River Belle Terrace,33.8116150928,-117.9205917872,disney:354450,,,,
Disneyland,food,Docking Bay 7 Food and Cargo,33.814742,-117.921432,disney:19268345,,,,
Disneyland,food,Ronto Roasters,33.814424,-117.921484,disney:19268333,,,,
Disneyland,food,Kat Saka's Kettle,33.814495,-117.921639,disney:19268342,,,,
Disneyland,food,Milk Stand,33.814428,-117.92069,disney:19267431,,,,
Disneyland,food,Oga's Cantina at the Disneyland Resort,33.814717,-117.920943,disney:19268344,,,,
Disneyland,food,Jolly Holiday Bakery Cafe,33.8117051187,-117.9193308949,disney:16363584,,,,
Disneyland,food,Little Red Wagon,33.8114840141,-117.9186756938,disney:354348,,,,
Disneyland,food,Market House,33.81089,-117.918875,disney:17394022,,,,
Disneyland,food,Refreshment Corner,33.8114464994,-117.9190483181,disney:354444,,,,
Disneyland,food,Carnation Café,33.81106,-117.919082,disney:354129,,,,
Disneyland,food,Plaza Inn,33.8117514713,-117.918622265,disney:354414,,,,
Disneyland,food,Gibson Girl Ice Cream Parlor,33.8111392429,-117.9190407415,disney:354255,,,,
Disneyland,food,Harbour Galley,33.8120188925,-117.921936614,disney:354273,,,,
Disneyland,food,Royal Street Veranda,33.8112279116,-117.9209163877,disney:354456,,,,
Disneyland,food,Tiana’s Palace,33.811266,-117.921516,disney:411936931,,,,
Disneyland,food,Blue Bayou Restaurant,33.811049,-117.921126,disney:354099,,,,
Disneyland,food,Cafe Orleans,33.811205,-117.921262,disney:354117,,,,
Disneyland,food,Mint Julep Bar,33.811176,-117.921656,disney:354369,,,,
Disneyland,food,Alien Pizza Planet,33.8117081571,-117.9168865347,disney:354441,,,,
Disneyland,food,Galactic Grill,33.812449,-117.917296,disney:18246297,,,,
Disneyland,food,Café Daisy,33.81547,-117.918682,disney:411845026,,,,
Disneyland,food,Good Boy! Grocers,33.81533,-117.918686,disney:411845225,,,,
California Adventure,food,Pym Test Kitchen,33.806726,-117.917696,disney:19530853,,,,
California Adventure,food,Shawarma Palace,33.80653,-117.918023,disney:19624439,,,,
California Adventure,food,Popcorn Carts,33.807739,-117.918627,disney:18516125,,,,
California Adventure,food,Terran Treats,33.807108,-117.916978,disney:19624444,,,,
California Adventure,food,Pym Tasting Lab,33.806723,-117.917516,disney:19624438,,,,
California Adventure,food,"Fiddler, Fifer & Practical Cafe",33.8078250918,-117.91936303,disney:16513886,,,,
California Adventure,food,Carthay Circle Lounge,33.807494,-117.919021,disney:16588263,,,,
California Adventure,food,Carthay Circle Restaurant,33.807494,-117.919021,disney:16515009,,,,
California Adventure,food,Clarabelle's Hand-Scooped Ice Cream,33.807958,-117.9191776264,disney:16513928,,,,
California Adventure,food,Flo's V8 Cafe,33.8055498861,-117.9189880233,disney:16486843,,,,
California Adventure,food,Cozy Cone Motel,33.8059658542,-117.9186623791,disney:16514114,,,,
California Adventure,food,Fillmore's Taste-In,33.8061842526,-117.9194517521,disney:16505450,,,,
California Adventure,food,Smokejumpers Grill,33.8079285397,-117.9196943785,disney:354483,,,,
California Adventure,food,Churro Carts,33.807677,-117.919496,disney:18516129,,,,
California Adventure,food,Award Wieners,33.807735,-117.918127,disney:354084,,,,
California Adventure,food,Fairfax Market,33.8077209975,-117.9174190847,disney:424962,,,,
California Adventure,food,Schmoozies!,33.807759,-117.917651,disney:354462,,,,
California Adventure,food,Studio Catering Co.,33.807889,-117.916958,disney:354477,,,,
California Adventure,food,Hollywood Lounge,33.808119,-117.917074,disney:18409951,,,,
California Adventure,food,Aunt Cass Café,33.8058566014,-117.9200660233,disney:411972544,,,,
California Adventure,food,Cappuccino Cart,33.806019,-117.920722,disney:354123,,,,
California Adventure,food,Cocina Cucamonga Mexican Grill,33.805545,-117.920195,disney:354195,,,,
California Adventure,food,Lucky Fortune Cookery,33.8057921835,-117.9198476908,disney:368932,,,,
California Adventure,food,Magic Key Terrace - Magic Key Holder Dining,33.806621,-117.919866,disney:15527906,,,,
California Adventure,food,Wine Country Trattoria,33.806478,-117.919877,disney:354555,,,,
California Adventure,food,Boudin Bread Cart,33.805888,-117.919904,disney:17302464,,,,
California Adventure,food,Ghirardelli® Soda Fountain and Chocolate Shop,33.80599,-117.919614,disney:16514168,,,,
California Adventure,food,Port of San Fransokyo Cervecería,33.805683,-117.920311,disney:411947320,,,,
California Adventure,food,Rita's Turbine Blenders,33.805794,-117.919981,disney:354447,,,,
California Adventure,food,Mendocino Terrace,33.806546,-117.919842,disney:368928,,,,
California Adventure,food,Sonoma Terrace,33.8063931592,-117.9203394055,disney:368880,,,,
California Adventure,food,Boardwalk Pizza & Pasta,33.8057925204,-117.9232147336,disney:16032493,,,,
California Adventure,food,Paradise Garden Grill,33.8061043985,-117.9233857988,disney:16032481,,,,
California Adventure,food,Bayside Brews,33.8058437811,-117.9228553176,disney:16032494,,,,
California Adventure,food,Corn Dog Castle,33.8063363272,-117.9224435985,disney:354207,,,,
California Adventure,food,Lamplight Lounge,33.8053994053,-117.9209410699,disney:19013078,,,,
California Adventure,food,Lamplight Lounge - Boardwalk Dining,33.8053994053,-117.9209410699,disney:19629820,,,,
California Adventure,food,Adorable Snowman Frosted Treats,33.8051566775,-117.9204788804,disney:354135,,,,
California Adventure,food,Angry Dogs,33.804911,-117.922135,disney:354396,,,,
California Adventure,food,Jack-Jack Cookie Num Nums,33.804492,-117.92088,disney:19028067,,,,
California Adventure,food,Poultry Palace,33.8047427823,-117.9214174892,disney:354405,,,,
California Adventure,food,Señor Buzz Churros,33.804736,-117.921597,disney:354171,,,,
`);
