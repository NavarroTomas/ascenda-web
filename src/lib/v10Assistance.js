import { ASCENDA_APP_VERSION } from '../data/updateNotes.js'

export function getUpdateSeenKey(userId) {
  return `ascenda:update-seen:${userId}:${ASCENDA_APP_VERSION}`
}

export function getDailyTourSeenKey(userId) {
  return `ascenda:v10-tour:${userId}`
}

export function getTodayPlan(dailyPlans = [], today) {
  return dailyPlans.find((plan) => plan.plan_date === today) || null
}

export function buildPriorityAlerts({ tasks = [], habits = [], habitLogs = [], reminders = [], financeSummary = null, today }) {
  const alerts = []
  const overdueTasks = tasks.filter((task) => !task.completed && task.status !== 'cancelada' && task.due_date && task.due_date < today)
  const todayTasks = tasks.filter((task) => !task.completed && task.status !== 'cancelada' && task.due_date === today)
  const importantTasks = tasks.filter((task) => !task.completed && task.status !== 'cancelada' && task.priority === 'alta')
  if (overdueTasks.length) alerts.push({ id: 'overdue-tasks', tone: 'danger', title: `${overdueTasks.length} tarea${overdueTasks.length === 1 ? '' : 's'} atrasada${overdueTasks.length === 1 ? '' : 's'}`, detail: 'Conviene resolverlas o reprogramarlas hoy.', action: 'Ver tareas', section: 'tareas' })
  if (todayTasks.length) alerts.push({ id: 'today-tasks', tone: 'warning', title: `${todayTasks.length} tarea${todayTasks.length === 1 ? '' : 's'} vencen hoy`, detail: 'Están dentro del día actual.', action: 'Ver tareas', section: 'tareas' })
  if (importantTasks.length) alerts.push({ id: 'important-tasks', tone: 'focus', title: `${importantTasks.length} prioridad${importantTasks.length === 1 ? '' : 'es'} alta${importantTasks.length === 1 ? '' : 's'}`, detail: 'No las mezcles con pendientes menores.', action: 'Ordenar prioridades', section: 'inicio' })
  const pendingHabits = habits.filter((habit) => !habitLogs.some((log) => log.habit_id === habit.id && log.log_date === today))
  if (pendingHabits.length) alerts.push({ id: 'pending-habits', tone: 'focus', title: `${pendingHabits.length} hábito${pendingHabits.length === 1 ? '' : 's'} pendiente${pendingHabits.length === 1 ? '' : 's'}`, detail: 'Un avance corto mantiene la cadena activa.', action: 'Ver hábitos', section: 'habitos' })
  const dueReminders = reminders.filter((reminder) => reminder.status === 'active' && reminder.next_trigger_at?.slice(0, 10) === today)
  if (dueReminders.length) alerts.push({ id: 'today-reminders', tone: 'info', title: `${dueReminders.length} recordatorio${dueReminders.length === 1 ? '' : 's'} hoy`, detail: 'Revisá que no haya avisos críticos.', action: 'Ver recordatorios', section: 'recordatorios' })
  if (financeSummary?.expenseLimit > 0 && financeSummary.expenseProgress >= 85) alerts.push({ id: 'finance-limit', tone: 'danger', title: 'Gastos cerca del límite', detail: `Ya usaste ${financeSummary.expenseProgress}% del límite mensual.`, action: 'Ver finanzas', section: 'finanzas' })
  if (financeSummary?.savingsGoal > 0 && financeSummary.remainingToSave > 0) alerts.push({ id: 'finance-savings', tone: 'warning', title: 'Ahorro mensual pendiente', detail: `Todavía falta completar el objetivo de ahorro.`, action: 'Ver finanzas', section: 'finanzas' })
  return alerts.slice(0, 8)
}

export function buildInternalNotifications({ priorityAlerts = [], notificationHistory = [], internalNotifications = [] }) {
  const synthetic = priorityAlerts.map((alert) => ({
    id: `auto-${alert.id}`,
    type: 'automatic_priority',
    title: alert.title,
    body: alert.detail,
    tone: alert.tone,
    created_at: new Date().toISOString(),
    read_at: null,
    metadata: { section: alert.section },
  }))
  const pushHistory = notificationHistory.slice(0, 8).map((item) => ({
    id: `push-${item.id}`,
    type: 'reminder_history',
    title: item.title || 'Recordatorio procesado',
    body: item.delivery_status ? `Estado: ${item.delivery_status}` : item.action || 'Aviso interno',
    tone: item.delivery_status === 'failed' ? 'danger' : 'info',
    created_at: item.fired_at || item.created_at,
    read_at: item.viewed_at || null,
    metadata: { source: 'notification_history' },
  }))
  return [...(internalNotifications || []), ...synthetic, ...pushHistory]
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
    .slice(0, 50)
}

export function getHumanSuccessMessage(action) {
  const map = {
    saved: 'Listo, quedó guardado.',
    deleted: 'Listo, se eliminó correctamente.',
    created: 'Listo, ya está creado.',
    updated: 'Listo, cambios guardados.',
  }
  return map[action] || 'Listo.'
}
