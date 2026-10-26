// DLR Planner: fit checks: which rides would still fit, and the one-line summary under a plan.
// Part of the app script. The js files load in the order of their script tags in index.html (listed in CLAUDE.md).
// live "is the day full?" line at the end of a ride chip group, redrawn on every tap.
// Chips carry data-fit="park|ride"; rides the plan couldn't fit get struck through.
let lastTap = null;
// Which unpicked rides would really fit: re-run the plan with each one added on its own (skipping closed
// rides). The planner reshuffles the whole day, so spare time alone can't say this. trial(list) re-plans
// with those rides added and says whether everything still fits.
// the pool with extra rides added, in the park's own ride order (the planner breaks ties by list order,
// so a trial has to match what a real tap would plan)
const withRides = (ctx, pool, qs) => { const add = new Set(qs.map(q => q.r)); return ctx.rides.filter(r => add.has(r) || pool.includes(r)).concat(pool.filter(r => r.lap)); };
function roomFor(ctxs, isFree, trial) {
  const free = [].concat(ctxs).flatMap(c => c.rides.filter(r => !c.closedSet.has(r.name) && isFree(c.park, r)).map(r => ({ park: c.park, r })));
  const ok = free.filter(q => trial([q])).sort((a, b) => (b.r.head - a.r.head) || (b.r.avg - a.r.avg));
  return { fit: ok.length, total: free.length, names: ok.map(q => q.r.name), keys: new Set(ok.map(q => q.park + '|' + q.r.name)), no: free.filter(q => !ok.includes(q)).map(q => q.r.name) };
}
// more: { fit, total } from roomFor, or null when not checked (then estimate from spare time)
// adv: fullAdvice() for a day that's over, or null
// glance: { text, target, warn } a one-line summary of the plan, the element "See the plan" scrolls to, and flexWarn() for the plan
const glanceText = (leave, done, total, wait, steps, heat) => { const free = d3.sum(steps.filter(x => x.gap), x => x.dur);
  return [`Leave about ${fmtClock(leave % 24)}`, `${done} of ${total} rides`, `about ${wait >= 90 ? f1(wait / 60) + ' h' : Math.round(wait) + ' min'} in lines`,
    heat ? `${heat} h in 85°F+ heat` : '', free ? `${free} min free before a break or hop` : ''].filter(Boolean).join(' · '); };
function fitStatus(box, left, slack, freeCosts, hint, more, adv, glance) {
  const out = new Set(left.map(r => r.park + '|' + r.name));
  const nLeft = d3.rollup(left, v => v.length, r => r.park + '|' + r.name);
  const lapsFn = (pk, nm) => { const b = box.querySelector(`.qt-chip[data-fit="${CSS.escape(pk + '|' + nm)}"]`); return b ? Number(b.dataset.laps || 1) : 1; };
  box.querySelectorAll('.qt-chip[data-fit]').forEach(b => {
    const k = nLeft.get(b.dataset.fit) || 0, tot = Number(b.dataset.laps || 1);
    b.classList.toggle('nofit', k > 0 && k >= tot); b.classList.toggle('partfit', k > 0 && k < tot);
    if (k) b.title = k >= tot ? 'Not enough time for this one on this day' : `Only ${tot - k} of your ${tot} times fit on this day`;
  });
  // unpicked rides that would still fit get a tick (only when some don't, or every chip would have one)
  const tick = !left.length && more && more.fit && more.fit < more.total ? more.keys : null;
  box.querySelectorAll('.qt-chip').forEach(b => { const k = b.getAttribute('aria-pressed') === 'true' ? null : b.dataset.add || b.dataset.fit;
      b.classList.toggle('fits', !!(tick && k && tick.has(k))); if (tick && k && tick.has(k)) b.title = 'Would still fit on this day'; });
  const tap = lastTap; lastTap = null;
  // drawn again (e.g. once the advice fills in): replace the box, don't add a second one
  box.querySelectorAll(':scope > .qt-fit').forEach(b => b.remove());
  if (!box.querySelector('.qt-chip[data-fit][aria-pressed="true"]')) return;
  const bar = document.createElement('div'); bar.className = 'qt-fit'; bar.setAttribute('role', 'status');
  if (glance && glance.text) {
    const g = document.createElement('span'); g.className = 'qt-glance'; g.append(glance.text + '.');
    if (glance.target) { const a = document.createElement('button'); a.type = 'button'; a.className = 'qt-link'; a.textContent = 'See the plan ↓';
      a.addEventListener('click', () => glance.target.scrollIntoView({ behavior: 'smooth', block: 'start' })); g.append(a); }
    bar.append(g);
  }
  // a shorter break or a later finish than the group set (flexWarn): say so first
  if (glance && glance.warn) { const w = document.createElement('span'); w.className = 'qt-flexwarn'; w.textContent = '⚠️ ' + glance.warn; bar.append(w); }
  const lead = document.createElement('b');
  if (left.length) {
    bar.classList.add('full');
    const added = tap && tap.added ? tap.key.split('|')[1] : null;
    lead.textContent = added && out.has(tap.key) ? `No time left for ${added}. ` : added ? `Adding ${added} filled the day. ` : 'Your day is full. ';
    const many = left.length > 1;
    bar.append(lead, `${left.length} ride${many ? 's' : ''} you picked won't fit (${leftNames(left, lapsFn).join(', ')}). `);
    if (adv && adv.length) {
      const ul = document.createElement('ul'); ul.className = 'qt-fitadv';
      adv.forEach(o => { const li = document.createElement('li'); li.textContent = advLine(o); ul.append(li); });
      bar.append('Taking one of these off makes the most room:', ul);
    }
    bar.append(hint);
  } else {
    const k = more ? more.fit : freeCosts.length ? Math.max(0, Math.floor(slack * 60 / d3.mean(freeCosts))) : 0;
    if (k < 1) { bar.classList.add('tight'); lead.textContent = 'Your day is full. '; bar.append(lead, 'Everything you picked fits, but there is no time for more rides.'); }
    else if (more) {
      lead.textContent = 'Room for more. ';
      const shown = more.names.slice(0, 6), rest = more.names.length - shown.length;
      bar.append(lead, `Everything you picked fits${slack >= 0.25 ? `, with about ${f1(slack)} h to spare` : ''}. ${k === more.total ?
          `Any of the ${k} rides you haven't picked would still fit if you add one.` : k > more.total / 2 ?
          `Any ride you haven't picked would still fit if you add one, except ${more.no.join(', ')}. The ones that fit are ticked ✓ in the list.` : `${k === 1 ?
            'This ride' : 'These rides'} would still fit if you add ${k === 1 ? 'it' : 'one'}: ${shown.join(', ')}${rest ? `, and ${rest} more` :
            ''}. ${k === 1 ? "It's" : "They're"} ticked ✓ in the list.`}`);
    }
    else { lead.textContent = `Room for about ${k} more ride${k === 1 ? '' : 's'}. `; bar.append(lead, `Everything you picked fits, with about ${f1(slack)} h to spare before close.`); }
  }
  box.append(bar);
}
