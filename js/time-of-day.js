// DLR Planner: Time of day overlay chart and its chips.
// Part of the app script. The js files load in the order of their script tags in index.html (listed in CLAUDE.md).
// ---------- overlay explorer ----------
const fmtMin = (v) => f1(v) + ' min', fmtPct = (v) => f0(v) + '%', fmtDeg = (v) => f1(v) + '°F', fmtH = (v) => f1(v) + ' h', fmtRank = (v) => f0(v);
const OV = [
  { id: 'dl_wait', group: 'Wait times', name: 'Disneyland wait', unit: 'min', src: 'wait_by_week', key: 'disneyland', fmt: fmtMin },
  { id: 'dca_wait', group: 'Wait times', name: 'DCA wait', unit: 'min', src: 'wait_by_week', key: 'california_adventure', fmt: fmtMin },
  { id: 'dl_crowd', group: 'Crowd rating', name: 'Disneyland crowd', unit: 'rating', src: 'crowd_by_week', key: 'disneyland', fmt: fmtRank },
  { id: 'dca_crowd', group: 'Crowd rating', name: 'DCA crowd', unit: 'rating', src: 'crowd_by_week', key: 'california_adventure', fmt: fmtRank },
  { id: 'dl_hours', group: 'Park hours', name: 'Disneyland hours', unit: 'hours', src: 'hours_by_week', key: 'disneyland', fmt: fmtH },
  { id: 'dca_hours', group: 'Park hours', name: 'DCA hours', unit: 'hours', src: 'hours_by_week', key: 'california_adventure', fmt: fmtH },
  { id: 'high', group: 'Temperature', name: 'High', unit: '°F', src: 'weather_by_week', key: 'avg_high_f', fmt: fmtDeg },
  { id: 'feels', group: 'Temperature', name: 'Feels‑like high', unit: '°F', src: 'weather_by_week', key: 'feels_like_high_f', fmt: fmtDeg },
  { id: 'low', group: 'Temperature', name: 'Low', unit: '°F', src: 'weather_by_week', key: 'avg_low_f', fmt: fmtDeg },
  { id: 'rain', group: 'Rain & risk', name: 'Rain chance', unit: '% of days', src: 'weather_by_week', key: 'rain_chance_pct', fmt: fmtPct },
  { id: 'soak', group: 'Rain & risk', name: 'Soaking chance', unit: '% of days', src: 'weather_by_week', key: 'heavy_rain_chance_pct', fmt: fmtPct },
  { id: 'hot', group: 'Rain & risk', name: '90°F+ days', unit: '% of days', src: 'weather_by_week', key: 'hot_day_pct', fmt: fmtPct },
  { id: 'chilly', group: 'Rain & risk', name: 'Nights <45°F', unit: '% of days', src: 'weather_by_week', key: 'chilly_night_pct', fmt: fmtPct },
  { id: 'windy', group: 'Rain & risk', name: 'Gusty days', unit: '% of days', src: 'weather_by_week', key: 'windy_day_pct', fmt: fmtPct },
  { id: 'dl_closed', group: 'Ride closures', name: 'Disneyland rides closed', unit: 'rides', src: 'closures_by_week', key: 'disneyland', fmt: (v) => f1(v) + ' rides' },
  { id: 'dca_closed', group: 'Ride closures', name: 'DCA rides closed', unit: 'rides', src: 'closures_by_week', key: 'california_adventure', fmt: (v) => f1(v) + ' rides' },
  { id: 'sunset', group: 'Other', name: 'Sunset', unit: 'time', src: 'sun_by_week', key: 'sunset_hour', fmt: (v) => fmtClock(v) },
  { id: 'humid', group: 'Other', name: 'Humidity', unit: '%', src: 'weather_by_week', key: 'humidity_pct', fmt: fmtPct },
  { id: 'daylight', group: 'Other', name: 'Daylight', unit: 'hours', src: 'weather_by_week', key: 'daylight_hours', fmt: fmtH }
];
const PRESETS = {
  'waits-weather': ['dl_wait', 'dca_wait', 'high', 'rain'],
  'waits-crowds': ['dl_wait', 'dca_wait', 'dl_crowd', 'dca_crowd'],
  'rain-heat': ['rain', 'soak', 'hot', 'feels'],
  'clear': []
};
const MAX_SEL = 8;
let ovSel = PRESETS['waits-weather'].slice();
let ovMode = 'scaled';
let ovBands = true;
let ovRows = [], ovHol = null;
const chipBox = document.getElementById('ov-chips');
const groups = [...new Set(OV.map(o => o.group))];
groups.forEach(g => {
  const row = document.createElement('div'); row.className = 'qt-chipgroup';
  const lab = document.createElement('span'); lab.className = 'g'; lab.textContent = g; row.append(lab);
  OV.filter(o => o.group === g).forEach(o => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'qt-chip'; b.dataset.id = o.id;
    const sw = document.createElement('i'); sw.className = 'qt-sw';
    b.append(sw, document.createTextNode(o.name));
    b.addEventListener('click', () => {
      const i = ovSel.indexOf(o.id);
      if (i >= 0) ovSel.splice(i, 1); else if (ovSel.length < MAX_SEL) ovSel.push(o.id);
      drawOverlay();
    });
    row.append(b);
  });
  chipBox.append(row);
});
const ovColor = (id) => dash.colors[ovSel.indexOf(id) % dash.colors.length];
function syncChips() {
  chipBox.querySelectorAll('.qt-chip').forEach(b => {
    const on = ovSel.includes(b.dataset.id);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.disabled = !on && ovSel.length >= MAX_SEL;
    const sw = b.querySelector('.qt-sw');
    sw.style.background = on ? ovColor(b.dataset.id) : 'transparent';
    sw.style.borderColor = on ? ovColor(b.dataset.id) : '';
  });
  document.querySelectorAll('#overlay-card .qt-seg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === ovMode ? 'true' : 'false'));
}
document.querySelectorAll('#overlay-card .qt-seg button').forEach(b => b.addEventListener('click', () => { ovMode = b.dataset.mode; drawOverlay(); }));
document.querySelectorAll('#overlay-card [data-preset]').forEach(b => b.addEventListener('click', () => { ovSel = PRESETS[b.dataset.preset].slice(); drawOverlay(); }));
document.getElementById('ov-bands').addEventListener('change', (e) => { ovBands = e.target.checked; drawOverlay(); });

function drawOverlay() {
  syncChips();
  const el = document.getElementById('overlay');
  const note = document.getElementById('ov-note');
  const st = statusOf(['wait_by_week', 'crowd_by_week', 'hours_by_week', 'weather_by_week', 'closures_by_week', 'sun_by_week', 'holidays']);
  if (st === 'error') { failed(el); return; }
  if (st !== 'ok') { el.textContent = ''; el.classList.add('dash-skeleton'); return; }
  el.classList.remove('dash-skeleton');
  note.textContent = '';
  const sel = ovSel.map(id => OV.find(o => o.id === id));
  el.textContent = '';
  const width = el.clientWidth || 600, height = 340;
  redrawOnResize(el, width, () => drawOverlay());
  const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${width} ${height}`).attr('height', height);
  if (!sel.length) {
    svg.append('text').attr('x', width / 2).attr('y', height / 2).attr('text-anchor', 'middle').attr('fill', 'var(--color-fg-muted)')
      .style('font-size', 'var(--cds-font-size-body)').text('Pick one or more measures above to draw them here.');
    return;
  }
  const rows = ovRows;
  // which series draw, and on which axis
  let units = [], drawn2 = sel;
  if (ovMode === 'actual') {
    units = [...new Set(sel.map(o => o.unit))];
    if (units.length > 2) {
      note.textContent = `Actual values can show two units at once, so ${sel.filter(o => !units.slice(0,
            2).includes(o.unit)).map(o => o.name).join(', ')} ${sel.filter(o => !units.slice(0,
            2).includes(o.unit)).length > 1 ? 'are' : 'is'} hidden. Switch to Scaled to see everything.`;
      units = units.slice(0, 2);
    }
    drawn2 = sel.filter(o => units.includes(o.unit));
  }
  const vals = (o) => rows.map(r => r[o.id]).filter(v => v != null && !isNaN(v));
  const scaled = (o) => { const v = vals(o); const lo = d3.min(v), hi = d3.max(v); return (x) => hi === lo ? 50 : (x - lo) / (hi - lo) * 100; };
  const yFor = {};
  let leftW = 24, rightW = 8;
  const measure = (t) => { const p = svg.append('text').style('font-size', 'var(--cds-font-size-caption)').text(t); const w = p.node().getComputedTextLength(); p.remove(); return w; };
  let yLeft, yRight;
  if (ovMode === 'scaled') {
    yLeft = d3.scaleLinear([0, 100], [height - 24, 12]);
    leftW = Math.max(measure('High'), measure('Low')) + 10;
  } else {
    const dom = (u) => { const v = drawn2.filter(o => o.unit === u).flatMap(vals); const lo = d3.min(v), hi = d3.max(v); const pad = (hi - lo) * 0.08 || 1; return [Math.max(0, lo - pad), hi + pad]; };
    yLeft = d3.scaleLinear(dom(units[0]), [height - 24, 12]).nice();
    leftW = measure(yLeft.tickFormat(5)(yLeft.ticks(5).slice(-1)[0]) + ' ' + units[0]) + 10;
    if (units[1]) { yRight = d3.scaleLinear(dom(units[1]), [height - 24, 12]).nice(); rightW = measure(yRight.tickFormat(5)(yRight.ticks(5).slice(-1)[0]) + ' ' + units[1]) + 10; }
  }
  const x = d3.scaleLinear([0.5, 52.5], [leftW, width - rightW]);
  const bandW = x(2) - x(1);
  if (ovBands && ovHol) {
    svg.append('g').selectAll('rect').data(ovHol).join('rect')
      .attr('x', h => x(Number(h.start_week) - 0.5)).attr('width', h => (Number(h.end_week) - Number(h.start_week) + 1) * bandW)
      .attr('y', 12).attr('height', height - 36).attr('fill', 'var(--color-fg-muted)').attr('fill-opacity', h => h.kind === 'school' ? .12 : .2);
  }
  if (ovMode === 'scaled') {
    const gy = svg.append('g').attr('transform', `translate(${leftW - 6},0)`).call(d3.axisLeft(yLeft).tickValues([0, 50,
          100]).tickSize(-(width - leftW - rightW + 6)).tickFormat(v => v === 0 ? 'Low' : v === 100 ? 'High' : ''));
    axisClean(gy);
  } else {
    const gy = svg.append('g').attr('transform', `translate(${leftW - 6},0)`).call(d3.axisLeft(yLeft).ticks(5).tickSize(-(width - leftW - rightW +
          6)).tickFormat(v => yLeft.tickFormat(5)(v) + (v === yLeft.ticks(5).slice(-1)[0] ? ' ' + units[0] : '')));
    axisClean(gy);
    if (yRight) {
      const gr = svg.append('g').attr('transform', `translate(${width - rightW + 6},0)`).call(d3.axisRight(yRight).ticks(5).tickSize(0).tickFormat(v =>
          yRight.tickFormat(5)(v) + (v === yRight.ticks(5).slice(-1)[0] ? ' ' + units[1] : '')));
      axisClean(gr);
    }
  }
  const ticks = MONTH_DOY.map(doyToWeek);
  const every = width < 480 ? 2 : 1;
  const gx = svg.append('g').attr('transform', `translate(0,${height - 24})`)
    .call(d3.axisBottom(x).tickValues(ticks.filter((_, i) => i % every === 0)).tickFormat((t) => MONTHS[ticks.indexOf(t)]).tickSize(4));
  axisClean(gx); gx.selectAll('line').attr('stroke', 'var(--cds-chart-axis)'); gx.selectAll('text').attr('text-anchor', 'start').attr('dx', 2);

  drawn2.forEach(o => {
    if (ovMode === 'scaled') { const sc = scaled(o); yFor[o.id] = (v) => yLeft(sc(v)); }
    else yFor[o.id] = (o.unit === units[0] ? yLeft : yRight);
    svg.append('path').datum(rows.filter(r => r[o.id] != null)).attr('fill', 'none').attr('stroke', ovColor(o.id)).attr('stroke-width', 2)
      .attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round').attr('d', d3.line().x(r => x(r.week)).y(r => yFor[o.id](r[o.id])));
  });

  const rule = svg.append('line').attr('y1', 12).attr('y2', height - 24).attr('stroke', 'var(--cds-chart-reference)').style('display', 'none');
  const dots = drawn2.map(o => svg.append('circle').attr('r', 4).attr('fill', ovColor(o.id)).attr('stroke', 'var(--color-panel)').attr('stroke-width', 2).style('display', 'none'));
  const tip = tipFor(el);
  const byWeek = new Map(rows.map(r => [r.week, r]));
  svg.append('rect').attr('x', leftW).attr('y', 0).attr('width', width - leftW - rightW).attr('height', height - 24).attr('fill', 'transparent')
    .on('pointermove', (ev) => {
      const [mx] = d3.pointer(ev);
      const wk = Math.max(1, Math.min(52, Math.round(x.invert(mx))));
      const r = byWeek.get(wk); if (!r) return;
      rule.style('display', null).attr('x1', x(wk)).attr('x2', x(wk));
      drawn2.forEach((o, i) => dots[i].style('display', null).attr('cx', x(wk)).attr('cy', yFor[o.id](r[o.id])));
      const evs = ovHol ? ovHol.filter(h => wk >= Number(h.start_week) && wk <= Number(h.end_week)).map(h => h.name).join(', ') : '';
      tipRows(tip, `Week ${wk} · ${r.week_label}`, drawn2.map(o => ({ c: ovColor(o.id), name: o.name, v: o.fmt(r[o.id]) })), evs);
      const s = el.clientWidth / width;
      placeTip(el, tip, x(wk) * s, d3.min(drawn2, o => yFor[o.id](r[o.id])) * s);
    })
    .on('pointerleave', () => { rule.style('display', 'none'); dots.forEach(d => d.style('display', 'none')); tip.style.display = 'none'; });
}
