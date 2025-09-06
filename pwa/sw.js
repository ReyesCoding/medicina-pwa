/* sw v1 */
const CACHE = "medicina-static-v7";
const ASSETS = [
  "./", "../index.html", "../styles.css",
  "../app.js", "../graph.js", "../planner.js", "../gpa.js", "../config.js",
  "../data/medicine-2013.json",
  "./manifest.json",
  "../assets/icon-192.png", "../assets/icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Network-first para el dataset (por si lo actualizas)
  if (url.pathname.endsWith("/data/medicine-2013.json")) {
    e.respondWith(
      fetch(e.request).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return resp;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  // Cache-first para estáticos
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request))
  );
});
