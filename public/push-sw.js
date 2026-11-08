// Notifiche push di ACE (caricato dal service worker di vite-plugin-pwa con importScripts).
self.addEventListener('push', (evento) => {
  const d = evento.data ? evento.data.json() : { titolo: 'ACE', testo: '' };
  evento.waitUntil(
    self.registration.showNotification(d.titolo || 'ACE', {
      body: d.testo,
      icon: '/icone/pallone-192.png',
      badge: '/icone/pallone-192.png',
      tag: d.tipo || 'ace',
    }),
  );
});

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((finestre) => {
      const aperta = finestre.find((f) => 'focus' in f);
      return aperta ? aperta.focus() : self.clients.openWindow('/');
    }),
  );
});
