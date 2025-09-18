// pwa/sw.js
const CACHE = "medicina-static-v30";

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
  "./pwa/manifest.json"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE ? null : caches.delete(k))))
    )
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((resp) => {
          try {
            const url = new URL(req.url);
            if (
              req.method === "GET" &&
              resp &&
              resp.status === 200 &&
              resp.type === "basic" &&
              url.origin === self.location.origin
            ) {
              const clone = resp.clone();
              caches.open(CACHE).then((cache) => cache.put(req, clone));
            }
          } catch {}
          return resp;
        })
        .catch(() => cached);
    })
  );
});
