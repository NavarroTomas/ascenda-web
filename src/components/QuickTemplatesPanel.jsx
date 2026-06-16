import { QUICK_TEMPLATES, TEMPLATE_TYPE_LABELS } from '../data/quickTemplates.js'

export default function QuickTemplatesPanel({ onApplyTemplate }) {
  const groups = QUICK_TEMPLATES.reduce((map, template) => {
    if (!map[template.group]) map[template.group] = []
    map[template.group].push(template)
    return map
  }, {})

  return <article className="content-panel panel quick-templates-panel">
    <div className="card-heading"><div><p className="eyebrow">PLANTILLAS RÁPIDAS</p><h2>Crear sin pensar desde cero</h2><p>Ideales para usuarios nuevos o para cargar estructuras comunes.</p></div></div>
    <div className="template-group-grid">{Object.entries(groups).map(([group, templates]) => <section className="template-group" key={group}><h3>{group}</h3>{templates.map((template) => <button className="template-card" type="button" onClick={() => onApplyTemplate(template)} key={template.id}><span>{TEMPLATE_TYPE_LABELS[template.type]}</span><strong>{template.title}</strong><small>{template.description}</small></button>)}</section>)}</div>
  </article>
}
