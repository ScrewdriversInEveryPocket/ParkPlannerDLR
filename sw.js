// DLR Planner offline cache. The version lives in version.js: raise it there when files change.
// The dataset list comes from data/manifest.js, so a new data file is cached without editing this one.
importScripts('./version.js', './data/manifest.js');
const VERSION = self.PDP_VERSION;
const FILES = ['./', './index.html', './shim.js', './vendor/d3.min.js', './vendor/jspdf.umd.min.js', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './data/manifest.js', './version.js', './css/app.css']
  .concat(['./js/settings.js', './js/core.js', './js/charts.js', './js/explore.js', './js/controls.js', './js/day.js', './js/walks.js', './js/scheduler.js', './js/meals.js', './js/restrooms.js', './js/hopper.js', './js/fit.js', './js/plan-day.js', './js/take.js', './js/trip.js', './js/wizard.js', './js/time-of-day.js', './js/walk-explorer.js', './js/state.js', './js/pdf.js', './js/app.js'])
  .concat(self.PDP_FILES.map((f) => './data/' + f + '.js'));
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin) return; // forecasts always go to the network
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
});
// the page asks which version served it, to show at the top
self.addEventListener('message', (e) => { if (e.data === 'version' && e.ports[0]) e.ports[0].postMessage(VERSION); });
