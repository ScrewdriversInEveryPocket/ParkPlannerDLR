// Park Day Planner dataset: sun_by_week. Edit the CSV between the backticks (keep its first line);
// update "pulled", "until" and "review" when you refresh it. See UPDATING.md.
PDP_DATASET({
  id: "sun_by_week",
  title: "Sunrise and sunset",
  about: "Sunrise and sunset by week (decimal hours).",
  source: "Open-Meteo (open-meteo.com), 2025 values",
  url: "https://open-meteo.com/",
  license: "",
  pulled: "2026-10-23",
  until: "",
  review: "",
  refresh: "Not needed; sunset barely changes year to year",
  day_note: "",
  columns: { week: "week!", week_label: "text!", sunset_hour: "hour!", sunrise_hour: "hour!" }
}, `week,week_label,sunset_hour,sunrise_hour
1,Jan 1–7,17.938,7.945
2,Jan 8–14,18.033,7.943
3,Jan 15–21,18.150,7.917
4,Jan 22–28,18.260,7.862
5,Jan 29–Feb 4,18.367,7.793
6,Feb 5–11,18.483,7.698
7,Feb 12–18,18.595,7.583
8,Feb 19–25,18.700,7.460
9,Feb 26–Mar 4,18.798,7.319
10,Mar 5–11,18.895,7.171
11,Mar 12–18,18.988,7.017
12,Mar 19–25,19.076,6.857
13,Mar 26–Apr 1,19.164,6.700
14,Apr 2–8,19.252,6.545
15,Apr 9–15,19.340,6.393
16,Apr 16–22,19.429,6.252
17,Apr 23–29,19.519,6.117
18,Apr 30–May 6,19.610,6.000
19,May 7–13,19.698,5.893
20,May 14–20,19.786,5.805
21,May 21–27,19.867,5.738
22,May 28–Jun 3,19.943,5.693
23,Jun 4–10,20.005,5.669
24,Jun 11–17,20.055,5.667
25,Jun 18–24,20.088,5.681
26,Jun 25–Jul 1,20.100,5.717
27,Jul 2–8,20.093,5.769
28,Jul 9–15,20.060,5.831
29,Jul 16–22,20.005,5.905
30,Jul 23–29,19.933,5.983
31,Jul 30–Aug 5,19.838,6.064
32,Aug 6–12,19.733,6.150
33,Aug 13–19,19.600,6.233
34,Aug 20–26,19.462,6.317
35,Aug 27–Sep 2,19.312,6.395
36,Sep 3–9,19.160,6.479
37,Sep 10–16,18.998,6.555
38,Sep 17–23,18.833,6.636
39,Sep 24–30,18.674,6.717
40,Oct 1–7,18.514,6.802
41,Oct 8–14,18.360,6.890
42,Oct 15–21,18.221,6.981
43,Oct 22–28,18.083,7.079
44,Oct 29–Nov 4,17.969,7.183
45,Nov 5–11,17.874,7.283
46,Nov 12–18,17.793,7.400
47,Nov 19–25,17.738,7.502
48,Nov 26–Dec 2,17.707,7.610
49,Dec 3–9,17.702,7.710
50,Dec 10–16,17.724,7.795
51,Dec 17–23,17.771,7.862
52,Dec 24–31,17.840,7.919
`);
