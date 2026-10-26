// Park Day Planner dataset: hours_by_week. Edit the CSV between the backticks (keep its first line);
// update "pulled", "until" and "review" when you refresh it. See UPDATING.md.
PDP_DATASET({
  id: "hours_by_week",
  title: "Park hours by week",
  about: "Average hours open in each week of the year.",
  source: "Disney's 2025 park schedule",
  url: "https://disneyland.disney.go.com/",
  license: "",
  pulled: "2026-10-23",
  until: "",
  review: "2027-02-01",
  refresh: "Once a year, from the last full year of hours",
  day_note: "",
  columns: { week: "week!", week_label: "text!", disneyland: "num!", california_adventure: "num!" }
}, `week,week_label,disneyland,california_adventure
1,Jan 1–7,15.6,13.9
2,Jan 8–14,14.9,13.4
3,Jan 15–21,14.6,13.6
4,Jan 22–28,14.3,13.7
5,Jan 29–Feb 4,14.0,13.4
6,Feb 5–11,13.7,13.7
7,Feb 12–18,15.1,13.9
8,Feb 19–25,15.4,13.7
9,Feb 26–Mar 4,14.6,13.6
10,Mar 5–11,14.6,13.6
11,Mar 12–18,15.7,13.1
12,Mar 19–25,16.0,14.0
13,Mar 26–Apr 1,15.4,13.7
14,Apr 2–8,14.6,13.6
15,Apr 9–15,15.1,13.9
16,Apr 16–22,15.1,13.9
17,Apr 23–29,14.3,13.7
18,Apr 30–May 6,13.7,13.7
19,May 7–13,15.4,13.3
20,May 14–20,15.6,13.9
21,May 21–27,15.6,13.6
22,May 28–Jun 3,15.7,13.6
23,Jun 4–10,15.7,13.6
24,Jun 11–17,15.4,13.7
25,Jun 18–24,15.4,14.0
26,Jun 25–Jul 1,16.0,14.0
27,Jul 2–8,16.0,14.0
28,Jul 9–15,16.0,14.0
29,Jul 16–22,16.0,14.0
30,Jul 23–29,16.0,14.0
31,Jul 30–Aug 5,16.0,13.9
32,Aug 6–12,15.7,14.0
33,Aug 13–19,15.7,12.9
34,Aug 20–26,16.0,12.3
35,Aug 27–Sep 2,15.6,12.1
36,Sep 3–9,14.9,12.4
37,Sep 10–16,15.0,11.7
38,Sep 17–23,15.0,11.7
39,Sep 24–30,15.0,11.7
40,Oct 1–7,15.0,11.7
41,Oct 8–14,15.0,11.7
42,Oct 15–21,15.0,11.7
43,Oct 22–28,14.7,11.7
44,Oct 29–Nov 4,14.6,12.6
45,Nov 5–11,14.4,13.0
46,Nov 12–18,15.0,13.3
47,Nov 19–25,15.7,13.7
48,Nov 26–Dec 2,15.7,13.7
49,Dec 3–9,15.6,13.6
50,Dec 10–16,15.3,13.3
51,Dec 17–23,15.7,13.7
52,Dec 24–31,16.2,14.4
`);
