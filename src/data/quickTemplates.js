export const QUICK_TEMPLATES = [
  {
    id: 'habit-gym-weekly',
    type: 'habit',
    group: 'Salud',
    title: 'Ir al gimnasio',
    description: 'Registrar dos sesiones por semana sin fijar días obligatorios.',
    payload: {
      title: 'Ir al gimnasio', description: 'Entrenar dos veces por semana.', category: 'Salud', category_id: null,
      target: 1, unit: 'sesión', habit_type: 'binary', frequency_type: 'weekly_target', weekly_target: 2,
      active_days: [0, 1, 2, 3, 4, 5, 6], xp_reward: 15,
    },
  },
  {
    id: 'habit-water',
    type: 'habit',
    group: 'Salud',
    title: 'Tomar agua',
    description: 'Hábito diario simple para sostener energía básica.',
    payload: {
      title: 'Tomar agua', description: 'Cumplir la meta diaria de hidratación.', category: 'Salud', category_id: null,
      target: 1, unit: 'día', habit_type: 'binary', frequency_type: 'daily', weekly_target: 1,
      active_days: [0, 1, 2, 3, 4, 5, 6], xp_reward: 10,
    },
  },
  {
    id: 'habit-reading',
    type: 'habit',
    group: 'Estudio',
    title: 'Leer 10 páginas',
    description: 'Lectura breve para sostener aprendizaje sin fricción.',
    payload: {
      title: 'Leer 10 páginas', description: 'Leer al menos diez páginas.', category: 'Estudio', category_id: null,
      target: 10, unit: 'páginas', habit_type: 'quantitative', frequency_type: 'daily', weekly_target: 1,
      active_days: [0, 1, 2, 3, 4, 5, 6], xp_reward: 12,
    },
  },
  {
    id: 'task-client-followup',
    type: 'task',
    group: 'Trabajo',
    title: 'Contactar cliente',
    description: 'Tarea de seguimiento comercial para no perder oportunidades.',
    payload: {
      title: 'Contactar cliente', description: 'Enviar mensaje de seguimiento y registrar respuesta.', category: 'Trabajo', category_id: null,
      due_time: null, priority: 'media', status: 'pendiente', completed: false, xp_reward: 18, subtasks: [], tag_names: ['cliente'],
    },
  },
  {
    id: 'routine-night',
    type: 'routine',
    group: 'Bienestar',
    title: 'Rutina de noche',
    description: 'Secuencia corta para cerrar el día y preparar el descanso.',
    payload: {
      title: 'Rutina de noche', description: 'Cierre básico del día.', category: 'Bienestar', category_id: null,
      routine_type: 'structured', scheduled_days: [0, 1, 2, 3, 4, 5, 6], scheduled_time: '22:30', duration_minutes: 25, xp_bonus: 30,
      steps: [
        { title: 'Ordenar pendientes', duration_minutes: 5, xp_reward: 6 },
        { title: 'Preparar mañana', duration_minutes: 10, xp_reward: 8 },
        { title: 'Desconectar pantallas', duration_minutes: 10, xp_reward: 8 },
      ],
    },
  },
  {
    id: 'goal-health-month',
    type: 'goal',
    group: 'Salud',
    title: 'Mejorar mi salud este mes',
    description: 'Objetivo amplio con hitos simples para empezar.',
    payload: {
      title: 'Mejorar mi salud este mes', description: 'Construir una base de actividad física, hidratación y descanso.', category: 'Salud', category_id: null,
      goal_type: 'manual', target_value: 100, current_value: 0, unit: '%', progress_percent: 0, due_date: null, status: 'active', visibility: 'private', xp_reward: 120,
      milestones: [
        { title: 'Registrar el primer entrenamiento', description: '', due_date: null, xp_reward: 25, completed: false },
        { title: 'Cumplir una semana de hábitos', description: '', due_date: null, xp_reward: 35, completed: false },
        { title: 'Revisar avances del mes', description: '', due_date: null, xp_reward: 40, completed: false },
      ],
    },
  },
]

export const TEMPLATE_TYPE_LABELS = {
  task: 'Tarea',
  habit: 'Hábito',
  routine: 'Rutina',
  goal: 'Objetivo',
}
