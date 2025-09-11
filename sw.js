// pwa/sw.js
const CACHE = "medicina-static-v21";

// ✅ Archivos estáticos a precache (no incluir sections.json)
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./config.js",
  "./planner.js",
  "./gpa.js",
  "./schedule.js",
  "./graph.js",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./pwa/manifest.json"
];

// Install: precache
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate: limpia caches antiguos
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// Fetch: branch especial network-first para JSONs dinámicos
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Ignora esquemas no http/https (chrome-extension, data:, etc.)
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // ✅ Network-first para pensum y secciones
  if (url.pathname.endsWith("/data/medicine-2013.json") ||
      url.pathname.endsWith("/data/medicine-2013-sections.json")) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  // Resto: cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (e.request.method === "GET" && resp && resp.status === 200 && resp.type === "basic" &&
            (url.origin === self.location.origin)) {
          const clone = resp.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return resp;
      }).catch(() => cached);
    })
  );
});
