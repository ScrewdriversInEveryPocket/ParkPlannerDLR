// DLR Planner: the planner's day: day context, closure and data notes, the About-the-data table, expected waits.
// Part of the app script. The js files load in the order of their script tags in index.html (listed in CLAUDE.md).
const DOW_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const weekOf = (m, d) => { if (m === 2 && d === 29) d = 28; const doy = Math.round((Date.UTC(2023, m - 1, d) - Date.UTC(2023, 0, 1)) / 864e5) + 1;
  return Math.min(52, Math.floor((doy - 1) / 7) + 1); };

// Live forecasts are only trusted this many days out; later dates use 10-year averages.
const FORECAST_DAYS = 10;
const daysUntil = (iso) => { const [y, m, d] = iso.split('-').map(Number); const n = new Date();
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())) / 864e5); };

function dayContext(iso, park, D) {
  const [Y, M, Dd] = iso.split('-').map(Number);
  const js = new Date(Date.UTC(Y, M - 1, Dd));
  const dow = js.getUTCDay(), wkN = weekOf(M, Dd), monName = MONTHS[M - 1];
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dow];
  // Disney's published hours for this exact date when we have them, else the matching 2025 day
  const pub = D.park_hours_published.find(r => r.date === iso && r.park === park);
  const hrs = D.park_hours_2025.filter(r => r.park === park);
  let an = pub || hrs.find(r => Number(r.week) === wkN && r.weekday === wd) || hrs.filter(r => r.weekday === wd && r.date.slice(5, 7) === pad2(M))[0] || hrs[0];
  const open = Number(an.open), close = Number(an.close);
  const wx = new Map(D.weather_by_hour.filter(r => Number(r.week) === wkN).map(r => [Number(r.hour), { feels: Number(r.feels_like_f), rain: Number(r.rain_chance_pct) }]));
  const wxd = Object.assign({}, D.weather_by_week.find(r => Number(r.week) === wkN) || {});
  const sun = D.sun_by_week.find(r => Number(r.week) === wkN) || {};
  const pk = park === 'Disneyland' ? 'disneyland' : 'california_adventure';
  const ww = D.wait_by_week.find(r => r.week === wkN) || {};
  const wm = D.wait_by_month.find(r => r.month === monName) || {};
  const weekFactor = ww[pk] && wm[pk] ? ww[pk] / wm[pk] : 1;
  // the busiest weeks (waits about 25% over the year's average) walk up to 15% slower
  const wAll = d3.mean(D.wait_by_week, r => r[pk]), walkBusy = ww[pk] && wAll ? 1 + 0.15 * Math.max(0, Math.min(1, (ww[pk] / wAll - 1) / 0.25)) : 1;
  const evs = D.events.filter(e => wkN >= Number(e.start_week) && wkN <= Number(e.end_week) && (e.park === 'Both' || e.park === park));
  const closedSet = new Set(D.ride_closures_by_month.filter(r => r.park === park && r.month === monName && Number(r.closed_pct) >= 50).map(r => r.ride));
  // announced refurbishments covering this date (blank end = no reopening date yet)
  const refurbs = D.refurbs.filter(r => r.park === park && iso >= r.start && (!r.end || iso <= r.end));
  refurbs.forEach(r => closedSet.add(r.ride));
  const rides = D.ride_profiles.filter(r => r.park === park).map(r => ({
    name: r.ride, park: r.park, land: r.land, expo: r.exposure, thrill: r.thrill || '', wet: r.wet === 'Yes', head: r.headliner === '1', rmin: Number(r.ride_minutes), avg: Number(r.avg_wait),
    h: Object.fromEntries(d3.range(7, 24).map(h => [h, r['h' + h] === '' ? null : Number(r['h' + h])])),
    mf: Number(r['m' + M]) || 1, df: Number(r[DOW_KEYS[dow]]) || 1,
    ll: r.lightning_lane || '', sr: r.single_rider === 'Yes', minH: Number(r.min_height_in) || 0,
    refurb: refurbs.some(x => x.ride === r.ride),
    // character meets: hours they run, where we know them (blank = whole park day)
    char: r.kind === 'Character meet', meetFrom: r.meet_from ? Number(r.meet_from) : null, meetTo: r.meet_to ? Number(r.meet_to) : null
  }));
  let fc = null; const fh = dash.data('forecast_hourly'), fd = dash.data('forecast_daily');
  const useFc = daysUntil(iso) <= FORECAST_DAYS;
  if (useFc && fh.status === 'ok' && fd.status === 'ok') {
    const dayRow = fd.data.find(r => r.date === iso);
    const hrs = fh.data.filter(r => r.date === iso);
    if (dayRow && hrs.length >= 12) {
      const heat = (t, r) => t < 80 ? t : Math.round(-42.379 + 2.04901523 * t +
        10.14333127 * r - 0.22475541 * t * r - 0.00683783 * t * t - 0.05481717 * r * r + 0.00122874 * t * t * r +
        0.00085282 * t * r * r - 0.00000199 * t * t * r * r);
      hrs.forEach(r => wx.set(r.hour, { feels: heat(r.temp_f, r.humidity), rain: r.rain_chance_pct }));
      fc = { conditions: dayRow.conditions, high: dayRow.high_f, low: dayRow.low_f };
      Object.assign(wxd, { avg_high_f: dayRow.high_f, feels_like_high_f: dayRow.feels_high_f, rain_chance_pct: dayRow.rain_chance_pct,
          hot_day_pct: dayRow.high_f >= 90 ? 100 : 0, chilly_night_pct: dayRow.low_f < 45 ? 100 : 0 });
    }
  }
  if (!fc) {
    const fa = dash.data('forecast_accu');
    const row = useFc && fa.status === 'ok' ? fa.data.find(r => r.date === iso) : null;
    if (row) {
      let baseMax = -Infinity; for (let h = 8; h <= 23; h++) { const v = wx.get(h); if (v) baseMax = Math.max(baseMax, v.feels); }
      const shift = isFinite(baseMax) ? Number(row.feels_high_f) - baseMax : 0;
      for (let h = 7; h <= 23; h++) { const v = wx.get(h); if (v) wx.set(h, { feels: Math.round(v.feels + shift), rain: Math.round(Number(row.rain_chance_pct) * 0.5) }); }
      fc = { conditions: row.conditions, high: Number(row.high_f), low: Number(row.low_f), src: 'AccuWeather' };
      Object.assign(wxd, { avg_high_f: Number(row.high_f), feels_like_high_f: Number(row.feels_high_f), rain_chance_pct: Number(row.rain_chance_pct),
          hot_day_pct: Number(row.high_f) >= 90 ? 100 : 0, chilly_night_pct: Number(row.low_f) < 45 ? 100 : 0 });
    }
  } else fc.src = (window.PDP_FC_SRC || 'Live');
  // how busy the day is against a typical one (1 = typical), from the ride wait factors
  const crowd = weekFactor * (d3.mean(rides, r => r.mf * r.df) || 1);
  return { crowd, iso, Y, M, Dd, dow, wkN, monName, open, close, analog: an.date, published: !!pub, hoursNote: pub ? pub.note : '', refurbs, wx, wxd,
    sunset: Number(sun.sunset_hour), weekFactor, walkBusy, evs, closedSet, rides, park, fc };
}
// Warning lines for closures: announced refurbishments first, then rides often closed that month
function closedNotes(ctx, withPark) {
  const tag = withPark ? ` (${ctx.park})` : '';
  const out = ctx.refurbs.map(r => `Closed for refurbishment${tag}, so it's left out of the plan: ${r.ride}. ${r.note}`);
  const usual = [...ctx.closedSet].filter(n => !ctx.refurbs.some(r => r.ride === n));
  if (usual.length) out.push(`Often closed in ${ctx.monName}${tag}: ${usual.join(', ')}.`);
  return out;
}
// notes for a date past what a dataset covers (the "until" and "day_note" in its data/*.js header)
const fmtShortDate = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
function dataNotes(ctx) {
  const out = [];
  const add = (id, applies) => { const m = dash.meta(id); if (applies && m && m.until && m.day_note && ctx.iso > m.until) out.push(m.day_note.replace('{until}', fmtShortDate(m.until))); };
  add('park_hours_published', !ctx.published);
  add('events', ctx.evs.length > 0);
  add('refurbs', true);
  return out;
}
// About the data: every dataset's source, dates and status, plus anything the load checks found
(function dataStatusTable() {
  const today = todayISO(), ids = dash.datasets(), tb = document.querySelector('#ds-table tbody');
  const LABEL = { current: () => 'Current', soon: () => 'Ends soon', ended: (m) => 'Ended ' + fmtShortDate(m.until) + '; using fallbacks', review: () => 'Due for a refresh' };
  const count = { current: 0, soon: 0, ended: 0, review: 0 };
  ids.forEach(id => {
    const m = dash.meta(id) || { title: id }, st = dash.dataStatus(id, today); count[st]++;
    const tr = document.createElement('tr');
    const td = (cls, txt) => { const c = document.createElement('td'); c.className = cls; if (txt != null) c.textContent = txt; tr.append(c); return c; };
    const t = td('l'); t.textContent = m.title || id; t.title = (m.about || '') + ' (data/' + id + '.js)';
    const sc = td('l qt-hide-narrow');
    if (m.url) { const a = document.createElement('a'); a.href = m.url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = m.source || m.url;
      sc.append(a); } else sc.textContent = m.source || '';
    if (m.license) sc.append(document.createTextNode('. ' + m.license));
    td('l qt-hide-narrow d', m.pulled ? fmtShortDate(m.pulled) : '');
    td('l d', m.until ? fmtShortDate(m.until) : 'Any date');
    const c = td('l st'); const dot = document.createElement('span'); dot.className = 'dot ' + st; c.append(dot, LABEL[st](m));
    tb.append(tr);
  });
  const issues = (window.PDP_DATA_ISSUES || []).filter(x => x.level !== 'info');
  const box = document.getElementById('ds-issues');
  issues.forEach(x => { const q = document.createElement('p'); q.className = 'qt-ds-issue'; q.textContent = `Problem in data/${x.id}.js: ${x.msg}.`; box.append(q); });
  const bits = [`${ids.length} datasets, all built into the app`,
    issues.length ? `${issues.length} problem${issues.length > 1 ? 's' : ''} found when loading (below)` : 'all passed their checks when the app loaded'];
  if (count.ended) bits.push(`${count.ended} past ${count.ended > 1 ? 'their' : 'its'} end date`);
  if (count.soon) bits.push(`${count.soon} ending within 45 days`);
  if (count.review) bits.push(`${count.review} due for a refresh`);
  document.getElementById('ds-summary').textContent = bits.join(' · ') + '.';
})();
function expWait(ctx, r, t) {
  let h = Math.min(23, Math.max(8, Math.floor(t)));
  let base = r.h[h]; let k = 1;
  while (base == null && k < 6) { base = r.h[h - k] ?? r.h[h + k]; k++; }
  if (base == null) base = r.avg;
  return Math.max(5, Math.round(base * r.mf * r.df * ctx.weekFactor));
}
const wxAt = (ctx, t) => ctx.wx.get(Math.min(23, Math.max(7, Math.floor(t)))) || { feels: 70, rain: 0 };

