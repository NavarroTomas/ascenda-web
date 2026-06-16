import { addDays, getTodayISO, toDateISO } from './date.js'

export function getWeekStartISO(date = new Date()) {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  const day = value.getDay()
  value.setDate(value.getDate() - (day === 0 ? 6 : day - 1))
  return toDateISO(value)
}

export function getWeekEndISO(weekStart) {
  return toDateISO(addDays(new Date(`${weekStart}T00:00:00`), 6))
}

export function isSameISOWeek(dateISO, weekStart = getWeekStartISO()) {
  if (!dateISO) return false
  const weekEnd = getWeekEndISO(weekStart)
  return dateISO >= weekStart && dateISO <= weekEnd
}

export function habitFrequencyType(habit) {
  return habit?.frequency_type || 'daily'
}

export function habitWeeklyTarget(habit) {
  return Math.max(1, Number(habit?.weekly_target || 1))
}

export function habitLogsInWeek(habitLogs, habitId, weekStart = getWeekStartISO()) {
  const weekEnd = getWeekEndISO(weekStart)
  return habitLogs.filter((log) => log.habit_id === habitId && log.log_date >= weekStart && log.log_date <= weekEnd)
}

export function habitWeeklyProgress(habit, habitLogs, weekStart = getWeekStartISO()) {
  return habitLogsInWeek(habitLogs, habit.id, weekStart).reduce((sum, log) => sum + Number(log.value || 0), 0)
}

export function habitDoneForToday(habit, habitLogs, today = getTodayISO()) {
  if (habitFrequencyType(habit) === 'weekly_target') return habitWeeklyProgress(habit, habitLogs) >= habitWeeklyTarget(habit)
  return habitLogs.some((log) => log.habit_id === habit.id && log.log_date === today)
}

export function routineIsDueToday(routine, day = new Date().getDay()) {
  return !routine?.scheduled_days?.length || routine.scheduled_days.includes(day)
}

export function getDailyDashboardSummary({ tasks = [], habits = [], habitLogs = [], routines = [], routineLogs = [], events = [], reminders = [], today = getTodayISO() }) {
  const dueTasks = tasks.filter((task) => task.due_date === today && task.status !== 'cancelada')
  const openTasks = tasks.filter((task) => !task.completed && task.status !== 'cancelada')
  const pendingHabits = habits.filter((habit) => !habitDoneForToday(habit, habitLogs, today))
  const dueRoutines = routines.filter((routine) => routineIsDueToday(routine))
  const routinesDone = dueRoutines.filter((routine) => routineLogs.some((log) => log.routine_id === routine.id && log.log_date === today && log.completed))
  const eventsToday = events.filter((event) => event.event_date === today && event.status !== 'cancelled')
  const remindersToday = reminders.filter((reminder) => reminder.status === 'active' && reminder.next_trigger_at?.slice(0, 10) === today)
  const total = dueTasks.length + habits.length + dueRoutines.length
  const done = dueTasks.filter((task) => task.completed).length + habits.filter((habit) => habitDoneForToday(habit, habitLogs, today)).length + routinesDone.length

  return {
    dueTasks,
    openTasks,
    pendingHabits,
    dueRoutines,
    routinesDone,
    eventsToday,
    remindersToday,
    total,
    done,
    percentage: total ? Math.round((done / total) * 100) : 0,
  }
}

export function getWeeklySummary({ tasks = [], habits = [], habitLogs = [], routines = [], routineLogs = [], goals = [], xpEvents = [], weekStart = getWeekStartISO() }) {
  const weekEnd = getWeekEndISO(weekStart)
  const tasksCompleted = tasks.filter((task) => task.completed_at?.slice(0, 10) >= weekStart && task.completed_at?.slice(0, 10) <= weekEnd)
  const habitLogsThisWeek = habitLogs.filter((log) => log.log_date >= weekStart && log.log_date <= weekEnd)
  const routineLogsThisWeek = routineLogs.filter((log) => log.log_date >= weekStart && log.log_date <= weekEnd && log.completed)
  const xpThisWeek = xpEvents.filter((event) => event.occurred_on >= weekStart && event.occurred_on <= weekEnd)
  const activeGoals = goals.filter((goal) => goal.status === 'active')
  const completedGoals = goals.filter((goal) => goal.status === 'completed')

  const habitScores = habits.map((habit) => {
    const progress = habitFrequencyType(habit) === 'weekly_target'
      ? habitWeeklyProgress(habit, habitLogs, weekStart)
      : habitLogsThisWeek.filter((log) => log.habit_id === habit.id).length
    const target = habitFrequencyType(habit) === 'weekly_target' ? habitWeeklyTarget(habit) : 7
    return { habit, progress, target, percent: Math.min(100, Math.round((progress / Math.max(1, target)) * 100)) }
  })

  const bestHabit = [...habitScores].sort((a, b) => b.percent - a.percent)[0] || null
  const weakestHabit = [...habitScores].filter((item) => item.progress > 0 || item.target > 0).sort((a, b) => a.percent - b.percent)[0] || null
  const xpTotal = xpThisWeek.reduce((sum, event) => sum + Number(event.amount || 0), 0)

  return {
    weekStart,
    weekEnd,
    tasksCompleted: tasksCompleted.length,
    habitSessions: habitLogsThisWeek.reduce((sum, log) => sum + Number(log.value || 0), 0),
    routinesCompleted: routineLogsThisWeek.length,
    xpTotal,
    activeGoals: activeGoals.length,
    completedGoals: completedGoals.length,
    bestHabit,
    weakestHabit,
    recommendation: weakestHabit?.habit
      ? `Revisá “${weakestHabit.habit.title}”. Si se siente pesado, bajá la frecuencia o agregalo al plan del día.`
      : 'Elegí un hábito principal para darle continuidad esta semana.',
  }
}

export function normalizePlanLines(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean)
  return String(value || '').split('\n').map((item) => item.trim()).filter(Boolean)
}
