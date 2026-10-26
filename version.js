// The app's version, its only home: the date, then which version of that day ("2026/10/26 - v1", "2026/10/26 - v2",
// back to v1 on a new day). Raise it whenever any file changes: the offline cache (sw.js) uses it to download the new
// files, and the page shows it at the top. Versions up to v54 used a plain number (pdp-v54).
self.PDP_VERSION = '2026/10/26 - v1';
