const CACHE_NAME = 'translator-v1';
const ASSETS = [
  './favicon.ico',
  './favicon.svg'
];

// We don't cache index.html in the pre-cache list because it's dynamic (via _worker.js)
// We will cache it dynamically using a Network-First strategy.

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip API calls
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Network-First for navigation (index.html) to support dynamic OG tags
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If we got a valid response, cache it
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => {
          // Offline fallback
          return caches.match(event.request) || caches.match('./index.html');
        })
    );
    return;
  }

  // Cache-First for static assets
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      
      return fetch(event.request).then((networkResponse) => {
        // Basic check for valid response
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(err => {
        // Fallback for redirected responses causing the error
        if (err.name === 'TypeError' && event.request.redirect !== 'follow') {
            return fetch(event.request, { redirect: 'follow' });
        }
        throw err;
      });
    })
  );
});
