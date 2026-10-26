// Park Day Planner dataset: closures_by_week. Edit the CSV between the backticks (keep its first line);
// update "pulled", "until" and "review" when you refresh it. See UPDATING.md.
PDP_DATASET({
  id: "closures_by_week",
  title: "Ride closures by week",
  about: "Share of tracked rides closed all day in each week of the year, and which rides.",
  source: "Queue-Times (queue-times.com) per-attraction history, 2023-2025",
  url: "https://queue-times.com/parks/16/stats",
  license: "",
  pulled: "2026-10-23",
  until: "",
  review: "2027-10-25",
  refresh: "Once a year",
  day_note: "",
  columns: { week: "week!", week_label: "text!", disneyland: "num", california_adventure: "num", disneyland_rides: "text", california_adventure_rides: "text" }
}, `week,week_label,disneyland,california_adventure,disneyland_rides,california_adventure_rides
1,Jan 1–7,0.0,0.0,,
2,Jan 8–14,0.0,0.3,,
3,Jan 15–21,0.3,1.2,Indiana Jones Adventure,Grizzly River Run
4,Jan 22–28,0.5,1.0,Indiana Jones Adventure,Grizzly River Run
5,Jan 29–Feb 4,0.7,1.3,Indiana Jones Adventure; it's a small world,Grizzly River Run
6,Feb 5–11,0.7,1.0,Indiana Jones Adventure; it's a small world,Grizzly River Run
7,Feb 12–18,0.7,1.3,Indiana Jones Adventure; it's a small world,Grizzly River Run; Silly Symphony Swings
8,Feb 19–25,0.7,1.3,Indiana Jones Adventure; it's a small world,Grizzly River Run; Silly Symphony Swings
9,Feb 26–Mar 4,0.6,1.0,Indiana Jones Adventure; it's a small world,Grizzly River Run; Silly Symphony Swings
10,Mar 5–11,0.7,0.9,Indiana Jones Adventure; it's a small world,Grizzly River Run; Silly Symphony Swings
11,Mar 12–18,0.3,0.3,it's a small world,Silly Symphony Swings
12,Mar 19–25,0.5,0.3,it's a small world,Silly Symphony Swings
13,Mar 26–Apr 1,0.7,0.3,Indiana Jones Adventure; it's a small world,Silly Symphony Swings
14,Apr 2–8,0.7,0.3,Indiana Jones Adventure; it's a small world,Silly Symphony Swings
15,Apr 9–15,0.7,0.3,Indiana Jones Adventure; it's a small world,Silly Symphony Swings
16,Apr 16–22,0.5,0.3,it's a small world,Silly Symphony Swings
17,Apr 23–29,0.7,0.4,Matterhorn Bobsleds; it's a small world,Silly Symphony Swings
18,Apr 30–May 6,0.8,0.6,Matterhorn Bobsleds; it's a small world,Silly Symphony Swings
19,May 7–13,1.0,0.0,Matterhorn Bobsleds; Winnie the Pooh,
20,May 14–20,1.0,0.0,Matterhorn Bobsleds; Winnie the Pooh,
21,May 21–27,1.1,0.0,Matterhorn Bobsleds; Winnie the Pooh,
22,May 28–Jun 3,1.0,0.0,Matterhorn Bobsleds; Chip 'n' Dale's GADGETcoaster; Winnie the Pooh,
23,Jun 4–10,0.9,0.0,Matterhorn Bobsleds; Winnie the Pooh,
24,Jun 11–17,1.0,0.0,Matterhorn Bobsleds; Peter Pan's Flight; Winnie the Pooh,
25,Jun 18–24,1.0,0.0,Matterhorn Bobsleds; Peter Pan's Flight; Winnie the Pooh,
26,Jun 25–Jul 1,0.7,0.0,Matterhorn Bobsleds; Winnie the Pooh,
27,Jul 2–8,0.8,0.0,Matterhorn Bobsleds; Winnie the Pooh,
28,Jul 9–15,1.3,0.0,Matterhorn Bobsleds; Star Tours; Alice in Wonderland; Winnie the Pooh,
29,Jul 16–22,0.9,0.0,Star Tours; Winnie the Pooh,
30,Jul 23–29,0.7,0.3,Star Tours; Winnie the Pooh,Toy Story Midway Mania!
31,Jul 30–Aug 5,1.0,0.5,Star Tours; Mr. Toad's Wild Ride; Winnie the Pooh,Toy Story Midway Mania!
32,Aug 6–12,1.0,0.5,Star Tours; Winnie the Pooh,Toy Story Midway Mania!
33,Aug 13–19,1.3,0.0,Space Mountain; Star Tours; Winnie the Pooh,
34,Aug 20–26,1.4,0.5,Space Mountain; Haunted Mansion; Star Tours,Radiator Springs Racers
35,Aug 27–Sep 2,0.9,0.3,Haunted Mansion,Radiator Springs Racers
36,Sep 3–9,0.1,0.7,,Radiator Springs Racers; Golden Zephyr
37,Sep 10–16,0.3,0.7,Big Thunder Mountain,Radiator Springs Racers; Golden Zephyr
38,Sep 17–23,0.5,0.5,Big Thunder Mountain,Golden Zephyr
39,Sep 24–30,1.2,0.1,Space Mountain; Big Thunder Mountain; it's a small world,
40,Oct 1–7,1.0,0.2,Space Mountain; Big Thunder Mountain; it's a small world,
41,Oct 8–14,1.0,0.0,Space Mountain; Big Thunder Mountain; it's a small world,
42,Oct 15–21,1.0,0.0,Space Mountain; Big Thunder Mountain; it's a small world,
43,Oct 22–28,0.7,0.0,Big Thunder Mountain; it's a small world,
44,Oct 29–Nov 4,1.0,0.0,it's a small world,
45,Nov 5–11,0.4,0.1,it's a small world,
46,Nov 12–18,0.0,0.2,,
47,Nov 19–25,0.1,0.0,,
48,Nov 26–Dec 2,0.3,0.0,Big Thunder Mountain,
49,Dec 3–9,0.2,0.0,,
50,Dec 10–16,0.0,0.0,,
51,Dec 17–23,0.0,0.0,,
52,Dec 24–31,0.0,0.0,,
`);
