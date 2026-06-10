import { addDays, toDateISO } from './date.js'

export function startOfMonth(dateISO) {
  const date = new Date(`${dateISO}T12:00:00`)
  return new Date(date.getFullYear(), date.getMonth(), 1, 12)
}

export function monthCells(dateISO) {
  const first = startOfMonth(dateISO)
  const start = addDays(first, -first.getDay())
  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(start, index)
    return { iso: toDateISO(date), day: date.getDate(), inMonth: date.getMonth() === first.getMonth() }
  })
}

export function weekCells(dateISO) {
  const date = new Date(`${dateISO}T12:00:00`)
  const start = addDays(date, -date.getDay())
  return Array.from({ length: 7 }, (_, index) => {
    const current = addDays(start, index)
    return { iso: toDateISO(current), day: current.getDate(), weekday: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][current.getDay()] }
  })
}

export function eventOccursOn(event, iso) {
  if (event.status === 'cancelled') return false
  if (iso < event.event_date) return false
  if (event.recurrence_until && iso > event.recurrence_until) return false
  if (event.recurrence_type === 'none') return event.event_date === iso
  const start = new Date(`${event.event_date}T12:00:00`)
  const target = new Date(`${iso}T12:00:00`)
  const days = Math.floor((target - start) / 86400000)
  if (event.recurrence_type === 'daily') return days >= 0
  if (event.recurrence_type === 'weekly') return days >= 0 && days % 7 === 0
  if (event.recurrence_type === 'monthly') return target.getDate() === start.getDate()
  return false
}

export function stripHtml(html = '') {
  const element = document.createElement('div')
  element.innerHTML = html
  return (element.textContent || '').trim()
}
