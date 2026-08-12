const CACHE_NAME = 'socialflow-shell-v1';
const OFFLINE_FILES = [
  '/offline.html',
  '/favicon.png',
  '/pwa/icon-192.png',
  '/pwa/icon-512.png',
  '/pwa/badge-96.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

// A aplicação e a API continuam sempre vindas da rede. O cache serve somente
// uma tela segura e estática quando uma navegação acontece sem conexão.
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;

  event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')));
});

self.addEventListener('push', (event) => {
  let payload = {
    title: 'SocialFlow',
    body: 'Há uma nova atualização para você.',
    url: '/organizations',
    tag: 'socialflow-update',
    icon: '/pwa/icon-192.png',
    badge: '/pwa/badge-96.png',
  };

  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    if (event.data) payload.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      tag: payload.tag,
      renotify: true,
      data: { url: payload.url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  let destino = new URL('/organizations', self.location.origin);
  try {
    const solicitado = new URL(event.notification.data?.url || '/organizations', self.location.origin);
    if (solicitado.origin === self.location.origin) destino = solicitado;
  } catch {
    // Mantém o destino seguro padrão.
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(async (janelas) => {
        const janela = janelas.find((cliente) => new URL(cliente.url).origin === self.location.origin);
        if (janela) {
          if ('navigate' in janela) await janela.navigate(destino.href);
          return janela.focus();
        }

        return self.clients.openWindow(destino.href);
      }),
  );
});
