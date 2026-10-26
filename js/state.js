// DLR Planner: restoring and saving your settings (localStorage).
// Part of the app script. The js files load in the order of their script tags in index.html (listed in CLAUDE.md).
// ---------- app: restore saved settings ----------
(function restore() {
  const S = PDP_SAVED;
  try {
    if (S.pl) { if (S.pl.park) plState.park = S.pl.park; plState.school = S.pl.school || (S.pl.skip ? 'avoid' : 'any'); }
    if (S.dp) {
      const d = S.dp;
      SETTINGS.filter(s => s.save).forEach(s => { if (d[s.key] != null) dpState[s.key] = d[s.key]; });
      if (d.win && typeof d.win === 'object') dpState.win = Object.assign({}, dpState.win, d.win);
      if (d.dine && typeof d.dine === 'object') dpState.dine = { lunch: d.dine.lunch || null, dinner: d.dine.dinner || null };
      if (d.reps) Object.keys(d.reps).forEach(p => { if (dpState.reps[p]) dpState.reps[p] = new Map(Object.entries(d.reps[p])); });
      if (d.date && d.date >= todayISO()) dpState.date = d.date;
      if (d.rides) Object.keys(d.rides).forEach(p => { if (Array.isArray(d.rides[p])) dpState.rides[p] = new Set(d.rides[p]); });
    }
    if (S.tp) {
      ['days', 'ticket', 'each'].forEach(k => { if (S.tp[k] != null) tpState[k] = S.tp[k]; });
      if (S.tp.v === 2) {
        ['rest', 'inT', 'outT', 'auto'].forEach(k => { if (S.tp[k] != null) tpState[k] = S.tp[k]; });
        if (S.tp.start && S.tp.start > todayISO()) { tpState.start = S.tp.start; tpState.manual = S.tp.manual || null; } else tpState.auto = true;
      }
      tpState.days = Math.max(1, Math.min(10, tpState.days)); tpState.rest = Math.max(0, Math.min(5, tpState.rest));
    }
    if (S.wz) {
      const W = S.wz; wz.key = W.key || ''; wz.step = 0;
      if (W.sel) wz.sel = Object.fromEntries(WZ_PARKS.map(p => [p, new Set(W.sel[p] || [])]));
      wz.reps = Object.fromEntries(WZ_PARKS.map(p => [p, new Map(Object.entries((W.reps && W.reps[p]) || {}))]));
      if (W.days) wz.days = Object.fromEntries(Object.entries(W.days).map(([iso, d]) => [iso, {
              brk: d.brk, brkAt: d.brkAt, walk: d.walk, start: d.start, win: d.win && typeof d.win === 'object' ? Object.assign({}, dpState.win,
                d.win) : Object.assign({}, dpState.win), rides: Object.fromEntries(WZ_PARKS.map(p => [p, new Set((d.rides && d.rides[p]) || [])])),
              reps: Object.fromEntries(WZ_PARKS.map(p => [p, new Map(Object.entries((d.reps && d.reps[p]) || {}))])),
              dine: d.dine && typeof d.dine === 'object' ? { lunch: d.dine.lunch || null, dinner: d.dine.dinner || null } : { lunch: null, dinner: null } }]));
    }
    if (S.take) { if (S.take.which) takeState.which = S.take.which; if (S.take.ticks) Object.entries(S.take.ticks).forEach(([k, v]) => takeState.ticks.set(k, new Set(v))); }
  } catch (e) { console.warn('Could not restore settings', e); }
  // reflect in the controls
  const press = (sel, v) => document.querySelectorAll(sel + ' button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === String(v) ? 'true' : 'false'));
  press('#pl-park', plState.park); document.getElementById('pl-school').value = plState.school || 'any';
  dpDate.value = dpState.date; press('#dp-park', dpState.park);
  tpStart.value = tpState.start || ''; tpDays.value = String(tpState.days); tpRest.value = String(tpState.rest);
  document.getElementById('tp-in').value = tpState.inT; document.getElementById('tp-out').value = tpState.outT;
  syncGlobals(); // the SETTINGS controls in both tabs
  press('#tp-ticket', tpState.ticket); document.getElementById('tp-each').checked = !!tpState.each;
  staySum();
})();
// the saved data's format: 2 adds this number (older saves have none and still load) and drops wizard days' unused pace
const SAVE_VERSION = 2;
const repsOut = (R) => R ? Object.fromEntries(Object.entries(R).map(([p, m]) => [p, Object.fromEntries(m)])) : null;
function saveState() {
  try {
    const rides = {}; Object.keys(dpState.rides).forEach(p => { if (dpState.rides[p]) rides[p] = [...dpState.rides[p]]; });
    const ticks = {}; takeState.ticks.forEach((v, k) => { ticks[k] = [...v]; });
    localStorage.setItem('pdp-state', JSON.stringify({
      v: SAVE_VERSION, w: plState.w, pl: { park: plState.park, school: plState.school },
      dp: Object.assign(Object.fromEntries(SETTINGS.filter(s => s.save).map(s => [s.key, dpState[s.key]])),
        { date: dpState.date, win: dpState.win, dine: dpState.dine, rides, reps: repsOut(dpState.reps) }),
      tp: { v: 2, start: tpState.start, auto: tpState.auto, days: tpState.days, rest: tpState.rest, ticket: tpState.ticket, each: tpState.each,
        manual: tpState.manual, inT: tpState.inT, outT: tpState.outT },
      take: { which: takeState.which, ticks },
      wz: { key: wz.key, step: wz.step, reps: repsOut(wz.reps), sel: wz.sel ? Object.fromEntries(WZ_PARKS.map(p => [p, [...wz.sel[p]]])) : null,
        days: wz.days ? Object.fromEntries(Object.entries(wz.days).map(([iso, d]) => [iso, {
                brk: d.brk, brkAt: d.brkAt, walk: d.walk, start: d.start, win: d.win, dine: d.dine,
                rides: Object.fromEntries(WZ_PARKS.map(p => [p, [...d.rides[p]]])), reps: repsOut(d.reps) }])) : null }
    }));
  } catch (e) { /* storage unavailable */ }
}
setInterval(saveState, 3000);
window.addEventListener('pagehide', saveState);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveState(); });
