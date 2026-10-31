// Service Worker for Raksha Citizen Safety PWA
// Only caches static safe application assets and offline fallback
const CACHE_NAME = 'raksha-v1.0.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/logo.svg',
  '/offline.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // NEVER cache API requests, Supabase calls, or sensitive incidents
  if (
    url.pathname.startsWith('/rest/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase.co')
  ) {
    return; // Pass through to network
  }

  // For navigational page requests (HTML), try network first, then cache, then offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/offline.html') || caches.match('/index.html');
      })
    );
    return;
  }

  // Cache-first for local static assets (JS, CSS, SVGs, images)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Cache static JS/CSS files on the fly
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (url.pathname.endsWith('.js') ||
           url.pathname.endsWith('.css') ||
           url.pathname.endsWith('.svg') ||
           url.pathname.endsWith('.woff2'))
        ) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      });
    })
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// EMERGENCY WEB PWA PUSH NOTIFICATION & SOUND / CLICK HANDLING
// ─────────────────────────────────────────────────────────────────────────────

// SOS Morse vibration pattern (~5 seconds): S-O-S + extended alert buzz
// S = 3 short (200ms on/100ms off), O = 3 long (600ms on/100ms off)
// Total: ~5200ms
const SOS_VIBRATE = [
  200, 100, 200, 100, 200,  // S
  400,                       // letter gap
  600, 100, 600, 100, 600,  // O
  400,                       // letter gap
  200, 100, 200, 100, 200,  // S
  200, 100,                  // brief pause
  800,                       // final strong buzz
];

// Handle Web Push event from Push Service / PushManager
self.addEventListener('push', (event) => {
  let data = {
    title: 'EMERGENCY SOS ALERT',
    body: 'Your trusted contact needs help. Open this alert to view their available location and emergency status.',
    url: '/',
    incidentId: '',
  };

  if (event.data) {
    try {
      data = Object.assign(data, event.data.json());
    } catch {
      data.body = event.data.text() || data.body;
    }
  }

  const options = {
    body: data.body,
    icon: '/raksha-logo.png',
    badge: '/logo.svg',
    tag: data.incidentId ? `emergency-${data.incidentId}` : 'emergency-sos',
    renotify: true,
    requireInteraction: true, // Keep notification pinned on screen until user interacts
    silent: false,
    vibrate: SOS_VIBRATE,
    data: {
      url: data.url || '/',
      incidentId: data.incidentId,
    },
    actions: [
      {
        action: 'open_alert',
        title: '🚨 Open Emergency Alert',
      },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Handle notification click by user on lock screen or notification tray
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open with the target URL, focus it
      for (const client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Client message relay to trigger notifications locally for testing & verification
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'TRIGGER_EMERGENCY_NOTIFICATION') {
    const { title, body, url, incidentId } = event.data;
    const options = {
      body,
      icon: '/raksha-logo.png',
      badge: '/logo.svg',
      tag: incidentId ? `emergency-${incidentId}` : 'emergency-sos',
      renotify: true,
      requireInteraction: true,
      silent: false,
      vibrate: SOS_VIBRATE,
      data: { url: url || '/' },
    };
    self.registration.showNotification(title || 'EMERGENCY SOS ALERT', options);
  }
});
