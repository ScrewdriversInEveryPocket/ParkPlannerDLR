// Park Day Planner dataset: crowd_by_week. Edit the CSV between the backticks (keep its first line);
// update "pulled", "until" and "review" when you refresh it. See UPDATING.md.
PDP_DATASET({
  id: "crowd_by_week",
  title: "Crowd rating by week",
  about: "0-100 crowd rank for each week of the year (lower is quieter).",
  source: "Queue-Times (queue-times.com) daily crowd calendar, 2015-2019 and 2023-Oct 23, 2026",
  url: "https://queue-times.com/parks/16/calendar",
  license: "",
  pulled: "2026-10-24",
  until: "",
  review: "2027-10-25",
  refresh: "Once a year",
  day_note: "",
  columns: { week: "week!", week_label: "text!", disneyland: "num", california_adventure: "num" }
}, `week,week_label,disneyland,california_adventure
1,Jan 1–7,64.3,75
2,Jan 8–14,45.6,56.2
3,Jan 15–21,41.9,55.1
4,Jan 22–28,36.4,43.3
5,Jan 29–Feb 4,34.2,43.3
6,Feb 5–11,41.3,57
7,Feb 12–18,55.2,70.4
8,Feb 19–25,57.5,77.5
9,Feb 26–Mar 4,50.1,60.6
10,Mar 5–11,46.4,60.3
11,Mar 12–18,66.7,80.4
12,Mar 19–25,62.3,80
13,Mar 26–Apr 1,68.8,85.8
14,Apr 2–8,67.3,84.3
15,Apr 9–15,47.8,63.6
16,Apr 16–22,48.4,64.5
17,Apr 23–29,61,71.3
18,Apr 30–May 6,54.3,66.9
19,May 7–13,54.6,61.1
20,May 14–20,59.2,65.7
21,May 21–27,54.9,67.9
22,May 28–Jun 3,55.6,65.3
23,Jun 4–10,52.9,67.1
24,Jun 11–17,45.9,56.8
25,Jun 18–24,40,58.8
26,Jun 25–Jul 1,32.7,51.6
27,Jul 2–8,32,51.8
28,Jul 9–15,34,51.8
29,Jul 16–22,47.3,62.9
30,Jul 23–29,48.3,64.6
31,Jul 30–Aug 5,47,62.2
32,Aug 6–12,46.3,59.3
33,Aug 13–19,33.7,45.4
34,Aug 20–26,32.9,44.3
35,Aug 27–Sep 2,20.5,34.2
36,Sep 3–9,20,31.9
37,Sep 10–16,30.4,38.2
38,Sep 17–23,42.2,49.5
39,Sep 24–30,40.3,49.2
40,Oct 1–7,50.2,61.9
41,Oct 8–14,69.2,80.1
42,Oct 15–21,54.6,61.2
43,Oct 22–28,45.2,47.4
44,Oct 29–Nov 4,29.1,32.8
45,Nov 5–11,44.9,48
46,Nov 12–18,42.2,47
47,Nov 19–25,52.2,61.7
48,Nov 26–Dec 2,38.1,48.5
49,Dec 3–9,37.8,44.6
50,Dec 10–16,35.4,42.5
51,Dec 17–23,43.8,49.1
52,Dec 24–31,73.5,81
`);
