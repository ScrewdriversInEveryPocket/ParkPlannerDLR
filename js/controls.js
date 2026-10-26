// DLR Planner: shared settings (dpState): repeat rides, ride details, tap-to-cycle and restaurant chips, hotels, start and finish, break.
// Part of the app script. The js files load in the order of their script tags in index.html (listed in CLAUDE.md).
// ---------- day planner ----------
const DAY_IDS = ['ride_profiles', 'park_hours_2025', 'park_hours_published', 'refurbs', 'weather_by_hour', 'weather_by_week', 'sun_by_week', 'wait_by_week',
  'wait_by_month', 'events', 'ride_closures_by_month'];
const dpState = { date: null, park: 'Disneyland', brk: 3, brkAt: 'auto', dine: { lunch: null, dinner: null }, rides: {
    'Disneyland': null, 'California Adventure': null }, reps: { 'Disneyland': new Map(), 'California Adventure': new Map()
  }, b2b: false, ll: true, single: false, hotel: 'gc', custom: 20, pace: 'normal', start: 'auto', walk: 2, height: 0, win: {
    start: 'rope', startAt: '09:00', end: 'close', endAt: '20:00' } };
// Every shared setting with a control, in one list. key: the dpState field (its default is in dpState above);
// ids: its controls, Plan a day's and the Trip wizard's copies kept in step by syncGlobals; type: 'num', 'text' or 'check';
// save: kept in localStorage (js/state.js); input: react while typing; trip: also redraw the trip dates;
// later: the hotel and Lightning Lane choices, which also redraw the "Staying at" line; own: has its own listener below.
const SETTINGS = [
  { key: 'park', ids: [], save: true },
  { key: 'brk', ids: ['dp-break', 'wz-brk'], type: 'num', save: true },
  { key: 'brkAt', ids: ['dp-brkat', 'wz-brkat'], type: 'text', save: true, own: true },
  { key: 'pace', ids: ['dp-pace', 'wz-pace'], type: 'text', save: true },
  { key: 'walk', ids: ['dp-walk', 'wz-walk'], type: 'num', save: true },
  { key: 'start', ids: ['dp-start', 'wz-start'], type: 'text', save: true },
  { key: 'b2b', ids: ['dp-b2b', 'wz-b2b'], type: 'check', save: true },
  { key: 'height', ids: ['dp-height', 'wz-height'], type: 'num', save: true, trip: true },
  { key: 'hotel', ids: ['dp-hotel'], type: 'text', save: true, later: true },
  { key: 'custom', ids: ['dp-custom'], type: 'text', save: true, input: true, later: true },
  { key: 'll', ids: ['dp-ll'], type: 'check', save: true, later: true },
  { key: 'single', ids: ['dp-ls'], type: 'check', save: true, later: true }
];
const readSetting = (e, type) => type === 'check' ? e.checked : type === 'num' ? +e.value : e.value;
// ---------- repeat rides: a picked ride can be done more than once; reps maps ride name -> times (2+) ----------
// (REP_DAY_MAX and REP_TRIP_MAX are in js/settings.js)
const lapsOf = (reps, name) => (reps && reps.get(name)) || 1;
// each extra time becomes its own entry (the planner tells rides apart by object); extras go after the
// park's own list so the first time plans exactly as before
const refurbOn = (iso, park, name) => (dash.data('refurbs').data || []).some(r => r.park === park && r.ride === name && iso >= r.start && (!r.end || iso <= r.end));
// shortest rider's height (0 = no limit): rides with a higher minimum stay pickable but are flagged, since others
// in the group may still ride (Rider Switch lets the adults take turns)
const tooShort = (r) => dpState.height > 0 && r.minH > dpState.height;
// ride details shown under each ride name while picking (Hide/Show is remembered in this browser)
const THRILL_LBL = { gentle: 'gentle', moderate: 'some thrills', thrill: 'big thrills' };
const kidPick = (r) => r.thrill === 'gentle' && !r.minH;
// picker order: headliners, then by typical wait, with character meets last under their own heading
const rideOrder = (a, b) => (a.char - b.char) || (b.head - a.head) || (b.avg - a.avg);
const meetHours = (r) => r.meetFrom != null ? `meets about ${fmtClock(r.meetFrom)} to ${fmtClock(r.meetTo)}` : '';
function rideInfo(chip, r) {
  const sp = document.createElement('span'); sp.className = 'ri';
  sp.textContent = r.char ? ['Character meet', `~${Math.round(r.avg)} min typical wait`, `about ${r.rmin} min with the character`, meetHours(r),
    'times vary, check the Disneyland app'].filter(Boolean).join(' · ') : [`~${Math.round(r.avg)} min typical wait`, `${r.rmin} min ride`, THRILL_LBL[r.thrill],
    r.expo ? r.expo.toLowerCase() : '', r.minH ? `${r.minH} in and up` : 'any height'].filter(Boolean).join(' · ');
  chip.append(sp); return chip;
}
try { if (localStorage.getItem('pdp-ri') === '0') document.documentElement.classList.add('no-ri'); } catch (e) { /* storage unavailable */ }
function riToggle() {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'qt-link';
  const lbl = () => { b.textContent = document.documentElement.classList.contains('no-ri') ? 'Show ride details' : 'Hide ride details'; };
  b.addEventListener('click', () => { const off = document.documentElement.classList.toggle('no-ri'); try { localStorage.setItem('pdp-ri', off ? '0' : '1');
      } catch (e) { /* storage unavailable */ } document.querySelectorAll('.qt-ritoggle').forEach(x => x.dispatchEvent(new Event('relabel'))); });
  b.classList.add('qt-ritoggle'); b.addEventListener('relabel', lbl); lbl(); return b;
}
const shortTip = (r) => `Riders must be at least ${r.minH} in tall, so not everyone in your group can ride. Ask for Rider Switch at the entrance so the adults can take turns.`;
const pickedOf = (ctxs, S = dpState) => [].concat(ctxs).flatMap(c => c.rides.filter(r => S.rides[c.park] && S.rides[c.park].has(r.name)));
const shortNote = (rides) => { const xs = [...new Set(rides.filter(tooShort).map(r => `${r.name} (${r.minH} in)`))];
  return xs.length ?
  `Not everyone can ride: your shortest rider is under the height for ${xs.join(', ')}. Ask the cast member at the ride's entrance for Rider Switch: ` +
  `one adult waits with the child while the others ride, then swaps in without queuing again.` :
  null; };
// rides Disney has closed for refurbishment on that date stay picked but are left out of the plan
const expandPool = (rides, reps) => (rides = rides.filter(r => !r.refurb)).concat(rides.flatMap(r => d3.range(2, lapsOf(reps, r.name) + 1).map(k => Object.assign({}, r, { lap: k }))));
// leftover rides as text, repeats folded together: "Space Mountain ×2 (DL), Soarin' (DCA)"
const leftList = (left, withPark) => [...d3.rollup(left, v => v.length, r => r.park + '|' + r.name)].map(([k, n]) => { const [pk, nm] = k.split('|');
    return nm + (n > 1 ? ' ×' + n : '') + (withPark ? ` (${pk === 'Disneyland' ? 'DL' : 'DCA'})` : ''); }).join(', ');
const ORD = ['', '1st', '2nd', '3rd', '4th', '5th', '6th'];
// rides that didn't fit, grouped: "Space Mountain" or "Space Mountain (1 of 2 times)"
const leftNames = (left, lapsFn) => { const c = d3.rollup(left, v => v.length, r => r.park + '|' + r.name); return [...c].map(([k, n]) => {
      const [pk, nm] = k.split('|'); const tot = lapsFn(pk, nm); return tot > 1 ? `${nm} (${n} of ${tot} times)` : nm; }); };
// tap cycles a ride ×1 → ×2 → … → max → off; press and hold clears it straight to off
function cycleTap(b, onTap, onHold) {
  let t = null, held = false;
  const stop = () => { clearTimeout(t); t = null; };
  b.dataset.cycle = '1';
  b.addEventListener('pointerdown', e => { if (e.button) return; held = false; stop(); t = setTimeout(() => { t = null; held = true;
          if (navigator.vibrate) navigator.vibrate(15); onHold(); }, 500); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, stop));
  b.addEventListener('contextmenu', e => e.preventDefault());
  b.addEventListener('click', e => { if (held) { held = false; e.preventDefault(); return; } onTap(); });
}
const nextLap = (on, n, max) => !on ? 1 : n < max ? n + 1 : 0;
// sit-down and walk-up restaurants as chips: tap to pick one for the meal you're in its park for (see dineAt below), tap again
// for its other meal or to take it off (skipping a meal it doesn't serve), press and hold to clear.
// dine is { lunch, dinner } holding 'park|name'; one place per meal per day.
// Returns dineAt(where): call it once the plan is made, with mealWhere()'s { lunch, dinner }, to show where you'll be at each meal,
// mark the closest places for it, and make taps pick the right meal. Returns nothing when there are no places to pick.
function dineChips(box, parks, dine, onChange) {
  const any = parks.some(p => (DINE_PICKS[p] || []).length); if (!any) return;
  const g = document.createElement('span'); g.className = 'g wzh'; g.textContent = 'Sit-down meals (optional)'; box.append(g);
  const hint = document.createElement('span'); hint.className = 'g qt-dinehint';
    hint.textContent = 'Tap a restaurant to have the meal there when you’re in its park, tap again to switch meals, ' +
      'or press and hold to take it off. Other meals are planned at the nearest quick-service place.';
    box.append(hint);
  const whereLine = document.createElement('span'); whereLine.className = 'g qt-dinehint qt-dinewhere'; whereLine.hidden = true; box.append(whereLine);
  let where = null;
  // the first meal for a new pick: one you're in its park for, the free one if both are; otherwise its first meal, as before
  const firstMeal = (r) => {
    const inPark = r.serves.filter(m => where && where[m] && where[m].park === r.park);
    return inPark.find(m => !dine[m]) || inPark[0] || r.serves[0];
  };
  const chipsOf = {};
  parks.forEach(p => (DINE_PICKS[p] || []).forEach(r => {
    const st = dine.lunch === r.key ? 'lunch' : dine.dinner === r.key ? 'dinner' : null;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'qt-chip dine'; b.dataset.key = r.key; b.setAttribute('aria-pressed', st ? 'true' : 'false');
    b.textContent = r.name + (parks.length > 1 ? ` (${p === 'Disneyland' ? 'DL' : 'DCA'})` : '') + (st ? ` · ${st === 'lunch' ? 'Lunch' : 'Dinner'}` : '');
    const sp = document.createElement('span'); sp.className = 'ri';
    sp.textContent = [r.price, r.book ? `book ${BOOK_DAYS} days ahead` : r.walkup ? 'walk-up list only' : 'no booking for lunch or dinner',
      r.book && r.walkup ? 'walk-up list on the day' : '', r.serves.join(' and '), r.cuisine].filter(Boolean).join(' · ');
    b.append(sp);
    const set = (v) => { ['lunch', 'dinner'].forEach(m => { if (dine[m] === r.key) dine[m] = null; }); if (v) dine[v] = r.key; onChange(); };
    cycleTap(b, () => { if (!st) return set(firstMeal(r)); const order = [null].concat(r.serves), i = order.indexOf(st); set(order[(i + 1) % order.length]); },
      () => set(null));
    chipsOf[r.key] = b; box.append(b);
  }));
  return (w) => {
    where = w && w.lunch && w.dinner ? w : null;
    whereLine.hidden = !where; if (!where) return;
    const L = where.lunch.park, Dn = where.dinner.park;
    whereLine.textContent = L === Dn ? `Lunch and dinner: you’re in ${L}.` : `Lunch: you’re in ${L} · Dinner: you’re in ${Dn}.`;
    // the one or two closest places for each meal, in the park you're in then, from where the plan has you around that time
    ['lunch', 'dinner'].forEach(m => {
      const at = where[m]; if (!at.pos) return;
      (DINE_PICKS[at.park] || []).filter(r => r.serves.includes(m)).map(r => {
        const p = lookupPlace(r.park, r.name, 'food', 'mid');
        return { r, min: p ? Math.max(1, Math.round(distM(at.pos, p) * PATH_WIND / WALK_SPEED * paceWalk())) : Infinity };
      }).filter(x => isFinite(x.min)).sort((a, b) => a.min - b.min).slice(0, 2).forEach(x => {
        const b = chipsOf[x.r.key]; if (!b) return;
        const tag = document.createElement('span'); tag.className = 'dgood'; tag.textContent = ` ✓ Good for ${m}`;
        b.classList.add('good'); b.insertBefore(tag, b.querySelector('.ri'));
        b.title = (b.title ? b.title + ' ' : '') + `Good for ${m}: about ${x.min} min’s walk from where your plan has you at ${m} time.`;
      });
    });
  };
}
// hotel to the park turnstiles: footpath metres from an average room (routed on the OpenStreetMap paths, Oct 2026)
// at the group's pace, plus minutes for elevators and hallways. The Grand Californian has its own entrance into
// California Adventure (gate id 'gc' in data/gates.js). Harbor Blvd hotels are about 15 min at Normal pace; the ART
// bus doesn't change with pace.
// The numbers and names are in data/hotels.js; 'custom' is the group's own minutes.
const HOTELS = Object.fromEntries((dash.data('hotels').data || []).map(r => [r.id, r]));
const HOTEL_WALK = Object.fromEntries(Object.values(HOTELS).filter(r => r.to_dl_m).map(r => [r.id, { m: Object.assign({
      'Disneyland': Number(r.to_dl_m), 'California Adventure': Number(r.to_dca_m) }, r.to_gc_m ? { gc: Number(r.to_gc_m) } : {}), lift: Number(r.lift_min) || 0 }]));
const HOTEL_NAME = Object.assign(Object.fromEntries(Object.values(HOTELS).map(r => [r.id, r.name])), { custom: 'your hotel' });
// gate: the hotel guests' entrance when that's the way in (see hotelGate), else the Esplanade
function travelMin(park, gate, S = dpState) {
  if (S.hotel === 'custom') return Math.max(1, Number(S.custom) || 20);
  const sp = PACE_SPEED[S.pace] || WALK_SPEED, h = HOTEL_WALK[S.hotel];
  if (h) return Math.round((gate && h.m[gate.id] ? h.m[gate.id] : h.m[park === 'California Adventure' ? park : 'Disneyland']) / sp + h.lift);
  const f = HOTELS[S.hotel]; return f && f.fixed_min ? Number(f.fixed_min) : 40;
}
// the hotel list shows times for the chosen pace
function hotelLabels() {
  const sel = document.getElementById('dp-hotel'); if (!sel) return;
  const txt = Object.fromEntries(Object.values(HOTELS).map(r => [r.id, r.label]));
  [...sel.options].forEach(o => {
    if (!txt[o.value]) return;
    const S = Object.assign({}, dpState, { hotel: o.value }), a = travelMin('Disneyland', null, S), b = travelMin('California Adventure', GC_GATE, S);
    o.textContent = `${txt[o.value]} (${a} min${a === b ? ' each way' : `, ${b} to DCA`})`;
  });
}
// ---------- start and finish times: the part of the park's hours the group is there for ----------
const clockH = (v) => { const [h, m] = String(v || '').split(':').map(Number); return isFinite(h) ? h + (m || 0) / 60 : null; };
function dayWin(open, close, w = dpState.win || {}) {
  const s = w.start === '10' ? 10 : w.start === '13' ? 13 : w.start === 'set' ? clockH(w.startAt) : null;
  let e = w.end === 'set' ? clockH(w.endAt) : null; if (e != null && e < 5) e += 24; // leaving after midnight
  const t0 = s == null ? open : Math.min(Math.max(open, s), close - 1);
  const t1 = e == null ? close : Math.max(Math.min(close, e), Math.min(close, t0 + 1));
  // starting after lunch or leaving by 4 pm leaves no room for a midday hotel break
  const why = s != null && s >= 12 ? 'start' : e != null && e <= 16 ? 'end' : null;
  return { t0, t1, rope: t0 <= open + 1e-9, early: t1 < close - 1e-9, why, s, e };
}
const winWhy = (W) => !W || !W.why ? null : W.why === 'start' ? `Starting after lunch (${fmtClock(W.s)}), so no midday break today.` : `Leaving by ${fmtClock(W.e % 24)}, so no midday break today.`;
// the break length a day really gets: none when its start or finish rules a break out
const brkOf = (d) => d.brk > 0 && !dayWin(0, 24, d.win || dpState.win).why ? d.brk : 0;
const endLbl = (W) => W && W.early ? 'Your finish time' : 'At close';
// short text for a day's start and finish, '' for rope drop to close
function winLabel(w) {
  if (!w) return '';
  const a = w.start === '10' ? 'from 10 am' : w.start === '13' ? 'from 1 pm' : w.start === 'set' ? `from ${fmtClock(clockH(w.startAt))}` : '';
  const b = w.end === 'set' ? `leave by ${fmtClock(clockH(w.endAt) % 24)}` : '';
  return [a, b].filter(Boolean).join(', ');
}
// one line on Plan a day saying which hotel and Lightning Lane choices are in use, with a button to the Trip wizard's first page where they're set
function staySum() {
  const a = travelMin('Disneyland'), b = travelMin('California Adventure', GC_GATE);
  const hn = (HOTELS[dpState.hotel] || {}).summary || 'your hotel';
  const txt = `Staying at ${hn} (${a} min${a === b ? ' each way' : `, ${b} to California Adventure`}) · Lightning Lane Multi Pass: ${dpState.ll ? 'yes' :
    'no'}${dpState.single ? ' · Single Pass: yes' : ''}. `;
  ['dp-staysum'].forEach(id => { const el = document.getElementById(id); if (!el) return; el.textContent = txt; const bt = document.createElement('button');
      bt.type = 'button'; bt.className = 'qt-link'; bt.textContent = 'Change in the Trip wizard'; bt.addEventListener('click', () => {
          document.getElementById('tab-wizard').click(); wzGo(0); setTimeout(() => document.getElementById('trip-card').scrollIntoView({ block: 'start' }), 50);
        }); el.append(bt); });
}
// changing a setting in either tab: store it, show it in both tabs, redraw both
SETTINGS.filter(s => !s.own).forEach(s => s.ids.forEach(id => document.getElementById(id).addEventListener(s.input ? 'input' : 'change', (e) => {
  dpState[s.key] = readSetting(e.target, s.type); syncGlobals(); drawDay(); if (s.trip) drawTrip();
  if (s.later) setTimeout(() => { staySum(); if (wz.D) drawWalk(wz.D); }, 0); else if (wz.D) drawWalk(wz.D);
})));
const pad2 = (n) => String(n).padStart(2, '0');
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
dpState.date = todayISO();
const dpDate = document.getElementById('dp-date'); dpDate.value = dpState.date;
dpDate.addEventListener('change', () => { if (dpDate.value) { dpState.date = dpDate.value; drawDay(); } });
document.querySelectorAll('#dp-park button').forEach(b => b.addEventListener('click', () => { dpState.park = b.dataset.v;
      document.querySelectorAll('#dp-park button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); drawDay(); }));
// start and finish: the Trip settings and Plan a day controls share one setting, like the break
function setWin(w) {
  const old = JSON.stringify(dpState.win);
  dpState.win = w;
  // wizard days still on the old trip default follow the new one
  if (wz.days) Object.values(wz.days).forEach(d => { if (!d.win || JSON.stringify(d.win) === old) d.win = Object.assign({}, w); });
  syncGlobals(); drawDay(); if (wz.D) drawWalk(wz.D);
}
['wz-brkat', 'dp-brkat'].forEach(id => document.getElementById(id).addEventListener('change', (e) => {
  const old = dpState.brkAt; dpState.brkAt = e.target.value;
  if (wz.days) Object.values(wz.days).forEach(d => { if (d.brkAt == null || d.brkAt === old) d.brkAt = dpState.brkAt; });
  syncGlobals(); drawDay(); if (wz.D) drawWalk(wz.D);
}));
['wz', 'dp'].forEach(pre => {
  const g = (k) => document.getElementById(`${pre}-${k}`);
  const read = () => ({ start: g('wstart').value, startAt: g('wstart-at').value || '09:00', end: g('wend').value, endAt: g('wend-at').value || '20:00' });
  ['wstart', 'wstart-at', 'wend', 'wend-at'].forEach(k => g(k).addEventListener('change', () => setWin(read())));
});

function openDayForWeek(week) {
  const now = new Date(); const y0 = now.getFullYear();
  let best = null;
  for (const y of [y0, y0 + 1]) {
    const start = new Date(Date.UTC(y, 0, 1 + (week - 1) * 7));
    const end = new Date(start); end.setUTCDate(start.getUTCDate() + (week === 52 ? 7 : 6));
    const today = new Date(Date.UTC(y0, now.getMonth(), now.getDate()));
    if (end < today) continue;
    best = start < today ? today : start; break;
  }
  if (!best) return;
  // open the wizard's Dates step with the trips around this week
  wz.week = week; tpState.auto = true; tpState.manual = null; wz.step = 1;
  if (window.qtShowTab) window.qtShowTab('wizard');
  wzShowSetup(); drawTrip(); const el = document.getElementById('trips'); if (el) el.scrollIntoView(); }
const DOW_KEYS = ['d_sun', 'd_mon', 'd_tue', 'd_wed', 'd_thu', 'd_fri', 'd_sat'];
