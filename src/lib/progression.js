import { addDays, getTodayISO, toDateISO } from './date.js'
import {
  ACHIEVEMENT_CATALOG,
  ATTRIBUTE_CATALOG,
  DAILY_MISSION_TEMPLATES,
  WEEKLY_MISSION_TEMPLATES,
} from '../data/progressionCatalog.js'

export function getWeekStartISO(date = new Date()) {
  const cursor = new Date(date)
  const day = cursor.getDay()
  const offset = day === 0 ? -6 : 1 - day
  return toDateISO(addDays(cursor, offset))
}

export function countDistinctDates(items = [], key = 'log_date') {
  return new Set(items.map((item) => item[key]).filter(Boolean)).size
}

export function buildProgressionMetrics({ tasks = [], habitLogs = [], routineLogs = [], dailyNotes = [], notes = [], xpEvents = [], today = getTodayISO() }) {
  const weekStart = getWeekStartISO(new Date(`${today}T12:00:00`))
  const tasksCompleted = tasks.filter((item) => item.completed || item.status === 'completada')
  const tasksToday = tasksCompleted.filter((item) => item.completed_at?.slice(0, 10) === today)
  const tasksWeek = tasksCompleted.filter((item) => (item.completed_at?.slice(0, 10) || '') >= weekStart)
  const habitsToday = habitLogs.filter((item) => item.log_date === today)
  const habitsWeek = habitLogs.filter((item) => item.log_date >= weekStart)
  const completedRoutines = routineLogs.filter((item) => item.completed)
  const routinesToday = completedRoutines.filter((item) => item.log_date === today)
  const routinesWeek = completedRoutines.filter((item) => item.log_date >= weekStart)
  const dailyNotesToday = dailyNotes.filter((item) => item.note_date === today)
  const dailyNotesWeek = dailyNotes.filter((item) => item.note_date >= weekStart)
  const activeDates = new Set(xpEvents.map((event) => event.occurred_on).filter(Boolean))
  let streak = 0
  let cursor = new Date(`${today}T12:00:00`)
  if (!activeDates.has(today)) cursor = addDays(cursor, -1)
  while (activeDates.has(toDateISO(cursor))) {
    streak += 1
    cursor = addDays(cursor, -1)
  }

  return {
    tasksCompleted: tasksCompleted.length,
    habitLogs: habitLogs.length,
    routineLogs: completedRoutines.length,
    goalsCompleted: tasks.length >= 0 ? 0 : 0,
    dailyNotes: dailyNotes.length,
    lockedNotes: notes.filter((item) => item.is_locked).length,
    streak,
    tasksToday: tasksToday.length,
    habitsToday: habitsToday.length,
    routinesToday: routinesToday.length,
    dailyNotesToday: dailyNotesToday.length,
    actionsToday: tasksToday.length + habitsToday.length + routinesToday.length + dailyNotesToday.length,
    tasksWeek: tasksWeek.length,
    habitsWeek: habitsWeek.length,
    routinesWeek: routinesWeek.length,
    dailyNotesWeek: countDistinctDates(dailyNotesWeek, 'note_date'),
    actionsWeek: tasksWeek.length + habitsWeek.length + routinesWeek.length + dailyNotesWeek.length,
  }
}

export function enrichProgressionMetrics(baseMetrics, goals = []) {
  return { ...baseMetrics, goalsCompleted: goals.filter((goal) => goal.status === 'completed').length }
}

export function attributeLevelFromXp(xp = 0) {
  const safeXp = Math.max(0, Number(xp || 0))
  let level = 1
  let remaining = safeXp
  while (level < 50) {
    const required = 80 + (level - 1) * 28
    if (remaining < required) break
    remaining -= required
    level += 1
  }
  const required = level >= 50 ? 0 : 80 + (level - 1) * 28
  return { level, xp: safeXp, remaining, required, progress: level >= 50 ? 100 : Math.round((remaining / required) * 100) }
}

export function calculateAttributeTotals({ tasks = [], habits = [], habitLogs = [], routines = [], routineLogs = [], goals = [] }) {
  const total = Object.fromEntries(ATTRIBUTE_CATALOG.map((attribute) => [attribute.id, 0]))
  const add = (id, amount) => { total[id] = Number(total[id] || 0) + Number(amount || 0) }
  const byCategory = (category = '') => String(category).trim().toLowerCase()
  const routeCategory = (category, amount) => {
    const key = byCategory(category)
    if (key.includes('salud')) add('salud', amount)
    else if (key.includes('estudio') || key.includes('conocimiento')) add('conocimiento', amount)
    else if (key.includes('finanza')) add('finanzas', amount)
    else if (key.includes('bienestar')) add('bienestar', amount)
    else if (key.includes('social')) add('social', amount)
    else add('productividad', amount)
  }

  tasks.filter((task) => task.completed || task.status === 'completada').forEach((task) => {
    add('productividad', Number(task.xp_reward || 12))
    routeCategory(task.category, Math.round(Number(task.xp_reward || 12) * 0.45))
  })
  habitLogs.forEach((log) => {
    const habit = habits.find((item) => item.id === log.habit_id)
    add('disciplina', Number(habit?.xp_reward || 8))
    routeCategory(habit?.category, Math.round(Number(habit?.xp_reward || 8) * 0.7))
  })
  routineLogs.filter((log) => log.completed).forEach((log) => {
    const routine = routines.find((item) => item.id === log.routine_id)
    add('disciplina', Number(routine?.xp_bonus || 15))
    routeCategory(routine?.category, Math.round(Number(routine?.xp_bonus || 15) * 0.5))
  })
  goals.filter((goal) => goal.status === 'completed').forEach((goal) => {
    add('productividad', Number(goal.xp_reward || 50))
    routeCategory(goal.category, Math.round(Number(goal.xp_reward || 50) * 0.8))
  })
  return total
}

export function createMissionRows({ userId, dailyCount = 3, today = getTodayISO(), weekStart = getWeekStartISO() }) {
  const safeDailyCount = Math.max(1, Math.min(5, Number(dailyCount || 3)))
  const daily = DAILY_MISSION_TEMPLATES.slice(0, safeDailyCount).map((mission) => ({
    user_id: userId,
    mission_code: mission.id,
    period_type: 'daily',
    period_key: today,
    title: mission.label,
    description: mission.copy,
    metric_key: mission.metric,
    target_value: mission.target,
    reward_xp: mission.rewardXp,
    reward_pt: mission.rewardPt,
  }))
  const weekly = WEEKLY_MISSION_TEMPLATES.map((mission) => ({
    user_id: userId,
    mission_code: mission.id,
    period_type: 'weekly',
    period_key: weekStart,
    title: mission.label,
    description: mission.copy,
    metric_key: mission.metric,
    target_value: mission.target,
    reward_xp: mission.rewardXp,
    reward_pt: mission.rewardPt,
  }))
  return [...daily, ...weekly]
}

export function missionProgress(mission, metrics) {
  return Math.max(0, Math.min(Number(mission.target_value || 1), Number(metrics[mission.metric_key] || 0)))
}

export function achievementProgress(achievement, metrics) {
  return Math.max(0, Math.min(achievement.target, Number(metrics[achievement.metric] || 0)))
}

export function unlockedAchievements(metrics) {
  return ACHIEVEMENT_CATALOG.filter((achievement) => achievementProgress(achievement, metrics) >= achievement.target)
}

export function buildInitialPlan(answers = {}) {
  const areas = new Set(answers.focus_areas || [])
  const obstacles = new Set(answers.obstacles || [])
  const habits = [
    { title: 'Revisar mi agenda', category: 'Personal', target: 1, unit: 'vez', xp_reward: 8 },
    { title: 'Completar una tarea prioritaria', category: 'Trabajo', target: 1, unit: 'vez', xp_reward: 10 },
  ]
  if (areas.has('salud')) habits.push({ title: 'Moverme durante 20 minutos', category: 'Salud', target: 20, unit: 'minutos', xp_reward: 10 })
  if (areas.has('estudio')) habits.push({ title: 'Estudiar con foco', category: 'Estudio', target: 30, unit: 'minutos', xp_reward: 10 })
  if (areas.has('finanzas')) habits.push({ title: 'Registrar gastos del día', category: 'Finanzas', target: 1, unit: 'vez', xp_reward: 8 })
  if (obstacles.has('constancia')) habits.push({ title: 'Cerrar el día con una acción pequeña', category: 'Bienestar', target: 1, unit: 'vez', xp_reward: 8 })
  return {
    habits: habits.slice(0, 4),
    routine: {
      title: 'Rutina de enfoque inicial',
      category: 'Personal',
      xp_bonus: 18,
      steps: [
        { title: 'Revisar agenda', xp_reward: 5 },
        { title: 'Elegir una prioridad', xp_reward: 5 },
        { title: 'Preparar el próximo paso', xp_reward: 5 },
      ],
    },
  }
}
