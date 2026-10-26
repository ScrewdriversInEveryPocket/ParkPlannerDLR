// DLR Planner: Settings dialog, redraw when data loads, tabs, startup.
// Part of the app script. The js files load in the order of their script tags in index.html (listed in CLAUDE.md).
// ---------- app: settings ----------
(function settings() {
  const dlg = document.getElementById('app-settings');
  const id = document.getElementById('xw-id'), sec = document.getElementById('xw-secret'), msg = document.getElementById('xw-msg');
  const load = () => { try { const k = JSON.parse(localStorage.getItem('pdp-xweather') || 'null'); id.value = k ? k.id : ''; sec.value = k ? k.secret : ''; } catch (e) { /* ignore */ } };
  const status = () => { msg.textContent = window.PDP_FC_SRC ? `Live forecast in use: ${window.PDP_FC_SRC}.` + (window.PDP_FC_ERR &&
      window.PDP_FC_SRC !== 'Xweather' && id.value ? ` Xweather didn't respond (${window.PDP_FC_ERR}), so Open‑Meteo is used.` : '') : (window.PDP_FC_ERR ?
      `No live forecast: ${window.PDP_FC_ERR}` : 'Checking the forecast…'); };
  document.getElementById('app-settings-btn').addEventListener('click', () => { load(); status(); dlg.showModal(); });
  document.getElementById('xw-save').addEventListener('click', async () => {
    try { if (id.value.trim() && sec.value.trim()) localStorage.setItem('pdp-xweather', JSON.stringify({ id: id.value.trim(), secret: sec.value.trim() }));
      else localStorage.removeItem('pdp-xweather'); } catch (e) { /* ignore */ }
    msg.textContent = 'Checking…'; await window.PDP_refreshForecast(); status();
  });
  document.getElementById('xw-clear').addEventListener('click', async () => { try { localStorage.removeItem('pdp-xweather'); } catch (e) { /* ignore */
      } id.value = ''; sec.value = ''; msg.textContent = 'Checking…'; await window.PDP_refreshForecast(); status(); });
  document.getElementById('app-reset').addEventListener('click', () => { if (confirm('Reset all your saved settings and checklist ticks?')) { try {
          localStorage.removeItem('pdp-state'); } catch (e) { /* ignore */ } location.reload(); } });
  document.addEventListener('pdp-forecast', status);
})();

const render = () => {
  // overlay explorer data
  const ovIds = ['wait_by_week', 'crowd_by_week', 'hours_by_week', 'weather_by_week', 'closures_by_week', 'sun_by_week', 'holidays'];
  if (statusOf(ovIds) === 'ok') {
    const m = new Map();
    const put = (src, rowsIn) => rowsIn.forEach(r => {
      const w = Number(r.week);
      if (!m.has(w)) m.set(w, { week: w, week_label: r.week_label });
      OV.filter(o => o.src === src).forEach(o => { m.get(w)[o.id] = Number(r[o.key]); });
    });
    ['wait_by_week', 'crowd_by_week', 'hours_by_week', 'weather_by_week', 'closures_by_week', 'sun_by_week'].forEach(src => put(src, dash.data(src).data));
    ovRows = [...m.values()].sort((a, b) => a.week - b.week);
    ovHol = dash.data('holidays').data;
  }
  drawOverlay();
  drawPlanner();
  const hp = document.getElementById('hour-park'); const hpd = dash.data('hourly_park');
  if (hpd.status === 'ok') { hp.classList.remove('dash-skeleton'); if (isShown(hp)) hourLine(hp, hpd.data); }
  else if (['error', 'declined', 'missing'].includes(hpd.status)) failed(hp); else { hp.textContent = ''; hp.classList.add('dash-skeleton'); }
  drawRideHeat(); drawClosureHeat(); drawEvents();
  ['dp-sw-wait', 'dp-sw-feels', 'dp-sw-rain'].forEach((id, i) => {
      document.getElementById(id).style.background = [dpState.park === 'Disneyland' ? dash.colors[0] : dash.colors[1], dash.colors[2], dash.colors[4]][i]; });
  drawDay();
  drawTrip();
  // highlight marks
  document.querySelectorAll('[data-source="highlights"], [data-source="weather_highlights"]').forEach(el => {
    const hl = dash.data(el.dataset.source);
    if (hl.status !== 'ok') { el.textContent = '—'; if (hl.status !== 'loading') el.classList.remove('dash-skeleton'); return; }
    el.classList.remove('dash-skeleton');
    const [wk, wv] = el.dataset.where.split('=');
    const row = hl.data.find(r => String(r[wk]) === wv);
    const v = row ? row[el.dataset.field] : null;
    el.textContent = v == null ? '—' : (typeof v === 'number' ? (Number.isInteger(v) ? f0(v) : f1(v)) : v);
  });

  // weekly charts
  const ww = document.getElementById('wait-week');
  const s1 = statusOf(['wait_by_week', 'holidays']);
  if (s1 === 'ok') { ww.classList.remove('dash-skeleton'); weekLine(ww, dash.data('wait_by_week').data, dash.data('holidays').data, {
        height: 300, fmtTick: (v) => v + ' min', fmtVal: (v) => f1(v) + ' min' }); }
  else if (s1 === 'error') failed(ww); else { ww.textContent = ''; ww.classList.add('dash-skeleton'); }

  const cw = document.getElementById('crowd-week');
  const s2 = statusOf(['crowd_by_week', 'holidays']);
  if (s2 === 'ok') {
    cw.classList.remove('dash-skeleton');
    const rows = dash.data('crowd_by_week').data.map(r => ({ week: Number(r.week), week_label: r.week_label, disneyland: Number(r.disneyland), california_adventure: Number(r.california_adventure) }));
    weekLine(cw, rows, dash.data('holidays').data, { height: 300, zero: true, fmtTick: (v) => f0(v), fmtVal: (v) => f0(v) });
  } else if (s2 === 'error') failed(cw); else { cw.textContent = ''; cw.classList.add('dash-skeleton'); }

  const hw = document.getElementById('hours-week');
  const s3 = statusOf(['hours_by_week', 'holidays']);
  if (s3 === 'ok') {
    hw.classList.remove('dash-skeleton');
    const rows = dash.data('hours_by_week').data.map(r => ({ week: Number(r.week), week_label: r.week_label, disneyland: Number(r.disneyland), california_adventure: Number(r.california_adventure) }));
    weekLine(hw, rows, dash.data('holidays').data, { height: 240, fmtTick: (v) => v + ' h', fmtVal: (v) => f1(v) + ' h' });
  } else if (s3 === 'error') failed(hw); else { hw.textContent = ''; hw.classList.add('dash-skeleton'); }

  // monthly + weekday bars
  const wm = document.getElementById('wait-month');
  const s4 = statusOf(['wait_by_month']);
  if (s4 === 'ok') { wm.classList.remove('dash-skeleton'); groupedBars(wm, dash.data('wait_by_month').data, 'month', {
        height: 240, fmtTick: (v) => v + ' min', fmtVal: (v) => f1(v) + ' min', title: (r) => r.month }); }
  else if (s4 === 'error') failed(wm); else { wm.textContent = ''; wm.classList.add('dash-skeleton'); }

  const cm = document.getElementById('crowd-month');
  const s5 = statusOf(['crowd_by_month']);
  if (s5 === 'ok') {
    cm.classList.remove('dash-skeleton');
    const rows = dash.data('crowd_by_month').data.map(r => ({ month: r.month, disneyland: Number(r.disneyland), california_adventure: Number(r.california_adventure) }));
    groupedBars(cm, rows, 'month', { height: 240, fmtTick: (v) => f0(v), fmtVal: (v) => f0(v), title: (r) => r.month });
  } else if (s5 === 'error') failed(cm); else { cm.textContent = ''; cm.classList.add('dash-skeleton'); }

  const cd = document.getElementById('crowd-dow');
  const s6 = statusOf(['crowd_by_weekday']);
  if (s6 === 'ok') {
    cd.classList.remove('dash-skeleton');
    const rows = dash.data('crowd_by_weekday').data.map(r => ({
          day: r.day, order: Number(r.day_order), disneyland: Number(r.disneyland), california_adventure: Number(r.california_adventure)
        })).sort((a, b) => a.order - b.order);
    groupedBars(cd, rows, 'day', { height: 240, fmtTick: (v) => f0(v), fmtVal: (v) => f0(v), title: (r) => r.day });
  } else if (s6 === 'error') failed(cd); else { cd.textContent = ''; cd.classList.add('dash-skeleton'); }

  // weather
  const wxs = statusOf(['weather_by_week', 'holidays']);
  const wxRows = wxs === 'ok' ? dash.data('weather_by_week').data.map(r => {
    const o = { week: Number(r.week), week_label: r.week_label };
    Object.keys(r).forEach(k => { if (k !== 'week' && k !== 'week_label') o[k] = Number(r[k]); });
    return o;
  }) : [];
  const hol = wxs === 'ok' ? dash.data('holidays').data : null;
  [['temp-week', () => weekLine(document.getElementById('temp-week'), wxRows, hol, {
          height: 300, series: WX.temp, range: ['avg_low_f', 'avg_high_f'], ref: 90, refLabel: '90°F', fmtTick: (v) => v + '°', fmtVal: (v) => f1(v) + '°F',
          extra: (r) => `Humidity ${f0(r.humidity_pct)}% · ${f1(r.daylight_hours)} h daylight` })],
   ['rain-week', () => weekBars(document.getElementById('rain-week'), wxRows, hol, {
         height: 240, series: WX.rain, fmtTick: (v) => v + '%', fmtVal: (v) => f0(v) + '% of days',
         extra: (r) => `Avg ${d3.format('.2f')(r.avg_rain_in)} in that week · ${f0(r.rain_hours_on_wet_days)} h of rain on a wet day` })],
   ['risk-week', () => weekLine(document.getElementById('risk-week'), wxRows, hol, { height: 240, zero: true, series: WX.risk, fmtTick: (v) => v + '%', fmtVal: (v) => f0(v) + '% of days' })]
  ].forEach(([id, draw]) => {
    const el = document.getElementById(id);
    if (wxs === 'ok') { el.classList.remove('dash-skeleton'); draw(); }
    else if (wxs === 'error') failed(el); else { el.textContent = ''; el.classList.add('dash-skeleton'); }
  });
  const wm2 = dash.data('weather_by_month');
  const mtb = document.querySelector('#wx-month tbody'); mtb.textContent = '';
  if (wm2.status === 'ok') {
    const cols = [['month', (v) => v, 'l'], ['avg_high_f', (v) => f1(v) + '°'], ['avg_low_f', (v) => f1(v) + '°'], ['feels_like_high_f', (v) => f1(v) + '°', 'qt-hide-narrow'],
      ['rain_chance_pct', (v) => f1(v) + '%'], ['heavy_rain_chance_pct', (v) => f1(v) + '%', 'qt-hide-narrow'], ['avg_rain_in', (v) => d3.format('.2f')(v) + ' in', 'qt-hide-narrow'],
      ['hot_day_pct', (v) => f1(v) + '%'], ['chilly_night_pct', (v) => f1(v) + '%', 'qt-hide-narrow'], ['windy_day_pct', (v) => f1(v) + '%',
        'qt-hide-narrow'], ['daylight_hours', (v) => f1(v) + ' h', 'qt-hide-narrow']];
    wm2.data.slice().sort((a, b) => Number(a.month_num) - Number(b.month_num)).forEach(r => {
      const tr = document.createElement('tr');
      cols.forEach(([k, fmt, cls]) => { const c = document.createElement('td'); if (cls) c.className = cls; c.textContent = k === 'month' ? r[k] : fmt(Number(r[k])); tr.append(c); });
      mtb.append(tr);
    });
  }

  // forecast table
  const fdd = dash.data('forecast_daily'), fac = dash.data('forecast_accu'), fmsg = document.getElementById('fc-msg'), ftb = document.querySelector('#fc-table tbody'); ftb.textContent = '';
  const atb = document.querySelector('#fc-accu-table tbody'); atb.textContent = '';
  document.getElementById('fc-table').hidden = fdd.status !== 'ok' && fac.status === 'ok';
  document.getElementById('fc-accu-table').hidden = !(fdd.status !== 'ok' && fac.status === 'ok');
  if (fdd.status !== 'ok' && fac.status === 'ok') {
    fmsg.textContent = 'Source: AccuWeather 10‑day forecast. Rain chance is for daytime.';
    fac.data.forEach(r => {
      const tr = document.createElement('tr'); tr.dataset.key = r.date;
      const dl = new Date(r.date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
      [[dl, 'l'], [r.conditions, 'l'], [r.high_f + '°'], [r.low_f + '°'], [r.feels_high_f + '°', 'qt-hide-narrow'],
        [r.rain_chance_pct + '%']].forEach(([v, c]) => { const td = document.createElement('td'); if (c) td.className = c; td.textContent = v; tr.append(td);
        });
      atb.append(tr);
    });
  } else if (fdd.status === 'ok') {
    fmsg.textContent = 'Source: ' + (window.PDP_FC_SRC ||
      'live') + ' hourly forecast. Feels‑like uses the National Weather Service heat index; rain chance is the highest hourly chance between 8 am and 11 pm.';
    fdd.data.forEach(r => {
      const tr = document.createElement('tr'); tr.dataset.key = r.date;
      const dl = new Date(r.date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
      [[dl, 'l'], [r.conditions, 'l'], [r.high_f + '°'], [r.low_f + '°'], [r.feels_high_f + '°', 'qt-hide-narrow'],
        [r.rain_chance_pct + '%']].forEach(([v, c]) => { const td = document.createElement('td'); if (c) td.className = c; td.textContent = v; tr.append(td);
        });
      ftb.append(tr);
    });
  } else if (fdd.status === 'loading' || fac.status === 'loading') fmsg.textContent = 'Loading the forecast…';
  else fmsg.textContent = 'The live forecast could not load. Check your internet connection, or your Xweather keys in Settings. Everything else works offline.';
  const lastFc = fdd.status === 'ok' && fdd.data.length ? fdd.data[fdd.data.length - 1].date : (fac.status === 'ok' && fac.data.length ? fac.data[fac.data.length - 1].date : null);
  const tpw = document.getElementById('tp-wxsrc');
  if (tpw) { const cap = new Date(); cap.setDate(cap.getDate() + FORECAST_DAYS);
    const capISO = `${cap.getFullYear()}-${pad2(cap.getMonth() + 1)}-${pad2(cap.getDate())}`; const thru = lastFc && lastFc < capISO ? lastFc : capISO;
    tpw.textContent = lastFc ? `Live forecast is used for days within ${FORECAST_DAYS} days (through ${new Date(thru + 'T12:00:00Z').toLocaleDateString('en-US',
        { month: 'short', day: 'numeric', timeZone: 'UTC' })}); later dates use 10‑year averages.` : ''; }

  // table
  const wt = dash.data('week_table');
  tableRows = wt.status === 'ok' ? wt.data : [];
  renderTable();
};
dash.onData(render);

// ---------- tabs ----------
const tabBtns = [...document.querySelectorAll('.qt-tabs [role=tab]')];
function showTab(k, focus) {
  if (!document.getElementById('panel-' + k)) return;
  tabBtns.forEach(b => { const on = b.dataset.tab === k; b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1;
      document.getElementById('panel-' + b.dataset.tab).hidden = !on; if (on && focus) b.focus(); });
  try { render(); } catch (e) { console.error(e); }
  requestAnimationFrame(() => { try { render(); } catch (e) { console.error(e); } });
  try { dash.setLink(k); } catch (e) { /* link is optional */ }
}
window.qtShowTab = showTab;
// the extra tabs live under More; More shows the open one's name while it's selected
{ const more = document.getElementById('tab-more'), menu = document.getElementById('tab-menu');
  const label = () => { const on = tabBtns.find(b => b.classList.contains('tab-extra') && b.getAttribute('aria-selected') === 'true');
    more.textContent = (on ? on.textContent : 'More') + ' ▾'; more.classList.toggle('on', !!on); };
  more.addEventListener('click', (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; more.setAttribute('aria-expanded', String(!menu.hidden));
      if (!menu.hidden) { const r = more.getBoundingClientRect(); menu.style.top = (r.bottom + window.scrollY) + 'px';
        menu.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 200)) + 'px'; } });
  menu.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { menu.hidden = true; more.setAttribute('aria-expanded', 'false'); showTab(b.dataset.tab); label(); }));
  document.addEventListener('click', () => { menu.hidden = true; more.setAttribute('aria-expanded', 'false'); });
  tabBtns.forEach(b => b.addEventListener('click', () => setTimeout(label, 0))); setTimeout(label, 0); }
tabBtns.forEach((b, i) => {
  b.addEventListener('click', () => showTab(b.dataset.tab));
  b.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const n = tabBtns[(i + (e.key === 'ArrowRight' ? 1 : tabBtns.length - 1)) % tabBtns.length]; showTab(n.dataset.tab, true); e.preventDefault(); } });
});
const linked = location.hash.slice(1);
if (linked) {
  if (document.getElementById('panel-' + linked)) showTab(linked);
  else { const el = document.getElementById(linked); const p = el && el.closest('.qt-panel'); if (p) { showTab(p.id.replace('panel-', '')); el.scrollIntoView(); dash.setLink(linked); } }
}
