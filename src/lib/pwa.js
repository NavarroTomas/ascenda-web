export function canUseServiceWorkers() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator
}

export async function registerAscendaServiceWorker() {
  if (!canUseServiceWorkers()) return null
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  } catch (error) {
    console.warn('No se pudo registrar el service worker de Ascenda.', error)
    return null
  }
}

export async function getAscendaServiceWorker() {
  if (!canUseServiceWorkers()) return null
  const current = await navigator.serviceWorker.getRegistration('/')
  if (current) return current
  await registerAscendaServiceWorker()
  return navigator.serviceWorker.ready
}

export async function showLocalSystemNotification(title, options = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false
  const registration = await getAscendaServiceWorker()
  if (!registration) return false
  await registration.showNotification(title, {
    icon: '/icons/icon-192.svg',
    badge: '/icons/icon-192.svg',
    ...options,
  })
  return true
}

export function isStandalonePwa() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
}
