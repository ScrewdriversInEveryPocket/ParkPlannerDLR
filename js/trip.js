// DLR Planner: Trip wizard, first steps: your trip, trip scoring and best dates.
// Part of the app script. The js files load in the order of their script tags in index.html (listed in CLAUDE.md).
// ---------- trip wizard: your trip, best dates, your days ----------
const TRIP_IDS = DAY_IDS.concat(['crowd_by_week', 'crowd_by_weekday', 'ticket_tiers', 'multi_day_prices', 'planner_base']);
// days = park days (= ticket days), rest = break days with no park; start = first full day (the day after check-in)
const tpState = { start: null, auto: true, days: 3, rest: 1, ticket: 'one', each: true, manual: null, inT: '15:00', outT: '11:00' };
const TRIP_HORIZON = 365;
const tpStart = document.getElementById('tp-start');
const tpDays = document.getElementById('tp-days'), tpRest = document.getElementById('tp-rest');
for (let i = 1; i <= 10; i++) { const o = document.createElement('option'); o.value = i; o.textContent = i + (i === 1 ? ' day' : ' days'); tpDays.append(o); }
for (let i = 0; i <= 5; i++) { const o = document.createElement('option'); o.value = i; o.textContent = i === 0 ? 'None' : i + (i === 1 ? ' day' : ' days'); tpRest.append(o); }
tpDays.value = String(tpState.days); tpRest.value = String(tpState.rest);
const isoAdd = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad2(t.getUTCMonth() + 1)}-${pad2(t.getUTCDate())}`; };
const hhmm = (s) => { const [h, m] = String(s || '0:0').split(':').map(Number); return (h || 0) + (m || 0) / 60; };
const tpLen = () => tpState.days + tpState.rest;
const tripChanged = () => { tpState.manual = null; drawTrip(); };
tpDays.addEventListener('change', () => { tpState.days = +tpDays.value; tripChanged(); });
tpRest.addEventListener('change', () => { tpState.rest = +tpRest.value; tripChanged(); });
tpStart.addEventListener('change', () => { if (tpStart.value && tpStart.value > todayISO()) { tpState.start = tpStart.value; tpState.auto = false;
      tpState.manual = null; wz.week = null; drawTrip(); } });
document.querySelectorAll('#tp-ticket button').forEach(b => b.addEventListener('click', () => { tpState.ticket = b.dataset.v; tpState.manual = null;
      document.querySelectorAll('#tp-ticket button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); drawTrip(); }));
document.getElementById('tp-each').addEventListener('change', (e) => { tpState.each = e.target.checked; drawTrip(); });
[['tp-in', 'inT'], ['tp-out', 'outT']].forEach(([id, k]) => document.getElementById(id).addEventListener('change', (e) => { if (e.target.value) { tpState[k] = e.target.value; drawTrip(); } }));

// one date in one park, scored on headliners (rides are picked after the dates); cached because the
// trip finder looks at every date of the next year
const metricCache = new Map();
function dayMetrics(iso, park, D) {
  const fcKey = ['forecast_daily', 'forecast_hourly', 'forecast_accu'].map(id => dash.data(id).status).join();
  const key = iso + '|' + park + '|' + fcKey;
  if (metricCache.has(key)) return metricCache.get(key);
  const ctx = dayContext(iso, park, D);
  const use = ctx.rides.filter(r => r.head);
  const hEnd = Math.min(ctx.close, 22);
  let s = 0, n = 0; for (let h = Math.max(9, Math.ceil(ctx.open)); h < hEnd; h++) { s += d3.mean(use, r => expWait(ctx, r, h)); n++; }
  const pk = park === 'Disneyland' ? 'disneyland' : 'california_adventure';
  const cw = D.crowd_by_week.find(r => Number(r.week) === ctx.wkN) || {};
  const dowName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][ctx.dow];
  const cd = D.crowd_by_weekday.find(r => r.day === dowName) || {};
  const cdMean = d3.mean(D.crowd_by_weekday, r => Number(r[pk]));
  const wx = ctx.wxd;
  const tk = D.ticket_tiers.find(r => r.date === iso);
  const m = {
    price: tk ? Number(tk.price_usd) : null, tier: tk ? Number(tk.tier) : null,
    ctx, park, wait: n ? s / n : 0, crowd: Number(cw[pk]) + (Number(cd[pk]) - cdMean),
    temp: Math.abs(Number(wx.feels_like_high_f) - 74) + 0.15 * Number(wx.hot_day_pct) + 0.15 * Number(wx.chilly_night_pct),
    rain: Number(wx.rain_chance_pct), open: use.filter(r => ctx.closedSet.has(r.name)).length,
    hours: ctx.close - ctx.open, sunset: ctx.sunset, early: park === 'California Adventure' && ctx.close <= 19,
    closedNames: use.filter(r => ctx.closedSet.has(r.name)).map(r => r.name)
  };
  metricCache.set(key, m); return m;
}
// park options for one date: one per park, or a single Park Hopper option
function dayOpts(iso, D) {
  const parksFor = tpState.ticket === 'dl' ? ['Disneyland'] : tpState.ticket === 'dca' ? ['California Adventure'] : ['Disneyland', 'California Adventure'];
  const c = Object.fromEntries(parksFor.map(p => [p, dayMetrics(iso, p, D)]));
  if (tpState.ticket === 'hopper') {
    const a = c['Disneyland'], b = c['California Adventure'];
    return [{ label: 'Park Hopper', parks: ['Disneyland', 'California Adventure'], m: {
          wait: (a.wait + b.wait) / 2, crowd: (a.crowd + b.crowd) / 2, temp: a.temp, rain: a.rain, open: a.open + b.open, hours: Math.max(a.hours, b.hours),
          sunset: a.sunset, early: false, price: a.price, tier: a.tier }, parts: [a, b] }];
  }
  return parksFor.map(p => ({ label: p, parks: [p], m: c[p], parts: [c[p]] }));
}
// score every option against the whole year, so a trip's score means the same thing in any month
function scoreOpts(all) {
  const keys = ['wait', 'crowd', 'temp', 'rain', 'open', 'hours', 'sunset', 'price'];
  const pMean = d3.mean(all.map(o => o.m.price).filter(v => v != null));
  all.forEach(o => { o.m.priceScore = o.m.price == null ? (pMean ?? 0) : o.m.price; });
  const hb = { hours: true, sunset: true };
  const mk = (o, k) => k === 'price' ? o.m.priceScore : o.m[k];
  const rng = Object.fromEntries(keys.map(k => [k, d3.extent(all, o => mk(o, k))]));
  // don't let a 2% vs 0% rain gap or a 1°F difference count as the full range
  const minSpan = { rain: 30, temp: 8 };
  keys.forEach(k => { if (minSpan[k] && rng[k][1] - rng[k][0] < minSpan[k]) rng[k] = [rng[k][0], rng[k][0] + minSpan[k]]; });
  const wsum = keys.reduce((s, k) => s + plState.w[k], 0) || 1;
  all.forEach(o => {
    let sc = 0; keys.forEach(k => { const [lo, hi] = rng[k]; const v = mk(o, k); const g = hi === lo ? 1 : (hb[k] ? (v - lo) / (hi - lo) : (hi - v) / (hi - lo)); sc += plState.w[k] * g; });
    o.score = sc / wsum * 100 - (o.m.early ? 25 : 0);
  });
}
const bestOf = (os) => os.reduce((a, b) => (b.score > a.score ? b : a));
// pick the break days for one trip: the weakest days, never first or last, never two in a row;
// the rules relax only when there aren't enough park days to keep them apart
function pickRest(opts, R) {
  const L = opts.length; if (!R) return [];
  const v = opts.map(o => bestOf(o).score);
  const tryPick = (lo, hi, apart) => {
    let best = null, bestS = Infinity; const cur = [];
    const rec = (i, s) => {
      if (cur.length === R) { if (s < bestS) { bestS = s; best = cur.slice(); } return; }
      for (let j = i; j <= hi; j++) { if (apart && cur.length && j - cur[cur.length - 1] < 2) continue; cur.push(j); rec(j + 1, s + v[j]); cur.pop(); }
    };
    rec(lo, 0); return best;
  };
  return tryPick(1, L - 2, true) || tryPick(0, L - 1, true) || tryPick(0, L - 1, false) || [];
}
// choose each park day's park; with one park per day and "visit each park", make sure both parks appear
function pickParks(opts, idx) {
  const pick = idx.map(i => bestOf(opts[i]));
  if (tpState.ticket === 'one' && tpState.each && idx.length >= 2 && new Set(pick.map(p => p.label)).size < 2) {
    let k = -1, loss = Infinity;
    idx.forEach((i, j) => { const alt = opts[i].find(o => o.label !== pick[j].label); if (alt && pick[j].score - alt.score < loss) { loss = pick[j].score - alt.score; k = j; } });
    if (k >= 0) pick[k] = opts[idx[k]].find(o => o.label !== pick[k].label);
  }
  return pick;
}
function evalTrip(opts) {
  const rest = new Set(pickRest(opts, tpState.rest));
  const combo = d3.range(opts.length).filter(i => !rest.has(i));
  const pick = pickParks(opts, combo);
  return { combo, pick, total: d3.sum(pick, p => p.score), avg: d3.mean(pick, p => p.score) };
}
const fmtShort = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
const fmtWd = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
const weekOfIso = (iso) => { const [, m, d] = iso.split('-').map(Number); return weekOf(m, d); };

function drawTrip() {
  const root = document.getElementById('trip-plan');
  const st = statusOf(TRIP_IDS);
  if (st !== 'ok') { if (st === 'error') failed(root); else root.classList.add('dash-skeleton'); return; }
  root.classList.remove('dash-skeleton');
  document.getElementById('tp-each-wrap').hidden = tpState.ticket !== 'one' || tpState.days < 2;
  // the best-weeks list follows the ticket's parks
  const plPark = tpState.ticket === 'dl' ? 'dl' : tpState.ticket === 'dca' ? 'dca' : 'both';
  if (plState.park !== plPark) { plState.park = plPark; drawPlanner(); }
  const D = Object.fromEntries(TRIP_IDS.map(id => [id, dash.data(id).data]));
  const L = tpLen(), nights = L + 1;
  const ticketWord = { one: 'one park per day', hopper: 'Park Hopper', dl: 'Disneyland only', dca: 'California Adventure only' }[tpState.ticket];
  document.getElementById('tp-staysum').textContent = `Your stay: ${nights} nights. Check-in day, ${tpState.days} park day${tpState.days === 1 ? '' :
    's'}${tpState.rest ? `, ${tpState.rest} break day${tpState.rest === 1 ? '' : 's'}` :
    ''}, then checkout day. That’s a ${tpState.days}-day ticket (${ticketWord}).`;

  // every first full day from tomorrow through the next year
  const first = isoAdd(todayISO(), 1);
  const dates = d3.range(TRIP_HORIZON + L).map(i => isoAdd(first, i));
  const opts = dates.map(iso => dayOpts(iso, D));
  scoreOpts(opts.flat());
  const wkRow = new Map(D.planner_base.map(r => [Number(r.week), r]));
  const okWin = (s) => {
    for (let i = 0; i < L; i++) {
      const r = wkRow.get(weekOfIso(dates[s + i])) || {};
      if (plState.school === 'avoid' && !schoolOk(r)) return false;
    }
    // only during school breaks: every park day of the trip falls in a school-break week
    if (plState.school === 'only' && !d3.range(L).every(i => schoolOk(wkRow.get(weekOfIso(dates[s + i])) || {}))) return false;
    if (plState.events.size) return d3.range(L).some(i => { const r = wkRow.get(weekOfIso(dates[s + i])) || {};
        return [...plState.events].some(n => String(r.events || '').split(', ').includes(n)); });
    return true;
  };
  const wins = [];
  for (let s = 0; s < TRIP_HORIZON; s++) { if (!okWin(s)) continue; const T = evalTrip(opts.slice(s, s + L)); wins.push(Object.assign(T, { s, start: dates[s] })); }
  wins.sort((a, b) => b.avg - a.avg);
  // cards: around a chosen week, or the best trips of the year spread out so they aren't all the same week
  let shown;
  if (wz.week) {
    const [y0] = first.split('-').map(Number);
    const wkStart = [y0, y0 + 1].map(y => { const d = new Date(Date.UTC(y, 0, 1 + (wz.week - 1) * 7));
        return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`; }).find(iso => isoAdd(iso, 6) >= first);
    const lo = isoAdd(wkStart, -3), hi = isoAdd(wkStart, 9);
    shown = wins.filter(w => w.start >= lo && w.start <= hi).slice(0, 6);
  } else {
    shown = []; for (const w of wins) { if (shown.length >= 8) break; if (shown.some(x => Math.abs(x.s - w.s) < Math.max(4, L))) continue; shown.push(w); }
  }
  if (!tpState.start || tpState.start <= todayISO()) tpState.auto = true;
  if (tpState.auto) { tpState.start = shown.length ? shown[0].start : (wins.length ? wins[0].start : null); tpState.manual = null; }
  tpStart.value = tpState.start || '';
  drawTripCards(shown, wins, dates);

  // your days for the chosen trip
  const cal = document.getElementById('tp-cal'), sum = document.getElementById('tp-sum');
  cal.textContent = ''; sum.textContent = '';
  if (!tpState.start) { lastTrip = null; sum.textContent = 'Pick a trip on the Dates step first.'; drawWalk(D); return; }
  const days = d3.range(L).map(i => isoAdd(tpState.start, i));
  // reuse the year's scored options; a start beyond the year gets scored alongside them
  const at = dates.indexOf(tpState.start);
  let dOpts = at >= 0 ? opts.slice(at, at + L) : null;
  if (!dOpts) { dOpts = days.map(iso => dayOpts(iso, D)); scoreOpts(opts.flat().concat(dOpts.flat())); }
  let best = Object.assign(evalTrip(dOpts), { manual: false });
  // days the user changed by hand replace the suggested ones
  if (tpState.manual) {
    const m = tpState.manual;
    const ok = d3.range(L).filter(i => m[days[i]] != null && dOpts[i].some(o => o.label === m[days[i]]));
    if (ok.length) { const picks = ok.map(i => dOpts[i].find(o => o.label === m[days[i]])); best = {
        total: d3.sum(picks, o => o.score), avg: d3.mean(picks, o => o.score), combo: ok, pick: picks, manual: true }; }
    else tpState.manual = null;
  }
  const checkin = isoAdd(tpState.start, -1), checkout = isoAdd(tpState.start, L);
  lastTrip = { days, best, checkin, checkout };
  const chosen = new Map(best.combo.map((i, j) => [i, best.pick[j]]));
  const N = best.combo.length;
  const travelCard = (iso, title, line) => {
    const card = document.createElement('div'); card.className = 'qt-tday travel';
    const h = document.createElement('div'); h.className = 'td'; h.textContent = fmtShort(iso);
    const pv = document.createElement('div'); pv.className = 'tp'; pv.textContent = title;
    const facts = document.createElement('div'); facts.className = 'tf';
    const x = dayContext(iso, 'Disneyland', D);
    [line, 'Travel day, no park ticket', (x.fc ? `Forecast: ${x.fc.conditions}, ` :
        'Typical: ') + `high ${f0(Number(x.wxd.avg_high_f))}°F · ${f0(Number(x.wxd.rain_chance_pct))}% rain`].forEach(t => {
        const d = document.createElement('div'); d.textContent = t; facts.append(d); });
    card.append(h, pv, facts); cal.append(card);
  };
  travelCard(checkin, 'Check-in day', `Hotel check-in from ${fmtClock(hhmm(tpState.inT))}`);
  days.forEach((iso, i) => {
    const pick = chosen.get(i);
    const card = document.createElement('div'); card.className = 'qt-tday' + (pick ? ' on ' + (pick.parts.length > 1 ? 'pk-hop' : pick.parts[0].park === 'Disneyland' ? 'pk-dl' : 'pk-dca') : ' rest');
    const h = document.createElement('div'); h.className = 'td'; h.textContent = fmtShort(iso);
    const pv = document.createElement('div'); pv.className = 'tp'; pv.textContent = pick ? pick.label : 'Break day';
    card.append(h, pv);
    const bestOpt = bestOf(dOpts[i]);
    const show = pick || bestOpt;
    const bar = document.createElement('div'); bar.className = 'tb'; const bi = document.createElement('i');
      bi.style.width = Math.max(0, Math.min(100, show.score)).toFixed(0) + '%'; bi.style.background = resolveColor(dash.colors[0]); bar.append(bi);
      card.append(bar);
    const facts = document.createElement('div'); facts.className = 'tf';
    const m0 = show.parts[0];
    const lines = [];
    show.parts.forEach(p => lines.push(`${p.park === 'Disneyland' ? 'DL' : 'DCA'} ${fmtClock(p.ctx.open)}–${fmtClock(p.ctx.close % 24)} · ~${fmtDur(f0(p.wait))} avg wait`));
    lines.push((m0.ctx.fc ? `Forecast (${m0.ctx.fc.src}): ${m0.ctx.fc.conditions}, ` : 'Typical: ') + `high ${f0(Number(m0.ctx.wxd.avg_high_f))}°F · ${f0(Number(m0.ctx.wxd.rain_chance_pct))}% rain`);
    lines.push(m0.price != null ? `1‑day ticket $${f0(m0.price)} (tier ${m0.tier})` : '1‑day price not published yet');
    longWeekendNotes(iso, iso).forEach(n => lines.push('⚠️ ' + n));
    show.parts.forEach(p => { if (p.early) lines.push('DCA early‑close party night'); if (p.closedNames.length) lines.push('Closed or often closed: ' + p.closedNames.join(', ')); });
    if (!pick) lines.push('Pool time, a nap, or a day out' + (dOpts[i].length > 1 ? `. Best park if you go: ${bestOpt.label}` : ''));
    lines.forEach(t => { const d = document.createElement('div'); d.textContent = t; facts.append(d); });
    card.append(facts);
    // let the user switch this day between a park day and a break day, and pick the park
    const setPick = (label) => {
      const m = tpState.manual || Object.fromEntries(best.combo.map((j, k) => [days[j], best.pick[k].label]));
      if (label == null) delete m[iso]; else m[iso] = label;
      // changing a day locks in these dates, or the next redraw would pick the dates again and drop the change
      tpState.auto = false;
      tpState.manual = Object.keys(m).length ? m : null; drawTrip();
    };
    const ctl = document.createElement('div'); ctl.className = 'qt-chipgroup'; ctl.style.marginTop = 'var(--cds-gap-sm)';
    if (pick) {
      if (dOpts[i].length > 1) dOpts[i].forEach(o => { const b = document.createElement('button'); b.type = 'button'; b.className = 'qt-chip';
          b.setAttribute('aria-pressed', o.label === pick.label ? 'true' : 'false'); b.textContent = o.label === 'Disneyland' ? 'DL' : 'DCA'; b.title = o.label;
          b.addEventListener('click', () => setPick(o.label)); ctl.append(b); });
      const rm = document.createElement('button'); rm.type = 'button'; rm.className = 'qt-link'; rm.textContent = 'Make break day'; rm.disabled = N <= 1;
        rm.addEventListener('click', () => setPick(null)); ctl.append(rm);
    } else {
      const add = document.createElement('button'); add.type = 'button'; add.className = 'qt-link'; add.textContent = 'Use as park day';
        add.addEventListener('click', () => setPick(bestOpt.label)); ctl.append(add);
    }
    card.append(ctl);
    cal.append(card);
  });
  travelCard(checkout, 'Checkout day', `Check out by ${fmtClock(hhmm(tpState.outT))}`);
  // summary
  const rest = d3.range(L).filter(i => !chosen.has(i));
  const fmtD = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' });
  const p1 = document.createElement('p'); p1.className = 'qt-dayinfo';
  p1.textContent = `Check in ${fmtD(checkin)}, ${checkin.slice(0,
      4)} from ${fmtClock(hhmm(tpState.inT))} · ${N} park day${N === 1 ? '' : 's'}${rest.length ? `, ${rest.length} break day${rest.length === 1 ? '' : 's'}` :
    ''} · check out ${fmtD(checkout)} by ${fmtClock(hhmm(tpState.outT))} · ${L + 1} nights · ${N}-day ticket.`;
  sum.append(p1);
  const p2 = document.createElement('p'); p2.className = 'qt-note'; p2.style.margin = '0 0 4px';
  p2.textContent = (best.manual ? 'Your park days: ' : 'Park days: ') + best.combo.map((i, j) => `${fmtD(days[i])} (${best.pick[j].label})`).join(', ') + '.';
  sum.append(p2);
  if (best.manual) {
    const rs = document.createElement('p'); rs.className = 'qt-note'; rs.style.margin = '0 0 4px';
    rs.append(N !== tpState.days ? `You changed these days yourself, so your ticket is now ${N} day${N === 1 ? '' : 's'}. ` : 'You changed these days yourself. ');
    const back = document.createElement('button'); back.type = 'button'; back.className = 'qt-link'; back.textContent = 'Go back to the suggested days';
      back.addEventListener('click', () => { tpState.manual = null; drawTrip(); });
    rs.append(back); sum.append(rs);
  }
  const why = [];
  const pickedOpts = best.pick;
  if (rest.length) {
    const restBest = rest.map(i => bestOf(dOpts[i]));
    const dW = d3.mean(restBest, o => o.m.wait) - d3.mean(pickedOpts, o => o.m.wait);
    if (Math.abs(dW) >= 0.5) why.push(`Your park days average about ${fmtDur(f0(Math.abs(dW)))} ${dW > 0 ? 'shorter' : 'longer'} waits than your break days would.`);
    if (restBest.some(o => o.m.early)) why.push('A break day falls on a California Adventure early‑close party night.');
    const adj = rest.some((i, k) => k && i - rest[k - 1] === 1);
    if (adj) why.push(best.manual ? 'Two of your break days are back to back.' : 'Two break days sit next to each other because there aren’t enough park days to split them up.');
  }
  const nFc = days.filter(iso => dayMetrics(iso, 'Disneyland', D).ctx.fc).length;
  why.push(nFc ? `Weather uses the live forecast for ${nFc} of your ${days.length} full days, and 10‑year averages for the rest.` :
    'Weather uses 10‑year averages (no live forecast for these dates yet).');
  const mdp = dash.data('multi_day_prices');
  if (tpState.ticket !== 'hopper' && N >= 2 && N <= 5 && mdp.status === 'ok') {
    const prices = pickedOpts.map(o => o.m.price);
    const multi = mdp.data.find(r => Number(r.days) === N);
    if (multi && prices.every(p => p != null)) {
      const s1 = d3.sum(prices), mp = Number(multi.price_usd);
      why.push(`Tickets: a ${N}‑day ticket is $${f0(mp)} per adult whichever days you pick. Separate 1‑day tickets for these days would be $${f0(s1)}, so the ${s1 < mp ?
          'separate 1‑day tickets save $' + f0(mp - s1) : N + '‑day ticket saves $' + f0(s1 - mp)}.`);
    }
  }
  why.push('Scores use the priorities you set on the Dates step.');
  why.forEach(t => { const p = document.createElement('p'); p.className = 'qt-note'; p.style.margin = '0 0 4px'; p.textContent = t; sum.append(p); });
  drawWalk(D);
}

function drawTripCards(shown, wins, dates) {
  const head = document.getElementById('tp-cards-head'), box = document.getElementById('tp-cards');
  head.textContent = ''; box.textContent = '';
  const L = tpLen();
  const hp = document.createElement('p'); hp.className = 'qt-note'; hp.style.marginTop = '0';
  if (wz.week) {
    const r = (dash.data('planner_base').data || []).find(x => Number(x.week) === wz.week);
    hp.append(`Trips starting around ${r ? r.week_label : 'week ' + wz.week}. `);
    const all = document.createElement('button'); all.type = 'button'; all.className = 'qt-link'; all.textContent = 'Show the best trips of the year';
    all.addEventListener('click', () => { wz.week = null; if (tpState.auto) tpState.manual = null; drawTrip(); });
    hp.append(all);
  } else hp.textContent = `The best ${L}-day trips in the next 12 months for your priorities (${tpState.days} park day${tpState.days === 1 ? '' :
    's'}${tpState.rest ?
    ` + ${tpState.rest} break` : ''}), plus check-in and checkout days. Tap “Show trips this week” on any week above to see trips around it.`;
  head.append(hp);
  if (!shown.length) { const p = document.createElement('p'); p.className = 'qt-note';
    p.textContent = wins.length ? 'No trips start around that week with your filters.' :
    'No trips match those filters. Try unticking “Skip holiday weeks” or the event chips.'; box.append(p); return; }
  const pctOf = (w) => Math.max(0, Math.min(100, w.avg));
  shown.forEach((w, k) => {
    const card = document.createElement('div'); card.className = 'tp-card' + (w.start === tpState.start ? ' on' : '');
    const checkin = isoAdd(w.start, -1), checkout = isoAdd(w.start, L);
    const t = document.createElement('div'); t.className = 'tc-t'; t.textContent = `${fmtShort(checkin)} → ${fmtShort(checkout)}, ${checkout.slice(0, 4)}`;
    const sub = document.createElement('div'); sub.className = 'tc-s'; sub.textContent = `${L + 1} nights · ${k === 0 && !wz.week ? 'best match · ' : ''}score ${f0(pctOf(w))}`;
    const bar = document.createElement('div'); bar.className = 'tb'; const bi = document.createElement('i'); bi.style.width = pctOf(w).toFixed(0) + '%';
      bi.style.background = resolveColor(dash.colors[0]); bar.append(bi);
    const rest = d3.range(L).filter(i => !w.combo.includes(i));
    const ab = (o) => o.label === 'Park Hopper' ? 'Hopper' : o.label === 'Disneyland' ? 'DL' : 'DCA';
    const ul = document.createElement('div'); ul.className = 'tc-f';
    const lines = [
      `Check in ${fmtShort(checkin)} from ${fmtClock(hhmm(tpState.inT))}`,
      'Park days: ' + w.combo.map((i, j) => `${fmtWd(dates[w.s + i])} ${ab(w.pick[j])}`).join(', '),
      rest.length ? 'Break: ' + rest.map(i => fmtWd(dates[w.s + i])).join(', ') : null,
      `Check out ${fmtShort(checkout)} by ${fmtClock(hhmm(tpState.outT))}`,
      `~${fmtDur(f0(d3.mean(w.pick, o => o.m.wait)))} avg wait · highs ${f0(d3.mean(w.pick, o => Number(o.parts[0].ctx.wxd.avg_high_f)))}°F · ${f0(d3.mean(w.pick, o => o.m.rain))}% rain`,
      (() => { const ps = w.pick.map(o => o.m.price).filter(v => v != null); return ps.length === w.pick.length ? `1‑day tickets avg $${f0(d3.mean(ps))}` : null; })(),
      (() => { const ev = [...new Set(w.pick.flatMap(o => o.parts.flatMap(p => p.ctx.evs.map(e => e.name))))]; return ev.length ? ev.join(', ') : null; })(),
      (() => { const n = longWeekendNotes(checkin, checkout); return n.length ? '⚠️ ' + n.join(' ') : null; })()
    ].filter(Boolean);
    lines.forEach(x => { const d = document.createElement('div'); d.textContent = x; ul.append(d); });
    const b = document.createElement('button'); b.type = 'button'; b.className = w.start === tpState.start ? 'qt-chip' : 'qt-btn';
      b.textContent = w.start === tpState.start ? '✓ Chosen' : 'Choose this trip';
    if (w.start === tpState.start) b.setAttribute('aria-pressed', 'true');
    b.addEventListener('click', () => { tpState.start = w.start; tpState.auto = false; tpState.manual = null; drawTrip(); wzGo(2); });
    card.append(t, sub, bar, ul, b); box.append(card);
  });
}
