import { useEffect, useMemo, useRef, useState } from 'react'

const PREFIX = 'ascenda:v8.1:draft'
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30

function makeDraftKey(type, entityId = 'new') {
  return `${PREFIX}:${type}:${entityId || 'new'}`
}

export function readFormDraft(type, entityId) {
  try {
    const key = makeDraftKey(type, entityId)
    const parsed = JSON.parse(localStorage.getItem(key) || 'null')
    if (!parsed?.data || !parsed?.updatedAt) return null
    if (Date.now() - new Date(parsed.updatedAt).getTime() > MAX_AGE_MS) {
      localStorage.removeItem(key)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function writeFormDraft(type, entityId, data) {
  try {
    localStorage.setItem(makeDraftKey(type, entityId), JSON.stringify({ data, updatedAt: new Date().toISOString() }))
  } catch {
    // Un borrador no debe bloquear la edición si el navegador restringe localStorage.
  }
}

export function clearFormDraft(type, entityId) {
  try { localStorage.removeItem(makeDraftKey(type, entityId)) } catch { /* noop */ }
}

export function useFormDraft({ open, type, entityId = 'new', form, setForm, getInitialForm, enabled = true }) {
  const draftKey = useMemo(() => makeDraftKey(type, entityId), [type, entityId])
  const initialFactoryRef = useRef(getInitialForm)
  const baselineRef = useRef('')
  const initializedKeyRef = useRef('')
  const [recoveredDraft, setRecoveredDraft] = useState(null)
  initialFactoryRef.current = getInitialForm

  useEffect(() => {
    if (!open) {
      initializedKeyRef.current = ''
      setRecoveredDraft(null)
      return
    }
    const initialForm = initialFactoryRef.current()
    baselineRef.current = JSON.stringify(initialForm)
    const stored = enabled ? readFormDraft(type, entityId) : null
    setForm(stored?.data || initialForm)
    setRecoveredDraft(stored)
    initializedKeyRef.current = draftKey
  }, [open, draftKey, entityId, setForm, type])

  useEffect(() => {
    if (!open || enabled) return
    clearFormDraft(type, entityId)
    setRecoveredDraft(null)
  }, [open, enabled, entityId, type])

  useEffect(() => {
    if (!open || !enabled || initializedKeyRef.current !== draftKey) return undefined
    const serialized = JSON.stringify(form)
    const timer = window.setTimeout(() => {
      if (serialized === baselineRef.current) clearFormDraft(type, entityId)
      else writeFormDraft(type, entityId, form)
    }, 220)
    return () => window.clearTimeout(timer)
  }, [open, enabled, draftKey, entityId, form, type])

  function clearDraft() {
    clearFormDraft(type, entityId)
    setRecoveredDraft(null)
  }

  function discardDraft() {
    clearDraft()
    const initialForm = initialFactoryRef.current()
    baselineRef.current = JSON.stringify(initialForm)
    setForm(initialForm)
  }

  return { recoveredDraft, clearDraft, discardDraft }
}
