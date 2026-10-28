// DLR Planner: saved settings, month names, forecast loaders, derived data (waits by week and month, highlights), colour legends.
// Part of the app script. The js files load in the order of their script tags in index.html (listed in CLAUDE.md).
const PDP_SAVED = (() => { try { return JSON.parse(localStorage.getItem('pdp-state') || '{}'); } catch (e) { return {}; } })();
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

dash.loader('forecast_hourly', {
  description: 'Xweather\u2019s hourly forecast as rows: local date, hour, temperature (°F), humidity (%), chance of rain (%) and conditions.',
  fn: ({ answer }) => {
    const a = typeof answer === 'string' ? JSON.parse(answer) : answer;
    if (!a || !Array.isArray(a.forecasts)) throw new Error((a && (a.error || a.message)) || 'Xweather returned no forecast periods.');
    const rows = a.forecasts.map(f => ({ time: f.dateTimeISO, date: String(f.dateTimeISO).slice(0, 10), hour: Number(String(f.dateTimeISO).slice(11, 13)),
          temp_f: Number(f.tempF), humidity: Number(f.humidity), rain_chance_pct: Number(f.pop), conditions: f.weather }));
    return { columns: ['time', 'date', 'hour', 'temp_f', 'humidity', 'rain_chance_pct', 'conditions'], rows };
  }
});

dash.loader('forecast_accu', {
  description: 'AccuWeather\u2019s 10-day forecast as rows: date, daytime high and overnight low (°F), daytime RealFeel high, daytime chance of rain (%) and conditions.',
  fn: ({ answer }) => {
    const a = typeof answer === 'string' ? JSON.parse(answer) : answer;
    if (!a || !Array.isArray(a.dailyForecast)) throw new Error((a && (a.error || a.message)) || 'AccuWeather returned no daily forecast.');
    const rows = a.dailyForecast.map(f => ({ date: String(f.date).slice(0, 10), high_f: Number(f.day.temperature), low_f: Number(f.night.temperature),
          feels_high_f: Number(f.day.realFeelValue), rain_chance_pct: Number(f.day.rainProbabilityValue), conditions: f.day.phrase || f.day.iconPhrase }));
    return { columns: ['date', 'high_f', 'low_f', 'feels_high_f', 'rain_chance_pct', 'conditions'], rows };
  }
});

dash.calc('forecast_daily', {
  inputs: ['forecast_hourly'],
  title: 'Forecast by day',
  description:
    'Each forecast day\u2019s high and low (°F), highest feels-like (NWS heat index from temperature and humidity) ' +
    'and highest chance of rain between 8 am and 11 pm, with the most common daytime conditions.',
  fn: (forecast_hourly) => {
    const hi = (t, r) => t < 80 ? t : Math.round(-42.379 + 2.04901523 * t + 10.14333127 * r - 0.22475541 * t * r - 0.00683783 * t * t - 0.05481717 * r * r +
      0.00122874 * t * t * r + 0.00085282 * t * r * r - 0.00000199 * t * t * r * r);
    const g = new Map();
    for (const r of forecast_hourly) { if (!g.has(r.date)) g.set(r.date, []); g.get(r.date).push(r); }
    return [...g.entries()].filter(([, v]) => v.length >= 12).map(([date, v]) => {
      const day = v.filter(r => r.hour >= 8 && r.hour <= 23);
      const use = day.length ? day : v;
      const counts = new Map(); use.filter(r => r.hour >= 9 && r.hour <= 18).forEach(r => counts.set(r.conditions, (counts.get(r.conditions) || 0) + 1));
      const cond = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
      return { date, high_f: Math.max(...v.map(r => r.temp_f)), low_f: Math.min(...v.map(r => r.temp_f)),
        feels_high_f: Math.max(...use.map(r => hi(r.temp_f, r.humidity))), rain_chance_pct: Math.max(...use.map(r => r.rain_chance_pct)),
        conditions: cond ? cond[0] : '' };
    });
  }
});

dash.calc('wait_by_week', {
  inputs: ['wait_by_date'],
  title: 'Avg wait by week',
  description: 'Each 7-day week\'s mean of the per-date average waits (2023 onward).',
  fn: (wait_by_date) => {
    const g = new Map();
    for (const r of wait_by_date) {
      const k = Number(r.week);
      if (!g.has(k)) g.set(k, { week: k, week_label: r.week_label, a: [], b: [] });
      g.get(k).a.push(Number(r.disneyland));
      g.get(k).b.push(Number(r.california_adventure));
    }
    const avg = (xs) => Math.round(xs.reduce((s, x) => s + x, 0) / xs.length * 10) / 10;
    return [...g.values()].sort((x, y) => x.week - y.week)
      .map(o => ({ week: o.week, week_label: o.week_label, disneyland: avg(o.a), california_adventure: avg(o.b) }));
  }
});

dash.calc('wait_by_month', {
  inputs: ['wait_by_date'],
  title: 'Avg wait by month',
  description: 'Each month\'s mean of the per-date average waits (2023 onward).',
  fn: (wait_by_date) => {
    const order = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const g = new Map(order.map(m => [m, { a: [], b: [] }]));
    for (const r of wait_by_date) {
      g.get(r.month).a.push(Number(r.disneyland));
      g.get(r.month).b.push(Number(r.california_adventure));
    }
    const avg = (xs) => Math.round(xs.reduce((s, x) => s + x, 0) / xs.length * 10) / 10;
    return order.map((m, i) => ({ month: m, month_num: i + 1, disneyland: avg(g.get(m).a), california_adventure: avg(g.get(m).b) }));
  }
});

dash.calc('week_table', {
  inputs: ['wait_by_week', 'crowd_by_week', 'hours_by_week', 'holidays', 'weather_by_week', 'closures_by_week', 'sun_by_week', 'events'],
  title: 'Every week, side by side',
  description: 'Joins weekly waits, crowd ratings, 2025 hours, holidays, events, 2016-2025 weather, typical ride closures and sunset on week number.',
  fn: (wait_by_week, crowd_by_week, hours_by_week, holidays, weather_by_week, closures_by_week, sun_by_week, events) => {
    const cl = new Map(closures_by_week.map(r => [Number(r.week), r]));
    const sn = new Map(sun_by_week.map(r => [Number(r.week), r]));
    const wx = new Map(weather_by_week.map(r => [Number(r.week), r]));
    const crowd = new Map(crowd_by_week.map(r => [Number(r.week), r]));
    const hours = new Map(hours_by_week.map(r => [Number(r.week), r]));
    return wait_by_week.map(w => {
      const c = crowd.get(w.week) || {}, h = hours.get(w.week) || {};
      const ev = holidays.filter(x => w.week >= Number(x.start_week) && w.week <= Number(x.end_week)).map(x => x.name)
        .concat(events.filter(x => w.week >= Number(x.start_week) && w.week <= Number(x.end_week)).map(x => x.name.replace(' (end)', '')));
      return {
        week: w.week, dates: w.week_label,
        dl_wait: w.disneyland, dca_wait: w.california_adventure,
        dl_crowd: Math.round(Number(c.disneyland)), dca_crowd: Math.round(Number(c.california_adventure)),
        dl_hours: Number(h.disneyland), dca_hours: Number(h.california_adventure),
        high_f: Math.round(Number((wx.get(w.week) || {}).avg_high_f)),
        rain_pct: Math.round(Number((wx.get(w.week) || {}).rain_chance_pct)),
        hot_pct: Math.round(Number((wx.get(w.week) || {}).hot_day_pct)),
        dl_closed: Number((cl.get(w.week) || {}).disneyland), dca_closed: Number((cl.get(w.week) || {}).california_adventure),
        sunset: Number((sn.get(w.week) || {}).sunset_hour),
        events: ev.join(', '),
        // for the school-holiday choice in the trip finder
        holiday: holidays.filter(x => w.week >= Number(x.start_week) && w.week <= Number(x.end_week)).map(x => x.name).join(', '),
        school: holidays.some(x => w.week >= Number(x.start_week) && w.week <= Number(x.end_week) && (x.kind === 'school' || /Thanksgiving|winter break/i.test(x.name)))
      };
    });
  }
});

dash.calc('highlights', {
  inputs: ['wait_by_week', 'wait_by_month', 'crowd_by_weekday', 'weather_by_week'],
  title: 'Quietest and busiest',
  description: 'Lowest and highest week and month by average wait, lowest and highest weekday by crowd rating, and the weather in the quietest week, per park.',
  fn: (wait_by_week, wait_by_month, crowd_by_weekday, weather_by_week) => {
    const pick = (rows, k, dir) => rows.reduce((best, r) => (best == null || (dir < 0 ? Number(r[k]) < Number(best[k]) : Number(r[k]) > Number(best[k]))) ? r : best, null);
    dash.calc('weather_highlights', {
  inputs: ['weather_by_month'],
  title: 'Wettest month',
  description: 'The month with the highest share of rainy days, 2016-2025.',
  fn: (weather_by_month) => {
    const w = weather_by_month.reduce((b, r) => Number(r.rain_chance_pct) > Number(b.rain_chance_pct) ? r : b);
    const full = { Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April', May: 'May', Jun: 'June', Jul: 'July', Aug: 'August', Sep: 'September',
      Oct: 'October', Nov: 'November', Dec: 'December' };
    return [{ scope: 'all', wettest_month: full[w.month], wettest_pct: Math.round(Number(w.rain_chance_pct)) }];
  }
});

const parks = [['Disneyland', 'disneyland'], ['California Adventure', 'california_adventure']];
    return parks.map(([park, k]) => {
      const qw = pick(wait_by_week, k, -1), bw = pick(wait_by_week, k, 1);
      const qm = pick(wait_by_month, k, -1);
      const qd = pick(crowd_by_weekday, k, -1), bd = pick(crowd_by_weekday, k, 1);
      const full = { Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday' };
      const fullM = { Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April', May: 'May', Jun: 'June', Jul: 'July', Aug: 'August', Sep: 'September',
        Oct: 'October', Nov: 'November', Dec: 'December' };
      return {
        park,
        quiet_week: qw.week_label, quiet_wait: qw[k],
        busy_week: bw.week_label, busy_wait: bw[k],
        quiet_month: fullM[qm.month], quiet_month_wait: qm[k],
        quiet_day: full[qd.day], quiet_day_crowd: Math.round(Number(qd[k])),
        busy_day: full[bd.day], busy_day_crowd: Math.round(Number(bd[k])),
        quiet_week_high: Math.round(Number(weather_by_week.find(w => Number(w.week) === qw.week).avg_high_f)),
        quiet_week_hot_pct: Math.round(Number(weather_by_week.find(w => Number(w.week) === qw.week).hot_day_pct))
      };
    });
  }
});

const parks = [
  { key: 'disneyland', name: 'Disneyland', c: () => dash.colors[0] },
  { key: 'california_adventure', name: 'California Adventure', c: () => dash.colors[1] }
];
const f1 = d3.format('.1f');
// a length of time people read: 45 min, 2 h, 1 h 24 min (minutes in, rounded to the nearest minute)
const fmtDur = (min) => { const m = Math.round(min), r = m % 60; return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${r ? ` ${r} min` : ''}`; };
const f0 = d3.format('.0f');

// swatches + legends
document.querySelectorAll('.qt-sw').forEach(s => { s.style.background = dash.colors[+s.dataset.sw]; });
document.querySelectorAll('[data-legend]').forEach(el => {
  el.textContent = '';
  parks.forEach(p => {
    const s = document.createElement('span');
    const sw = document.createElement('i'); sw.className = 'qt-sw'; sw.style.background = p.c();
    s.append(sw, document.createTextNode(p.name)); el.append(s);
  });
  if (el.dataset.legend !== 'parks') {
    const s = document.createElement('span');
    const b = document.createElement('i'); b.className = 'band';
    s.append(b, document.createTextNode('Holiday or school break')); el.append(s);
  }
});

const WX = {
  temp: [
    { key: 'avg_high_f', name: 'High', c: () => dash.colors[2] },
    { key: 'feels_like_high_f', name: 'Feels like', c: () => dash.colors[2], dash: true },
    { key: 'avg_low_f', name: 'Low', c: () => dash.colors[3] }
  ],
  rain: [
    { key: 'rain_chance_pct', name: 'Any rain', c: () => dash.colors[4] },
    { key: 'heavy_rain_chance_pct', name: 'Soaking', c: () => dash.colors[4] }
  ],
  risk: [
    { key: 'hot_day_pct', name: '90°F+ high', c: () => dash.colors[2] },
    { key: 'chilly_night_pct', name: 'Low under 45°F', c: () => dash.colors[3] },
    { key: 'windy_day_pct', name: 'Gusts 30 mph+', c: () => dash.colors[5] }
  ]
};
document.querySelectorAll('[data-wx-legend]').forEach(el => {
  el.textContent = '';
  WX[el.dataset.wxLegend].forEach((p, i) => {
    const s = document.createElement('span');
    const sw = document.createElement('i'); sw.className = 'qt-sw'; sw.style.background = p.c();
    if (el.dataset.wxLegend === 'rain' && i === 0) sw.style.opacity = .45;
    if (p.dash) { sw.style.background = 'transparent'; sw.style.border = '2px dashed ' + p.c(); sw.style.boxSizing = 'border-box'; }
    s.append(sw, document.createTextNode(p.name)); el.append(s);
  });
  const s = document.createElement('span');
  const b = document.createElement('i'); b.className = 'band';
  s.append(b, document.createTextNode('Holiday or school break')); el.append(s);
});
