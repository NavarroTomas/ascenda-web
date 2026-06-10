export const ONBOARDING_FOCUS_AREAS = [
  {
    id: 'organizacion',
    label: 'Organización',
    icon: '▣',
    copy: 'Ordenar tareas, agenda y prioridades.',
  },
  {
    id: 'disciplina',
    label: 'Disciplina',
    icon: '✦',
    copy: 'Mantener constancia incluso cuando baja la motivación.',
  },
  {
    id: 'salud',
    label: 'Salud',
    icon: '◉',
    copy: 'Construir hábitos sostenibles para sentirte mejor.',
  },
  {
    id: 'estudio',
    label: 'Estudio',
    icon: '⌁',
    copy: 'Aprender con objetivos claros y seguimiento real.',
  },
  {
    id: 'productividad',
    label: 'Productividad',
    icon: '↗',
    copy: 'Avanzar en proyectos sin perder el foco.',
  },
  {
    id: 'finanzas',
    label: 'Finanzas',
    icon: '◇',
    copy: 'Registrar metas y mejorar tus decisiones.',
  },
  {
    id: 'bienestar',
    label: 'Bienestar',
    icon: '☼',
    copy: 'Equilibrar progreso, descanso y vida personal.',
  },
  {
    id: 'otro',
    label: 'Otra área',
    icon: '+',
    copy: 'Configurar tu sistema con mayor libertad.',
  },
]

export const ONBOARDING_OBSTACLES = [
  {
    id: 'sin_inicio',
    label: 'No sé por dónde empezar',
    icon: '○',
  },
  {
    id: 'constancia',
    label: 'Me cuesta mantener la constancia',
    icon: '↻',
  },
  {
    id: 'olvidos',
    label: 'Suelo olvidar cosas importantes',
    icon: '◷',
  },
  {
    id: 'distraccion',
    label: 'Me distraigo con facilidad',
    icon: '≈',
  },
  {
    id: 'sobrecarga',
    label: 'Intento hacer demasiado de golpe',
    icon: '△',
  },
  {
    id: 'sin_progreso',
    label: 'No noto mis avances',
    icon: '↗',
  },
]

export const ONBOARDING_MOTIVATION_STYLES = [
  {
    id: 'claridad',
    label: 'Claridad',
    icon: '▤',
    copy: 'Necesito ver qué sigue y evitar el desorden.',
  },
  {
    id: 'progreso',
    label: 'Progreso visible',
    icon: '◈',
    copy: 'Me motiva comprobar que cada paso cuenta.',
  },
  {
    id: 'desafio',
    label: 'Desafío',
    icon: '⚔',
    copy: 'Avanzo mejor cuando siento que estoy superándome.',
  },
]

export const ONBOARDING_EXPERIENCE_MODES = [
  {
    id: 'simple',
    label: 'Simple',
    icon: '○',
    copy: 'Directo, limpio y fácil de usar. Menos distracciones.',
  },
  {
    id: 'standard',
    label: 'Estándar',
    icon: '◈',
    copy: 'Organización completa con progreso visual moderado.',
  },
  {
    id: 'rpg',
    label: 'RPG',
    icon: '✦',
    copy: 'Una experiencia más intensa, visual y cercana a un videojuego.',
  },
]

export const ONBOARDING_VISUAL_THEMES = [
  {
    id: 'standard',
    label: 'Sistema esencial',
    icon: '◌',
    copy: 'Tecnológico, minimalista y equilibrado.',
  },
  {
    id: 'medieval',
    label: 'Aventurero rúnico',
    icon: '♜',
    copy: 'Fantasía, emblemas y estética medieval original.',
  },
  {
    id: 'astral',
    label: 'Guerrero Astral',
    icon: '✧',
    copy: 'Energía, auras y ascensos de poder con identidad original.',
  },
]

export const ONBOARDING_REMINDER_LEVELS = [
  {
    id: 'calm',
    label: 'Discretos',
    icon: '○',
    copy: 'Solo avisos importantes. Sin interrumpir de más.',
  },
  {
    id: 'balanced',
    label: 'Equilibrados',
    icon: '◷',
    copy: 'Recordatorios útiles en los momentos adecuados.',
  },
  {
    id: 'active',
    label: 'Activos',
    icon: '◉',
    copy: 'Mayor acompañamiento para no perder el ritmo.',
  },
]

export const ONBOARDING_PACES = [
  {
    id: 'gradual',
    label: 'Gradual',
    icon: '↗',
    copy: 'Empezar con poco y sostenerlo en el tiempo.',
  },
  {
    id: 'balanced',
    label: 'Equilibrado',
    icon: '◈',
    copy: 'Combinar constancia con desafíos moderados.',
  },
  {
    id: 'intense',
    label: 'Intenso',
    icon: '✦',
    copy: 'Quiero exigirme más desde el comienzo.',
  },
]

export function createInitialOnboardingAnswers() {
  return {
    focus_areas: [],
    obstacles: [],
    motivation_style: '',
    experience_mode: 'standard',
    visual_theme: 'standard',
    reminder_level: 'balanced',
    pace: 'balanced',
    display_name: '',
  }
}