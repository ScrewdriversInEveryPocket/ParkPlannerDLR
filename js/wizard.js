// DLR Planner: Trip wizard: days, rides, day pages, export step, walking chart.
// Part of the app script. The js files load in the order of their script tags in index.html (listed in CLAUDE.md).
// ---------- trip walkthrough: pick rides for the whole visit, spread them over the park days, refine each day ----------
const WZ_PARKS = ['Disneyland', 'California Adventure'];
const wzAbbr = (p) => p === 'Disneyland' ? 'DL' : 'DCA';
const wz = { step: 0, sel: null, days: null, key: '', unplaced: [], note: '', week: null };
const WZ_PRE = 3; // Trip, Dates, Days come before Rides
function wzShowSetup() {
  ['wz-s-trip', 'wz-s-dates', 'wz-s-days'].forEach((id, i) => { document.getElementById(id).hidden = wz.step !== i; });
  document.getElementById('wz-setup').hidden = wz.step >= WZ_PRE;
}
function wzGo(s) { wz.step = s; wzShowSetup(); if (wz.D) drawWalk(wz.D); document.getElementById('panel-wizard').scrollIntoView(); }
const wzCount = (d) => WZ_PARKS.reduce((n, p) => n + [...d.rides[p]].reduce((k, nm) => k + lapsOf(d.reps[p], nm), 0), 0);
const newReps = () => ({ 'Disneyland': new Map(), 'California Adventure': new Map() });
// one wizard day: how many times a ride is on it, add one time, take one time off
const dLaps = (d, p, nm) => d.rides[p].has(nm) ? lapsOf(d.reps[p], nm) : 0;
const dAdd = (d, p, nm) => { if (d.rides[p].has(nm)) d.reps[p].set(nm, lapsOf(d.reps[p], nm) + 1); else d.rides[p].add(nm); };
const dDrop = (d, p, nm) => { const n = dLaps(d, p, nm); if (n > 2) d.reps[p].set(nm, n - 1); else if (n === 2) d.reps[p].delete(nm); else { d.rides[p].delete(nm); d.reps[p].delete(nm); } };
const dSet = (d, p, nm, n) => { if (n <= 0) { d.rides[p].delete(nm); d.reps[p].delete(nm); return; } d.rides[p].add(nm); if (n > 1) d.reps[p].set(nm, n); else d.reps[p].delete(nm); };
// run a planner with one day's rides, break, pace and starting park standing in for the global settings
function wzApply(d) {
  const sv = { brk: dpState.brk, brkAt: dpState.brkAt, rides: dpState.rides, reps: dpState.reps, walk: dpState.walk, win: dpState.win, dine: dpState.dine };
  dpState.brk = d.brk; if (d.walk != null) dpState.walk = d.walk; if (d.win) dpState.win = d.win; if (d.brkAt != null) dpState.brkAt = d.brkAt;
  dpState.rides = { 'Disneyland': d.rides['Disneyland'], 'California Adventure': d.rides['California Adventure'] };
  dpState.reps = d.reps; dpState.dine = d.dine || { lunch: null, dinner: null };
  return () => Object.assign(dpState, sv);
}
function wzParkDays() {
  if (!lastTrip || !lastTrip.best) return [];
  const { days, best } = lastTrip;
  return best.combo.map((i, j) => ({ iso: days[i], i, opt: best.pick[j] })).sort((a, b) => a.i - b.i);
}
// even out ride counts per day; a ride only goes on a day that visits its park
function wzSpread(pd, D) {
  const info = {}; WZ_PARKS.forEach(p => dayContext(pd[0].iso, p, D).rides.forEach(r => { info[p + '|' + r.name] = r; }));
  const days = {}; pd.forEach(x => { days[x.iso] = { rides: { 'Disneyland': new Set(), 'California Adventure': new Set()
        }, reps: newReps(), brk: dpState.brk, brkAt: dpState.brkAt, walk: dpState.walk, win: Object.assign({}, dpState.win) }; });
  const load = (iso) => wzCount(days[iso]);
  const items = []; WZ_PARKS.forEach(p => wz.sel[p].forEach(name => { const r = info[p + '|' + name]; if (r) items.push({
            p, r, park: pd.some(x => x.opt.parks.includes(p)), elig: pd.filter(x => x.opt.parks.includes(p) && !refurbOn(x.iso, p, name)).map(x => x.iso) });
      }));
  const unplaced = items.filter(it => !it.elig.length && !it.park).map(it => `${it.r.name} (${wzAbbr(it.p)})`);
  const closedAll = items.filter(it => !it.elig.length && it.park).map(it => `${it.r.name} (${wzAbbr(it.p)})`);
  const heads = (iso) => WZ_PARKS.reduce((n, p) => n + [...days[iso].rides[p]].filter(nm => info[p + '|' + nm].head).length, 0);
  items.filter(it => it.elig.length).sort((a, b) => a.elig.length - b.elig.length || b.r.head - a.r.head || b.r.avg - a.r.avg).forEach(it => {
    const sameLand = (iso) => [...days[iso].rides[it.p]].filter(nm => info[it.p + '|' + nm].land === it.r.land).length;
    const pick = it.elig.slice().sort((a, b) => load(a) - load(b) || (it.r.head ? heads(a) - heads(b) : 0) || sameLand(b) - sameLand(a) || a.localeCompare(b))[0];
    days[pick].rides[it.p].add(it.r.name);
  });
  // extra times: on a day that doesn't have the ride yet if there is one, else the lightest day with room
  items.filter(it => it.elig.length).forEach(it => {
    for (let k = 2; k <= lapsOf(wz.reps && wz.reps[it.p], it.r.name); k++) {
      const ok = it.elig.filter(iso => dLaps(days[iso], it.p, it.r.name) < REP_DAY_MAX);
      if (!ok.length) break;
      const pick = ok.sort((a, b) => dLaps(days[a], it.p, it.r.name) - dLaps(days[b], it.p, it.r.name) || load(a) - load(b) || a.localeCompare(b))[0];
      dAdd(days[pick], it.p, it.r.name);
    }
  });
  for (let guard = 0; guard < 300; guard++) {
    const isos = pd.map(x => x.iso);
    const hi = isos.reduce((a, b) => load(b) > load(a) ? b : a), lo = isos.reduce((a, b) => load(b) < load(a) ? b : a);
    if (load(hi) - load(lo) < 2) break;
    const optLo = pd.find(x => x.iso === lo).opt; let moved = false;
    // move one time of a ride the light day doesn't have yet, so repeats stay on different days
    for (const p of WZ_PARKS) { if (!optLo.parks.includes(p)) continue;
      const nm = [...days[hi].rides[p]].reverse().find(n => !days[lo].rides[p].has(n) && !refurbOn(lo, p, n)); if (nm) { dDrop(days[hi], p, nm);
        dAdd(days[lo], p, nm); moved = true; break; } }
    if (!moved) break;
  }
  return { days, unplaced, closedAll };
}
function wzChip(label, pressed, onClick, title) {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'qt-chip'; b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
  b.textContent = label; if (title) b.title = title; if (onClick) b.addEventListener('click', onClick); return b;
}
function wzSelect(label, opts, value, onChange) {
  const l = document.createElement('label'); l.append(label + ' ');
  const s = document.createElement('select'); s.className = 'qt-input';
  opts.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; s.append(o); });
  s.value = String(value); s.addEventListener('change', () => onChange(s.value)); l.append(s); return l;
}
function wzTime(label, value, onChange) {
  const l = document.createElement('label'); l.append(label + ' ');
  const t = document.createElement('input'); t.type = 'time'; t.step = '900'; t.className = 'qt-input'; t.value = value || '';
  t.addEventListener('change', () => { if (t.value) onChange(t.value); }); l.append(t); return l;
}
// the note under a wizard day. more is the same re-plan answer (roomFor) the banner above the chips uses,
// so the two always agree; spare time is only shown, never used to call the day full.
function wzSlack(left, end, close, freeCosts, more, adv) {
  if (left.length) { const a = (adv || []).find(o => o.all || o.now.length);
    return `Doesn't fit: ${leftList(left, true)}. ${a ? `Taking off ${a.name} would make room for ${a.all ? 'everything else' : a.now.join(', ')}, or move` :
      'Move'} ${left.length === 1 ? 'it' : 'them'} to another day, or remove ${left.length === 1 ? 'it' : 'them'}.`; }
  const slack = close - end, before = dpState.win && dpState.win.end === 'set' ? 'your finish time' : 'close';
  const fin = `You'd finish about ${fmtClock(end % 24)}${slack >= 0.25 ? `, ${f1(slack)} h before ${before}` : ''}`;
  if (!freeCosts.length || (more && !more.total)) return `${fin}. Every ride is already on a day.`;
  if (more) return more.fit < 1 ? `This day is full: ${fin.charAt(0).toLowerCase() + fin.slice(1)}, and no other ride would fit.` :
    `${fin}. ${more.fit === more.total ? `Any of the ${more.fit} rides you haven't picked would still fit if you add one.` :
    `${more.fit} of the ${more.total} rides you haven't picked would still fit if you add one (ticked ✓ above).`}`;
  const k = slack < 1 ? 0 : Math.floor(slack * 60 / d3.mean(freeCosts));
  return k < 1 ? 'This day is full.' : `${fin}: room for roughly ${k} more ride${k === 1 ? '' : 's'}. Add them below.`;
}
const wzMore = (left, ctxs, taken, trial) => left.length ? null : roomFor(Object.values(ctxs), (p, r) => !taken.has(p + '|' + r.name), trial);
// the picked-restaurant note on a wizard day page; the trip's ticket decides whether a hop can be offered
function wzDine(el, steps, parks, box, day, D) {
  dineNote(el, steps, parks, { chips: box.parentElement && box.parentElement.querySelector('.qt-chipgroup'),
    noHop: tpState.ticket === 'hopper' ? null : 'Your ticket is one park per day, so there’s no hop to add (Park Hopper is a ticket choice on the Trip step).',
    clear: (x) => { day.dine[x.kind] = null; drawWalk(D); } });
  if (el.hidden) el.remove();
}
function wzRenderPlan(box, iso, opt, day, D) {
  box.textContent = '';
  const mk = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; box.append(e); return e; };
  if (!wzCount(day)) { mk('p', 'qt-note').textContent = 'No rides on this day yet. Add some below.'; return null; }
  const restore = wzApply(day);
  try {
    const T = travelMin(opt.parks[0]), Th = T / 60;
    const taken = new Set(); WZ_PARKS.forEach(p => day.rides[p].forEach(n => taken.add(p + '|' + n)));
    const ctxs = Object.fromEntries(opt.parks.map(p => [p, dayContext(iso, p, D)]));
    const freeCosts = opt.parks.flatMap(p => ctxs[p].rides.filter(r => !taken.has(p + '|' + r.name)).map(r => 20 + expWait(ctxs[p], r, 14) + r.rmin));
    const c0 = ctxs[opt.parks[0]];
    const hoursTxt = opt.parks.map(p => `${opt.parks.length > 1 ? wzAbbr(p) + ' ' : ''}${fmtClock(ctxs[p].open)}–${fmtClock(ctxs[p].close % 24)}`).join(' · ');
    mk('p', 'qt-dayinfo').textContent = `${hoursTxt} · sunset ${fmtClock(c0.sunset)} · ${c0.fc ?
      `forecast: ${c0.fc.conditions}, high ${f0(c0.fc.high)}°F, ${f0(Number(c0.wxd.rain_chance_pct))}% rain` :
      `typical high ${f0(Number(c0.wxd.avg_high_f))}°F, ${f0(Number(c0.wxd.rain_chance_pct))}% rain`}`;
    c0.evs.forEach(e => { mk('p', 'qt-note').textContent = `${e.name}: ${e.notes}`; });
    [...new Set(opt.parks.flatMap(p => dataNotes(ctxs[p])))].forEach(n => { mk('p', 'qt-note').textContent = n; });
    { const sn = shortNote(pickedOf(Object.values(ctxs))); if (sn) mk('p', 'qt-note').textContent = sn; }
    const times = mk('div', 'qt-keytimes'), stats = mk('p', 'qt-note'), ll = mk('p', 'qt-note qt-llnote'), steps = mk('ol', 'qt-steps'), note = mk('p', 'qt-note');
    { const T = tonightText(iso, ctxs); if (T) tonightInto(mk('div', 'qt-note qt-tonight'), T); }
    if (opt.parks.length === 1) {
      const park = opt.parks[0], ctx = ctxs[park];
      const pool = expandPool(ctx.rides.filter(r => day.rides[park].has(r.name)), day.reps[park]);
      const P = planDay(ctx, pool), X = day.brk > 0 ? P.split : null, S = P.stay;
      if (X) {
        const eOut = entryInfo(ctx, X.brk), eIn = entryInfo(ctx, X.ret), atA = X.brk + eOut.min / 60, atB = eIn.leave, atMin = Math.round((atB - atA) * 60);
        keyTimes(times, [['Arrive', fmtClock(X.arrive), `${arrSub(ctx, X.arrive)} · opens ${fmtClock(ctx.open)}`], ['Break', fmtClock(X.brk),
              `Exit the park · at hotel ~${fmtClock(atA)}`], ['Return', fmtClock(X.ret),
              atMin > 0 ? `Leave hotel by ${fmtClock(atB)} · ~${eIn.sec} min security` : 'At the park entrance'], ['Leave', fmtClock(X.leave % 24),
              X.left.length ? endLbl(P.win) : 'List done']]);
        stats.textContent = `${X.done} of ${pool.length} rides · ~${f0(X.totalWait)} min in lines${X.saved ? ` · Lightning Lane saves ~${f0(X.saved)} min` : ''}`;
        ll.textContent = llText(X.llp);
        stepList(steps, [['Morning', X.morning.steps],
            [`Break ${fmtClock(X.brk)}–${fmtClock(X.ret)} · ${eOut.min} min each way${eOut.g ? " via the hotel's own park entrance" : ''}`, []], ['Evening',
              X.evening.steps]]);
        const more = wzMore(X.left, ctxs, taken, qs => { const P2 = planDay(ctx, withRides(ctx, pool, qs)); return !(P2.split || P2.stay.plan).left.length; });
        const adv = fullAdvice(X.morning.steps.concat(X.evening.steps), X.left, (p, name) => { const P2 = planDay(ctx, pool.filter(r => r.name !== name)); return (P2.split || P2.stay.plan).left; });
        note.textContent = wzSlack(X.left, X.leave, P.win.t1, freeCosts, more, adv);
        wzDine(mk('p', 'qt-note'), X.morning.steps.concat(X.evening.steps), [park], box, day, D);
        if (P.brkMoved) mk('p', 'qt-note').textContent = `No break fits around ${brkAtLbl(day.brkAt)} on this day, so the planner picked the best time for it.`;
        return { left: X.left, slack: P.win.t1 - X.leave, freeCosts, more, adv, glance: {
            text: glanceText(X.leave, X.done, pool.length, X.totalWait, X.morning.steps.concat(X.evening.steps), X.heat), target: times } };
      } else {
        keyTimes(times, [['Arrive', fmtClock(S.arrive), `${arrSub(ctx, S.arrive)} · opens ${fmtClock(ctx.open)}`], ['Leave', fmtClock(S.leave % 24),
              S.plan.left.length ? endLbl(P.win) : 'List done']]);
        stats.textContent = `${S.done} of ${pool.length} rides · ~${f0(S.plan.totalWait)} min in lines${S.plan.saved ?
          ` · Lightning Lane saves ~${f0(S.plan.saved)} min` : ''}${day.brk > 0 ? ' · ' + (P.win.why ? winWhy(P.win).replace(/\.$/,
              '') : 'park hours too short for the break, so no break') : ''}`;
        ll.textContent = llText(S.llp);
        stepList(steps, [['', S.plan.steps]]);
        const more = wzMore(S.plan.left, ctxs, taken, qs => !planDay(ctx, withRides(ctx, pool, qs)).stay.plan.left.length);
        const adv = fullAdvice(S.plan.steps, S.plan.left, (p, name) => planDay(ctx, pool.filter(r => r.name !== name)).stay.plan.left);
        note.textContent = wzSlack(S.plan.left, S.leave, P.win.t1, freeCosts, more, adv);
        wzDine(mk('p', 'qt-note'), S.plan.steps, [park], box, day, D);
        return { left: S.plan.left, slack: P.win.t1 - S.leave, freeCosts, more, adv, glance: {
            text: glanceText(S.leave, S.done, pool.length, S.plan.totalWait, S.plan.steps, S.heat), target: times } };
      }
    } else {
      let H = day.brk > 0 ? planHopper(iso, D, true) : null; const noBreak = day.brk > 0 && !H;
      if (!H) H = planHopper(iso, D, false);
      const gaps = H.segs.slice(1).map((s, i) => { const p = H.segs[i];
          return s.gapBefore === 'break' ? ['Break', fmtClock(p.depart % 24), `Hotel ~${fmtClock((p.depart + travelMin(p.park, hotelGate(p.ctx,
                      p.depart)) / 60) % 24)} · leave by ${fmtClock(entryInfo(s.ctx,
                  s.start).leave % 24)} · back in ${s.park} by ${fmtClock(s.start % 24)}`] : ['Hop', fmtClock(p.depart % 24),
            `${p.park} → ${s.park}, ${s.hopMin} min`]; });
      keyTimes(times, [['Arrive', fmtClock(H.arrive), `${arrSub(H.ctx, H.arrive)} · ${H.first} opens ${fmtClock(H.ctx.open)}`]].concat(gaps, [['Leave',
              fmtClock(H.leave % 24), H.left.length ? endLbl(H.win) : 'List done']]));
      stats.textContent = `${H.done} of ${H.total} rides · ${H.hops} park hop${H.hops === 1 ? '' : 's'} · ~${f0(H.totalWait)} min in lines${noBreak ?
        ' · ' + (winWhy(H.win) ? winWhy(H.win).replace(/\.$/, '') : 'no break fits') : ''}`;
      WZ_PARKS.forEach(p => { const l = H.llps[p]; if (l && (l.multi.length || l.single.length)) { const d = document.createElement('div'); d.textContent = p + ': ' + llText(l); ll.append(d); } });
      stepList(steps, H.segs.map(s => [`${s.park} · ${fmtClock(s.start % 24)}–${fmtClock((s.hopStep ? s.depart : H.leave) % 24)}`, s.steps.concat(s.hopStep ? [s.hopStep] : [])]));
      const hopTrial = (qs) => { qs.forEach(q => day.rides[q.park].add(q.r.name)); try {
          const Y = (day.brk > 0 && planHopper(iso, D, true)) || planHopper(iso, D, false); return !!Y && !Y.left.length; } finally {
          qs.forEach(q => day.rides[q.park].delete(q.r.name)); } };
      // spare time runs to the later close of the two parks (you can hop back), not the park you end in
      const closeH = Math.max(...H.segs.map(s => s.ctx.close)), more = wzMore(H.left, ctxs, taken, hopTrial);
      const hopDrop = (p, name) => { const had = day.rides[p].has(name); day.rides[p].delete(name); try {
          const Y = (day.brk > 0 && planHopper(iso, D, true)) || planHopper(iso, D, false); return Y ? Y.left : H.left; } finally {
          if (had) day.rides[p].add(name); } };
      const adv = fullAdvice(H.segs.flatMap(s => s.steps), H.left, hopDrop);
      note.textContent = wzSlack(H.left, H.leave, closeH, freeCosts, more, adv);
      wzDine(mk('p', 'qt-note'), H.flat, WZ_PARKS, box, day, D);
      if (H.whyLeft) mk('p', 'qt-note').textContent = H.whyLeft;
      if (H.brkMoved) mk('p', 'qt-note').textContent = `No break fits around ${brkAtLbl(day.brkAt)} on this day, so the planner picked the best time for it.`;
      return { left: H.left, slack: closeH - H.leave, freeCosts, more, adv, glance: { text: glanceText(H.leave, H.done, H.total, H.totalWait, H.flat), target: times } };
    }
  } finally { restore(); }
}

// can every picked ride be done with one park per day? If so Park Hopper is not needed.
function wzOneParkFits(pd, D) {
  const selLaps = (p) => [...wz.sel[p]].reduce((k, nm) => k + lapsOf(wz.reps && wz.reps[p], nm), 0);
  const nDL = selLaps('Disneyland'), nDCA = selLaps('California Adventure'), N = pd.length, total = nDL + nDCA;
  if (!total) return null;
  const hours = pd.map(x => { const a = dayContext(x.iso, 'Disneyland', D), b = dayContext(x.iso, 'California Adventure', D); return (a.close - a.open) - (b.close - b.open); });
  const order = hours.map((d, i) => ({ i, d })).sort((x, y) => y.d - x.d);
  const tries = new Set(); const base = Math.round(N * nDL / total);
  [base - 1, base, base + 1].forEach(a => { a = Math.max(nDL ? 1 : 0, Math.min(nDCA ? N - 1 : N, a)); if (a >= 0 && a <= N) tries.add(a); });
  for (const a of tries) {
    const dl = new Set(order.slice(0, a).map(o => o.i));
    const pd2 = pd.map((x, i) => { const p = dl.has(i) ? 'Disneyland' : 'California Adventure'; return { iso: x.iso, i: x.i, opt: { label: p, parks: [p] } }; });
    const r = wzSpread(pd2, D);
    if (r.unplaced.length) continue;
    let ok = true;
    for (const x of pd2) {
      const d = r.days[x.iso], park = x.opt.parks[0], restore = wzApply(d);
      try { const ctx = dayContext(x.iso, park, D); const P = planDay(ctx, expandPool(ctx.rides.filter(r2 => d.rides[park].has(r2.name)), d.reps[park]));
        const left = (d.brk > 0 && P.split) ? P.split.left : P.stay.plan.left; if (left.length) ok = false; }
      finally { restore(); }
      if (!ok) break;
    }
    if (ok) return { parks: pd2.map(x => [x.iso, x.opt.label]) };
  }
  return null;
}
function syncGlobals() {
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = String(v); };
  ['wz-b2b', 'dp-b2b'].forEach(id => { const e = document.getElementById(id); if (e) e.checked = !!dpState.b2b; });
  set('wz-pace', dpState.pace); set('dp-pace', dpState.pace); set('wz-brk', dpState.brk); set('dp-break', dpState.brk); set('wz-start', dpState.start);
    set('dp-start', dpState.start); set('wz-walk', dpState.walk); set('dp-walk', dpState.walk);
  document.getElementById('wz-start-wrap').hidden = tpState.ticket !== 'hopper';
  ['wz', 'dp'].forEach(pre => { set(pre + '-brkat', dpState.brkAt); document.getElementById(pre + '-brkat-wrap').hidden = !(dpState.brk > 0); });
  set('wz-height', dpState.height); set('dp-height', dpState.height);
  const w = dpState.win;
  ['wz', 'dp'].forEach(pre => {
    set(pre + '-wstart', w.start); set(pre + '-wstart-at', w.startAt); set(pre + '-wend', w.end); set(pre + '-wend-at', w.endAt);
    document.getElementById(pre + '-wstart-at-wrap').hidden = w.start !== 'set'; document.getElementById(pre + '-wend-at-wrap').hidden = w.end !== 'set';
  });
  hotelLabels();
}
function wzDoSpread(pd, D) {
  const r = wzSpread(pd, D); wz.days = r.days; wz.unplaced = r.unplaced; wz.hopperAsk = null;
  const cnt = pd.map(x => wzCount(r.days[x.iso])); const uneven = Math.max(...cnt) - Math.min(...cnt) >= 3;
  const perPark = WZ_PARKS.map(p => { const n = pd.filter(x => x.opt.parks.includes(p)).length; return `${p} ${n} day${n === 1 ? '' : 's'}`; }).join(', ');
  wz.note = (r.unplaced.length ? `No park day visits the right park for: ${r.unplaced.join(', ')}. ` : '') + (r.closedAll.length ?
    `Closed for refurbishment on all your days at that park: ${r.closedAll.join(', ')}. ` : '') + (uneven ?
    `Some days are heavier because a ride can only go on a day that visits its park (${perPark}). Move rides between days, or change your park days.` : '');
  wz.step = WZ_PRE + 1; drawWalk(D); document.getElementById('panel-wizard').scrollIntoView();
}

function drawWalk(D) {
  wz.D = D; syncGlobals();
  const body = document.getElementById('walk-body'); body.textContent = '';
  const stepper = document.getElementById('wz-stepper'); stepper.textContent = '';
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const pd = wzParkDays();
  const nextBtn = document.getElementById('wz-setup-next'); nextBtn.disabled = !pd.length;
  document.getElementById('wz-setup-msg').textContent = pd.length ? '' : 'Pick your dates first.';
  document.getElementById('wz-dates-next').disabled = !lastTrip;
  if (pd.length) {
    if (!wz.sel) wz.sel = {};
    if (!wz.reps) wz.reps = newReps();
    WZ_PARKS.forEach(p => { if (!wz.sel[p]) { const ctx = dayContext(pd[0].iso, p, D);
          wz.sel[p] = new Set(ctx.rides.filter(r => dpState.rides[p] ? dpState.rides[p].has(r.name) : r.head).map(r => r.name)); } });
    const key = pd.map(x => x.iso + ':' + x.opt.parks.join('+')).join('|');
    if (wz.key !== key) { if (wz.days) wz.note = 'Your park days changed, so the rides were spread again. Re-check each day.'; wz.key = key; wz.days = null; if (wz.step > WZ_PRE) wz.step = WZ_PRE; }
  } else { wz.days = null; wz.step = Math.min(wz.step, lastTrip ? WZ_PRE - 1 : 1); }
  const nDays = pd.length, lastStep = nDays + WZ_PRE + 1;
  if (!wz.days && wz.step > WZ_PRE) wz.step = WZ_PRE;
  wz.step = Math.max(0, Math.min(wz.step, lastStep));
  wzShowSetup();
  const go = (s) => wzGo(s);
  const fmtDay = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
  const track = el('div', 'wz-track'); const fill = el('i'); fill.style.width = Math.round((wz.step + 1) / (nDays + WZ_PRE + 2) * 100) + '%'; track.append(fill); stepper.append(track);
  const stepIcon = (x) => x.opt.parks.length > 1 ? '🏰🎡' : x.opt.parks[0] === 'Disneyland' ? '🏰' : '🎡';
  [['🧳 Trip'], ['📅 Dates'], ['🗓️ Days'], ['🎢 Rides']].concat(pd.map((x, k) => [`${stepIcon(x)} Day ${k + 1}`]), [['📄 Export']]).forEach(([l], s) => {
    const b = wzChip((s < wz.step ? '✓ ' : '') + l, s === wz.step, () => go(s));
    if (s < wz.step) b.classList.add('wz-done');
    if ((s === 2 && !lastTrip) || (s >= WZ_PRE && !pd.length) || (s >= WZ_PRE + 1 && !wz.days)) b.disabled = true; stepper.append(b);
  });
  if (pd.length && wz.pendingSpread) { wz.pendingSpread = false; wzDoSpread(pd, D); return; }
  if (wz.step < WZ_PRE) return;
  if (wz.note) body.append(el('p', 'qt-note', wz.note));

  if (wz.step === WZ_PRE) {
    body.append(el('h3', '', 'Which rides do you want to do on this trip?'));
    body.append(el('p', 'qt-note', `Pick every ride you want across all ${nDays} park day${nDays === 1 ? '' :
          's'}. Next, they get spread across your days so each day has about the same number. Then you can fine-tune each day.`));
    body.append(el('p', 'qt-note', 'Tap a picked ride again to do it more than once (up to 6 times on the trip, 3 on any one day). Press and hold a ride to take it off.'));
    // quick picks first, then every ride with its details
    const quick = el('div', 'qt-controls');
    // a quick pick starts over: each picked ride once, any repeats cleared (as on Plan a day)
    const pickAll = (f) => { WZ_PARKS.forEach(p => { wz.sel[p] = new Set(dayContext(pd[0].iso, p, D).rides.filter(f).map(r => r.name)); wz.reps[p] = new Map(); }); wz.hopperAsk = null; drawWalk(D); };
    const hl = el('button', 'qt-link', 'Headliners only'); hl.type = 'button'; hl.addEventListener('click', () => pickAll(r => r.head));
    const kd = el('button', 'qt-link', 'Good for little kids'); kd.type = 'button'; kd.title = 'Gentle rides with no height limit'; kd.addEventListener('click', () => pickAll(kidPick));
    const ev = el('button', 'qt-link', 'Everything'); ev.type = 'button'; ev.addEventListener('click', () => pickAll(() => true));
    const no = el('button', 'qt-link', 'Nothing'); no.type = 'button'; no.title = 'Take every ride off'; no.addEventListener('click', () => pickAll(() => false));
    quick.append('Quick picks:', hl, kd, ev, no, riToggle()); body.append(quick);
    const box = el('div', 'qt-chipgroup');
    WZ_PARKS.forEach(p => {
      { const g = el('span', 'g wzh', p); g.dataset.park = p; box.append(g); }
      dayContext(pd[0].iso, p, D).rides.slice().sort(rideOrder).forEach((r, i, a) => {
        if (r.char && !(a[i - 1] || {}).char) { const g = el('span', 'g wzh', p + ' characters'); g.dataset.park = p; box.append(g); }
        const n = lapsOf(wz.reps[p], r.name), on = wz.sel[p].has(r.name);
        // trip total: up to REP_TRIP_MAX, and no more than REP_DAY_MAX on each day that visits this park
        const maxT = Math.min(REP_TRIP_MAX, REP_DAY_MAX * Math.max(1, pd.filter(x => x.opt.parks.includes(p)).length));
        const setN = v => { if (v) wz.sel[p].add(r.name); else wz.sel[p].delete(r.name); if (v > 1) wz.reps[p].set(r.name, v); else wz.reps[p].delete(r.name); wz.hopperAsk = null; drawWalk(D); };
        const c = wzChip(r.name + (on && n > 1 ? ' ×' + n : '') + (tooShort(r) ? ` (${r.minH} in and up)` : ''), on, null,
          tooShort(r) ? shortTip(r) : null); c.dataset.park = p; if (tooShort(r)) c.classList.add('short');
        rideInfo(c, r); cycleTap(c, () => setN(nextLap(on, n, maxT)), () => { if (on) setN(0); }); box.append(c);
      });
    });
    body.append(box);
    const nSel = WZ_PARKS.reduce((n, p) => n + [...wz.sel[p]].reduce((k, nm) => k + lapsOf(wz.reps[p], nm), 0), 0);
    body.append(el('p', 'qt-dayinfo', `${nSel} ride${nSel === 1 ? '' : 's'} picked for ${nDays} park day${nDays === 1 ? '' : 's'}${nSel ? ` (about ${Math.ceil(nSel / nDays)} per day)` : ''}.`));
    if (wz.hopperAsk) {
      const box2 = el('div', 'qt-warn');
      box2.append(el('p', '', `Good news: all ${nSel} rides fit with one park per day. Park Hopper adds an upgrade fee to every ticket, so you can save money by dropping it.`));
      box2.append(el('p', '', 'Remove Park Hopper? Your park days may shift, and the day steps will plan one park per day instead of hops.'));
      const yes = el('button', 'qt-btn', 'Yes, remove Park Hopper'); yes.type = 'button';
      yes.addEventListener('click', () => { tpState.ticket = 'one';
          document.querySelectorAll('#tp-ticket button').forEach(x => x.setAttribute('aria-pressed', x.dataset.v === 'one' ? 'true' : 'false'));
          wz.hopperAsk = null; wz.pendingSpread = true; drawTrip(); });
      const no = el('button', 'qt-btn', 'No, keep Park Hopper'); no.type = 'button'; no.style.marginLeft = '8px'; no.addEventListener('click', () => wzDoSpread(pd, D));
      box2.append(yes, no); body.append(box2);
    } else {
      const spread = el('button', 'qt-btn', wz.days ? 'Spread again (resets your day edits)' : 'Spread across my park days'); spread.type = 'button'; spread.disabled = !nSel;
      spread.addEventListener('click', () => {
        if (tpState.ticket === 'hopper') { const fit = wzOneParkFits(pd, D); if (fit) { wz.hopperAsk = fit; drawWalk(D); return; } }
        wzDoSpread(pd, D);
      });
      body.append(spread);
      if (wz.days) { const cont = el('button', 'qt-btn', 'Continue to Day 1'); cont.type = 'button'; cont.style.marginLeft = '8px';
        cont.addEventListener('click', () => go(WZ_PRE + 1)); body.append(cont); }
    }
    return;
  }

  if (wz.step <= nDays + WZ_PRE) {
    const k = wz.step - WZ_PRE - 1, { iso, opt } = pd[k], day = wz.days[iso];
    body.append(el('h3', 'wz-title pk-' + (opt.parks.length > 1 ? 'hop' : opt.parks[0] === 'Disneyland' ? 'dl' : 'dca'), `Day ${k + 1} of ${nDays} · ${fmtDay(iso)} · ${opt.label}`));
    const ctl = el('div', 'qt-controls');
    const wl = document.createElement('label'); wl.className = 'qt-walk'; wl.append('Shorter waits ');
    const wr = document.createElement('input'); wr.type = 'range'; wr.min = '0'; wr.max = '4'; wr.step = '1';
      wr.value = String(day.walk == null ? 2 : day.walk); wr.setAttribute('aria-label', 'Shorter waits or fewer steps today');
    wr.addEventListener('change', () => { day.walk = +wr.value; drawWalk(D); }); wl.append(wr, ' Fewer steps');
    if (!day.win) day.win = Object.assign({}, dpState.win);
    const dw = day.win, setDw = (k, v) => { day.win = Object.assign({}, dw, { [k]: v }); drawWalk(D); };
    ctl.append(wzSelect('Start', [['rope', 'Rope drop'], ['10', 'Mid-morning (10 am)'], ['13', 'After lunch (1 pm)'], ['set', 'At a set time']], dw.start, v => setDw('start', v)));
    if (dw.start === 'set') ctl.append(wzTime('Start at', dw.startAt, v => setDw('startAt', v)));
    ctl.append(wzSelect('Finish', [['close', 'At close'], ['set', 'Leave by a set time']], dw.end, v => setDw('end', v)));
    if (dw.end === 'set') ctl.append(wzTime('Leave by', dw.endAt, v => setDw('endAt', v)));
    ctl.append(wzSelect('Break length today', [[0, 'No break'], [1, '1 hour'], [2, '2 hours'], [3, '3 hours'], [4, '4 hours'], [5, '5 hours']], day.brk, v => { day.brk = +v; drawWalk(D); }));
    if (day.brkAt == null) day.brkAt = dpState.brkAt;
    if (day.brk > 0) ctl.append(wzSelect('Break around', [['auto', 'Whenever is best'], ['11', 'Around 11 am'], ['12', 'Around noon'], ['13',
            'Around 1 pm'], ['14', 'Around 2 pm'], ['15', 'Around 3 pm']], day.brkAt, v => { day.brkAt = v; drawWalk(D); }));
    ctl.append(wl);
    body.append(ctl);
    const daysOf = (p, name) => pd.filter(x => wz.days[x.iso].rides[p].has(name)).map(x => x.iso);
    const chips = el('div', 'qt-chipgroup'); chips.style.margin = 'var(--cds-gap-sm) 0 var(--cds-gap-lg)';
    { const t = el('div', 'qt-controls'); t.append(riToggle()); body.append(t); }
    opt.parks.forEach(p => {
      const all = dayContext(iso, p, D).rides.slice().sort(rideOrder);
      const here = all.filter(r => day.rides[p].has(r.name)), free = all.filter(r => !daysOf(p, r.name).length && !r.refurb),
        other = all.filter(r => !day.rides[p].has(r.name) && daysOf(p, r.name).length && !r.refurb);
      const pre = opt.parks.length > 1 ? p + ': ' : '';
      const section = (title, list, mkChip) => { if (!list.length) return; const g = el('span', 'g wzh', title); g.dataset.park = p; chips.append(g); list.forEach(r => {
        const c = mkChip(r); c.dataset.park = p; if (list !== here) c.dataset.add = p + '|' + r.name; chips.append(c);
        if (tooShort(r)) { c.classList.add('short'); c.title = shortTip(r); }
        if (list !== here) { rideInfo(c, r); return; }
        if (r.refurb) { c.textContent += ' ⚠ closed'; c.title = 'Closed for refurbishment on this day, so it is left out of the plan. Press and hold to take it off, and add it to another day.'; }
        const n = dLaps(day, p, r.name); c.dataset.fit = p + '|' + r.name; c.dataset.laps = String(n); if (n > 1) c.textContent += ' ×' + n;
        rideInfo(c, r);
        const setN = v => { lastTap = { key: p + '|' + r.name, added: v > n }; dSet(day, p, r.name, v); drawWalk(D); };
        cycleTap(c, () => setN(nextLap(true, n, REP_DAY_MAX)), () => setN(0));
      }); };
      section(`${pre}On this day (${here.length})`, here, r => wzChip(r.name, true, null, 'Tap again to ride it more times; press and hold to take it off this day'));
      section(`${pre}Add more`, free, r => wzChip(r.name, false, () => { lastTap = { key: p + '|' + r.name, added: true }; day.rides[p].add(r.name); drawWalk(D); }));
      section(`${pre}On other days (tap to do it today too; it stays on the other day)`, other, r => {
          const ns = daysOf(p, r.name).map(o => pd.findIndex(x => x.iso === o) + 1); return wzChip(`${r.name} (Day ${ns.join(', ')})`, false, () => {
              lastTap = { key: p + '|' + r.name, added: true }; day.rides[p].add(r.name); drawWalk(D); }); });
    });
    if (!day.dine) day.dine = { lunch: null, dinner: null };
    dineChips(chips, opt.parks, day.dine, () => drawWalk(D));
    body.append(chips);
    const planBox = el('div'); body.append(planBox);
    const fit = wzRenderPlan(planBox, iso, opt, day, D);
    { const cr = el('p', 'qt-wxsrc', 'Walking times use ride, restaurant and show locations © '); const a = document.createElement('a');
      a.href = 'https://www.openstreetmap.org/copyright'; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'OpenStreetMap contributors';
      cr.append(a, '.'); body.append(cr); }
    if (fit) fitStatus(chips, fit.left, fit.slack, fit.freeCosts, 'Press and hold one under "On this day" to take it off, or move it to another day.', fit.more, fit.adv, fit.glance);
    else lastTap = null;
    const nav = el('div', 'qt-controls');
    const back = el('button', 'qt-btn', k === 0 ? '← Rides' : `← Day ${k}`); back.type = 'button'; back.addEventListener('click', () => go(wz.step - 1));
    const next = el('button', 'qt-btn', k === nDays - 1 ? 'Finish and export →' : `Next: Day ${k + 2} →`); next.type = 'button'; next.addEventListener('click', () => go(wz.step + 1));
    nav.append(back, next); body.append(nav);
    return;
  }

  // export step
  body.append(el('h3', '', 'Your trip'));
  const tbl = el('table', 'qt-table'); const th = el('thead');
    th.innerHTML = '<tr><th class="l">Day</th><th class="l">Park</th><th>Rides</th><th class="l">Break</th><th class="l">Priority</th></tr>'; tbl.append(th);
  const tb = el('tbody');
  pd.forEach((x, k) => {
    const d = wz.days[x.iso], tr = el('tr');
    [[`Day ${k + 1}: ${fmtDay(x.iso)}`, 'l'], [x.opt.label, 'l'], [String(wzCount(d))],
      [(brkOf(d) ? d.brk + '-hour break' : 'No break') + (winLabel(d.win) ? ' · ' + winLabel(d.win) : ''), 'l'], [walkPref(d.walk), 'l']].forEach(([v, c]) => {
        tr.append(el('td', c || '', v)); });
    tr.style.cursor = 'pointer'; tr.addEventListener('click', () => go(k + WZ_PRE + 1)); tb.append(tr);
  });
  tbl.append(tb); const wrap = el('div', 'qt-tablewrap'); wrap.append(tbl); body.append(wrap);
  const left = WZ_PARKS.flatMap(p => { const all = dayContext(pd[0].iso, p, D).rides;
      return all.filter(r => wz.sel[p].has(r.name) && !pd.some(x => wz.days[x.iso].rides[p].has(r.name))).map(r => `${r.name} (${wzAbbr(p)})`); });
  if (left.length) body.append(el('p', 'qt-note', `Picked but not on any day: ${left.join(', ')}.`));
  { const bk = tripBookings(pd); if (bk.length) { const box = el('div', 'qt-note qt-tonight'); const b = el('b', '', '🍽️ Restaurant bookings');
      const ul = el('ul'); bk.forEach(x => ul.append(el('li', '', bookingLine(x)))); box.append(b, ul); body.append(box); } }
  body.append(el('p', 'qt-note', `Pace: ${{ relaxed: 'relaxed', normal: 'normal', fast: 'go-go' }[dpState.pace]}. ` +
    `The PDF starts with a trip overview (your days and the rides on each), ` +
    `then one page per park day with tick boxes: the schedule, Lightning Lane order, weather, meal ideas, closures and events.`));
  const nav = el('div', 'qt-controls');
  const back = el('button', 'qt-btn', `← Day ${nDays}`); back.type = 'button'; back.addEventListener('click', () => go(wz.step - 1));
  const exp = el('button', 'qt-btn', 'Save trip as PDF'); exp.type = 'button'; exp.addEventListener('click', () => exportTripPDF());
  nav.append(back, exp); body.append(nav);
}
document.getElementById('wz-setup-next').addEventListener('click', () => wzGo(WZ_PRE));
['wz-b2b', 'dp-b2b'].forEach(id => document.getElementById(id).addEventListener('change', (e) => { dpState.b2b = e.target.checked; syncGlobals(); drawDay(); if (wz.D) drawWalk(wz.D); }));
document.getElementById('wz-trip-next').addEventListener('click', () => wzGo(1));
document.getElementById('wz-dates-back').addEventListener('click', () => wzGo(0));
document.getElementById('wz-dates-next').addEventListener('click', () => wzGo(2));
document.getElementById('wz-days-back').addEventListener('click', () => wzGo(1));
[['wz-pace', 'pace', String], ['wz-brk', 'brk', Number], ['wz-start', 'start', String], ['wz-walk', 'walk', Number]].forEach(([id, k,
      cast]) => document.getElementById(id).addEventListener('change', (e) => { dpState[k] = cast(e.target.value); syncGlobals(); drawDay();
      if (wz.D) drawWalk(wz.D); }));
['dp-hotel', 'dp-custom', 'dp-ll', 'dp-ls'].forEach(id => ['change', 'input'].forEach(ev => document.getElementById(id).addEventListener(ev,
      () => setTimeout(() => { if (wz.D) drawWalk(wz.D); }, 0))));
