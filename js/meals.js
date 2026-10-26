// DLR Planner: meals: restaurants by land, sit-down picks and booking tips, meal stops near the next ride.
// Part of the app script. The js files load in the order of their script tags in index.html (listed in CLAUDE.md).
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
const sitMin = (r, S = dpState) => (r.kind === 'lounge' ? LOUNGE_MIN : SIT_MIN) + (S.pace === 'relaxed' ? SIT_PACE_MIN : S.pace === 'fast' ? -SIT_PACE_MIN : 0);
const addDaysISO = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const fmtDay = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
// what to tell people about a picked restaurant: when to book, or the walk-up list
function dineTip(r, iso, t) {
  if (!r) return '';
  const at = fmtClock(Math.round(t * 4) / 4);
  if (r.book) {
    const open = addDaysISO(iso, -BOOK_DAYS);
    return `${open <= todayISO() ? `Book it now in the Disneyland app (reservations for this date are already open)` :
      `Book it in the Disneyland app on ${fmtDay(open)} at about 6 am, when reservations open ${BOOK_DAYS} days ahead`}, for about ${at}.${r.walkup ?
      ' No booking? Join the walk-up list in the app on the day, an hour or two ahead.' : ''}`;
  }
  if (r.walkup) return `Walk-up only: join the list in the Disneyland app about an hour before${r.note && /standby/i.test(r.note) ? ', or wait in the standby line' : ''}.`;
  return 'No booking needed for lunch or dinner: just turn up.';
}
// every sit-down meal picked on the wizard's days that needs booking, earliest booking first
function tripBookings(pd) {
  const out = [];
  pd.forEach((x, k) => { const d = wz.days && wz.days[x.iso]; if (!d || !d.dine) return; ['lunch', 'dinner'].forEach(m => { const r = DINE_BY_KEY[d.dine[m]];
          if (r && x.opt.parks.includes(r.park)) out.push({ r, meal: m, iso: x.iso, n: k + 1, open: addDaysISO(x.iso, -BOOK_DAYS) }); }); });
  return out.sort((a, b) => a.iso.localeCompare(b.iso));
}
const bookingLine = (b) => `${b.r.name}, ${b.meal} on Day ${b.n} (${fmtDay(b.iso)}): ${b.r.book ? (b.open <= todayISO() ?
    'book now in the Disneyland app, reservations are open' : `book in the Disneyland app on ${fmtDay(b.open)} at about 6 am`) + (b.r.walkup ?
    '; walk-up list on the day if you miss it' : '') : b.r.walkup ? 'walk-up list only: join it in the app on the day' : 'no booking needed'}.`;
const dineSpot = (park, name) => ({ name, kind: 'table service', land: (DINE_BY_KEY[park + '|' + name] || {}).land, pos: lookupPlace(park, name, 'food', 'mid'), sit: DINE_BY_KEY[park + '|' + name] });
// the restaurant picked for a meal on this day, if it's in this park
const dinePicked = (park, kind, S = dpState) => { const k = S.dine && S.dine[kind]; if (!k) return null; const [p, n] = k.split('|'); return p === park && DINE_BY_KEY[k] ? dineSpot(p, n) : null; };
// picked meals that didn't make it into the plan, and why: the restaurant is in a park the day doesn't visit ('park'),
// you're in the other park at that meal ('where'), it didn't fit ('fit'), or the plan has no such meal ('none')
function dineIssues(steps, parks, S = dpState) {
  const out = [];
  ['lunch', 'dinner'].forEach(kind => {
    const k = S.dine && S.dine[kind]; if (!k || !DINE_BY_KEY[k]) return;
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
  if (x.why === 'where') return `${Meal} at ${r.name} is in ${r.park}, but no plan for this day gets you there at ${x.kind} time with all your rides, ` +
    `so ${x.kind} is in ${x.at}. Try fewer rides, or pick a ${x.at} restaurant.`;
  if (x.why === 'none') return `There's no ${x.kind} in this plan, so ${r.name} isn't used.`;
  return `${Meal} at ${r.name} (${r.park}) didn't fit in this plan, so it eats somewhere nearer. Try fewer rides, or pick it for a different meal or day.`;
}
function dineMiss(steps, parks, S = dpState) { return dineIssues(steps, parks, S).map(x => dineIssueText(x, parks)).join(' '); }
// the note under a plan, with a way out when the restaurant is in a park the day doesn't visit:
// hop (when the ticket allows it) or pick a restaurant in this park instead. opts.S: the settings whose meals to check (default dpState). Picked chips that missed get a ⚠.
function dineNote(el, steps, parks, opts) {
  const xs = dineIssues(steps, parks, opts.S); el.textContent = ''; el.hidden = !xs.length;
  xs.forEach(x => {
    const line = document.createElement('span'); line.textContent = dineIssueText(x, parks) + ' '; el.append(line);
    if (x.why !== 'park') return;
    const btn = (t, f) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'qt-link'; b.textContent = t;
      b.style.marginRight = 'var(--cds-gap-sm)'; b.addEventListener('click', f); el.append(b); };
    if (opts.hop) btn(`Add a hop for ${x.kind}`, () => opts.hop(x));
    else if (opts.noHop) el.append(document.createTextNode(opts.noHop + ' '));
    btn(`Pick a ${parks.length === 1 ? parks[0] + ' ' : ''}restaurant instead`, () => opts.clear(x));
  });
  if (opts.chips) opts.chips.querySelectorAll('.qt-chip.dine').forEach(c => {
    const x = xs.find(y => y.r.key === c.dataset.key); c.classList.toggle('miss', !!x);
    if (x && !c.querySelector('.dmiss')) { const w = document.createElement('span'); w.className = 'dmiss';
      w.textContent = x.why === 'where' ? ` ⚠ you're in ${x.at} at ${x.kind}` : ' ⚠ not in the plan'; c.insertBefore(w, c.querySelector('.ri'));
      c.title = dineIssueText(x, parks); }
  });
  return xs;
}
// a plan as parts in time order, [{ park, start, steps }]: a Park Hopper plan's own parts (the one with the break when the
// group takes one), the morning and evening around a break, or the whole day
function planSegs(P, park, S = dpState) {
  if (P.segs) return P.segs;
  if (P.hop) return ((S.brk > 0 && P.Hb) || P.H).segs;
  if (P.split) return [{ park, start: P.split.arrive, steps: P.split.morning.steps }, { park, start: P.split.ret, steps: P.split.evening.steps }];
  return [{ park, start: P.stay.arrive, steps: P.stay.plan.steps }];
}
// where a plan has you at lunch and at dinner: { lunch: { park, pos }, dinner: { park, pos } }. The plan's own meal when it has one;
// otherwise the park you're in around 12:30 and 6:30 pm, near the ride closest to that time. pos is null when there's no map point.
function mealWhere(segs) {
  if (!segs || !segs.length) return null;
  const at = (kind, t) => {
    for (const s of segs) { const m = s.steps.find(x => x.mealKind === kind); if (m) return { park: m.park || s.park, pos: (m.spot && m.spot.pos) || null }; }
    const seg = segs.filter(s => s.start <= t + 1e-9).pop() || segs[0];
    const near = seg.steps.filter(x => x.ride && x.r).sort((a, b) => Math.abs(a.t - t) - Math.abs(b.t - t))[0];
    return { park: seg.park, pos: near ? lookupPlace(seg.park, near.r.name, 'ride', 'exit') : null };
  };
  return { lunch: at('lunch', 12.5), dinner: at('dinner', 18.5) };
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
    if (items.length) out.push({ where: `${label}, ${r.name} (${r.land}${prev && next && prev.park !== next.park ? ', ' + (r.park === 'Disneyland' ?
            'Disneyland' : 'California Adventure') : ''})`, items });
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

