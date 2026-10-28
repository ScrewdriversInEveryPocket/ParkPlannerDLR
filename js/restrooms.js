// DLR Planner: restroom stops on plans.
// Part of the app script. The js files load in the order of their script tags in index.html (listed in CLAUDE.md).
// Restrooms from data/restrooms.js (Disney's map; island ones are left out). A step gets s.rr = { name, min } when one is
// within RR_NEAR_MIN (RR_NEAR_MUST_MIN before a long line or the walk out) of where you'll be, but only where a stop matters: before a line of RR_LINE_MIN or more, before
// leaving for a break or a hop, and otherwise when the last one was RR_EVERY_H ago. Rides use the line entrance,
// meals the restaurant, the walk out the nearer of the last ride's exit and the gate.
// (the RR_* numbers are in js/settings.js)
const RESTROOMS = (() => {
  const by = { 'Disneyland': [], 'California Adventure': [] };
  (dash.data('restrooms').data || []).forEach(r => {
    const p = [Number(r.lat), Number(r.lon)]; if (r.island === 'yes' || !by[r.park] || !isFinite(p[0]) || !isFinite(p[1])) return;
    const near = by[r.park].find(x => distM(x.p, p) < 15); // a companion restroom at the same spot
    if (near) { if (r.companion === 'yes') near.comp = true; if (near.comp && r.companion !== 'yes') near.n = r.name; return; }
    by[r.park].push({ n: r.name, p, comp: r.companion === 'yes' });
  });
  return by;
})();
function restroomNear(park, at, max = RR_NEAR_MIN, S = dpState) {
  if (!at) return null;
  let best = null, bd = Infinity;
  (RESTROOMS[park] || []).forEach(x => { const d = distM(at, x.p); if (d < bd) { bd = d; best = x; } });
  if (!best) return null;
  const min = bd * PATH_WIND / WALK_SPEED * paceWalk(S);
  return min <= max ? { name: best.n.replace(/ Companion Restroom$/, ' Restrooms'), comp: best.comp, min: Math.max(1, Math.round(min)) } : null;
}
const rrText = (rr) => `Restrooms ~${fmtDur(rr.min)} away (${rr.name}${rr.comp ? ', companion restroom too' : ''})`;
function annotateRestrooms(steps, park, start, S = dpState) {
  let last = start != null ? start : steps.length ? steps[0].t : 0, prevExit = null;
  steps.forEach(s => {
    delete s.rr;
    let at = null, must = false;
    if (s.ride && s.r) { at = lookupPlace(park, s.r.name, 'ride', 'ent'); must = !s.ll && (s.wait || 0) >= RR_LINE_MIN; }
    else if (s.mealKind && s.spot) at = s.spot.pos || null;
    else if (s.exit) must = true;
    let rr = null;
    if (s.exit) { const a = restroomNear(park, prevExit, RR_NEAR_MUST_MIN, S), b = restroomNear(park, GATE[park], RR_NEAR_MUST_MIN, S); rr = a && b ? (b.min < a.min ? b : a) : a || b; }
    else rr = restroomNear(park, at, must ? RR_NEAR_MUST_MIN : RR_NEAR_MIN, S);
    if (s.ride && s.r) prevExit = lookupPlace(park, s.r.name, 'ride', 'exit');
    else if (s.mealKind && s.spot && s.spot.pos) prevExit = s.spot.pos;
    if (!rr) return;
    if ((must && s.t - last >= RR_SOON_H) || s.t - last >= RR_EVERY_H) { s.rr = rr; last = s.t; }
  });
}

