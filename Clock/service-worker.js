// Endroid Clock Service Worker
const CACHE_NAME = "endroid-clock-v1";
const BASE_URL = "https://endroid.pages.dev/Clock/"; // adjust if your clock is elsewhere

const urlsToCache = [
  BASE_URL,
  BASE_URL + "index.html",
  BASE_URL + "manifest.json",
  BASE_URL + "icon.svg",
  // Google Fonts (Material Symbols Rounded & Inter)
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0,200&display=block",
  "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"
];

// Install event – cache all essential files
self.addEventListener("install", (event) => {
  console.log("[SW] Install");
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return Promise.allSettled(
          urlsToCache.map(url => 
            cache.add(url).catch(err => console.warn(`[SW] Failed to cache ${url}:`, err))
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Helper: check if request belongs to our clock app
function isClockRequest(url) {
  return url.href.startsWith(BASE_URL);
}

// Fetch event – network first for app files (with cache fallback), stale‑while‑revalidate for external fonts
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  // For our own app files (under BASE_URL)
  if (isClockRequest(url)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Stale-while-revalidate: update cache in background
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then(cache => cache.put(request, networkResponse));
            }
          }).catch(() => {});
          return cachedResponse;
        }
        // Not in cache – fetch and cache
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, responseToCache));
          }
          return networkResponse;
        }).catch(() => caches.match(BASE_URL + "index.html")); // fallback to offline page
      })
    );
  } 
  // For external resources (fonts) – cache with stale-while-revalidate
  else if (url.origin !== self.location.origin) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(request, responseToCache));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);
        return cachedResponse || fetchPromise;
      })
    );
  }
  // Any other same‑origin requests (not our app) – network only
  else {
    event.respondWith(fetch(request));
  }
});

// Activate event – clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activate");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log(`[SW] Deleting old cache: ${key}`);
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});
