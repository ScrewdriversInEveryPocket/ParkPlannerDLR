// DLR Planner: the scheduler: break timing, free time, advice when rides don't fit, Lightning Lane bookings, planning a day.
// Part of the app script. The js files load in the order of their script tags in index.html (listed in CLAUDE.md).
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
    b.steps.splice(b.steps.length - 1, 0, { t: ex.t,
        meal: `Free time: about ${min} min ${why}. ${fits.length ? `To use it, add a ride here, such as ${fits.join(', ')}.` :
          'Catch a show, grab a snack or shop.'}`, dur: min, free: true, gap: true });
  }
  ex.t += gap; b.end = until;
}
// when picked rides don't fit: the picked rides that take the most time, and what taking each one off makes room for.
// drop(park, name) re-plans the day without that ride and returns what's still left over.
function fullAdvice(steps, left, drop) {
  if (!left.length) return null;
  const c = new Map();
  steps.forEach(x => { if (!x.ride || !x.r) return; const k = x.r.park + '|' + x.r.name; const o = c.get(k) || { park: x.r.park, name: x.r.name, min: 0, n: 0
      }; o.min += (x.wait || 0) + x.r.rmin; o.n++; c.set(k, o); });
  const count = (L) => d3.rollup(L, v => v.length, r => r.park + '|' + r.name), before = count(left);
  // try the 5 biggest time users, then show the 3 that make the most room (ties: the one taking more time)
  return [...c.values()].sort((a, b) => b.min - a.min).slice(0, 5).map(o => {
    const after = count(drop(o.park, o.name)), k0 = o.park + '|' + o.name;
    const now = [...before].filter(([k, n]) => k !== k0 && (after.get(k) || 0) < n).map(([k]) => k.split('|')[1]);
    return Object.assign(o, { all: ![...after.keys()].some(k => k !== k0), now });
  }).sort((a, b) => ((b.all ? 99 : b.now.length) - (a.all ? 99 : a.now.length)) || (b.min - a.min)).slice(0, 3);
}
const advLine = (o) => `${o.name}${o.n > 1 ? ` (all ${o.n} times)` : ''}: about ${Math.round(o.min)} min in line and riding. ${o.all ?
  'Taking it off makes room for everything else.' : o.now.length ? `Taking it off makes room for ${o.now.join(', ')}.` :
  "Taking it off isn't enough on its own."}`;
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
  const mealFits = (from, kind) => { const ps = kind && dinePicked(ctx.park, kind), sp = ps || mealSpot(ctx.park, from), len = mealLen(kind);
    const w = sp ? walkMin(ctx.park, from, sp) * walkMult : 0; return { sp, w, len, ok: t + (w + len + exitMin(sp || from)) / 60 <= end + tol }; };
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
    if (!eaten.lunch && t >= (opts.lunchFrom || earlyLunch) && t < (opts.lunchBy || 14.5)) { const m = mealFits(prev, 'lunch'); if (m.ok) { eat('lunch', m); continue; } }
    if (!eaten.dinner && t >= 17.5 && t < (opts.dinnerBy || 20)) { const m = mealFits(prev, 'dinner'); if (m.ok) { eat('dinner', m); continue; } }
    if (restBreaks && t - lastRest >= 1.25 && t < end - 0.75) { const hot = wxAt(ctx, t).feels >= 82; steps.push({
          t, meal: hot ? 'Rest break: something cold in the shade or an indoor show' : 'Rest break: snack, sit down or catch a show', dur: restMin });
      t += restMin / 60; lastRest = t; continue; }
    // Pick the next ride by its own cost plus the cheapest ride that could follow it (one-ride look-ahead),
    // so the plan doesn't hop across the park for a small gain and then hop back.
    // before an early break, keep room to eat lunch in the park before leaving
    // (and before any break at all, keep room for the walk to lunch, lunch and the walk out (about 22 min of walking), since there's no lunch at the hotel)
    const lunchFrom0 = opts.lunchFrom || (opts.exit === 'break' ? earlyLunch : null);
    const lunchLatest = end - (mealLen('lunch') + (opts.exit === 'break' ? 22 : 0)) / 60, lunchDue = !eaten.lunch && lunchFrom0 && lunchLatest >= lunchFrom0 - 0.01;
    const cands = left.filter(r => !blocked(r, t)).map(r => rideCost(r, t, prev, lastLL)).filter(c => c && (!lunchDue || t + c.dur / 60 <= lunchLatest + 0.01)).sort((a, b) => a.score - b.score);
    // only repeats that are too soon, or character meets not started yet, are left: fill the gap until the next one may go
    if (!cands.length && left.length && left.every(r => blocked(r, t))) {
      const next = d3.min(left, r => r.meetTo != null && t + 0.5 > r.meetTo ? Infinity : Math.max(seen.has(r.name) && !dpState.b2b ?
          seen.get(r.name).end + REP_GAP : t, r.meetFrom != null ? r.meetFrom : t));
      if (next < end - 0.1 && next > t) { steps.push({
            t, meal: freeText(ctx.park, prev, 'catch a show, grab a snack or shop'), dur: Math.round((next - t) * 60), free: true }); t = next; lastRest = t;
        continue; }
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
        let f = null; for (const r2 of left) { if (r2 === c.r || (!dpState.b2b && r2.name === c.r.name)) continue;
          const c2 = rideCost(r2, t2, c.r, ll2); if (c2 && (!f || c2.score < f.score)) f = c2; }
        follow = f ? f.score : 0;
      }
      const total = c.score + LOOK_WEIGHT * follow;
      if (total < bestTotal - 1e-9 || (Math.abs(total - bestTotal) < 1e-9 && best && c.r.avg > best.r.avg)) { best = c; bestTotal = total; }
    }
    if (!best) break;
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
  if (opts.exit && prev) { const w = exitMin(prev); steps.push({
        t, meal: `Walk to the ${opts.gateOut ? opts.gateOut.name : ctx.park + ' exit'} (~${Math.max(1, Math.round(w))} min)`, dur: Math.max(1, Math.round(w)),
        exit: true }); walked += w; t += w / 60; }
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
    const evening = scheduleSpread(ctx, bestS + L, c, morning.left, {
        meals, seen, lunchBy: meals.lunch ? 16.5 : Math.max(16.5, bestS + L + 1), dinnerBy: 21, ll: llSplit.set, gateIn: hg(bestS + L), tail: true });
    split = { arrive, brk: bestS, ret: bestS + L, leave: null, morning, evening, llp: llSplit, saved: morning.saved + evening.saved,
      totalWait: morning.totalWait + evening.totalWait, done: morning.steps.filter(s => s.ride).length + evening.steps.filter(s => s.ride).length,
      left: evening.left };
  }
  // each plan leaves when it's done (spare time is already spread through the day, and meals happen before leaving)
  const stayLeave = Math.min(c, stay.left.length ? c : roundUp15(stay.end));
  if (split) split.leave = Math.min(c, split.evening.left.length ? c : roundUp15(Math.max(split.evening.end, split.ret + 0.5)));
  annotateMeals(stay.steps); if (split) { annotateMeals(split.morning.steps); annotateMeals(split.evening.steps); }
  annotateRestrooms(stay.steps, ctx.park, arrive); if (split) { annotateRestrooms(split.morning.steps, ctx.park, arrive); annotateRestrooms(split.evening.steps, ctx.park, split.ret); }
  llStay.order = addLLBooking([stay.steps]);
  if (split) split.llp.order = addLLBooking([split.morning.steps, split.evening.steps]);
  const heatHours = (a, b, skip) => { let n = 0; for (let h = Math.ceil(a); h < b; h++) { if (skip && h >= skip[0] && h < skip[1]) continue; if (wxAt(ctx, h).feels >= 85) n++; } return n; };
  return {
    stay: { arrive, leave: stayLeave, plan: stay, llp: llStay, done: stay.steps.filter(s => s.ride).length, heat: heatHours(o, stayLeave) },
    split: split && Object.assign(split, { heat: heatHours(o, split.leave, [split.brk, split.ret]) }),
    relIdx, win: W, brkMoved
  };
}

