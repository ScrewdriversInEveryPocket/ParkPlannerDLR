// DLR Planner: Plan a day: fit banner, ride chips, schedule list, day charts, Tonight.
// Part of the app script. The js files load in the order of their script tags in index.html (listed in CLAUDE.md).
function dpFitStatus(ctxs, left, end, close, trial, adv, glance) {
  const free = [].concat(ctxs).flatMap(c => c.rides.filter(r => !dpState.rides[c.park].has(r.name)).map(r => 20 + expWait(c, r, 14) + r.rmin));
  const more = left.length ? null : roomFor(ctxs, (p, r) => !dpState.rides[p].has(r.name), trial);
  fitStatus(document.getElementById('dp-rides'), left, close - end, free,
    `Press and hold a ride to take it off, ${dpState.brk > 0 ? 'shorten the break, ' : ''}or try a day with longer hours.`, more, adv, glance);
}

// the restaurant chips' dineAt (see dineChips), called once the plan is made
let dpDineAt = null;
function buildRideChips(ctxs) {
  ctxs = [].concat(ctxs);
  const box = document.getElementById('dp-rides'); box.textContent = '';
  const lab = document.createElement('span'); lab.className = 'g wzh'; lab.textContent = 'Rides to fit in'; box.append(lab);
  { const q = document.createElement('span'); q.className = 'g qt-quick'; q.append('Quick picks: ');
    const pick = (txt, f, tip) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'qt-link'; b.textContent = txt;
      if (tip) b.title = tip; b.addEventListener('click', () => { ctxs.forEach(ctx => { dpState.rides[ctx.park] = new Set(ctx.rides.filter(f).map(r => r.name));
              dpState.reps[ctx.park] = new Map(); }); drawDay(); drawTrip(); }); q.append(b, ' '); };
    pick('Headliners only', r => r.head); pick('Good for little kids', kidPick, 'Gentle rides with no height limit'); pick('Everything', () => true);
      pick('Nothing', () => false, 'Take every ride off'); q.append(riToggle()); box.append(q); }
  ctxs.forEach(ctx => {
    if (ctxs.length > 1) { const pl = document.createElement('span'); pl.className = 'g wzh'; pl.textContent = ctx.park; box.append(pl); }
    if (!dpState.rides[ctx.park]) dpState.rides[ctx.park] = new Set(ctx.rides.filter(r => r.head).map(r => r.name));
    const sel = dpState.rides[ctx.park];
    ctx.rides.slice().sort(rideOrder).forEach((r, i, a) => {
      if (r.char && !(a[i - 1] || {}).char) { const g = document.createElement('span'); g.className = 'g wzh'; g.textContent = 'Characters'; box.append(g); }
      const b = document.createElement('button'); b.type = 'button'; b.className = 'qt-chip'; b.dataset.fit = ctx.park + '|' + r.name;
      b.setAttribute('aria-pressed', sel.has(r.name) ? 'true' : 'false');
      b.textContent = r.name + (ctx.closedSet.has(r.name) ? ' ⚠' : '');
      if (ctx.closedSet.has(r.name)) { const rf = ctx.refurbs.find(x => x.ride === r.name);
        b.title = rf ? 'Closed for refurbishment on this date, so it is left out of the plan. ' + rf.note : `Often closed in ${ctx.monName}`; }
      if (tooShort(r)) { b.classList.add('short'); b.title = (b.title ? b.title + ' ' : '') + shortTip(r); }
      const reps = dpState.reps[ctx.park], n = lapsOf(reps, r.name);
      if (sel.has(r.name)) { b.dataset.laps = String(n); if (n > 1) b.textContent += ' ×' + n; }
      rideInfo(b, r);
      const setN = v => { lastTap = { key: b.dataset.fit, added: v > (sel.has(r.name) ? n : 0) }; if (v) sel.add(r.name); else sel.delete(r.name);
        if (v > 1) reps.set(r.name, v); else reps.delete(r.name); drawDay(); drawTrip(); };
      cycleTap(b, () => setN(nextLap(sel.has(r.name), n, REP_DAY_MAX)), () => { if (sel.has(r.name)) setN(0); });
      box.append(b);
    });
  });
  dpDineAt = dineChips(box, ctxs.map(c => c.park), dpState.dine, () => { drawDay(); drawTrip(); });
}

// the day's key moments as a timeline: time on the left, a dot, then the moment and its details one per line
const KT_TITLE = { Arrive: 'Arrive', Break: 'Midday break', Return: 'Back from your break', Hop: 'Park hop', Leave: 'Leave the park' };
const ktLine = (x) => {
  x = x.trim()
    .replace(/^~(\d+) min security( \(([^)]*)\))?( at the (.*))?$/, (m, n, a, day, b, gate) => `Security and tap-in: about ${n} min${day ? ` (${day})` : ''}${gate ? `, through the ${gate}` : ''}`)
    .replace(/^Hotel ~/, 'At your hotel about ').replace(/^Exit the park$/, 'Walk out to the gate').replace(/^Exit the park/, 'Walk out to the gate')
    .replace(/^at hotel ~/, 'At your hotel about ').replace(/^back ~/, 'Back at your hotel about ').replace(/^leave by /, 'Leave your hotel by ').replace(/^Leave hotel by /, 'Leave your hotel by ')
    .replace(/^List done$/, 'All your rides are done').replace(/~/g, 'about ');
  return x.charAt(0).toUpperCase() + x.slice(1);
};
function keyTimes(el, items) {
  el.textContent = '';
  items.forEach(([k, v, sub]) => {
    const isTime = /\d:\d\d [ap]m/.test(v);
    const d = document.createElement('div'); d.className = 'kt kt-' + (isTime ? String(k).toLowerCase() : 'note');
    const b = document.createElement('div'); b.className = 'v'; b.textContent = isTime ? v : '';
    const body = document.createElement('div'); body.className = 'b';
    const a = document.createElement('div'); a.className = 'k'; a.textContent = isTime ? (KT_TITLE[k] || k) : `${k}: ${v}`;
    body.append(a);
    if (sub) { const ul = document.createElement('ul'); ul.className = 's'; String(sub).split(' · ').forEach(x => { const li = document.createElement('li');
          li.textContent = ktLine(x); ul.append(li); }); body.append(ul); }
    d.append(b, body); el.append(d);
  });
}
function stepList(el, groups) {
  el.textContent = '';
  groups.forEach(([title, steps]) => {
    if (title) { const h = document.createElement('li'); h.className = 'sep'; h.textContent = title; el.append(h); }
    steps.forEach(s => {
      const li = document.createElement('li');
      const tm = document.createElement('span'); tm.className = 'tm'; tm.textContent = fmtClock(s.t);
      const nm = document.createElement('span'); nm.className = 'nm';
      if (s.book) { nm.textContent = s.meal; li.className = 'meal book'; }
      else if (s.meal) {
        nm.textContent = s.meal; li.className = 'meal';
        if (s.tip) { const tp = document.createElement('span'); tp.className = 'tg' + (s.sit ? ' dine' : ''); tp.textContent = (s.sit ? '🍽️ ' : '📱 ') + s.tip; nm.append(tp); }
        if (s.dine && s.dine.length) { const dn = document.createElement('span'); dn.className = 'tg'; dn.textContent = 'Nearby: ' + dineText(s.dine); nm.append(dn); }
      }
      else {
        nm.textContent = s.ride;
        const tags = []; if (s.walk >= 3) tags.push(`${s.walk} min walk`);
          if (s.ll) tags.push(s.r.ll === 'Single Pass' ? 'Lightning Lane Single Pass' : 'Lightning Lane: around this time, when your return window opens');
          if (s.r.char) tags.push('character meet: times vary, check the Disneyland app'); if (s.r.expo === 'Indoor') tags.push('indoor');
          if (s.r.expo === 'Outdoor') tags.push('outdoor'); if (s.r.wet) tags.push('you may get wet');
          if (s.r.sr && !s.ll) tags.push('Single Rider line available');
          if (s.r.minH) tags.push(tooShort(s.r) ? `⚠ Riders must be at least ${s.r.minH} in tall, so not everyone can ride (ask for Rider Switch)` :
          `Riders must be at least ${s.r.minH} in tall`);
        if (tags.length) { const tg = document.createElement('span'); tg.className = 'tg'; tg.textContent = tags.join(' · '); nm.append(tg); }
      }
      if (s.rr) { const rr = document.createElement('span'); rr.className = 'rr';
        rr.title = rrText(s.rr) + ': a good time for a restroom stop if anyone needs one'; rr.textContent = `🚻 ${s.rr.min} min`;
        rr.addEventListener('click', () => { rr.textContent = rr.textContent.length > 12 ? `🚻 ${s.rr.min} min` : '🚻 ' + rrText(s.rr); });
        nm.insertBefore(rr, nm.firstChild ? nm.firstChild.nextSibling : null); }
      const wt = document.createElement('span'); wt.className = 'wt'; wt.textContent = s.book ? '' : s.meal ? `${s.dur} min` : s.ll ? `~${s.wait} min (standby ~${s.standby})` : `~${s.wait} min wait`;
      if (s.ll) li.classList.add('ll');
      li.append(tm, nm, wt); el.append(li);
    });
  });
}

function wxBadge(el, ctx) {
  if (!el) return;
  const fh = dash.data('forecast_hourly'), fa = dash.data('forecast_accu');
  const daysOut = Math.round((Date.UTC(ctx.Y, ctx.M - 1, ctx.Dd) - Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())) / 864e5);
  el.className = 'qt-wxsrc' + (ctx.fc ? ' live' : '');
  if (ctx.fc) el.textContent = ctx.fc.src === 'AccuWeather' ? 'Weather: live AccuWeather daily forecast (hours shaped from 10‑year patterns)' : 'Weather: live ' + ctx.fc.src + ' hourly forecast';
  else if (fh.status === 'loading' || fa.status === 'loading') el.textContent = 'Weather: checking the forecast…';
  else if (daysOut >= 0 && daysOut <= FORECAST_DAYS && fh.status !== 'ok' && fa.status !== 'ok') el.textContent = 'Weather: 10‑year averages (the live forecast could not load; check your connection)';
  else el.textContent = daysOut < 0 ? 'Weather: 10‑year averages (date has passed)' : `Weather: 10‑year averages (more than ${FORECAST_DAYS} days out)`;
}
function llNote(el, llp) {
  el.textContent = '';
  if (!llp || (!llp.multi.length && !llp.single.length)) return;
  el.textContent = llText(llp);
}
function llText(llp) {
  const parts = [];
  // the order you'll use them in the plan (the booking steps follow it); the planned set if the plan used none
  const ord = llp.order && llp.order.length ? llp.order : llp.multi;
  if (ord.length) parts.push(`Lightning Lane Multi Pass: you can't choose your return time. The app gives you the next one available, so book one at a time in this order: ${ord.map((r,
          i) => (i + 1) +
        '. ' + r.name).join(', ')}. ` +
      `Book the first as soon as you tap in, then each next one when the plan shows 📱 (once you've scanned in for the last one, or 2 hours after booking). ` +
      `Do the rides in between and use each Lightning Lane when its window opens: where it sits in the plan is our best guess. ` +
      `If a window lands in your break, take a later time if the app offers one, or skip it.`);
  if (llp.single.length) parts.push(`Single Pass: ${llp.single.map(r => r.name).join(' and ')} (bought separately, one each).`);
  return parts.join(' ');
}
function dayChart(el, ctx, pool, P) {
  el.textContent = '';
  const width = el.clientWidth || 600, height = 220;
  redrawOnResize(el, width, () => dayChart(...arguments));
  const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${width} ${height}`).attr('height', height);
  const t0 = Math.floor(ctx.open - 1), t1 = Math.ceil(Math.min(ctx.close, 24));
  const hrs = d3.range(Math.max(7, t0), Math.min(24, t1));
  const waitAt = (h) => pool.length ? d3.mean(pool, r => expWait(ctx, r, h)) : null;
  const pts = hrs.filter(h => h >= Math.floor(ctx.open) && h < ctx.close).map(h => ({ h, w: waitAt(h) }));
  const wmax = d3.max(pts, p => p.w) || 30;
  const y = d3.scaleLinear([0, wmax * 1.15], [height - 24, 10]).nice();
  const tmin = d3.min(hrs, h => wxAt(ctx, h).feels) - 3, tmax = d3.max(hrs, h => wxAt(ctx, h).feels) + 3;
  const y2 = d3.scaleLinear([tmin, tmax], [height - 24, 10]).nice();
  const probe = svg.append('text').style('font-size', 'var(--cds-font-size-caption)').text(y.ticks(4).slice(-1)[0] + ' min');
  const left = probe.node().getComputedTextLength() + 10; probe.text(y2.ticks(4).slice(-1)[0] + '°F'); const right = probe.node().getComputedTextLength() + 10; probe.remove();
  const x = d3.scaleLinear([t0, t1], [left, width - right]);
  // break window
  if (P.split) svg.append('rect').attr('x', x(P.split.brk)).attr('width', x(P.split.ret) - x(P.split.brk)).attr('y', 10).attr('height',
    height - 34).attr('fill', 'var(--color-fg-muted)').attr('fill-opacity', .14);
  if (P.split) svg.append('text').attr('x', (x(P.split.brk) + x(P.split.ret)) / 2).attr('y', 22).attr('text-anchor', 'middle').attr('fill',
    'var(--color-fg-muted)').style('font-size', 'var(--cds-font-size-caption)').text('Split‑day break');
  // rain bars
  svg.append('g').selectAll('rect').data(hrs).join('rect').attr('x', h => x(h) + 2).attr('width', Math.max(1, x(h0(1)) - x(h0(0)) - 4)).attr('y',
    h => y(0) - (y(0) - y(wmax * 1.15)) * wxAt(ctx, h).rain / 100)
    .attr('height', h => (y(0) - y(wmax * 1.15)) * wxAt(ctx, h).rain / 100).attr('fill', dash.colors[4]).attr('fill-opacity', .45);
  function h0(k) { return t0 + k; }
  const gy = svg.append('g').attr('transform', `translate(${left - 6},0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(width - left - right + 6)).tickFormat(v => v + ' min')); axisClean(gy);
  const gr = svg.append('g').attr('transform', `translate(${width - right + 6},0)`).call(d3.axisRight(y2).ticks(4).tickSize(0).tickFormat(v => v + '°F')); axisClean(gr);
  const gx = svg.append('g').attr('transform', `translate(0,${height - 24})`).call(d3.axisBottom(x).ticks(Math.min(t1 - t0, width < 480 ? 6 : 12)).tickFormat(h => fmtHour(h % 24)).tickSize(4));
  axisClean(gx); gx.selectAll('line').attr('stroke', 'var(--cds-chart-axis)');
  // open/close
  [[ctx.open, 'Opens'], [ctx.close, 'Closes']].forEach(([t, l]) => { if (t > t1) return;
      svg.append('line').attr('x1', x(t)).attr('x2', x(t)).attr('y1', 10).attr('y2', height - 24).attr('stroke',
        'var(--cds-chart-reference)').attr('stroke-dasharray', '4 4'); });
  if (ctx.sunset && ctx.sunset < t1) { svg.append('line').attr('x1', x(ctx.sunset)).attr('x2', x(ctx.sunset)).attr('y1', 10).attr('y2',
      height - 24).attr('stroke', dash.colors[2]).attr('stroke-dasharray', '2 3');
    svg.append('text').attr('x', x(ctx.sunset) + 4).attr('y', 34).attr('fill', 'var(--color-fg-muted)').style('font-size',
      'var(--cds-font-size-caption)').text('Sunset'); }
  // lines
  const feelsPts = hrs.map(h => ({ h, f: wxAt(ctx, h).feels }));
  svg.append('path').datum(feelsPts).attr('fill', 'none').attr('stroke', dash.colors[2]).attr('stroke-width', 2).attr('stroke-dasharray', '5 4').attr('d',
    d3.line().x(p => x(p.h + 0.5)).y(p => y2(p.f)));
  svg.append('path').datum(pts).attr('fill', 'none').attr('stroke', ctx.park === 'Disneyland' ? dash.colors[0] : dash.colors[1]).attr('stroke-width',
    2).attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round').attr('d', d3.line().x(p => x(p.h + 0.5)).y(p => y(p.w)));
  const tip = tipFor(el);
  svg.append('rect').attr('x', left).attr('y', 0).attr('width', width - left - right).attr('height', height - 24).attr('fill', 'transparent')
    .on('pointermove', (ev) => {
      const [mx] = d3.pointer(ev); const h = Math.floor(x.invert(mx)); const w = wxAt(ctx, h); const p = pts.find(q => q.h === h);
      tipRows(tip, `${fmtHour(h % 24)}–${fmtHour((h + 1) % 24)}`, [
        { c: ctx.park === 'Disneyland' ? dash.colors[0] : dash.colors[1], name: 'Avg wait, your rides', v: p && p.w != null ? f0(p.w) + ' min' : 'park closed' },
        { c: dash.colors[2], name: 'Feels like', v: f0(w.feels) + '°F' },
        { c: dash.colors[4], name: 'Rain chance', v: f0(w.rain) + '%' }]);
      placeTip(el, tip, mx * el.clientWidth / width, 20);
    })
    .on('pointerleave', () => { tip.style.display = 'none'; });
}

// Hour-by-hour chart for a Park Hopper day: each park's wait line while you are there, hop/break gaps shaded
function hopChart(el, X) {
  el.textContent = '';
  const width = el.clientWidth || 600, height = 220;
  redrawOnResize(el, width, () => hopChart(...arguments));
  const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${width} ${height}`).attr('height', height);
  const ctx = X.ctx;
  const t0 = Math.floor(d3.min(X.segs, s => s.ctx.open) - 1), t1 = Math.ceil(Math.min(d3.max(X.segs, s => s.ctx.close), 24));
  const hrs = d3.range(Math.max(7, t0), Math.min(24, t1));
  const segEnd = (s) => s.hopStep ? s.depart : X.leave;
  const lines = X.segs.map(s => {
    const pool = poolFor(s.ctx);
    return { s, pts: pool.length ? hrs.filter(h => h >= Math.floor(s.start) && h < Math.ceil(segEnd(s))).map(h => ({ h, w: d3.mean(pool, r => expWait(s.ctx, r, h)) })) : [] };
  });
  const wmax = d3.max(lines.flatMap(l => l.pts), p => p.w) || 30;
  const y = d3.scaleLinear([0, wmax * 1.15], [height - 24, 10]).nice();
  const tmin = d3.min(hrs, h => wxAt(ctx, h).feels) - 3, tmax = d3.max(hrs, h => wxAt(ctx, h).feels) + 3;
  const y2 = d3.scaleLinear([tmin, tmax], [height - 24, 10]).nice();
  const probe = svg.append('text').style('font-size', 'var(--cds-font-size-caption)').text(y.ticks(4).slice(-1)[0] + ' min');
  const left = probe.node().getComputedTextLength() + 10; probe.text(y2.ticks(4).slice(-1)[0] + '°F'); const right = probe.node().getComputedTextLength() + 10; probe.remove();
  const x = d3.scaleLinear([t0, t1], [left, width - right]);
  X.segs.slice(1).forEach((s, i) => {
    const a = X.segs[i].depart, b = s.start;
    svg.append('rect').attr('x', x(a)).attr('width', Math.max(2, x(b) - x(a))).attr('y', 10).attr('height', height - 34).attr('fill', 'var(--color-fg-muted)').attr('fill-opacity', .14);
    svg.append('text').attr('x', (x(a) + x(b)) / 2).attr('y', 22).attr('text-anchor', 'middle').attr('fill', 'var(--color-fg-muted)').style('font-size',
      'var(--cds-font-size-caption)').text(s.gapBefore === 'break' ? 'Break' : 'Park hop');
  });
  svg.append('g').selectAll('rect').data(hrs).join('rect').attr('x', h => x(h) + 2).attr('width', Math.max(1, x(t0 + 1) - x(t0) - 4)).attr('y',
    h => y(0) - (y(0) - y(wmax * 1.15)) * wxAt(ctx, h).rain / 100)
    .attr('height', h => (y(0) - y(wmax * 1.15)) * wxAt(ctx, h).rain / 100).attr('fill', dash.colors[4]).attr('fill-opacity', .45);
  const gy = svg.append('g').attr('transform', `translate(${left - 6},0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(width - left - right + 6)).tickFormat(v => v + ' min')); axisClean(gy);
  const gr = svg.append('g').attr('transform', `translate(${width - right + 6},0)`).call(d3.axisRight(y2).ticks(4).tickSize(0).tickFormat(v => v + '°F')); axisClean(gr);
  const gx = svg.append('g').attr('transform', `translate(0,${height - 24})`).call(d3.axisBottom(x).ticks(Math.min(t1 - t0, width < 480 ? 6 : 12)).tickFormat(h => fmtHour(h % 24)).tickSize(4));
  axisClean(gx); gx.selectAll('line').attr('stroke', 'var(--cds-chart-axis)');
  if (ctx.sunset && ctx.sunset < t1) { svg.append('line').attr('x1', x(ctx.sunset)).attr('x2', x(ctx.sunset)).attr('y1', 10).attr('y2',
      height - 24).attr('stroke', dash.colors[2]).attr('stroke-dasharray', '2 3');
    svg.append('text').attr('x', x(ctx.sunset) + 4).attr('y', 34).attr('fill', 'var(--color-fg-muted)').style('font-size',
      'var(--cds-font-size-caption)').text('Sunset'); }
  svg.append('path').datum(hrs.map(h => ({ h, f: wxAt(ctx, h).feels
        }))).attr('fill', 'none').attr('stroke', dash.colors[2]).attr('stroke-width', 2).attr('stroke-dasharray', '5 4').attr('d',
    d3.line().x(p => x(p.h + 0.5)).y(p => y2(p.f)));
  const parkColor = (p) => p === 'Disneyland' ? dash.colors[0] : dash.colors[1];
  lines.forEach(({ s, pts }) => {
    if (!pts.length) return;
    svg.append('path').datum(pts).attr('fill', 'none').attr('stroke', parkColor(s.park)).attr('stroke-width', 2).attr('stroke-linecap',
      'round').attr('stroke-linejoin', 'round').attr('d', d3.line().x(p => x(p.h + 0.5)).y(p => y(p.w)));
    svg.append('text').attr('x', x(pts[0].h + 0.5)).attr('y', Math.max(14, y(pts[0].w) - 6)).attr('fill', parkColor(s.park)).style('font-size',
      'var(--cds-font-size-caption)').text(s.park === 'Disneyland' ? 'Disneyland' : 'California Adventure');
  });
  const tip = tipFor(el);
  svg.append('rect').attr('x', left).attr('y', 0).attr('width', width - left - right).attr('height', height - 24).attr('fill', 'transparent')
    .on('pointermove', (ev) => {
      const [mx] = d3.pointer(ev); const h = Math.floor(x.invert(mx)); const w = wxAt(ctx, h);
      const l = lines.find(q => q.pts.some(p => p.h === h)); const p = l && l.pts.find(q => q.h === h);
      tipRows(tip, `${fmtHour(h % 24)}–${fmtHour((h + 1) % 24)}`, [
        { c: l ? parkColor(l.s.park) : dash.colors[0],
          name: l ? 'Avg wait, your rides in ' + (l.s.park === 'Disneyland' ? 'Disneyland' : 'DCA') : 'Avg wait, your rides',
          v: p ? f0(p.w) + ' min' : 'not in a park' },
        { c: dash.colors[2], name: 'Feels like', v: f0(w.feels) + '°F' },
        { c: dash.colors[4], name: 'Rain chance', v: f0(w.rain) + '%' }]);
      placeTip(el, tip, mx * el.clientWidth / width, 20);
    })
    .on('pointerleave', () => { tip.style.display = 'none'; });
}
let weekToken = 0;
// One plan is shown, driven by the break length: none, or a 1 to 5 hour break at the hotel.
// ---------- tonight's shows: Disney's own showtimes for the dates its calendar covers (disney_showtimes),
// otherwise our typical estimate (show_estimates), which only lists a show on nights the park is open late enough
function tonightShows(iso, ctxs) {
  // a time is 21:30, close-45 (minutes before closing) or a range like 17:30-21:30
  const hm = (v, close) => { const c = /^close-(\d+)$/.exec(v); if (c) return close - Number(c[1]) / 60; const [h, mi] = v.split(':').map(Number); return h + (mi || 0) / 60; };
  const tm = (v, close) => { const [a, b] = v.split('-'); const t = hm(a, close); return b && !/^close/.test(v) ? { t, to: hm(b, close) } : { t }; };
  const off = dash.data('disney_showtimes').data || [], m = dash.meta('disney_showtimes') || {};
  const first = off.reduce((a, r) => !a || r.date < a ? r.date : a, '');
  const covered = !!first && iso >= first && (!m.until || iso <= m.until);
  // only what's on from 5 pm, for people with energy left at the end of the day
  const by = new Map(), add = (park, name, ts) => { const k = park + '|' + name, o = by.get(k) || { park, name, times: [] };
    o.times.push(...ts.filter(x => isFinite(x.t) && x.t >= 17 - 1e-9)); by.set(k, o); };
  if (covered) off.filter(r => r.date === iso && ctxs[r.park]).forEach(r => add(r.park, r.name, r.times.split(';').filter(Boolean).map(x => tm(x))));
  else {
    const md = iso.slice(5);
    (dash.data('show_estimates').data || []).forEach(r => {
      const c = ctxs[r.park]; if (!c) return; const close = c.realClose != null ? c.realClose : c.close;
      const dayOk = r.days === 'all' || r.days.split(';').includes(DOW_NAMES[c.dow].slice(0, 3));
      if (md >= r.from_md && md <= r.to_md && dayOk && close >= Number(r.min_close)) add(r.park, r.name, r.times.split(';').map(x => tm(x, close)));
    });
  }
  const list = [...by.values()].filter(o => o.times.length).map(o => Object.assign(o, {
        times: o.times.filter((x, i, a) => a.findIndex(y => y.t === x.t) === i).sort((a, b) => a.t - b.t) })).sort((a, b) => a.times[0].t - b.times[0].t);
  return { list, est: !covered };
}
function tonightText(iso, ctxs) {
  const T = tonightShows(iso, ctxs); if (!T.list.length) return null;
  const both = Object.keys(ctxs).length > 1;
  const at = (x) => x.to != null ? `${fmtClock(x.t % 24)} to ${fmtClock(x.to % 24)}` : fmtClock(x.t % 24);
  const one = (o) => `${o.name}${both ? ` (${o.park})` : ''} ${o.times.length > 2 ? o.times.slice(0,
      -1).map(at).join(', ') + ' and ' + at(o.times[o.times.length - 1]) : o.times.map(at).join(' and ')}`;
  return { t: T.list[0].times[0].t, lines: T.list.map(one), text: `Tonight, if you still have energy: ${T.list.map(one).join('; ')}.`,
    note: T.est ? "Typical times, our estimate: Disney hasn't published showtimes for this date yet, so check the Disneyland app." :
    "Showtimes from Disney's calendar; they can change, so check the Disneyland app on the day." };
}
const tonightCtxs = (L) => L.P.hop ? L.P.H.ctxs : { [L.ctx.park]: L.ctx };
function drawTonight() {
  const el = document.getElementById('dp-tonight'); if (!el || !dpLast) return;
  { const P = dpLast.P, steps = P.hop ? ((dpState.brk > 0 && P.Hb) || P.H).flat : P.split ? P.split.morning.steps.concat(P.split.evening.steps) : P.stay.plan.steps;
    const parks = P.hop ? Object.keys(P.H.ctxs) : [dpLast.ctx.park];
    dineNote(document.getElementById('dp-dinenote'), steps || [], parks, { chips: document.getElementById('dp-rides'),
      hop: () => { const b = document.querySelector('#dp-park button[data-v="Hopper"]'); if (b) b.click(); },
      clear: (x) => { dpState.dine[x.kind] = null; drawDay(); const c = document.querySelector('#dp-rides .qt-chip.dine'); if (c) c.scrollIntoView({ block: 'center' }); } });
    if (dpDineAt) dpDineAt(mealWhere(planSegs(P, dpLast.ctx.park))); }
  const T = tonightText(dpLast.ctx.iso, tonightCtxs(dpLast)); el.hidden = !T; el.textContent = '';
  if (T) tonightInto(el, T);
}
function tonightInto(el, T) {
  const b = document.createElement('b'); b.textContent = '🎆 Tonight, if you still have energy:'; const ul = document.createElement('ul');
  T.lines.forEach(l => { const li = document.createElement('li'); li.textContent = l; ul.append(li); });
  el.append(b, ul, T.note);
}
function showPlans(useSplit, stayTitle, splitTitle, why) {
  document.getElementById('dp-stay').hidden = useSplit; document.getElementById('dp-split').hidden = !useSplit;
  document.getElementById('dp-which').hidden = true;
  document.querySelector('.qt-plans').style.gridTemplateColumns = '1fr';
  document.querySelector('#dp-stay h3').textContent = dpState.brk > 0 ? `${stayTitle} (${why ? 'no break today' : `no ${dpState.brk}-hour break fits`})` : stayTitle;
  document.querySelector('#dp-split h3').textContent = `${splitTitle} (${dpState.brk} hour${dpState.brk === 1 ? '' : 's'})`;
  takeState.which = useSplit ? 'split' : 'stay';
}

function drawHopperDay(D) {
  const PB = planHopperBoth(dpState.date, D), H = PB.H, Hb = PB.Hb;
  const [dl, dca] = [H.ctxs['Disneyland'], H.ctxs['California Adventure']];
  buildRideChips([dl, dca]);
  const ctx = H.ctx, T = travelMin(H.first);
  dpLast = { ctx, P: PB, T }; drawTonight();
  showPlans(!!Hb, 'Park Hopper day', 'Park Hopper with a midday break', winWhy(H.win));
  const wd = DOW_NAMES[ctx.dow];
  const dateLbl = new Date(Date.UTC(ctx.Y, ctx.M - 1, ctx.Dd)).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  document.getElementById('dp-info').textContent = [`${wd}, ${dateLbl}`, `Disneyland ${fmtClock(dl.open)}–${fmtClock(dl.close % 24)}`,
    `California Adventure ${fmtClock(dca.open)}–${fmtClock(dca.close % 24)}`, `sunset ${fmtClock(ctx.sunset)}`,
    ctx.fc ? `forecast: ${ctx.fc.conditions}, high ${f0(ctx.fc.high)}°F, ${f0(Number(ctx.wxd.rain_chance_pct))}% chance of rain` :
    `high ${f0(Number(ctx.wxd.avg_high_f))}°F, ${f0(Number(ctx.wxd.rain_chance_pct))}% chance of rain`].join(' · ');
  wxBadge(document.getElementById('dp-wxsrc'), ctx);
  const warn = document.getElementById('dp-warn'); warn.textContent = '';
  const notes = [], seen = new Set();
  [dl, dca].forEach(c => {
    c.evs.forEach(e => { const n = `${e.name}: ${e.notes}`; if (!seen.has(n)) { seen.add(n); notes.push(n); } });
    notes.push(...closedNotes(c, true));
  });
  [dl, dca].flatMap(dataNotes).forEach(n => { if (!seen.has(n)) { seen.add(n); notes.push(n); } });
  { const sn = shortNote(pickedOf([dl, dca])); if (sn) notes.push(sn); }
  if (dca.close <= 19 && dca.published) notes.push('Published hours: California Adventure closes to day guests at ' + fmtClock(dca.close) + (dca.hoursNote ?
      ' for ' + dca.hoursNote.replace(/ \(.*$/, '') : '') + '.');
  else if (dca.close <= 19) notes.push('The matching 2025 day was an early‑close party night at California Adventure (closed to day guests at ' +
    fmtClock(dca.close) + '). Check the official calendar for your date.');
  if (dpState.brk > 0 && winWhy(H.win)) notes.push(winWhy(H.win));
  notes.push(`Park Hopper rules used here: no more than 2 hops in a day, about ${H.hopMin} min for each hop on this day ` +
    `(the walk across the Esplanade at your pace, then the tap-in line, which is longer on busy days; no bag check, since the Esplanade is inside security) ` +
    `after walking to the gate, and the first hop is not before ${fmtClock(HOP_FIRST)}.`);
  notes.forEach(n => { const p = document.createElement('p'); p.textContent = n; warn.append(p); });
  const fill = (pre, X) => {
    const hopTimes = X.segs.slice(1).map((s, i) => { const p = X.segs[i];
        return s.gapBefore === 'break' ? ['Break', fmtClock(p.depart % 24), `Hotel ~${fmtClock((p.depart + travelMin(p.park, hotelGate(p.ctx,
                    p.depart)) / 60) % 24)} · leave by ${fmtClock(entryInfo(s.ctx,
                s.start).leave % 24)} · back in ${s.park} by ${fmtClock(s.start % 24)}`] : [`Hop`, fmtClock(p.depart % 24),
          `${p.park} → ${s.park}, ${s.hopMin} min`]; });
    keyTimes(document.getElementById(pre + '-times'), [['Arrive', fmtClock(X.arrive), `${arrSub(X.ctx,
              X.arrive)} · ${X.first} opens ${fmtClock(X.ctx.open)}`]].concat(hopTimes, [['Leave', fmtClock(X.leave % 24),
            (X.left.length ? endLbl(X.win) : 'List done') + ` · back ~${backAt(X.segs[X.segs.length - 1].ctx, X.leave)}`]]));
    document.getElementById(pre + '-stats').textContent = `${X.done} of ${X.total} rides across both parks · ${X.hops} park hop${X.hops === 1 ? '' :
      's'} · ~${f0(X.totalWait)} min in lines${X.saved ? ` · Lightning Lane saves ~${f0(X.saved)} min` : ''}`;
    const llEl = document.getElementById(pre + '-ll'); llEl.textContent = '';
    ['Disneyland', 'California Adventure'].forEach(p => { const l = X.llps[p]; if (l && (l.multi.length || l.single.length)) {
          const d = document.createElement('div'); d.textContent = p + ': ' + llText(l); llEl.append(d); } });
    stepList(document.getElementById(pre + '-steps'),
      X.segs.map(s => [`${s.park} · ${fmtClock(s.start % 24)}–${fmtClock((s.hopStep ? s.depart : X.leave) % 24)}`,
          s.steps.concat(s.hopStep ? [s.hopStep] : [])]));
    document.getElementById(pre + '-note').textContent = X.left.length ? (X.whyLeft || `Not enough time for: ${leftList(X.left,
          true)}. Remove a few rides or pick a longer stay.`) : 'Every ride you picked in both parks fits.';
  };
  fill('dp-stay', H);
  if (Hb) fill('dp-split', Hb);
  else { keyTimes(document.getElementById('dp-split-times'), [['Break day plan', 'Not recommended', winWhy(H.win) || 'Park hours too short for a break']]);
    ['dp-split-stats', 'dp-split-ll', 'dp-split-steps', 'dp-split-note'].forEach(id => { document.getElementById(id).textContent = ''; });
    }    hopChart(document.getElementById('dp-chart'), dpState.brk > 0 && Hb ? Hb : H);
  { const V = Hb || H, last = V.segs[V.segs.length - 1];
    const trial = (qs) => { qs.forEach(q => dpState.rides[q.park].add(q.r.name)); try {
        const Y = (Hb && planHopper(dpState.date, D, true)) || planHopper(dpState.date, D, false); return !!Y && !Y.left.length; } finally {
        qs.forEach(q => dpState.rides[q.park].delete(q.r.name)); } };
    const drop = (p, name) => { const had = dpState.rides[p].has(name); dpState.rides[p].delete(name); try {
        const Y = (Hb && planHopper(dpState.date, D, true)) || planHopper(dpState.date, D, false); return Y ? Y.left : V.left; } finally {
        if (had) dpState.rides[p].add(name); } };
    dpFitStatus([dl, dca], V.left, last.end, Math.max(dl.close, dca.close), trial, fullAdvice(V.segs.flatMap(s => s.steps), V.left, drop),
      { text: glanceText(V.leave, V.done, V.total, V.totalWait, V.flat), target: document.getElementById(Hb && dpState.brk > 0 ? 'dp-split' : 'dp-stay') }); }
  // week at a glance: cheap columns now, the (slower) hop plan for each day filled in one day at a time
  const token = weekToken;
  const tb = document.querySelector('#dp-week tbody'); tb.textContent = '';
  const base = new Date(Date.UTC(ctx.Y, ctx.M - 1, ctx.Dd)); base.setUTCDate(base.getUTCDate() - ctx.dow);
  const pending = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(base); d.setUTCDate(base.getUTCDate() + i);
    const iso = `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
    const cs = ['Disneyland', 'California Adventure'].map(p => dayContext(iso, p, D));
    const waits = cs.map(c => { const pl = poolFor(c); return pl.length ? d3.mean(pl, r => expWait(c, r, 14)) : null; }).filter(v => v != null);
    const evs = [...new Set(cs.flatMap(c => c.evs.map(e => e.name)))].join(', ');
    const tr = document.createElement('tr'); if (iso === ctx.iso) tr.className = 'cur';
    [d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC'
        }), `DL ${fmtClock(cs[0].open)}–${fmtClock(cs[0].close % 24)} · DCA ${fmtClock(cs[1].open)}–${fmtClock(cs[1].close % 24)}`,
      waits.length ? f0(d3.mean(waits)) + ' min' : '–', 'Planning…', evs].forEach((v, j) => {
      const td = document.createElement('td'); td.textContent = v; if (j === 0 || j === 3 || j === 4) td.className = 'l'; if (j === 4) td.className = 'l ev qt-hide-narrow'; tr.append(td);
    });
    tr.addEventListener('click', () => { dpState.date = iso; dpDate.value = iso; drawDay(); });
    tb.append(tr); pending.push({ iso, td: tr.children[3] });
  }
  const hopSummary = (X) => X.segs.map((s, i) => (i ? (s.gapBefore === 'break' ? ' → break → ' : ' → hop → ') : '') + `${s.park === 'Disneyland' ? 'DL' :
      'DCA'} ${fmtClock(s.start % 24)}–${fmtClock((s.hopStep ? s.depart : X.leave) % 24)}`).join('');
  const fillWeek = (k) => {
    if (token !== weekToken || k >= pending.length) return;
    const { iso, td } = pending[k];
    const X = dpState.brk > 0 ? planHopper(iso, D, true) : null;
    if (X) td.textContent = hopSummary(X);
    else { const Y = planHopper(iso, D, false); td.textContent = hopSummary(Y) + (dpState.brk > 0 ? ' (no break fits)' : ''); }
    setTimeout(() => fillWeek(k + 1), 0);
  };
  setTimeout(() => fillWeek(0), 0);    renderTake();
}

function drawDay() {
  const root = document.getElementById('day-plan'); weekToken++;
  const st = statusOf(DAY_IDS);
  if (st !== 'ok') { if (st === 'error') failed(root); else root.classList.add('dash-skeleton'); return; }
  root.classList.remove('dash-skeleton');
  const D = Object.fromEntries(DAY_IDS.map(id => [id, dash.data(id).data]));
  const hopDay = dpState.park === 'Hopper';
  document.getElementById('dp-start-wrap').hidden = !hopDay;
  if (hopDay) { drawHopperDay(D); return; }
  const ctx = dayContext(dpState.date, dpState.park, D);
  buildRideChips(ctx);
  const sel = dpState.rides[ctx.park];
  const pool = poolFor(ctx);
  const P = planDay(ctx, pool);
  dpLast = { ctx, P, T: travelMin(ctx.park) }; drawTonight();
  showPlans(!!P.split, 'Stay all day', 'Split day with a break', winWhy(P.win));
  // context line
  const info = document.getElementById('dp-info');
  const wd = DOW_NAMES[ctx.dow];
  const dateLbl = new Date(Date.UTC(ctx.Y, ctx.M - 1, ctx.Dd)).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const busy = ctx.weekFactor * d3.mean(pool.length ? pool : ctx.rides, r => r.mf * r.df);
  const busyTxt = busy > 1.08 ? 'busier than a typical day' : busy < 0.92 ? 'quieter than a typical day' : 'about average';
  const bits = [`${wd}, ${dateLbl}`, `${ctx.published ? 'published' : 'typical'} hours ${fmtClock(ctx.open)}–${fmtClock(ctx.close % 24)}`,
    `sunset ${fmtClock(ctx.sunset)}`,
    ctx.fc ? `forecast: ${ctx.fc.conditions}, high ${f0(ctx.fc.high)}°F, ${f0(Number(ctx.wxd.rain_chance_pct))}% chance of rain` :
    `high ${f0(Number(ctx.wxd.avg_high_f))}°F`, ctx.fc ? null : `${f0(Number(ctx.wxd.rain_chance_pct))}% chance of rain`, `waits ${busyTxt}`].filter(Boolean);
  info.textContent = bits.join(' · ');
  wxBadge(document.getElementById('dp-wxsrc'), ctx);
  const warn = document.getElementById('dp-warn'); warn.textContent = '';
  const notes = [];
  ctx.evs.forEach(e => notes.push(`${e.name}: ${e.notes}`));
  notes.push(...closedNotes(ctx));
  notes.push(...dataNotes(ctx));
  { const sn = shortNote(pickedOf(ctx)); if (sn) notes.push(sn); }
  if (dpState.brk > 0 && winWhy(P.win)) notes.push(winWhy(P.win));
  if (ctx.park === 'California Adventure' && ctx.close <= 19 &&
    ctx.published) notes.push('Published hours: the park closes to day guests at ' + fmtClock(ctx.close) + (ctx.hoursNote ?
      ' for ' + ctx.hoursNote.replace(/ \(.*$/, '') : '') + '.');
  else if (ctx.park === 'California Adventure' &&
    ctx.close <= 19) notes.push('The matching 2025 day was an early‑close party night (park closed to day guests at ' + fmtClock(ctx.close) +
    '). Check the official calendar for your date.');
  notes.forEach(n => { const p = document.createElement('p'); p.textContent = n; warn.append(p); });
  // stay all day
  const S = P.stay;
  const T = travelMin(ctx.park), Th = T / 60;
  keyTimes(document.getElementById('dp-stay-times'), [['Arrive', fmtClock(S.arrive), `${arrSub(ctx, S.arrive)} · opens ${fmtClock(ctx.open)}`], ['Leave',
        fmtClock(S.leave % 24), (S.plan.left.length ? endLbl(P.win) : 'List done') + ` · back ~${backAt(ctx, S.leave)}`]]);
  document.getElementById('dp-stay-stats').textContent = `${S.done} of ${pool.length} rides · ~${f0(S.plan.totalWait)} min in lines${S.plan.saved ?
    ` · Lightning Lane saves ~${f0(S.plan.saved)} min` : ''} · ${f1(S.leave - S.arrive)} h in the park · ${S.heat} h at 85°F+ feels‑like`;
  llNote(document.getElementById('dp-stay-ll'), S.llp);
  stepList(document.getElementById('dp-stay-steps'), [['', S.plan.steps]]);
  const stayNote = document.getElementById('dp-stay-note');
  stayNote.textContent = (!S.plan.left.length && P.win.t1 > S.leave + 0.5 && ctx.sunset) ?
    `Done early. Nighttime shows usually start 1–2 hours after sunset (${fmtClock(ctx.sunset)}), so stay until about ${fmtClock(Math.min(P.win.t1,
        roundUp15(ctx.sunset + 2)) % 24)} if you want them.` : (S.plan.left.length ? `Not enough time for: ${leftList(S.plan.left)}.` : '');
  // split
  const X = P.split; const splitCard = document.getElementById('dp-split');
  if (!X) {
    keyTimes(document.getElementById('dp-split-times'), [['Split day', 'Not recommended', winWhy(P.win) || 'Park hours too short for a break']]);
    document.getElementById('dp-split-stats').textContent = ''; document.getElementById('dp-split-ll').textContent = '';
      document.getElementById('dp-split-steps').textContent = ''; document.getElementById('dp-split-note').textContent = '';
  } else {
    const eOut = entryInfo(ctx, X.brk), eIn = entryInfo(ctx, X.ret), atA = X.brk + eOut.min / 60, atB = eIn.leave, atMin = Math.round((atB - atA) * 60);
    keyTimes(document.getElementById('dp-split-times'), [['Arrive', fmtClock(X.arrive), `${arrSub(ctx, X.arrive)} · opens ${fmtClock(ctx.open)}`], ['Break',
          fmtClock(X.brk), atMin > 0 ? `Exit the park · at hotel ~${fmtClock(atA)}` : 'Exit the park'], ['Return', fmtClock(X.ret),
          atMin > 0 ? `Leave hotel by ${fmtClock(atB)} · ~${eIn.sec} min security` : 'At the park entrance'], ['Leave', fmtClock(X.leave % 24),
          (X.left.length ? endLbl(P.win) : 'List done') + ` · back ~${backAt(ctx, X.leave)}`]]);
    document.getElementById('dp-split-stats').textContent = `${X.done} of ${pool.length} rides · ~${f0(X.totalWait)} min in lines${X.saved ?
      ` · Lightning Lane saves ~${f0(X.saved)} min` : ''} · ${f1(X.leave - X.arrive - dpState.brk)} h in the park · ${X.heat} h at 85°F+ feels‑like`;
    llNote(document.getElementById('dp-split-ll'), X.llp);
    stepList(document.getElementById('dp-split-steps'), [['Morning', X.morning.steps],
        [`Break ${fmtClock(X.brk)}–${fmtClock(X.ret)} · ${eOut.min} min each way to ${HOTEL_NAME[dpState.hotel]}${eOut.g ?
            " via the hotel's own park entrance" : ''}${atMin > 0 ? `, about ${atMin} min there` : ''} (allows ~${eIn.sec} min for security on return)`, []],
        ['Evening', X.evening.steps]]);
    const dWait = S.plan.totalWait - X.totalWait;
    const perRideS = S.done ? S.plan.totalWait / S.done : 0, perRideX = X.done ? X.totalWait / X.done : 0;
    const tooFar = atMin < 45 ? `With ${eOut.min} min each way you'd only get ${Math.max(0, atMin)} min at the hotel. Pick a longer break, or staying all day may be better. ` : '';
    document.getElementById('dp-split-note').textContent = tooFar + `Compared with staying all day: ${X.done - S.done >= 0 ? (X.done - S.done) + ' more' :
      (S.done - X.done) + ' fewer'} rides, ${f0(Math.abs(perRideS - perRideX))} min ${perRideX <= perRideS ? 'less' :
      'more'} waiting per ride, and ${Math.max(0, S.heat - X.heat)} fewer hours in the heat.` + (X.left.length ? ` Not enough time for: ${leftList(X.left)}.` :
      '');
  }
  { const trial = (qs) => { const P2 = planDay(ctx, withRides(ctx, pool, qs)); return !((X && P2.split) ? P2.split.left : P2.stay.plan.left).length; };
    const drop = (p, name) => { const P2 = planDay(ctx, pool.filter(r => r.name !== name)); return (X && P2.split) ? P2.split.left : P2.stay.plan.left; };
    if (X) dpFitStatus(ctx, X.left, Math.max(X.evening.end, X.ret), P.win.t1, trial, fullAdvice(X.morning.steps.concat(X.evening.steps), X.left, drop), {
        text: glanceText(X.leave, X.done, pool.length, X.totalWait, X.morning.steps.concat(X.evening.steps), X.heat),
        target: document.getElementById('dp-split') });
    else dpFitStatus(ctx, S.plan.left, S.plan.end, P.win.t1, trial, fullAdvice(S.plan.steps, S.plan.left, drop), {
        text: glanceText(S.leave, S.done, pool.length, S.plan.totalWait, S.plan.steps, S.heat), target: document.getElementById('dp-stay') }); }
  dayChart(document.getElementById('dp-chart'), ctx, pool, P);
  renderTake();
  // week at a glance
  const tb = document.querySelector('#dp-week tbody'); tb.textContent = '';
  const base = new Date(Date.UTC(ctx.Y, ctx.M - 1, ctx.Dd)); base.setUTCDate(base.getUTCDate() - ctx.dow);
  for (let i = 0; i < 7; i++) {
    const d = new Date(base); d.setUTCDate(base.getUTCDate() + i);
    const iso = `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
    const c2 = dayContext(iso, ctx.park, D); const pool2 = expandPool(c2.rides.filter(r => sel.has(r.name)), dpState.reps[ctx.park]); const P2 = planDay(c2, pool2);
    const tr = document.createElement('tr'); if (iso === ctx.iso) tr.className = 'cur';
    const cells = [d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }), `${fmtClock(c2.open)}–${fmtClock(c2.close % 24)}`,
      f0(d3.mean(pool2.length ? pool2 : c2.rides, r => expWait(c2, r, 14))) + ' min',
      P2.split ? `${fmtClock(P2.split.arrive)} → ${fmtClock(P2.split.brk)}, back ${fmtClock(P2.split.ret)} → ${fmtClock(P2.split.leave % 24)}` :
        `${fmtClock(P2.stay.arrive)} → ${fmtClock(P2.stay.leave % 24)}`,
      c2.evs.map(e => e.name).join(', ')];
    cells.forEach((v, j) => { const td = document.createElement('td'); td.textContent = v; if (j === 0 || j === 3 || j === 4) td.className = 'l';
        if (j === 4) td.className = 'l ev qt-hide-narrow'; tr.append(td); });
    tr.addEventListener('click', () => { dpState.date = iso; dpDate.value = iso; drawDay(); });
    tb.append(tr);
  }
}


