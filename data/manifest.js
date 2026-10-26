// Park Day Planner: the list of bundled datasets, in load order. index.html and sw.js both read it,
// so a new dataset only needs its file in data/ and a line here. See UPDATING.md.
self.PDP_FILES = [
  'ride_profiles',
  'waits_by_hour',
  'ride_closures_by_month',
  'closures_by_week',
  'refurbs',
  'park_hours_published',
  'park_hours_2025',
  'hours_by_week',
  'events',
  'holidays',
  'wait_by_date',
  'crowd_by_week',
  'crowd_by_weekday',
  'crowd_by_month',
  'ticket_tiers',
  'multi_day_prices',
  'weather_by_week',
  'weather_by_month',
  'weather_by_hour',
  'sun_by_week',
  'park_places',
  'dining',
  'lands',
  'gates',
  'security_waits',
  'lightning_lane',
  'disney_showtimes',
  'show_estimates'
];
// each data file calls this with its header and its CSV text; shim.js checks them once all are in
self.PDP_DATA = {}; self.PDP_META = {};
self.PDP_DATASET = (meta, csv) => { self.PDP_META[meta.id] = meta; self.PDP_DATA[meta.id] = csv; };
// a page loads each file in order; the service worker only needs the list
if (typeof document !== 'undefined') self.PDP_FILES.forEach(f => document.write('<script src="data/' + f + '.js"></' + 'script>'));
