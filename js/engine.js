// DLR Planner: the planner: day context, waits, About-the-data table, walks, gates and security, scheduler, Lightning Lane, meals, Park Hopper, fit checks.
// Part of the app script, split from index.html. The js files load in this order: core, charts, explore, controls, engine, plan-day, wizard, time-of-day, state, pdf, app.
const DOW_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const weekOf = (m, d) => { if (m === 2 && d === 29) d = 28; const doy = Math.round((Date.UTC(2023, m - 1, d) - Date.UTC(2023, 0, 1)) / 864e5) + 1; return Math.min(52, Math.floor((doy - 1) / 7) + 1); };

// Live forecasts are only trusted this many days out; later dates use 10-year averages.
const FORECAST_DAYS = 10;
const daysUntil = (iso) => { const [y, m, d] = iso.split('-').map(Number); const n = new Date(); return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())) / 864e5); };

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
      const heat = (t, r) => t < 80 ? t : Math.round(-42.379 + 2.04901523 * t + 10.14333127 * r - 0.22475541 * t * r - 0.00683783 * t * t - 0.05481717 * r * r + 0.00122874 * t * t * r + 0.00085282 * t * r * r - 0.00000199 * t * t * r * r);
      hrs.forEach(r => wx.set(r.hour, { feels: heat(r.temp_f, r.humidity), rain: r.rain_chance_pct }));
      fc = { conditions: dayRow.conditions, high: dayRow.high_f, low: dayRow.low_f };
      Object.assign(wxd, { avg_high_f: dayRow.high_f, feels_like_high_f: dayRow.feels_high_f, rain_chance_pct: dayRow.rain_chance_pct, hot_day_pct: dayRow.high_f >= 90 ? 100 : 0, chilly_night_pct: dayRow.low_f < 45 ? 100 : 0 });
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
      Object.assign(wxd, { avg_high_f: Number(row.high_f), feels_like_high_f: Number(row.feels_high_f), rain_chance_pct: Number(row.rain_chance_pct), hot_day_pct: Number(row.high_f) >= 90 ? 100 : 0, chilly_night_pct: Number(row.low_f) < 45 ? 100 : 0 });
    }
  } else fc.src = (window.PDP_FC_SRC || 'Live');
  // how busy the day is against a typical one (1 = typical), from the ride wait factors
  const crowd = weekFactor * (d3.mean(rides, r => r.mf * r.df) || 1);
  return { crowd, iso, Y, M, Dd, dow, wkN, monName, open, close, analog: an.date, published: !!pub, hoursNote: pub ? pub.note : '', refurbs, wx, wxd, sunset: Number(sun.sunset_hour), weekFactor, walkBusy, evs, closedSet, rides, park, fc };
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
    if (m.url) { const a = document.createElement('a'); a.href = m.url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = m.source || m.url; sc.append(a); } else sc.textContent = m.source || '';
    if (m.license) sc.append(document.createTextNode('. ' + m.license));
    td('l qt-hide-narrow d', m.pulled ? fmtShortDate(m.pulled) : '');
    td('l d', m.until ? fmtShortDate(m.until) : 'Any date');
    const c = td('l st'); const dot = document.createElement('span'); dot.className = 'dot ' + st; c.append(dot, LABEL[st](m));
    tb.append(tr);
  });
  const issues = (window.PDP_DATA_ISSUES || []).filter(x => x.level !== 'info');
  const box = document.getElementById('ds-issues');
  issues.forEach(x => { const q = document.createElement('p'); q.className = 'qt-ds-issue'; q.textContent = `Problem in data/${x.id}.js: ${x.msg}.`; box.append(q); });
  const bits = [`${ids.length} datasets, all built into the app`, issues.length ? `${issues.length} problem${issues.length > 1 ? 's' : ''} found when loading (below)` : 'all passed their checks when the app loaded'];
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

// ---------- where things are: ride, restaurant and show locations from OpenStreetMap (© OpenStreetMap
// contributors, ODbL), extracted once on Oct 25, 2026 and bundled as park_places, so planning needs no
// network. A place missing from it falls back to the rough land map below. ----------
// the turnstiles on each side of the Esplanade (data/gates.js, our own estimate; OSM doesn't name them)
const GATE_ROWS = dash.data('gates').data || [];
const GATE = Object.fromEntries(GATE_ROWS.filter(r => !r.guests).map(r => [r.park, [Number(r.lat), Number(r.lon)]]));
const GATE_NAME = Object.fromEntries(GATE_ROWS.filter(r => !r.guests).map(r => [r.park, r.name || r.park + ' gate']));
// the Grand Californian's own entrance into California Adventure (hotel guests only, hours are our estimate)
const GC_GATE = (() => { const r = GATE_ROWS.find(x => x.guests === 'Grand Californian'); return r ? { id: r.id, name: r.name, park: r.park, pos: [Number(r.lat), Number(r.lon)], before: Number(r.opens_before_min) || 0, after: Number(r.closes_after_min) || 0 } : null; })();
// the hotel guests' entrance when it's the way in or out of this park at time t, else null (use the Esplanade)
function hotelGate(ctx, t) {
  const g = GC_GATE; if (!g || dpState.hotel !== 'gc' || ctx.park !== g.park) return null;
  const o = ctx.realOpen != null ? ctx.realOpen : ctx.open, c = ctx.realClose != null ? ctx.realClose : ctx.close;
  return t >= o - g.before / 60 - 1e-9 && t <= c + g.after / 60 + 1e-9 ? g : null;
}
// security and tap-in lines from data/security_waits.js (our estimate): minutes by time from opening, times a
// multiplier for how busy the day is, less a little at the Grand Californian entrance; park hops only tap in
const SEC = (() => {
  const rows = dash.data('security_waits').data || [];
  const pts = (k) => rows.filter(r => r.kind === k).map(r => [Number(r.at), Number(r.minutes)]).filter(q => isFinite(q[0]) && isFinite(q[1])).sort((a, b) => a[0] - b[0]);
  const one = (k, at, d) => { const r = rows.find(x => x.kind === k && x.at === at); return r && isFinite(+r.minutes) ? +r.minutes : d; };
  return { curve: pts('curve'), crowd: pts('crowd'), gc: one('entrance', 'gc', -5), tap: one('hop', 'tapin', 15) };
})();
const interp = (pts, x, d) => { if (!pts.length) return d; if (x <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); } return pts[pts.length - 1][1]; };
const crowdMult = (ctx) => interp(SEC.crowd, ctx.crowd || 1, 1);
const crowdWord = (ctx) => (ctx.crowd || 1) > 1.08 ? 'busy day' : (ctx.crowd || 1) < 0.92 ? 'quiet day' : 'typical day';
function secMin(ctx, t, g) {
  const o = ctx.realOpen != null ? ctx.realOpen : ctx.open;
  return Math.max(2, Math.round(interp(SEC.curve, (t - o) * 60, 15) * crowdMult(ctx) + (g ? SEC.gc : 0)));
}
// coming in from the hotel to be at the turnstiles at time t: which way, the walk, the lines, when to leave
function entryInfo(ctx, t) {
  const g = hotelGate(ctx, t), min = travelMin(ctx.park, g), sec = secMin(ctx, t, g);
  return { g, min, sec, name: g ? g.name : GATE_NAME[ctx.park] || 'park gate', leave: t - (min + sec) / 60 };
}
const arrSub = (ctx, t) => { const e = entryInfo(ctx, t); return `Leave hotel by ${fmtClock(e.leave)} · ~${e.sec} min security (${crowdWord(ctx)})${e.g ? ' at the ' + e.g.name : ''}`; };
const backAt = (ctx, t) => fmtClock((t + travelMin(ctx.park, hotelGate(ctx, t)) / 60) % 24);
// per-block gates for walks to and from "the gate" (null = the park's Esplanade gate), set by scheduleBlock
let GATE_IN = null, GATE_OUT = null;
// Lightning Lane planning settings from data/lightning_lane.js (which rides are Multi or Single Pass is in ride_profiles)
const LL = (() => {
  const m = Object.fromEntries((dash.data('lightning_lane').data || []).map(r => [r.setting, r.value]));
  const n = (k, d) => m[k] !== undefined && m[k] !== '' && isFinite(+m[k]) ? +m[k] : d;
  return { wait: n('wait_min', 10), gap: n('gap_hours', 1), per: n('hours_per_pass', 1.75), max: n('max_multi', 7), rule: m.rebook_rule || 'Book the next one as soon as you use one, or 2 hours after booking.' };
})();
const PLACES = (() => {
  const pos = new Map(), shows = { 'Disneyland': [], 'California Adventure': [] };
  const pt = (a, b) => { const p = [Number(a), Number(b)]; return a !== '' && b !== '' && isFinite(p[0]) && isFinite(p[1]) ? p : null; };
  (dash.data('park_places').data || []).forEach(r => {
    const p = pt(r.lat, r.lon); if (!p) return;
    if (r.kind === 'show') { (shows[r.park] || []).push({ n: r.name, p }); return; }
    // rides also carry their queue entrance and their exit (our best guess from OpenStreetMap's doors)
    const ent = pt(r.ent_lat, r.ent_lon) || p;
    pos.set(r.park + '|' + r.kind + '|' + r.name, { mid: p, ent, exit: pt(r.exit_lat, r.exit_lon) || ent });
  });
  return { pos, shows };
})();
const lookupPlace = (park, name, kind, end) => { const q = PLACES.pos.get(park + '|' + kind + '|' + name); return q ? q[end || 'ent'] : null; };
// a place is a ride (from ride_profiles), a meal stop { name, land, pos }, or null for the park gate.
// Walks leave a ride from its exit and reach the next one at its entrance.
const posOf = (park, x, end) => x == null ? ((end === 'ent' ? GATE_OUT : GATE_IN) || GATE[park]) : x.pos !== undefined ? x.pos : lookupPlace(park, x.name, 'ride', end);
const distM = (a, b) => Math.hypot((a[0] - b[0]) * 111320, (a[1] - b[1]) * 111320 * Math.cos(33.81 * Math.PI / 180));

// Rough walking positions of each land, in minutes from the park's central hub (the gate is 'Entrance'),
// from data/lands.js: the fallback when a place has no location. Same-land moves take SAME_LAND_MIN.
const LAND_POS = {};
(dash.data('lands').data || []).forEach(r => { (LAND_POS[r.park] = LAND_POS[r.park] || {})[r.land] = [Number(r.map_x), Number(r.map_y)]; });
const WALK_WIND = 1.25, SAME_LAND_MIN = 2;
// with real locations: paths wind, so the straight line is stretched by PATH_WIND, walked at the group's speed
// in metres a minute through park crowds (relaxed = seniors or small children, normal = middle-aged adults,
// go-go = young adults). Minutes are worked out at the normal speed; the pace then scales them.
const PATH_WIND = 1.35, WALK_SPEED = 65, PACE_SPEED = { relaxed: 50, normal: 65, fast: 80 };
const paceWalk = () => WALK_SPEED / (PACE_SPEED[dpState.pace] || WALK_SPEED);
// time between rides on top of walking: restrooms, shops, snacks and distractions
const MOVE_EXTRA_MIN = 10, GATE_EXTRA_MIN = 8;
// how much an extra minute of walking counts against a ride, in the same units as the wait-now / best-later ratio
const WALK_WEIGHT = 0.02;
// waits-vs-steps slider: 0 = shortest waits (walking only costs time), 2 = balanced, 4 = fewest steps
const WALK_FACTOR = [0, 0.4, 1, 2.5, 5], WAIT_WEIGHT = [0.02, 0.01, 0, 0, 0];
const WALK_LABEL = ['shortest waits first', 'shorter waits first', 'balanced waits and steps', 'fewer steps first', 'fewest steps first'];
const walkPref = (v) => WALK_LABEL[v == null ? 2 : v];
// minutes at normal pace between two places (null = the park gate)
function walkMin(park, from, to) {
  const a = posOf(park, from, 'exit'), b = posOf(park, to, 'ent');
  if (a && b) return Math.max(1, Math.round(distM(a, b) * PATH_WIND / WALK_SPEED));
  const la = from ? from.land : 'Entrance', lb = to ? to.land : 'Entrance';
  if (la === lb) return SAME_LAND_MIN;
  const P = LAND_POS[park] || {}, p = P[la], q = P[lb];
  if (!p || !q) return 10;
  return Math.round(Math.hypot(p[0] - q[0], p[1] - q[1]) * WALK_WIND);
}
// meals: the nearest quick-service place that serves lunch and dinner, from where you are (from the gate, that's on your way in)
function mealSpot(park, from) {
  const all = Object.entries(DINING[park] || {}).flatMap(([land, xs]) => xs.filter(([, k, m]) => k === 'quick service' && (!m || /lunch|dinner/.test(m))).map(([n, k]) => ({ name: n, kind: k, land, pos: lookupPlace(park, n, 'food', 'mid') })));
  const here = from ? from.land : ENTRY_LAND[park];
  const located = all.filter(x => x.pos);
  if (located.length && posOf(park, from, 'exit')) return located.reduce((b, x) => walkMin(park, from, x) < walkMin(park, from, b) ? x : b);
  const same = all.filter(x => x.land === here);
  return same[0] || ((DINING_NEAR[park] || {})[here] || []).map(l => all.find(x => x.land === l)).find(Boolean) || null;
}
// free time: the nearest theater, stage or character spot (night spectaculars were left out of park_places)
function showNear(park, from) {
  const a = posOf(park, from, 'exit'), list = PLACES.shows[park] || []; if (!a || !list.length) return null;
  return list.reduce((b, e) => distM(a, e.p) < distM(a, b.p) ? e : b).n;
}
const freeText = (park, from, what) => { const sh = showNear(park, from); return `Free time: ${what}${sh ? ` (nearby: ${sh}; check today's times)` : ''}`; };

// break start s fits the group's "Break around" choice (within half an hour of it), or any time on auto
const brkNear = (s, at = dpState.brkAt) => at == null || at === 'auto' || Math.abs(s - Number(at)) <= 0.5 + 1e-9;
const brkAtLbl = (at) => fmtClock(Number(at)).replace(':00', '');
// time a block can't use before a break or a hop (the list ran out early, or hopping only opens at 11):
// move the walk out to the end and show the wait as free time with rides that would fit, so the clock never jumps
function gapFill(ctx, b, until, picked, why) {
  const gap = until - b.end, ex = b.steps[b.steps.length - 1];
  if (gap <= 1e-9 || !ex || !ex.exit) return;
  if (gap >= 10 / 60) {
    const min = Math.round(gap * 60), h = Math.floor(ex.t);
    const fits = ctx.rides.filter(r => !picked.has(r.name) && !ctx.closedSet.has(r.name) && !r.refurb && 10 + expWait(ctx, r, h) + r.rmin <= min)
      .sort((a, c) => (c.head - a.head) || (c.avg - a.avg)).slice(0, 3).map(r => r.name);
    b.steps.splice(b.steps.length - 1, 0, { t: ex.t, meal: `Free time: about ${min} min ${why}. ${fits.length ? `To use it, add a ride here, such as ${fits.join(', ')}.` : 'Catch a show, grab a snack or shop.'}`, dur: min, free: true, gap: true });
  }
  ex.t += gap; b.end = until;
}
// when picked rides don't fit: the picked rides that take the most time, and what taking each one off makes room for.
// drop(park, name) re-plans the day without that ride and returns what's still left over.
function fullAdvice(steps, left, drop) {
  if (!left.length) return null;
  const c = new Map();
  steps.forEach(x => { if (!x.ride || !x.r) return; const k = x.r.park + '|' + x.r.name; const o = c.get(k) || { park: x.r.park, name: x.r.name, min: 0, n: 0 }; o.min += (x.wait || 0) + x.r.rmin; o.n++; c.set(k, o); });
  const count = (L) => d3.rollup(L, v => v.length, r => r.park + '|' + r.name), before = count(left);
  // try the 5 biggest time users, then show the 3 that make the most room (ties: the one taking more time)
  return [...c.values()].sort((a, b) => b.min - a.min).slice(0, 5).map(o => {
    const after = count(drop(o.park, o.name)), k0 = o.park + '|' + o.name;
    const now = [...before].filter(([k, n]) => k !== k0 && (after.get(k) || 0) < n).map(([k]) => k.split('|')[1]);
    return Object.assign(o, { all: ![...after.keys()].some(k => k !== k0), now });
  }).sort((a, b) => ((b.all ? 99 : b.now.length) - (a.all ? 99 : a.now.length)) || (b.min - a.min)).slice(0, 3);
}
const advLine = (o) => `${o.name}${o.n > 1 ? ` (all ${o.n} times)` : ''}: about ${Math.round(o.min)} min in line and riding. ${o.all ? 'Taking it off makes room for everything else.' : o.now.length ? `Taking it off makes room for ${o.now.join(', ')}.` : "Taking it off isn't enough on its own."}`;
function scheduleBlock(ctx, start, end, pool, opts) {
  GATE_IN = opts.gateIn ? opts.gateIn.pos : null; GATE_OUT = opts.gateOut ? opts.gateOut.pos : null;
  try { return scheduleBlock0(ctx, start, end, pool, opts); } finally { GATE_IN = GATE_OUT = null; }
}
// Lightning Lane Multi Pass booking steps: you can't choose a return time, so the plan says when to book each one.
// The first is booked as soon as you tap in; each next one as soon as you've scanned in for the previous one.
// lists: the day's step arrays in time order (edited in place). Returns the Multi Pass rides in the order used.
function addLLBooking(lists) {
  const uses = [];
  lists.forEach(L => L.forEach(x => { if (x.ride && x.ll && x.r && x.r.ll !== 'Single Pass') uses.push({ L, x }); }));
  if (!uses.length) return [];
  uses.sort((a, b) => a.x.t - b.x.t);
  const book = (t, txt) => ({ t, meal: txt, dur: 0, book: true });
  // put a booking step in time order across the day's lists; a time that falls during a break or hop moves to
  // when you're back in (you could book from the hotel too, but the plan keeps its steps in order)
  const insertAt = (st) => { for (const L of lists) { const i = L.findIndex(x => x.t > st.t); if (i >= 0) { if (i === 0 && L !== lists.find(M => M.length)) st.t = Math.max(st.t, L[0].t - (L[0].walk || 0) / 60); L.splice(i, 0, st); return; } } const last = [...lists].reverse().find(L => L.length) || lists[0]; last.push(st); };
  const first = lists.find(L => L.length), t0 = first[0].t - (first[0].walk || 0) / 60;
  first.splice(0, 0, book(t0, `📱 In the Disneyland app: book your first Lightning Lane, ${uses[0].x.r.name}, as soon as you tap in. Take the next return time it offers.`));
  let lastBook = t0;
  uses.forEach((u, k) => {
    const nx = uses[k + 1]; if (!nx) return;
    // you may book the next one once you've scanned in for this one, or 2 hours after your last booking, whichever comes first
    const used = u.x.t + 1 / 60, two = lastBook + 2;
    const t = Math.min(used, two);
    const st = book(t, t < used - 1e-9 ? `📱 Book your next Lightning Lane, ${nx.x.r.name}: it's been 2 hours since your last booking.` : `📱 Book your next Lightning Lane, ${nx.x.r.name}, now that you've scanned in for ${u.x.r.name}.`);
    insertAt(st); lastBook = st.t;
  });
  return uses.map(u => u.x.r);
}
// When the list is done well before the end, plan it again with the spare time spread through the day:
// meals up to 20 min longer and 20 to 30 min rest breaks. Kept only if every ride still fits.
function scheduleSpread(ctx, start, end, pool, opts) {
  const m0 = opts.meals && Object.assign({}, opts.meals), s0 = opts.seen && new Map(opts.seen);
  const b = scheduleBlock(ctx, start, end, pool, opts), spare = (end - b.end) * 60;
  if (b.left.length || spare < 45) return b;
  const m1 = m0 && Object.assign({}, m0), s1 = s0 && new Map(s0);
  const pad = { meal: Math.min(20, Math.round(spare / 6)), rest: spare >= 150 ? 30 : spare >= 90 ? 20 : 0 };
  const b2 = scheduleBlock(ctx, start, end, pool, Object.assign({}, opts, { pad, meals: m1, seen: s1 }));
  if (b2.left.length || b2.end > end + 1e-9) return b;
  if (opts.meals) Object.assign(opts.meals, m1);
  if (opts.seen) { opts.seen.clear(); s1.forEach((v, k) => opts.seen.set(k, v)); }
  return b2;
}
function scheduleBlock0(ctx, start, end, pool, opts) {
  let t = start, prev = null; const steps = []; const left = pool.slice();
  // opts.meals is shared across the park segments of a hopper day so each meal happens once
  const eaten = opts.meals || { lunch: !opts.lunch, dinner: !opts.dinner }; let totalWait = 0, saved = 0, lastRest = start, lastLL = -9;
  // repeat rides: opts.seen (shared across a day's park segments) holds when each ride was last finished and how
  // many times it's been done; unless back to back is allowed, the next time waits an hour after the last one
  const seen = opts.seen || new Map(), REP_GAP = 1;
  // lunch from 11:45 as a rule, or from 11 when a hotel break starts by 1 pm, so it still fits before you leave
  const earlyLunch = opts.exit === 'break' && end <= 13 + 1e-9 ? 11 : 11.75;
  const blocked = (r, t) => (!dpState.b2b && seen.has(r.name) && t < seen.get(r.name).end + REP_GAP) || (r.meetFrom != null && t < r.meetFrom) || (r.meetTo != null && t + 0.5 > r.meetTo);
  // group pace: relaxed adds rest breaks, longer meals and slower walking; go-go does the opposite
  // walking speed by group pace, a little slower again on the busiest weeks
  const pace = dpState.pace, walkMult = paceWalk() * (ctx.walkBusy || 1);
  // before a hotel break or a hop, leave time to walk from the last stop to the gate
  const exitMin = (x) => opts.exit && x ? walkMin(ctx.park, x, null) * walkMult : 0;
  // opts.pad: spare time spread through the day as longer meals and rest breaks (see scheduleSpread)
  const pad = opts.pad || {};
  const restBreaks = pace === 'relaxed' || (pace === 'normal' && opts.relaxed) || !!pad.rest, restMin = pad.rest || 20;
  const mealMin = (pace === 'relaxed' ? 50 : pace === 'fast' ? 30 : (opts.relaxed ? 45 : 40)) + (pad.meal || 0);
  // before a break or a hop, everything has to be done by `end` (no few-minute overrun past the break time)
  const tol = opts.exit ? 0 : 0.05;
  let afterMeal = false; // the first walk after a meal counts double, so the plan doesn't cross the park straight after eating
  const LOOK_WIDTH = 6, LOOK_WEIGHT = 0.6, wv = dpState.walk == null ? 2 : dpState.walk, walkW = WALK_WEIGHT * WALK_FACTOR[wv], waitW = WAIT_WEIGHT[wv];
  // cost of riding r next at time t, coming from land `from` (null = the gate); lower is better
  const rideCost = (r, t, from, lastLL) => {
    const w = wxAt(ctx, t);
    const isLL = opts.ll && opts.ll.has(r) && (r.ll === 'Single Pass' || t >= lastLL + LL.gap);
    const standby = expWait(ctx, r, t);
    const wait = isLL ? LL.wait : standby;
    let minW = standby; for (let hh = Math.floor(t) + 1; hh < Math.min(24, end); hh++) minW = Math.min(minW, expWait(ctx, r, hh));
    let score = isLL ? 1.0 + (t < ctx.open + 1 ? 0.6 : 0) - Math.min(0.3, standby / 200) : standby / Math.max(minW, 5);
    if (w.feels >= 85) score += r.expo === 'Outdoor' ? 0.3 : r.expo === 'Mixed' ? 0.12 : -0.08;
    if (w.rain >= 8) score += r.expo === 'Outdoor' ? 0.25 : r.expo === 'Mixed' ? 0.1 : 0;
    if (r.wet && w.feels < 68) score += 0.25;
    if (r.head) score -= 0.05;
    score += waitW * wait;
    const wm = walkMin(r.park, from, r);
    score += walkW * wm * (afterMeal ? 2 : 1);
    const walk = ((from == null ? GATE_EXTRA_MIN : MOVE_EXTRA_MIN) + wm) * walkMult;
    const dur = walk + wait + r.rmin;
    if (t + (dur + exitMin(r)) / 60 > end + tol) return null;
    return { r, wait, score, walk, walkOnly: wm * walkMult, dur, isLL, standby, feels: w.feels };
  };
  let walked = 0;
  // walk to the nearest quick-service place, eat, and carry on from there
  // a restaurant picked for this meal (sit-down or walk-up list) takes the place of the nearest quick-service spot, and about an hour
  const mealLen = (kind) => { const ps = kind && dinePicked(ctx.park, kind); return ps ? sitMin(ps.sit) + (pad.meal || 0) : mealMin; };
  const mealFits = (from, kind) => { const ps = kind && dinePicked(ctx.park, kind), sp = ps || mealSpot(ctx.park, from), len = mealLen(kind); const w = sp ? walkMin(ctx.park, from, sp) * walkMult : 0; return { sp, w, len, ok: t + (w + len + exitMin(sp || from)) / 60 <= end + tol }; };
  const eat = (kind, m) => {
    const lbl = kind === 'lunch' ? 'Lunch' : 'Dinner', at = t + m.w / 60, sit = m.sp && m.sp.sit;
    const qs = !sit && m.sp && (dash.data('dining').data || []).find(r => r.park === ctx.park && r.name === m.sp.name);
    steps.push({ t: at, meal: m.sp ? `${lbl} at ${m.sp.name}` : lbl, mealKind: kind, park: ctx.park, dur: m.len || mealMin, spot: m.sp, walk: Math.round(m.w), sit, tip: sit ? dineTip(sit, ctx.iso, at) : qs && qs.mobile_order === 'yes' ? 'Mobile order in the Disneyland app about 30 min ahead to skip the line.' : '' });
    walked += m.w; t += (m.w + (m.len || mealMin)) / 60; eaten[kind] = true; lastRest = t; if (m.sp) prev = m.sp; afterMeal = true;
  };
  while (left.length && t < end - 0.1) {
    // meals are always in the park, never during the hotel break: lunch waits for the return if it won't fit before leaving
    if (!eaten.lunch && t >= (opts.lunchFrom || earlyLunch) && t < (opts.lunchBy || 14.5)) { const m = mealFits(prev, 'lunch'); if (m.ok) { eat('lunch', m); continue; } }
    if (!eaten.dinner && t >= 17.5 && t < (opts.dinnerBy || 20)) { const m = mealFits(prev, 'dinner'); if (m.ok) { eat('dinner', m); continue; } }
    if (restBreaks && t - lastRest >= 1.25 && t < end - 0.75) { const hot = wxAt(ctx, t).feels >= 82; steps.push({ t, meal: hot ? 'Rest break: something cold in the shade or an indoor show' : 'Rest break: snack, sit down or catch a show', dur: restMin }); t += restMin / 60; lastRest = t; continue; }
    // Pick the next ride by its own cost plus the cheapest ride that could follow it (one-ride look-ahead),
    // so the plan doesn't hop across the park for a small gain and then hop back.
    // before an early break, keep room to eat lunch in the park before leaving
    // (and before any break at all, keep room for the walk to lunch, lunch and the walk out (about 22 min of walking), since there's no lunch at the hotel)
    const lunchFrom0 = opts.lunchFrom || (opts.exit === 'break' ? earlyLunch : null);
    const lunchLatest = end - (mealLen('lunch') + (opts.exit === 'break' ? 22 : 0)) / 60, lunchDue = !eaten.lunch && lunchFrom0 && lunchLatest >= lunchFrom0 - 0.01;
    const cands = left.filter(r => !blocked(r, t)).map(r => rideCost(r, t, prev, lastLL)).filter(c => c && (!lunchDue || t + c.dur / 60 <= lunchLatest + 0.01)).sort((a, b) => a.score - b.score);
    // only repeats that are too soon, or character meets not started yet, are left: fill the gap until the next one may go
    if (!cands.length && left.length && left.every(r => blocked(r, t))) {
      const next = d3.min(left, r => r.meetTo != null && t + 0.5 > r.meetTo ? Infinity : Math.max(seen.has(r.name) && !dpState.b2b ? seen.get(r.name).end + REP_GAP : t, r.meetFrom != null ? r.meetFrom : t));
      if (next < end - 0.1 && next > t) { steps.push({ t, meal: freeText(ctx.park, prev, 'catch a show, grab a snack or shop'), dur: Math.round((next - t) * 60), free: true }); t = next; lastRest = t; continue; }
      break;
    }
    // nothing else fits before lunch has to happen: eat now, but never before 11 (wait with free time if needed)
    if (!cands.length && lunchDue && t >= lunchFrom0 - 1) {
      const t0 = t, at = Math.max(t, 11); t = at; const m = mealFits(prev, 'lunch');
      if (!m.ok) { t = t0; break; }
      if (at - t0 >= 5 / 60) steps.push({ t: t0, meal: freeText(ctx.park, prev, 'catch a show, grab a snack or shop'), dur: Math.round((at - t0) * 60), free: true });
      eat('lunch', m); continue;
    }
    let best = null, bestTotal = Infinity;
    for (const c of cands.slice(0, LOOK_WIDTH)) {
      const t2 = t + c.dur / 60, ll2 = c.isLL && c.r.ll !== 'Single Pass' ? t : lastLL;
      let follow = 0;
      if (left.length > 1 && t2 < end - 0.1) {
        let f = null; for (const r2 of left) { if (r2 === c.r || (!dpState.b2b && r2.name === c.r.name)) continue; const c2 = rideCost(r2, t2, c.r, ll2); if (c2 && (!f || c2.score < f.score)) f = c2; }
        follow = f ? f.score : 0;
      }
      const total = c.score + LOOK_WEIGHT * follow;
      if (total < bestTotal - 1e-9 || (Math.abs(total - bestTotal) < 1e-9 && best && c.r.avg > best.r.avg)) { best = c; bestTotal = total; }
    }
    if (!best) break;
    walked += best.walkOnly;
    const nth = (seen.has(best.r.name) ? seen.get(best.r.name).n : 0) + 1;
    steps.push({ t: t + best.walk / 60, ride: best.r.name + (nth > 1 ? ` (${ORD[nth] || nth + 'th'} time)` : ''), wait: best.wait, r: best.r, feels: best.feels, ll: best.isLL, standby: best.standby, walk: Math.round(best.walk) });
    afterMeal = false;
    seen.set(best.r.name, { n: nth, end: t + best.dur / 60 });
    if (best.isLL && best.r.ll !== 'Single Pass') lastLL = t; totalWait += best.wait; saved += best.isLL ? Math.max(0, best.standby - best.wait) : 0; t += best.dur / 60; prev = best.r;
    left.splice(left.indexOf(best.r), 1);
  }
  // the list is done before the end of the day, or before the hotel break: lunch (and dinner) still happen in the park before you leave
  if ((opts.tail || opts.exit === 'break') && !left.length) {
    const meal = (kind, from, by, maxWait) => {
      if (eaten[kind] || t >= by) return;
      const t0 = t, at = Math.max(t, from); if (at - t0 > maxWait) return;
      t = at; const m = mealFits(prev, kind); if (!m.ok) { t = t0; return; }
      if (at - t0 >= 5 / 60) steps.push({ t: t0, meal: freeText(ctx.park, prev, 'catch a show, grab a snack or shop'), dur: Math.round((at - t0) * 60), free: true });
      eat(kind, m);
    };
    meal('lunch', opts.exit === 'break' ? (opts.lunchFrom || earlyLunch) : 11.5, 14.5, 1.5);
    if (t >= 16.5) meal('dinner', 17.5, 20.5, 1);
  }
  if (opts.exit && prev) { const w = exitMin(prev); steps.push({ t, meal: `Walk to the ${opts.gateOut ? opts.gateOut.name : ctx.park + ' exit'} (~${Math.max(1, Math.round(w))} min)`, dur: Math.max(1, Math.round(w)), exit: true }); walked += w; t += w / 60; }
  return { steps, end: t, totalWait, left, saved, walked, last: prev };
}
const roundUp15 = (t) => Math.ceil(t * 4) / 4;
const roundDn15 = (t) => Math.floor(t * 4) / 4;

function llPlan(ctx, pool, hoursInPark) {
  const avgW = (r) => d3.mean(d3.range(Math.max(9, Math.ceil(ctx.open)), Math.min(22, ctx.close)), h => expWait(ctx, r, h)) || r.avg;
  pool = pool.filter(r => !r.lap); // Lightning Lane is once per ride per day; repeats wait in standby
  const elig = dpState.ll ? pool.filter(r => r.ll === 'Multi Pass').sort((a, b) => avgW(b) - avgW(a)) : [];
  const K = Math.min(elig.length, Math.max(1, Math.min(LL.max, Math.floor(hoursInPark / LL.per))));
  const multi = elig.slice(0, K);
  const single = dpState.single ? pool.filter(r => r.ll === 'Single Pass') : [];
  return { set: new Set(multi.concat(single)), multi, single };
}
function planDay(ctx, pool) {
  // o..c: the hours the group is in the park (park hours cut to their start and finish times)
  const W = dayWin(ctx.open, ctx.close), o = W.t0, c = W.t1;
  const arrive = W.rope ? ctx.open - 0.5 : o;
  const llStay = llPlan(ctx, pool, c - o);
  const hg = (t) => hotelGate(ctx, t);
  const stay = scheduleSpread(ctx, o, c, pool, { lunch: true, dinner: true, ll: llStay.set, relaxed: true, gateIn: hg(arrive), tail: true });
  // break window
  const L = W.why ? 0 : dpState.brk;
  const relIdx = (h) => d3.mean(pool, r => expWait(ctx, r, h) / Math.max(5, r.avg)) || 1;
  let bestS = null, bestP = -Infinity, brkMoved = false;
  const sMin = Math.max(o + 2.5, 11), sMax = Math.min(c - L - 1.5, 17);
  // the quietest, coolest hours, kept near the group's "Break around" time when they picked one
  const pickS = (near) => { for (let s = sMin; s <= sMax + 1e-9; s += 0.5) {
    if (near && !brkNear(s)) continue;
    let p = 0; for (let h = s; h < s + L; h += 1) { const w = wxAt(ctx, h); p += relIdx(h) + Math.max(0, w.feels - 78) / 10 + w.rain / 20; }
    if (p > bestP) { bestP = p; bestS = s; }
  } };
  pickS(true);
  if (bestS == null && L > 0 && dpState.brkAt !== 'auto') { pickS(false); brkMoved = bestS != null; }
  let split = null;
  if (L > 0 && bestS != null) {
    const llSplit = llPlan(ctx, pool, (bestS - o) + (c - bestS - L));
    const meals = { lunch: false, dinner: false }, seen = new Map();
    const morning = scheduleBlock(ctx, o, bestS, pool, { meals, seen, lunchFrom: bestS <= 12.5 ? 11 : null, ll: llSplit.set, exit: 'break', gateIn: hg(arrive), gateOut: hg(bestS) });
    gapFill(ctx, morning, bestS, new Set(pool.map(r => r.name)), 'before your break');
    const evening = scheduleSpread(ctx, bestS + L, c, morning.left, { meals, seen, lunchBy: meals.lunch ? 16.5 : Math.max(16.5, bestS + L + 1), dinnerBy: 21, ll: llSplit.set, gateIn: hg(bestS + L), tail: true });
    split = { arrive, brk: bestS, ret: bestS + L, leave: null, morning, evening, llp: llSplit, saved: morning.saved + evening.saved, totalWait: morning.totalWait + evening.totalWait, done: morning.steps.filter(s => s.ride).length + evening.steps.filter(s => s.ride).length, left: evening.left };
  }
  // each plan leaves when it's done (spare time is already spread through the day, and meals happen before leaving)
  const stayLeave = Math.min(c, stay.left.length ? c : roundUp15(stay.end));
  if (split) split.leave = Math.min(c, split.evening.left.length ? c : roundUp15(Math.max(split.evening.end, split.ret + 0.5)));
  annotateMeals(stay.steps); if (split) { annotateMeals(split.morning.steps); annotateMeals(split.evening.steps); }
  llStay.order = addLLBooking([stay.steps]);
  if (split) split.llp.order = addLLBooking([split.morning.steps, split.evening.steps]);
  const heatHours = (a, b, skip) => { let n = 0; for (let h = Math.ceil(a); h < b; h++) { if (skip && h >= skip[0] && h < skip[1]) continue; if (wxAt(ctx, h).feels >= 85) n++; } return n; };
  return {
    stay: { arrive, leave: stayLeave, plan: stay, llp: llStay, done: stay.steps.filter(s => s.ride).length, heat: heatHours(o, stayLeave) },
    split: split && Object.assign(split, { heat: heatHours(o, split.leave, [split.brk, split.ret]) }),
    relIdx, win: W, brkMoved
  };
}

// ---------- meals: restaurants near the last ride and the next ride ----------
// from data/dining.js (restaurants by land) and data/lands.js (which lands to borrow from when a land has few
// places of its own, and each park's entrance land)
const DINING = {}, DINING_NEAR = {}, ENTRY_LAND = {};
// places to suggest for a meal: no dining events, seasonal festival booths or members-only rooms; quick service first
const DINE_ORDER = { 'quick service': 0, 'table service': 1, snack: 2, lounge: 3 };
(dash.data('dining').data || []).filter(r => r.kind in DINE_ORDER && !/holders only|Seasonal festival/i.test(r.note || '')).sort((a, b) => DINE_ORDER[a.kind] - DINE_ORDER[b.kind])
  .forEach(r => { const P = DINING[r.park] = DINING[r.park] || {}; (P[r.land] = P[r.land] || []).push([r.name, r.kind, r.meals || '']); });
// sit-down and walk-up places you can pick for a day's lunch or dinner (dpState.dine / day.dine hold 'park|name')
const DINE_PICKS = {};
(dash.data('dining').data || []).filter(r => !/holders only/i.test(r.note || '') && ((r.kind === 'table service' && /lunch|dinner/.test(r.meals || '')) || (r.kind === 'lounge' && r.walkup === 'yes')))
  .forEach(r => { (DINE_PICKS[r.park] = DINE_PICKS[r.park] || []).push(Object.assign({}, r, {
    key: r.park + '|' + r.name,
    serves: ['lunch', 'dinner'].filter(m => r.kind === 'lounge' || (r.meals || '').includes(m)),
    // reservations for lunch or dinner: Disney opens them 60 days ahead; Plaza Inn only books breakfast
    book: (r.reservations === 'accepted' || r.reservations === 'recommended') && !/only for breakfast/i.test(r.note || ''),
    walkup: r.walkup === 'yes'
  })); });
const DINE_BY_KEY = {}; Object.values(DINE_PICKS).flat().forEach(r => { DINE_BY_KEY[r.key] = r; });
const BOOK_DAYS = 60;
const sitMin = (r) => (r.kind === 'lounge' ? 45 : 60) + (dpState.pace === 'relaxed' ? 10 : dpState.pace === 'fast' ? -10 : 0);
const addDaysISO = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const fmtDay = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
// what to tell people about a picked restaurant: when to book, or the walk-up list
function dineTip(r, iso, t) {
  if (!r) return '';
  const at = fmtClock(Math.round(t * 4) / 4);
  if (r.book) {
    const open = addDaysISO(iso, -BOOK_DAYS);
    return `${open <= todayISO() ? `Book it now in the Disneyland app (reservations for this date are already open)` : `Book it in the Disneyland app on ${fmtDay(open)} at about 6 am, when reservations open ${BOOK_DAYS} days ahead`}, for about ${at}.${r.walkup ? ' No booking? Join the walk-up list in the app on the day, an hour or two ahead.' : ''}`;
  }
  if (r.walkup) return `Walk-up only: join the list in the Disneyland app about an hour before${r.note && /standby/i.test(r.note) ? ', or wait in the standby line' : ''}.`;
  return 'No booking needed for lunch or dinner: just turn up.';
}
// every sit-down meal picked on the wizard's days that needs booking, earliest booking first
function tripBookings(pd) {
  const out = [];
  pd.forEach((x, k) => { const d = wz.days && wz.days[x.iso]; if (!d || !d.dine) return; ['lunch', 'dinner'].forEach(m => { const r = DINE_BY_KEY[d.dine[m]]; if (r && x.opt.parks.includes(r.park)) out.push({ r, meal: m, iso: x.iso, n: k + 1, open: addDaysISO(x.iso, -BOOK_DAYS) }); }); });
  return out.sort((a, b) => a.iso.localeCompare(b.iso));
}
const bookingLine = (b) => `${b.r.name}, ${b.meal} on Day ${b.n} (${fmtDay(b.iso)}): ${b.r.book ? (b.open <= todayISO() ? 'book now in the Disneyland app, reservations are open' : `book in the Disneyland app on ${fmtDay(b.open)} at about 6 am`) + (b.r.walkup ? '; walk-up list on the day if you miss it' : '') : b.r.walkup ? 'walk-up list only: join it in the app on the day' : 'no booking needed'}.`;
const dineSpot = (park, name) => ({ name, kind: 'table service', land: (DINE_BY_KEY[park + '|' + name] || {}).land, pos: lookupPlace(park, name, 'food', 'mid'), sit: DINE_BY_KEY[park + '|' + name] });
// the restaurant picked for a meal on this day, if it's in this park
const dinePicked = (park, kind) => { const k = dpState.dine && dpState.dine[kind]; if (!k) return null; const [p, n] = k.split('|'); return p === park && DINE_BY_KEY[k] ? dineSpot(p, n) : null; };
// picked meals that didn't make it into the plan, and why: the restaurant is in a park the day doesn't visit ('park'),
// you're in the other park at that meal ('where'), it didn't fit ('fit'), or the plan has no such meal ('none')
function dineIssues(steps, parks) {
  const out = [];
  ['lunch', 'dinner'].forEach(kind => {
    const k = dpState.dine && dpState.dine[kind]; if (!k || !DINE_BY_KEY[k]) return;
    const m = steps.find(s => s.mealKind === kind);
    if (m && m.sit && m.sit.key === k) return;
    const r = DINE_BY_KEY[k];
    out.push({ kind, r, at: m && m.park, why: parks && !parks.includes(r.park) ? 'park' : !m ? 'none' : m.park && m.park !== r.park ? 'where' : 'fit' });
  });
  return out;
}
function dineIssueText(x, parks) {
  const Meal = x.kind === 'lunch' ? 'Lunch' : 'Dinner', r = x.r;
  if (x.why === 'park') return `${Meal} at ${r.name} is in ${r.park}, but this day is in ${parks.join(' and ')}.`;
  if (x.why === 'where') return `${Meal} at ${r.name} is in ${r.park}, but no plan for this day gets you there at ${x.kind} time with all your rides, so ${x.kind} is in ${x.at}. Try fewer rides, or pick a ${x.at} restaurant.`;
  if (x.why === 'none') return `There's no ${x.kind} in this plan, so ${r.name} isn't used.`;
  return `${Meal} at ${r.name} (${r.park}) didn't fit in this plan, so it eats somewhere nearer. Try fewer rides, or pick it for a different meal or day.`;
}
function dineMiss(steps, parks) { return dineIssues(steps, parks).map(x => dineIssueText(x, parks)).join(' '); }
// the note under a plan, with a way out when the restaurant is in a park the day doesn't visit:
// hop (when the ticket allows it) or pick a restaurant in this park instead. Picked chips that missed get a ⚠.
function dineNote(el, steps, parks, opts) {
  const xs = dineIssues(steps, parks); el.textContent = ''; el.hidden = !xs.length;
  xs.forEach(x => {
    const line = document.createElement('span'); line.textContent = dineIssueText(x, parks) + ' '; el.append(line);
    if (x.why !== 'park') return;
    const btn = (t, f) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'qt-link'; b.textContent = t; b.style.marginRight = 'var(--cds-gap-sm)'; b.addEventListener('click', f); el.append(b); };
    if (opts.hop) btn(`Add a hop for ${x.kind}`, () => opts.hop(x));
    else if (opts.noHop) el.append(document.createTextNode(opts.noHop + ' '));
    btn(`Pick a ${parks.length === 1 ? parks[0] + ' ' : ''}restaurant instead`, () => opts.clear(x));
  });
  if (opts.chips) opts.chips.querySelectorAll('.qt-chip.dine').forEach(c => {
    const x = xs.find(y => y.r.key === c.dataset.key); c.classList.toggle('miss', !!x);
    if (x && !c.querySelector('.dmiss')) { const w = document.createElement('span'); w.className = 'dmiss'; w.textContent = x.why === 'where' ? ` ⚠ you're in ${x.at} at ${x.kind}` : ' ⚠ not in the plan'; c.insertBefore(w, c.querySelector('.ri')); c.title = dineIssueText(x, parks); }
  });
  return xs;
}
(dash.data('lands').data || []).forEach(r => {
  const near = (r.dining_near || '').split(';').map(x => x.trim()).filter(Boolean);
  if (near.length) (DINING_NEAR[r.park] = DINING_NEAR[r.park] || {})[r.land] = near;
  if (r.entry === 'Yes') ENTRY_LAND[r.park] = r.land;
});
function diningIn(park, land) {
  const own = ((DINING[park] || {})[land] || []).map(([n, k]) => ({ n, k }));
  if (own.length >= 2) return own.slice(0, 3);
  const extra = [];
  ((DINING_NEAR[park] || {})[land] || []).forEach(l => ((DINING[park] || {})[l] || []).slice(0, 2).forEach(([n, k]) => extra.push({ n, k, loc: l })));
  return own.concat(extra).slice(0, 3);
}
function diningNear(prev, next) {
  const out = [];
  // no ride before this meal today (start of day or just back from the hotel break): food between the gate and the next ride
  if (!prev && next) {
    const entry = ENTRY_LAND[next.park], way = entry ? diningIn(next.park, entry) : [];
    if (next.land === entry) { if (way.length) out.push({ where: `On your way in, near ${next.name} (${entry})`, items: way }); return out; }
    if (way.length) out.push({ where: `On your way in (${entry})`, items: way });
    const seen = new Set(way.map(i => i.n)), items = diningIn(next.park, next.land).filter(i => !seen.has(i.n));
    if (items.length) out.push({ where: `Near your next ride, ${next.name} (${next.land})`, items });
    return out;
  }
  if (prev && next && prev.park === next.park && prev.land === next.land) {
    const items = diningIn(prev.park, prev.land);
    if (items.length) out.push({ where: prev.name === next.name ? `Near ${prev.name} (${prev.land})` : `Near ${prev.name} and ${next.name} (${prev.land})`, items });
    return out;
  }
  [[prev, 'Near your last ride'], [next, 'Near your next ride']].forEach(([r, label]) => {
    if (!r) return;
    const items = diningIn(r.park, r.land);
    if (items.length) out.push({ where: `${label}, ${r.name} (${r.land}${prev && next && prev.park !== next.park ? ', ' + (r.park === 'Disneyland' ? 'Disneyland' : 'California Adventure') : ''})`, items });
  });
  return out;
}
const dineText = (dine) => dine.map(g => `${g.where}: ${g.items.map(i => `${i.n} (${i.k}${i.loc ? ', in ' + i.loc : ''})`).join(', ')}`).join(' | ');
function annotateMeals(flat) {
  flat.forEach((s, i) => {
    if (!s.mealKind) return;
    if (s.sit) { s.dine = []; return; }
    let prev = null, next = null;
    for (let k = i - 1; k >= 0 && !prev; k--) { if (flat[k].brk) break; if (flat[k].ride) prev = flat[k].r; } // the hotel break resets where you are
    for (let k = i + 1; k < flat.length && !next; k++) { if (flat[k].brk) break; if (flat[k].ride) next = flat[k].r; }
    s.dine = diningNear(prev, next).map(g => Object.assign({}, g, { items: g.items.filter(x => !s.spot || x.n !== s.spot.name) })).filter(g => g.items.length);
  });
}

// ---------- Park Hopper day: every picked ride in both parks, at most 2 hops ----------
// a hop = the walk across the Esplanade between the gates at your pace, plus tapping in at the other park.
// The walk to the gate and on to the first ride are counted in the park schedules themselves.
// the tap-in line comes from data/security_waits.js, scaled by how busy the park you're hopping into is
const HOP_FIRST = 11; let HOP_MIN = 20;
const hopMin = (toCtx) => Math.round(distM(GATE['Disneyland'], GATE['California Adventure']) * PATH_WIND / WALK_SPEED * paceWalk() + SEC.tap * crowdMult(toCtx));
function poolFor(ctx) {
  if (!dpState.rides[ctx.park]) dpState.rides[ctx.park] = new Set(ctx.rides.filter(r => r.head).map(r => r.name));
  return expandPool(ctx.rides.filter(r => dpState.rides[ctx.park].has(r.name)), dpState.reps[ctx.park]);
}
function planHopper(iso, D, withBreak) {
  const PARKS = ['Disneyland', 'California Adventure'];
  // C: each park's hours cut to the group's start and finish times (C0 keeps the real hours for display)
  const C0 = Object.fromEntries(PARKS.map(p => [p, dayContext(iso, p, D)]));
  const WW = Object.fromEntries(PARKS.map(p => [p, dayWin(C0[p].open, C0[p].close)]));
  if (withBreak && WW[PARKS[0]].why) return null;
  const C = Object.fromEntries(PARKS.map(p => [p, Object.assign({}, C0[p], { open: WW[p].t0, close: WW[p].t1, realOpen: C0[p].open, realClose: C0[p].close })]));
  const pools = Object.fromEntries(PARKS.map(p => [p, poolFor(C[p])]));
  const total = pools[PARKS[0]].length + pools[PARKS[1]].length;
  const L = dpState.brk;
  const picks = Object.fromEntries(PARKS.map(p => [p, new Set(pools[p].map(r => r.name))]));
  let near = true, brkFloor = 11; // breaks never start before 11; with "Break around" set, not before half an hour ahead of it
  HOP_MIN = Math.round(d3.mean(PARKS, p => hopMin(C[p])));
  const run = (plan, spread) => {
    // plan: [{ park, to, gap }, ...]; gap is how you get here from the previous entry: 'hop' or 'break' (at the hotel)
    const meals = { lunch: false, dinner: false }, seen = new Map();
    const left = Object.fromEntries(PARKS.map(p => [p, pools[p].slice()]));
    const hrs = {}; let from = null, hopped = false, hops = 0;
    plan.forEach(g => { hrs[g.park] = (hrs[g.park] || 0) + Math.max(0.5, Math.min(g.to, C[g.park].close) - C[g.park].open); });
    const llps = Object.fromEntries(PARKS.map(p => [p, llPlan(C[p], pools[p], Math.min(hrs[p] || 0, C[p].close - C[p].open))]));
    const segs = []; let tw = 0, saved = 0, idle = 0;
    for (let i = 0; i < plan.length; i++) {
      const g = plan[i], c = C[g.park];
      const hm = g.gap === 'hop' ? hopMin(c) : 0;
      const start = i === 0 ? c.open : Math.max(from + (g.gap === 'break' ? L : hm / 60), c.open);
      const stop = Math.min(g.to, c.close);
      if (stop - start < 0.5) return null;
      const preBrk = plan[i + 1] && plan[i + 1].gap === 'break' && stop <= 12.5;
      const b = (spread && !plan[i + 1] ? scheduleSpread : scheduleBlock)(c, start, stop, left[g.park], { tail: !plan[i + 1], meals, seen, lunchFrom: preBrk ? 11 : null, lunchBy: g.gap === 'break' ? (meals.lunch ? 16.5 : Math.max(16.5, start + 1)) : null, dinnerBy: g.gap === 'break' ? 21 : null, ll: llps[g.park].set, exit: plan[i + 1] ? plan[i + 1].gap : null, gateIn: i === 0 || g.gap === 'break' ? hotelGate(c, start) : null, gateOut: plan[i + 1] && plan[i + 1].gap === 'break' ? hotelGate(c, stop) : null });
      left[g.park] = b.left; tw += b.totalWait; saved += b.saved;
      const nx = plan[i + 1];
      let depart = b.end;
      if (nx && nx.gap === 'hop' && !hopped) depart = Math.max(depart, HOP_FIRST);
      if (nx && nx.gap === 'break') depart = Math.max(depart, brkFloor);
      if (nx && nx.gap === 'hop' && !b.steps.some(x => x.ride)) return null; // no point entering a park only to hop straight out
      if (nx && depart > b.end + 1e-9) { idle += depart - b.end; gapFill(c, b, depart, picks[g.park], nx.gap === 'hop' && b.end < HOP_FIRST && depart <= HOP_FIRST + 1e-9 ? 'until park hopping opens at 11 am' : 'before your break'); }
      if (nx && nx.gap === 'hop') hopped = true;
      if (nx && nx.park !== g.park) hops++;
      from = depart;
      segs.push({ park: g.park, ctx: c, start, end: b.end, steps: b.steps, depart, gapBefore: g.gap || null, hopMin: hm });
    }
    const done = segs.reduce((n, s) => n + s.steps.filter(x => x.ride).length, 0);
    const flatSteps = segs.flatMap(x => x.steps), miss = ['lunch', 'dinner'].filter(k => dpState.dine && dpState.dine[k] && DINE_BY_KEY[dpState.dine[k]] && !flatSteps.some(x => x.mealKind === k && x.sit && x.sit.key === dpState.dine[k])).length;
    return { segs, done, hops, totalWait: tw, saved, left, llps, idle, plan, miss };
  };
  let best = null;
  const consider = (plan) => {
    const r = run(plan); if (!r) return;
    // a picked sit-down meal sets where you are at that meal: plans that eat there come first, and the rides fit around it;
    // then the most rides, then less dead time (waiting for a break or for hopping to open), then fewer hops, then shorter lines
    const qi = (x) => Math.round(x.idle * 4);
    if (!best || r.miss < best.miss || (r.miss === best.miss && r.done > best.done) || (r.miss === best.miss && r.done === best.done && (qi(r) < qi(best) || (qi(r) === qi(best) && (r.hops < best.hops || (r.hops === best.hops && r.totalWait < best.totalWait - 1e-9)))))) best = r;
  };
  const search = () => PARKS.forEach((A, ai) => {
    if (dpState.start !== 'auto' && dpState.start !== A) return;
    const B = PARKS[1 - ai], cA = C[A], cB = C[B];
    if (!withBreak) {
      consider([{ park: A, to: cA.close }]);
      for (let h1 = HOP_FIRST; h1 <= cA.close - 1.5; h1 += 0.5) {
        consider([{ park: A, to: h1 }, { park: B, to: cB.close, gap: 'hop' }]);
        for (let h2 = h1 + HOP_MIN / 60 + 1.5; h2 <= cB.close - 1; h2 += 1) consider([{ park: A, to: h1 }, { park: B, to: h2, gap: 'hop' }, { park: A, to: cA.close, gap: 'hop' }]);
      }
      return;
    }
    // with a midday break at the hotel: A | break | A or B, or one hop on either side of the break
    for (let s = Math.max(cA.open + 2.5, 11); s <= Math.min(cA.close - L - 1.5, 17) + 1e-9; s += 0.5) {
      if (near && !brkNear(s)) continue;
      [A, B].forEach(P2 => {
        const c2 = C[P2];
        consider([{ park: A, to: s }, { park: P2, to: c2.close, gap: 'break' }]);
        // break, then hop to the other park later in the evening
        const O = P2 === A ? B : A;
        for (let h = s + L + 1.5; h <= C[O].close - 1 && h <= c2.close - 1; h += 1) consider([{ park: A, to: s }, { park: P2, to: h, gap: 'break' }, { park: O, to: C[O].close, gap: 'hop' }]);
      });
    }
    // hop in the morning, then break, then back to the second park
    for (let h1 = HOP_FIRST; h1 <= cA.close - 4; h1 += 0.5) {
      for (let s = h1 + HOP_MIN / 60 + 1.5; s <= Math.min(cB.close - L - 1.5, 17) + 1e-9; s += 0.5) if (!near || brkNear(s)) consider([{ park: A, to: h1 }, { park: B, to: s, gap: 'hop' }, { park: B, to: cB.close, gap: 'break' }]);
    }
  });
  if (withBreak && dpState.brkAt !== 'auto') brkFloor = Math.max(11, Number(dpState.brkAt) - 0.5);
  search();
  let brkMoved = false;
  if (!best && withBreak && dpState.brkAt !== 'auto') { near = false; brkFloor = 11; search(); brkMoved = !!best; }
  if (!best) return null;
  // spread spare time at the end of the day through the last park visit (longer meals, rest breaks)
  { const sp = run(best.plan, true); if (sp && sp.done === best.done) best = sp; }
  { const order = addLLBooking(best.segs.map(x => x.steps)); PARKS.forEach(p => { if (best.llps[p]) best.llps[p].order = order.filter(r => r.park === p); }); }
  // flatten with hop / break steps, annotate meals
  const flat = [];
  best.segs.forEach((s, i) => {
    s.steps.forEach(x => flat.push(x));
    const nx = best.segs[i + 1];
    if (!nx) return;
    const gap = nx.gapBefore === 'break'
      ? (() => { const eIn = entryInfo(nx.ctx, nx.start); return { t: s.depart, meal: `Break at your hotel (${fmtClock(s.depart + travelMin(s.park, hotelGate(s.ctx, s.depart)) / 60)} there). Leave the hotel by ${fmtClock(eIn.leave)} to be through security at the ${eIn.name} by ${fmtClock(nx.start)} (about ${eIn.sec} min in line)`, hop: true, brk: true, dur: Math.round(L * 60), to: nx.park }; })()
      : { t: s.depart, meal: `Park hop: leave ${s.park}, arrive at ${nx.park} about ${fmtClock((s.depart + nx.hopMin / 60) % 24)} (walk across the Esplanade and tap in)`, hop: true, dur: nx.hopMin, to: nx.park };
    flat.push(gap); s.hopStep = gap;
  });
  annotateMeals(flat);
  const lastSeg = best.segs[best.segs.length - 1];
  const leftAll = PARKS.flatMap(p => best.left[p]);
  // leave at close only while the park you end in still has rides to do; otherwise when the plan is done
  const leave = best.left[lastSeg.park].length ? lastSeg.ctx.close : Math.min(lastSeg.ctx.close, roundUp15(lastSeg.end));
  // picked rides left in a park the day doesn't go back to: say why
  const visited = new Set(best.segs.map(x => x.park)), lastPark = lastSeg.park;
  const whyLeft = PARKS.filter(p => p !== lastPark && best.left[p].length).map(p => `${leftList(best.left[p])} in ${p} won't fit: ${!visited.has(p) ? `the day doesn't get to ${p}` : best.hops >= 2 ? `the plan already uses 2 park hops, the most it plans in a day, and the time in ${p} runs out` : `the time in ${p} runs out before you hop`}. Move ${best.left[p].length === 1 ? 'it' : 'them'} to another day, or take something off.`).join(' ');
  const first = best.segs[0].park;
  return { hop: true, withBreak: !!withBreak, ctxs: C0, first, ctx: C0[first], segs: best.segs, flat, hops: best.hops, done: best.done, total, left: leftAll, totalWait: best.totalWait, saved: best.saved, llps: best.llps, arrive: WW[first].rope ? C0[first].open - 0.5 : C[first].open, leave, win: WW[first], brkMoved, whyLeft };
}
const planHopperBoth = (iso, D) => { const H = planHopper(iso, D, false); return { hop: true, H, Hb: dpState.brk > 0 ? planHopper(iso, D, true) : null, ctx: H.ctx }; };  function hopLL(H) {
  const m = [], s = [];
  ['Disneyland', 'California Adventure'].forEach(p => { const l = H.llps[p]; if (l) { m.push(...l.multi); s.push(...l.single); } });
  return { multi: m, single: s, set: null };
}

// live "is the day full?" line at the end of a ride chip group, redrawn on every tap.
// Chips carry data-fit="park|ride"; rides the plan couldn't fit get struck through.
let lastTap = null;
// Which unpicked rides would really fit: re-run the plan with each one added on its own (skipping closed
// rides). The planner reshuffles the whole day, so spare time alone can't say this. trial(list) re-plans
// with those rides added and says whether everything still fits.
// the pool with extra rides added, in the park's own ride order (the planner breaks ties by list order,
// so a trial has to match what a real tap would plan)
const withRides = (ctx, pool, qs) => { const add = new Set(qs.map(q => q.r)); return ctx.rides.filter(r => add.has(r) || pool.includes(r)).concat(pool.filter(r => r.lap)); };
function roomFor(ctxs, isFree, trial) {
  const free = [].concat(ctxs).flatMap(c => c.rides.filter(r => !c.closedSet.has(r.name) && isFree(c.park, r)).map(r => ({ park: c.park, r })));
  const ok = free.filter(q => trial([q])).sort((a, b) => (b.r.head - a.r.head) || (b.r.avg - a.r.avg));
  return { fit: ok.length, total: free.length, names: ok.map(q => q.r.name), keys: new Set(ok.map(q => q.park + '|' + q.r.name)), no: free.filter(q => !ok.includes(q)).map(q => q.r.name) };
}
// more: { fit, total } from roomFor, or null when not checked (then estimate from spare time)
// adv: fullAdvice() for a day that's over, or null
// glance: { text, target } a one-line summary of the plan and the element "See the plan" scrolls to
const glanceText = (leave, done, total, wait, steps, heat) => { const free = d3.sum(steps.filter(x => x.gap), x => x.dur); return [`Leave about ${fmtClock(leave % 24)}`, `${done} of ${total} rides`, `about ${wait >= 90 ? f1(wait / 60) + ' h' : Math.round(wait) + ' min'} in lines`, heat ? `${heat} h in 85°F+ heat` : '', free ? `${free} min free before a break or hop` : ''].filter(Boolean).join(' · '); };
function fitStatus(box, left, slack, freeCosts, hint, more, adv, glance) {
  const out = new Set(left.map(r => r.park + '|' + r.name));
  const nLeft = d3.rollup(left, v => v.length, r => r.park + '|' + r.name);
  const lapsFn = (pk, nm) => { const b = box.querySelector(`.qt-chip[data-fit="${CSS.escape(pk + '|' + nm)}"]`); return b ? Number(b.dataset.laps || 1) : 1; };
  box.querySelectorAll('.qt-chip[data-fit]').forEach(b => {
    const k = nLeft.get(b.dataset.fit) || 0, tot = Number(b.dataset.laps || 1);
    b.classList.toggle('nofit', k > 0 && k >= tot); b.classList.toggle('partfit', k > 0 && k < tot);
    if (k) b.title = k >= tot ? 'Not enough time for this one on this day' : `Only ${tot - k} of your ${tot} times fit on this day`;
  });
  // unpicked rides that would still fit get a tick (only when some don't, or every chip would have one)
  const tick = !left.length && more && more.fit && more.fit < more.total ? more.keys : null;
  box.querySelectorAll('.qt-chip').forEach(b => { const k = b.getAttribute('aria-pressed') === 'true' ? null : b.dataset.add || b.dataset.fit; b.classList.toggle('fits', !!(tick && k && tick.has(k))); if (tick && k && tick.has(k)) b.title = 'Would still fit on this day'; });
  const tap = lastTap; lastTap = null;
  if (!box.querySelector('.qt-chip[data-fit][aria-pressed="true"]')) return;
  const bar = document.createElement('div'); bar.className = 'qt-fit'; bar.setAttribute('role', 'status');
  if (glance && glance.text) {
    const g = document.createElement('span'); g.className = 'qt-glance'; g.append(glance.text + '.');
    if (glance.target) { const a = document.createElement('button'); a.type = 'button'; a.className = 'qt-link'; a.textContent = 'See the plan ↓'; a.addEventListener('click', () => glance.target.scrollIntoView({ behavior: 'smooth', block: 'start' })); g.append(a); }
    bar.append(g);
  }
  const lead = document.createElement('b');
  if (left.length) {
    bar.classList.add('full');
    const added = tap && tap.added ? tap.key.split('|')[1] : null;
    lead.textContent = added && out.has(tap.key) ? `No time left for ${added}. ` : added ? `Adding ${added} filled the day. ` : 'Your day is full. ';
    const many = left.length > 1;
    bar.append(lead, `${left.length} ride${many ? 's' : ''} you picked won't fit (${leftNames(left, lapsFn).join(', ')}). `);
    if (adv && adv.length) {
      const ul = document.createElement('ul'); ul.className = 'qt-fitadv';
      adv.forEach(o => { const li = document.createElement('li'); li.textContent = advLine(o); ul.append(li); });
      bar.append('Taking one of these off makes the most room:', ul);
    }
    bar.append(hint);
  } else {
    const k = more ? more.fit : freeCosts.length ? Math.max(0, Math.floor(slack * 60 / d3.mean(freeCosts))) : 0;
    if (k < 1) { bar.classList.add('tight'); lead.textContent = 'Your day is full. '; bar.append(lead, 'Everything you picked fits, but there is no time for more rides.'); }
    else if (more) {
      lead.textContent = 'Room for more. ';
      const shown = more.names.slice(0, 6), rest = more.names.length - shown.length;
      bar.append(lead, `Everything you picked fits${slack >= 0.25 ? `, with about ${f1(slack)} h to spare` : ''}. ${k === more.total ? `Any of the ${k} rides you haven't picked would still fit if you add one.` : k > more.total / 2 ? `Any ride you haven't picked would still fit if you add one, except ${more.no.join(', ')}. The ones that fit are ticked ✓ in the list.` : `${k === 1 ? 'This ride' : 'These rides'} would still fit if you add ${k === 1 ? 'it' : 'one'}: ${shown.join(', ')}${rest ? `, and ${rest} more` : ''}. ${k === 1 ? "It's" : "They're"} ticked ✓ in the list.`}`);
    }
    else { lead.textContent = `Room for about ${k} more ride${k === 1 ? '' : 's'}. `; bar.append(lead, `Everything you picked fits, with about ${f1(slack)} h to spare before close.`); }
  }
  box.append(bar);
}
