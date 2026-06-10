export const motivationalQuotes = [
  'El progreso pequeño también cuenta.',
  'La disciplina construye lo que la motivación inicia.',
  'No necesitás hacerlo perfecto. Necesitás hacerlo hoy.',
  'Cada acción consistente modifica tu dirección.',
  'La constancia supera a los impulsos aislados.',
  'Un día ordenado puede cambiar una semana completa.',
  'Tu próximo avance empieza con una decisión concreta.',
  'Las metas grandes se sostienen con pasos pequeños.',
  'Cumplir con vos mismo fortalece tu confianza.',
  'No subestimes una mejora del uno por ciento.',
  'Tu agenda debe trabajar a favor de tu vida.',
  'Empezar con poco sigue siendo empezar.',
  'La claridad reduce la fricción.',
  'Lo importante no es acelerar: es mantener la dirección.',
  'Tu futuro se organiza con acciones presentes.',
  'Un hábito simple puede sostener un cambio profundo.',
  'La intención mejora cuando se convierte en sistema.',
  'Registrá el avance. Lo que se mide se vuelve visible.',
  'Tu energía merece prioridades claras.',
  'La mejor rutina es la que realmente podés sostener.',
  'Una tarea completada libera espacio mental.',
  'La repetición convierte el esfuerzo en capacidad.',
  'No esperes el momento ideal para ordenar el día.',
  'La mejora personal no exige perfección constante.',
  'Elegí una acción que acerque tu vida a tu objetivo.',
  'La motivación aparece más seguido cuando existe estructura.',
  'Planificar también es avanzar.',
  'Cada racha comenzó con un único día cumplido.',
  'La consistencia transforma resultados ordinarios en logros extraordinarios.',
  'Hoy no necesitás resolver todo: necesitás avanzar.',
  'Tu sistema debe ayudarte incluso cuando tu motivación baja.',
  'Cumplí primero lo importante. Lo urgente se administra mejor después.',
  'La dirección correcta vale más que la velocidad sin foco.',
  'Convertí tus objetivos en acciones visibles.',
  'Hacerlo simple aumenta la probabilidad de hacerlo.',
  'Una buena semana empieza con una decisión concreta.',
]

export function getDailyQuote(customQuote = '') {
  if (customQuote?.trim()) return customQuote.trim()
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now - start) / 86400000)
  return motivationalQuotes[dayOfYear % motivationalQuotes.length]
}
