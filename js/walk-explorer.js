// DLR Planner: Walking times (More menu): the walk between any two mapped spots, at each pace and crowd level.
// Part of the app script. The js files load in the order of their script tags in index.html (listed in CLAUDE.md).
// Uses the planner's own walk rules (js/walks.js, js/settings.js), so the minutes match the plans: straight-line distance
// x PATH_WIND along the paths, at the group's pace, up to WALK_BUSY_MAX slower in the busiest weeks. Rides are left by their
// exit and reached at their entrance. Between the parks the walk goes through both Esplanade gates; lines at the gates aren't counted.
const WX_PACES = [['relaxed', 'Relaxed', 'seniors or small children'], ['normal', 'Normal', 'most adults'], ['fast', 'Go-go', 'young adults']];
const WX_CROWDS = [['Quiet', 0], ['Typical', 1 / 3], ['Busy', 2 / 3], ['Very busy', 1]];
// every spot: { id, park (null for hotels), group, name, at(end) -> [lat, lon] for 'exit' (walking from) or 'ent' (walking to) }
const WX_SPOTS = (() => {
  const out = [], landOf = {};
  (dash.data('ride_profiles').data || []).forEach(r => { landOf[r.park + '|' + r.ride] = r.land; });
  Object.entries(DINING).forEach(([park, lands]) => Object.entries(lands).forEach(([land, xs]) => xs.forEach(([n]) => { landOf[park + '|food|' + n] = land; })));
  PLACES.pos.forEach((v, k) => {
    const [park, kind, name] = k.split('|'); if (kind !== 'ride' && kind !== 'food') return;
    const land = kind === 'ride' ? landOf[park + '|' + name] : landOf[park + '|food|' + name];
    out.push({ id: k, park, group: `${park} · ${kind === 'ride' ? 'Rides' : 'Restaurants'}${land ? ' · ' + land : ''}`, name,
      at: (end) => kind === 'ride' ? v[end] : v.mid });
  });
  Object.entries(PLACES.shows).forEach(([park, xs]) => xs.forEach(s => out.push({ id: park + '|show|' + s.n, park, group: `${park} · Shows and characters`, name: s.n, at: () => s.p })));
  Object.entries(RESTROOMS).forEach(([park, xs]) => xs.forEach(s => out.push({ id: park + '|rr|' + s.n, park, group: `${park} · Restrooms`, name: s.n, at: () => s.p })));
  GATE_ROWS.forEach(r => out.push({ id: 'gate|' + r.id, park: r.park, group: `${r.park} · Park gates`, name: r.name, gate: r.guests ? GC_GATE : null,
    at: () => [Number(r.lat), Number(r.lon)] }));
  Object.values(HOTELS).forEach(h => out.push({ id: 'hotel|' + h.id, park: null, hotel: h.id, group: 'Hotels', name: h.label }));
  return out.sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
})();
// fill a select with the spots whose name or group matches the filter text, keeping the choice when it still matches
function wxFill(sel, q) {
  const keep = sel.value; sel.textContent = '';
  const o0 = document.createElement('option'); o0.value = ''; o0.textContent = 'Pick a spot'; sel.append(o0);
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean); let grp = null, og = null;
  WX_SPOTS.filter(s => words.every(w => (s.name + ' ' + s.group).toLowerCase().includes(w))).forEach(s => {
    if (s.group !== grp) { grp = s.group; og = document.createElement('optgroup'); og.label = grp; sel.append(og); }
    const o = document.createElement('option'); o.value = s.id; o.textContent = s.name; og.append(o);
  });
  sel.value = keep; if (sel.value !== keep) sel.value = '';
}
// the route at Normal pace: { m: metres along the paths, min: walking minutes, fixed: minutes that don't change with pace or
// crowds (tap-in, elevators, the ART bus), via: words for the way it goes } or { err }
function wxRoute(a, b) {
  if (a.hotel && b.hotel) return { err: 'Pick a spot in a park for one end.' };
  if (a.id === b.id) return { err: 'Pick two different spots.' };
  const walkM = (p, q) => distM(p, q) * PATH_WIND;
  // a hotel end: the hotel's own walk to the park's turnstiles (data/hotels.js), then on from the gate
  if (a.hotel || b.hotel) {
    const h = HOTELS[a.hotel || b.hotel], s = a.hotel ? b : a, gc = s.park === 'California Adventure' && h.to_gc_m && GC_GATE;
    const gate = gc ? GC_GATE.pos : GATE[s.park], inPark = walkM(a.hotel ? gate : s.at('exit'), a.hotel ? s.at('ent') : gate);
    if (!h.to_dl_m) return { m: inPark, min: inPark / WALK_SPEED, fixed: Number(h.fixed_min) || 0, gates: true, via: `with the ART shuttle (about ${fmtDur(h.fixed_min)} whatever the pace), through the ${GATE_NAME[s.park]}` };
    const hm = Number(gc ? h.to_gc_m : s.park === 'California Adventure' ? h.to_dca_m : h.to_dl_m);
    return { m: hm + inPark, min: (hm + inPark) / WALK_SPEED, fixed: Number(h.lift_min) || 0, gates: true,
      via: `through the ${gc ? GC_GATE.name : GATE_NAME[s.park]}, with the hotel's own walk (elevators and hallways included)` };
  }
  if (a.park === b.park) { const m = walkM(a.at('exit'), b.at('ent')); return { m, min: Math.max(1, Math.round(m / WALK_SPEED)), fixed: 0, via: '' }; }
  // between the parks: out through this park's gate, across the Esplanade, tap in at the other
  const m = walkM(a.at('exit'), GATE[a.park]) + walkM(GATE[a.park], GATE[b.park]) + walkM(GATE[b.park], b.at('ent'));
  return { m, min: m / WALK_SPEED, fixed: 0, gates: true, via: `out through the ${GATE_NAME[a.park]}, across the Esplanade and in at the ${GATE_NAME[b.park]}` };
}
function drawWalkTimes() {
  const out = document.getElementById('wx-out'); if (!out) return;
  const get = (id) => WX_SPOTS.find(s => s.id === document.getElementById(id).value);
  const a = get('wx-from'), b = get('wx-to'); out.textContent = '';
  if (!a || !b) { out.append(Object.assign(document.createElement('p'), { className: 'qt-note', textContent: 'Pick where you start and where you’re going.' })); return; }
  const R = wxRoute(a, b);
  if (R.err) { out.append(Object.assign(document.createElement('p'), { className: 'qt-note', textContent: R.err })); return; }
  const p = document.createElement('p'); p.className = 'qt-dayinfo';
  p.textContent = `${a.name} → ${b.name}: about ${Math.round(R.m)} m (${Math.round(R.m * 3.281)} ft) along the paths${R.via ? ', ' + R.via : ''}.`;
  out.append(p);
  const t = document.createElement('table'), hd = t.createTHead().insertRow(), bd = t.createTBody(); t.className = 'qt-table';
  ['Pace'].concat(WX_CROWDS.map(c => c[0] + (c[1] ? ` (+${Math.round(c[1] * WALK_BUSY_MAX * 100)}%)` : ''))).forEach(h => { const th = document.createElement('th'); th.textContent = h; hd.append(th); });
  WX_PACES.forEach(([k, lbl, who]) => {
    const tr = bd.insertRow(), th = document.createElement('th'); th.textContent = `${lbl} (${PACE_SPEED[k]} m/min, ${who})`; th.className = 'l'; tr.append(th);
    WX_CROWDS.forEach(([, f]) => { tr.insertCell().textContent = `${fmtDur(Math.max(1, Math.round(R.min * WALK_SPEED / PACE_SPEED[k] * (1 + f * WALK_BUSY_MAX) + R.fixed)))}`; });
  });
  const wrap = document.createElement('div'); wrap.className = 'qt-tablewrap'; wrap.append(t); out.append(wrap);
  if (R.gates) out.append(Object.assign(document.createElement('p'), { className: 'qt-note', textContent: 'Going through the park gates may add time (security or tap-in lines).' }));
}
{
  const from = document.getElementById('wx-from'), to = document.getElementById('wx-to');
  if (from && to) {
    [['wx-from', 'wx-from-q'], ['wx-to', 'wx-to-q']].forEach(([s, q]) => { wxFill(document.getElementById(s), '');
      document.getElementById(q).addEventListener('input', (e) => { wxFill(document.getElementById(s), e.target.value); drawWalkTimes(); });
      document.getElementById(s).addEventListener('change', drawWalkTimes); });
    document.getElementById('wx-swap').addEventListener('click', () => {
      const qa = document.getElementById('wx-from-q'), qb = document.getElementById('wx-to-q'), va = from.value, vb = to.value;
      [qa.value, qb.value] = [qb.value, qa.value]; wxFill(from, qa.value); wxFill(to, qb.value); from.value = vb; to.value = va; drawWalkTimes();
    });
    drawWalkTimes();
  }
}
