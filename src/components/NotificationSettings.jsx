import { useEffect, useState } from 'react'
import InstallPwaButton from './InstallPwaButton.jsx'
import { disablePushNotifications, enablePushNotifications, readPushState, sendLocalNotificationTest } from '../lib/pushNotifications.js'

export default function NotificationSettings({ userId, onToast }) {
  const [state, setState] = useState({ supported: true, permission: 'default', subscribed: false, reason: '' })
  const [busy, setBusy] = useState(false)

  async function refresh() {
    try { setState(await readPushState()) }
    catch (error) { setState((current) => ({ ...current, reason: error.message })) }
  }

  useEffect(() => { refresh() }, [])

  async function enable() {
    setBusy(true)
    try {
      await enablePushNotifications(userId)
      await refresh()
      onToast('Notificaciones push activadas en este dispositivo.')
    } catch (error) { onToast(error.message || 'No se pudieron activar las notificaciones.') }
    finally { setBusy(false) }
  }

  async function disable() {
    setBusy(true)
    try {
      await disablePushNotifications()
      await refresh()
      onToast('Notificaciones desactivadas en este dispositivo.')
    } catch (error) { onToast(error.message || 'No se pudieron desactivar las notificaciones.') }
    finally { setBusy(false) }
  }

  async function test() {
    try { await sendLocalNotificationTest(); onToast('Notificación de prueba enviada.') }
    catch (error) { onToast(error.message || 'No se pudo mostrar la prueba.') }
  }

  return <article className="content-panel panel notification-settings-card">
    <div className="card-heading"><div><p className="eyebrow">NOTIFICACIONES DEL SISTEMA</p><h3>Avisos con la web cerrada</h3><p>Activá este dispositivo para guardar una suscripción push y recibir recordatorios aunque Ascenda no esté abierta.</p></div><span className={`notification-state ${state.subscribed ? 'enabled' : ''}`}>{state.subscribed ? 'Activadas' : 'Desactivadas'}</span></div>
    {!state.supported && <p className="database-alert compact-alert">{state.reason}</p>}
    {state.supported && <div className="notification-settings-actions">
      {state.subscribed ? <button className="ghost-button" type="button" disabled={busy} onClick={disable}>{busy ? 'Actualizando…' : 'Desactivar en este dispositivo'}</button> : <button className="primary-button" type="button" disabled={busy} onClick={enable}>{busy ? 'Activando…' : 'Activar notificaciones'}</button>}
      {state.subscribed && <button className="mini-action" type="button" onClick={test}>Enviar prueba</button>}
      <InstallPwaButton />
    </div>}
    <small className="muted-copy compact">Estado del permiso del navegador: {state.permission}. La entrega exacta depende del navegador, el sistema operativo y sus restricciones de batería.</small>
  </article>
}
