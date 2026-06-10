export const ATTRIBUTE_CATALOG = [
  { id: 'disciplina', label: 'Disciplina', icon: '✦', copy: 'Constancia, hábitos y rutinas sostenidas.' },
  { id: 'productividad', label: 'Productividad', icon: '↗', copy: 'Tareas, proyectos y objetivos completados.' },
  { id: 'salud', label: 'Salud', icon: '◉', copy: 'Acciones de movimiento, descanso y cuidado personal.' },
  { id: 'conocimiento', label: 'Conocimiento', icon: '⌁', copy: 'Estudio, lectura y aprendizaje continuo.' },
  { id: 'finanzas', label: 'Finanzas', icon: '◇', copy: 'Metas económicas y decisiones financieras.' },
  { id: 'bienestar', label: 'Bienestar', icon: '☼', copy: 'Equilibrio, descanso y reflexión personal.' },
  { id: 'social', label: 'Social', icon: '◎', copy: 'Vínculos, actividades compartidas y comunidad.' },
]

export const DEFAULT_AVATARS = [
  { id: 'focus', label: 'Centinela', src: '/avatars/avatar-focus.svg' },
  { id: 'astral', label: 'Guerrero astral', src: '/avatars/avatar-astral.svg' },
  { id: 'sage', label: 'Sabio', src: '/avatars/avatar-sage.svg' },
  { id: 'runner', label: 'Impulso', src: '/avatars/avatar-runner.svg' },
]

export const COSMETIC_CATALOG = [
  { id: 'frame-default', type: 'frame', label: 'Marco esencial', className: 'frame-default', unlockedBy: 'base' },
  { id: 'frame-discipline', type: 'frame', label: 'Marco de disciplina', className: 'frame-discipline', unlockedBy: 'streak-7' },
  { id: 'frame-astral', type: 'frame', label: 'Marco astral', className: 'frame-astral', unlockedBy: 'task-25' },
  { id: 'badge-first-step', type: 'badge', label: 'Primer paso', icon: '✦', unlockedBy: 'first-task' },
  { id: 'badge-focus', type: 'badge', label: 'Enfoque sostenido', icon: '◈', unlockedBy: 'streak-7' },
  { id: 'badge-planner', type: 'badge', label: 'Planificador', icon: '▣', unlockedBy: 'agenda-5' },
]

export const ACHIEVEMENT_CATALOG = [
  { id: 'first-task', label: 'Primer avance', icon: '✓', rarity: 'Común', copy: 'Completá tu primera tarea.', rewardXp: 40, cosmeticId: 'badge-first-step', metric: 'tasksCompleted', target: 1 },
  { id: 'task-10', label: 'Ritmo productivo', icon: '↗', rarity: 'Poco común', copy: 'Completá 10 tareas.', rewardXp: 100, metric: 'tasksCompleted', target: 10 },
  { id: 'task-25', label: 'Motor encendido', icon: '✦', rarity: 'Raro', copy: 'Completá 25 tareas.', rewardXp: 220, cosmeticId: 'frame-astral', metric: 'tasksCompleted', target: 25 },
  { id: 'streak-7', label: 'Constancia inicial', icon: '◈', rarity: 'Poco común', copy: 'Mantené una racha de 7 días.', rewardXp: 140, cosmeticId: 'frame-discipline', metric: 'streak', target: 7 },
  { id: 'habit-20', label: 'Hábitos en marcha', icon: '◉', rarity: 'Raro', copy: 'Registrá 20 hábitos.', rewardXp: 180, metric: 'habitLogs', target: 20 },
  { id: 'routine-5', label: 'Secuencia dominada', icon: '↻', rarity: 'Raro', copy: 'Completá 5 rutinas.', rewardXp: 180, metric: 'routineLogs', target: 5 },
  { id: 'goal-1', label: 'Meta conquistada', icon: '◇', rarity: 'Épico', copy: 'Finalizá tu primer objetivo.', rewardXp: 260, metric: 'goalsCompleted', target: 1 },
  { id: 'agenda-5', label: 'Planificador', icon: '▣', rarity: 'Poco común', copy: 'Escribí 5 anotaciones de agenda.', rewardXp: 100, cosmeticId: 'badge-planner', metric: 'dailyNotes', target: 5 },
  { id: 'locked-note', label: 'Archivo reservado', icon: '⌾', rarity: 'Oculto', hidden: true, copy: 'Protegé una nota mediante PIN.', rewardXp: 120, metric: 'lockedNotes', target: 1 },
]

export const DAILY_MISSION_TEMPLATES = [
  { id: 'daily-task', label: 'Paso prioritario', icon: '✓', copy: 'Completá una tarea.', metric: 'tasksToday', target: 1, rewardXp: 25, rewardPt: 12 },
  { id: 'daily-habit', label: 'Ritmo constante', icon: '◉', copy: 'Registrá 2 hábitos durante el día.', metric: 'habitsToday', target: 2, rewardXp: 22, rewardPt: 10 },
  { id: 'daily-routine', label: 'Secuencia activa', icon: '↻', copy: 'Completá una rutina.', metric: 'routinesToday', target: 1, rewardXp: 28, rewardPt: 14 },
  { id: 'daily-agenda', label: 'Orden del día', icon: '▣', copy: 'Escribí una anotación en tu agenda.', metric: 'dailyNotesToday', target: 1, rewardXp: 18, rewardPt: 8 },
  { id: 'daily-variety', label: 'Avance equilibrado', icon: '✦', copy: 'Registrá 3 acciones útiles durante el día.', metric: 'actionsToday', target: 3, rewardXp: 30, rewardPt: 15 },
]

export const WEEKLY_MISSION_TEMPLATES = [
  { id: 'weekly-task', label: 'Semana productiva', icon: '↗', copy: 'Completá 8 tareas durante la semana.', metric: 'tasksWeek', target: 8, rewardXp: 130, rewardPt: 65 },
  { id: 'weekly-habit', label: 'Disciplina sostenida', icon: '◉', copy: 'Registrá 12 hábitos durante la semana.', metric: 'habitsWeek', target: 12, rewardXp: 120, rewardPt: 60 },
  { id: 'weekly-routine', label: 'Ritmo estructurado', icon: '↻', copy: 'Completá 4 rutinas durante la semana.', metric: 'routinesWeek', target: 4, rewardXp: 140, rewardPt: 70 },
  { id: 'weekly-agenda', label: 'Planificación consciente', icon: '▣', copy: 'Escribí agenda en 4 días distintos.', metric: 'dailyNotesWeek', target: 4, rewardXp: 100, rewardPt: 50 },
  { id: 'weekly-variety', label: 'Semana completa', icon: '✦', copy: 'Registrá 20 acciones útiles durante la semana.', metric: 'actionsWeek', target: 20, rewardXp: 170, rewardPt: 85 },
]
