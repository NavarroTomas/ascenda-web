import { supabase } from './supabase.js'
import { getAscendaServiceWorker, showLocalSystemNotification } from './pwa.js'

const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY

export function getPushSupport() {
  if (!('Notification' in window)) return { supported: false, reason: 'Este navegador no expone la API de notificaciones.' }
  if (!('serviceWorker' in navigator)) return { supported: false, reason: 'Este navegador no admite service workers.' }
  if (!('PushManager' in window)) return { supported: false, reason: 'Este navegador no admite suscripciones push.' }
  if (!vapidPublicKey) return { supported: false, reason: 'Falta configurar VITE_VAPID_PUBLIC_KEY en Vercel.' }
  return { supported: true, reason: '' }
}

export async function readPushState() {
  const support = getPushSupport()
  if (!support.supported) return { ...support, permission: 'unsupported', subscribed: false }
  const registration = await getAscendaServiceWorker()
  const subscription = await registration?.pushManager.getSubscription()
  return {
    ...support,
    permission: Notification.permission,
    subscribed: Boolean(subscription),
    endpoint: subscription?.endpoint || null,
  }
}

export async function enablePushNotifications(userId) {
  const support = getPushSupport()
  if (!support.supported) throw new Error(support.reason)

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('El permiso de notificaciones no fue concedido.')

  const registration = await getAscendaServiceWorker()
  if (!registration) throw new Error('No se pudo activar el service worker.')

  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    })
  }

  const serialized = subscription.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint: subscription.endpoint,
    p256dh: serialized.keys?.p256dh,
    auth: serialized.keys?.auth,
    user_agent: navigator.userAgent,
    active: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'endpoint' })

  if (error) throw error
  return subscription
}

export async function disablePushNotifications() {
  const support = getPushSupport()
  if (!support.supported) return
  const registration = await getAscendaServiceWorker()
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return

  const { error } = await supabase.from('push_subscriptions').update({ active: false, updated_at: new Date().toISOString() }).eq('endpoint', subscription.endpoint)
  if (error) throw error
  await subscription.unsubscribe()
}

export async function sendLocalNotificationTest() {
  const support = getPushSupport()
  if (!support.supported) throw new Error(support.reason)
  if (Notification.permission !== 'granted') throw new Error('Primero activá las notificaciones.')
  await showLocalSystemNotification('Ascenda está listo', {
    body: 'Las notificaciones del sistema quedaron habilitadas en este dispositivo.',
    tag: 'ascenda-test',
    data: { url: '/#/recordatorios' },
  })
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((character) => character.charCodeAt(0)))
}
