// DLR Planner: chart helpers: tooltips, axes, redraw on resize, week charts, grouped bars, the ride table.
// Part of the app script. The js files load in the order of their script tags in index.html (listed in CLAUDE.md).
const isShown = (el) => !!(el && el.getClientRects().length);
function failed(el) {
  el.classList.remove('dash-skeleton');
  el.textContent = '';
  const d = document.createElement('div'); d.className = 'qt-fail'; d.textContent = 'Failed to load';
  el.append(d);
}
function statusOf(ids) {
  const st = ids.map(id => dash.data(id).status);
  if (st.every(s => s === 'ok')) return 'ok';
  if (st.some(s => s === 'error' || s === 'declined' || s === 'missing')) return 'error';
  return 'loading';
}

function tipFor(el) {
  let t = el.querySelector('.qt-tip');
  if (!t) { t = document.createElement('div'); t.className = 'qt-tip'; el.append(t); }
  return t;
}
function placeTip(el, tip, x, y) {
  tip.style.display = 'block';
  const w = el.clientWidth, tw = tip.offsetWidth;
  let left = x + 14; if (left + tw > w) left = Math.max(0, x - tw - 14);
  tip.style.left = left + 'px'; tip.style.top = Math.max(0, y - 10) + 'px';
}
function tipRows(tip, title, rows, extra) {
  tip.textContent = '';
  const d = document.createElement('div'); d.className = 'd'; d.textContent = title; tip.append(d);
  rows.forEach(r => {
    const row = document.createElement('div'); row.className = 'r';
    const sw = document.createElement('i'); sw.className = 'qt-sw'; sw.style.background = r.c;
    row.append(sw, document.createTextNode(`${r.name}: ${r.v}`)); tip.append(row);
  });
  if (extra) { const e = document.createElement('div'); e.className = 'ev'; e.textContent = extra; tip.append(e); }
}

// month tick positions on the week axis (non-leap year day-of-year of each month's 1st)
const MONTH_DOY = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
const doyToWeek = (doy) => (doy - 1) / 7 + 1;

const drawn = new Set();
function axisClean(g) { g.attr('font-size', null).attr('font-family', null);
  g.selectAll('text').attr('fill', 'var(--color-fg-muted)').style('font-size', 'var(--cds-font-size-caption)'); g.select('.domain').remove();
  g.selectAll('line').attr('stroke', 'var(--cds-chart-grid)'); }

// Charts size themselves to their box when drawn. A box that is hidden at that moment (a tab or wizard step
// not shown yet) has no width, so redraw once it gets one, and again whenever its width changes.
const roDrawn = new WeakMap();
const roWatch = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver((entries) => {
  for (const e of entries) {
    const k = roDrawn.get(e.target), w = e.target.clientWidth;
    if (k && w && Math.abs(w - k.w) > 2 && !k.pending) { k.pending = true; requestAnimationFrame(() => { k.pending = false; if (e.target.isConnected) k.fn(); }); }
  }
});
function redrawOnResize(el, width, fn) {
  if (!roWatch) return;
  if (!roDrawn.has(el)) roWatch.observe(el);
  roDrawn.set(el, { w: width, fn });
}
function weekFrame(el, holidays, opts, yDomain) {
  el.textContent = '';
  const width = el.clientWidth || 600, height = opts.height;
  redrawOnResize(el, width, () => weekFrame(...arguments));
  const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${width} ${height}`).attr('height', height);
  const y = d3.scaleLinear(yDomain, [height - 24, 8]).nice();
  const probe = svg.append('text').style('font-size', 'var(--cds-font-size-caption)').text(opts.fmtTick(y.ticks(5).slice(-1)[0]));
  const left = (probe.node().getComputedTextLength() || 24) + 10; probe.remove();
  const right = 8;
  const x = d3.scaleLinear([0.5, 52.5], [left, width - right]);
  const bandW = (x(2) - x(1));
  if (holidays) {
    svg.append('g').selectAll('rect').data(holidays).join('rect')
      .attr('x', h => x(Number(h.start_week) - 0.5))
      .attr('width', h => (Number(h.end_week) - Number(h.start_week) + 1) * bandW)
      .attr('y', 8).attr('height', height - 32)
      .attr('fill', 'var(--color-fg-muted)').attr('fill-opacity', h => h.kind === 'school' ? .12 : .2);
  }
  const gy = svg.append('g').attr('transform', `translate(${left - 6},0)`)
    .call(d3.axisLeft(y).ticks(5).tickSize(-(width - left - right + 6)).tickFormat(opts.fmtTick));
  axisClean(gy);
  const ticks = MONTH_DOY.map(doyToWeek);
  const every = width < 480 ? 2 : 1;
  const gx = svg.append('g').attr('transform', `translate(0,${height - 24})`)
    .call(d3.axisBottom(x).tickValues(ticks.filter((_, i) => i % every === 0)).tickFormat((t) => MONTHS[ticks.indexOf(t)]).tickSize(4));
  axisClean(gx); gx.selectAll('line').attr('stroke', 'var(--cds-chart-axis)');
  gx.selectAll('text').attr('text-anchor', 'start').attr('dx', 2);
  if (opts.ref != null && opts.ref >= y.domain()[0] && opts.ref <= y.domain()[1]) {
    svg.append('line').attr('x1', left).attr('x2', width - right).attr('y1', y(opts.ref)).attr('y2', y(opts.ref))
      .attr('stroke', 'var(--cds-chart-reference)').attr('stroke-dasharray', '4 4');
    svg.append('text').attr('x', width - right).attr('y', y(opts.ref) - 4).attr('text-anchor', 'end')
      .attr('fill', 'var(--color-fg-muted)').style('font-size', 'var(--cds-font-size-caption)').text(opts.refLabel || '');
  }
  return { svg, x, y, width, height, left, right, bandW };
}

function weekHover(el, f, rows, holidays, S, opts, yOf) {
  const { svg, x, y, width, height, left, right } = f;
  const rule = svg.append('line').attr('y1', 8).attr('y2', height - 24).attr('stroke', 'var(--cds-chart-reference)').style('display', 'none');
  const dots = opts.dots === false ? [] : S.map(p => svg.append('circle').attr('r', 4).attr('fill', p.c()).attr('stroke', 'var(--color-panel)').attr('stroke-width', 2).style('display', 'none'));
  const tip = tipFor(el);
  const byWeek = new Map(rows.map(r => [r.week, r]));
  svg.append('rect').attr('x', left).attr('y', 0).attr('width', width - left - right).attr('height', height - 24)
    .attr('fill', 'transparent')
    .on('pointermove', (ev) => {
      const [mx] = d3.pointer(ev);
      const wk = Math.max(1, Math.min(52, Math.round(x.invert(mx))));
      const r = byWeek.get(wk); if (!r) return;
      rule.style('display', null).attr('x1', x(wk)).attr('x2', x(wk));
      dots.forEach((d, i) => d.style('display', null).attr('cx', x(wk)).attr('cy', y(r[S[i].key])));
      const ev2 = [opts.extra ? opts.extra(r) : '',
        holidays ? holidays.filter(h => wk >= Number(h.start_week) && wk <= Number(h.end_week)).map(h => h.name).join(', ') : ''].filter(Boolean).join(' · ');
      tipRows(tip, `Week ${wk} · ${r.week_label}`, S.map(p => ({ c: p.c(), name: p.name, v: opts.fmtVal(r[p.key]) })), ev2);
      const s = el.clientWidth / width;
      placeTip(el, tip, x(wk) * s, y(yOf(r)) * s);
    })
    .on('pointerleave', () => { rule.style('display', 'none'); dots.forEach(d => d.style('display', 'none')); tip.style.display = 'none'; });
}

function weekLine(el, rows, holidays, opts) {
  const S = opts.series || parks;
  const ymax = d3.max(rows, r => d3.max(S, p => r[p.key]));
  const ymin = d3.min(rows, r => d3.min(S, p => r[p.key]));
  const y0 = opts.zero ? 0 : Math.max(0, Math.floor((ymin - 2) / 5) * 5);
  const f = weekFrame(el, holidays, opts, [y0, Math.max(Math.ceil((ymax + 1) / 5) * 5, opts.ref != null ? opts.ref + 2 : 0)]);
  const { svg, x, y } = f;
  if (opts.range) {
    const [lo, hi] = opts.range;
    svg.append('path').datum(rows).attr('fill', 'var(--cds-chart-muted)').attr('fill-opacity', .25)
      .attr('d', d3.area().x(r => x(r.week)).y0(r => y(r[lo])).y1(r => y(r[hi])));
  }
  const line = (k) => d3.line().x(r => x(r.week)).y(r => y(r[k]));
  S.forEach(p => {
    const path = svg.append('path').datum(rows).attr('class', 'line').attr('fill', 'none').attr('stroke', p.c())
      .attr('stroke-width', 2).attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round').attr('d', line(p.key));
    if (p.dash) path.attr('stroke-dasharray', '5 4').attr('class', null);
    const len = path.node().getTotalLength ? path.node().getTotalLength() : 0;
    path.style('--len', len);
  });
  if (!drawn.has(el.id)) { el.classList.add('anim'); drawn.add(el.id); } else el.classList.remove('anim');
  weekHover(el, f, rows, holidays, S, opts, r => d3.max(S, p => r[p.key]));
}

function weekBars(el, rows, holidays, opts) {
  const S = opts.series;
  const ymax = d3.max(rows, r => r[S[0].key]);
  const f = weekFrame(el, holidays, opts, [0, Math.max(5, Math.ceil(ymax / 5) * 5)]);
  const { svg, x, y, bandW } = f;
  const bw = Math.max(2, Math.min(32, bandW * 0.7));
  S.forEach((p, i) => {
    svg.append('g').selectAll('rect').data(rows).join('rect')
      .attr('x', r => x(r.week) - bw / 2).attr('width', bw)
      .attr('y', r => y(r[p.key])).attr('height', r => y(0) - y(r[p.key]))
      .attr('rx', Math.min(3, bw / 2)).attr('fill', p.c()).attr('fill-opacity', i === 0 ? .45 : 1);
  });
  weekHover(el, f, rows, holidays, S, Object.assign({ dots: false }, opts), r => r[S[0].key]);
}

function groupedBars(el, rows, cat, opts) {
  el.textContent = '';
  const width = el.clientWidth || 400, height = opts.height;
  redrawOnResize(el, width, () => groupedBars(...arguments));
  const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${width} ${height}`).attr('height', height);
  const ymax = d3.max(rows, r => Math.max(r.disneyland, r.california_adventure));
  const y = d3.scaleLinear([0, ymax * 1.08], [height - 24, 8]).nice();
  const probe = svg.append('text').style('font-size', 'var(--cds-font-size-caption)').text(opts.fmtTick(y.ticks(4).slice(-1)[0]));
  const left = (probe.node().getComputedTextLength() || 20) + 10; probe.remove();
  const x = d3.scaleBand(rows.map(r => r[cat]), [left, width - 4]).paddingInner(0.25).paddingOuter(0.1);
  const xi = d3.scaleBand(parks.map(p => p.key), [0, x.bandwidth()]).padding(0.12);
  const gy = svg.append('g').attr('transform', `translate(${left - 6},0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(width - left + 2)).tickFormat(opts.fmtTick));
  axisClean(gy);
  const gx = svg.append('g').attr('transform', `translate(0,${height - 24})`).call(d3.axisBottom(x).tickSize(0).tickPadding(8)
    .tickFormat(width < 420 && rows.length > 8 ? (d) => d.slice(0, 1) : (d) => d));
  axisClean(gx);
  const min = { disneyland: d3.min(rows, r => r.disneyland), california_adventure: d3.min(rows, r => r.california_adventure) };
  const tip = tipFor(el);
  const groups = svg.append('g').selectAll('g').data(rows).join('g').attr('transform', r => `translate(${x(r[cat])},0)`);
  parks.forEach(p => {
    groups.append('rect').attr('x', xi(p.key)).attr('width', Math.min(32, xi.bandwidth()))
      .attr('y', r => y(r[p.key])).attr('height', r => y(0) - y(r[p.key])).attr('rx', 3)
      .attr('fill', p.c()).attr('fill-opacity', r => r[p.key] === min[p.key] ? 1 : .55);
  });
  groups.append('rect').attr('x', 0).attr('y', 0).attr('width', x.bandwidth()).attr('height', height - 24).attr('fill', 'transparent')
    .on('pointermove', (ev, r) => {
      tipRows(tip, opts.title(r), parks.map(p => ({ c: p.c(), name: p.name, v: opts.fmtVal(r[p.key]) })));
      const s = el.clientWidth / width;
      placeTip(el, tip, (x(r[cat]) + x.bandwidth() / 2) * s, y(Math.max(r.disneyland, r.california_adventure)) * s);
    })
    .on('pointerleave', () => { tip.style.display = 'none'; });
}

// table
let sortKey = 'dl_wait', sortDir = 1;
const tbl = document.getElementById('week-table');
const search = document.getElementById('qt-search');
tbl.querySelectorAll('th button').forEach(b => b.addEventListener('click', () => {
  const k = b.dataset.k;
  if (sortKey === k) sortDir = -sortDir; else { sortKey = k; sortDir = 1; }
  renderTable();
}));
search.addEventListener('input', () => renderTable());
let tableRows = [];
function renderTable() {
  const tb = tbl.querySelector('tbody'); tb.textContent = '';
  tbl.querySelectorAll('th').forEach(th => {
    const b = th.querySelector('button');
    if (b && b.dataset.k === sortKey && th.dataset.field !== 'dates') th.setAttribute('aria-sort', sortDir > 0 ? 'ascending' : 'descending'); else th.removeAttribute('aria-sort');
  });
  const q = search.value.trim().toLowerCase();
  const maxW = d3.max(tableRows, r => Math.max(r.dl_wait, r.dca_wait)) || 1;
  const rows = tableRows.filter(r => !q || `${r.dates} ${r.events}`.toLowerCase().includes(q))
    .slice().sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey];
      return (typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb))) * sortDir || a.week - b.week;
    });
  for (const r of rows) {
    const tr = document.createElement('tr');
    const td = (txt, cls) => { const c = document.createElement('td'); if (cls) c.className = cls; c.textContent = txt; tr.append(c); return c; };
    td(String(r.week));
    td(r.dates, 'l');
    [['dl_wait', 0], ['dca_wait', 1]].forEach(([k, i]) => {
      const c = document.createElement('td');
      const wrap = document.createElement('span'); wrap.className = 'qt-cell';
      const bar = document.createElement('span'); bar.className = 'qt-bar';
      bar.style.width = (r[k] / maxW * 3.5).toFixed(2) + 'rem'; bar.style.background = dash.colors[i];
      wrap.append(bar, document.createTextNode(f1(r[k]) + ' min'));
      c.append(wrap); tr.append(c);
    });
    td(f0(r.dl_crowd)); td(f0(r.dca_crowd));
    td(f1(r.dl_hours) + ' h', 'qt-hide-narrow'); td(f1(r.dca_hours) + ' h', 'qt-hide-narrow');
    td(f0(r.high_f) + '°'); td(f0(r.rain_pct) + '%'); td(f0(r.hot_pct) + '%', 'qt-hide-narrow');
    td(f1(r.dl_closed), 'qt-hide-narrow'); td(f1(r.dca_closed), 'qt-hide-narrow'); td(fmtClock(r.sunset), 'qt-hide-narrow');
    td(r.events, 'l ev qt-hide-narrow');
    tr.title = 'Plan a day in this week';
    tr.addEventListener('click', () => openDayForWeek(r.week));
    tb.append(tr);
  }
}
