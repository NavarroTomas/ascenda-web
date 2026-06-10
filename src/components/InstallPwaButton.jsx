import { useEffect, useState } from 'react'
import { isStandalonePwa } from '../lib/pwa.js'

export default function InstallPwaButton() {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [installed, setInstalled] = useState(isStandalonePwa)

  useEffect(() => {
    function capturePrompt(event) { event.preventDefault(); setInstallPrompt(event) }
    function markInstalled() { setInstalled(true); setInstallPrompt(null) }
    window.addEventListener('beforeinstallprompt', capturePrompt)
    window.addEventListener('appinstalled', markInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', capturePrompt)
      window.removeEventListener('appinstalled', markInstalled)
    }
  }, [])

  async function install() {
    if (!installPrompt) return
    await installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  if (installed) return <span className="positive-pill">Aplicación instalada</span>
  if (!installPrompt) return <small className="muted-copy compact">También podés instalar Ascenda desde el menú del navegador cuando la opción esté disponible.</small>
  return <button className="ghost-button" type="button" onClick={install}>Instalar aplicación</button>
}
