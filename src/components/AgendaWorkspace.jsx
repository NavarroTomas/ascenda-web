import { useMemo, useState } from 'react'
import RichTextEditor from './RichTextEditor.jsx'
import { addDays, formatLongDate, formatShortDate, getTodayISO, safeTime, toDateISO } from '../lib/date.js'
import { eventOccursOn, monthCells, weekCells } from '../lib/calendar.js'

function moveMonth(iso, amount) { const d=new Date(`${iso}T12:00:00`); d.setMonth(d.getMonth()+amount); return toDateISO(d) }
function dateLabel(iso){return new Intl.DateTimeFormat('es-AR',{month:'long',year:'numeric'}).format(new Date(`${iso}T12:00:00`))}

export default function AgendaWorkspace({ tasks, events, dailyNotes, reminders, routines, goals, selectedDate: initialDate, onSaveDailyNote, onDeleteDailyNote, onOpenEvent, onDeleteEvent, onCreateTaskFromText, onCreateReminderFromText }) {
  const [selectedDate,setSelectedDate]=useState(initialDate||getTodayISO()); const [view,setView]=useState('month')
  const cells=useMemo(()=>monthCells(selectedDate),[selectedDate]); const week=useMemo(()=>weekCells(selectedDate),[selectedDate])
  const notes=dailyNotes.filter(n=>n.note_date===selectedDate).sort((a,b)=>Number(b.is_pinned)-Number(a.is_pinned)||a.created_at.localeCompare(b.created_at))
  const dayTasks=tasks.filter(t=>t.due_date===selectedDate&&t.status!=='cancelada')
  const dayEvents=events.filter(e=>eventOccursOn(e,selectedDate)).sort((a,b)=>(a.start_time||'99').localeCompare(b.start_time||'99'))
  const dayReminders=reminders.filter(r=>r.status==='active'&&r.next_trigger_at?.slice(0,10)===selectedDate)
  async function addEntry(){ await onSaveDailyNote({ note_date:selectedDate,title:'Nueva entrada',content_html:'',color:'#38d9c6',is_pinned:false },null) }
  return <section className="view-stack enter-up">
    <header className="section-heading"><div><p className="eyebrow">PLANIFICACIÓN PERSONAL</p><h2>Agenda</h2><p>Combiná calendario, actividades y varias entradas de escritura libre para cada día.</p></div><div className="row-actions"><button className="ghost-button" type="button" onClick={()=>onOpenEvent(null,selectedDate)}>＋ Evento</button><button className="primary-button" type="button" onClick={addEntry}>＋ Anotación</button></div></header>
    <div className="agenda-tabs"><button className={view==='day'?'active':''} onClick={()=>setView('day')}>Día</button><button className={view==='week'?'active':''} onClick={()=>setView('week')}>Semana</button><button className={view==='month'?'active':''} onClick={()=>setView('month')}>Mes</button></div>
    <section className="agenda-layout">
      <article className="content-panel panel calendar-panel">
        <div className="calendar-header"><button onClick={()=>setSelectedDate(moveMonth(selectedDate,-1))}>‹</button><div><p className="eyebrow">CALENDARIO</p><h3>{dateLabel(selectedDate)}</h3></div><button onClick={()=>setSelectedDate(moveMonth(selectedDate,1))}>›</button></div>
        {view==='month'&&<><div className="calendar-weekdays">{['D','L','M','X','J','V','S'].map(d=><span key={d}>{d}</span>)}</div><div className="calendar-grid">{cells.map(cell=>{const eventsCount=events.filter(e=>eventOccursOn(e,cell.iso)).length;const taskCount=tasks.filter(t=>t.due_date===cell.iso&&!t.completed).length;const noteCount=dailyNotes.filter(n=>n.note_date===cell.iso).length;return <button className={`${cell.iso===selectedDate?'selected':''} ${cell.inMonth?'':'outside'}`} onClick={()=>setSelectedDate(cell.iso)} key={cell.iso}><b>{cell.day}</b><span>{eventsCount>0&&<i className="calendar-dot event-dot"/>}{taskCount>0&&<i className="calendar-dot task-dot"/>}{noteCount>0&&<i className="calendar-dot note-dot"/>}</span></button>})}</div></>}
        {view==='week'&&<div className="week-board">{week.map(day=><button className={`week-column ${day.iso===selectedDate?'selected':''}`} key={day.iso} onClick={()=>setSelectedDate(day.iso)}><strong>{day.weekday} {day.day}</strong>{events.filter(e=>eventOccursOn(e,day.iso)).slice(0,3).map(e=><small style={{borderColor:e.color}} key={e.id}>{safeTime(e.start_time)||'Todo el día'} · {e.title}</small>)}{tasks.filter(t=>t.due_date===day.iso&&!t.completed).slice(0,3).map(t=><small key={t.id}>✓ {t.title}</small>)}</button>)}</div>}
        {view==='day'&&<div className="day-timeline">{Array.from({length:16},(_,i)=>i+7).map(hour=><div className="timeline-row" key={hour}><span>{String(hour).padStart(2,'0')}:00</span><div>{dayEvents.filter(e=>Number(e.start_time?.slice(0,2))===hour).map(e=><button style={{borderLeftColor:e.color}} onClick={()=>onOpenEvent(e)} key={e.id}>{e.title}</button>)}{dayTasks.filter(t=>Number(t.due_time?.slice(0,2))===hour).map(t=><small key={t.id}>✓ {t.title}</small>)}</div></div>)}</div>}
        <button className="mini-action today-button" type="button" onClick={()=>setSelectedDate(getTodayISO())}>Volver a hoy</button>
      </article>
      <section className="agenda-day-stack">
        <article className="content-panel panel"><div className="card-heading"><div><p className="eyebrow">{formatLongDate(selectedDate).toUpperCase()}</p><h2>Actividades del día</h2></div><button className="mini-action" onClick={()=>onOpenEvent(null,selectedDate)}>＋ Evento</button></div>
          <div className="agenda-activity-list">{dayEvents.map(e=><div className="agenda-activity event" style={{borderLeftColor:e.color}} key={e.id}><span>◷</span><div><strong>{e.title}</strong><small>{e.all_day?'Todo el día':`${safeTime(e.start_time)||'Sin hora'}${e.end_time?` a ${safeTime(e.end_time)}`:''}`}{e.location?` · ${e.location}`:''}</small></div><div className="row-actions"><button className="mini-action" onClick={()=>onOpenEvent(e)}>Editar</button><button className="delete-button" onClick={()=>onDeleteEvent(e.id)}>×</button></div></div>)}{dayTasks.map(t=><div className="agenda-activity task" key={t.id}><span>✓</span><div><strong>{t.title}</strong><small>{t.due_time?safeTime(t.due_time):'Durante el día'} · {t.status}</small></div></div>)}{dayReminders.map(r=><div className="agenda-activity reminder" key={r.id}><span>⏰</span><div><strong>{r.title}</strong><small>{new Date(r.next_trigger_at).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})}</small></div></div>)}{!dayEvents.length&&!dayTasks.length&&!dayReminders.length&&<p className="muted-copy">No hay actividades programadas.</p>}</div>
        </article>
        <article className="content-panel panel"><div className="card-heading"><div><p className="eyebrow">AGENDA ESCRITA</p><h2>Anotaciones libres</h2><p>Podés crear varias entradas. Se guardan mientras escribís.</p></div><button className="mini-action" onClick={addEntry}>＋ Entrada</button></div>
          <div className="daily-note-list">{notes.map(note=><DailyNoteCard note={note} onSave={onSaveDailyNote} onDelete={onDeleteDailyNote} onCreateTaskFromText={onCreateTaskFromText} onCreateReminderFromText={onCreateReminderFromText} key={note.id}/>)}{!notes.length&&<p className="muted-copy">Todavía no escribiste nada para este día.</p>}</div>
        </article>
      </section>
    </section>
  </section>
}

function DailyNoteCard({note,onSave,onDelete,onCreateTaskFromText,onCreateReminderFromText}){
  const [title,setTitle]=useState(note.title); const [color,setColor]=useState(note.color||'#38d9c6')
  async function savePatch(patch){await onSave({...note,title,color,...patch},note)}
  return <article className="daily-note-card" style={{borderLeftColor:color}}><div className="daily-note-heading"><input value={title} onChange={e=>setTitle(e.target.value)} onBlur={()=>savePatch({title})}/><div className="row-actions"><input className="mini-color" type="color" value={color} onChange={e=>setColor(e.target.value)} onBlur={()=>savePatch({color})}/><button className="mini-action" onClick={()=>savePatch({is_pinned:!note.is_pinned})}>{note.is_pinned?'Desfijar':'Fijar'}</button><button className="delete-button" onClick={()=>onDelete(note.id)}>×</button></div></div><RichTextEditor compact value={note.content_html} onAutosave={(html)=>savePatch({content_html:html})} onConvertTask={onCreateTaskFromText} onConvertReminder={onCreateReminderFromText}/></article>
}
