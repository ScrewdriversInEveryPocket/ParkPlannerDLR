// DLR Planner: Plan a day, take it with you: the checklist and copy text.
// Part of the app script. The js files load in the order of their script tags in index.html (listed in CLAUDE.md).
// ---------- take it with you ----------
let dpLast = null;
const takeState = { which: 'split', checkOpen: false, copyOpen: false, ticks: new Map() };
document.querySelectorAll('#dp-which button').forEach(b => b.addEventListener('click', () => { takeState.which = b.dataset.v; renderTake(); }));
document.getElementById('dp-check-btn').addEventListener('click', () => { takeState.checkOpen = !takeState.checkOpen; renderTake(); });
document.getElementById('dp-copy-btn').addEventListener('click', async () => {
  takeState.copyOpen = true; renderTake();
  const ta = document.getElementById('dp-copy-text'), msg = document.getElementById('dp-copy-msg');
  try { await navigator.clipboard.writeText(ta.value); msg.textContent = 'Copied. Paste it into Notes, a message or an email.'; }
  catch (e) { ta.focus(); ta.select(); msg.textContent = 'Your browser blocked automatic copying here. The text is selected: copy it with Ctrl+C or ⌘C, or long‑press on a phone.'; }
});
// one-page printable card for the plan currently on screen
document.getElementById('dp-pdf-btn').addEventListener('click', () => exportDayPDF());
function planItems(kind) {
  if (!dpLast) return null;
  const { ctx } = dpLast, P = dpLast.P;
  const morning = (c, t) => { const e = entryInfo(c, t); return [{
        t: e.leave, n: 'Leave the hotel', x: `${fmtDur(e.min)} walk to the ${e.name}, then about ${fmtDur(e.sec)} for security and tap-in on a ${crowdWord(c)}` }, e];
    };
  if (P.hop && kind === 'split' && !P.Hb) kind = 'stay';
  if (!P.hop && kind === 'split' && !P.split) kind = 'stay';
  const hopKind = P.hop ? kind : null;
  if (P.hop) kind = 'hop';
  const items = []; const head = [];
  const dateLbl = new Date(Date.UTC(ctx.Y, ctx.M - 1, ctx.Dd)).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const title = kind === 'hop' ? `Park Hopper · ${dateLbl} · ${hopKind === 'split' ? 'with a midday break' : 'all day'}` :
    `${ctx.park} · ${dateLbl} · ${kind === 'split' ? 'Split day' : 'Stay all day'}`;
  const step = (s) => { const o = step0(s); if (s.rr) o.x = (o.x ? o.x + ' · ' : '') + rrText(s.rr); return o; };
  const step0 = (s) => s.book ? { t: s.t, n: s.meal.replace('📱 ', ''), x: 'Lightning Lane booking' } : s.meal ? {
    t: s.t, n: s.meal, x: `${fmtDur(s.dur)}` + (s.tip ? ' · ' + s.tip : '') + (s.dine && s.dine.length ? ' · Nearby: ' + dineText(s.dine) : '') } : {
    t: s.t, n: s.ride, x: (s.walk >= 3 ? `${fmtDur(s.walk)} walk · ` : '') + (s.ll ?
      `Lightning Lane (around this time, when your window opens) · ~${fmtDur(s.wait)} (standby ~${s.standby})` : `~${fmtDur(s.wait)} wait${s.r.sr ?
        ' · Single Rider line available' : ''}`) + (s.r.minH ? (tooShort(s.r) ?
        ` · Riders must be at least ${s.r.minH} in tall, so not everyone can ride (ask for Rider Switch)` : ` · Riders must be at least ${s.r.minH} in tall`) :
      '') };
  if (kind === 'hop') {
    const H = hopKind === 'split' ? P.Hb : P.H;
    { const [it, e] = morning(H.ctx, H.arrive); items.push(it); }
    items.push({ t: H.arrive, n: `Arrive at ${H.first}`, x: `Park opens ${fmtClock(H.ctx.open)}` });
    H.flat.forEach(s => items.push(step(s)));
    items.push({ t: H.leave, n: 'Leave the park', x: H.left.length ? endLbl(H.win) : 'List done' });
    head.push(hopLL(H));
  } else if (kind === 'stay') {
    const S = P.stay;
    const [it, e] = morning(ctx, S.arrive); items.push(it);
    items.push({ t: S.arrive, n: `Arrive at the ${e.name}`, x: `Park opens ${fmtClock(ctx.open)}` });
    S.plan.steps.forEach(s => items.push(step(s)));
    items.push({ t: S.leave, n: 'Leave the park', x: S.plan.left.length ? endLbl(P.win) : 'List done' });
    head.push(S.llp);
  } else {
    const X = P.split;
    const [it, e] = morning(ctx, X.arrive); items.push(it);
    items.push({ t: X.arrive, n: `Arrive at the ${e.name}`, x: `Park opens ${fmtClock(ctx.open)}` });
    X.morning.steps.forEach(s => items.push(step(s)));
    const eOut = entryInfo(ctx, X.brk), eIn = entryInfo(ctx, X.ret);
    items.push({ t: X.brk, n: 'Leave for your break', x: `Back at the hotel ~${fmtClock(X.brk + eOut.min / 60)}${eOut.g ? ', leaving through the ' + eOut.g.name : ''}` });
    items.push({ t: eIn.leave, n: 'Head back to the park', x: `Through security at the ${eIn.name} by ${fmtClock(X.ret)} (about ${fmtDur(eIn.sec)} in line)` });
    X.evening.steps.forEach(s => items.push(step(s)));
    items.push({ t: X.leave, n: 'Leave the park', x: X.left.length ? endLbl(P.win) : 'List done' });
    head.push(X.llp);
  }
  { const T = tonightText(ctx.iso, tonightCtxs(dpLast)); if (T) items.push({ t: T.t, n: T.text, x: T.note, tonight: true }); }
  return { kind, title, items, llp: head[0], ctx };
}
function planText(pi) {
  const L = [pi.title, `${pi.ctx.hoursSrc === 'live' ? 'Live' : pi.ctx.published ? 'Published' :
      'Typical'} hours ${fmtClock(pi.ctx.open)}–${fmtClock(pi.ctx.close % 24)} · sunset ${fmtClock(pi.ctx.sunset)} ` +
      `· high ${f0(Number(pi.ctx.wxd.avg_high_f))}°F · ${f0(Number(pi.ctx.wxd.rain_chance_pct))}% chance of rain`,
    ''];
  if (pi.llp && pi.llp.multi.length) L.push('Lightning Lane, book in this order: ' + pi.llp.multi.map((r, i) => `${i + 1}. ${r.name}`).join(', '), '');
  pi.items.forEach(it => L.push(`${fmtClock(it.t % 24).padStart(8, ' ')}  ${it.n}${it.x ? ' (' + it.x + ')' : ''}`));
  L.push('', 'Estimates from historical averages. Check the Disneyland app on the day for live waits, hours and showtimes.');
  return L.join('\n');
}
function renderTake() {
  document.querySelectorAll('#dp-which button').forEach(b => { b.setAttribute('aria-pressed', b.dataset.v === takeState.which ? 'true' : 'false');
      if (b.dataset.v === 'split') b.disabled = !(dpLast && (dpLast.P.split || dpLast.P.Hb)); });
  const cb = document.getElementById('dp-check-btn'), cp = document.getElementById('dp-copy-btn');
  cb.setAttribute('aria-expanded', takeState.checkOpen ? 'true' : 'false'); cp.setAttribute('aria-expanded', takeState.copyOpen ? 'true' : 'false');
  const pi = planItems(takeState.which); if (!pi) return;
  { const P = dpLast.P; document.getElementById('dp-pdf-btn').hidden = !(P.hop ? P.H.total : P.stay.done + P.stay.plan.left.length); }
  const box = document.getElementById('dp-check'); box.hidden = !takeState.checkOpen;
  document.getElementById('dp-copy').hidden = !takeState.copyOpen;
  document.getElementById('dp-copy-text').value = planText(pi);
  if (!takeState.checkOpen) return;
  document.getElementById('dp-check-title').textContent = pi.title;
  const key = `${pi.ctx.iso}|${pi.ctx.park}|${pi.kind}`;
  if (!takeState.ticks.has(key)) takeState.ticks.set(key, new Set());
  const done = takeState.ticks.get(key);
  const list = document.getElementById('dp-check-list'); list.textContent = '';
  const firstOpen = pi.items.findIndex((_, i) => !done.has(i));
  pi.items.forEach((it, i) => {
    const li = document.createElement('li'); if (done.has(i)) li.className = 'done'; else if (i === firstOpen) li.className = 'next';
    const lab = document.createElement('label');
    const cbx = document.createElement('input'); cbx.type = 'checkbox'; cbx.checked = done.has(i);
    cbx.addEventListener('change', () => { if (cbx.checked) done.add(i); else done.delete(i); renderTake(); });
    const t = document.createElement('span'); t.className = 't'; t.textContent = fmtClock(it.t % 24);
    const n = document.createElement('span'); n.className = 'n'; n.textContent = it.n;
    if (it.x) { const x = document.createElement('span'); x.className = 'x'; x.textContent = it.x; n.append(x); }
    lab.append(cbx, t, n); li.append(lab); list.append(li);
  });
  document.getElementById('dp-check-prog').textContent = `${done.size} of ${pi.items.length} done`;
}

let lastTrip = null;
