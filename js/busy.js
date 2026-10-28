// DLR Planner: the "thinking" overlay and quick-tap batching. Part of the app script; loads just before app.js so its wrappers are
// in place for the first draw. It changes no planning: it only decides WHEN drawDay, drawTrip and drawWalk run after a tap.
// A tap on a quick plan (a single park, about 50 ms) runs as before. When the plan is slow (a Park Hopper day, or whatever the last
// run of that draw took) the tap's redraws wait for the taps to stop (BUSY_WAIT ms), so several quick taps, e.g. a ride from 1x to
// 3x, plan once; the page then paints a full-screen spinner and only then plans, and the spinner swallows taps until the plan is on screen.
const BUSY_WAIT = 200;   // ms of no taps before a slow plan starts
const BUSY_SLOW = 120;   // ms: a draw that last took this long counts as slow
const BUSY = { inTap: false, running: false, busy: false, pending: new Map(), timer: null, cost: {}, off: /[?&]nobusy\b/.test(location.search) };
const BUSY_FNS = ['drawDay', 'drawTrip', 'drawWalk'];

const busySlow = () => dpState.park === 'Hopper' || tpState.ticket === 'hopper' || BUSY_FNS.some(n => (BUSY.cost[n] || 0) >= BUSY_SLOW);

BUSY_FNS.forEach(name => {
  const orig = window[name];
  const direct = (args) => { const t = performance.now(), r = orig.apply(null, args);
    if (!BUSY.running) BUSY.cost[name] = performance.now() - t; return r; };
  window[name] = function (...args) {
    if (BUSY.off || BUSY.running || !BUSY.inTap || !busySlow()) return direct(args);
    // a tap on a slow plan: remember the call (the newest arguments win, the first call keeps its place in the order) and wait
    BUSY.pending.set(name, { args, wasD: name === 'drawWalk' && args[0] === wz.D });
    clearTimeout(BUSY.timer); BUSY.timer = setTimeout(busyFire, BUSY_WAIT);
  };
  window[name].direct = direct;
});

function busyOverlay() {
  let o = document.getElementById('busy-ov');
  if (!o) {
    o = document.createElement('div'); o.id = 'busy-ov'; o.className = 'busy-ov'; o.setAttribute('role', 'status'); o.hidden = true;
    const s = document.createElement('i'); s.className = 'busy-spin'; s.setAttribute('aria-hidden', 'true');
    const t = document.createElement('span'); t.textContent = 'Working out your plan…';
    o.append(s, t); document.body.append(o);
  }
  return o;
}

// paint first (the frame, then a task after it, with a timer in case the tab is hidden and frames never come), then plan
function busyFire() {
  BUSY.timer = null; BUSY.busy = true;
  const ov = busyOverlay(); ov.hidden = false;
  document.documentElement.classList.add('is-busy');
  let went = false;
  const go = () => { if (went) return; went = true; setTimeout(busyRun, 0); };
  requestAnimationFrame(go); setTimeout(go, 100);
}

function busyRun() {
  const jobs = [...BUSY.pending]; BUSY.pending.clear();
  BUSY.running = true;
  try {
    let walked = false;
    jobs.forEach(([name, j]) => {
      if (name === 'drawWalk' && walked) return;          // drawTrip already redrew the wizard
      const args = j.wasD && wz.D ? [wz.D] : j.args;
      const t = performance.now(); window[name].direct(args); BUSY.cost[name] = performance.now() - t;
      if (name === 'drawTrip') walked = true;
    });
  } finally { BUSY.running = false; }
  // the slow extras (fit advice) run on a timer right after the plan paints: keep the spinner up until they are done
  setTimeout(() => setTimeout(() => {
    dpFlush(); if (wz.laterJob) { const j = wz.laterJob; wz.laterJob = null; j(); }
    BUSY.busy = false; document.documentElement.classList.remove('is-busy'); busyOverlay().hidden = true;
  }, 0), 0);
}

// run f as a tap (for the press-and-hold in cycleTap, which fires from a timer, not an event)
function busyTap(f) { BUSY.inTap = true; try { f(); } finally { setTimeout(() => { BUSY.inTap = false; }, 0); } }

['click', 'change', 'input', 'keydown', 'keyup', 'pointerdown', 'pointerup', 'submit'].forEach(ev => document.addEventListener(ev, (e) => {
  if (BUSY.busy) { e.preventDefault(); e.stopImmediatePropagation(); return; }
  if (ev === 'click' || ev === 'change' || ev === 'input') { BUSY.inTap = true; setTimeout(() => { BUSY.inTap = false; }, 0); }
}, true));
