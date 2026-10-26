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
function hotelGate(ctx, t, S = dpState) {
  const g = GC_GATE; if (!g || S.hotel !== 'gc' || ctx.park !== g.park) return null;
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
function entryInfo(ctx, t, S = dpState) {
  const g = hotelGate(ctx, t, S), min = travelMin(ctx.park, g, S), sec = secMin(ctx, t, g);
  return { g, min, sec, name: g ? g.name : GATE_NAME[ctx.park] || 'park gate', leave: t - (min + sec) / 60 };
}
const arrSub = (ctx, t, S = dpState) => { const e = entryInfo(ctx, t, S); return `Leave hotel by ${fmtClock(e.leave)} · ~${e.sec} min security (${crowdWord(ctx)})${e.g ? ' at the ' + e.g.name : ''}`; };
const backAt = (ctx, t, S = dpState) => fmtClock((t + travelMin(ctx.park, hotelGate(ctx, t, S), S) / 60) % 24);
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
// gates: { in, out }, the positions a scheduleBlock enters and leaves by (null or missing = the park's Esplanade gate)
const posOf = (park, x, end, gates) => x == null ? ((gates && (end === 'ent' ? gates.out : gates.in)) || GATE[park]) : x.pos !== undefined ? x.pos : lookupPlace(park, x.name, 'ride', end);
const distM = (a, b) => Math.hypot((a[0] - b[0]) * 111320, (a[1] - b[1]) * 111320 * Math.cos(33.81 * Math.PI / 180));

// Rough walking positions of each land, in minutes from the park's central hub (the gate is 'Entrance'),
// from data/lands.js: the fallback when a place has no location. Same-land moves take SAME_LAND_MIN.
const LAND_POS = {};
(dash.data('lands').data || []).forEach(r => { (LAND_POS[r.park] = LAND_POS[r.park] || {})[r.land] = [Number(r.map_x), Number(r.map_y)]; });
// walking speeds and the other tuning numbers are in js/settings.js; minutes are worked out at Normal pace, then scaled by the group's pace
const paceWalk = (S = dpState) => WALK_SPEED / (PACE_SPEED[S.pace] || WALK_SPEED);
// waits-vs-steps slider labels (its weights are WALK_FACTOR and WAIT_WEIGHT in js/settings.js)
const WALK_LABEL = ['shortest waits first', 'shorter waits first', 'balanced waits and steps', 'fewer steps first', 'fewest steps first'];
const walkPref = (v) => WALK_LABEL[v == null ? 2 : v];
// minutes at normal pace between two places (null = the park gate)
// walks between two places (not the gate) never change, so they're remembered per pair (the scheduler asks the same ones a lot)
const WALK_MEMO = new WeakMap();
function walkMin(park, from, to, gates) {
  if (from && to && typeof from === 'object' && typeof to === 'object') {
    let m = WALK_MEMO.get(from); if (!m) WALK_MEMO.set(from, m = new Map());
    let v = m.get(to); if (v === undefined) m.set(to, v = walkMin0(park, from, to)); return v;
  }
  return walkMin0(park, from, to, gates);
}
function walkMin0(park, from, to, gates) {
  const a = posOf(park, from, 'exit', gates), b = posOf(park, to, 'ent', gates);
  if (a && b) return Math.max(1, Math.round(distM(a, b) * PATH_WIND / WALK_SPEED));
  const la = from ? from.land : 'Entrance', lb = to ? to.land : 'Entrance';
  if (la === lb) return SAME_LAND_MIN;
  const P = LAND_POS[park] || {}, p = P[la], q = P[lb];
  if (!p || !q) return 10;
  return Math.round(Math.hypot(p[0] - q[0], p[1] - q[1]) * WALK_WIND);
}
// meals: the nearest quick-service place that serves lunch and dinner, from where you are (from the gate, that's on your way in)
function mealSpot(park, from, gates) {
  const all = Object.entries(DINING[park] || {}).flatMap(([land, xs]) => xs.filter(([, k,
          m]) => k === 'quick service' && (!m || /lunch|dinner/.test(m))).map(([n, k]) => ({ name: n, kind: k, land, pos: lookupPlace(park, n, 'food', 'mid')
        })));
  const here = from ? from.land : ENTRY_LAND[park];
  const located = all.filter(x => x.pos);
  if (located.length && posOf(park, from, 'exit', gates)) return located.reduce((b, x) => walkMin(park, from, x, gates) < walkMin(park, from, b, gates) ? x : b);
  const same = all.filter(x => x.land === here);
  return same[0] || ((DINING_NEAR[park] || {})[here] || []).map(l => all.find(x => x.land === l)).find(Boolean) || null;
}
// free time: the nearest theater, stage or character spot (night spectaculars were left out of park_places)
function showNear(park, from, gates) {
  const a = posOf(park, from, 'exit', gates), list = PLACES.shows[park] || []; if (!a || !list.length) return null;
  return list.reduce((b, e) => distM(a, e.p) < distM(a, b.p) ? e : b).n;
}
const freeText = (park, from, what, gates) => { const sh = showNear(park, from, gates); return `Free time: ${what}${sh ? ` (nearby: ${sh}; check today's times)` : ''}`; };

