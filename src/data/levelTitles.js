export const LEVEL_TITLES = [
  { min: 1, max: 5, title: 'Principiante' },
  { min: 6, max: 10, title: 'Aprendiz' },
  { min: 11, max: 15, title: 'Iniciado' },
  { min: 16, max: 20, title: 'Explorador' },
  { min: 21, max: 25, title: 'Disciplinado' },
  { min: 26, max: 30, title: 'Guerrero' },
  { min: 31, max: 35, title: 'Combatiente experto' },
  { min: 36, max: 40, title: 'Guardián' },
  { min: 41, max: 45, title: 'Veterano' },
  { min: 46, max: 50, title: 'Campeón' },
  { min: 51, max: 55, title: 'Especialista' },
  { min: 56, max: 60, title: 'Maestro' },
  { min: 61, max: 65, title: 'Gran maestro' },
  { min: 66, max: 70, title: 'Élite' },
  { min: 71, max: 75, title: 'Conquistador' },
  { min: 76, max: 80, title: 'Héroe' },
  { min: 81, max: 85, title: 'Leyenda' },
  { min: 86, max: 90, title: 'Mítico' },
  { min: 91, max: 95, title: 'Ascendente' },
  { min: 96, max: 99, title: 'Trascendente' },
  { min: 100, max: 100, title: 'Soberano' },
]

export function getLevelTitle(level = 1) {
  const safeLevel = Math.max(1, Math.min(100, Number(level || 1)))
  return LEVEL_TITLES.find((entry) => safeLevel >= entry.min && safeLevel <= entry.max)?.title || 'Soberano'
}
