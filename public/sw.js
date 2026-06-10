const CACHE_NAME = 'ascenda-shell-v8-1'
const SHELL_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put('/', copy))
          return response
        })
        .catch(() => caches.match('/')),
    )
    return
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      if (!response || response.status !== 200 || response.type !== 'basic') return response
      const copy = response.clone()
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
      return response
    })),
  )
})

self.addEventListener('push', (event) => {
  const payload = parsePushPayload(event)
  const reminder = payload.reminder || {}
  const title = reminder.title || payload.title || 'Ascenda'
  const body = reminder.description || payload.body || 'Tenés un recordatorio pendiente.'
  const url = payload.url || '/#/recordatorios'
  const priority = reminder.priority || 'normal'

  const options = {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: reminder.id ? `ascenda-reminder-${reminder.id}` : 'ascenda-reminder',
    renotify: priority === 'alarm',
    requireInteraction: priority === 'alarm',
    vibrate: priority === 'alarm' ? [250, 120, 250, 120, 350] : [180, 80, 180],
    data: { ...payload, url },
    actions: [
      { action: 'open', title: 'Abrir Ascenda' },
    ],
  }

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      notifyOpenClients(payload),
    ]),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const payload = event.notification.data || {}
  const targetUrl = new URL(payload.url || '/#/recordatorios', self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
      for (const client of clients) {
        if (new URL(client.url).origin !== self.location.origin) continue
        await client.focus()
        client.postMessage({ type: 'ASCENDA_NOTIFICATION_CLICK', payload })
        if ('navigate' in client) await client.navigate(targetUrl)
        return
      }
      if (self.clients.openWindow) await self.clients.openWindow(targetUrl)
    }),
  )
})

function parsePushPayload(event) {
  if (!event.data) return {}
  try { return event.data.json() } catch { return { body: event.data.text() } }
}

async function notifyOpenClients(payload) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  clients.forEach((client) => client.postMessage({ type: 'ASCENDA_REMINDER_PUSH', payload }))
}
