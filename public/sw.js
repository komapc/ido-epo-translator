const CACHE_NAME = 'translator-v1';
const ASSETS = [
  './favicon.ico',
  './favicon.svg'
];

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
  
  // 1. Only handle http/https requests (fixes chrome-extension error)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // 2. Skip API calls and Analytics
  if (url.pathname.startsWith('/api/') || 
      url.hostname.includes('google-analytics') || 
      url.hostname.includes('googletagmanager')) {
    return;
  }

  // 3. Network-First for navigation (index.html) to support dynamic OG tags
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request) || caches.match('./index.html');
        })
    );
    return;
  }

  // 4. Cache-First for static assets
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(err => {
        // Fallback for redirected responses
        if (err.name === 'TypeError' && event.request.redirect !== 'follow') {
            return fetch(event.request, { redirect: 'follow' });
        }
        throw err;
      });
    })
  );
});
