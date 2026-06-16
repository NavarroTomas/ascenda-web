import { addDays, getTodayISO, toDateISO } from './date.js'
import { getLevelTitle } from '../data/levelTitles.js'

export function getStreakMultiplier(streakDays) {
  if (streakDays >= 90) return 1.30
  if (streakDays >= 60) return 1.25
  if (streakDays >= 30) return 1.20
  if (streakDays >= 14) return 1.15
  if (streakDays >= 7) return 1.10
  if (streakDays >= 3) return 1.05
  return 1
}

export function getStreakBonusPercent(streakDays) {
  return Math.round((getStreakMultiplier(streakDays) - 1) * 100)
}

export function applyStreakBonus(baseAmount, streakDays) {
  return Math.round(Number(baseAmount || 0) * getStreakMultiplier(streakDays))
}

export function calculateStreak(dateValues = [], today = getTodayISO()) {
  const activeDays = new Set(dateValues.filter(Boolean))
  let cursor = new Date(`${today}T12:00:00`)
  let streak = 0

  if (!activeDays.has(today)) cursor = addDays(cursor, -1)

  while (activeDays.has(toDateISO(cursor))) {
    streak += 1
    cursor = addDays(cursor, -1)
  }

  return streak
}

export function calculateProjectedStreak(dateValues = [], today = getTodayISO()) {
  return calculateStreak([...dateValues, today], today)
}

export const XP_REWARDS = {
  task: { baja: 10, media: 16, alta: 26 },
  taskDueDateBonus: 3,
  taskDescriptionBonus: 2,
  taskBlockedBonus: 2,
  subtaskBonus: 3,
  subtaskCap: 18,
  dailyPlan: 10,
  weeklyReview: 40,
  weeklyHabitGoal: 60,
  routineCompletion: 30,
  bigGoalCompletion: 150,
}

export function calculateTaskXp({ priority = 'media', due_date: dueDate, description = '', status = 'pendiente', subtasks = [] }) {
  let amount = XP_REWARDS.task[priority] || XP_REWARDS.task.media
  if (dueDate) amount += XP_REWARDS.taskDueDateBonus
  if (description?.trim()) amount += XP_REWARDS.taskDescriptionBonus
  if (status === 'bloqueada') amount += XP_REWARDS.taskBlockedBonus
  amount += Math.min(XP_REWARDS.subtaskCap, (subtasks || []).filter((item) => item.title?.trim()).length * XP_REWARDS.subtaskBonus)
  return amount
}

export function xpRequiredForLevel(level) {
  if (level >= 100) return 0
  const safeLevel = Math.max(1, Number(level || 1))
  return Math.round(180 + (safeLevel - 1) * 42 + Math.pow(safeLevel - 1, 1.32) * 14)
}

export function calculateLevel(totalXp = 0) {
  const safeXp = Math.max(0, Number(totalXp || 0))
  let level = 1
  let xpRemaining = safeXp

  while (level < 100) {
    const required = xpRequiredForLevel(level)
    if (xpRemaining < required) break
    xpRemaining -= required
    level += 1
  }

  const required = xpRequiredForLevel(level)
  const levelPercentage = level >= 100 ? 100 : Math.round((xpRemaining / Math.max(1, required)) * 100)

  return {
    level,
    title: getLevelTitle(level),
    totalXp: safeXp,
    xpInsideLevel: xpRemaining,
    xpForNextLevel: level >= 100 ? 0 : required - xpRemaining,
    levelPercentage,
    isMaxLevel: level >= 100,
  }
}
