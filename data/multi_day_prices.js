// Park Day Planner dataset: multi_day_prices. Edit the CSV between the backticks (keep its first line);
// update "pulled", "until" and "review" when you refresh it. See UPDATING.md.
PDP_DATASET({
  id: "multi_day_prices",
  title: "Multi-day ticket prices",
  about: "Per-adult price of 2 to 5 day 1-park tickets (same on any dates).",
  source: "Disney, per Disney Tourist Blog's report of the October 2026 price change",
  url: "https://disneyland.disney.go.com/",
  license: "",
  pulled: "2026-10-23",
  until: "",
  review: "2027-10-01",
  refresh: "After each price change (usually in October)",
  day_note: "",
  columns: { days: "int!", price_usd: "num!" }
}, `days,price_usd
2,335
3,425
4,480
5,520
`);
