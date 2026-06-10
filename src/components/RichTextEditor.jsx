import { useEffect, useRef, useState } from 'react'
import { stripHtml } from '../lib/calendar.js'

export default function RichTextEditor({ value = '', onAutosave, onConvertTask, onConvertReminder, placeholder = 'Escribí acá…', compact = false }) {
  const editorRef = useRef(null)
  const timerRef = useRef(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(true)

  useEffect(() => {
    if (!editorRef.current) return
    if (editorRef.current.innerHTML !== (value || '')) editorRef.current.innerHTML = value || ''
  }, [value])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  function run(command, argument = null) {
    editorRef.current?.focus()
    document.execCommand(command, false, argument)
  }

  function scheduleSave() {
    clearTimeout(timerRef.current)
    setSaved(false)
    timerRef.current = setTimeout(async () => {
      setSaving(true)
      await onAutosave?.(editorRef.current?.innerHTML || '')
      setSaving(false)
      setSaved(true)
    }, 650)
  }

  function selectedOrContent() {
    const selected = window.getSelection()?.toString()?.trim()
    return selected || stripHtml(editorRef.current?.innerHTML || '')
  }

  return <div className={`rich-editor-shell ${compact ? 'compact' : ''}`}>
    <div className="rich-toolbar">
      <button type="button" onClick={() => run('bold')} title="Negrita"><b>B</b></button>
      <button type="button" onClick={() => run('insertUnorderedList')} title="Lista">• Lista</button>
      <button type="button" onClick={() => run('formatBlock', 'h3')} title="Título">Título</button>
      <button type="button" onClick={() => run('hiliteColor', '#ffe59a')} title="Resaltar">Resaltar</button>
      {onConvertTask && <button type="button" onClick={() => onConvertTask(selectedOrContent())} title="Convertir selección o contenido en tarea">→ Tarea</button>}
      {onConvertReminder && <button type="button" onClick={() => onConvertReminder(selectedOrContent())} title="Convertir selección o contenido en recordatorio">→ Aviso</button>}
      <span>{saving ? 'Guardando…' : saved ? 'Guardado' : 'Cambios pendientes'}</span>
    </div>
    <div ref={editorRef} className="rich-editor" contentEditable suppressContentEditableWarning data-placeholder={placeholder} onInput={scheduleSave} />
  </div>
}
