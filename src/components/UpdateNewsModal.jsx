import { UPDATE_NOTES } from '../data/updateNotes.js'

export default function UpdateNewsModal({ open, onClose }) {
  if (!open) return null
  const latest = UPDATE_NOTES[0]
  return (
    <div className="modal-backdrop update-news-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="update-news-modal panel enter-up">
        <div className="modal-heading">
          <div>
            <p className="eyebrow">NOVEDADES</p>
            <h2>{latest.title}</h2>
            <p>{latest.dateLabel}</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose}>×</button>
        </div>
        <div className="update-news-list">
          {latest.highlights.map((item) => <div className="update-news-item" key={item}><span>✓</span><p>{item}</p></div>)}
        </div>
        <div className="update-news-footer">
          <small>Este aviso aparece una sola vez por versión. También podés revisar las novedades desde Configuración.</small>
          <button className="primary-button" type="button" onClick={onClose}>Entendido</button>
        </div>
      </section>
    </div>
  )
}
