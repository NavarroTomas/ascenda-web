import { supabase } from './supabase.js'

const EXPORT_TABLES = [
  'profiles', 'user_settings', 'custom_categories', 'tasks', 'task_subtasks', 'tags', 'task_tag_links',
  'habits', 'habit_logs', 'routines', 'routine_steps', 'routine_logs', 'routine_step_logs',
  'goals', 'goal_milestones', 'goal_task_links', 'xp_events', 'daily_notes', 'notes', 'events',
  'reminders', 'notification_history', 'push_subscriptions', 'daily_plans', 'weekly_reviews',
  'finance_categories', 'finance_transactions', 'finance_monthly_goals', 'user_season_progress', 'season_point_events',
  'user_season_history', 'user_attributes', 'user_missions', 'user_achievements', 'user_cosmetics',
  'user_onboarding', 'user_initial_plans',
]

function messageFromError(error, fallback = 'Ocurrió un error inesperado.') {
  return error?.message || fallback
}

export function clearAscendaLocalState() {
  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      for (let index = storage.length - 1; index >= 0; index -= 1) {
        const key = storage.key(index)
        if (key?.startsWith('ascenda:') || key?.startsWith('sb-')) storage.removeItem(key)
      }
    } catch {
      // La limpieza local no debe impedir el cierre de sesión.
    }
  }
}

export async function verifyCurrentPassword(email, password) {
  if (!email) throw new Error('La cuenta no tiene un correo electrónico disponible para validar la contraseña actual.')
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error('La contraseña actual no es correcta.')
}

export async function changeCurrentPassword({ email, currentPassword, newPassword }) {
  await verifyCurrentPassword(email, currentPassword)
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw new Error(messageFromError(error, 'No se pudo actualizar la contraseña.'))
}

export async function sendPasswordResetEmail(email) {
  const redirectTo = `${window.location.origin}/reset-password`
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
  if (error) {
    if (String(error.message || '').toLowerCase().includes('rate limit')) {
      throw new Error('Se alcanzó temporalmente el límite de correos. Intentá nuevamente más tarde.')
    }
    throw new Error(messageFromError(error, 'No se pudo enviar el enlace de recuperación.'))
  }
}

export async function setRecoveredPassword(password) {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw new Error(messageFromError(error, 'No se pudo establecer la contraseña nueva.'))
}

export async function signOutEverywhere() {
  const { error } = await supabase.auth.signOut({ scope: 'global' })
  if (error) throw new Error(messageFromError(error, 'No se pudo cerrar la sesión en todos los dispositivos.'))
  clearAscendaLocalState()
}

async function exportTable(table) {
  const { data, error } = await supabase.from(table).select('*')
  if (error) return { table, rows: [], warning: error.message }
  return { table, rows: data || [], warning: null }
}

export async function buildAccountExport(user) {
  const results = await Promise.all(EXPORT_TABLES.map(exportTable))
  const tables = {}
  const warnings = []
  for (const result of results) {
    tables[result.table] = result.rows
    if (result.warning) warnings.push(`${result.table}: ${result.warning}`)
  }
  return {
    export_version: 'ascenda-v9.1',
    exported_at: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email || null,
      created_at: user.created_at || null,
    },
    tables,
    warnings,
  }
}

export function downloadJsonExport(payload) {
  const date = new Date().toISOString().slice(0, 10)
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `ascenda-datos-${date}.json`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export async function permanentlyDeleteAccount({ email, password }) {
  await verifyCurrentPassword(email, password)
  const { error } = await supabase.functions.invoke('delete-account', { body: { confirmation: 'ELIMINAR MI CUENTA' } })
  if (error) throw new Error(messageFromError(error, 'No se pudo eliminar la cuenta.'))
  try { await supabase.auth.signOut({ scope: 'local' }) } catch { /* noop */ }
  clearAscendaLocalState()
}
