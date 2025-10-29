// client/public/sw.js
// 🧠 Cambia el número si necesitas forzar otra actualización
const CACHE_VERSION = 'v2025-10-26-2';
const CACHE_NAME = `medicina-pwa-${CACHE_VERSION}`;

// Qué precachear siempre (shell de la app)
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './favicon.ico',
];

// Datasets (los traemos network-first para poder actualizarlos)
const DATA = [
  './data/courses.json',
  './data/sections.json',
];

self.addEventListener('install', (event) => {
  // Instala y toma control sin esperar
  self.skipWaiting();
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(ASSETS);
      // Nota: no precacheamos DATA aquí para que el primer fetch ya se intente a red
    } catch (_) {
      // evitar romper la instalación si algo falla en addAll
    }
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Borra todos los caches antiguos que no coinciden con la versión actual
    const keys = await caches.keys();
    await Promise.all(
      keys.map((k) => (k.startsWith('medicina-pwa-') && k !== CACHE_NAME) ? caches.delete(k) : undefined)
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo manejar GET del mismo origen
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  const isData = url.pathname.includes('/data/');

  // DATA -> network-first (cae a cache si offline)
  if (isData) {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res && res.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, res.clone());
        }
        return res;
      } catch {
        const cached = await caches.match(req);
        return cached || new Response('{"error":"offline"}', { status: 503, headers: { 'Content-Type': 'application/json' } });
      }
    })());
    return;
  }

  // Resto -> cache-first (cae a red y cachea)
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res && res.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, res.clone());
      }
      return res;
    } catch {
      // Fallback ultra simple si no hay cache
      return new Response('Offline', { status: 503 });
    }
  })());
});
