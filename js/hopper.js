// DLR Planner: Park Hopper days: both parks, at most 2 hops.
// Part of the app script. The js files load in the order of their script tags in index.html (listed in CLAUDE.md).
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
      const b = (spread && !plan[i + 1] ? scheduleSpread : scheduleBlock)(c, start, stop, left[g.park], {
          tail: !plan[i + 1], meals, seen, lunchFrom: preBrk ? 11 : null, lunchBy: g.gap === 'break' ? (meals.lunch ? 16.5 : Math.max(16.5, start + 1)) : null,
          dinnerBy: g.gap === 'break' ? 21 : null, ll: llps[g.park].set, exit: plan[i + 1] ? plan[i + 1].gap : null,
          gateIn: i === 0 || g.gap === 'break' ? hotelGate(c, start) : null, gateOut: plan[i + 1] && plan[i + 1].gap === 'break' ? hotelGate(c, stop) : null });
      left[g.park] = b.left; tw += b.totalWait; saved += b.saved;
      const nx = plan[i + 1];
      let depart = b.end;
      if (nx && nx.gap === 'hop' && !hopped) depart = Math.max(depart, HOP_FIRST);
      if (nx && nx.gap === 'break') depart = Math.max(depart, brkFloor);
      if (nx && nx.gap === 'hop' && !b.steps.some(x => x.ride)) return null; // no point entering a park only to hop straight out
      if (nx && depart > b.end + 1e-9) { idle += depart - b.end;
        gapFill(c, b, depart, picks[g.park], nx.gap === 'hop' && b.end < HOP_FIRST && depart <= HOP_FIRST + 1e-9 ? 'until park hopping opens at 11 am' :
          'before your break'); }
      if (nx && nx.gap === 'hop') hopped = true;
      if (nx && nx.park !== g.park) hops++;
      from = depart;
      segs.push({ park: g.park, ctx: c, start, end: b.end, steps: b.steps, depart, gapBefore: g.gap || null, hopMin: hm });
    }
    const done = segs.reduce((n, s) => n + s.steps.filter(x => x.ride).length, 0);
    const flatSteps = segs.flatMap(x => x.steps), miss = ['lunch',
      'dinner'].filter(k => dpState.dine && dpState.dine[k] && DINE_BY_KEY[dpState.dine[k]] && !flatSteps.some(x => x.mealKind === k && x.sit &&
        x.sit.key === dpState.dine[k])).length;
    return { segs, done, hops, totalWait: tw, saved, left, llps, idle, plan, miss };
  };
  let best = null;
  const consider = (plan) => {
    const r = run(plan); if (!r) return;
    // a picked sit-down meal sets where you are at that meal: plans that eat there come first, and the rides fit around it;
    // then the most rides, then less dead time (waiting for a break or for hopping to open), then fewer hops, then shorter lines
    const qi = (x) => Math.round(x.idle * 4);
    if (!best || r.miss < best.miss || (r.miss === best.miss && r.done > best.done) || (r.miss === best.miss && r.done === best.done && (qi(r) < qi(best) ||
          (qi(r) === qi(best) && (r.hops < best.hops || (r.hops === best.hops && r.totalWait < best.totalWait - 1e-9)))))) best = r;
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
      for (let s = h1 + HOP_MIN / 60 + 1.5; s <= Math.min(cB.close - L - 1.5, 17) + 1e-9; s += 0.5) if (!near || brkNear(s)) consider([{ park: A, to: h1
          }, { park: B, to: s, gap: 'hop' }, { park: B, to: cB.close, gap: 'break' }]);
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
      ? (() => { const eIn = entryInfo(nx.ctx, nx.start); return {
            t: s.depart, meal: `Break at your hotel (${fmtClock(s.depart + travelMin(s.park, hotelGate(s.ctx,
                    s.depart)) / 60)} there). Leave the hotel by ${fmtClock(eIn.leave)} to be through security at the ${eIn.name} by ${fmtClock(nx.start)} (about ${eIn.sec} min in line)`,
            hop: true, brk: true, dur: Math.round(L * 60), to: nx.park }; })()
      : { t: s.depart, meal: `Park hop: leave ${s.park}, arrive at ${nx.park} about ${fmtClock((s.depart +
              nx.hopMin / 60) % 24)} (walk across the Esplanade and tap in)`, hop: true, dur: nx.hopMin, to: nx.park };
    flat.push(gap); s.hopStep = gap;
  });
  annotateMeals(flat);
  best.segs.forEach(s => annotateRestrooms(s.steps, s.park, s.start));
  const lastSeg = best.segs[best.segs.length - 1];
  const leftAll = PARKS.flatMap(p => best.left[p]);
  // leave at close only while the park you end in still has rides to do; otherwise when the plan is done
  const leave = best.left[lastSeg.park].length ? lastSeg.ctx.close : Math.min(lastSeg.ctx.close, roundUp15(lastSeg.end));
  // picked rides left in a park the day doesn't go back to: say why
  const visited = new Set(best.segs.map(x => x.park)), lastPark = lastSeg.park;
  const whyLeft = PARKS.filter(p => p !== lastPark && best.left[p].length).map(p => `${leftList(best.left[p])} in ${p} won't fit: ${!visited.has(p) ?
      `the day doesn't get to ${p}` : best.hops >= 2 ? `the plan already uses 2 park hops, the most it plans in a day, and the time in ${p} runs out` :
      `the time in ${p} runs out before you hop`}. Move ${best.left[p].length === 1 ? 'it' : 'them'} to another day, or take something off.`).join(' ');
  const first = best.segs[0].park;
  return { hop: true, withBreak: !!withBreak, ctxs: C0, first, ctx: C0[first], segs: best.segs, flat, hops: best.hops, done: best.done, total, left: leftAll,
    totalWait: best.totalWait, saved: best.saved, llps: best.llps, arrive: WW[first].rope ? C0[first].open - 0.5 : C[first].open, leave, win: WW[first],
    brkMoved, whyLeft };
}
const planHopperBoth = (iso, D) => { const H = planHopper(iso, D, false); return { hop: true, H, Hb: dpState.brk > 0 ? planHopper(iso, D, true) : null, ctx: H.ctx }; };  function hopLL(H) {
  const m = [], s = [];
  ['Disneyland', 'California Adventure'].forEach(p => { const l = H.llps[p]; if (l) { m.push(...l.multi); s.push(...l.single); } });
  return { multi: m, single: s, set: null };
}

