// DLR Planner: Park Hopper days: both parks, at most 2 hops.
// Part of the app script. The js files load in the order of their script tags in index.html (listed in CLAUDE.md).
// ---------- Park Hopper day: every picked ride in both parks, at most 2 hops ----------
// a hop = the walk across the Esplanade between the gates at your pace, plus tapping in at the other park.
// The walk to the gate and on to the first ride are counted in the park schedules themselves.
// the tap-in line comes from data/security_waits.js, scaled by how busy the park you're hopping into is
// (HOP_FIRST, the earliest hop, is in js/settings.js)
const hopMin = (toCtx, S = dpState) => Math.round(distM(GATE['Disneyland'], GATE['California Adventure']) * PATH_WIND / WALK_SPEED * paceWalk(S) + SEC.tap * crowdMult(toCtx));
function poolFor(ctx, S = dpState) {
  if (!S.rides[ctx.park]) S.rides[ctx.park] = new Set(ctx.rides.filter(r => r.head).map(r => r.name));
  return expandPool(ctx.rides.filter(r => S.rides[ctx.park].has(r.name)), S.reps[ctx.park]);
}
// meals the group wants that a plan's steps miss: a picked restaurant not eaten at, and chosen meal times missed
const hopMiss = (steps, S) => ['lunch', 'dinner'].filter(k => S.dine && S.dine[k] && DINE_BY_KEY[S.dine[k]] && !steps.some(x => x.mealKind === k && x.sit &&
  x.sit.key === S.dine[k])).length + mealMisses(steps, S).length;
// one plan with the group's own finish time and break (planHopper below may give the day a little more time)
function planHopper0(iso, D, withBreak, S) {
  const PARKS = ['Disneyland', 'California Adventure'];
  // C: each park's hours cut to the group's start and finish times (C0 keeps the real hours for display)
  const C0 = Object.fromEntries(PARKS.map(p => [p, dayContext(iso, p, D)]));
  const WW = Object.fromEntries(PARKS.map(p => [p, dayWin(C0[p].open, C0[p].close, S.win || {})]));
  if (withBreak && WW[PARKS[0]].why) return null;
  const C = Object.fromEntries(PARKS.map(p => [p, Object.assign({}, C0[p], { open: WW[p].t0, close: WW[p].t1, realOpen: C0[p].open, realClose: C0[p].close })]));
  const pools = Object.fromEntries(PARKS.map(p => [p, poolFor(C[p], S)]));
  const total = pools[PARKS[0]].length + pools[PARKS[1]].length;
  const L = S.brk;
  const picks = Object.fromEntries(PARKS.map(p => [p, new Set(pools[p].map(r => r.name))]));
  let near = true, brkFloor = BREAK_FIRST; // breaks never start before 11; with "Break around" set, not before half an hour ahead of it
  const HOP_MIN = Math.round(d3.mean(PARKS, p => hopMin(C[p], S)));
  // the park of the restaurant picked for each meal (null: none picked)
  const dineAt = Object.fromEntries(['lunch', 'dinner'].map(k => { const r = S.dine && S.dine[k] && DINE_BY_KEY[S.dine[k]]; return [k, r ? r.park : null]; }));
  const wv = S.walk == null ? 2 : S.walk;
  // force: rides (pool objects) that must be done on one visit, by its index in plan (the regrouping pass below); look: rides may
  // wait for a later visit to the same park when they're quieter then
  const run = (plan, spread, force, look) => {
    // plan: [{ park, to, gap }, ...]; gap is how you get here from the previous entry: 'hop' or 'break' (at the hotel)
    const meals = { lunch: false, dinner: false }, seen = new Map();
    const left = Object.fromEntries(PARKS.map(p => [p, pools[p].slice()]));
    const hrs = {}; let from = null, hopped = false, hops = 0;
    plan.forEach(g => { hrs[g.park] = (hrs[g.park] || 0) + Math.max(0.5, Math.min(g.to, C[g.park].close) - C[g.park].open); });
    const llps = Object.fromEntries(PARKS.map(p => [p, llPlan(C[p], pools[p], Math.min(hrs[p] || 0, C[p].close - C[p].open))]));
    const segs = []; let tw = 0, saved = 0, idle = 0, walked = 0;
    for (let i = 0; i < plan.length; i++) {
      const g = plan[i], c = C[g.park], nx = plan[i + 1];
      const hm = g.gap === 'hop' ? hopMin(c, S) : 0;
      const start = i === 0 ? c.open : Math.max(from + (g.gap === 'break' ? L : hm / 60), c.open);
      const stop = Math.min(g.to, c.close);
      if (stop - start < 0.5) return null;
      const preBrk = nx && nx.gap === 'break' && stop <= 12.5;
      // a restaurant picked in the other park, which a later visit goes to: that meal waits for it (other meals are eaten before hopping)
      // (only when that visit starts in time for the meal: by 2:30 pm for lunch, 8:30 pm for dinner, or the end of a set meal time)
      const hold = {}; ['lunch', 'dinner'].forEach(k => { const w = mealWin(S, k), by = w ? w.to : k === 'lunch' ? 14.5 : 20.5;
        if (dineAt[k] && dineAt[k] !== g.park && plan.some((x, j) => j > i && x.park === dineAt[k] && plan[j - 1].to + (x.gap === 'break' ? L : HOP_MIN / 60) <= by + 1e-9)) hold[k] = true; });
      // later visits to this park, so a ride that's quieter then can wait for it
      const later = !look ? [] : plan.map((x, j) => j > i && x.park === g.park ? [plan[j - 1].to + (x.gap === 'break' ? L : HOP_MIN / 60), Math.min(x.to, c.close)] : null).filter(Boolean);
      const pool = force ? left[g.park].filter(r => !force.has(r) || force.get(r) === i) : left[g.park];
      const o = { tail: !nx, meals, seen, lunchFrom: preBrk ? 11 : null, lunchBy: g.gap === 'break' ? (meals.lunch ? 16.5 : Math.max(16.5, start + 1)) : null,
          dinnerBy: g.gap === 'break' ? 21 : null, ll: llps[g.park].set, exit: nx ? nx.gap : null, hold, later,
          gateIn: i === 0 || g.gap === 'break' ? hotelGate(c, start, S) : null, gateOut: nx && nx.gap === 'break' ? hotelGate(c, stop, S) : null, S };
      // spread: a light day's spare time through every visit (before a break, rides may wait for a better hour, as on a split day)
      let b;
      if (spread && nx && nx.gap === 'break') { const m0 = Object.assign({}, meals), s0 = new Map(seen);
        b = scheduleBlock(c, start, stop, pool, o); const sp = spreadTry(c, start, stop, pool, o, b, {}, m0, s0); if (sp) { b = sp.b; spreadKeep(o, sp); } }
      else b = (spread ? scheduleSpread : scheduleBlock)(c, start, stop, pool, o);
      if (force) { const kept = new Set(b.left); left[g.park] = left[g.park].filter(r => kept.has(r) || !pool.includes(r)); } else left[g.park] = b.left;
      tw += b.totalWait; saved += b.saved; walked += b.walked;
      let depart = b.end;
      if (nx && nx.gap === 'hop' && !hopped) depart = Math.max(depart, HOP_FIRST);
      if (nx && nx.gap === 'break') depart = Math.max(depart, brkFloor);
      // no point entering a park only to hop straight out, unless it's for a restaurant picked there
      if (nx && nx.gap === 'hop' && !b.steps.some(x => x.ride || (x.mealKind && x.sit))) return null;
      if (nx && depart > b.end + 1e-9) { idle += depart - b.end;
        gapFill(c, b, depart, picks[g.park], nx.gap === 'hop' && b.end < HOP_FIRST && depart <= HOP_FIRST + 1e-9 ? 'until park hopping opens at 11 am' :
          'before your break'); }
      if (nx && nx.gap === 'hop') hopped = true;
      if (nx && nx.park !== g.park) hops++;
      from = depart;
      segs.push({ park: g.park, ctx: c, start, end: b.end, steps: b.steps, depart, gapBefore: g.gap || null, hopMin: hm });
    }
    const done = segs.reduce((n, s) => n + s.steps.filter(x => x.ride).length, 0);
    const miss = hopMiss(segs.flatMap(x => x.steps), S);
    const last = segs[segs.length - 1], lastLeft = left[last.park].length;
    // when the day ends: at close while the last park still has picked rides to do, otherwise when the plan is done
    const fin = lastLeft ? last.ctx.close : Math.min(last.ctx.close, roundUp15(last.end));
    // minutes in line + walking (in the parks, and each hop) weighted by the waits-vs-steps slider + time spent waiting about
    const cost = tw + (walked + segs.reduce((n, s) => n + s.hopMin, 0)) * HOP_RANK_WALK[wv] + idle * 60 * HOP_RANK_IDLE;
    return { segs, done, hops, totalWait: tw, saved, left, llps, idle, plan, miss, fin, cost, walked, force, look };
  };
  // the group's priorities, in order: the meals they want (a picked restaurant, a set time), then the most picked rides, then the
  // earliest finish, then the least time in line and walking (by the waits-vs-steps slider) and waiting about, then fewer hops
  const better = (r, b) => r.miss !== b.miss ? r.miss < b.miss : r.done !== b.done ? r.done > b.done : Math.abs(r.fin - b.fin) > 1e-9 ? r.fin < b.fin :
    Math.abs(r.cost - b.cost) > 1e-6 ? r.cost < b.cost : r.hops < b.hops;
  let best = null; const bestBy = {};
  const consider = (plan) => {
    const r = run(plan); if (!r) return null;
    const p = plan[0].park; if (!bestBy[p] || better(r, bestBy[p])) bestBy[p] = r;
    if (!best || better(r, best)) best = r;
    return r;
  };
  // hop times next to a picked restaurant meal in park P, besides the usual grid: into P just before the meal (dir 'in'), or out of
  // P just after it ('out'), each HOP_MEAL_STEPS quarter hours (meal time: the one the group set, or about noon or 6 pm)
  const mealHops = (P, dir) => { const out = [];
    ['lunch', 'dinner'].forEach(k => { if (dineAt[k] !== P) return; const r = DINE_BY_KEY[S.dine[k]], T = mealAtOf(S, k) ?? (k === 'lunch' ? 12 : 18);
      const a = dir === 'in' ? roundDn15(T) - HOP_MEAL_STEPS * FLEX_STEP_H : roundUp15(T + sitMin(r, S) / 60);
      for (let i = 0; i < HOP_MEAL_STEPS; i++) out.push(a + i * FLEX_STEP_H); });
    return out.filter(h => h >= HOP_FIRST - 1e-9); };
  // leaving park P in the n quarter hours from the end of the picked meal plan r had there (r: a plan whose visit to P ran to close)
  const afterMeal = (r, P, n) => { const s = r && r.segs.filter(x => x.park === P).pop(), m = s && s.steps.find(x => x.mealKind && x.sit && dineAt[x.mealKind] === P);
    return m ? d3.range(n).map(i => roundUp15(m.t + m.dur / 60) + i * FLEX_STEP_H) : []; };
  // a grid of hop times plus the meal ones, in order with no repeats
  const times = (grid, extra, lo, hi) => { const out = grid.slice();
    extra.forEach(h => { if (h >= lo - 1e-9 && h <= hi + 1e-9 && !out.some(x => Math.abs(x - h) < 1e-6)) out.push(h); });
    return out.sort((a, b) => a - b); };
  const range = (a, z, step) => { const out = []; for (let h = a; h <= z + 1e-9; h += step) out.push(h); return out; };
  const search = () => PARKS.forEach((A, ai) => {
    if (S.start !== 'auto' && S.start !== A) return;
    const B = PARKS[1 - ai], cA = C[A], cB = C[B];
    // leaving A for B: on the half hour, or around a meal in B (just before) or in A (just after)
    const AtoB = mealHops(B, 'in').concat(mealHops(A, 'out'));
    if (!withBreak) {
      consider([{ park: A, to: cA.close }]);
      times(range(HOP_FIRST, cA.close - 1.5, 0.5), AtoB, HOP_FIRST, cA.close - 1).forEach(h1 => {
        const two = consider([{ park: A, to: h1 }, { park: B, to: cB.close, gap: 'hop' }]);
        // and back to A: on the hour after at least 1.5 h in B, or just before a meal in A, or just after the meal in B
        // (a visit for a meal can be shorter)
        const h2s = times(range(h1 + HOP_MIN / 60 + 1.5, cB.close - 1, 1), mealHops(A, 'in').concat(afterMeal(two, B, 5)), h1 + HOP_MIN / 60 + 1, cB.close - 1);
        h2s.forEach(h2 => consider([{ park: A, to: h1 }, { park: B, to: h2, gap: 'hop' }, { park: A, to: cA.close, gap: 'hop' }]));
      });
      return;
    }
    // with a midday break at the hotel: A | break | A or B, or one hop on either side of the break
    for (let s = Math.max(cA.open + 2.5, BREAK_FIRST); s <= Math.min(cA.close - L - 1.5, BREAK_LAST) + 1e-9; s += 0.5) {
      if (near && !brkNear(s, S.brkAt)) continue;
      [A, B].forEach(P2 => {
        const c2 = C[P2];
        const two = consider([{ park: A, to: s }, { park: P2, to: c2.close, gap: 'break' }]);
        // break, then hop to the other park later in the evening (on the hour, just before a meal there, or just after the meal in P2)
        const O = P2 === A ? B : A;
        times(range(s + L + 1.5, Math.min(C[O].close, c2.close) - 1, 1), mealHops(O, 'in').concat(afterMeal(two, P2, HOP_MEAL_STEPS)), s + L + 1, Math.min(C[O].close, c2.close) - 1)
          .forEach(h => consider([{ park: A, to: s }, { park: P2, to: h, gap: 'break' }, { park: O, to: C[O].close, gap: 'hop' }]));
      });
    }
    // hop in the morning, then break, then back to the second park, or back to the first one
    times(range(HOP_FIRST, cA.close - 4, 0.5), AtoB, HOP_FIRST, cA.close - 4).forEach(h1 => {
      for (let s = h1 + HOP_MIN / 60 + 1.5; s <= Math.min(cB.close - L - 1.5, BREAK_LAST) + 1e-9; s += 0.5) if (!near || brkNear(s, S.brkAt)) {
        consider([{ park: A, to: h1 }, { park: B, to: s, gap: 'hop' }, { park: B, to: cB.close, gap: 'break' }]);
        // (back to the first park: tried on the hour only, to keep the search quick)
        if (Number.isInteger(h1) && s + L + 1.5 <= cA.close) consider([{ park: A, to: h1 }, { park: B, to: s, gap: 'hop' }, { park: A, to: cA.close, gap: 'break' }]);
      }
    });
  });
  if (withBreak && S.brkAt !== 'auto') brkFloor = Math.max(BREAK_FIRST, Number(S.brkAt) - BREAK_NEAR_H);
  search();
  let brkMoved = false;
  if (!best && withBreak && S.brkAt !== 'auto') { near = false; brkFloor = BREAK_FIRST; search(); brkMoved = !!best; }
  if (!best) return null;
  // a park visited twice: let rides that are quieter on the later visit wait for it, if the day ranks better that way; then try each
  // ride on the other visit to that park, one at a time, keeping a move when the day ranks better
  if (PARKS.some(p => best.plan.filter(g => g.park === p).length > 1)) { const y = run(best.plan, false, null, true); if (y && better(y, best)) best = y; }
  PARKS.forEach(p => {
    const vis = best.plan.map((g, i) => g.park === p ? i : -1).filter(i => i >= 0); if (vis.length < 2) return;
    pools[p].forEach(r => {
      const at = best.segs.findIndex(s => s.steps.some(x => x.r === r));
      vis.filter(j => j !== at).forEach(j => { const f = new Map(best.force || []); f.set(r, j); const y = run(best.plan, false, f, best.look); if (y && better(y, best)) best = y; });
    });
  });
  // spread a light day's spare time through every visit (longer meals, rest breaks, rides at a better hour)
  { const sp = run(best.plan, true, best.force, best.look); if (sp && sp.done === best.done && sp.miss <= best.miss) best = sp; }
  { const order = addLLBooking(best.segs.map(x => x.steps)); PARKS.forEach(p => { if (best.llps[p]) best.llps[p].order = order.filter(r => r.park === p); }); }
  // flatten with hop / break steps, annotate meals
  const flat = [];
  best.segs.forEach((s, i) => {
    s.steps.forEach(x => flat.push(x));
    const nx = best.segs[i + 1];
    if (!nx) return;
    const gap = nx.gapBefore === 'break'
      ? (() => { const eIn = entryInfo(nx.ctx, nx.start, S); return {
            t: s.depart, meal: `Break at your hotel (${fmtClock(s.depart + travelMin(s.park, hotelGate(s.ctx,
                    s.depart, S), S) / 60)} there). Leave the hotel by ${fmtClock(eIn.leave)} to be through security at the ${eIn.name} by ${fmtClock(nx.start)} (about ${eIn.sec} min in line)`,
            hop: true, brk: true, dur: Math.round(L * 60), to: nx.park }; })()
      : { t: s.depart, meal: `Park hop: leave ${s.park}, arrive at ${nx.park} about ${fmtClock((s.depart +
              nx.hopMin / 60) % 24)} (walk across the Esplanade and tap in)`, hop: true, dur: nx.hopMin, to: nx.park };
    flat.push(gap); s.hopStep = gap;
  });
  annotateMeals(flat);
  best.segs.forEach(s => annotateRestrooms(s.steps, s.park, s.start, S));
  const lastSeg = best.segs[best.segs.length - 1];
  const leftAll = PARKS.flatMap(p => best.left[p]);
  // leave at close only while the park you end in still has rides to do; otherwise when the plan is done
  const leave = best.left[lastSeg.park].length ? lastSeg.ctx.close : Math.min(lastSeg.ctx.close, roundUp15(lastSeg.end));
  // picked rides left in a park the day doesn't go back to: say why
  const visited = new Set(best.segs.map(x => x.park)), lastPark = lastSeg.park;
  const whyLeft = PARKS.filter(p => p !== lastPark && best.left[p].length).map(p => `${leftList(best.left[p])} in ${p} won't fit: ${!visited.has(p) ?
      `the day doesn't get to ${p}` : best.hops >= 2 ? `the plan already uses 2 park hops, the most it plans in a day, and the time in ${p} runs out` :
      `the time in ${p} runs out before you hop`}. Move ${best.left[p].length === 1 ? 'it' : 'them'} to another day, or take something off.`).join(' ');
  const first = best.segs[0].park, other = PARKS.find(p => p !== first);
  // Starting park on "Whichever fits best": which park the day starts in, and why (against the best plan that starts in the other one)
  let startWhy = null;
  if (S.start === 'auto') {
    const a = bestBy[first], o = bestBy[other], s = `Starts in ${first}`;
    const want = ['lunch', 'dinner'].map(k => S.dine && DINE_BY_KEY[S.dine[k]] ? `${k} at ${DINE_BY_KEY[S.dine[k]].name}` : mealAtOf(S, k) != null ?
      `${k} around ${hourLbl(mealAtOf(S, k))}` : null).filter(Boolean);
    startWhy = !o ? `${s}: no plan that starts in ${other} works on this day.` : o.miss > a.miss ? `${s}: it keeps your ${flexList(want)}, and starting in ${other} doesn't.` :
      o.done < a.done ? `${s}: it fits ${a.done - o.done} more of your rides than starting in ${other}.` : o.fin > a.fin + 1e-9 ? `${s}: you finish earlier than if you start in ${other}.` :
      o.cost > a.cost + 0.5 ? `${s}: less time in lines${wv >= 3 ? ' and fewer steps' : ' and walking'} than starting in ${other}.` : `${s}; starting in ${other} works about as well.`;
  }
  // a park the day goes to only for a meal (no rides picked there)
  const addRides = PARKS.filter(p => visited.has(p) && !pools[p].length).map(p => `Add rides in ${p} if you want some there.`).join(' ');
  return { hop: true, withBreak: !!withBreak, ctxs: C0, first, ctx: C0[first], segs: best.segs, flat, hops: best.hops, done: best.done, total, left: leftAll,
    totalWait: best.totalWait, saved: best.saved, llps: best.llps, arrive: WW[first].rope ? C0[first].open - 0.5 : C[first].open, leave, win: WW[first],
    brkMoved, whyLeft, hopMin: HOP_MIN, startWhy, addRides };
}
// the break in a hopper plan: minutes at the hotel, the travel and security around it, and when you're back in
function hopHotel(H, S) {
  const i = H.segs.findIndex((s, k) => k > 0 && s.gapBefore === 'break'); if (i < 1) return null;
  const p = H.segs[i - 1], s = H.segs[i], out = travelMin(p.park, hotelGate(p.ctx, p.depart, S), S), e = entryInfo(s.ctx, s.start, S);
  const overhead = out + e.min + e.sec;
  return { overhead, hotel: (s.start - p.depart) * 60 - overhead, back: s.start };
}
// S: the settings to plan with (default: Plan a day's dpState; the wizard passes a day's own).
// With picked rides left over or a chosen meal time missed, the finish time or the break may give a little more time (see planDay).
function planHopper(iso, D, withBreak, S = dpState) {
  const H = planHopper0(iso, D, withBreak, S);
  if (!H) return H;
  const close = Math.max(...Object.values(H.ctxs).map(c => c.close)), ends = flexEnds(H.win, close, S).concat(flexEnds(H.win, close, S, true)), b = withBreak ? hopHotel(H, S) : null;
  return flexFix(H, S, ends.concat(b ? flexBrks(S.brk, b.overhead, S) : []), c => { const Y = planHopper0(iso, D, withBreak, c.S); if (!Y) return null;
      if (c.kind === 'brk') { const h = hopHotel(Y, S); if (!h || h.hotel < FLEX_BRK_MIN_H * 60 - 1e-9) return null; } return Y; },
    Y => Y.flat, Y => Y.left, Y => hopHotel(Y, S), S2 => planHopper0(iso, D, withBreak, S2));
}const planHopperBoth = (iso, D, S = dpState) => { const H = planHopper(iso, D, false, S);
  return { hop: true, H, Hb: S.brk > 0 ? planHopper(iso, D, true, S) : null, ctx: H.ctx }; };
// the notes on a Park Hopper plan H about where the day starts. On "Whichever fits best": which park, and why. With a Starting park set
// and a restaurant picked in the other park: that the plan hops there for it, and when starting there would save a hop (the group's
// Starting park is never changed for them). Then any park the day goes to only for a meal.
function hopNotes(H, iso, D, S = dpState) {
  const out = [];
  if (S.start === 'auto') { if (H.startWhy) out.push(H.startWhy); }
  else {
    let alt;
    ['lunch', 'dinner'].forEach(k => {
      const r = S.dine && DINE_BY_KEY[S.dine[k]]; if (!r || r.park === S.start) return;
      const has = (X) => X.flat.some(x => x.mealKind === k && x.sit && x.sit.key === r.key), m = H.flat.find(x => x.mealKind === k && x.sit && x.sit.key === r.key);
      const into = m && H.flat.filter(x => x.hop && x.to === r.park && x.t <= m.t).pop();
      let txt = `${k === 'lunch' ? 'Lunch' : 'Dinner'} at ${r.name} is in ${r.park} and you start in ${S.start}${into ? `, so the plan ${into.brk ?
        'goes there after your break' : `hops over at ${fmtClock(into.t % 24)}`}` : ''}.`;
      if (alt === undefined) alt = planHopper(iso, D, H.withBreak, Object.assign({}, S, { start: r.park }));
      if (alt && alt.done >= H.done && hopMiss(alt.flat, S) <= hopMiss(H.flat, S)) {
        if (alt.hops < H.hops) txt += ` Starting in ${r.park} would save a hop, if you'd like to change Starting park.`;
        else if (!m && has(alt)) txt += ` Starting in ${r.park} would fit it, if you'd like to change Starting park.`;
      }
      out.push(txt);
    });
  }
  if (H.addRides) out.push(H.addRides);
  return out.join(' ');
}
function hopLL(H) {
  const m = [], s = [];
  ['Disneyland', 'California Adventure'].forEach(p => { const l = H.llps[p]; if (l) { m.push(...l.multi); s.push(...l.single); } });
  return { multi: m, single: s, set: null };
}

