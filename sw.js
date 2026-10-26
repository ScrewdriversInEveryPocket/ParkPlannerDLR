// DLR Planner offline cache. Bump VERSION when files change; the app shows it at the top (e.g. v34).
// The dataset list comes from data/manifest.js, so a new data file is cached without editing this one.
importScripts('./data/manifest.js');
const VERSION = 'pdp-v39';
const FILES = ['./', './index.html', './shim.js', './vendor/d3.min.js', './vendor/jspdf.umd.min.js', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './data/manifest.js']
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
