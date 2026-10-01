// Self-unregistering and cache-clearing service worker for development / migration
// This purges legacy manual caches (e.g. hteim-erp-pwa-v2.5.0) and unregisters itself
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          // Clear any legacy manual caches
          if (key.startsWith('hteim-erp-pwa')) {
            console.log('[SW] Cleared legacy cache:', key);
            return caches.delete(key);
          }
          return Promise.resolve(false);
        })
      );
    }).then(() => {
      // In development mode or migration, unregister to allow fresh Vite assets
      return self.registration.unregister();
    }).then(() => {
      return self.clients.matchAll();
    }).then((clients) => {
      clients.forEach((client) => {
        if (client.url && 'navigate' in client) {
          // Soft refresh to clear out hijacked stale DOM/CSS references
          client.navigate(client.url);
        }
      });
    })
  );
});

// Pass-through fetch listener (never blocks or caches requests)
self.addEventListener('fetch', () => {});
