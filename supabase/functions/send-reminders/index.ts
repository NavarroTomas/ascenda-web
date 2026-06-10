import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

type DueReminder = {
  delivery_id: string
  reminder_id: string
  user_id: string
  title: string
  description: string | null
  priority: 'normal' | 'important' | 'alarm'
  sound_enabled: boolean
  source_type: string
  source_id: string | null
  recurrence_type: string
  recurrence_interval: number
  scheduled_for: string
  next_trigger_after: string
}

type PushSubscriptionRow = {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

const supabaseUrl = requireEnv('SUPABASE_URL')
const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
const cronSecret = requireEnv('CRON_SECRET')
const vapidPublicKey = requireEnv('VAPID_PUBLIC_KEY')
const vapidPrivateKey = requireEnv('VAPID_PRIVATE_KEY')
const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com'

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
const supabase = createClient(supabaseUrl, serviceRoleKey)

Deno.serve(async (request) => {
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 })
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: dueReminders, error } = await supabase.rpc('claim_due_reminders', { batch_size: 100 })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const results = []
  for (const reminder of (dueReminders || []) as DueReminder[]) {
    results.push(await deliverReminder(reminder))
  }

  return Response.json({ ok: true, claimed: dueReminders?.length || 0, results })
})

async function deliverReminder(reminder: DueReminder) {
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('id,endpoint,p256dh,auth')
    .eq('user_id', reminder.user_id)
    .eq('active', true)

  if (error) return failDelivery(reminder.delivery_id, error.message)
  if (!subscriptions?.length) return failDelivery(reminder.delivery_id, 'No hay dispositivos push activos para este usuario.')

  const payload = JSON.stringify({
    url: `/#/recordatorios?delivery=${encodeURIComponent(reminder.delivery_id)}&reminder=${encodeURIComponent(reminder.reminder_id)}`,
    deliveryId: reminder.delivery_id,
    reminder: {
      id: reminder.reminder_id,
      title: reminder.title,
      description: reminder.description,
      priority: reminder.priority,
      sound_enabled: reminder.sound_enabled,
      source_type: reminder.source_type,
      source_id: reminder.source_id,
      recurrence_type: reminder.recurrence_type,
      recurrence_interval: reminder.recurrence_interval,
      scheduled_for: reminder.scheduled_for,
      next_trigger_at: reminder.next_trigger_after,
      _server_claimed: true,
      _delivery_id: reminder.delivery_id,
    },
  })

  let delivered = 0
  const failures: string[] = []
  for (const subscription of subscriptions as PushSubscriptionRow[]) {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      }, payload, { TTL: 60 * 60, urgency: reminder.priority === 'alarm' ? 'high' : 'normal' })
      delivered += 1
    } catch (error) {
      const statusCode = Number((error as { statusCode?: number }).statusCode || 0)
      const message = error instanceof Error ? error.message : String(error)
      failures.push(message)
      if (statusCode === 404 || statusCode === 410) {
        await supabase.from('push_subscriptions').update({ active: false }).eq('id', subscription.id)
      }
    }
  }

  if (!delivered) return failDelivery(reminder.delivery_id, failures.join(' | ') || 'Ninguna suscripción aceptó el envío.')
  await supabase.from('notification_history').update({
    action: 'push_sent',
    delivery_status: 'sent',
    sent_at: new Date().toISOString(),
    error_message: failures.length ? failures.join(' | ') : null,
    metadata: { delivered_devices: delivered, failed_devices: failures.length },
  }).eq('id', reminder.delivery_id)

  return { reminder_id: reminder.reminder_id, delivery_id: reminder.delivery_id, delivered, failed: failures.length }
}

async function failDelivery(deliveryId: string, errorMessage: string) {
  await supabase.from('notification_history').update({
    action: 'push_failed',
    delivery_status: 'failed',
    error_message: errorMessage,
  }).eq('id', deliveryId)
  return { delivery_id: deliveryId, delivered: 0, error: errorMessage }
}

function requireEnv(name: string) {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}
