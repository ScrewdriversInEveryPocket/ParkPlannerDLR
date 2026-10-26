// DLR Planner: hourly and planner data, the best-dates finder (wizard Dates step), best time of day heatmaps, events chart.
// Part of the app script. The js files load in the order of their script tags in index.html (listed in CLAUDE.md).
// ---------- new calcs ----------
dash.calc('hourly_park', {
  inputs: ['waits_by_hour'],
  title: 'Avg wait by hour, per park',
  description: 'Mean of the major attractions\' 2025 average posted wait at each hour, per park.',
  fn: (waits_by_hour) => {
    const g = new Map();
    for (const r of waits_by_hour) {
      const h = Number(r.hour);
      if (!g.has(h)) g.set(h, { hour: h, dl: [], dca: [] });
      (r.park === 'Disneyland' ? g.get(h).dl : g.get(h).dca).push(Number(r.avg_wait));
    }
    const avg = (xs) => xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length * 10) / 10 : null;
    return [...g.values()].sort((a, b) => a.hour - b.hour).map(o => ({ hour: o.hour, disneyland: avg(o.dl), california_adventure: avg(o.dca) }));
  }
});

dash.calc('planner_base', {
  inputs: ['wait_by_week', 'crowd_by_week', 'weather_by_week', 'hours_by_week', 'closures_by_week', 'sun_by_week', 'holidays', 'events', 'ticket_tiers'],
  title: 'Planner inputs by week',
  description: 'Joins each week\'s waits, crowd ratings, weather, park hours, typical ride closures, sunset, holidays, events and average published 1-day ticket price, for the visit planner.',
  fn: (wait_by_week, crowd_by_week, weather_by_week, hours_by_week, closures_by_week, sun_by_week, holidays, events, ticket_tiers) => {
    const tp = new Map();
    for (const t of ticket_tiers) { const k = Number(t.week); if (!tp.has(k)) tp.set(k, []); tp.get(k).push(Number(t.price_usd)); }
    const by = (rows) => new Map(rows.map(r => [Number(r.week), r]));
    const c = by(crowd_by_week), w = by(weather_by_week), h = by(hours_by_week), cl = by(closures_by_week), s = by(sun_by_week);
    return wait_by_week.map(r => {
      const k = r.week, wx = w.get(k) || {}, hr = h.get(k) || {}, cr = c.get(k) || {}, cs = cl.get(k) || {};
      return {
        week: k, week_label: r.week_label,
        wait_dl: r.disneyland, wait_dca: r.california_adventure,
        crowd_dl: Number(cr.disneyland), crowd_dca: Number(cr.california_adventure),
        feels: Number(wx.feels_like_high_f), high: Number(wx.avg_high_f), hot: Number(wx.hot_day_pct), chilly: Number(wx.chilly_night_pct), rain: Number(wx.rain_chance_pct),
        hours_dl: Number(hr.disneyland), hours_dca: Number(hr.california_adventure),
        closed_dl: Number(cs.disneyland), closed_dca: Number(cs.california_adventure),
        closed_dl_rides: cs.disneyland_rides || '', closed_dca_rides: cs.california_adventure_rides || '',
        sunset: Number((s.get(k) || {}).sunset_hour),
        price: tp.has(k) ? Math.round(tp.get(k).reduce((a, b) => a + b, 0) / tp.get(k).length) : null,
        holiday: holidays.filter(x => k >= Number(x.start_week) && k <= Number(x.end_week)).map(x => x.name).join(', '),
        // weeks most kids are off school: the school breaks, plus Thanksgiving week and the end of winter break
        school: holidays.some(x => k >= Number(x.start_week) && k <= Number(x.end_week) && (x.kind === 'school' || /Thanksgiving|winter break/i.test(x.name))),
        events: events.filter(x => k >= Number(x.start_week) && k <= Number(x.end_week)).map(x => x.name.replace(' (end)', '')).join(', ')
      };
    });
  }
});

const fmtClock = (v) => { if (v == null || isNaN(v)) return '—'; let h = Math.floor(v), m = Math.round((v - h) * 60); if (m === 60) { h += 1; m = 0;
  } const ap = h >= 12 && h < 24 ? 'pm' : 'am'; const h12 = ((h + 11) % 12) + 1; return `${h12}:${String(m).padStart(2, '0')} ${ap}`; };
const fmtHour = (h) => { const ap = h >= 12 && h < 24 ? 'p' : 'a'; return ((h + 11) % 12 + 1) + ap; };
const resolveColor = (c) => { const t = document.createElement('span'); t.style.color = c; document.body.append(t); const v = getComputedStyle(t).color; t.remove(); return v; };

// ---------- planner ----------
const PL_FACTORS = [
  { id: 'wait', name: 'Short waits', def: 4 },
  { id: 'crowd', name: 'Low crowd rating', def: 2 },
  { id: 'temp', name: 'Comfortable temperature', def: 2 },
  { id: 'rain', name: 'Avoid rain', def: 2 },
  { id: 'open', name: 'Rides open', def: 2 },
  { id: 'hours', name: 'Long park hours', def: 1 },
  { id: 'sunset', name: 'Late sunsets', def: 0 },
  { id: 'price', name: 'Lower ticket price', def: 1 }
];
if (PDP_SAVED.w) PL_FACTORS.forEach(f => { if (PDP_SAVED.w[f.id] != null) f.def = PDP_SAVED.w[f.id]; });
const plState = { park: 'both', school: 'any', events: new Set(), w: Object.fromEntries(PL_FACTORS.map(f => [f.id, f.def])) };
const slBox = document.getElementById('pl-sliders');
PL_FACTORS.forEach(f => {
  const lab = document.createElement('label'); lab.className = 'qt-slider';
  const name = document.createElement('span'); name.textContent = f.name;
  const inp = document.createElement('input'); inp.type = 'range'; inp.min = 0; inp.max = 4; inp.step = 1; inp.value = f.def; inp.setAttribute('aria-label', f.name + ' importance');
  const val = document.createElement('span'); val.className = 'lv';
  const words = ['Ignore', 'A little', 'Some', 'A lot', 'Most'];
  val.textContent = words[f.def];
  inp.addEventListener('input', () => { plState.w[f.id] = +inp.value; val.textContent = words[+inp.value]; drawPlanner(); drawTrip(); });
  lab.append(name, inp, val); slBox.append(lab);
});
document.querySelectorAll('#pl-park button').forEach(b => b.addEventListener('click', () => {
  plState.park = b.dataset.v;
  document.querySelectorAll('#pl-park button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
  drawPlanner();
}));
document.getElementById('pl-school').addEventListener('change', (e) => { plState.school = e.target.value; drawPlanner(); drawTrip(); });
// a week passes the school-holiday choice: avoid = no holiday or school break that week; only = a school break that week
const schoolOk = (r) => plState.school === 'avoid' ? !r.holiday : plState.school === 'only' ? !!r.school : true;
let plEventsBuilt = false;
function buildEventChips(evRows) {
  if (plEventsBuilt) return; plEventsBuilt = true;
  const box = document.getElementById('pl-events');
  [...new Set(evRows.map(e => e.name.replace(' (end)', '')))].forEach(n => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'qt-chip'; b.setAttribute('aria-pressed', 'false');
    b.textContent = n;
    b.addEventListener('click', () => { if (plState.events.has(n)) plState.events.delete(n); else plState.events.add(n);
        b.setAttribute('aria-pressed', plState.events.has(n) ? 'true' : 'false'); drawPlanner(); });
    box.append(b);
  });
}

function plannerScores(rows) {
  const P = plState.park;
  const pick = (r, a, b) => P === 'dl' ? r[a] : P === 'dca' ? r[b] : (r[a] + r[b]) / 2;
  const vals = rows.map(r => ({
    wait: pick(r, 'wait_dl', 'wait_dca'), crowd: pick(r, 'crowd_dl', 'crowd_dca'),
    temp: Math.abs(r.feels - 74) + 0.15 * r.hot + 0.15 * r.chilly, rain: r.rain,
    open: pick(r, 'closed_dl', 'closed_dca'), hours: pick(r, 'hours_dl', 'hours_dca'), sunset: r.sunset, price: r.price
  }));
  const pm = d3.mean(vals, v => v.price); vals.forEach(v => { if (v.price == null) v.price = pm == null ? 0 : pm; });
  const higherBetter = { hours: true, sunset: true };
  const norm = {};
  PL_FACTORS.forEach(f => { const xs = vals.map(v => v[f.id]); norm[f.id] = [d3.min(xs), d3.max(xs)]; });
  const wsum = PL_FACTORS.reduce((s, f) => s + plState.w[f.id], 0) || 1;
  return rows.map((r, i) => {
    let sc = 0; const parts = {};
    PL_FACTORS.forEach(f => {
      const [lo, hi] = norm[f.id]; const v = vals[i][f.id];
      const g = hi === lo ? 1 : (higherBetter[f.id] ? (v - lo) / (hi - lo) : (hi - v) / (hi - lo));
      parts[f.id] = g; sc += plState.w[f.id] * g;
    });
    let ok = true;
    if (!schoolOk(r)) ok = false;
    if (plState.events.size && ![...plState.events].some(n => r.events.split(', ').includes(n))) ok = false;
    return { r, v: vals[i], parts, score: sc / wsum * 100, ok };
  });
}

function drawPlanner() {
  const strip = document.getElementById('planner-strip');
  const list = document.getElementById('planner-list');
  const pb = dash.data('planner_base');
  if (pb.status !== 'ok') {
    list.textContent = '';
    if (['error', 'declined', 'missing'].includes(pb.status)) failed(strip); else { strip.textContent = ''; strip.classList.add('dash-skeleton'); }
    return;
  }
  strip.classList.remove('dash-skeleton');
  const evs = dash.data('events'); if (evs.status === 'ok') buildEventChips(evs.data);
  const tt = dash.data('ticket_tiers'), pn = document.getElementById('pl-price-note');
  if (tt.status === 'ok' && tt.data.length) { const fmtD = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    pn.textContent =
    `Ticket price uses Disney's dated 1‑day ticket prices, published ${fmtD(tt.data[0].date)} to ${fmtD(tt.data[tt.data.length - 1].date)}. Weeks outside that window count as average.`;
    }
  const S = plannerScores(pb.data);
  const okS = S.filter(s => s.ok);
  const smin = d3.min(okS, s => s.score) ?? 0, smax = d3.max(okS, s => s.score) ?? 100;
  const rel = (s) => smax === smin ? 100 : (s - smin) / (smax - smin) * 100;
  // strip
  strip.textContent = '';
  const width = strip.clientWidth || 600, height = 64;
  redrawOnResize(strip, width, () => drawPlanner());
  const svg = d3.select(strip).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${width} ${height}`).attr('height', height);
  const x = d3.scaleLinear([0.5, 52.5], [0, width]);
  const bw = x(2) - x(1);
  const top = new Set([...okS].sort((a, b) => b.score - a.score).slice(0, 5).map(s => s.r.week));
  const accent = resolveColor(dash.colors[0]);
  svg.append('g').selectAll('rect').data(S).join('rect')
    .attr('x', s => x(s.r.week - 0.5) + 1).attr('width', Math.max(1, bw - 2)).attr('y', 4).attr('height', 34).attr('rx', 3)
    .attr('fill', s => s.ok ? accent : 'var(--cds-chart-muted)')
    .attr('fill-opacity', s => s.ok ? 0.12 + 0.88 * Math.pow(rel(s.score) / 100, 1.6) : 0.15)
    .attr('stroke', s => top.has(s.r.week) ? 'var(--color-fg)' : 'none').attr('stroke-width', 1.5);
  const ticks = MONTH_DOY.map(doyToWeek);
  const every = width < 480 ? 2 : 1;
  const gx = svg.append('g').attr('transform', `translate(0,${height - 22})`).call(d3.axisBottom(x).tickValues(ticks.filter((_,
          i) => i % every === 0)).tickFormat((t) => MONTHS[ticks.indexOf(t)]).tickSize(3));
  axisClean(gx); gx.selectAll('line').attr('stroke', 'var(--cds-chart-axis)'); gx.selectAll('text').attr('text-anchor', 'start').attr('dx', 2);
  const tip = tipFor(strip);
  svg.append('rect').attr('x', 0).attr('y', 0).attr('width', width).attr('height', 40).attr('fill', 'transparent')
    .on('pointermove', (ev) => {
      const [mx] = d3.pointer(ev); const wk = Math.max(1, Math.min(52, Math.round(x.invert(mx))));
      const s = S[wk - 1]; if (!s) return;
      tipRows(tip, `Week ${wk} · ${s.r.week_label}`, [{ c: accent, name: 'Score', v: s.ok ? f0(rel(s.score)) : 'filtered out' }], [s.r.events, s.r.holiday].filter(Boolean).join(' · '));
      placeTip(strip, tip, x(wk) * strip.clientWidth / width, 0);
    })
    .on('pointerleave', () => { tip.style.display = 'none'; });
  // list
  list.textContent = '';
  const P = plState.park;
  const ranked = [...okS].sort((a, b) => b.score - a.score).slice(0, 8);
  if (!ranked.length) { const li = document.createElement('li'); li.className = 'qt-note'; li.textContent = 'No weeks match those filters.'; list.append(li); return; }
  ranked.forEach((s, i) => {
    const li = document.createElement('li'); li.className = 'qt-rank';
    const head = document.createElement('div'); head.className = 'rh';
    const n = document.createElement('span'); n.className = 'rn'; n.textContent = String(i + 1);
    const t = document.createElement('span'); t.className = 'rt'; t.textContent = s.r.week_label;
    const barw = document.createElement('span'); barw.className = 'rbar';
    const bar = document.createElement('i'); bar.style.width = rel(s.score).toFixed(0) + '%'; bar.style.background = accent; barw.append(bar);
    const sc = document.createElement('span'); sc.className = 'rs'; sc.textContent = f0(rel(s.score));
    head.append(n, t, barw, sc);
    const facts = document.createElement('div'); facts.className = 'rf';
    const closedRides = P === 'dl' ? s.r.closed_dl_rides : P === 'dca' ? s.r.closed_dca_rides : [s.r.closed_dl_rides, s.r.closed_dca_rides].filter(Boolean).join('; ');
    const bits = [
      `${f1(s.v.wait)} min avg wait`,
      `crowd ${f0(s.v.crowd)}`,
      `highs ${f0(s.r.high)}°F`,
      `${f0(s.r.rain)}% rain chance`,
      `sunset ${fmtClock(s.r.sunset)}`,
      s.r.price != null ? `1‑day tickets avg $${f0(s.r.price)}` : 'ticket prices not published yet',
      closedRides ? `often closed: ${closedRides}` : 'no regular closures',
      s.r.events, s.r.holiday
    ].filter(Boolean);
    facts.textContent = bits.join(' · ');
    const go = document.createElement('button'); go.type = 'button'; go.className = 'go'; go.textContent = 'Show trips this week →';
    go.addEventListener('click', () => openDayForWeek(s.r.week));
    head.append(go);
    li.append(head, facts); list.append(li);
  });
}

// ---------- best time of day ----------
function hourLine(el, rows) {
  el.textContent = '';
  const width = el.clientWidth || 400, height = 240;
  redrawOnResize(el, width, () => hourLine(...arguments));
  const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${width} ${height}`).attr('height', height);
  const ymax = d3.max(rows, r => Math.max(r.disneyland || 0, r.california_adventure || 0));
  const y = d3.scaleLinear([0, ymax * 1.1], [height - 24, 8]).nice();
  const probe = svg.append('text').style('font-size', 'var(--cds-font-size-caption)').text(y.ticks(4).slice(-1)[0] + ' min');
  const left = (probe.node().getComputedTextLength() || 30) + 10; probe.remove();
  const x = d3.scaleLinear(d3.extent(rows, r => r.hour), [left, width - 8]);
  const gy = svg.append('g').attr('transform', `translate(${left - 6},0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(width - left)).tickFormat(v => v + ' min'));
  axisClean(gy);
  const gx = svg.append('g').attr('transform', `translate(0,${height - 24})`).call(d3.axisBottom(x).ticks(width < 420 ? 4 : 8).tickFormat(fmtHour).tickSize(4));
  axisClean(gx); gx.selectAll('line').attr('stroke', 'var(--cds-chart-axis)');
  parks.forEach(p => {
    svg.append('path').datum(rows.filter(r => r[p.key] != null)).attr('fill', 'none').attr('stroke', p.c()).attr('stroke-width', 2).attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round')
      .attr('d', d3.line().x(r => x(r.hour)).y(r => y(r[p.key])));
  });
  const rule = svg.append('line').attr('y1', 8).attr('y2', height - 24).attr('stroke', 'var(--cds-chart-reference)').style('display', 'none');
  const dots = parks.map(p => svg.append('circle').attr('r', 4).attr('fill', p.c()).attr('stroke', 'var(--color-panel)').attr('stroke-width', 2).style('display', 'none'));
  const tip = tipFor(el); const byH = new Map(rows.map(r => [r.hour, r]));
  svg.append('rect').attr('x', left).attr('y', 0).attr('width', width - left).attr('height', height - 24).attr('fill', 'transparent')
    .on('pointermove', (ev) => {
      const [mx] = d3.pointer(ev); const hh = Math.round(x.invert(mx)); const r = byH.get(hh); if (!r) return;
      rule.style('display', null).attr('x1', x(hh)).attr('x2', x(hh));
      parks.forEach((p, i) => dots[i].style('display', r[p.key] == null ? 'none' : null).attr('cx', x(hh)).attr('cy', y(r[p.key] || 0)));
      tipRows(tip, `${fmtHour(hh)}–${fmtHour(hh + 1)}`, parks.map(p => ({ c: p.c(), name: p.name, v: r[p.key] == null ? '—' : f1(r[p.key]) + ' min' })));
      placeTip(el, tip, x(hh) * el.clientWidth / width, y(Math.max(r.disneyland || 0, r.california_adventure || 0)) * el.clientWidth / width);
    })
    .on('pointerleave', () => { rule.style('display', 'none'); dots.forEach(d => d.style('display', 'none')); tip.style.display = 'none'; });
}

function heatmap(el, rowNames, colKeys, colLabel, cell, opts) {
  el.textContent = '';
  const width = el.clientWidth || 500;
  redrawOnResize(el, width, () => heatmap(...arguments));
  const rowH = 22;
  const probe = d3.select(el).append('svg');
  const pt = probe.append('text').style('font-size', 'var(--cds-font-size-caption)');
  let lw = 0; rowNames.forEach(n => { pt.text(n); lw = Math.max(lw, pt.node().getComputedTextLength()); });
  probe.remove();
  const left = Math.min(lw + 10, width * 0.45);
  const top = 20, height = top + rowNames.length * rowH + 4;
  const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${width} ${height}`).attr('height', height);
  const x = d3.scaleBand(colKeys, [left, width]).paddingInner(0.08);
  const showVals = x.bandwidth() >= 22;
  const every = x.bandwidth() < 14 ? 3 : x.bandwidth() < 22 ? 2 : 1;
  svg.append('g').selectAll('text').data(colKeys.filter((_, i) => i % every === 0)).join('text')
    .attr('x', k => x(k) + x.bandwidth() / 2).attr('y', 12).attr('text-anchor', 'middle').attr('fill', 'var(--color-fg-muted)').style('font-size', 'var(--cds-font-size-caption)').text(colLabel);
  const tip = tipFor(el);
  rowNames.forEach((n, ri) => {
    const yy = top + ri * rowH;
    const label = svg.append('text').attr('x', left - 8).attr('y', yy + rowH / 2 + 4).attr('text-anchor', 'end').attr('fill',
      'var(--color-fg)').style('font-size', 'var(--cds-font-size-caption)').text(n);
    if (lw + 10 > left) { const el2 = label.node(); let s = n; while (el2.getComputedTextLength() > left - 12 && s.length > 4) { s = s.slice(0, -2); label.text(s + '…'); } }
    colKeys.forEach(k => {
      const c = cell(n, k); if (!c) return;
      svg.append('rect').attr('x', x(k)).attr('y', yy + 2).attr('width', x.bandwidth()).attr('height', rowH - 4).attr('rx', 3)
        .attr('fill', opts.color).attr('fill-opacity', c.alpha)
        .on('pointermove', (ev) => { tipRows(tip, `${n} · ${colLabel(k)}`, [{ c: opts.color, name: opts.valName, v: c.text }]); const [mx, my] = d3.pointer(ev, el); placeTip(el, tip, mx, my); })
        .on('pointerleave', () => { tip.style.display = 'none'; });
      if (showVals && c.show) svg.append('text').attr('x', x(k) + x.bandwidth() / 2).attr('y', yy + rowH / 2 + 4).attr('text-anchor', 'middle')
        .attr('fill', c.alpha > 0.55 ? 'var(--color-bg)' : 'var(--color-fg)').style('font-size', 'var(--cds-font-size-caption)').style('pointer-events', 'none').text(c.show);
    });
  });
}

let hmPark = 'Disneyland', clPark = 'Disneyland';
document.querySelectorAll('#hm-park button').forEach(b => b.addEventListener('click', () => { hmPark = b.dataset.v;
      document.querySelectorAll('#hm-park button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); drawRideHeat(); }));
document.querySelectorAll('#cl-park button').forEach(b => b.addEventListener('click', () => { clPark = b.dataset.v;
      document.querySelectorAll('#cl-park button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); drawClosureHeat(); }));

function drawRideHeat() {
  const el = document.getElementById('hour-ride'); const d = dash.data('waits_by_hour');
  if (d.status === 'ok' && !isShown(el)) return;
  if (d.status !== 'ok') { if (['error', 'declined', 'missing'].includes(d.status)) failed(el); else { el.textContent = ''; el.classList.add('dash-skeleton'); } return; }
  el.classList.remove('dash-skeleton');
  const rows = d.data.filter(r => r.park === hmPark).map(r => ({ ride: r.ride, hour: Number(r.hour), v: Number(r.avg_wait) }));
  const peak = d3.rollup(rows, v => d3.max(v, r => r.v), r => r.ride);
  const names = [...peak.keys()].sort((a, b) => peak.get(b) - peak.get(a));
  const idx = new Map(rows.map(r => [r.ride + '|' + r.hour, r.v]));
  const hours = d3.range(8, 24);
  const pi = hmPark === 'Disneyland' ? 0 : 1;
  heatmap(el, names, hours, fmtHour, (n, h) => { const v = idx.get(n + '|' + h); if (v == null) return null; return {
        alpha: 0.08 + 0.92 * (v / peak.get(n)), text: f0(v) + ' min', show: f0(v) }; }, { color: dash.colors[pi], valName: 'Avg wait' });
}

function drawClosureHeat() {
  const el = document.getElementById('closure-heat'); const d = dash.data('ride_closures_by_month');
  if (d.status === 'ok' && !isShown(el)) return;
  if (d.status !== 'ok') { if (['error', 'declined', 'missing'].includes(d.status)) failed(el); else { el.textContent = ''; el.classList.add('dash-skeleton'); } return; }
  el.classList.remove('dash-skeleton');
  const rows = d.data.filter(r => r.park === clPark && r.closed_pct !== '').map(r => ({ ride: r.ride, m: r.month, v: Number(r.closed_pct), y: Number(r.years_sampled) }));
  const tot = d3.rollup(rows, v => d3.sum(v, r => r.v), r => r.ride);
  const names = [...tot.keys()].sort((a, b) => tot.get(b) - tot.get(a) || a.localeCompare(b));
  const idx = new Map(rows.map(r => [r.ride + '|' + r.m, r]));
  heatmap(el, names, MONTHS, (m) => m, (n, m) => { const r = idx.get(n + '|' + m); if (!r) return null; return {
        alpha: r.v === 0 ? 0.04 : 0.15 + 0.85 * r.v / 100,
        text: `closed ${f0(r.v)}% of days (${r.y === 1 ? '2025 only' : r.y === 2 ? '2 years' : '2023–2025'})`, show: r.v > 0 ? f0(r.v) + '%' : '' }; }, {
      color: 'var(--cds-chart-status-critical)', valName: 'Closures' });
}

// ---------- events gantt ----------
const EV_COLORS = { 'Festival': () => dash.colors[2], 'Ticketed nights (early close)': () => dash.colors[5] };
(function () {
  const lg = document.getElementById('ev-legend'); lg.textContent = '';
  Object.entries(EV_COLORS).forEach(([k, c]) => { const s = document.createElement('span'); const sw = document.createElement('i'); sw.className = 'qt-sw';
      sw.style.background = c(); s.append(sw, document.createTextNode(k)); lg.append(s); });
})();
function drawEvents() {
  const el = document.getElementById('events-gantt'); const d = dash.data('events');
  if (d.status === 'ok' && !isShown(el)) return;
  if (d.status !== 'ok') { if (['error', 'declined', 'missing'].includes(d.status)) failed(el); else { el.textContent = ''; el.classList.add('dash-skeleton'); } return; }
  el.classList.remove('dash-skeleton'); el.textContent = '';
  const rows = d.data.map(r => ({ ...r, base: r.name.replace(' (end)', ''), s: Number(r.start_week), e: Number(r.end_week) }));
  const names = [...new Set(rows.map(r => r.base))];
  const width = el.clientWidth || 600, rowH = 26, top = 4, height = top + names.length * rowH + 24;
  redrawOnResize(el, width, () => drawEvents());
  const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${width} ${height}`).attr('height', height);
  const x = d3.scaleLinear([0.5, 52.5], [0, width]);
  const ticks = MONTH_DOY.map(doyToWeek);
  svg.append('g').selectAll('line').data(ticks).join('line').attr('x1', t => x(t - 0.5)).attr('x2', t => x(t - 0.5)).attr('y1', 0).attr('y2', height - 24).attr('stroke', 'var(--cds-chart-grid)');
  const every = width < 480 ? 2 : 1;
  const gx = svg.append('g').attr('transform', `translate(0,${height - 24})`).call(d3.axisBottom(x).tickValues(ticks.filter((_,
          i) => i % every === 0)).tickFormat((t) => MONTHS[ticks.indexOf(t)]).tickSize(4));
  axisClean(gx); gx.selectAll('line').attr('stroke', 'var(--cds-chart-axis)'); gx.selectAll('text').attr('text-anchor', 'start').attr('dx', 2);
  const tip = tipFor(el);
  rows.forEach(r => {
    const yy = top + names.indexOf(r.base) * rowH;
    const x0 = x(r.s - 0.5), x1 = x(r.e + 0.5);
    const col = (EV_COLORS[r.kind] || (() => dash.colors[0]))();
    svg.append('rect').attr('x', x0).attr('y', yy + 3).attr('width', Math.max(4, x1 - x0)).attr('height', rowH - 6).attr('rx', 4).attr('fill', col).attr('fill-opacity', .85)
      .on('pointermove', (ev) => { tipRows(tip, r.base, [{ c: col, name: r.park, v: `${r.start.replace('-', '/')} – ${r.end.replace('-', '/')}`
              }], r.notes); const [mx, my] = d3.pointer(ev, el); placeTip(el, tip, mx, my); })
      .on('pointerleave', () => { tip.style.display = 'none'; });
  });
  names.forEach((n, i) => {
    const segs = rows.filter(r => r.base === n); const yy = top + i * rowH;
    const first = segs.reduce((a, b) => (b.e - b.s > a.e - a.s ? b : a));
    const x0 = x(first.s - 0.5), x1 = x(first.e + 0.5);
    const t = svg.append('text').attr('y', yy + rowH / 2 + 4).style('font-size', 'var(--cds-font-size-caption)').style('pointer-events', 'none').text(n);
    const tw = t.node().getComputedTextLength();
    if (tw + 12 < x1 - x0) t.attr('x', x0 + 6).attr('fill', 'var(--color-bg)');
    else if (x1 + 6 + tw < width) t.attr('x', x1 + 6).attr('fill', 'var(--color-fg)');
    else t.attr('x', x0 - 6).attr('text-anchor', 'end').attr('fill', 'var(--color-fg)');
  });
}
