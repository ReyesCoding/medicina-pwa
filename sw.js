// sw.js (raíz) — versión “network-first” para HTML
const CACHE = "medicina-static-v35";

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./config.js",
  "./planner.js",
  "./gpa.js",
  "./schedule.js",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./pwa/manifest.json" // <- tu manifest está en /pwa
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()) // << toma control inmediato
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(keys.map((k) => (k === CACHE ? null : caches.delete(k))))
      ),
      self.clients.claim() // << controla todas las pestañas abiertas
    ])
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const accept = req.headers.get("accept") || "";
  const isHTML = req.mode === "navigate" || accept.includes("text/html");

  if (isHTML) {
    // HTML siempre “network-first” para no servir index.html obsoleto
    event.respondWith(
      fetch(req).catch(() => caches.match("./index.html"))
    );
    return;
  }

  if (req.method !== "GET") {
    event.respondWith(fetch(req));
    return;
  }

  // Cache-first para estáticos
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((resp) => {
        try {
          const url = new URL(req.url);
          if (resp && resp.status === 200 && resp.type === "basic" && url.origin === self.location.origin) {
            const clone = resp.clone();
            caches.open(CACHE).then((cache) => cache.put(req, clone));
          }
        } catch {}
        return resp;
      }).catch(() => cached);
    })
  );
});
