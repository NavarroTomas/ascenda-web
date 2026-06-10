import { useEffect, useMemo, useState } from 'react'
import NotificationSettings from './NotificationSettings.jsx'

const STATUS_LABELS = { pending: 'Pendiente', sent: 'Enviado', viewed: 'Visto', snoozed: 'Pospuesto', failed: 'Falló' }
const ACTION_LABELS = { pending_push: 'Preparando envío', push_sent: 'Push enviado', push_failed: 'Push fallido', shown_internal: 'Mostrado dentro de Ascenda', viewed: 'Marcado como visto', snoozed: 'Pospuesto' }

export default function RemindersView({ userId, reminders, notificationHistory, onOpenReminder, onDeleteReminder, onToggleReminder, onToast }){
 const [now,setNow]=useState(Date.now())
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[])
 const active=useMemo(()=>reminders.filter(r=>r.status==='active').sort((a,b)=>new Date(a.next_trigger_at)-new Date(b.next_trigger_at)),[reminders])
 const inactive=useMemo(()=>reminders.filter(r=>r.status!=='active'),[reminders])
 return <section className="view-stack enter-up">
  <header className="section-heading"><div><p className="eyebrow">AVISOS PROGRAMADOS</p><h2>Recordatorios</h2><p>Administrá avisos internos, push del sistema, sonidos, repeticiones e historial de entregas.</p></div><button className="primary-button" onClick={()=>onOpenReminder(null)}>＋ Nuevo recordatorio</button></header>
  <NotificationSettings userId={userId} onToast={onToast} />
  <article className="content-panel panel"><div className="card-heading"><div><p className="eyebrow">PRÓXIMOS AVISOS</p><h3>Activos</h3></div></div><div className="reminder-list">{active.map(r=><div className={`reminder-row priority-${r.priority} ${r.enabled===false?'disabled-reminder':''}`} key={r.id}><span>⚑</span><div><strong>{r.title}</strong><small>{new Date(r.next_trigger_at).toLocaleString('es-AR')} · {formatCountdown(r.next_trigger_at,now)} · {r.recurrence_type==='none'?'Una vez':`Repite ${translateRecurrence(r.recurrence_type)}`}</small>{r.source_type!=='standalone'&&<small>Vinculado a {translateSource(r.source_type)}</small>}</div><div className="row-actions"><button className="mini-action" type="button" onClick={()=>onToggleReminder(r)}>{r.enabled===false?'Activar':'Pausar'}</button><button className="mini-action" type="button" onClick={()=>onOpenReminder(r)}>Editar</button><button className="delete-button" type="button" onClick={()=>onDeleteReminder(r.id)}>×</button></div></div>)}{!active.length&&<p className="muted-copy">No hay recordatorios activos.</p>}</div></article>
  <article className="content-panel panel"><div className="card-heading"><div><p className="eyebrow">HISTORIAL DE ENTREGAS</p><h3>Últimos avisos procesados</h3></div></div><div className="reminder-history-list">{notificationHistory.slice(0,20).map(item=><div className="reminder-history-row" key={item.id}><span className={`delivery-status status-${item.delivery_status||'viewed'}`}>{STATUS_LABELS[item.delivery_status]||item.delivery_status||'Registrado'}</span><div><strong>{item.title}</strong><small>{new Date(item.fired_at).toLocaleString('es-AR')} · {ACTION_LABELS[item.action]||item.action}</small>{item.error_message&&<small className="form-error">{item.error_message}</small>}</div></div>)}{!notificationHistory.length&&<p className="muted-copy">Todavía no hay entregas registradas.</p>}</div></article>
  {inactive.length>0&&<article className="content-panel panel"><div className="card-heading"><div><p className="eyebrow">FINALIZADOS</p><h3>Avisos inactivos</h3></div></div>{inactive.slice(0,12).map(r=><div className="reminder-row muted" key={r.id}><span>✓</span><div><strong>{r.title}</strong><small>{translateReminderStatus(r.status)}</small></div><button className="delete-button" onClick={()=>onDeleteReminder(r.id)}>×</button></div>)}</article>}
 </section>
}

function formatCountdown(value, now){const diff=new Date(value).getTime()-now;if(diff<=0)return'Vencido';const seconds=Math.floor(diff/1000);const days=Math.floor(seconds/86400);const hours=Math.floor((seconds%86400)/3600);const minutes=Math.floor((seconds%3600)/60);const rest=seconds%60;if(days)return`Faltan ${days} d ${hours} h`;if(hours)return`Faltan ${hours} h ${minutes} min`;return`Faltan ${minutes} min ${rest} s`}
function translateRecurrence(type){return{daily:'diariamente',weekly:'semanalmente',monthly:'mensualmente'}[type]||type}
function translateSource(type){return{task:'una tarea',event:'un evento',routine:'una rutina',habit:'un hábito',goal:'un objetivo'}[type]||type}
function translateReminderStatus(status){return{sent:'Enviado',dismissed:'Visto',cancelled:'Cancelado'}[status]||status}
