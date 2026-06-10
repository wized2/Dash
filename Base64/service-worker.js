// service-worker.js – Double cache for all static assets
const CACHE_V1 = 'static-v1';
const CACHE_V2 = 'static-v2';

// All essential static files (adjust paths to match your /Base64/ structure)
const STATIC_FILES = [
  '/Base64/',
  '/Base64/index.html',
  '/Base64/manifest.json',
  '/Base64/favicon.svg',
  '/Base64/favicon.ico',
  '/Base64/icons/icon-192x192.png',
  '/Base64/icons/icon-384x384.png',
  '/Base64/icons/icon-512x512.png',
  '/Base64/icons/icon-192x192-maskable.png',
  '/Base64/icons/icon-512x512-maskable.png'
];

// Install: cache all files into BOTH caches
self.addEventListener('install', event => {
  console.log('[SW] Installing double cache');
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_V1).then(cache => cache.addAll(STATIC_FILES)),
      caches.open(CACHE_V2).then(cache => cache.addAll(STATIC_FILES))
    ]).then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches (keep only our two)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_V1 && key !== CACHE_V2) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: try v1, then v2, then network – and always update both caches
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle GET requests for static assets (same origin)
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.open(CACHE_V1).then(cacheV1 => {
      return caches.open(CACHE_V2).then(cacheV2 => {
        // Try cache V1 first
        return cacheV1.match(request).then(responseV1 => {
          if (responseV1) return responseV1;
          // Try cache V2
          return cacheV2.match(request).then(responseV2 => {
            if (responseV2) return responseV2;
            // Neither cache has it – fetch from network and store in BOTH
            return fetch(request).then(networkResponse => {
              if (!networkResponse || networkResponse.status !== 200) {
                return networkResponse;
              }
              const cloned = networkResponse.clone();
              // Store in both caches
              cacheV1.put(request, cloned);
              cacheV2.put(request, networkResponse.clone());
              return networkResponse;
            }).catch(() => {
              // Offline fallback: return index.html for navigation requests
              if (request.mode === 'navigate') {
                return cacheV1.match('/Base64/index.html') || cacheV2.match('/Base64/index.html');
              }
              return new Response('Offline – file not cached', { status: 404 });
            });
          });
        });
      });
    })
  );
});
