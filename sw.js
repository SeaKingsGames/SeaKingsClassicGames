/* =====================================================
   SeaKingsGames · Service Worker
   Cachea toda la app para uso offline
   ===================================================== */

const VERSION = 'sk-v4';
const STATIC_CACHE  = `seakings-static-${VERSION}`;
const RUNTIME_CACHE = `seakings-runtime-${VERSION}`;

// Archivos del shell de la app (se cachean al instalar)
const APP_SHELL = [
  './',
  './index.html',
  './tuercas-locas.html',
  './verdugo.html',
  './memoria.html',
  './snake.html',
  './numpuz.html',
  './tower.html',
  './smash-brick.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

/* ---------- INSTALL ---------- */
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(STATIC_CACHE).then(cache =>
      // addAll falla si UNO solo falla — usamos add individual para tolerar archivos ausentes
      Promise.all(APP_SHELL.map(url =>
        cache.add(url).catch(err => console.warn('SW skip', url, err))
      ))
    )
  );
});

/* ---------- ACTIVATE ---------- */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k.startsWith('seakings-') && k !== STATIC_CACHE && k !== RUNTIME_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ---------- FETCH ---------- */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 1. NUNCA cachear publicidad ni tracking
  if (url.host.includes('highperformanceformat') ||
      url.host.includes('adsterra') ||
      url.host.includes('googletagmanager') ||
      url.host.includes('google-analytics')) {
    return; // pasar directo a la red
  }

  // 2. NAVEGACIÓN (HTML del mismo origen): network-first con fallback a cache
  // Permite ver cambios nuevos cuando hay conexión, pero funciona offline
  if (req.mode === 'navigate' && url.origin === location.origin) {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  // 3. ASSETS DEL MISMO ORIGEN: cache-first, actualiza en background
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then(hit => {
        const networkFetch = fetch(req).then(res => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then(c => c.put(req, copy));
          }
          return res;
        }).catch(() => hit);
        return hit || networkFetch;
      })
    );
    return;
  }

  // 4. GOOGLE FONTS: cache-first (cambian muy rara vez)
  if (url.host.includes('fonts.googleapis.com') || url.host.includes('fonts.gstatic.com')) {
    e.respondWith(
      caches.open(RUNTIME_CACHE).then(cache =>
        cache.match(req).then(hit =>
          hit || fetch(req).then(res => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
        )
      )
    );
    return;
  }

  // 5. RESTO: network-first con fallback a cache
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});

/* ---------- MENSAJES (para forzar actualización desde la app) ---------- */
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
