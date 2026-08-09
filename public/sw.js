// ============================================
// Service Worker - Acheei
// Notificações Push e Cache básico
// ============================================

const CACHE_NAME = 'acheei-v1';
const APP_URL = self.registration ? self.registration.scope : '/';

// Instalação - cache básico
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/']).catch(() => {});
    })
  );
});

// Ativação - limpar caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// ============================================
// Notificações Push
// ============================================
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Acheei', body: event.data ? event.data.text() : 'Nova mensagem' };
  }

  const title = data.title || 'Acheei';
  const options = {
    body: data.body || 'Você tem uma nova mensagem',
    icon: data.icon || '/icons/icon-192.svg',
    badge: data.badge || '/icons/icon-96.svg',
    data: {
      url: data.url || '/cliente',
      solicitacaoId: data.solicitacao_id || null
    },
    vibrate: [100, 50, 100],
    tag: data.tag || 'acheei-notification',
    renotify: true
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ============================================
// Clique na notificação
// ============================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : '/cliente';

  const solicitacaoId = event.notification.data && event.notification.data.solicitacaoId;

  // Abre ou foca a página do cliente
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes('/cliente') && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
