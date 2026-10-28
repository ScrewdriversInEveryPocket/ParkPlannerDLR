// DLR Planner: the scheduler: break timing, free time, advice when rides don't fit, Lightning Lane bookings, planning a day.
// Part of the app script. The js files load in the order of their script tags in index.html (listed in CLAUDE.md).
// break start s fits the group's "Break around" choice (within half an hour of it), or any time on auto
const brkNear = (s, at = dpState.brkAt) => at == null || at === 'auto' || Math.abs(s - Number(at)) <= BREAK_NEAR_H + 1e-9;
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
    b.steps.splice(b.steps.length - 1, 0, { t: ex.t,
        meal: `Free time: about ${fmtDur(min)} ${why}. ${fits.length ? `To use it, add a ride here, such as ${fits.join(', ')}.` :
          'Catch a show, grab a snack or shop.'}`, dur: min, free: true, gap: true });
  }
  ex.t += gap; b.end = until;
}
// when picked rides don't fit: the picked rides that take the most time, and what taking each one off makes room for.
// drop(park, name) re-plans the day without that ride and returns what's still left over.
function* fullAdvice(steps, left, drop) {   // a generator, like roomFor: one re-plan per step
  if (!left.length) return null;
  const c = new Map();
  steps.forEach(x => { if (!x.ride || !x.r) return; const k = x.r.park + '|' + x.r.name; const o = c.get(k) || { park: x.r.park, name: x.r.name, min: 0, n: 0
      }; o.min += (x.wait || 0) + x.r.rmin; o.n++; c.set(k, o); });
  const count = (L) => d3.rollup(L, v => v.length, r => r.park + '|' + r.name), before = count(left);
  // try the 5 biggest time users, then show the 3 that make the most room (ties: the one taking more time)
  const tried = [];
  for (const o of [...c.values()].sort((a, b) => b.min - a.min).slice(0, 5)) {
    const after = count(drop(o.park, o.name)), k0 = o.park + '|' + o.name;
    const now = [...before].filter(([k, n]) => k !== k0 && (after.get(k) || 0) < n).map(([k]) => k.split('|')[1]);
    tried.push(Object.assign(o, { all: ![...after.keys()].some(k => k !== k0), now }));
    yield;
  }
  return tried.sort((a, b) => ((b.all ? 99 : b.now.length) - (a.all ? 99 : a.now.length)) || (b.min - a.min)).slice(0, 3);
}
const advLine = (o) => `${o.name}${o.n > 1 ? ` (all ${o.n} times)` : ''}: about ${fmtDur(Math.round(o.min))} in line and riding. ${o.all ?
  'Taking it off makes room for everything else.' : o.now.length ? `Taking it off makes room for ${o.now.join(', ')}.` :
  "Taking it off isn't enough on its own."}`;
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
  const insertAt = (st) => { for (const L of lists) { const i = L.findIndex(x => x.t > st.t); if (i >= 0) {
        if (i === 0 && L !== lists.find(M => M.length)) st.t = Math.max(st.t, L[0].t - (L[0].walk || 0) / 60); L.splice(i, 0, st); return; }
    } const last = [...lists].reverse().find(L => L.length) || lists[0]; last.push(st); };
  const first = lists.find(L => L.length), t0 = first[0].t - (first[0].walk || 0) / 60;
  first.splice(0, 0, book(t0, `📱 In the Disneyland app: book your first Lightning Lane, ${uses[0].x.r.name}, as soon as you tap in. Take the next return time it offers.`));
  let lastBook = t0;
  uses.forEach((u, k) => {
    const nx = uses[k + 1]; if (!nx) return;
    // you may book the next one once you've scanned in for this one, or 2 hours after your last booking, whichever comes first
    const used = u.x.t + 1 / 60, two = lastBook + 2;
    const t = Math.min(used, two);
    const st = book(t, t < used - 1e-9 ? `📱 Book your next Lightning Lane, ${nx.x.r.name}: it's been 2 hours since your last booking.` :
      `📱 Book your next Lightning Lane, ${nx.x.r.name}, now that you've scanned in for ${u.x.r.name}.`);
    insertAt(st); lastBook = st.t;
  });
  return uses.map(u => u.x.r);
}
// When the list is done well before the end, plan it again with the spare time spread through the day:
// meals up to 20 min longer and 20 to 30 min rest breaks. Kept only if every ride still fits.
// Then, with SPREAD_SPARE_MIN or more still to spare, rides may also wait for a quieter or more comfortable hour (spreadTry).
function scheduleSpread(ctx, start, end, pool, opts) {
  const m0 = opts.meals && Object.assign({}, opts.meals), s0 = opts.seen && new Map(opts.seen);
  const b = scheduleBlock(ctx, start, end, pool, opts), spare = (end - b.end) * 60;
  if (b.left.length || spare < 45) return b;
  let keep = { b, pad: {} };
  const m1 = m0 && Object.assign({}, m0), s1 = s0 && new Map(s0);
  const pad = { meal: Math.min(20, Math.round(spare / 6)), rest: spare >= 150 ? 30 : spare >= 90 ? 20 : 0 };
  const b2 = scheduleBlock(ctx, start, end, pool, Object.assign({}, opts, { pad, meals: m1, seen: s1 }));
  if (!b2.left.length && b2.end <= end + 1e-9) keep = { b: b2, pad, meals: m1, seen: s1 };
  keep = spreadTry(ctx, start, end, pool, opts, keep.b, keep.pad, m0, s0) || keep;
  spreadKeep(opts, keep);
  return keep.b;
}
// the meals eaten and rides done by the plan kept, for the next block of the day (opts.meals and opts.seen are shared)
function spreadKeep(opts, keep) {
  if (opts.meals && keep.meals) Object.assign(opts.meals, keep.meals);
  if (opts.seen && keep.seen) { opts.seen.clear(); keep.seen.forEach((v, k) => opts.seen.set(k, v)); }
}
// A light day: plan block b again, letting each ride wait for a quieter or more comfortable hour when there's
// SPREAD_SPARE_MIN or more to spare (pad.spread in scheduleBlock). m0 / s0: copies of opts.meals and opts.seen from
// before b was planned. The new plan is kept only if it has a wait in it, every ride still fits, no meal b has or wanted
// meal b meets is lost, and, at the two fewest-steps settings, it walks at most SPREAD_WALK_MAX more.
// Returns { b, pad, meals, seen } to keep, or null to keep b.
function spreadTry(ctx, start, end, pool, opts, b, pad, m0, s0) {
  const spare = (end - b.end) * 60, S = opts.S || dpState;
  if (b.left.length || spare < SPREAD_SPARE_MIN) return null;
  const m1 = m0 && Object.assign({}, m0), s1 = s0 && new Map(s0), p = Object.assign({}, pad, { spread: spare });
  const x = scheduleBlock(ctx, start, end, pool, Object.assign({}, opts, { pad: p, meals: m1, seen: s1 }));
  if (!x.spread || x.left.length || x.end > end + 1e-9) return null;
  const has = new Set(x.steps.map(s => s.mealKind)), missed = new Set(mealsWanted(b.steps, S));
  if (b.steps.some(s => s.mealKind && !has.has(s.mealKind)) || mealsWanted(x.steps, S).some(k => !missed.has(k))) return null;
  if ((S.walk == null ? 2 : S.walk) >= 3 && x.walked > b.walked * (1 + SPREAD_WALK_MAX) + 1e-9) return null;
  return { b: x, pad, meals: m1, seen: s1 };
}
// opts.S: the settings to plan with (default: Plan a day's dpState); opts.gateIn / gateOut: the gates the block enters and leaves by
function scheduleBlock(ctx, start, end, pool, opts) {
  const S = opts.S || dpState, gates = { in: opts.gateIn ? opts.gateIn.pos : null, out: opts.gateOut ? opts.gateOut.pos : null };
  let t = start, prev = null; const steps = []; const left = pool.slice();
  // opts.meals is shared across the park segments of a hopper day so each meal happens once
  const eaten = opts.meals || { lunch: !opts.lunch, dinner: !opts.dinner }; let totalWait = 0, saved = 0, lastRest = start, lastLL = -9;
  // opts.hold: meals this block leaves for later (on a Park Hopper day, a restaurant picked in the other park, which a later visit goes to)
  const done = (k) => eaten[k] || !!(opts.hold && opts.hold[k]);
  // repeat rides: opts.seen (shared across a day's park segments) holds when each ride was last finished and how
  // many times it's been done; unless back to back is allowed, the next time waits an hour after the last one
  const seen = opts.seen || new Map(), REP_GAP = 1;
  // lunch from 11:45 as a rule, or from 11 when a hotel break starts by 1 pm, so it still fits before you leave
  const earlyLunch = opts.exit === 'break' && end <= 13 + 1e-9 ? 11 : 11.75;
  // meal times the group chose (S.lunchAt / S.dinnerAt; 'auto' = whenever fits): the meal starts within half an hour of
  // that time, never lunch before 11, and the rides fit around it. null = no chosen time, the rules below as before.
  const want = { lunch: mealWin(S, 'lunch'), dinner: mealWin(S, 'dinner') };
  // meals the group wants in the park: a restaurant picked for it in this park, or a time set for it. At the end of the day
  // these always happen: the day runs on to them with free time instead of leaving early (see the tail below).
  const keen = { lunch: !!(want.lunch || dinePicked(ctx.park, 'lunch', S)), dinner: !!(want.dinner || dinePicked(ctx.park, 'dinner', S)) };
  const blocked = (r, t) => (!S.b2b && seen.has(r.name) && t < seen.get(r.name).end + REP_GAP) || (r.meetFrom != null && t < r.meetFrom) || (r.meetTo != null && t + 0.5 > r.meetTo);
  // group pace: relaxed adds rest breaks, longer meals and slower walking; go-go does the opposite
  // walking speed by group pace, a little slower again on the busiest weeks
  const pace = S.pace, walkMult = paceWalk(S) * (ctx.walkBusy || 1);
  // before a hotel break or a hop, leave time to walk from the last stop to the gate
  const exitMin = (x) => opts.exit && x ? walkMin(ctx.park, x, null, gates) * walkMult : 0;
  // opts.pad: spare time spread through the day as longer meals and rest breaks (see scheduleSpread)
  const pad = opts.pad || {};
  // pad.spread: minutes to spare on a light day (see spreadTry). A ride that's a lot better at a later hour is put off until
  // then (later: ride -> { at, why }; each ride at most once), and the other rides and meals go on as usual. When only
  // put-off rides are left, the plan has free time until the first of them.
  const spreading = !!pad.spread, later = new Map();
  const waiting = (r, at) => later.has(r) && later.get(r).at > at + 1e-9;
  // the start of the next meal still to come (free time stops there, so the meal happens as usual)
  const mealNext = () => d3.min(['lunch', 'dinner'].filter(k => !done(k)).map(k => want[k] ? want[k].from : k === 'lunch' ? (opts.lunchFrom || earlyLunch) : 17.5)
    .filter(at => at > t + 1e-9)) ?? Infinity;
  // free time until `until`, waiting for put-off ride r; free time back to back stays one block
  const spreadFree = (until, r) => {
    const txt = freeText(ctx.park, prev, `catch a show, grab a snack or shop. ${r.name} comes later, when ${later.get(r).why}`, gates), last = steps[steps.length - 1];
    if (last && last.spread && Math.abs(last.t + last.dur / 60 - t) < 1 / 60) Object.assign(last, { meal: txt, dur: Math.round((until - last.t) * 60) });
    else if (until - t >= 5 / 60) steps.push({ t, meal: txt, dur: Math.round((until - t) * 60), free: true, spread: true });
    t = until; lastRest = t;
  };
  // a ride's wait at that time plus its weather, in minutes, to compare one hour with another (SPREAD_* in js/settings.js)
  const feelMin = (c, at) => { const w = wxAt(ctx, at), x = c.r.expo; let m = c.wait;
    if (w.feels >= 85) m += SPREAD_HEAT_MIN[x] || 0;
    if (w.rain >= 8) m += SPREAD_RAIN_MIN[x] || 0;
    if (c.r.wet && w.feels < 68) m += SPREAD_COLD_WET_MIN;
    return m; };
  const restBreaks = pace === 'relaxed' || (pace === 'normal' && opts.relaxed) || !!pad.rest, restMin = pad.rest || 20;
  const mealMin = (pace === 'relaxed' ? 50 : pace === 'fast' ? 30 : (opts.relaxed ? 45 : 40)) + (pad.meal || 0);
  // before a break or a hop, everything has to be done by `end` (no few-minute overrun past the break time)
  const tol = opts.exit ? 0 : 0.05;
  let afterMeal = false; // the first walk after a meal counts double, so the plan doesn't cross the park straight after eating
  const LOOK_WIDTH = 6, LOOK_WEIGHT = 0.6, wv = S.walk == null ? 2 : S.walk, walkW = WALK_WEIGHT * WALK_FACTOR[wv], waitW = WAIT_WEIGHT[wv];
  // a later visit to this park the same day (opts.later: [[from, to], ...] hours) counts as later too: each ride's shortest wait then
  const later2 = opts.later && opts.later.length ? opts.later : null, laterMin = new Map();
  const laterW = (r, hw) => { let m = laterMin.get(r); if (m === undefined) { m = Infinity;
      for (const [a, b] of later2) for (let hh = Math.ceil(a); hh < Math.min(24, b); hh++) m = Math.min(m, hw[hh]); laterMin.set(r, m); } return m; };
  // cost of riding r next at time t, coming from land `from` (null = the gate); lower is better
  const rideCost = (r, t, from, lastLL) => {
    const w = wxAt(ctx, t);
    const isLL = opts.ll && opts.ll.has(r) && (r.ll === 'Single Pass' || t >= lastLL + LL.gap);
    const hw = hourWaits(ctx, r), standby = hw[Math.max(0, Math.min(24, Math.floor(t)))];
    const wait = isLL ? LL.wait : standby;
    let minW = standby; for (let hh = Math.floor(t) + 1; hh < Math.min(24, end); hh++) minW = Math.min(minW, hw[hh]);
    if (later2) minW = Math.min(minW, laterW(r, hw));
    let score = isLL ? 1.0 + (t < ctx.open + 1 ? 0.6 : 0) - Math.min(0.3, standby / 200) : standby / Math.max(minW, 5);
    if (w.feels >= 85) score += r.expo === 'Outdoor' ? 0.3 : r.expo === 'Mixed' ? 0.12 : -0.08;
    if (w.rain >= 8) score += r.expo === 'Outdoor' ? 0.25 : r.expo === 'Mixed' ? 0.1 : 0;
    if (r.wet && w.feels < 68) score += 0.25;
    if (r.head) score -= 0.05;
    score += waitW * wait;
    const wm = walkMin(r.park, from, r, gates);
    score += walkW * wm * (afterMeal ? 2 : 1);
    const walk = ((from == null ? GATE_EXTRA_MIN : MOVE_EXTRA_MIN) + wm) * walkMult;
    const dur = walk + wait + r.rmin;
    if (t + (dur + exitMin(r)) / 60 > end + tol) return null;
    return { r, wait, score, walk, walkOnly: wm * walkMult, dur, isLL, standby, feels: w.feels };
  };
  let walked = 0;
  // walk to the nearest quick-service place, eat, and carry on from there
  // a restaurant picked for this meal (sit-down or walk-up list) takes the place of the nearest quick-service spot, and about an hour
  const mealLen = (kind) => { const ps = kind && dinePicked(ctx.park, kind, S); return ps ? sitMin(ps.sit, S) + (pad.meal || 0) : mealMin; };
  const mealFits = (from, kind) => { const ps = kind && dinePicked(ctx.park, kind, S), sp = ps || mealSpot(ctx.park, from, gates), len = mealLen(kind);
    const w = sp ? walkMin(ctx.park, from, sp, gates) * walkMult : 0; return { sp, w, len, ok: t + (w + len + exitMin(sp || from)) / 60 <= end + tol }; };
  const eat = (kind, m) => {
    const lbl = kind === 'lunch' ? 'Lunch' : 'Dinner', at = t + m.w / 60, sit = m.sp && m.sp.sit;
    const qs = !sit && m.sp && (dash.data('dining').data || []).find(r => r.park === ctx.park && r.name === m.sp.name);
    steps.push({ t: at, meal: m.sp ? `${lbl} at ${m.sp.name}` : lbl, mealKind: kind, park: ctx.park, dur: m.len || mealMin, spot: m.sp,
        walk: Math.round(m.w), sit, tip: sit ? dineTip(sit, ctx.iso,
          at) : qs && qs.mobile_order === 'yes' ? 'Mobile order in the Disneyland app about 30 min ahead to skip the line.' : '' });
    walked += m.w; t += (m.w + (m.len || mealMin)) / 60; eaten[kind] = true; lastRest = t; if (m.sp) prev = m.sp; afterMeal = true;
  };
  while (left.length && t < end - 0.1) {
    // meals are always in the park, never during the hotel break: lunch waits for the return if it won't fit before leaving
    const inWin = (k) => t >= want[k].from - 1e-9 && t <= want[k].to + 1e-9;
    if (!done('lunch') && (want.lunch ? inWin('lunch') : t >= (opts.lunchFrom || earlyLunch) && t < (opts.lunchBy || 14.5))) { const m = mealFits(prev, 'lunch'); if (m.ok) { eat('lunch', m); continue; } }
    if (!done('dinner') && (want.dinner ? inWin('dinner') : t >= 17.5 && t < (opts.dinnerBy || 20))) { const m = mealFits(prev, 'dinner'); if (m.ok) { eat('dinner', m); continue; } }
    if (restBreaks && t - lastRest >= 1.25 && t < end - 0.75) { const hot = wxAt(ctx, t).feels >= 82; steps.push({
          t, meal: hot ? 'Rest break: something cold in the shade or an indoor show' : 'Rest break: snack, sit down or catch a show', dur: restMin });
      t += restMin / 60; lastRest = t; continue; }
    // Pick the next ride by its own cost plus the cheapest ride that could follow it (one-ride look-ahead),
    // so the plan doesn't hop across the park for a small gain and then hop back.
    // before an early break, keep room to eat lunch in the park before leaving
    // (and before any break at all, keep room for the walk to lunch, lunch and the walk out (about 22 min of walking), since there's no lunch at the hotel)
    const lunchFrom0 = want.lunch ? null : opts.lunchFrom || (opts.exit === 'break' ? earlyLunch : null);
    // a chosen meal time this block can hold: rides must be done by the end of its half hour
    const due = ['lunch', 'dinner'].filter(k => want[k] && !done(k) && t <= want[k].to + 1e-9 && end - mealLen(k) / 60 >= want[k].from - 1e-9);
    const lunchLatest = end - (mealLen('lunch') + (opts.exit === 'break' ? 22 : 0)) / 60, lunchDue = !done('lunch') && lunchFrom0 && lunchLatest >= lunchFrom0 - 0.01;
    const cands = left.filter(r => !blocked(r, t) && !waiting(r, t)).map(r => rideCost(r, t, prev, lastLL)).filter(c => c && (!lunchDue || t + c.dur / 60 <= lunchLatest + 0.01) &&
      due.every(k => t + c.dur / 60 <= want[k].to + 0.01)).sort((a, b) => a.score - b.score);
    // a light day: nothing can go now but rides put off for a later hour: free time until the first of them (or the next meal)
    if (!cands.length && left.some(r => waiting(r, t))) {
      const first = d3.least(left.filter(r => waiting(r, t)), r => later.get(r).at), next = Math.min(later.get(first).at, mealNext());
      if (next < end - 0.1) { spreadFree(next, first); continue; }
    }
    // only repeats that are too soon, or character meets not started yet, are left: fill the gap until the next one may go
    if (!cands.length && left.length && left.every(r => blocked(r, t))) {
      const next = d3.min(left, r => r.meetTo != null && t + 0.5 > r.meetTo ? Infinity : Math.max(seen.has(r.name) && !S.b2b ?
          seen.get(r.name).end + REP_GAP : t, r.meetFrom != null ? r.meetFrom : t));
      if (next < end - 0.1 && next > t) { steps.push({
            t, meal: freeText(ctx.park, prev, 'catch a show, grab a snack or shop', gates), dur: Math.round((next - t) * 60), free: true }); t = next; lastRest = t;
        continue; }
      break;
    }
    // nothing else fits before a chosen meal time: wait for it with free time, then eat
    if (!cands.length && due.length) {
      const k = due[0], t0 = t, at = Math.max(t, want[k].from); t = at; const m = mealFits(prev, k);
      if (!m.ok) { t = t0; break; }
      if (at - t0 >= 5 / 60) steps.push({ t: t0, meal: freeText(ctx.park, prev, 'catch a show, grab a snack or shop', gates), dur: Math.round((at - t0) * 60), free: true });
      eat(k, m); continue;
    }
    // nothing else fits before lunch has to happen: eat now, but never before 11 (wait with free time if needed)
    if (!cands.length && lunchDue && t >= lunchFrom0 - 1) {
      const t0 = t, at = Math.max(t, 11); t = at; const m = mealFits(prev, 'lunch');
      if (!m.ok) { t = t0; break; }
      if (at - t0 >= 5 / 60) steps.push({ t: t0, meal: freeText(ctx.park, prev, 'catch a show, grab a snack or shop', gates), dur: Math.round((at - t0) * 60), free: true });
      eat('lunch', m); continue;
    }
    let best = null, bestTotal = Infinity;
    for (const c of cands.slice(0, LOOK_WIDTH)) {
      const t2 = t + c.dur / 60, ll2 = c.isLL && c.r.ll !== 'Single Pass' ? t : lastLL;
      let follow = 0;
      if (left.length > 1 && t2 < end - 0.1) {
        let f = null; for (const r2 of left) { if (r2 === c.r || (!S.b2b && r2.name === c.r.name) || waiting(r2, t2)) continue;
          const c2 = rideCost(r2, t2, c.r, ll2); if (c2 && (!f || c2.score < f.score)) f = c2; }
        follow = f ? f.score : 0;
      }
      const total = c.score + LOOK_WEIGHT * follow;
      if (total < bestTotal - 1e-9 || (Math.abs(total - bestTotal) < 1e-9 && best && c.r.avg > best.r.avg)) { best = c; bestTotal = total; }
    }
    if (!best) break;
    // a light day: if this ride is a lot better at a later hour (a shorter line, or better weather for it), put it off until
    // that hour and pick again. Only on the hour (waits and weather change by the hour), never a Lightning Lane ride, and
    // never for an hour within SPREAD_RESERVE_MIN of the end (if it then doesn't fit, spreadTry keeps the packed plan).
    if (spreading && !best.isLL && !later.has(best.r)) {
      const tMax = end - 0.1 - SPREAD_RESERVE_MIN / 60;
      const now = feelMin(best, t), need = Math.max(SPREAD_GAIN_MIN, SPREAD_GAIN_PCT * now) - 1e-9; let pick = null, gain = need;
      for (let h = Math.floor(t) + 1; h <= tMax + 1e-9; h++) {
        if (blocked(best.r, h)) continue;
        const c = rideCost(best.r, h, prev, lastLL);
        if (!c || c.isLL) continue;
        // the hour that saves the most, as long as it saves enough for how long the ride is put off
        const g = now - feelMin(c, h); if (g > gain && g >= SPREAD_GAIN_PER_H * (h - t) - 1e-9) { gain = g; pick = { h, c }; }
      }
      if (pick) {
        const r = best.r, w0 = wxAt(ctx, t), w1 = wxAt(ctx, pick.h);
        const why = (best.wait - pick.c.wait) * 2 >= gain ? 'its line is usually shorter' : r.expo === 'Indoor' ? "it's indoors, out of the heat" :
          w0.rain >= 8 && w1.rain < 8 ? 'rain is less likely' : r.wet && w0.feels < 68 ? "it's warmer for a wet ride" : "it's cooler";
        later.set(r, { at: pick.h, why });
        continue;
      }
    }
    walked += best.walkOnly;
    const nth = (seen.has(best.r.name) ? seen.get(best.r.name).n : 0) + 1;
    steps.push({ t: t + best.walk / 60, ride: best.r.name + (nth > 1 ? ` (${ORD[nth] || nth + 'th'} time)` : ''), wait: best.wait, r: best.r,
        feels: best.feels, ll: best.isLL, standby: best.standby, walk: Math.round(best.walk) });
    afterMeal = false;
    seen.set(best.r.name, { n: nth, end: t + best.dur / 60 });
    if (best.isLL && best.r.ll !== 'Single Pass') lastLL = t; totalWait += best.wait; saved += best.isLL ? Math.max(0, best.standby - best.wait) : 0; t += best.dur / 60; prev = best.r;
    left.splice(left.indexOf(best.r), 1);
  }
  // the list is done before the end of the day, or before the hotel break: lunch (and dinner) still happen in the park before you leave
  // A meal the group wants (keen) is tried even with rides left over, and waits as long as it takes (with free time first);
  // before a break, one that doesn't fit by then goes after the break instead. Before a park hop only a meal the group wants
  // waits like this (other meals are eaten before hopping, as the day goes).
  const tailAll = opts.tail || opts.exit === 'break', keenLeft = ['lunch', 'dinner'].some(k => keen[k] && !done(k));
  if ((tailAll && (!left.length || keenLeft)) || (opts.exit === 'hop' && keenLeft)) {
    const meal = (kind, from, by, maxWait) => {
      if (done(kind) || t >= by || ((left.length || !tailAll) && !keen[kind])) return;
      if (keen[kind]) maxWait = Infinity;
      const t0 = t, at = Math.max(t, from); if (at - t0 > maxWait) return;
      t = at; const m = mealFits(prev, kind); if (!m.ok) { t = t0; return; }
      if (at - t0 >= 5 / 60) steps.push({ t: t0, meal: freeText(ctx.park, prev, 'catch a show, grab a snack or shop', gates), dur: Math.round((at - t0) * 60), free: true });
      eat(kind, m);
    };
    if (want.lunch) meal('lunch', want.lunch.from, want.lunch.to + 0.01, 4); else meal('lunch', opts.exit === 'break' ? (opts.lunchFrom || earlyLunch) : 11.5,
        keen.lunch ? Math.max(14.5, opts.lunchBy || 0) : 14.5, 1.5);
    if (want.dinner) meal('dinner', want.dinner.from, want.dinner.to + 0.01, 4); else if (t >= 16.5 || keen.dinner) meal('dinner', 17.5, 20.5, 1);
  }
  if (opts.exit && prev) { const w = exitMin(prev); steps.push({
        t, meal: `Walk to the ${opts.gateOut ? opts.gateOut.name : ctx.park + ' exit'} (~${fmtDur(Math.max(1, Math.round(w)))})`, dur: Math.max(1, Math.round(w)),
        exit: true }); walked += w; t += w / 60; }
  return { steps, end: t, totalWait, left, saved, walked, last: prev, spread: later.size };
}
// a chosen meal time as the half hour either side of it ({ from, to }), or null for whenever fits; lunch never before 11
const mealAtOf = (S, k) => { const v = S[k + 'At']; return v == null || v === 'auto' || v === '' ? null : Number(v); };
// (to leaves a quarter hour for the walk to the restaurant, so you sit down within the half hour)
const mealWin = (S, k) => { const T = mealAtOf(S, k); return T == null ? null : { from: Math.max(k === 'lunch' ? 11 : 0, T - 0.5), to: T + 0.25 }; };
// chosen meal times a plan's steps miss (no such meal, or not within half an hour of the time)
const mealMisses = (steps, S) => ['lunch', 'dinner'].filter(k => { const T = mealAtOf(S, k); if (T == null) return false;
  const m = steps.find(x => x.mealKind === k); return !m || Math.abs(m.t - T) > 0.6; });
// restaurants picked for a meal with no set time that a plan's steps have no such meal for at all
const mealsLost = (steps, S) => ['lunch', 'dinner'].filter(k => mealAtOf(S, k) == null && S.dine && S.dine[k] && DINE_BY_KEY[S.dine[k]] &&
  !steps.some(x => x.mealKind === k));
// meals the group wants that a plan misses: chosen times missed, then picked restaurants with no such meal
const mealsWanted = (steps, S) => mealMisses(steps, S).concat(mealsLost(steps, S));
const roundUp15 = (t) => Math.ceil(t * 4) / 4;
const roundDn15 = (t) => Math.floor(t * 4) / 4;

// The Lightning Lane picks only depend on the park's hours, the pool and S.ll, and a hopper search asks for the same park and pool
// hundreds of times, so the sorted Multi Pass list is remembered per park context (average waits worked out once per ride).
const LL_MEMO = new WeakMap();
function llPlan(ctx, pool, hoursInPark, S = dpState) {
  let e = LL_MEMO.get(ctx);
  if (!e || e.pool !== pool || e.n !== pool.length || e.ll !== S.ll || e.open !== ctx.open || e.close !== ctx.close || e.wf !== ctx.weekFactor) {
    const avg = new Map(), avgW = (r) => { let v = avg.get(r); if (v === undefined) avg.set(r, v = d3.mean(d3.range(Math.max(9, Math.ceil(ctx.open)), Math.min(22, ctx.close)), h => expWait(ctx, r, h)) || r.avg); return v; };
    const p2 = pool.filter(r => !r.lap); // Lightning Lane is once per ride per day; repeats wait in standby
    e = { pool, n: pool.length, ll: S.ll, open: ctx.open, close: ctx.close, wf: ctx.weekFactor, p2, elig: S.ll ? p2.filter(r => r.ll === 'Multi Pass').sort((a, b) => avgW(b) - avgW(a)) : [] };
    LL_MEMO.set(ctx, e);
  }
  const elig = e.elig;
  const K = Math.min(elig.length, Math.max(1, Math.min(LL.max, Math.floor(hoursInPark / LL.per))));
  const multi = elig.slice(0, K);
  const single = S.single ? e.p2.filter(r => r.ll === 'Single Pass') : [];
  return { set: new Set(multi.concat(single)), multi, single };
}
// one plan with the group's own finish time and break (planDay below may give the day a little more time)
function planDay0(ctx, pool, S) {
  // o..c: the hours the group is in the park (park hours cut to their start and finish times)
  const W = dayWin(ctx.open, ctx.close, S.win || {}), o = W.t0, c = W.t1;
  const arrive = W.rope ? ctx.open - 0.5 : o;
  const llStay = llPlan(ctx, pool, c - o, S);
  const hg = (t) => hotelGate(ctx, t, S);
  const stay = scheduleSpread(ctx, o, c, pool, { lunch: true, dinner: true, ll: llStay.set, relaxed: true, gateIn: hg(arrive), tail: true, S });
  // break window
  const L = W.why ? 0 : S.brk;
  const relIdx = (h) => d3.mean(pool, r => expWait(ctx, r, h) / Math.max(5, r.avg)) || 1;
  let bestS = null, bestP = -Infinity, brkMoved = false;
  const sMin = Math.max(o + 2.5, BREAK_FIRST), sMax = Math.min(c - L - 1.5, BREAK_LAST);
  // the quietest, coolest hours, kept near the group's "Break around" time when they picked one
  const pickS = (near) => { for (let s = sMin; s <= sMax + 1e-9; s += 0.5) {
    if (near && !brkNear(s, S.brkAt)) continue;
    let p = 0; for (let h = s; h < s + L; h += 1) { const w = wxAt(ctx, h); p += relIdx(h) + Math.max(0, w.feels - 78) / 10 + w.rain / 20; }
    if (p > bestP) { bestP = p; bestS = s; }
  } };
  pickS(true);
  if (bestS == null && L > 0 && S.brkAt !== 'auto') { pickS(false); brkMoved = bestS != null; }
  let split = null;
  if (L > 0 && bestS != null) {
    const llSplit = llPlan(ctx, pool, (bestS - o) + (c - bestS - L), S);
    const meals = { lunch: false, dinner: false }, seen = new Map();
    const mo = { meals, seen, lunchFrom: bestS <= 12.5 ? 11 : null, ll: llSplit.set, exit: 'break', gateIn: hg(arrive), gateOut: hg(bestS), S };
    let morning = scheduleBlock(ctx, o, bestS, pool, mo);
    // a light morning: rides may wait for a better hour before the break too
    const msp = spreadTry(ctx, o, bestS, pool, mo, morning, {}, { lunch: false, dinner: false }, new Map());
    if (msp) { morning = msp.b; spreadKeep(mo, msp); }
    gapFill(ctx, morning, bestS, new Set(pool.map(r => r.name)), 'before your break');
    const evening = scheduleSpread(ctx, bestS + L, c, morning.left, {
        meals, seen, lunchBy: meals.lunch ? 16.5 : Math.max(16.5, bestS + L + 1), dinnerBy: 21, ll: llSplit.set, gateIn: hg(bestS + L), tail: true, S });
    split = { arrive, brk: bestS, ret: bestS + L, leave: null, morning, evening, llp: llSplit, saved: morning.saved + evening.saved,
      totalWait: morning.totalWait + evening.totalWait, done: morning.steps.filter(s => s.ride).length + evening.steps.filter(s => s.ride).length,
      left: evening.left };
  }
  // each plan leaves when it's done (spare time is already spread through the day, and meals happen before leaving)
  const stayLeave = Math.min(c, stay.left.length ? c : roundUp15(stay.end));
  if (split) split.leave = Math.min(c, split.evening.left.length ? c : roundUp15(Math.max(split.evening.end, split.ret + 0.5)));
  annotateMeals(stay.steps); if (split) { annotateMeals(split.morning.steps); annotateMeals(split.evening.steps); }
  annotateRestrooms(stay.steps, ctx.park, arrive, S);
  if (split) { annotateRestrooms(split.morning.steps, ctx.park, arrive, S); annotateRestrooms(split.evening.steps, ctx.park, split.ret, S); }
  llStay.order = addLLBooking([stay.steps]);
  if (split) split.llp.order = addLLBooking([split.morning.steps, split.evening.steps]);
  const heatHours = (a, b, skip) => { let n = 0; for (let h = Math.ceil(a); h < b; h++) { if (skip && h >= skip[0] && h < skip[1]) continue; if (wxAt(ctx, h).feels >= 85) n++; } return n; };
  return {
    stay: { arrive, leave: stayLeave, plan: stay, llp: llStay, done: stay.steps.filter(s => s.ride).length, heat: heatHours(o, stayLeave) },
    split: split && Object.assign(split, { heat: heatHours(o, split.leave, [split.brk, split.ret]) }),
    relIdx, win: W, brkMoved
  };
}
// ---------- a little more time when picked rides are left over, or a chosen meal time doesn't fit ----------
// A finish time the group set may move later (never past close, at most FLEX_END_MAX_H past it), or the midday break may
// get shorter (keeping at least FLEX_BRK_MIN_H at the hotel after the trip each way). Each plan takes whichever way meets
// the most chosen meal times, then fits the most left-over rides, with the fewest extra minutes, in FLEX_STEP_H steps; on a
// tie the break is kept, since it's for rest. A chosen meal time that still doesn't fit falls back to whenever fits.
// The plan that changed gets flex: { kind: 'end' or 'brk', min: minutes added, names: rides it made room for, meals: meal
// times it made room for, from, brk, back, hotel: minutes at the hotel }, and mealNote when a meal time had to fall back.
// A plan that was short of time gets flexTried: the ways that were tried ('end', 'brk'), so it can say when even they weren't enough.
const flexClock = (t) => { const m = Math.round(t * 60); return `${pad2(Math.floor(m / 60) % 24)}:${pad2(m % 60)}`; };
// later finish times to try, earliest first (none unless the group set a finish time before close)
// long: the finish times past FLEX_END_MAX_H instead, up to close, tried only to fit a meal the group wants (see flexFix)
function flexEnds(W, close, S, long) {
  if (!S.win || S.win.end !== 'set' || W.e == null || !W.early) return [];
  const cap = Math.min(close, W.e + FLEX_END_MAX_H), top = long ? close : cap, out = [];
  for (let t = long ? cap + FLEX_STEP_H : W.t1 + FLEX_STEP_H; t <= top + 1e-9; t += FLEX_STEP_H) out.push({ kind: 'end', long: !!long, min: Math.round((t - W.t1) * 60), from: W.t1,
      // a start after lunch or a finish by 4 pm still means no break, even when the finish moves later
      S: Object.assign({}, S, W.why ? { brk: 0 } : {}, { win: Object.assign({}, S.win, { endAt: flexClock(t) }) }) });
  return out;
}
// shorter breaks to try, longest first; overhead: minutes of travel and security each way around the break
function flexBrks(L0, overhead, S) {
  const out = [];
  for (let L = L0 - FLEX_STEP_H; L * 60 - overhead >= FLEX_BRK_MIN_H * 60 - 1e-9; L -= FLEX_STEP_H) out.push({ kind: 'brk', min: Math.round((L0 - L) * 60), brk: L,
      S: Object.assign({}, S, { brk: L }) });
  return out;
}
// X0: the plan as it is; run(c): the plan with candidate c's settings (null if it doesn't work); stepsOf / leftOf: its steps
// and left-over rides; backOf(X): { back, hotel }, when a break plan is back in the park and its minutes at the hotel;
// auto(S2): the plan again with settings S2.
// Returns the plan to use: X0 itself, or a new one with its flex and mealNote.
// Candidates marked long (finish times past FLEX_END_MAX_H) are tried last, and only while a meal the group wants (a picked
// restaurant or a set time, see mealsWanted) is still missing: the earliest of them that fits the most of those meals wins.
function flexFix(X0, S, cands, run, stepsOf, leftOf, backOf, auto) {
  const meals0 = (X) => mealsWanted(stepsOf(X), S).length, score = (X) => meals0(X) * 1000 + leftOf(X).length, s0 = score(X0);
  if (!s0) return X0;
  let best = null;
  ['end', 'brk'].forEach(kind => {
    const cs = cands.filter(c => c.kind === kind && !c.long); if (!cs.length) return;
    // the most time first: if even that does no better, this way can't help
    let most = null, mi = -1; for (let i = cs.length - 1; i >= 0 && !most; i--) { most = run(cs[i]); mi = i; }
    if (!most || score(most) >= s0) return;
    const n = score(most);
    // then the least time that does as well: a binary search (more time never does worse, near enough)
    let lo = 0, hi = mi, X = most, c = cs[mi];
    while (lo < hi) { const mid = (lo + hi) >> 1, Y = run(cs[mid]); if (Y && score(Y) <= n) { hi = mid; X = Y; c = cs[mid]; } else lo = mid + 1; }
    if (!best || n < best.n || (n === best.n && c.min < best.c.min)) best = { X, c, n };
  });
  // still missing a meal the group wants: a later finish past the usual cap (never past close), the least that fits the most of them
  const longs = cands.filter(c => c.long);
  if (longs.length && meals0(best ? best.X : X0)) {
    const top = run(longs[longs.length - 1]), n = top ? meals0(top) : Infinity;
    if (n < meals0(best ? best.X : X0)) {
      let lo = 0, hi = longs.length - 1, Y = top, c = longs[hi];
      while (lo < hi) { const mid = (lo + hi) >> 1, Z = run(longs[mid]); if (Z && meals0(Z) <= n) { hi = mid; Y = Z; c = longs[mid]; } else lo = mid + 1; }
      best = { X: Y, c, n: score(Y) };
    }
  }
  let X = X0, S1 = S;
  const tried = ['end', 'brk'].filter(kind => cands.some(c => c.kind === kind));
  if (best) {
    X = best.X; S1 = best.c.S;
    const count = (L) => d3.rollup(L, v => v.length, r => r.park + '|' + r.name), after = count(leftOf(X));
    const missed = mealsWanted(stepsOf(X), S), meals = mealsWanted(stepsOf(X0), S).filter(k => !missed.includes(k));
    const b = best.c.kind === 'brk' ? backOf(X) || {} : {};
    X.flex = { kind: best.c.kind, min: best.c.min, names: [...count(leftOf(X0))].filter(([k, n]) => (after.get(k) || 0) < n).map(([k]) => k.split('|')[1]),
      meals: meals.map(k => ({ kind: k, at: mealAtOf(S, k) })), from: best.c.from, brk: best.c.brk, back: b.back != null ? b.back : null,
      hotel: b.hotel != null ? b.hotel : null };
  }
  if (tried.length) X.flexTried = tried;
  // a chosen meal time that still doesn't fit: plan that meal whenever it fits best, and say so
  const missed = mealMisses(stepsOf(X), S);
  if (missed.length) {
    const Y = auto(Object.assign({}, S1, Object.fromEntries(missed.map(k => [k + 'At', 'auto']))));
    if (Y) { if (X.flex) Y.flex = X.flex; if (X.flexTried) Y.flexTried = X.flexTried; X = Y; }
    const brk = X.brk != null ? [X.brk, X.ret] : X.segs ? (h => h ? [h.back - (h.hotel + h.overhead) / 60, h.back] : null)(hopHotel(X, S1)) : null;
    X.mealNote = missed.map(k => { const T = mealAtOf(S, k), why = brk && T >= brk[0] && T <= brk[1] ? 'falls in your break' : T > X.leave && S.win && S.win.end === 'set' ? 'is after you leave' :
        "doesn't fit this day"; return `${k === 'lunch' ? 'Lunch' : 'Dinner'} around ${hourLbl(T)} ${why}, so it's when it fits best.`; }).join(' ');
  }
  return X;
}
// minutes at the hotel in a split day's break, and the travel and security around it
function splitHotel(ctx, X, S) {
  const out = travelMin(ctx.park, hotelGate(ctx, X.brk, S), S), e = entryInfo(ctx, X.ret, S), overhead = out + e.min + e.sec;
  return { overhead, hotel: (X.ret - X.brk) * 60 - overhead };
}
// S: the settings to plan with (default: Plan a day's dpState; the wizard passes a day's own)
function planDay(ctx, pool, S = dpState) {
  const P = planDay0(ctx, pool, S);
  const ends = flexEnds(P.win, ctx.close, S).concat(flexEnds(P.win, ctx.close, S, true));
  P.stay = flexFix(P.stay, S, ends, c => planDay0(ctx, pool, c.S).stay, X => X.plan.steps, X => X.plan.left, null, S2 => planDay0(ctx, pool, S2).stay);
  if (P.split) {
    const steps = (X) => X.morning.steps.concat(X.evening.steps);
    const brks = flexBrks(P.split.ret - P.split.brk, splitHotel(ctx, P.split, S).overhead, S);
    P.split = flexFix(P.split, S, ends.concat(brks), c => { const Y = planDay0(ctx, pool, c.S).split;
        return Y && (c.kind !== 'brk' || splitHotel(ctx, Y, S).hotel >= FLEX_BRK_MIN_H * 60 - 1e-9) ? Y : null; }, steps, X => X.left,
      X => ({ back: X.ret, hotel: splitHotel(ctx, X, S).hotel }),
      S2 => planDay0(ctx, pool, S2).split);
  }
  return P;
}
// the warning on a plan that got more time, for the "Your day" box and the plan's notes:
// "Your break is 15 min shorter to fit Space Mountain: 1 h 45 min, with about 1 h 5 min at your hotel, back in the park by 12:45 pm."
// and, when picked rides still don't fit: "A shorter break (down to about 1 h at your hotel) still wouldn't make room for Goofy's Sky School."
const flexList = (xs) => xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1];
const flexHours = (h) => fmtDur(h * 60);
function flexWarn(X) {
  const f = X && X.flex, out = [];
  if (f && (f.names.length || f.meals.length)) {
    const why = [f.names.length ? `fit ${flexList(f.names)}` : '', ...f.meals.map(m => `have ${m.kind}${m.at != null ? ` around ${hourLbl(m.at)}` : ''}`)].filter(Boolean).join(' and ');
    const hotel = f.hotel != null ? `, with about ${flexHours(Math.round(f.hotel / 5) * 5 / 60)} at your hotel` : '';
    out.push(f.kind === 'end' ? `You leave ${flexHours(f.min / 60)} later, at ${fmtClock(X.leave % 24)} instead of ${fmtClock(f.from % 24)}, to ${why}.` :
      `Your break is ${flexHours(f.min / 60)} shorter to ${why}: ${flexHours(f.brk)}${hotel}${f.back != null ? `, back in the park by ${fmtClock(f.back % 24)}` : ''}.`);
  }
  const left = X && X.flexTried ? [...new Set(((X.plan ? X.plan.left : X.left) || []).map(r => r.name))] : [];
  if (left.length) {
    const t = X.flexTried, brk = `a shorter break (down to about ${flexHours(FLEX_BRK_MIN_H)} at your hotel)`,
      end = `leaving later (up to ${flexHours(FLEX_END_MAX_H)}, never past close)`;
    const names = left.length > 4 ? `${left.slice(0, 3).join(', ')} and ${left.length - 3} more rides` : flexList(left);
    out.push(t.includes('brk') && t.includes('end') ? `Neither ${brk} nor ${end} would make room for ${names}.` :
      `${t.includes('brk') ? 'A' + brk.slice(1) : 'L' + end.slice(1)} still wouldn't make room for ${names}.`);
  }
  return out.join(' ');
}
// the same, with the note on a chosen meal time that had to fall back
const flexText = (X) => [flexWarn(X), X && X.mealNote].filter(Boolean).join(' ');
