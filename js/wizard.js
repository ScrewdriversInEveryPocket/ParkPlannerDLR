// DLR Planner: Trip wizard: trip scoring and dates, days, rides, day pages, export step, walking chart.
// Part of the app script, split from index.html. The js files load in this order: core, charts, explore, controls, engine, plan-day, wizard, time-of-day, state, pdf, app.
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
const isoAdd = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + n)); return `${t.getUTCFullYear()}-${pad2(t.getUTCMonth() + 1)}-${pad2(t.getUTCDate())}`; };
const hhmm = (s) => { const [h, m] = String(s || '0:0').split(':').map(Number); return (h || 0) + (m || 0) / 60; };
const tpLen = () => tpState.days + tpState.rest;
const tripChanged = () => { tpState.manual = null; drawTrip(); };
tpDays.addEventListener('change', () => { tpState.days = +tpDays.value; tripChanged(); });
tpRest.addEventListener('change', () => { tpState.rest = +tpRest.value; tripChanged(); });
tpStart.addEventListener('change', () => { if (tpStart.value && tpStart.value > todayISO()) { tpState.start = tpStart.value; tpState.auto = false; tpState.manual = null; wz.week = null; drawTrip(); } });
document.querySelectorAll('#tp-ticket button').forEach(b => b.addEventListener('click', () => { tpState.ticket = b.dataset.v; tpState.manual = null; document.querySelectorAll('#tp-ticket button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); drawTrip(); }));
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
    return [{ label: 'Park Hopper', parks: ['Disneyland', 'California Adventure'], m: { wait: (a.wait + b.wait) / 2, crowd: (a.crowd + b.crowd) / 2, temp: a.temp, rain: a.rain, open: a.open + b.open, hours: Math.max(a.hours, b.hours), sunset: a.sunset, early: false, price: a.price, tier: a.tier }, parts: [a, b] }];
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
  document.getElementById('tp-staysum').textContent = `Your stay: ${nights} nights. Check-in day, ${tpState.days} park day${tpState.days === 1 ? '' : 's'}${tpState.rest ? `, ${tpState.rest} break day${tpState.rest === 1 ? '' : 's'}` : ''}, then checkout day. That’s a ${tpState.days}-day ticket (${ticketWord}).`;

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
    if (plState.events.size) return d3.range(L).some(i => { const r = wkRow.get(weekOfIso(dates[s + i])) || {}; return [...plState.events].some(n => String(r.events || '').split(', ').includes(n)); });
    return true;
  };
  const wins = [];
  for (let s = 0; s < TRIP_HORIZON; s++) { if (!okWin(s)) continue; const T = evalTrip(opts.slice(s, s + L)); wins.push(Object.assign(T, { s, start: dates[s] })); }
  wins.sort((a, b) => b.avg - a.avg);
  // cards: around a chosen week, or the best trips of the year spread out so they aren't all the same week
  let shown;
  if (wz.week) {
    const [y0] = first.split('-').map(Number);
    const wkStart = [y0, y0 + 1].map(y => { const d = new Date(Date.UTC(y, 0, 1 + (wz.week - 1) * 7)); return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`; }).find(iso => isoAdd(iso, 6) >= first);
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
    if (ok.length) { const picks = ok.map(i => dOpts[i].find(o => o.label === m[days[i]])); best = { total: d3.sum(picks, o => o.score), avg: d3.mean(picks, o => o.score), combo: ok, pick: picks, manual: true }; }
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
    [line, 'Travel day, no park ticket', (x.fc ? `Forecast: ${x.fc.conditions}, ` : 'Typical: ') + `high ${f0(Number(x.wxd.avg_high_f))}°F · ${f0(Number(x.wxd.rain_chance_pct))}% rain`].forEach(t => { const d = document.createElement('div'); d.textContent = t; facts.append(d); });
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
    const bar = document.createElement('div'); bar.className = 'tb'; const bi = document.createElement('i'); bi.style.width = Math.max(0, Math.min(100, show.score)).toFixed(0) + '%'; bi.style.background = resolveColor(dash.colors[0]); bar.append(bi); card.append(bar);
    const facts = document.createElement('div'); facts.className = 'tf';
    const m0 = show.parts[0];
    const lines = [];
    show.parts.forEach(p => lines.push(`${p.park === 'Disneyland' ? 'DL' : 'DCA'} ${fmtClock(p.ctx.open)}–${fmtClock(p.ctx.close % 24)} · ~${f0(p.wait)} min avg wait`));
    lines.push((m0.ctx.fc ? `Forecast (${m0.ctx.fc.src}): ${m0.ctx.fc.conditions}, ` : 'Typical: ') + `high ${f0(Number(m0.ctx.wxd.avg_high_f))}°F · ${f0(Number(m0.ctx.wxd.rain_chance_pct))}% rain`);
    lines.push(m0.price != null ? `1‑day ticket $${f0(m0.price)} (tier ${m0.tier})` : '1‑day price not published yet');
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
      if (dOpts[i].length > 1) dOpts[i].forEach(o => { const b = document.createElement('button'); b.type = 'button'; b.className = 'qt-chip'; b.setAttribute('aria-pressed', o.label === pick.label ? 'true' : 'false'); b.textContent = o.label === 'Disneyland' ? 'DL' : 'DCA'; b.title = o.label; b.addEventListener('click', () => setPick(o.label)); ctl.append(b); });
      const rm = document.createElement('button'); rm.type = 'button'; rm.className = 'qt-link'; rm.textContent = 'Make break day'; rm.disabled = N <= 1; rm.addEventListener('click', () => setPick(null)); ctl.append(rm);
    } else {
      const add = document.createElement('button'); add.type = 'button'; add.className = 'qt-link'; add.textContent = 'Use as park day'; add.addEventListener('click', () => setPick(bestOpt.label)); ctl.append(add);
    }
    card.append(ctl);
    cal.append(card);
  });
  travelCard(checkout, 'Checkout day', `Check out by ${fmtClock(hhmm(tpState.outT))}`);
  // summary
  const rest = d3.range(L).filter(i => !chosen.has(i));
  const fmtD = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' });
  const p1 = document.createElement('p'); p1.className = 'qt-dayinfo';
  p1.textContent = `Check in ${fmtD(checkin)}, ${checkin.slice(0, 4)} from ${fmtClock(hhmm(tpState.inT))} · ${N} park day${N === 1 ? '' : 's'}${rest.length ? `, ${rest.length} break day${rest.length === 1 ? '' : 's'}` : ''} · check out ${fmtD(checkout)} by ${fmtClock(hhmm(tpState.outT))} · ${L + 1} nights · ${N}-day ticket.`;
  sum.append(p1);
  const p2 = document.createElement('p'); p2.className = 'qt-note'; p2.style.margin = '0 0 4px';
  p2.textContent = (best.manual ? 'Your park days: ' : 'Park days: ') + best.combo.map((i, j) => `${fmtD(days[i])} (${best.pick[j].label})`).join(', ') + '.';
  sum.append(p2);
  if (best.manual) {
    const rs = document.createElement('p'); rs.className = 'qt-note'; rs.style.margin = '0 0 4px';
    rs.append(N !== tpState.days ? `You changed these days yourself, so your ticket is now ${N} day${N === 1 ? '' : 's'}. ` : 'You changed these days yourself. ');
    const back = document.createElement('button'); back.type = 'button'; back.className = 'qt-link'; back.textContent = 'Go back to the suggested days'; back.addEventListener('click', () => { tpState.manual = null; drawTrip(); });
    rs.append(back); sum.append(rs);
  }
  const why = [];
  const pickedOpts = best.pick;
  if (rest.length) {
    const restBest = rest.map(i => bestOf(dOpts[i]));
    const dW = d3.mean(restBest, o => o.m.wait) - d3.mean(pickedOpts, o => o.m.wait);
    if (Math.abs(dW) >= 0.5) why.push(`Your park days average about ${f0(Math.abs(dW))} min ${dW > 0 ? 'shorter' : 'longer'} waits than your break days would.`);
    if (restBest.some(o => o.m.early)) why.push('A break day falls on a California Adventure early‑close party night.');
    const adj = rest.some((i, k) => k && i - rest[k - 1] === 1);
    if (adj) why.push(best.manual ? 'Two of your break days are back to back.' : 'Two break days sit next to each other because there aren’t enough park days to split them up.');
  }
  const nFc = days.filter(iso => dayMetrics(iso, 'Disneyland', D).ctx.fc).length;
  why.push(nFc ? `Weather uses the live forecast for ${nFc} of your ${days.length} full days, and 10‑year averages for the rest.` : 'Weather uses 10‑year averages (no live forecast for these dates yet).');
  const mdp = dash.data('multi_day_prices');
  if (tpState.ticket !== 'hopper' && N >= 2 && N <= 5 && mdp.status === 'ok') {
    const prices = pickedOpts.map(o => o.m.price);
    const multi = mdp.data.find(r => Number(r.days) === N);
    if (multi && prices.every(p => p != null)) {
      const s1 = d3.sum(prices), mp = Number(multi.price_usd);
      why.push(`Tickets: a ${N}‑day ticket is $${f0(mp)} per adult whichever days you pick. Separate 1‑day tickets for these days would be $${f0(s1)}, so the ${s1 < mp ? 'separate 1‑day tickets save $' + f0(mp - s1) : N + '‑day ticket saves $' + f0(s1 - mp)}.`);
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
  } else hp.textContent = `The best ${L}-day trips in the next 12 months for your priorities (${tpState.days} park day${tpState.days === 1 ? '' : 's'}${tpState.rest ? ` + ${tpState.rest} break` : ''}), plus check-in and checkout days. Tap “Show trips this week” on any week above to see trips around it.`;
  head.append(hp);
  if (!shown.length) { const p = document.createElement('p'); p.className = 'qt-note'; p.textContent = wins.length ? 'No trips start around that week with your filters.' : 'No trips match those filters. Try unticking “Skip holiday weeks” or the event chips.'; box.append(p); return; }
  const pctOf = (w) => Math.max(0, Math.min(100, w.avg));
  shown.forEach((w, k) => {
    const card = document.createElement('div'); card.className = 'tp-card' + (w.start === tpState.start ? ' on' : '');
    const checkin = isoAdd(w.start, -1), checkout = isoAdd(w.start, L);
    const t = document.createElement('div'); t.className = 'tc-t'; t.textContent = `${fmtShort(checkin)} → ${fmtShort(checkout)}, ${checkout.slice(0, 4)}`;
    const sub = document.createElement('div'); sub.className = 'tc-s'; sub.textContent = `${L + 1} nights · ${k === 0 && !wz.week ? 'best match · ' : ''}score ${f0(pctOf(w))}`;
    const bar = document.createElement('div'); bar.className = 'tb'; const bi = document.createElement('i'); bi.style.width = pctOf(w).toFixed(0) + '%'; bi.style.background = resolveColor(dash.colors[0]); bar.append(bi);
    const rest = d3.range(L).filter(i => !w.combo.includes(i));
    const ab = (o) => o.label === 'Park Hopper' ? 'Hopper' : o.label === 'Disneyland' ? 'DL' : 'DCA';
    const ul = document.createElement('div'); ul.className = 'tc-f';
    const lines = [
      `Check in ${fmtShort(checkin)} from ${fmtClock(hhmm(tpState.inT))}`,
      'Park days: ' + w.combo.map((i, j) => `${fmtWd(dates[w.s + i])} ${ab(w.pick[j])}`).join(', '),
      rest.length ? 'Break: ' + rest.map(i => fmtWd(dates[w.s + i])).join(', ') : null,
      `Check out ${fmtShort(checkout)} by ${fmtClock(hhmm(tpState.outT))}`,
      `~${f0(d3.mean(w.pick, o => o.m.wait))} min avg wait · highs ${f0(d3.mean(w.pick, o => Number(o.parts[0].ctx.wxd.avg_high_f)))}°F · ${f0(d3.mean(w.pick, o => o.m.rain))}% rain`,
      (() => { const ps = w.pick.map(o => o.m.price).filter(v => v != null); return ps.length === w.pick.length ? `1‑day tickets avg $${f0(d3.mean(ps))}` : null; })(),
      (() => { const ev = [...new Set(w.pick.flatMap(o => o.parts.flatMap(p => p.ctx.evs.map(e => e.name))))]; return ev.length ? ev.join(', ') : null; })()
    ].filter(Boolean);
    lines.forEach(x => { const d = document.createElement('div'); d.textContent = x; ul.append(d); });
    const b = document.createElement('button'); b.type = 'button'; b.className = w.start === tpState.start ? 'qt-chip' : 'qt-btn'; b.textContent = w.start === tpState.start ? '✓ Chosen' : 'Choose this trip';
    if (w.start === tpState.start) b.setAttribute('aria-pressed', 'true');
    b.addEventListener('click', () => { tpState.start = w.start; tpState.auto = false; tpState.manual = null; drawTrip(); wzGo(2); });
    card.append(t, sub, bar, ul, b); box.append(card);
  });
}

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
  const days = {}; pd.forEach(x => { days[x.iso] = { rides: { 'Disneyland': new Set(), 'California Adventure': new Set() }, reps: newReps(), brk: dpState.brk, brkAt: dpState.brkAt, walk: dpState.walk, win: Object.assign({}, dpState.win) }; });
  const load = (iso) => wzCount(days[iso]);
  const items = []; WZ_PARKS.forEach(p => wz.sel[p].forEach(name => { const r = info[p + '|' + name]; if (r) items.push({ p, r, park: pd.some(x => x.opt.parks.includes(p)), elig: pd.filter(x => x.opt.parks.includes(p) && !refurbOn(x.iso, p, name)).map(x => x.iso) }); }));
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
    for (const p of WZ_PARKS) { if (!optLo.parks.includes(p)) continue; const nm = [...days[hi].rides[p]].reverse().find(n => !days[lo].rides[p].has(n) && !refurbOn(lo, p, n)); if (nm) { dDrop(days[hi], p, nm); dAdd(days[lo], p, nm); moved = true; break; } }
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
  if (left.length) { const a = (adv || []).find(o => o.all || o.now.length); return `Doesn't fit: ${leftList(left, true)}. ${a ? `Taking off ${a.name} would make room for ${a.all ? 'everything else' : a.now.join(', ')}, or move` : 'Move'} ${left.length === 1 ? 'it' : 'them'} to another day, or remove ${left.length === 1 ? 'it' : 'them'}.`; }
  const slack = close - end, before = dpState.win && dpState.win.end === 'set' ? 'your finish time' : 'close';
  const fin = `You'd finish about ${fmtClock(end % 24)}${slack >= 0.25 ? `, ${f1(slack)} h before ${before}` : ''}`;
  if (!freeCosts.length || (more && !more.total)) return `${fin}. Every ride is already on a day.`;
  if (more) return more.fit < 1 ? `This day is full: ${fin.charAt(0).toLowerCase() + fin.slice(1)}, and no other ride would fit.` : `${fin}. ${more.fit === more.total ? `Any of the ${more.fit} rides you haven't picked would still fit if you add one.` : `${more.fit} of the ${more.total} rides you haven't picked would still fit if you add one (ticked ✓ above).`}`;
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
    mk('p', 'qt-dayinfo').textContent = `${hoursTxt} · sunset ${fmtClock(c0.sunset)} · ${c0.fc ? `forecast: ${c0.fc.conditions}, high ${f0(c0.fc.high)}°F, ${f0(Number(c0.wxd.rain_chance_pct))}% rain` : `typical high ${f0(Number(c0.wxd.avg_high_f))}°F, ${f0(Number(c0.wxd.rain_chance_pct))}% rain`}`;
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
        keyTimes(times, [['Arrive', fmtClock(X.arrive), `${arrSub(ctx, X.arrive)} · opens ${fmtClock(ctx.open)}`], ['Break', fmtClock(X.brk), `Exit the park · at hotel ~${fmtClock(atA)}`], ['Return', fmtClock(X.ret), atMin > 0 ? `Leave hotel by ${fmtClock(atB)} · ~${eIn.sec} min security` : 'At the park entrance'], ['Leave', fmtClock(X.leave % 24), X.left.length ? endLbl(P.win) : 'List done']]);
        stats.textContent = `${X.done} of ${pool.length} rides · ~${f0(X.totalWait)} min in lines${X.saved ? ` · Lightning Lane saves ~${f0(X.saved)} min` : ''}`;
        ll.textContent = llText(X.llp);
        stepList(steps, [['Morning', X.morning.steps], [`Break ${fmtClock(X.brk)}–${fmtClock(X.ret)} · ${eOut.min} min each way${eOut.g ? " via the hotel's own park entrance" : ''}`, []], ['Evening', X.evening.steps]]);
        const more = wzMore(X.left, ctxs, taken, qs => { const P2 = planDay(ctx, withRides(ctx, pool, qs)); return !(P2.split || P2.stay.plan).left.length; });
        const adv = fullAdvice(X.morning.steps.concat(X.evening.steps), X.left, (p, name) => { const P2 = planDay(ctx, pool.filter(r => r.name !== name)); return (P2.split || P2.stay.plan).left; });
        note.textContent = wzSlack(X.left, X.leave, P.win.t1, freeCosts, more, adv);
        wzDine(mk('p', 'qt-note'), X.morning.steps.concat(X.evening.steps), [park], box, day, D);
        if (P.brkMoved) mk('p', 'qt-note').textContent = `No break fits around ${brkAtLbl(day.brkAt)} on this day, so the planner picked the best time for it.`;
        return { left: X.left, slack: P.win.t1 - X.leave, freeCosts, more, adv, glance: { text: glanceText(X.leave, X.done, pool.length, X.totalWait, X.morning.steps.concat(X.evening.steps), X.heat), target: times } };
      } else {
        keyTimes(times, [['Arrive', fmtClock(S.arrive), `${arrSub(ctx, S.arrive)} · opens ${fmtClock(ctx.open)}`], ['Leave', fmtClock(S.leave % 24), S.plan.left.length ? endLbl(P.win) : 'List done']]);
        stats.textContent = `${S.done} of ${pool.length} rides · ~${f0(S.plan.totalWait)} min in lines${S.plan.saved ? ` · Lightning Lane saves ~${f0(S.plan.saved)} min` : ''}${day.brk > 0 ? ' · ' + (P.win.why ? winWhy(P.win).replace(/\.$/, '') : 'park hours too short for the break, so no break') : ''}`;
        ll.textContent = llText(S.llp);
        stepList(steps, [['', S.plan.steps]]);
        const more = wzMore(S.plan.left, ctxs, taken, qs => !planDay(ctx, withRides(ctx, pool, qs)).stay.plan.left.length);
        const adv = fullAdvice(S.plan.steps, S.plan.left, (p, name) => planDay(ctx, pool.filter(r => r.name !== name)).stay.plan.left);
        note.textContent = wzSlack(S.plan.left, S.leave, P.win.t1, freeCosts, more, adv);
        wzDine(mk('p', 'qt-note'), S.plan.steps, [park], box, day, D);
        return { left: S.plan.left, slack: P.win.t1 - S.leave, freeCosts, more, adv, glance: { text: glanceText(S.leave, S.done, pool.length, S.plan.totalWait, S.plan.steps, S.heat), target: times } };
      }
    } else {
      let H = day.brk > 0 ? planHopper(iso, D, true) : null; const noBreak = day.brk > 0 && !H;
      if (!H) H = planHopper(iso, D, false);
      const gaps = H.segs.slice(1).map((s, i) => { const p = H.segs[i]; return s.gapBefore === 'break' ? ['Break', fmtClock(p.depart % 24), `Hotel ~${fmtClock((p.depart + travelMin(p.park, hotelGate(p.ctx, p.depart)) / 60) % 24)} · leave by ${fmtClock(entryInfo(s.ctx, s.start).leave % 24)} · back in ${s.park} by ${fmtClock(s.start % 24)}`] : ['Hop', fmtClock(p.depart % 24), `${p.park} → ${s.park}, ${s.hopMin} min`]; });
      keyTimes(times, [['Arrive', fmtClock(H.arrive), `${arrSub(H.ctx, H.arrive)} · ${H.first} opens ${fmtClock(H.ctx.open)}`]].concat(gaps, [['Leave', fmtClock(H.leave % 24), H.left.length ? endLbl(H.win) : 'List done']]));
      stats.textContent = `${H.done} of ${H.total} rides · ${H.hops} park hop${H.hops === 1 ? '' : 's'} · ~${f0(H.totalWait)} min in lines${noBreak ? ' · ' + (winWhy(H.win) ? winWhy(H.win).replace(/\.$/, '') : 'no break fits') : ''}`;
      WZ_PARKS.forEach(p => { const l = H.llps[p]; if (l && (l.multi.length || l.single.length)) { const d = document.createElement('div'); d.textContent = p + ': ' + llText(l); ll.append(d); } });
      stepList(steps, H.segs.map(s => [`${s.park} · ${fmtClock(s.start % 24)}–${fmtClock((s.hopStep ? s.depart : H.leave) % 24)}`, s.steps.concat(s.hopStep ? [s.hopStep] : [])]));
      const hopTrial = (qs) => { qs.forEach(q => day.rides[q.park].add(q.r.name)); try { const Y = (day.brk > 0 && planHopper(iso, D, true)) || planHopper(iso, D, false); return !!Y && !Y.left.length; } finally { qs.forEach(q => day.rides[q.park].delete(q.r.name)); } };
      // spare time runs to the later close of the two parks (you can hop back), not the park you end in
      const closeH = Math.max(...H.segs.map(s => s.ctx.close)), more = wzMore(H.left, ctxs, taken, hopTrial);
      const hopDrop = (p, name) => { const had = day.rides[p].has(name); day.rides[p].delete(name); try { const Y = (day.brk > 0 && planHopper(iso, D, true)) || planHopper(iso, D, false); return Y ? Y.left : H.left; } finally { if (had) day.rides[p].add(name); } };
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
      try { const ctx = dayContext(x.iso, park, D); const P = planDay(ctx, expandPool(ctx.rides.filter(r2 => d.rides[park].has(r2.name)), d.reps[park])); const left = (d.brk > 0 && P.split) ? P.split.left : P.stay.plan.left; if (left.length) ok = false; }
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
  set('wz-pace', dpState.pace); set('dp-pace', dpState.pace); set('wz-brk', dpState.brk); set('dp-break', dpState.brk); set('wz-start', dpState.start); set('dp-start', dpState.start); set('wz-walk', dpState.walk); set('dp-walk', dpState.walk);
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
  wz.note = (r.unplaced.length ? `No park day visits the right park for: ${r.unplaced.join(', ')}. ` : '') + (r.closedAll.length ? `Closed for refurbishment on all your days at that park: ${r.closedAll.join(', ')}. ` : '') + (uneven ? `Some days are heavier because a ride can only go on a day that visits its park (${perPark}). Move rides between days, or change your park days.` : '');
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
    WZ_PARKS.forEach(p => { if (!wz.sel[p]) { const ctx = dayContext(pd[0].iso, p, D); wz.sel[p] = new Set(ctx.rides.filter(r => dpState.rides[p] ? dpState.rides[p].has(r.name) : r.head).map(r => r.name)); } });
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
    body.append(el('p', 'qt-note', `Pick every ride you want across all ${nDays} park day${nDays === 1 ? '' : 's'}. Next, they get spread across your days so each day has about the same number. Then you can fine-tune each day.`));
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
        const c = wzChip(r.name + (on && n > 1 ? ' ×' + n : '') + (tooShort(r) ? ` (${r.minH} in and up)` : ''), on, null, tooShort(r) ? shortTip(r) : null); c.dataset.park = p; if (tooShort(r)) c.classList.add('short');
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
      yes.addEventListener('click', () => { tpState.ticket = 'one'; document.querySelectorAll('#tp-ticket button').forEach(x => x.setAttribute('aria-pressed', x.dataset.v === 'one' ? 'true' : 'false')); wz.hopperAsk = null; wz.pendingSpread = true; drawTrip(); });
      const no = el('button', 'qt-btn', 'No, keep Park Hopper'); no.type = 'button'; no.style.marginLeft = '8px'; no.addEventListener('click', () => wzDoSpread(pd, D));
      box2.append(yes, no); body.append(box2);
    } else {
      const spread = el('button', 'qt-btn', wz.days ? 'Spread again (resets your day edits)' : 'Spread across my park days'); spread.type = 'button'; spread.disabled = !nSel;
      spread.addEventListener('click', () => {
        if (tpState.ticket === 'hopper') { const fit = wzOneParkFits(pd, D); if (fit) { wz.hopperAsk = fit; drawWalk(D); return; } }
        wzDoSpread(pd, D);
      });
      body.append(spread);
      if (wz.days) { const cont = el('button', 'qt-btn', 'Continue to Day 1'); cont.type = 'button'; cont.style.marginLeft = '8px'; cont.addEventListener('click', () => go(WZ_PRE + 1)); body.append(cont); }
    }
    return;
  }

  if (wz.step <= nDays + WZ_PRE) {
    const k = wz.step - WZ_PRE - 1, { iso, opt } = pd[k], day = wz.days[iso];
    body.append(el('h3', 'wz-title pk-' + (opt.parks.length > 1 ? 'hop' : opt.parks[0] === 'Disneyland' ? 'dl' : 'dca'), `Day ${k + 1} of ${nDays} · ${fmtDay(iso)} · ${opt.label}`));
    const ctl = el('div', 'qt-controls');
    const wl = document.createElement('label'); wl.className = 'qt-walk'; wl.append('Shorter waits ');
    const wr = document.createElement('input'); wr.type = 'range'; wr.min = '0'; wr.max = '4'; wr.step = '1'; wr.value = String(day.walk == null ? 2 : day.walk); wr.setAttribute('aria-label', 'Shorter waits or fewer steps today');
    wr.addEventListener('change', () => { day.walk = +wr.value; drawWalk(D); }); wl.append(wr, ' Fewer steps');
    if (!day.win) day.win = Object.assign({}, dpState.win);
    const dw = day.win, setDw = (k, v) => { day.win = Object.assign({}, dw, { [k]: v }); drawWalk(D); };
    ctl.append(wzSelect('Start', [['rope', 'Rope drop'], ['10', 'Mid-morning (10 am)'], ['13', 'After lunch (1 pm)'], ['set', 'At a set time']], dw.start, v => setDw('start', v)));
    if (dw.start === 'set') ctl.append(wzTime('Start at', dw.startAt, v => setDw('startAt', v)));
    ctl.append(wzSelect('Finish', [['close', 'At close'], ['set', 'Leave by a set time']], dw.end, v => setDw('end', v)));
    if (dw.end === 'set') ctl.append(wzTime('Leave by', dw.endAt, v => setDw('endAt', v)));
    ctl.append(wzSelect('Break length today', [[0, 'No break'], [1, '1 hour'], [2, '2 hours'], [3, '3 hours'], [4, '4 hours'], [5, '5 hours']], day.brk, v => { day.brk = +v; drawWalk(D); }));
    if (day.brkAt == null) day.brkAt = dpState.brkAt;
    if (day.brk > 0) ctl.append(wzSelect('Break around', [['auto', 'Whenever is best'], ['11', 'Around 11 am'], ['12', 'Around noon'], ['13', 'Around 1 pm'], ['14', 'Around 2 pm'], ['15', 'Around 3 pm']], day.brkAt, v => { day.brkAt = v; drawWalk(D); }));
    ctl.append(wl);
    body.append(ctl);
    const daysOf = (p, name) => pd.filter(x => wz.days[x.iso].rides[p].has(name)).map(x => x.iso);
    const chips = el('div', 'qt-chipgroup'); chips.style.margin = 'var(--cds-gap-sm) 0 var(--cds-gap-lg)';
    { const t = el('div', 'qt-controls'); t.append(riToggle()); body.append(t); }
    opt.parks.forEach(p => {
      const all = dayContext(iso, p, D).rides.slice().sort(rideOrder);
      const here = all.filter(r => day.rides[p].has(r.name)), free = all.filter(r => !daysOf(p, r.name).length && !r.refurb), other = all.filter(r => !day.rides[p].has(r.name) && daysOf(p, r.name).length && !r.refurb);
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
      section(`${pre}On other days (tap to do it today too; it stays on the other day)`, other, r => { const ns = daysOf(p, r.name).map(o => pd.findIndex(x => x.iso === o) + 1); return wzChip(`${r.name} (Day ${ns.join(', ')})`, false, () => { lastTap = { key: p + '|' + r.name, added: true }; day.rides[p].add(r.name); drawWalk(D); }); });
    });
    if (!day.dine) day.dine = { lunch: null, dinner: null };
    dineChips(chips, opt.parks, day.dine, () => drawWalk(D));
    body.append(chips);
    const planBox = el('div'); body.append(planBox);
    const fit = wzRenderPlan(planBox, iso, opt, day, D);
    { const cr = el('p', 'qt-wxsrc', 'Walking times use ride, restaurant and show locations © '); const a = document.createElement('a'); a.href = 'https://www.openstreetmap.org/copyright'; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'OpenStreetMap contributors'; cr.append(a, '.'); body.append(cr); }
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
  const tbl = el('table', 'qt-table'); const th = el('thead'); th.innerHTML = '<tr><th class="l">Day</th><th class="l">Park</th><th>Rides</th><th class="l">Break</th><th class="l">Priority</th></tr>'; tbl.append(th);
  const tb = el('tbody');
  pd.forEach((x, k) => {
    const d = wz.days[x.iso], tr = el('tr');
    [[`Day ${k + 1}: ${fmtDay(x.iso)}`, 'l'], [x.opt.label, 'l'], [String(wzCount(d))], [(brkOf(d) ? d.brk + '-hour break' : 'No break') + (winLabel(d.win) ? ' · ' + winLabel(d.win) : ''), 'l'], [walkPref(d.walk), 'l']].forEach(([v, c]) => { tr.append(el('td', c || '', v)); });
    tr.style.cursor = 'pointer'; tr.addEventListener('click', () => go(k + WZ_PRE + 1)); tb.append(tr);
  });
  tbl.append(tb); const wrap = el('div', 'qt-tablewrap'); wrap.append(tbl); body.append(wrap);
  const left = WZ_PARKS.flatMap(p => { const all = dayContext(pd[0].iso, p, D).rides; return all.filter(r => wz.sel[p].has(r.name) && !pd.some(x => wz.days[x.iso].rides[p].has(r.name))).map(r => `${r.name} (${wzAbbr(p)})`); });
  if (left.length) body.append(el('p', 'qt-note', `Picked but not on any day: ${left.join(', ')}.`));
  { const bk = tripBookings(pd); if (bk.length) { const box = el('div', 'qt-note qt-tonight'); const b = el('b', '', '🍽️ Restaurant bookings'); const ul = el('ul'); bk.forEach(x => ul.append(el('li', '', bookingLine(x)))); box.append(b, ul); body.append(box); } }
  body.append(el('p', 'qt-note', `Pace: ${{ relaxed: 'relaxed', normal: 'normal', fast: 'go-go' }[dpState.pace]}. The PDF starts with a trip overview (your days and the rides on each), then one page per park day with tick boxes: the schedule, Lightning Lane order, weather, meal ideas, closures and events.`));
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
[['wz-pace', 'pace', String], ['wz-brk', 'brk', Number], ['wz-start', 'start', String], ['wz-walk', 'walk', Number]].forEach(([id, k, cast]) => document.getElementById(id).addEventListener('change', (e) => { dpState[k] = cast(e.target.value); syncGlobals(); drawDay(); if (wz.D) drawWalk(wz.D); }));
['dp-hotel', 'dp-custom', 'dp-ll', 'dp-ls'].forEach(id => ['change', 'input'].forEach(ev => document.getElementById(id).addEventListener(ev, () => setTimeout(() => { if (wz.D) drawWalk(wz.D); }, 0))));
