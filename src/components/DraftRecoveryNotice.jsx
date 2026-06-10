export default function DraftRecoveryNotice({ draft, onDiscard }) {
  if (!draft) return null
  const time = new Date(draft.updatedAt).toLocaleString('es-AR')
  return <div className="draft-recovery-notice"><div><strong>Se recuperó un borrador sin guardar</strong><small>Último cambio local: {time}</small></div><button className="mini-action" type="button" onClick={onDiscard}>Descartar borrador</button></div>
}
