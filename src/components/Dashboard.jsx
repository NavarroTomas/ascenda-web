import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import {
  addDays, createRecentDays, createWeekDays, dateTimeFromParts, formatCountdown,
  formatLongDate, formatShortDate, getGreeting, getTodayISO, getTodayLabel, safeTime, toDateISO,
} from '../lib/date.js'
import {
  applyStreakBonus, calculateLevel, calculateProjectedStreak, calculateStreak,
  getStreakBonusPercent, getStreakMultiplier,
} from '../lib/xp.js'
import { getDailyQuote } from '../data/motivationalQuotes.js'
import { mergeCategories } from '../data/defaultCategories.js'
import { calculateSeasonPoints, getSeasonRank } from '../data/seasonRanks.js'
import { playAscendaSound } from '../lib/sounds.js'
import { showLocalSystemNotification } from '../lib/pwa.js'
import TaskModal from './TaskModal.jsx'
import HabitModal from './HabitModal.jsx'
import RoutineModal from './RoutineModal.jsx'
import GoalModal from './GoalModal.jsx'
import QuickCreateModal from './QuickCreateModal.jsx'
import SettingsView from './SettingsView.jsx'
import RpgCelebrationModal from './RpgCelebrationModal.jsx'
import SeasonView from './SeasonView.jsx'
import AgendaWorkspace from './AgendaWorkspace.jsx'
import NotesView from './NotesView.jsx'
import NoteModal from './NoteModal.jsx'
import EventModal from './EventModal.jsx'
import ReminderModal from './ReminderModal.jsx'
import ReminderAlertModal from './ReminderAlertModal.jsx'
import RemindersView from './RemindersView.jsx'
import AdvancedTasksView from './AdvancedTasksView.jsx'
import ProfileView from './ProfileView.jsx'
import MissionDashboardCard from './MissionDashboardCard.jsx'
import DailyWelcomeModal from './DailyWelcomeModal.jsx'
import DayPlannerPanel from './DayPlannerPanel.jsx'
import WeeklyReviewPanel from './WeeklyReviewPanel.jsx'
import QuickTemplatesPanel from './QuickTemplatesPanel.jsx'
import ProgressDashboard from './ProgressDashboard.jsx'

const NAV_ITEMS = [
  { id: 'inicio', label: 'Inicio', icon: '⌂' },
  { id: 'agenda', label: 'Agenda', icon: '◷' },
  { id: 'notas', label: 'Notas', icon: '▤' },
  { id: 'recordatorios', label: 'Recordatorios', icon: '⚑' },
  { id: 'tareas', label: 'Tareas', icon: '✓' },
  { id: 'habitos', label: 'Hábitos', icon: '◉' },
  { id: 'rutinas', label: 'Rutinas', icon: '↻' },
  { id: 'objetivos', label: 'Objetivos', icon: '◇' },
  { id: 'temporada', label: 'Temporada', icon: '♜' },
  { id: 'perfil', label: 'Perfil', icon: '◎' },
  { id: 'progreso', label: 'Progreso', icon: '↗' },
  { id: 'configuracion', label: 'Configuración', icon: '⚙' },
]

const SIMPLE_NAV_IDS = new Set(['inicio', 'agenda', 'recordatorios', 'tareas', 'habitos', 'perfil', 'configuracion'])
const DEFAULT_SETTINGS = {
  experience_mode: 'standard', theme: 'dark', visual_theme: 'standard', reduce_motion: false, high_contrast: false,
  color_vision_mode: 'default', penalties_enabled: true, custom_quote: null, sidebar_collapsed: false,
  sounds_enabled: true, intense_effects_enabled: true, daily_welcome_enabled: true, weekly_review_enabled: true,
}
const PRIORITY_LABELS = { baja: 'Baja', media: 'Media', alta: 'Alta' }
const STATUS_LABELS = {
  pendiente: 'Pendiente', en_progreso: 'En progreso', pospuesta: 'Pospuesta',
  bloqueada: 'Bloqueada', cancelada: 'Cancelada', completada: 'Completada',
}

function formatError(error) {
  if (!error) return 'Error desconocido.'
  return [error.code, error.message, error.details, error.hint].filter(Boolean).join(' · ')
}

function groupByDate(items, dateKey = 'due_date') {
  return items.reduce((groups, item) => {
    const key = item[dateKey] || 'sin-fecha'
    if (!groups[key]) groups[key] = []
    groups[key].push(item)
    return groups
  }, {})
}

function getHashSection() {
  const section = window.location.hash.replace('#/', '').split('?')[0]
  return NAV_ITEMS.some((item) => item.id === section) ? section : 'inicio'
}

function getHashParams() {
  const query = window.location.hash.split('?')[1] || ''
  return new URLSearchParams(query)
}

function routineIsDueToday(routine, day = new Date().getDay()) {
  return !routine.scheduled_days?.length || routine.scheduled_days.includes(day)
}

function routineScheduleLabel(routine) {
  if (!routine.scheduled_days?.length) return 'Sin días fijos'
  const labels = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
  return routine.scheduled_days.map((day) => labels[day]).join(' · ')
}

function percentage(value, target) {
  if (!target) return 0
  return Math.max(0, Math.min(100, Math.round((Number(value || 0) / Number(target)) * 100)))
}

function makeSourceKey(id, date) {
  return `${id}:${date}`
}

function getWeekStartISO(date = new Date()) {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  const day = value.getDay()
  value.setDate(value.getDate() - (day === 0 ? 6 : day - 1))
  return toDateISO(value)
}

function getWeekEndISO(weekStart) {
  return toDateISO(addDays(new Date(`${weekStart}T00:00:00`), 6))
}

function habitFrequencyType(habit) { return habit.frequency_type || 'daily' }
function habitLogsInWeek(habitLogs, habitId, weekStart = getWeekStartISO()) {
  const weekEnd = getWeekEndISO(weekStart)
  return habitLogs.filter((log) => log.habit_id === habitId && log.log_date >= weekStart && log.log_date <= weekEnd)
}
function habitWeeklyProgress(habit, habitLogs, weekStart = getWeekStartISO()) {
  return habitLogsInWeek(habitLogs, habit.id, weekStart).reduce((sum, log) => sum + Number(log.value || 0), 0)
}
function habitWeeklyTarget(habit) { return Math.max(1, Number(habit.weekly_target || 1)) }
function habitDoneToday(habit, habitLogs, today) {
  if (habitFrequencyType(habit) === 'weekly_target') return habitWeeklyProgress(habit, habitLogs) >= habitWeeklyTarget(habit)
  return habitLogs.some((log) => log.habit_id === habit.id && log.log_date === today)
}
function habitWeeklyStreak(habit, habitLogs) {
  if (habitFrequencyType(habit) !== 'weekly_target') return 0
  const target = habitWeeklyTarget(habit)
  let streak = 0
  let weekStart = getWeekStartISO()
  for (let index = 0; index < 104; index += 1) {
    if (habitWeeklyProgress(habit, habitLogs, weekStart) < target) break
    streak += 1
    weekStart = toDateISO(addDays(new Date(`${weekStart}T00:00:00`), -7))
  }
  return streak
}

function nextReminderTrigger(reminder) {
  const next = new Date(reminder.next_trigger_at)
  const amount = Math.max(1, Number(reminder.recurrence_interval || 1))
  do {
    if (reminder.recurrence_type === 'daily') next.setDate(next.getDate() + amount)
    if (reminder.recurrence_type === 'weekly') next.setDate(next.getDate() + amount * 7)
    if (reminder.recurrence_type === 'monthly') next.setMonth(next.getMonth() + amount)
  } while (next <= new Date())
  return next.toISOString()
}

export default function Dashboard({ session }) {
  const user = session.user
  const today = getTodayISO()
  const recentDays = useMemo(() => createRecentDays(14), [])
  const weekDays = useMemo(() => createWeekDays(7), [])

  const [activeSection, setActiveSection] = useState(getHashSection)
  const [profile, setProfile] = useState({ id: user.id, display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Usuario' })
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [customCategories, setCustomCategories] = useState([])
  const [tasks, setTasks] = useState([])
  const [taskSubtasks, setTaskSubtasks] = useState([])
  const [tags, setTags] = useState([])
  const [taskTagLinks, setTaskTagLinks] = useState([])
  const [events, setEvents] = useState([])
  const [reminders, setReminders] = useState([])
  const [dailyNotes, setDailyNotes] = useState([])
  const [notes, setNotes] = useState([])
  const [notificationHistory, setNotificationHistory] = useState([])
  const [habits, setHabits] = useState([])
  const [habitLogs, setHabitLogs] = useState([])
  const [routines, setRoutines] = useState([])
  const [routineSteps, setRoutineSteps] = useState([])
  const [routineLogs, setRoutineLogs] = useState([])
  const [routineStepLogs, setRoutineStepLogs] = useState([])
  const [goals, setGoals] = useState([])
  const [milestones, setMilestones] = useState([])
  const [xpEvents, setXpEvents] = useState([])
  const [activeSeason, setActiveSeason] = useState(null)
  const [seasonProgress, setSeasonProgress] = useState(null)
  const [seasonHistory, setSeasonHistory] = useState([])
  const [dailyPlans, setDailyPlans] = useState([])
  const [weeklyReviews, setWeeklyReviews] = useState([])
  const [dailyWelcomeOpen, setDailyWelcomeOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [databaseIssue, setDatabaseIssue] = useState('')
  const [toast, setToast] = useState('')
  const [nowTick, setNowTick] = useState(Date.now())
  const [quickCreateOpen, setQuickCreateOpen] = useState(false)
  const [taskModal, setTaskModal] = useState({ open: false, task: null })
  const [habitModalOpen, setHabitModalOpen] = useState(false)
  const [routineModal, setRoutineModal] = useState({ open: false, routine: null })
  const [goalModal, setGoalModal] = useState({ open: false, goal: null })
  const [eventModal, setEventModal] = useState({ open: false, event: null, defaultDate: null })
  const [reminderModal, setReminderModal] = useState({ open: false, reminder: null })
  const [noteModal, setNoteModal] = useState({ open: false, note: null })
  const [activeReminder, setActiveReminder] = useState(null)
  const [celebrationQueue, setCelebrationQueue] = useState([])
  const [pendingActions, setPendingActions] = useState(() => new Set())
  const pendingActionRef = useRef(new Set())
  const shownReminderRef = useRef(new Set())
  const openedDeliveryRef = useRef(new Set())

  const categories = useMemo(() => mergeCategories(customCategories), [customCategories])
  const displayName = profile?.display_name || user.email?.split('@')[0] || 'Usuario'
  const visibleNavItems = useMemo(() => settings.experience_mode === 'simple' ? NAV_ITEMS.filter((item) => SIMPLE_NAV_IDS.has(item.id)) : NAV_ITEMS, [settings.experience_mode])

  const showToast = useCallback((message) => setToast(message), [])
  const isActionPending = useCallback((key) => pendingActionRef.current.has(key), [])
  const beginAction = useCallback((key) => {
    if (pendingActionRef.current.has(key)) return false
    pendingActionRef.current.add(key)
    setPendingActions(new Set(pendingActionRef.current))
    return true
  }, [])
  const endAction = useCallback((key) => {
    if (!pendingActionRef.current.has(key)) return
    pendingActionRef.current.delete(key)
    setPendingActions(new Set(pendingActionRef.current))
  }, [])
  const openRpgCelebration = useCallback((payload) => {
    if (settings.experience_mode === 'rpg') {
      setCelebrationQueue((current) => [...current, payload])
    }
  }, [settings.experience_mode, settings.visual_theme])

  const loadData = useCallback(async () => {
    setLoading(true)
    setDatabaseIssue('')
    const startDate = toDateISO(addDays(new Date(), -120))
    await supabase.rpc('rotate_expired_season')
    const results = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('user_settings').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('custom_categories').select('*').order('name'),
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('habits').select('*').eq('active', true).order('created_at', { ascending: false }),
      supabase.from('habit_logs').select('*').gte('log_date', startDate).order('log_date', { ascending: false }),
      supabase.from('routines').select('*').eq('active', true).order('created_at', { ascending: false }),
      supabase.from('routine_steps').select('*').order('position'),
      supabase.from('routine_logs').select('*').gte('log_date', startDate).order('log_date', { ascending: false }),
      supabase.from('routine_step_logs').select('*').gte('log_date', startDate).order('log_date', { ascending: false }),
      supabase.from('goals').select('*').neq('status', 'cancelled').order('created_at', { ascending: false }),
      supabase.from('goal_milestones').select('*').order('position'),
      supabase.from('xp_events').select('*').order('occurred_on', { ascending: false }),
      supabase.from('task_subtasks').select('*').order('position'),
      supabase.from('tags').select('*').order('name'),
      supabase.from('task_tag_links').select('*'),
      supabase.from('events').select('*').order('event_date'),
      supabase.from('reminders').select('*').order('next_trigger_at'),
      supabase.from('daily_notes').select('*').order('note_date', { ascending: false }),
      supabase.from('notes').select('*').order('updated_at', { ascending: false }),
      supabase.from('notification_history').select('*').order('fired_at', { ascending: false }).limit(50),
      supabase.from('seasons').select('*').eq('active', true).order('starts_on', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('user_season_progress').select('*').order('updated_at', { ascending: false }),
      supabase.from('user_season_history').select('*').order('created_at', { ascending: false }),
      supabase.from('daily_plans').select('*').order('plan_date', { ascending: false }).limit(30),
      supabase.from('weekly_reviews').select('*').order('week_start', { ascending: false }).limit(16),
    ])

    const firstError = results.find((result) => result.error)?.error
    if (firstError) {
      setDatabaseIssue(formatError(firstError))
      showToast('La base de datos necesita la migración V5.')
    }

    setProfile(results[0].data || { id: user.id, display_name: user.user_metadata?.display_name || 'Usuario' })
    setSettings({ ...DEFAULT_SETTINGS, ...(results[1].data || {}) })
    setCustomCategories(results[2].data || [])
    setTasks(results[3].data || [])
    setHabits(results[4].data || [])
    setHabitLogs(results[5].data || [])
    setRoutines(results[6].data || [])
    setRoutineSteps(results[7].data || [])
    setRoutineLogs(results[8].data || [])
    setRoutineStepLogs(results[9].data || [])
    setGoals(results[10].data || [])
    setMilestones(results[11].data || [])
    setXpEvents(results[12].data || [])
    setTaskSubtasks(results[13].data || [])
    setTags(results[14].data || [])
    setTaskTagLinks(results[15].data || [])
    setEvents(results[16].data || [])
    setReminders(results[17].data || [])
    setDailyNotes(results[18].data || [])
    setNotes(results[19].data || [])
    setNotificationHistory(results[20].data || [])
    const nextSeason = results[21].data || null
    let nextSeasonProgress = (results[22].data || []).find((item) => item.season_id === nextSeason?.id) || null
    if (nextSeason && !nextSeasonProgress) {
      const { data } = await supabase.from('user_season_progress').upsert({ user_id: user.id, season_id: nextSeason.id, points: 0 }, { onConflict: 'user_id,season_id' }).select().single()
      nextSeasonProgress = data || { user_id: user.id, season_id: nextSeason.id, points: 0 }
    }
    setActiveSeason(nextSeason)
    setSeasonProgress(nextSeasonProgress)
    setSeasonHistory(results[23].data || [])
    setDailyPlans(results[24]?.data || [])
    setWeeklyReviews(results[25]?.data || [])
    setLoading(false)
  }, [showToast, user.id, user.user_metadata?.display_name])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    document.body.dataset.theme = settings.theme
    document.body.dataset.mode = settings.experience_mode
    document.body.dataset.contrast = settings.high_contrast ? 'high' : 'normal'
    document.body.dataset.colorVision = settings.color_vision_mode
    document.body.dataset.reduceMotion = settings.reduce_motion ? 'true' : 'false'
    document.body.dataset.visualTheme = settings.visual_theme || 'standard'
    document.body.dataset.intenseEffects = settings.intense_effects_enabled ? 'true' : 'false'
  }, [settings])

  useEffect(() => {
    function syncHash() { setActiveSection(getHashSection()) }
    window.addEventListener('hashchange', syncHash)
    if (!window.location.hash) window.location.hash = '/inicio'
    return () => window.removeEventListener('hashchange', syncHash)
  }, [])

  useEffect(() => {
    if (settings.experience_mode === 'simple' && !SIMPLE_NAV_IDS.has(activeSection)) window.location.hash = '/inicio'
  }, [activeSection, settings.experience_mode])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(''), 3300)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (loading || settings.daily_welcome_enabled === false) return
    const key = `ascenda:daily-welcome:${user.id}:${today}`
    if (localStorage.getItem(key) !== 'seen') setDailyWelcomeOpen(true)
  }, [loading, settings.daily_welcome_enabled, today, user.id])

  function closeDailyWelcome() {
    localStorage.setItem(`ascenda:daily-welcome:${user.id}:${today}`, 'seen')
    setDailyWelcomeOpen(false)
  }

  const metrics = useMemo(() => {
    const totalXp = xpEvents.reduce((sum, event) => sum + Number(event.amount || 0), 0)
    const levelInfo = calculateLevel(totalXp)
    const streak = calculateStreak(xpEvents.map((event) => event.occurred_on), today)
    const week = weekDays.map((day) => ({ ...day, value: xpEvents.filter((event) => event.occurred_on === day.iso).reduce((sum, event) => sum + Number(event.amount || 0), 0) }))
    const weekMax = Math.max(1, ...week.map((day) => day.value))
    const tasksToday = tasks.filter((task) => task.due_date === today && task.status !== 'cancelada')
    const habitsDone = habits.filter((habit) => habitDoneToday(habit, habitLogs, today))
    const dueRoutines = routines.filter((routine) => routineIsDueToday(routine))
    const routinesDone = dueRoutines.filter((routine) => routineLogs.some((log) => log.routine_id === routine.id && log.log_date === today && log.completed))
    const totalDaily = tasksToday.length + habits.length + dueRoutines.length
    const dailyDone = tasksToday.filter((task) => task.completed).length + habitsDone.length + routinesDone.length
    return {
      ...levelInfo,
      streak,
      streakBonus: getStreakBonusPercent(streak),
      tasksCompletedToday: tasksToday.filter((task) => task.completed).length,
      habitsCompletedToday: habitsDone.length,
      routinesCompletedToday: routinesDone.length,
      dailyPercentage: totalDaily ? Math.round((dailyDone / totalDaily) * 100) : 0,
      week: week.map((day) => ({ ...day, percentage: Math.max(4, Math.round((day.value / weekMax) * 100)) })),
    }
  }, [xpEvents, tasks, habits, habitLogs, routines, routineLogs, today, weekDays])

  const seasonMetrics = useMemo(() => {
    const points = Number(seasonProgress?.points || 0)
    const rank = getSeasonRank(points, settings.visual_theme)
    const bestPoints = Math.max(points, ...seasonHistory.map((item) => Number(item.final_points || 0)), 0)
    return { points, rank, bestRankLabel: getSeasonRank(bestPoints, settings.visual_theme).displayName }
  }, [seasonProgress, seasonHistory, settings.visual_theme])

  const nextActivity = useMemo(() => {
    const now = new Date(nowTick)
    const options = []
    tasks.filter((task) => !task.completed && task.status !== 'cancelada' && task.due_date).forEach((task) => {
      options.push({ type: 'Tarea', title: task.title, date: dateTimeFromParts(task.due_date, task.due_time), subtitle: task.due_time ? safeTime(task.due_time) : 'Durante el día', priority: task.priority })
    })
    routines.filter((routine) => routine.active).forEach((routine) => {
      for (let offset = 0; offset < 8; offset += 1) {
        const date = addDays(now, offset)
        if (!routine.scheduled_days?.length || routine.scheduled_days.includes(date.getDay())) {
          const iso = toDateISO(date)
          const dateTime = dateTimeFromParts(iso, routine.scheduled_time || '23:59')
          if (dateTime >= now) options.push({ type: 'Rutina', title: routine.title, date: dateTime, subtitle: routine.scheduled_time ? safeTime(routine.scheduled_time) : 'Sin horario fijo' })
          break
        }
      }
    })
    goals.filter((goal) => goal.status === 'active' && goal.due_date).forEach((goal) => options.push({ type: 'Objetivo', title: goal.title, date: dateTimeFromParts(goal.due_date), subtitle: 'Fecha límite' }))
    habits.filter((habit) => !habitDoneToday(habit, habitLogs, today)).forEach((habit) => options.push({ type: 'Hábito', title: habit.title, date: dateTimeFromParts(today), subtitle: habitFrequencyType(habit) === 'weekly_target' ? `${habitWeeklyProgress(habit, habitLogs)} de ${habitWeeklyTarget(habit)} sesiones esta semana` : 'Pendiente de hoy' }))
    events.filter((event) => event.status !== 'cancelled' && event.event_date).forEach((event) => options.push({ type: 'Evento', title: event.title, date: dateTimeFromParts(event.event_date, event.all_day ? '23:59' : event.start_time), subtitle: event.all_day ? 'Durante el día' : safeTime(event.start_time) || 'Sin horario' }))
    reminders.filter((reminder) => reminder.status === 'active').forEach((reminder) => options.push({ type: 'Recordatorio', title: reminder.title, date: new Date(reminder.next_trigger_at), subtitle: reminder.priority === 'alarm' ? 'Alarma' : 'Aviso programado' }))
    return options.filter((item) => item.date && item.date >= now).sort((a, b) => a.date - b.date)[0] || null
  }, [tasks, routines, goals, habits, habitLogs, events, reminders, today, nowTick])

  function navigate(section) { window.location.hash = `/${section}` }
  function openCreate(type) {
    setQuickCreateOpen(false)
    if (type === 'task') setTaskModal({ open: true, task: null })
    if (type === 'event') setEventModal({ open: true, event: null, defaultDate: today })
    if (type === 'reminder') setReminderModal({ open: true, reminder: null })
    if (type === 'note') setNoteModal({ open: true, note: null })
    if (type === 'daily_note') { saveDailyNote({ note_date: today, title: 'Nueva entrada', content_html: '', color: '#38d9c6', is_pinned: false }, null); navigate('agenda') }
    if (type === 'habit') setHabitModalOpen(true)
    if (type === 'routine') setRoutineModal({ open: true, routine: null })
    if (type === 'goal') setGoalModal({ open: true, goal: null })
  }

  async function syncSeasonProgress() {
    if (!activeSeason) return null
    const { data, error } = await supabase.rpc('sync_active_season_progress').single()
    if (error) {
      showToast(`No se pudo sincronizar la temporada: ${formatError(error)}`)
      return null
    }
    setSeasonProgress(data)
    return data
  }

  async function awardSeasonPoints({ sourceType, sourceKey, reason, baseAmount }) {
    if (!activeSeason) return { amount: 0, rankUp: false, rank: seasonMetrics.rank }
    const previousPoints = Number(seasonProgress?.points || 0)
    const amount = calculateSeasonPoints(baseAmount)
    const payload = {
      user_id: user.id,
      season_id: activeSeason.id,
      source_type: sourceType,
      source_key: sourceKey,
      reason,
      amount,
    }
    const { error } = await supabase.from('season_point_events').upsert(payload, { onConflict: 'user_id,season_id,source_type,source_key' })
    if (error) {
      showToast(`No se pudo registrar puntos de temporada: ${formatError(error)}`)
      return { amount: 0, rankUp: false, rank: getSeasonRank(previousPoints, settings.visual_theme) }
    }
    const progress = await syncSeasonProgress()
    const nextPoints = Number(progress?.points ?? previousPoints)
    const previousRank = getSeasonRank(previousPoints, settings.visual_theme)
    const nextRank = getSeasonRank(nextPoints, settings.visual_theme)
    const rankUp = nextRank.order > previousRank.order
    if (rankUp) {
      playAscendaSound('rank', settings)
      openRpgCelebration({
        type: 'rank',
        rank: nextRank.displayName,
        title: 'Tu energía de temporada aumentó',
        subtitle: `Ascendiste desde ${previousRank.displayName}. El rango se reiniciará al finalizar la temporada, pero tu nivel general permanecerá intacto.`,
        seasonPoints: amount,
      })
    }
    return { amount, rankUp, rank: nextRank }
  }

  async function awardXp({ sourceType, sourceKey, reason, baseAmount }) {
    const projectedStreak = calculateProjectedStreak(xpEvents.map((event) => event.occurred_on), today)
    const multiplier = getStreakMultiplier(projectedStreak)
    const amount = applyStreakBonus(baseAmount, projectedStreak)
    const previousEvent = xpEvents.find((event) => event.source_type === sourceType && event.source_key === sourceKey)
    const previousTotal = xpEvents.reduce((sum, event) => sum + Number(event.amount || 0), 0)
    const payload = { user_id: user.id, source_type: sourceType, source_key: sourceKey, reason, base_amount: Number(baseAmount || 0), multiplier, amount, occurred_on: today }
    const { data, error } = await supabase.from('xp_events').upsert(payload, { onConflict: 'user_id,source_type,source_key' }).select().single()
    if (error) { showToast(`No se pudo registrar XP: ${formatError(error)}`); return { amount: 0, seasonPoints: 0, levelUp: false, titleUp: false, level: calculateLevel(previousTotal).level } }
    const nextTotal = previousTotal - Number(previousEvent?.amount || 0) + Number(data.amount || 0)
    const previousLevelInfo = calculateLevel(previousTotal)
    const nextLevelInfo = calculateLevel(nextTotal)
    const levelUp = nextLevelInfo.level > previousLevelInfo.level
    const titleUp = nextLevelInfo.title !== previousLevelInfo.title
    setXpEvents((current) => [data, ...current.filter((event) => !(event.source_type === sourceType && event.source_key === sourceKey))])
    const seasonReward = await awardSeasonPoints({ sourceType, sourceKey, reason, baseAmount })

    if (titleUp) {
      playAscendaSound('title', settings)
      openRpgCelebration({
        type: 'title',
        level: nextLevelInfo.level,
        unlockedTitle: nextLevelInfo.title,
        title: `Desbloqueaste el título ${nextLevelInfo.title}`,
        subtitle: 'Tu progreso permanente alcanzó una nueva etapa. Este título no se reinicia con las temporadas.',
        xp: amount,
        seasonPoints: seasonReward.amount,
      })
    } else if (levelUp) {
      playAscendaSound('level', settings)
      openRpgCelebration({
        type: 'level',
        level: nextLevelInfo.level,
        title: `Alcanzaste el nivel ${nextLevelInfo.level}`,
        subtitle: `Título actual: ${nextLevelInfo.title}. Tu constancia fortaleció tu perfil.`,
        xp: amount,
        seasonPoints: seasonReward.amount,
      })
    } else {
      playAscendaSound('reward', settings)
    }
    return { amount, seasonPoints: seasonReward.amount, rankUp: seasonReward.rankUp, levelUp, titleUp, level: nextLevelInfo.level }
  }

  async function removeXp(sourceType, sourceKey) {
    await supabase.from('xp_events').delete().eq('source_type', sourceType).eq('source_key', sourceKey)
    setXpEvents((current) => current.filter((event) => !(event.source_type === sourceType && event.source_key === sourceKey)))
    if (activeSeason) {
      await supabase.from('season_point_events').delete().eq('season_id', activeSeason.id).eq('source_type', sourceType).eq('source_key', sourceKey)
      await syncSeasonProgress()
    }
  }

  async function ensureTag(name) {
    const normalized = name.trim()
    if (!normalized) return null
    const local = tags.find((tag) => tag.name.toLowerCase() === normalized.toLowerCase())
    if (local) return local
    const { data: existing } = await supabase.from('tags').select('*').ilike('name', normalized).maybeSingle()
    if (existing) { setTags((current) => current.some((tag) => tag.id === existing.id) ? current : [...current, existing]); return existing }
    const { data, error } = await supabase.from('tags').insert({ user_id: user.id, name: normalized }).select().single()
    if (error) { showToast(`No se pudo crear la etiqueta ${normalized}: ${formatError(error)}`); return null }
    setTags((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name)))
    return data
  }

  async function saveTask(payload, existingTask) {
    if (!payload.title) return false
    const { subtasks: nextSubtasks = [], tag_names: tagNames = [], ...taskPayload } = payload
    let taskData
    if (existingTask) {
      const { data, error } = await supabase.from('tasks').update(taskPayload).eq('id', existingTask.id).select().single()
      if (error) { showToast(`No se pudo actualizar: ${formatError(error)}`); return false }
      taskData = data
      setTasks((current) => current.map((task) => task.id === data.id ? data : task))
      await supabase.from('task_subtasks').delete().eq('task_id', data.id)
      await supabase.from('task_tag_links').delete().eq('task_id', data.id)
      if (!existingTask.completed && data.completed) await awardXp({ sourceType: 'task', sourceKey: data.id, reason: 'Tarea completada', baseAmount: data.xp_reward })
      if (existingTask.completed && !data.completed) await removeXp('task', data.id)
    } else {
      const { data, error } = await supabase.from('tasks').insert({ ...taskPayload, user_id: user.id }).select().single()
      if (error) { showToast(`No se pudo crear la tarea: ${formatError(error)}`); return false }
      taskData = data
      setTasks((current) => [data, ...current])
      if (data.completed) await awardXp({ sourceType: 'task', sourceKey: data.id, reason: 'Tarea completada', baseAmount: data.xp_reward })
    }
    if (nextSubtasks.length) {
      const rows = nextSubtasks.map((subtask, position) => ({ user_id: user.id, task_id: taskData.id, title: subtask.title, completed: Boolean(subtask.completed), position }))
      const { data, error } = await supabase.from('task_subtasks').insert(rows).select()
      if (error) showToast(`La tarea se guardó, pero fallaron subtareas: ${formatError(error)}`)
      else setTaskSubtasks((current) => [...current.filter((item) => item.task_id !== taskData.id), ...(data || [])])
    } else setTaskSubtasks((current) => current.filter((item) => item.task_id !== taskData.id))
    const selectedTags = []
    for (const name of [...new Set(tagNames)]) { const tag = await ensureTag(name); if (tag) selectedTags.push(tag) }
    if (selectedTags.length) {
      const links = selectedTags.map((tag) => ({ user_id: user.id, task_id: taskData.id, tag_id: tag.id }))
      const { data } = await supabase.from('task_tag_links').insert(links).select()
      setTaskTagLinks((current) => [...current.filter((item) => item.task_id !== taskData.id), ...(data || links)])
    } else setTaskTagLinks((current) => current.filter((item) => item.task_id !== taskData.id))
    showToast(existingTask ? 'Tarea actualizada correctamente.' : 'Tarea creada correctamente.')
    return true
  }

  async function toggleTask(task) {
    const actionKey = `task:${task.id}`
    if (!beginAction(actionKey)) return
    try {
      const completed = !task.completed
      const optimistic = { ...task, completed, status: completed ? 'completada' : 'pendiente', completed_at: completed ? new Date().toISOString() : null }
      setTasks((current) => current.map((item) => item.id === task.id ? optimistic : item))
      const { error } = await supabase.from('tasks').update({ completed: optimistic.completed, status: optimistic.status, completed_at: optimistic.completed_at }).eq('id', task.id)
      if (error) { setTasks((current) => current.map((item) => item.id === task.id ? task : item)); showToast(`No se pudo actualizar: ${formatError(error)}`); return }
      if (completed) {
        const reward = await awardXp({ sourceType: 'task', sourceKey: task.id, reason: 'Tarea completada', baseAmount: task.xp_reward })
        if (!reward.levelUp && !reward.titleUp && !reward.rankUp) openRpgCelebration({ type: 'task', title: task.title, subtitle: 'Completaste una misión y reforzaste tu progreso diario.', xp: reward.amount, seasonPoints: reward.seasonPoints })
        showToast(`Tarea completada · +${reward.amount} XP · +${reward.seasonPoints} PT`)
      } else {
        await removeXp('task', task.id)
        showToast('Tarea reabierta.')
      }
    } finally {
      endAction(actionKey)
    }
  }

  async function deleteTask(taskId) {
    if (!window.confirm('¿Eliminar esta tarea? Esta acción no se puede deshacer.')) return
    const { error } = await supabase.from('tasks').delete().eq('id', taskId)
    if (error) { showToast(`No se pudo eliminar: ${formatError(error)}`); return }
    await removeXp('task', taskId)
    setTasks((current) => current.filter((task) => task.id !== taskId))
    setTaskSubtasks((current) => current.filter((item) => item.task_id !== taskId))
    setTaskTagLinks((current) => current.filter((item) => item.task_id !== taskId))
    showToast('Tarea eliminada.')
  }

  async function toggleSubtask(subtask) {
    const completed = !subtask.completed
    const { data, error } = await supabase.from('task_subtasks').update({ completed }).eq('id', subtask.id).select().single()
    if (error) { showToast(`No se pudo actualizar la subtarea: ${formatError(error)}`); return }
    setTaskSubtasks((current) => current.map((item) => item.id === data.id ? data : item))
  }

  async function saveEvent(payload, existingEvent) {
    const query = existingEvent?.id ? supabase.from('events').update(payload).eq('id', existingEvent.id) : supabase.from('events').insert({ ...payload, user_id: user.id })
    const { data, error } = await query.select().single()
    if (error) { showToast(`No se pudo guardar el evento: ${formatError(error)}`); return false }
    setEvents((current) => existingEvent?.id ? current.map((item) => item.id === data.id ? data : item) : [...current, data])
    showToast(existingEvent?.id ? 'Evento actualizado.' : 'Evento creado.')
    return true
  }
  async function deleteEvent(id) { if (!window.confirm('¿Eliminar este evento? Esta acción no se puede deshacer.')) return; const { error } = await supabase.from('events').delete().eq('id', id); if (error) return showToast(`No se pudo eliminar el evento: ${formatError(error)}`); setEvents((current) => current.filter((item) => item.id !== id)); showToast('Evento eliminado.') }

  async function saveReminder(payload, existingReminder) {
    const query = existingReminder?.id ? supabase.from('reminders').update(payload).eq('id', existingReminder.id) : supabase.from('reminders').insert({ ...payload, user_id: user.id })
    const { data, error } = await query.select().single()
    if (error) { showToast(`No se pudo guardar el recordatorio: ${formatError(error)}`); return false }
    shownReminderRef.current.delete(data.id)
    setReminders((current) => existingReminder?.id ? current.map((item) => item.id === data.id ? data : item) : [...current, data])
    showToast('Recordatorio guardado.')
    return true
  }
  async function deleteReminder(id) { if (!window.confirm('¿Eliminar este recordatorio? Esta acción no se puede deshacer.')) return; const { error } = await supabase.from('reminders').delete().eq('id', id); if (error) return showToast(`No se pudo eliminar: ${formatError(error)}`); setReminders((current) => current.filter((item) => item.id !== id)); showToast('Recordatorio eliminado.') }
  async function toggleReminderEnabled(reminder) { const enabled = reminder.enabled === false; const { data, error } = await supabase.from('reminders').update({ enabled }).eq('id', reminder.id).select().single(); if (error) return showToast(`No se pudo actualizar: ${formatError(error)}`); shownReminderRef.current.delete(reminder.id); setReminders((current) => current.map((item) => item.id === data.id ? data : item)); showToast(enabled ? 'Recordatorio activado.' : 'Recordatorio pausado.') }
  async function updateNotificationHistoryItem(id, patch) { const { data, error } = await supabase.from('notification_history').update(patch).eq('id', id).select().maybeSingle(); if (!error && data) setNotificationHistory((current) => current.map((item) => item.id === data.id ? data : item)); return data }
  async function logReminder(reminder, action, patch = {}) { const payload = { user_id:user.id, reminder_id:reminder.id, title:reminder.title, action, ...patch }; if (reminder._delivery_id) return updateNotificationHistoryItem(reminder._delivery_id, { action, ...patch }); const { data } = await supabase.from('notification_history').insert(payload).select().single(); if (data) setNotificationHistory((current) => [data, ...current]); return data }
  async function dismissReminder(reminder) { const viewedAt = new Date().toISOString(); await logReminder(reminder, 'viewed', { delivery_status:'viewed', viewed_at:viewedAt }); const payload = { last_viewed_at:viewedAt }; if (!reminder._server_claimed) { if (reminder.recurrence_type === 'none') payload.status = 'dismissed'; else payload.next_trigger_at = nextReminderTrigger(reminder) } const { data, error } = await supabase.from('reminders').update(payload).eq('id', reminder.id).select().single(); if (!error && data) setReminders((current)=>current.map(r=>r.id===reminder.id?data:r)); shownReminderRef.current.delete(reminder.id); setActiveReminder(null) }
  async function snoozeReminder(reminder, minutes) { const next = new Date(Date.now()+minutes*60000).toISOString(); const snoozedAt = new Date().toISOString(); await logReminder(reminder, 'snoozed', { delivery_status:'snoozed', snoozed_until:next }); const { data, error } = await supabase.from('reminders').update({ next_trigger_at:next, status:'active', enabled:true, last_snoozed_at:snoozedAt, last_sent_at:null }).eq('id', reminder.id).select().single(); if (!error && data) setReminders((current)=>current.map(r=>r.id===reminder.id?data:r)); shownReminderRef.current.delete(reminder.id); setActiveReminder(null) }

  async function saveDailyNote(payload, existingNote) { const query=existingNote?.id?supabase.from('daily_notes').update(payload).eq('id',existingNote.id):supabase.from('daily_notes').insert({...payload,user_id:user.id}); const {data,error}=await query.select().single(); if(error){showToast(`No se pudo guardar la anotación: ${formatError(error)}`);return false} setDailyNotes(current=>existingNote?.id?current.map(n=>n.id===data.id?data:n):[data,...current]); return true }
  async function deleteDailyNote(id){if(!window.confirm('¿Eliminar esta entrada de agenda? Esta acción no se puede deshacer.'))return;const {error}=await supabase.from('daily_notes').delete().eq('id',id);if(error)return showToast(`No se pudo eliminar: ${formatError(error)}`);setDailyNotes(current=>current.filter(n=>n.id!==id))}
  async function saveNote(payload, existingNote) { const query=existingNote?.id?supabase.from('notes').update(payload).eq('id',existingNote.id):supabase.from('notes').insert({...payload,user_id:user.id}); const {data,error}=await query.select().single();if(error){showToast(`No se pudo guardar la nota: ${formatError(error)}`);return false}setNotes(current=>existingNote?.id?current.map(n=>n.id===data.id?data:n):[data,...current]);showToast('Nota guardada.');return true }
  async function deleteNote(id){if(!window.confirm('¿Eliminar esta nota? Esta acción no se puede deshacer.'))return;const {error}=await supabase.from('notes').delete().eq('id',id);if(error)return showToast(`No se pudo eliminar la nota: ${formatError(error)}`);setNotes(current=>current.filter(n=>n.id!==id));showToast('Nota eliminada.')}
  function createTaskFromText(text){setTaskModal({open:true,task:{title:(text||'Nueva tarea').slice(0,180),description:null,status:'pendiente'}})}
  function createReminderFromText(text){setReminderModal({open:true,reminder:{title:(text||'Nuevo recordatorio').slice(0,180)}})}

  async function saveHabit(payload) {
    const { data, error } = await supabase.from('habits').insert({ ...payload, user_id: user.id }).select().single()
    if (error) { showToast(`No se pudo crear el hábito: ${formatError(error)}`); return false }
    setHabits((current) => [data, ...current])
    showToast('Hábito creado correctamente.')
    return true
  }

  async function toggleHabit(habit, weeklyDelta = 1) {
    if (habitFrequencyType(habit) === 'weekly_target') return changeWeeklyHabitSessions(habit, weeklyDelta)
    const sourceKey = makeSourceKey(habit.id, today)
    const actionKey = `habit:${sourceKey}`
    if (!beginAction(actionKey)) return
    try {
      const { data: databaseLog, error: readError } = await supabase.from('habit_logs').select('*').eq('user_id', user.id).eq('habit_id', habit.id).eq('log_date', today).maybeSingle()
      if (readError) { showToast(`No se pudo consultar el hábito: ${formatError(readError)}`); return }
      if (databaseLog) {
        const { error } = await supabase.from('habit_logs').delete().eq('id', databaseLog.id)
        if (error) { showToast(`No se pudo actualizar el hábito: ${formatError(error)}`); return }
        setHabitLogs((current) => current.filter((log) => log.id !== databaseLog.id))
        await removeXp('habit', sourceKey)
        showToast('Hábito marcado como pendiente.')
        return
      }
      const { data, error } = await supabase.from('habit_logs').upsert({ user_id: user.id, habit_id: habit.id, log_date: today, value: habit.target }, { onConflict: 'user_id,habit_id,log_date' }).select().single()
      if (error) { showToast(`No se pudo registrar el hábito: ${formatError(error)}`); return }
      setHabitLogs((current) => [data, ...current.filter((log) => !(log.habit_id === habit.id && log.log_date === today))])
      const reward = await awardXp({ sourceType: 'habit', sourceKey, reason: 'Hábito completado', baseAmount: habit.xp_reward || 8 })
      showToast(`Hábito completado · +${reward.amount} XP · +${reward.seasonPoints} PT`)
    } finally {
      endAction(actionKey)
    }
  }

  async function changeWeeklyHabitSessions(habit, delta) {
    const actionKey = `weekly-habit:${habit.id}:${today}`
    if (!beginAction(actionKey)) return
    try {
      const { data: databaseLog, error: readError } = await supabase.from('habit_logs').select('*').eq('user_id', user.id).eq('habit_id', habit.id).eq('log_date', today).maybeSingle()
      if (readError) { showToast(`No se pudo consultar el hábito: ${formatError(readError)}`); return }
      const currentValue = Number(databaseLog?.value || 0)
      const nextValue = Math.max(0, currentValue + delta)
      if (nextValue === currentValue) return
      if (nextValue === 0 && databaseLog) {
        const { error } = await supabase.from('habit_logs').delete().eq('id', databaseLog.id)
        if (error) { showToast(`No se pudo actualizar el hábito: ${formatError(error)}`); return }
        setHabitLogs((current) => current.filter((log) => log.id !== databaseLog.id))
      } else {
        const { data, error } = await supabase.from('habit_logs').upsert({ user_id: user.id, habit_id: habit.id, log_date: today, value: nextValue }, { onConflict: 'user_id,habit_id,log_date' }).select().single()
        if (error) { showToast(`No se pudo registrar la sesión: ${formatError(error)}`); return }
        setHabitLogs((current) => [data, ...current.filter((log) => !(log.habit_id === habit.id && log.log_date === today))])
      }
      if (delta > 0) {
        const reward = await awardXp({ sourceType: 'habit_session', sourceKey: `${habit.id}:${today}:${nextValue}`, reason: `Sesión registrada: ${habit.title}`, baseAmount: habit.xp_reward || 8 })
        const nextProgress = habitWeeklyProgress(habit, habitLogs.filter((log) => !(log.habit_id === habit.id && log.log_date === today)).concat(nextValue ? [{ habit_id: habit.id, log_date: today, value: nextValue }] : []))
        showToast(`Sesión registrada · ${nextProgress} de ${habitWeeklyTarget(habit)} esta semana · +${reward.amount} XP`)
      } else {
        await removeXp('habit_session', `${habit.id}:${today}:${currentValue}`)
        showToast('Última sesión de hoy deshecha.')
      }
    } finally {
      endAction(actionKey)
    }
  }

  async function deleteHabit(habitId) {
    if (!window.confirm('¿Eliminar este hábito y todo su historial? Esta acción no se puede deshacer.')) return
    const { error } = await supabase.from('habits').delete().eq('id', habitId)
    if (error) { showToast(`No se pudo eliminar el hábito: ${formatError(error)}`); return }
    await supabase.from('xp_events').delete().in('source_type', ['habit', 'habit_session']).like('source_key', `${habitId}:%`)
    if (activeSeason) {
      await supabase.from('season_point_events').delete().eq('season_id', activeSeason.id).in('source_type', ['habit', 'habit_session']).like('source_key', `${habitId}:%`)
      await syncSeasonProgress()
    }
    setXpEvents((current) => current.filter((event) => !(['habit', 'habit_session'].includes(event.source_type) && event.source_key.startsWith(`${habitId}:`))))
    setHabits((current) => current.filter((habit) => habit.id !== habitId))
    setHabitLogs((current) => current.filter((log) => log.habit_id !== habitId))
    showToast('Hábito eliminado.')
  }

  async function saveRoutine(payload, existingRoutine) {
    const { steps, ...routinePayload } = payload
    let routineId = existingRoutine?.id
    if (existingRoutine) {
      const { error } = await supabase.from('routines').update(routinePayload).eq('id', existingRoutine.id)
      if (error) { showToast(`No se pudo actualizar la rutina: ${formatError(error)}`); return false }
      await supabase.from('xp_events').delete().eq('source_type', 'routine_step').like('source_key', `${routineId}:%`)
      await supabase.from('xp_events').delete().eq('source_type', 'routine').like('source_key', `${routineId}:%`)
      if (activeSeason) {
        await supabase.from('season_point_events').delete().eq('season_id', activeSeason.id).like('source_key', `${routineId}:%`)
        await syncSeasonProgress()
      }
      await supabase.from('routine_steps').delete().eq('routine_id', routineId)
    } else {
      const { data, error } = await supabase.from('routines').insert({ ...routinePayload, user_id: user.id }).select().single()
      if (error) { showToast(`No se pudo crear la rutina: ${formatError(error)}`); return false }
      routineId = data.id
    }
    if (steps.length) {
      const { error } = await supabase.from('routine_steps').insert(steps.map((step, position) => ({ ...step, position, routine_id: routineId, user_id: user.id })))
      if (error) { showToast(`La rutina se guardó, pero fallaron los pasos: ${formatError(error)}`); return false }
    }
    await loadData()
    showToast(existingRoutine ? 'Rutina actualizada.' : 'Rutina creada correctamente.')
    return true
  }

  async function syncRoutineCompletion(routine, nextLogs) {
    const steps = routineSteps.filter((step) => step.routine_id === routine.id)
    const completed = steps.length > 0 && steps.every((step) => nextLogs.some((log) => log.step_id === step.id && log.log_date === today))
    const existing = routineLogs.find((log) => log.routine_id === routine.id && log.log_date === today)
    const sourceKey = makeSourceKey(routine.id, today)
    const payload = { user_id: user.id, routine_id: routine.id, log_date: today, completed, xp_earned: completed ? routine.xp_bonus : 0 }
    const { data, error } = await supabase.from('routine_logs').upsert(payload, { onConflict: 'user_id,routine_id,log_date' }).select().single()
    if (error) { showToast(`No se pudo sincronizar la rutina: ${formatError(error)}`); return }
    if (data) setRoutineLogs((current) => [data, ...current.filter((log) => log.id !== data.id)])
    if (completed && !existing?.completed) {
      const reward = await awardXp({ sourceType: 'routine', sourceKey, reason: `Bonus por rutina: ${routine.title}`, baseAmount: routine.xp_bonus })
      if (!reward.levelUp && !reward.titleUp && !reward.rankUp) openRpgCelebration({ type: 'routine', title: routine.title, subtitle: 'Dominaste todos los pasos de la secuencia y reclamaste el bonus final.', xp: reward.amount, seasonPoints: reward.seasonPoints })
      showToast(`Rutina completada · +${reward.amount} XP · +${reward.seasonPoints} PT`)
    }
    if (!completed && existing?.completed) await removeXp('routine', sourceKey)
  }

  async function toggleRoutineStep(routine, step) {
    const actionKey = `routine-step:${step.id}:${today}`
    if (!beginAction(actionKey)) return
    const sourceKey = `${routine.id}:${step.id}:${today}`
    try {
      const { data: databaseLog, error: readError } = await supabase
        .from('routine_step_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('step_id', step.id)
        .eq('log_date', today)
        .maybeSingle()
      if (readError) { showToast(`No se pudo consultar el paso: ${formatError(readError)}`); return }

      if (databaseLog) {
        const { error } = await supabase.from('routine_step_logs').delete().eq('id', databaseLog.id)
        if (error) { showToast(`No se pudo actualizar el paso: ${formatError(error)}`); return }
        const nextLogs = routineStepLogs.filter((log) => !(log.step_id === step.id && log.log_date === today))
        setRoutineStepLogs(nextLogs)
        await removeXp('routine_step', sourceKey)
        await syncRoutineCompletion(routine, nextLogs)
        showToast('Paso marcado como pendiente.')
        return
      }

      const { data, error } = await supabase.from('routine_step_logs').upsert({
        user_id: user.id, routine_id: routine.id, step_id: step.id, log_date: today, completed: true, xp_earned: step.xp_reward,
      }, { onConflict: 'user_id,step_id,log_date' }).select().single()
      if (error) { showToast(`No se pudo completar el paso: ${formatError(error)}`); return }
      const nextLogs = [data, ...routineStepLogs.filter((log) => !(log.step_id === step.id && log.log_date === today))]
      setRoutineStepLogs(nextLogs)
      const reward = await awardXp({ sourceType: 'routine_step', sourceKey, reason: `Paso de rutina: ${step.title}`, baseAmount: step.xp_reward })
      showToast(`Paso completado · +${reward.amount} XP · +${reward.seasonPoints} PT`)
      await syncRoutineCompletion(routine, nextLogs)
    } finally {
      endAction(actionKey)
    }
  }

  async function duplicateRoutine(routine) {
    const steps = routineSteps.filter((step) => step.routine_id === routine.id).map(({ title, duration_minutes, xp_reward, position }) => ({ title, duration_minutes, xp_reward, position }))
    await saveRoutine({
      title: `${routine.title} · copia`, description: routine.description, category: routine.category,
      category_id: routine.category_id, routine_type: routine.routine_type, scheduled_days: routine.scheduled_days,
      scheduled_time: routine.scheduled_time, duration_minutes: routine.duration_minutes, xp_bonus: routine.xp_bonus, steps,
    }, null)
  }

  async function deleteRoutine(routineId) {
    if (!window.confirm('¿Eliminar esta rutina y todo su historial? Esta acción no se puede deshacer.')) return
    const { error } = await supabase.from('routines').delete().eq('id', routineId)
    if (error) { showToast(`No se pudo eliminar la rutina: ${formatError(error)}`); return }
    await supabase.from('xp_events').delete().like('source_key', `${routineId}:%`)
    if (activeSeason) {
      await supabase.from('season_point_events').delete().eq('season_id', activeSeason.id).like('source_key', `${routineId}:%`)
      await syncSeasonProgress()
    }
    setXpEvents((current) => current.filter((event) => !event.source_key.startsWith(`${routineId}:`)))
    setRoutines((current) => current.filter((routine) => routine.id !== routineId))
    setRoutineSteps((current) => current.filter((step) => step.routine_id !== routineId))
    setRoutineLogs((current) => current.filter((log) => log.routine_id !== routineId))
    setRoutineStepLogs((current) => current.filter((log) => log.routine_id !== routineId))
    showToast('Rutina eliminada.')
  }

  async function saveGoal(payload, existingGoal) {
    const { milestones: nextMilestones, ...goalPayload } = payload
    let goalId = existingGoal?.id
    if (existingGoal) {
      const { error } = await supabase.from('goals').update(goalPayload).eq('id', existingGoal.id)
      if (error) { showToast(`No se pudo actualizar el objetivo: ${formatError(error)}`); return false }
      const oldMilestones = milestones.filter((item) => item.goal_id === existingGoal.id)
      const keptIds = new Set(nextMilestones.map((item) => item.id).filter(Boolean))
      for (const oldMilestone of oldMilestones.filter((item) => !keptIds.has(item.id))) {
        await removeXp('goal_milestone', oldMilestone.id)
        await supabase.from('goal_milestones').delete().eq('id', oldMilestone.id)
      }
    } else {
      const { data, error } = await supabase.from('goals').insert({ ...goalPayload, user_id: user.id }).select().single()
      if (error) { showToast(`No se pudo crear el objetivo: ${formatError(error)}`); return false }
      goalId = data.id
    }
    if (nextMilestones.length) {
      const rows = nextMilestones.map((item, position) => ({
        ...(item.id ? { id: item.id } : {}), title: item.title, description: item.description, due_date: item.due_date,
        xp_reward: item.xp_reward, position, completed: Boolean(item.completed), completed_at: item.completed_at || null,
        goal_id: goalId, user_id: user.id,
      }))
      const { error } = await supabase.from('goal_milestones').upsert(rows).select()
      if (error) { showToast(`El objetivo se guardó, pero fallaron los hitos: ${formatError(error)}`); return false }
    }
    await loadData()
    showToast(existingGoal ? 'Objetivo actualizado.' : 'Objetivo creado correctamente.')
    return true
  }

  async function toggleMilestone(goal, milestone) {
    const completed = !milestone.completed
    const { data, error } = await supabase.from('goal_milestones').update({ completed, completed_at: completed ? new Date().toISOString() : null }).eq('id', milestone.id).select().single()
    if (error) { showToast(`No se pudo actualizar el hito: ${formatError(error)}`); return }
    const nextMilestones = milestones.map((item) => item.id === data.id ? data : item)
    setMilestones(nextMilestones)
    if (completed) {
      const reward = await awardXp({ sourceType: 'goal_milestone', sourceKey: milestone.id, reason: `Hito completado: ${milestone.title}`, baseAmount: milestone.xp_reward })
      if (!reward.levelUp && !reward.titleUp && !reward.rankUp) openRpgCelebration({ type: 'milestone', title: milestone.title, subtitle: `Avanzaste dentro del objetivo: ${goal.title}.`, xp: reward.amount, seasonPoints: reward.seasonPoints })
      showToast(`Hito completado · +${reward.amount} XP · +${reward.seasonPoints} PT`)
    } else await removeXp('goal_milestone', milestone.id)

    const related = nextMilestones.filter((item) => item.goal_id === goal.id)
    const progress = related.length ? Math.round((related.filter((item) => item.completed).length / related.length) * 100) : goal.progress_percent
    const status = progress === 100 ? 'completed' : 'active'
    const { data: updatedGoal } = await supabase.from('goals').update({ progress_percent: progress, status }).eq('id', goal.id).select().single()
    if (updatedGoal) setGoals((current) => current.map((item) => item.id === updatedGoal.id ? updatedGoal : item))
    if (status === 'completed') await awardXp({ sourceType: 'goal', sourceKey: goal.id, reason: `Objetivo completado: ${goal.title}`, baseAmount: goal.xp_reward })
    if (status !== 'completed') await removeXp('goal', goal.id)
  }

  async function deleteGoal(goalId) {
    if (!window.confirm('¿Eliminar este objetivo y sus hitos? Esta acción no se puede deshacer.')) return
    const { error } = await supabase.from('goals').delete().eq('id', goalId)
    if (error) { showToast(`No se pudo eliminar el objetivo: ${formatError(error)}`); return }
    await removeXp('goal', goalId)
    const relatedMilestones = milestones.filter((item) => item.goal_id === goalId)
    for (const item of relatedMilestones) await removeXp('goal_milestone', item.id)
    setGoals((current) => current.filter((goal) => goal.id !== goalId))
    setMilestones((current) => current.filter((item) => item.goal_id !== goalId))
    showToast('Objetivo eliminado.')
  }

  async function saveDailyPlan(payload, existingPlan) {
    const query = existingPlan?.id
      ? supabase.from('daily_plans').update(payload).eq('id', existingPlan.id)
      : supabase.from('daily_plans').insert({ ...payload, user_id: user.id })
    const { data, error } = await query.select().single()
    if (error) { showToast(`No se pudo guardar el plan del día: ${formatError(error)}`); return false }
    setDailyPlans((current) => existingPlan?.id ? current.map((item) => item.id === data.id ? data : item) : [data, ...current])
    await awardXp({ sourceType: 'daily_plan', sourceKey: payload.plan_date, reason: 'Plan del día creado', baseAmount: 10 })
    showToast('Plan del día guardado.')
    return true
  }

  async function saveWeeklyReview(payload, existingReview) {
    const query = existingReview?.id
      ? supabase.from('weekly_reviews').update(payload).eq('id', existingReview.id)
      : supabase.from('weekly_reviews').insert({ ...payload, user_id: user.id })
    const { data, error } = await query.select().single()
    if (error) { showToast(`No se pudo guardar la revisión semanal: ${formatError(error)}`); return false }
    setWeeklyReviews((current) => existingReview?.id ? current.map((item) => item.id === data.id ? data : item) : [data, ...current])
    if (!existingReview) await awardXp({ sourceType: 'weekly_review', sourceKey: payload.week_start, reason: 'Revisión semanal completada', baseAmount: 40 })
    showToast('Revisión semanal guardada.')
    return true
  }

  async function applyQuickTemplate(template) {
    const payload = { ...template.payload }
    if (template.type === 'task') {
      await saveTask({ ...payload, due_date: today }, null)
      return
    }
    if (template.type === 'habit') {
      await saveHabit(payload)
      return
    }
    if (template.type === 'routine') {
      await saveRoutine(payload, null)
      return
    }
    if (template.type === 'goal') {
      await saveGoal(payload, null)
    }
  }

  async function saveSettings(nextSettings) {
    const { data, error } = await supabase.from('user_settings').upsert({ ...nextSettings, user_id: user.id }, { onConflict: 'user_id' }).select().single()
    if (error) { showToast(`No se pudo guardar configuración: ${formatError(error)}`); return false }
    setSettings((current) => ({ ...current, ...data }))
    showToast('Configuración guardada.')
    return true
  }

  async function saveProfile(nextProfile) {
    const { data, error } = await supabase.from('profiles').upsert({ ...nextProfile, id: user.id }, { onConflict: 'id' }).select().single()
    if (error) { showToast(`No se pudo guardar el perfil: ${formatError(error)}`); return false }
    setProfile(data)
    return true
  }

  async function toggleSidebar(collapsed) { return saveSettings({ ...settings, sidebar_collapsed: collapsed }) }

  async function saveCategory(payload, existingCategory) {
    const query = existingCategory ? supabase.from('custom_categories').update(payload).eq('id', existingCategory.id) : supabase.from('custom_categories').insert({ ...payload, user_id: user.id })
    const { data, error } = await query.select().single()
    if (error) { showToast(`No se pudo guardar la categoría: ${formatError(error)}`); return false }
    setCustomCategories((current) => existingCategory ? current.map((item) => item.id === data.id ? data : item) : [...current, data].sort((a, b) => a.name.localeCompare(b.name)))
    showToast('Categoría guardada.')
    return true
  }

  async function deleteCategory(categoryId) {
    if (!window.confirm('¿Eliminar esta categoría personalizada? Los registros conservarán el nombre anterior.')) return
    const { error } = await supabase.from('custom_categories').delete().eq('id', categoryId)
    if (error) { showToast(`No se pudo eliminar la categoría: ${formatError(error)}`); return }
    setCustomCategories((current) => current.filter((item) => item.id !== categoryId))
    showToast('Categoría eliminada. Los registros conservaron su nombre anterior.')
  }

  async function signOut() { await supabase.auth.signOut() }

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined
    function onServiceWorkerMessage(event) {
      const message = event.data || {}
      if (!['ASCENDA_REMINDER_PUSH', 'ASCENDA_NOTIFICATION_CLICK'].includes(message.type)) return
      const payload = message.payload || {}
      const incoming = payload.reminder
      if (message.type === 'ASCENDA_NOTIFICATION_CLICK' && payload.deliveryId && !openedDeliveryRef.current.has(payload.deliveryId)) {
        openedDeliveryRef.current.add(payload.deliveryId)
        updateNotificationHistoryItem(payload.deliveryId, { action:'viewed', delivery_status:'viewed', viewed_at:new Date().toISOString() })
      }
      if (!incoming?.id) return
      shownReminderRef.current.add(incoming.id)
      setReminders((current) => current.map((item) => item.id === incoming.id ? { ...item, next_trigger_at:incoming.next_trigger_at || item.next_trigger_at, status:incoming.recurrence_type === 'none' ? 'sent' : 'active', last_sent_at:new Date().toISOString() } : item))
      setActiveReminder((current) => current?.id === incoming.id ? { ...current, ...incoming } : current || incoming)
      if (incoming.sound_enabled) playAscendaSound(incoming.priority === 'alarm' ? 'alarm' : 'reward', { ...settings, sounds_enabled:true })
    }
    navigator.serviceWorker.addEventListener('message', onServiceWorkerMessage)
    return () => navigator.serviceWorker.removeEventListener('message', onServiceWorkerMessage)
  }, [settings])

  useEffect(() => {
    if (loading) return
    const deliveryId = getHashParams().get('delivery')
    if (!deliveryId || openedDeliveryRef.current.has(deliveryId)) return
    openedDeliveryRef.current.add(deliveryId)
    updateNotificationHistoryItem(deliveryId, { action:'viewed', delivery_status:'viewed', viewed_at:new Date().toISOString() })
  }, [loading, activeSection])

  useEffect(() => {
    if (loading) return undefined
    async function checkReminders() {
      if (activeReminder) return
      const due = reminders.find((reminder) => reminder.status === 'active' && reminder.enabled !== false && new Date(reminder.next_trigger_at) <= new Date() && !shownReminderRef.current.has(reminder.id))
      if (!due) return
      shownReminderRef.current.add(due.id)
      setActiveReminder(due)
      await logReminder(due, 'shown_internal', { delivery_status:'viewed', viewed_at:new Date().toISOString() })
      if (due.sound_enabled) playAscendaSound(due.priority === 'alarm' ? 'alarm' : 'reward', { ...settings, sounds_enabled:true })
      await showLocalSystemNotification(due.title, { body:due.description || 'Tenés un recordatorio pendiente.', tag:`ascenda-reminder-${due.id}`, requireInteraction:due.priority === 'alarm', data:{ url:'/#/recordatorios', reminder:due } }).catch(() => false)
    }
    checkReminders()
    const timer = setInterval(checkReminders, 15000)
    return () => clearInterval(timer)
  }, [loading, reminders, activeReminder, settings])

  if (loading) return <main className="centered-screen"><p className="eyebrow">SINCRONIZANDO ASCENDA V8.2…</p></main>

  const currentRoutine = routineModal.routine
  const currentGoal = goalModal.goal
  const mainProps = { userId: user.id, displayName, tasks, taskSubtasks, tags, taskTagLinks, events, reminders, dailyNotes, notes, notificationHistory, habits, habitLogs, routines, routineSteps, routineLogs, routineStepLogs, goals, milestones, xpEvents, metrics, today, recentDays, categories, settings, activeSeason, seasonMetrics, seasonHistory, dailyPlans, weeklyReviews }

  return <main className={`app-shell ${settings.sidebar_collapsed ? 'sidebar-collapsed' : ''}`}>
    <aside className="sidebar panel">
      <div className="brand"><div className="brand-mark">A</div><div className="brand-copy"><strong>ASCENDA</strong><span>Personal System</span></div></div>
      <button className="quick-create-button" type="button" onClick={() => setQuickCreateOpen(true)}><span>＋</span><b>Crear</b></button>
      <nav className="nav-list">{visibleNavItems.map((item) => <button className={`nav-item ${activeSection === item.id ? 'active' : ''}`} type="button" onClick={() => navigate(item.id)} key={item.id}><span>{item.icon}</span><span>{item.label}</span></button>)}</nav>
      <div className="sidebar-bottom">
        <button className="collapse-button" type="button" onClick={() => toggleSidebar(!settings.sidebar_collapsed)}>{settings.sidebar_collapsed ? '»' : '« Contraer'}</button>
        <button className="profile-mini" type="button" onClick={() => navigate('perfil')}><span>{displayName.slice(0, 1).toUpperCase()}</span><div><strong>{displayName}</strong><small>Nivel {metrics.level} · {metrics.title}</small></div></button>
        <button className="signout-button" type="button" onClick={signOut}>Cerrar sesión</button>
      </div>
    </aside>

    <section className="main-area">
      <header className="topbar"><div><p className="eyebrow">{getTodayLabel().toUpperCase()}</p><h1>{getGreeting()}, {displayName}</h1></div><div className="topbar-actions"><span className="season-pill">♜ {seasonMetrics.rank.displayName}</span><span className="streak-pill">✦ {metrics.streak} días · +{metrics.streakBonus}% XP</span><button className="primary-button" type="button" onClick={() => setQuickCreateOpen(true)}>＋ Crear</button></div></header>
      {databaseIssue && <div className="database-alert"><strong>Ejecutá las migraciones pendientes: V8.1, V8.2 y `supabase/migrations/V9_DAILY_PLANNING_AND_PROGRESS.sql`.</strong><span>{databaseIssue}</span></div>}
      {activeSection === 'inicio' && <HomeView {...mainProps} nextActivity={nextActivity} nowTick={nowTick} navigate={navigate} openCreate={openCreate} toggleTask={toggleTask} toggleHabit={toggleHabit} toggleRoutineStep={toggleRoutineStep} isActionPending={isActionPending} onSaveDailyPlan={saveDailyPlan} onSaveWeeklyReview={saveWeeklyReview} onApplyQuickTemplate={applyQuickTemplate} />}
      {activeSection === 'agenda' && <AgendaWorkspace {...mainProps} selectedDate={today} onSaveDailyNote={saveDailyNote} onDeleteDailyNote={deleteDailyNote} onOpenEvent={(event, defaultDate) => setEventModal({ open:true, event, defaultDate })} onDeleteEvent={deleteEvent} onCreateTaskFromText={createTaskFromText} onCreateReminderFromText={createReminderFromText} />}
      {activeSection === 'notas' && <NotesView {...mainProps} onOpenNote={(note) => setNoteModal({open:true,note})} onDeleteNote={deleteNote} />}
      {activeSection === 'recordatorios' && <RemindersView userId={user.id} reminders={reminders} notificationHistory={notificationHistory} onToast={showToast} onOpenReminder={(reminder) => setReminderModal({open:true,reminder})} onDeleteReminder={deleteReminder} onToggleReminder={toggleReminderEnabled} />}
      {activeSection === 'tareas' && <AdvancedTasksView {...mainProps} onNew={() => openCreate('task')} onEdit={(task) => setTaskModal({ open: true, task })} onToggle={toggleTask} onDelete={deleteTask} onToggleSubtask={toggleSubtask} />}
      {activeSection === 'habitos' && <HabitsView {...mainProps} openNewHabit={() => openCreate('habit')} toggleHabit={toggleHabit} deleteHabit={deleteHabit} />}
      {activeSection === 'rutinas' && <RoutinesView {...mainProps} openNewRoutine={() => openCreate('routine')} openEditRoutine={(routine) => setRoutineModal({ open: true, routine })} toggleRoutineStep={toggleRoutineStep} duplicateRoutine={duplicateRoutine} deleteRoutine={deleteRoutine} isActionPending={isActionPending} />}
      {activeSection === 'objetivos' && <GoalsView {...mainProps} openNewGoal={() => openCreate('goal')} openEditGoal={(goal) => setGoalModal({ open: true, goal })} toggleMilestone={toggleMilestone} deleteGoal={deleteGoal} />}
      {activeSection === 'temporada' && <SeasonView activeSeason={activeSeason} seasonMetrics={seasonMetrics} seasonHistory={seasonHistory} settings={settings} />}
      {activeSection === 'perfil' && <ProfileView session={session} settings={settings} onProfileChanged={setProfile} />}
      {activeSection === 'progreso' && <ProgressDashboard {...mainProps} />}
      {activeSection === 'configuracion' && <SettingsView user={user} profile={profile} settings={settings} customCategories={customCategories} onSaveSettings={saveSettings} onSaveProfile={saveProfile} onSaveCategory={saveCategory} onDeleteCategory={deleteCategory} onToggleSidebar={toggleSidebar} onToast={showToast} />}
    </section>

    <QuickCreateModal open={quickCreateOpen} onClose={() => setQuickCreateOpen(false)} onSelect={openCreate} />
    <TaskModal open={taskModal.open} task={taskModal.task} categories={categories} taskSubtasks={taskSubtasks.filter((item) => item.task_id === taskModal.task?.id)} selectedTags={taskTagLinks.filter((item) => item.task_id === taskModal.task?.id).map((item) => tags.find((tag) => tag.id === item.tag_id)).filter(Boolean)} onClose={() => setTaskModal({ open: false, task: null })} onSave={saveTask} />
    <HabitModal open={habitModalOpen} categories={categories} onClose={() => setHabitModalOpen(false)} onSave={saveHabit} />
    <RoutineModal open={routineModal.open} routine={currentRoutine} routineSteps={routineSteps.filter((step) => step.routine_id === currentRoutine?.id)} categories={categories} onClose={() => setRoutineModal({ open: false, routine: null })} onSave={saveRoutine} />
    <EventModal open={eventModal.open} event={eventModal.event} defaultDate={eventModal.defaultDate} onClose={() => setEventModal({open:false,event:null,defaultDate:null})} onSave={saveEvent} />
    <ReminderModal open={reminderModal.open} reminder={reminderModal.reminder} tasks={tasks} events={events} routines={routines} habits={habits} goals={goals} onClose={() => setReminderModal({open:false,reminder:null})} onSave={saveReminder} />
    <NoteModal open={noteModal.open} note={noteModal.note} categories={categories} onClose={() => setNoteModal({open:false,note:null})} onSave={saveNote} onConvertTask={createTaskFromText} onConvertReminder={createReminderFromText} />
    <ReminderAlertModal reminder={activeReminder} onDismiss={dismissReminder} onSnooze={snoozeReminder} />
    <GoalModal open={goalModal.open} goal={currentGoal} milestones={milestones.filter((item) => item.goal_id === currentGoal?.id)} categories={categories} onClose={() => setGoalModal({ open: false, goal: null })} onSave={saveGoal} />
    <RpgCelebrationModal celebration={celebrationQueue[0] || null} visualTheme={settings.visual_theme} intenseEffects={settings.intense_effects_enabled && !settings.reduce_motion} onClose={() => setCelebrationQueue((current) => current.slice(1))} />
    <DailyWelcomeModal open={dailyWelcomeOpen} displayName={displayName} today={today} settings={settings} tasks={tasks} habits={habits} habitLogs={habitLogs} routines={routines} routineLogs={routineLogs} events={events} reminders={reminders} onClose={closeDailyWelcome} />
    <div className={`toast ${toast ? 'visible' : ''}`}>{toast}</div>
  </main>
}

function HomeView({ userId, displayName, tasks, habits, habitLogs, routines, routineSteps, routineLogs, routineStepLogs, goals, xpEvents, events, reminders, dailyPlans, weeklyReviews, metrics, today, settings, activeSeason, seasonMetrics, nextActivity, nowTick, navigate, openCreate, toggleTask, toggleHabit, toggleRoutineStep, isActionPending, onSaveDailyPlan, onSaveWeeklyReview, onApplyQuickTemplate }) {
  const pendingTasks = tasks.filter((task) => !task.completed && task.status !== 'cancelada').slice(0, 5)
  const dueRoutines = routines.filter((routine) => routineIsDueToday(routine)).slice(0, 4)
  const activeGoals = goals.filter((goal) => goal.status === 'active').slice(0, 3)
  const todayPlan = dailyPlans.find((plan) => plan.plan_date === today) || null
  const dailySummary = {
    dueTasks: tasks.filter((task) => task.due_date === today && task.status !== 'cancelada'),
    openTasks: tasks.filter((task) => !task.completed && task.status !== 'cancelada'),
    pendingHabits: habits.filter((habit) => !habitDoneToday(habit, habitLogs, today)),
    dueRoutines: routines.filter((routine) => routineIsDueToday(routine)),
    eventsToday: events.filter((event) => event.event_date === today && event.status !== 'cancelled'),
    remindersToday: reminders.filter((reminder) => reminder.status === 'active' && reminder.next_trigger_at?.slice(0, 10) === today),
  }
  return <section className="view-stack enter-up">
    {settings.experience_mode === 'rpg' && <RpgCommandCenter metrics={metrics} seasonMetrics={seasonMetrics} settings={settings} nextActivity={nextActivity} nowTick={nowTick} />}
    <article className="daily-command-panel panel"><div><p className="eyebrow">MI DÍA</p><h1>{getGreeting()}, {displayName?.split(' ')[0] || 'Usuario'}.</h1><p>Hoy tenés {dailySummary.openTasks.length} tareas abiertas, {dailySummary.pendingHabits.length} hábitos pendientes, {dailySummary.eventsToday.length} eventos y {dailySummary.remindersToday.length} recordatorios.</p></div><div className="daily-command-actions"><button className="primary-button" type="button" onClick={() => openCreate('task')}>Nueva tarea</button><button className="ghost-button" type="button" onClick={() => navigate('progreso')}>Ver progreso</button></div></article>
    <section className="hero-grid">
      <article className="hero-card panel"><p className="eyebrow">FRASE DEL DÍA</p><h2>{getDailyQuote(settings.custom_quote)}</h2><p>Tu sistema registra constancia, no perfección. Elegí una acción concreta para avanzar.</p><button className="ghost-button" type="button" onClick={() => navigate('configuracion')}>Personalizar frase</button></article>
      <article className="next-activity panel"><p className="eyebrow">PRÓXIMA ACTIVIDAD</p>{nextActivity ? <><span className="activity-type">{nextActivity.type}</span><h2>{nextActivity.title}</h2><p>{nextActivity.subtitle}</p><strong>{formatCountdown(nextActivity.date, nowTick)}</strong></> : <><h2>Agenda despejada</h2><p>Creá una tarea, rutina u objetivo para planificar tu próximo avance.</p><button className="ghost-button" type="button" onClick={() => openCreate('task')}>Crear tarea</button></>}</article>
      <article className="level-card panel"><div><p className="eyebrow">NIVEL GENERAL</p><h2>{metrics.level}</h2><span>{metrics.title} · {metrics.totalXp} XP acumulada</span></div><div className="progress-track"><i style={{ width: `${metrics.levelPercentage}%` }} /></div><small>{metrics.isMaxLevel ? 'Nivel máximo alcanzado' : `${metrics.xpForNextLevel} XP para subir de nivel`}</small><b>Racha: {metrics.streak} días · bonus +{metrics.streakBonus}%</b></article>
      <article className="season-mini-card panel"><div><p className="eyebrow">TEMPORADA</p><h2>{seasonMetrics.rank.displayName}</h2><span>{seasonMetrics.points} PT · {activeSeason?.name || 'Temporada activa'}</span></div><div className="progress-track"><i style={{ width: `${seasonMetrics.rank.progress}%` }} /></div><small>{seasonMetrics.rank.next ? `${seasonMetrics.rank.pointsToNext} PT para ascender` : 'Rango máximo alcanzado'}</small><button className="mini-action" type="button" onClick={() => navigate('temporada')}>Ver temporada</button></article>
      <article className="daily-score panel"><div className="score-ring" style={{ '--score': `${metrics.dailyPercentage * 3.6}deg` }}><span>{metrics.dailyPercentage}%</span></div><div><p className="eyebrow">PROGRESO DIARIO</p><h2>Tu día en curso</h2><p>{metrics.tasksCompletedToday} tareas · {metrics.habitsCompletedToday} hábitos · {metrics.routinesCompletedToday} rutinas</p></div></article>
    </section>

    <section className="dashboard-grid">
      <article className="content-panel panel"><div className="card-heading"><div><p className="eyebrow">TAREAS</p><h2>Pendientes</h2></div><button className="mini-action" type="button" onClick={() => navigate('tareas')}>Ver todas</button></div>{pendingTasks.length ? <div className="task-list">{pendingTasks.map((task) => <CompactTaskRow task={task} toggleTask={toggleTask} key={task.id} />)}</div> : <EmptyState text="No tenés tareas pendientes." action="Crear tarea" onClick={() => openCreate('task')} />}</article>
      <article className="content-panel panel"><div className="card-heading"><div><p className="eyebrow">HÁBITOS</p><h2>Constancia activa</h2></div><button className="mini-action" type="button" onClick={() => navigate('habitos')}>Gestionar</button></div>{habits.length ? <div className="habit-quick-list">{habits.slice(0, 5).map((habit) => <HabitQuickRow habit={habit} habitLogs={habitLogs} today={today} toggleHabit={toggleHabit} key={habit.id} />)}</div> : <EmptyState text="Todavía no creaste hábitos." action="Crear hábito" onClick={() => openCreate('habit')} />}</article>
    </section>

    {settings.experience_mode !== 'simple' && <section className="dashboard-grid">
      <article className="content-panel panel"><div className="card-heading"><div><p className="eyebrow">RUTINAS DE HOY</p><h2>Secuencias activas</h2></div><button className="mini-action" type="button" onClick={() => navigate('rutinas')}>Gestionar</button></div>{dueRoutines.length ? <div className="routine-quick-list">{dueRoutines.map((routine) => <RoutineQuickCard routine={routine} steps={routineSteps.filter((step) => step.routine_id === routine.id)} logs={routineStepLogs} today={today} toggleRoutineStep={toggleRoutineStep} isActionPending={isActionPending} key={routine.id} />)}</div> : <EmptyState text="No hay rutinas programadas para hoy." action="Crear rutina" onClick={() => openCreate('routine')} />}</article>
      <article className="content-panel panel"><div className="card-heading"><div><p className="eyebrow">OBJETIVOS</p><h2>Metas principales</h2></div><button className="mini-action" type="button" onClick={() => navigate('objetivos')}>Gestionar</button></div>{activeGoals.length ? <div className="goal-quick-list">{activeGoals.map((goal) => <GoalQuickCard goal={goal} key={goal.id} />)}</div> : <EmptyState text="Todavía no creaste objetivos." action="Crear objetivo" onClick={() => openCreate('goal')} />}</article>
    </section>}

    <section className="dashboard-grid"><DayPlannerPanel plan={todayPlan} today={today} summary={dailySummary} onSave={onSaveDailyPlan} /><WeeklyReviewPanel reviews={weeklyReviews} tasks={tasks} habits={habits} habitLogs={habitLogs} routines={routines} routineLogs={routineLogs} goals={goals} xpEvents={xpEvents} settings={settings} onSave={onSaveWeeklyReview} /></section>
    {settings.experience_mode !== 'simple' && <section className="dashboard-grid"><QuickTemplatesPanel onApplyTemplate={onApplyQuickTemplate} /><article className="content-panel panel"><div className="card-heading"><div><p className="eyebrow">RESUMEN SEMANAL</p><h2>XP obtenida</h2></div><span className="positive-pill">Sincronizado</span></div><WeeklyChart week={metrics.week} /></article></section>}
    <section className="dashboard-grid"><MissionDashboardCard userId={userId} navigate={navigate} /></section>
  </section>
}

function AgendaView({ tasks, routines, goals, habits, habitLogs, today, openEditTask }) {
  const items = [
    ...tasks.filter((task) => task.due_date).map((task) => ({ id: `task-${task.id}`, date: task.due_date, time: safeTime(task.due_time), title: task.title, type: 'Tarea', detail: `${task.category} · ${STATUS_LABELS[task.status] || 'Pendiente'}`, onClick: () => openEditTask(task) })),
    ...routines.flatMap((routine) => {
      const dates = []
      for (let offset = 0; offset < 8; offset += 1) { const date = addDays(new Date(), offset); if (!routine.scheduled_days?.length || routine.scheduled_days.includes(date.getDay())) dates.push({ id: `routine-${routine.id}-${offset}`, date: toDateISO(date), time: safeTime(routine.scheduled_time), title: routine.title, type: 'Rutina', detail: routine.category }) }
      return dates.slice(0, 2)
    }),
    ...goals.filter((goal) => goal.due_date && goal.status === 'active').map((goal) => ({ id: `goal-${goal.id}`, date: goal.due_date, time: '', title: goal.title, type: 'Objetivo', detail: `${goal.progress_percent}% completado` })),
    ...habits.filter((habit) => !habitDoneToday(habit, habitLogs, today)).map((habit) => ({ id: `habit-${habit.id}`, date: today, time: '', title: habit.title, type: 'Hábito', detail: habitFrequencyType(habit) === 'weekly_target' ? `${habitWeeklyProgress(habit, habitLogs)} de ${habitWeeklyTarget(habit)} sesiones esta semana` : 'Pendiente de hoy' })),
  ].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
  const grouped = groupByDate(items, 'date')
  return <section className="view-stack enter-up"><SectionHeading eyebrow="PLANIFICACIÓN" title="Agenda" description="Vista cronológica de tareas, rutinas, hábitos pendientes y fechas límite de objetivos." />{Object.keys(grouped).length ? Object.entries(grouped).map(([date, dayItems]) => <article className="content-panel panel" key={date}><div className="section-date"><p className="eyebrow">{date === today ? 'HOY' : 'AGENDA'}</p><h2>{formatLongDate(date)}</h2></div><div className="agenda-list">{dayItems.map((item) => <button className="agenda-row" type="button" onClick={item.onClick} key={item.id}><span className="agenda-time">{item.time || '—'}</span><span className="priority-dot" /><span className="agenda-copy"><strong>{item.title}</strong><small>{item.type} · {item.detail}</small></span></button>)}</div></article>) : <EmptyPanel text="Todavía no hay actividades planificadas." />}</section>
}

function TasksView({ tasks, openNewTask, openEditTask, toggleTask, deleteTask }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('todas')
  const filtered = tasks.filter((task) => task.title.toLowerCase().includes(query.toLowerCase()) && (status === 'todas' || task.status === status))
  return <section className="view-stack enter-up"><SectionHeading eyebrow="ORGANIZACIÓN" title="Tareas" description="Creá actividades concretas. La XP se calcula automáticamente según prioridad, fecha y descripción." action="Nueva tarea" onClick={openNewTask} /><article className="content-panel panel"><div className="filter-grid"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar tarea…" /><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="todas">Todos los estados</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div>{filtered.length ? <div className="task-list expanded">{filtered.map((task) => <DetailedTaskRow task={task} toggleTask={toggleTask} editTask={openEditTask} deleteTask={deleteTask} key={task.id} />)}</div> : <EmptyState text="No hay tareas que coincidan con los filtros." />}</article></section>
}

function HabitsView({ habits, habitLogs, today, recentDays, openNewHabit, toggleHabit, deleteHabit }) {
  return <section className="view-stack enter-up"><SectionHeading eyebrow="CONSTANCIA" title="Hábitos" description="Registrá hábitos diarios o metas semanales flexibles sin perder el historial anterior." action="Nuevo hábito" onClick={openNewHabit} /><article className="content-panel panel">{habits.length ? <div className="habit-management-list">{habits.map((habit) => {
    const weekly = habitFrequencyType(habit) === 'weekly_target'
    const doneToday = habitLogs.some((log) => log.habit_id === habit.id && log.log_date === today)
    const completedDays = recentDays.filter((day) => habitLogs.some((log) => log.habit_id === habit.id && log.log_date === day.iso)).length
    const weeklyProgress = habitWeeklyProgress(habit, habitLogs)
    const weeklyTarget = habitWeeklyTarget(habit)
    const weeklyCompleted = weeklyProgress >= weeklyTarget
    return <article className="habit-management-card" key={habit.id}><div className="habit-management-heading"><div><p className="eyebrow">{habit.category.toUpperCase()}</p><h2>{habit.title}</h2><span>{weekly ? `${weeklyProgress} de ${weeklyTarget} sesiones esta semana · racha: ${habitWeeklyStreak(habit, habitLogs)} semanas` : `${habit.target} ${habit.unit} por registro · ${completedDays} de ${recentDays.length} días registrados`} · +{habit.xp_reward || 8} XP base</span></div><div className="row-actions">{weekly ? <><button className={`habit-toggle ${weeklyCompleted ? 'done' : ''}`} type="button" onClick={() => toggleHabit(habit)}>{weeklyCompleted ? '＋ Registrar otra sesión' : '＋ Registrar sesión'}</button><button className="mini-action" disabled={!doneToday} type="button" onClick={() => toggleHabit(habit, -1)}>Deshacer hoy</button></> : <button className={`habit-toggle ${doneToday ? 'done' : ''}`} type="button" onClick={() => toggleHabit(habit)}>{doneToday ? '✓ Completado hoy' : '○ Marcar completo'}</button>}<button className="delete-button" type="button" onClick={() => deleteHabit(habit.id)}>×</button></div></div>{weekly && <div className="weekly-habit-progress"><div className="progress-track"><i style={{ width: `${percentage(weeklyProgress, weeklyTarget)}%` }} /></div><small>{weeklyCompleted ? 'Objetivo semanal cumplido' : `${Math.max(0, weeklyTarget - weeklyProgress)} sesiones pendientes esta semana`}</small></div>}<div className="habit-history">{recentDays.map((day) => { const log = habitLogs.find((item) => item.habit_id === habit.id && item.log_date === day.iso); const done = Boolean(log); return <span className={`history-day ${done ? 'done' : ''} ${day.iso === today ? 'today' : ''}`} key={day.iso}><small>{day.weekday}</small><b>{weekly && Number(log?.value || 0) > 1 ? log.value : day.day}</b></span> })}</div></article>
  })}</div> : <EmptyState text="Todavía no creaste hábitos." action="Crear hábito" onClick={openNewHabit} />}</article></section>
}

function RoutinesView({ routines, routineSteps, routineStepLogs, routineLogs, today, openNewRoutine, openEditRoutine, toggleRoutineStep, duplicateRoutine, deleteRoutine, isActionPending }) {
  return <section className="view-stack enter-up"><SectionHeading eyebrow="SECUENCIAS PERSONALES" title="Rutinas" description="Completá pasos parcialmente y obtené un bonus adicional al finalizar una secuencia completa." action="Nueva rutina" onClick={openNewRoutine} /><div className="routine-management-list">{routines.length ? routines.map((routine) => { const steps = routineSteps.filter((step) => step.routine_id === routine.id); const done = steps.filter((step) => routineStepLogs.some((log) => log.step_id === step.id && log.log_date === today)).length; const completed = routineLogs.some((log) => log.routine_id === routine.id && log.log_date === today && log.completed); return <article className={`routine-card panel ${completed ? 'completed-routine' : ''}`} key={routine.id}><div className="card-heading"><div><p className="eyebrow">{routine.category.toUpperCase()} · {routineScheduleLabel(routine)}</p><h2>{routine.title}</h2><p>{routine.description || 'Sin descripción.'}</p></div><span className="xp-pill">Bonus +{routine.xp_bonus} XP</span></div><div className="progress-track"><i style={{ width: `${percentage(done, steps.length)}%` }} /></div><small>{done} de {steps.length} pasos completados hoy</small><div className="routine-steps">{steps.map((step) => { const stepDone = routineStepLogs.some((log) => log.step_id === step.id && log.log_date === today); const pending = isActionPending(`routine-step:${step.id}:${today}`); return <button className={`routine-step ${stepDone ? 'done' : ''} ${pending ? 'is-pending' : ''}`} type="button" disabled={pending} onClick={() => toggleRoutineStep(routine, step)} key={step.id}><span>{stepDone ? '✓' : '○'}</span><strong>{step.title}</strong><small>{step.duration_minutes ? `${step.duration_minutes} min · ` : ''}+{step.xp_reward} XP</small></button> })}</div><div className="row-actions end"><button className="mini-action" type="button" onClick={() => openEditRoutine(routine)}>Editar</button><button className="mini-action" type="button" onClick={() => duplicateRoutine(routine)}>Duplicar</button><button className="delete-button" type="button" onClick={() => deleteRoutine(routine.id)}>×</button></div></article> }).slice(0) : <EmptyPanel text="Todavía no creaste rutinas." action="Crear rutina" onClick={openNewRoutine} />}</div></section>
}

function GoalsView({ goals, milestones, openNewGoal, openEditGoal, toggleMilestone, deleteGoal }) {
  return <section className="view-stack enter-up"><SectionHeading eyebrow="METAS PERSONALES" title="Objetivos" description="Definí metas simples o dividilas en hitos opcionales para visualizar avances intermedios." action="Nuevo objetivo" onClick={openNewGoal} /><div className="goals-grid">{goals.length ? goals.map((goal) => { const related = milestones.filter((item) => item.goal_id === goal.id); return <article className={`goal-card panel ${goal.status === 'completed' ? 'completed-goal' : ''}`} key={goal.id}><div className="card-heading"><div><p className="eyebrow">{goal.category.toUpperCase()} · {goal.visibility.toUpperCase()}</p><h2>{goal.title}</h2><p>{goal.description || 'Sin descripción.'}</p></div><span className="xp-pill">{goal.progress_percent}%</span></div><div className="progress-track"><i style={{ width: `${goal.progress_percent}%` }} /></div>{goal.goal_type === 'quantitative' && <small>{goal.current_value} de {goal.target_value} {goal.unit || ''}</small>}{goal.due_date && <small>Fecha límite: {formatShortDate(goal.due_date)}</small>}{related.length ? <div className="milestone-list">{related.map((item) => <button className={`milestone-row ${item.completed ? 'done' : ''}`} type="button" onClick={() => toggleMilestone(goal, item)} key={item.id}><span>{item.completed ? '✓' : '○'}</span><strong>{item.title}</strong><small>+{item.xp_reward} XP</small></button>)}</div> : <p className="muted-copy compact">Objetivo sin hitos. Editalo para actualizar su progreso manual o cuantitativo.</p>}<div className="row-actions end"><button className="mini-action" type="button" onClick={() => openEditGoal(goal)}>Editar</button><button className="delete-button" type="button" onClick={() => deleteGoal(goal.id)}>×</button></div></article> }) : <EmptyPanel text="Todavía no creaste objetivos." action="Crear objetivo" onClick={openNewGoal} />}</div></section>
}

function ProgressView({ metrics, seasonMetrics, xpEvents, tasks, habits, routines, goals }) {
  return <section className="view-stack enter-up"><SectionHeading eyebrow="ANÁLISIS PERSONAL" title="Progreso" description="Resumen sincronizado de tu actividad real, tu nivel permanente y la temporada activa." /><section className="metrics-grid"><MetricCard eyebrow="EXPERIENCIA TOTAL" value={`${metrics.totalXp} XP`} detail={`Nivel ${metrics.level} · ${metrics.title}`} /><MetricCard eyebrow="RANGO DE TEMPORADA" value={seasonMetrics.rank.displayName} detail={`${seasonMetrics.points} PT · ${seasonMetrics.rank.pointsToNext} PT para ascender`} /><MetricCard eyebrow="RACHA ACTUAL" value={`${metrics.streak} días`} detail={`Bonus actual: +${metrics.streakBonus}% XP`} /><MetricCard eyebrow="SISTEMA ACTIVO" value={habits.length + routines.length + goals.length} detail={`${tasks.filter((task) => task.completed).length} tareas completas · ${habits.length} hábitos`} /></section><article className="content-panel panel"><div className="card-heading"><div><p className="eyebrow">ÚLTIMOS SIETE DÍAS</p><h2>XP obtenida</h2></div><span className="positive-pill">Bonus por racha activo</span></div><WeeklyChart week={metrics.week} /></article><article className="content-panel panel"><div className="card-heading"><div><p className="eyebrow">HISTORIAL RECIENTE</p><h2>Recompensas permanentes</h2></div></div><div className="xp-event-list">{xpEvents.slice(0, 14).map((event) => <div className="xp-event" key={event.id}><span>✦</span><div><strong>{event.reason}</strong><small>{formatShortDate(event.occurred_on)} · multiplicador ×{event.multiplier}</small></div><b>+{event.amount} XP</b></div>)}</div></article></section>
}

function SectionHeading({ eyebrow, title, description, action, onClick }) { return <header className="section-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{description}</p></div>{action && <button className="primary-button" type="button" onClick={onClick}><span>＋</span> {action}</button>}</header> }
function MetricCard({ eyebrow, value, detail }) { return <article className="metric-card panel"><p className="eyebrow">{eyebrow}</p><h2>{value}</h2><span>{detail}</span></article> }
function EmptyPanel({ text, action, onClick }) { return <article className="content-panel panel"><EmptyState text={text} action={action} onClick={onClick} /></article> }
function EmptyState({ text, action, onClick }) { return <div className="empty-state"><p>{text}</p>{action && <button className="ghost-button" type="button" onClick={onClick}>{action}</button>}</div> }
function CompactTaskRow({ task, toggleTask }) { return <div className={`task-row ${task.completed ? 'completed-task' : ''}`}><button className={`check-button ${task.completed ? 'checked' : ''}`} type="button" onClick={() => toggleTask(task)}>✓</button><span className="task-copy"><strong>{task.title}</strong><small>{task.category}{task.due_time ? ` · ${safeTime(task.due_time)}` : ''}</small></span><span className="xp-pill">+{task.xp_reward} XP</span></div> }
function DetailedTaskRow({ task, toggleTask, editTask, deleteTask }) { return <article className={`detailed-task-row ${task.completed ? 'completed-task' : ''}`}><button className={`check-button ${task.completed ? 'checked' : ''}`} type="button" onClick={() => toggleTask(task)}>✓</button><div className="task-copy expanded-copy"><strong>{task.title}</strong><small>{task.category} · {STATUS_LABELS[task.status] || 'Pendiente'} · Prioridad {PRIORITY_LABELS[task.priority] || 'Media'}{task.due_date ? ` · ${formatShortDate(task.due_date)}` : ''}{task.due_time ? ` · ${safeTime(task.due_time)}` : ''}</small>{task.description && <p>{task.description}</p>}</div><span className="xp-pill">+{task.xp_reward} XP</span><div className="row-actions"><button className="mini-action" type="button" onClick={() => editTask(task)}>Editar</button><button className="delete-button" type="button" onClick={() => deleteTask(task.id)}>×</button></div></article> }
function HabitQuickRow({ habit, habitLogs, today, toggleHabit }) { const weekly=habitFrequencyType(habit)==='weekly_target'; const progress=habitWeeklyProgress(habit,habitLogs); const target=habitWeeklyTarget(habit); const done=weekly?progress>=target:habitLogs.some((log)=>log.habit_id===habit.id&&log.log_date===today); return <button className={`habit-quick-row ${done ? 'done' : ''}`} type="button" onClick={() => toggleHabit(habit)}><span className="habit-check">{done ? '✓' : '○'}</span><span><strong>{habit.title}</strong><small>{weekly?`${progress} de ${target} sesiones esta semana`:`${habit.target} ${habit.unit} · ${habit.category}`}</small></span><b>{weekly?'＋ Sesión':done?`+${habit.xp_reward || 8} XP`:'Pendiente'}</b></button> }
function RoutineQuickCard({ routine, steps, logs, today, toggleRoutineStep, isActionPending }) { const done = steps.filter((step) => logs.some((log) => log.step_id === step.id && log.log_date === today)).length; return <article className="routine-quick-card"><div><strong>{routine.title}</strong><small>{done} de {steps.length} pasos · bonus +{routine.xp_bonus} XP</small></div><div className="routine-mini-steps">{steps.slice(0, 4).map((step) => { const completed = logs.some((log) => log.step_id === step.id && log.log_date === today); const pending = isActionPending(`routine-step:${step.id}:${today}`); return <button className={`${completed ? 'done' : ''} ${pending ? 'is-pending' : ''}`} type="button" disabled={pending} onClick={() => toggleRoutineStep(routine, step)} key={step.id}>{pending ? '…' : completed ? '✓' : '○'}</button> })}</div></article> }
function RpgCommandCenter({ metrics, seasonMetrics, settings, nextActivity, nowTick }) { const astral = settings.visual_theme === 'astral'; return <article className={`rpg-command-center ${astral ? 'astral-command-center' : ''}`}><img className="rpg-command-art" src={astral ? '/astral/astral-warrior.svg' : '/rpg/adventurer-card.svg'} alt={astral ? 'Ilustración original de Guerrero Astral' : 'Ilustración original de aventurero en un paisaje fantástico'} /><div className="rpg-command-overlay"><div className="rpg-rank-copy"><p className="eyebrow">{astral ? 'SISTEMA DE ENERGÍA ASTRAL' : 'PANEL DEL AVENTURERO'}</p><h2>{seasonMetrics.rank.displayName}</h2><span>Nivel {metrics.level} · {metrics.title}. Cada acción real fortalece tu progreso permanente y tu rango de temporada.</span></div><div className="rpg-rank-core"><img src={astral ? '/astral/astral-crest.svg' : '/rpg/rune-crest.svg'} alt="Emblema de rango" /><div><strong>NIVEL {metrics.level}</strong><small>{metrics.totalXp} XP · {seasonMetrics.points} PT</small></div></div><div className="rpg-rank-stats"><div><span>RACHA</span><strong>{metrics.streak} días</strong></div><div><span>ASCENSO</span><strong>{seasonMetrics.rank.next ? `${seasonMetrics.rank.pointsToNext} PT` : 'MÁXIMO'}</strong></div><div><span>PRÓXIMA MISIÓN</span><strong>{nextActivity ? formatCountdown(nextActivity.date, nowTick) : 'Libre'}</strong></div></div></div></article> }
function GoalQuickCard({ goal }) { return <article className="goal-quick-card"><div><strong>{goal.title}</strong><small>{goal.category}{goal.due_date ? ` · ${formatShortDate(goal.due_date)}` : ''}</small></div><div className="progress-track"><i style={{ width: `${goal.progress_percent}%` }} /></div><b>{goal.progress_percent}%</b></article> }
function WeeklyChart({ week }) { return <div className="chart-bars">{week.map((day) => <div className="bar-column" key={day.iso}><span className="bar-value">{day.value}</span><div className="chart-bar"><i style={{ height: `${day.percentage}%` }} /></div><small>{day.weekday}</small></div>)}</div> }
