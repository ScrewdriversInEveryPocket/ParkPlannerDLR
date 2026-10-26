// DLR Planner: walks, gates and security: park entrances, security and tap-in lines, Lightning Lane settings, ride and restaurant locations, walking times.
// Part of the app script. The js files load in the order of their script tags in index.html (listed in CLAUDE.md).
// ---------- where things are: ride, restaurant and show locations from OpenStreetMap (© OpenStreetMap
// contributors, ODbL), extracted once on Oct 25, 2026 and bundled as park_places, so planning needs no
// network. A place missing from it falls back to the rough land map below. ----------
// the turnstiles on each side of the Esplanade (data/gates.js, our own estimate; OSM doesn't name them)
const GATE_ROWS = dash.data('gates').data || [];
const GATE = Object.fromEntries(GATE_ROWS.filter(r => !r.guests).map(r => [r.park, [Number(r.lat), Number(r.lon)]]));
const GATE_NAME = Object.fromEntries(GATE_ROWS.filter(r => !r.guests).map(r => [r.park, r.name || r.park + ' gate']));
// the Grand Californian's own entrance into California Adventure (hotel guests only, hours are our estimate)
const GC_GATE = (() => { const r = GATE_ROWS.find(x => x.guests === 'Grand Californian'); return r ? {
      id: r.id, name: r.name, park: r.park, pos: [Number(r.lat), Number(r.lon)], before: Number(r.opens_before_min) || 0, after: Number(r.closes_after_min) || 0
    } : null; })();
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
const interp = (pts, x, d) => { if (!pts.length) return d; if (x <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); } return pts[pts.length - 1][1]; };
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
  return { wait: n('wait_min', 10), gap: n('gap_hours', 1), per: n('hours_per_pass', 1.75), max: n('max_multi', 7),
    rule: m.rebook_rule || 'Book the next one as soon as you use one, or 2 hours after booking.' };
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
  const all = Object.entries(DINING[park] || {}).flatMap(([land, xs]) => xs.filter(([, k,
          m]) => k === 'quick service' && (!m || /lunch|dinner/.test(m))).map(([n, k]) => ({ name: n, kind: k, land, pos: lookupPlace(park, n, 'food', 'mid')
        })));
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

