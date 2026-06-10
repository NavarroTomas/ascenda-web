const BASE_RANKS = [
  { key: 'bronze', name: 'Bronce', astralName: 'Habitante terrano', min: 0, max: 299, color: '#b77a4b' },
  { key: 'silver', name: 'Plata', astralName: 'Guerrero del aura', min: 300, max: 749, color: '#aeb9ca' },
  { key: 'gold', name: 'Oro', astralName: 'Impulso carmesí', min: 750, max: 1349, color: '#e7ba4b' },
  { key: 'platinum', name: 'Platino', astralName: 'Ascendido solar', min: 1350, max: 2099, color: '#55c6cf' },
  { key: 'emerald', name: 'Esmeralda', astralName: 'Guardián del relámpago', min: 2100, max: 2999, color: '#4dc38d' },
  { key: 'diamond', name: 'Diamante', astralName: 'Heraldo celeste', min: 3000, max: 4099, color: '#6b9cff' },
  { key: 'master', name: 'Maestro', astralName: 'Campeón divino', min: 4100, max: 5399, color: '#9b73e8' },
  { key: 'ascendant', name: 'Ascendente', astralName: 'Trascendencia serena', min: 5400, max: null, color: '#e3edf7' },
]

const DIVISION_LABELS = { 3: 'III', 2: 'II', 1: 'I' }

function divisionBounds(rank, division) {
  if (rank.max == null) {
    const size = 750
    const offset = (3 - division) * size
    return { min: rank.min + offset, max: rank.min + offset + size - 1 }
  }
  const total = rank.max - rank.min + 1
  const size = Math.ceil(total / 3)
  const offset = (3 - division) * size
  return { min: rank.min + offset, max: Math.min(rank.max, rank.min + offset + size - 1) }
}

export const SEASON_RANK_DIVISIONS = BASE_RANKS.flatMap((rank, baseIndex) => [3, 2, 1].map((division, divisionIndex) => {
  const bounds = divisionBounds(rank, division)
  return {
    ...rank,
    division,
    divisionLabel: DIVISION_LABELS[division],
    minPoints: bounds.min,
    maxPoints: bounds.max,
    order: baseIndex * 3 + divisionIndex,
  }
}))

export function getSeasonRank(points = 0, visualTheme = 'standard') {
  const safePoints = Math.max(0, Number(points || 0))
  const matching = [...SEASON_RANK_DIVISIONS].reverse().find((entry) => safePoints >= entry.minPoints) || SEASON_RANK_DIVISIONS[0]
  const next = SEASON_RANK_DIVISIONS[matching.order + 1] || null
  const displayBase = visualTheme === 'astral' ? matching.astralName : matching.name
  const displayName = `${displayBase} ${matching.divisionLabel}`
  const floor = matching.minPoints
  const ceiling = next ? next.minPoints : matching.maxPoints + 1
  const span = Math.max(1, ceiling - floor)
  const progress = next ? Math.max(0, Math.min(100, Math.round(((safePoints - floor) / span) * 100))) : 100
  return { ...matching, displayName, points: safePoints, next, pointsToNext: next ? Math.max(0, next.minPoints - safePoints) : 0, progress }
}

export function didPromote(previousPoints, nextPoints) {
  return getSeasonRank(nextPoints).order > getSeasonRank(previousPoints).order
}

export function calculateSeasonPoints(baseAmount = 0) {
  return Math.max(2, Math.round(Number(baseAmount || 0) * 0.6))
}

export function getRankDisplay(entry, visualTheme = 'standard') {
  if (!entry) return 'Sin rango'
  const base = visualTheme === 'astral' ? entry.astralName : entry.name
  return `${base} ${entry.divisionLabel}`
}
