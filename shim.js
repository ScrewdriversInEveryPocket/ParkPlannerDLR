// Park Day Planner data layer: bundled datasets, calculations and the live forecast.
(function () {
  const store = {};
  // ---- bundled datasets (data/*.js, listed in data/manifest.js): parse each one and check it against the
  // columns its header promises. Rows missing a required value are left out; everything found is listed in
  // PDP_DATA_ISSUES, shown on the About the data tab and in check.html.
  const META = window.PDP_META || {}, FILES = window.PDP_FILES || Object.keys(window.PDP_DATA || {});
  const issues = [];
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const num = (v, lo, hi) => v.trim() !== '' && isFinite(+v) && +v >= lo && +v <= hi;
  const TYPES = {
    text: () => true, ride: () => true, land: () => true,
    int: (v) => /^-?\d+$/.test(v), num: (v) => num(v, -Infinity, Infinity), pct: (v) => num(v, 0, 100),
    hour: (v) => num(v, 0, 30), week: (v) => /^\d+$/.test(v) && +v >= 1 && +v <= 53,
    lat: (v) => num(v, 33.79, 33.83), lon: (v) => num(v, -117.94, -117.90),
    date: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v + 'T12:00:00Z')) && new Date(v + 'T12:00:00Z').toISOString().slice(0, 10) === v,
    md: (v) => /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v),
    mon: (v) => MON.includes(v), dow: (v) => DOW.includes(v),
    park: (v) => v === 'Disneyland' || v === 'California Adventure',
    'park+': (v) => v === 'Disneyland' || v === 'California Adventure' || v === 'Both'
  };
  const typeOk = (t, v) => t.includes('|') ? t.split('|').includes(v) : (TYPES[t] || TYPES.text)(v);
  const note = (id, level, msg) => issues.push({ id, level, msg });
  function checkRows(id, rows, meta) {
    const cols = (meta && meta.columns) || {};
    const missing = Object.keys(cols).filter(c => !rows.columns.includes(c));
    if (missing.length) note(id, 'error', `missing column${missing.length > 1 ? 's' : ''} ${missing.join(', ')}`);
    const bad = new Map(), keep = [];
    rows.forEach((r, i) => {
      let drop = false;
      for (const [c, spec] of Object.entries(cols)) {
        if (missing.includes(c)) continue;
        const req = spec.endsWith('!'), t = req ? spec.slice(0, -1) : spec, v = r[c] == null ? '' : r[c];
        const ok = v === '' ? !req || t.split('|').includes('') : typeOk(t, v);
        if (ok) continue;
        const k = c + (v === '' ? ' (blank)' : ''); const b = bad.get(k) || { n: 0, line: i + 2, v };
        b.n++; bad.set(k, b);
        if (req) drop = true; else r[c] = '';
      }
      if (!drop) keep.push(r);
    });
    bad.forEach((b, k) => note(id, 'error', `${b.n} row${b.n > 1 ? 's' : ''} with a bad ${k}, first on line ${b.line}${b.v ? ` ("${b.v}")` : ''}`));
    if (keep.length < rows.length) note(id, 'warn', `${rows.length - keep.length} of ${rows.length} rows left out`);
    keep.columns = rows.columns;
    return keep;
  }
  FILES.forEach(id => { if (!window.PDP_DATA || !(id in window.PDP_DATA)) note(id, 'error', `data/${id}.js did not load`); });
  for (const [id, text] of Object.entries(window.PDP_DATA || {})) {
    if (!META[id]) note(id, 'warn', 'no header (source, dates and columns)');
    let rows;
    try { rows = d3.csvParse(text); } catch (e) { note(id, 'error', 'could not be read: ' + e.message); continue; }
    if (!rows.length) note(id, 'error', 'has no rows');
    rows = checkRows(id, rows, META[id]);
    store[id] = { status: 'ok', data: rows, columns: rows.columns };
  }
  // names that must match across files: rides against Rides, lands against Lands
  (function crossCheck() {
    const rideSet = new Set((store.ride_profiles ? store.ride_profiles.data : []).map(r => r.park + '|' + r.ride));
    const landSet = new Set((store.lands ? store.lands.data : []).map(r => r.park + '|' + r.land));
    for (const [id, meta] of Object.entries(META)) {
      if (!store[id]) continue;
      for (const [c, spec] of Object.entries(meta.columns || {})) {
        const t = spec.replace('!', ''), set = t === 'ride' ? rideSet : t === 'land' ? landSet : null;
        if (!set || !set.size) continue;
        const miss = [...new Set(store[id].data.filter(r => r[c] && !set.has(r.park + '|' + r[c])).map(r => r[c]))];
        if (miss.length) note(id, 'warn', `${t === 'ride' ? 'ride' : 'land'}${miss.length > 1 ? 's' : ''} not in ${t === 'ride' ? 'Rides' :
            'Lands'}: ${miss.slice(0, 5).join(', ')}${miss.length > 5 ? ` and ${miss.length - 5} more` : ''}`);
      }
    }
    if (store.park_places && rideSet.size) {
      const placed = new Set(store.park_places.data.filter(r => r.kind === 'ride').map(r => r.park + '|' + r.name));
      const extra = [...placed].filter(k => !rideSet.has(k)).map(k => k.split('|')[1]);
      if (extra.length) note('park_places', 'warn', `ride${extra.length > 1 ? 's' : ''} not in Rides: ${extra.join(', ')}`);
      const unplaced = [...rideSet].filter(k => !placed.has(k)).map(k => k.split('|')[1]);
      if (unplaced.length) note('park_places', 'info', `no map point for ${unplaced.join(', ')} (walks use the land map)`);
      const food = new Set(store.park_places.data.filter(r => r.kind === 'food').map(r => r.park + '|' + r.name));
      const nofood = (store.dining ? store.dining.data : []).filter(r => r.kind !== 'event' && r.kind !== 'festival' && !food.has(r.park + '|' + r.name)).map(r => r.name);
      if (nofood.length) note('dining', 'info', `${nofood.length} without a map point (walks use the land map): ${nofood.join(', ')}`);
    }
  })();
  // security lines: each curve must run in order with sensible values, or the app can't read it
  (function checkSecurity() {
    if (!store.security_waits) return;
    const rows = store.security_waits.data, id = 'security_waits';
    [['curve', 'time-of-day', -240, 1440, 0, 90], ['crowd', 'crowd', 0.3, 3, 0.3, 3]].forEach(([k, what, aLo, aHi, mLo, mHi]) => {
      const pts = rows.filter(r => r.kind === k);
      if (pts.length < 2) { note(id, 'error', `needs at least 2 ${k} rows`); return; }
      const xs = pts.map(r => +r.at);
      if (xs.some(x => !isFinite(x) || x < aLo || x > aHi)) note(id, 'error', `a ${k} row has an "at" outside ${aLo} to ${aHi}`);
      if (xs.some((x, i) => i && x <= xs[i - 1])) note(id, 'error', `the ${what} rows must be in order of "at", smallest first`);
      if (pts.some(r => +r.minutes < mLo || +r.minutes > mHi)) note(id, 'warn', `a ${k} row has "minutes" outside ${mLo} to ${mHi}`);
    });
  })();
  window.PDP_DATA_ISSUES = issues;
  issues.filter(x => x.level !== 'info').forEach(x => console.warn(`Park Day Planner data, ${x.id}: ${x.msg}`));
  // how fresh a dataset is on a given day: 'ended' (past its last covered date), 'soon' (ends within 45 days),
  // 'review' (past its refresh-by date) or 'current'
  function dataStatus(id, today) {
    const m = META[id] || {}, day = (iso) => Date.parse(iso + 'T12:00:00Z') / 864e5;
    if (m.until && today > m.until) return 'ended';
    if (m.until && day(m.until) - day(today) <= 45) return 'soon';
    if (m.review && today > m.review) return 'review';
    return 'current';
  }
  store.forecast_hourly = { status: 'loading', data: [] };
  store.forecast_accu = { status: 'missing', data: [] };
  const calcs = {}, loaders = {}, cbs = [];
  let version = 0; const memo = {};

  function calcVal(id) {
    const m = memo[id]; if (m && m.v === version) return m.r;
    const spec = calcs[id]; let r;
    const ins = spec.inputs.map(i => window.dash.data(i));
    if (ins.some(x => x.status === 'error' || x.status === 'missing' || x.status === 'declined')) r = { status: 'error', data: [] };
    else if (ins.some(x => x.status !== 'ok')) r = { status: 'loading', data: [] };
    else { try { r = { status: 'ok', data: spec.fn(...ins.map(x => x.data)) }; } catch (e) { console.error('calc ' + id, e); r = { status: 'error', data: [], message: String(e) }; } }
    memo[id] = { v: version, r }; return r;
  }
  let pending = false;
  function run() {
    if (pending) return; pending = true;
    requestAnimationFrame(() => { pending = false; cbs.forEach(f => { try { f(); } catch (e) { console.error(e); } }); });
  }
  window.dash = {
    colors: ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)', 'var(--c7)', 'var(--c8)'],
    data(id) { return calcs[id] ? calcVal(id) : (store[id] || { status: 'missing', data: [] }); },
    meta(id) { return META[id] || null; },
    datasets() { return FILES.slice(); },
    dataStatus,
    calc(id, spec) { calcs[id] = spec; },
    loader(id, spec) { loaders[id] = spec; },
    onData(fn) { cbs.push(fn); run(); },
    setLink(k) { try { history.replaceState(null, '', '#' + k); } catch (e) { /* file:// may refuse */ } },
    redraw: run
  };
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(run, 150); });

  // ---- live forecast: Xweather with the viewer's own keys, else Open-Meteo (free, no key)
  const LAT = 33.8121, LON = -117.919;
  const WMO = { 0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Cloudy', 45: 'Fog', 48: 'Fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
    56: 'Freezing drizzle', 57: 'Freezing drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 66: 'Freezing rain', 67: 'Freezing rain', 71: 'Light snow',
    73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains', 80: 'Light showers', 81: 'Showers', 82: 'Heavy showers', 85: 'Snow showers', 86: 'Snow showers',
    95: 'Thunderstorms', 96: 'Thunderstorms', 99: 'Thunderstorms' };
  function keys() { try { return JSON.parse(localStorage.getItem('pdp-xweather') || 'null'); } catch (e) { return null; } }
  async function fromXweather(k) {
    const u = `https://data.api.xweather.com/forecasts/${LAT},${LON}?filter=1hr&limit=384&client_id=${encodeURIComponent(k.id)}&client_secret=${encodeURIComponent(k.secret)}`;
    const j = await (await fetch(u)).json();
    if (!j.success || !j.response || !j.response[0]) throw new Error((j.error && j.error.description) || 'Xweather returned no forecast');
    return { forecasts: j.response[0].periods.map(p => ({ dateTimeISO: p.dateTimeISO, tempF: p.tempF, humidity: p.humidity, pop: p.pop, weather: p.weatherPrimary || p.weather })) };
  }
  async function fromOpenMeteo() {
    const u =
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
      `&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,weather_code` +
      `&temperature_unit=fahrenheit&timezone=America%2FLos_Angeles&forecast_days=16`;
    const j = await (await fetch(u)).json();
    if (!j.hourly) throw new Error(j.reason || 'Open-Meteo returned no forecast');
    const H = j.hourly;
    return { forecasts: H.time.map((t, i) => ({ dateTimeISO: t + ':00', tempF: H.temperature_2m[i], humidity: H.relative_humidity_2m[i],
            pop: H.precipitation_probability[i] ?? 0, weather: WMO[H.weather_code[i]] || '' })) };
  }
  async function refreshForecast() {
    store.forecast_hourly = { status: 'loading', data: [] }; version++; run();
    const k = keys(); let answer = null, src = null, err = null;
    if (k && k.id && k.secret) { try { answer = await fromXweather(k); src = 'Xweather'; } catch (e) { err = e; console.warn('Xweather failed, using Open-Meteo', e); } }
    if (!answer) { try { answer = await fromOpenMeteo(); src = 'Open‑Meteo'; } catch (e) { err = e; } }
    window.PDP_FC_SRC = src; window.PDP_FC_ERR = answer ? (err ? String(err.message || err) : null) : String(err && err.message || err);
    if (answer && loaders.forecast_hourly) {
      try { const r = loaders.forecast_hourly.fn({ answer }); store.forecast_hourly = { status: 'ok', data: r.rows || r, columns: r.columns }; }
      catch (e) { store.forecast_hourly = { status: 'error', data: [], message: String(e) }; }
    } else store.forecast_hourly = { status: 'error', data: [] };
    version++; run();
    document.dispatchEvent(new CustomEvent('pdp-forecast'));
  }
  window.PDP_refreshForecast = refreshForecast;
  if (!window.PDP_NO_FORECAST) window.addEventListener('DOMContentLoaded', refreshForecast);
})();
