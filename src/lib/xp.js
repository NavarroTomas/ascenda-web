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

export function calculateTaskXp({ priority = 'media', due_date: dueDate, description = '', status = 'pendiente', subtasks = [] }) {
  const baseByPriority = { baja: 10, media: 16, alta: 26 }
  let amount = baseByPriority[priority] || 16
  if (dueDate) amount += 3
  if (description?.trim()) amount += 2
  if (status === 'bloqueada') amount += 2
  amount += Math.min(18, (subtasks || []).filter((item) => item.title?.trim()).length * 3)
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
