export function toDateISO(date) {
  const local = new Date(date)
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset())
  return local.toISOString().slice(0, 10)
}

export function getTodayISO() {
  return toDateISO(new Date())
}

export function addDays(date, amount) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

export function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export function getTodayLabel() {
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())
}

export function formatShortDate(dateISO) {
  if (!dateISO) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
    .format(new Date(`${dateISO}T12:00:00`))
    .replace('.', '')
}

export function formatLongDate(dateISO) {
  if (!dateISO) return 'Sin fecha asignada'
  return new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
    .format(new Date(`${dateISO}T12:00:00`))
}

export function safeTime(value) {
  return value ? value.slice(0, 5) : ''
}

export function dateTimeFromParts(dateISO, time = '23:59') {
  if (!dateISO) return null
  return new Date(`${dateISO}T${safeTime(time) || '23:59'}:00`)
}

export function createRecentDays(length = 14) {
  return Array.from({ length }, (_, index) => {
    const date = addDays(new Date(), index - length + 1)
    return {
      iso: toDateISO(date),
      day: date.getDate(),
      weekday: ['D', 'L', 'M', 'X', 'J', 'V', 'S'][date.getDay()],
    }
  })
}

export function createWeekDays(length = 7) {
  return Array.from({ length }, (_, index) => {
    const date = addDays(new Date(), index - length + 1)
    return {
      iso: toDateISO(date),
      weekday: ['D', 'L', 'M', 'X', 'J', 'V', 'S'][date.getDay()],
    }
  })
}

export function formatCountdown(targetDate) {
  if (!targetDate) return 'Sin horario definido'
  const difference = targetDate.getTime() - Date.now()
  if (difference <= 0) return 'Vencida o en curso'
  const totalMinutes = Math.floor(difference / 60000)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  if (days > 0) return `Faltan ${days} d ${hours} h`
  if (hours > 0) return `Faltan ${hours} h ${minutes} min`
  return `Faltan ${minutes} min`
}
