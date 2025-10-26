const CACHE_NAME = 'medicina-pwa-v1';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  // Íconos de la PWA (ajusta si cambian los nombres)
  './icon-192.png',
  './icon-512.png',
  // Favicon (si lo tienes)
  './favicon.ico',
];

const DATA = [
  './data/courses.json',
  './data/sections.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([...ASSETS, ...DATA])).catch(() => Promise.resolve())
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k.startsWith('medicina-pwa-') && k !== CACHE_NAME) ? caches.delete(k) : null))
    )
  );
  self.clients.claim();
});

// Estrategia:
// - JSON bajo /data → network-first (para poder actualizar datasets).
// - Resto (HTML/ico/png/manifest) → cache-first.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo mismas origen y GET
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  const isData = url.pathname.includes('/data/');

  if (isData) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
  } else {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      }))
    );
  }
});
