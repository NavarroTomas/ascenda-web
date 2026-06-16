import { useMemo, useState } from 'react'
import {
  formatMoney,
  getFinanceMonthSummary,
  getMonthStartISO,
  mergeFinanceCategories,
  normalizeMoney,
} from '../lib/finance.js'

const RECURRENCE_LABELS = {
  none: 'Sin repetir',
  daily: 'Diario',
  weekly: 'Semanal',
  monthly: 'Mensual',
}

const PAYMENT_METHODS = ['Efectivo', 'Transferencia', 'Débito', 'Crédito', 'Mercado Pago', 'Otro']

const EMPTY_TRANSACTION = {
  type: 'expense',
  amount: '',
  category_id: '',
  category_name: 'Otro',
  description: '',
  transaction_date: '',
  payment_method: 'Otro',
  recurrence_type: 'none',
  notes: '',
}

const EMPTY_CATEGORY = {
  name: '',
  type: 'expense',
  icon: '•',
  color: '#42dac8',
}

function toInputDate(value, fallback) {
  return value || fallback
}

function categoryMatchesType(category, type) {
  return category.type === 'both' || category.type === type
}

export default function FinanceView({
  today,
  financeTransactions = [],
  financeCategories = [],
  financeMonthlyGoals = [],
  onSaveFinanceTransaction,
  onDeleteFinanceTransaction,
  onSaveFinanceCategory,
  onDeleteFinanceCategory,
  onSaveFinanceMonthlyGoal,
}) {
  const [transactionForm, setTransactionForm] = useState({ ...EMPTY_TRANSACTION, transaction_date: today })
  const [categoryForm, setCategoryForm] = useState(EMPTY_CATEGORY)
  const [goalForm, setGoalForm] = useState({ savings_goal: '', income_goal: '', expense_limit: '' })
  const [editingTransaction, setEditingTransaction] = useState(null)
  const [saving, setSaving] = useState(false)
  const monthStart = getMonthStartISO(new Date(`${today}T00:00:00`))

  const categories = useMemo(() => mergeFinanceCategories(financeCategories), [financeCategories])
  const currentGoal = useMemo(
    () => financeMonthlyGoals.find((goal) => goal.month_start === monthStart) || null,
    [financeMonthlyGoals, monthStart]
  )
  const summary = useMemo(
    () => getFinanceMonthSummary({ transactions: financeTransactions, monthlyGoal: currentGoal, monthStart }),
    [financeTransactions, currentGoal, monthStart]
  )
  const visibleCategories = categories.filter((category) => categoryMatchesType(category, transactionForm.type))

  function updateTransaction(field, value) {
    setTransactionForm((current) => {
      const next = { ...current, [field]: value }
      if (field === 'type') {
        const firstCategory = categories.find((category) => categoryMatchesType(category, value)) || categories[0]
        next.category_id = firstCategory?.id?.startsWith('default-') ? '' : firstCategory?.id || ''
        next.category_name = firstCategory?.name || 'Otro'
      }
      if (field === 'category_id') {
        const category = categories.find((item) => item.id === value)
        next.category_name = category?.name || next.category_name || 'Otro'
        next.category_id = category?.id?.startsWith('default-') ? '' : category?.id || ''
      }
      return next
    })
  }

  function startEdit(transaction) {
    setEditingTransaction(transaction)
    setTransactionForm({
      type: transaction.type || 'expense',
      amount: transaction.amount || '',
      category_id: transaction.category_id || '',
      category_name: transaction.category_name || 'Otro',
      description: transaction.description || '',
      transaction_date: transaction.transaction_date || today,
      payment_method: transaction.payment_method || 'Otro',
      recurrence_type: transaction.recurrence_type || 'none',
      notes: transaction.notes || '',
    })
  }

  function resetTransactionForm() {
    setEditingTransaction(null)
    setTransactionForm({ ...EMPTY_TRANSACTION, transaction_date: today })
  }

  async function submitTransaction(event) {
    event.preventDefault()
    const amount = normalizeMoney(transactionForm.amount)
    if (!amount) return
    setSaving(true)
    const payload = {
      type: transactionForm.type,
      amount,
      category_id: transactionForm.category_id || null,
      category_name: transactionForm.category_name || 'Otro',
      description: transactionForm.description.trim() || null,
      transaction_date: toInputDate(transactionForm.transaction_date, today),
      payment_method: transactionForm.payment_method || null,
      recurrence_type: transactionForm.recurrence_type || 'none',
      notes: transactionForm.notes.trim() || null,
    }
    const ok = await onSaveFinanceTransaction?.(payload, editingTransaction)
    setSaving(false)
    if (ok) resetTransactionForm()
  }

  async function submitCategory(event) {
    event.preventDefault()
    if (!categoryForm.name.trim()) return
    setSaving(true)
    const ok = await onSaveFinanceCategory?.({
      name: categoryForm.name.trim(),
      type: categoryForm.type,
      icon: categoryForm.icon.trim() || '•',
      color: categoryForm.color || '#42dac8',
    })
    setSaving(false)
    if (ok) setCategoryForm(EMPTY_CATEGORY)
  }

  async function submitGoal(event) {
    event.preventDefault()
    setSaving(true)
    await onSaveFinanceMonthlyGoal?.({
      month_start: monthStart,
      savings_goal: normalizeMoney(goalForm.savings_goal || currentGoal?.savings_goal || 0),
      income_goal: normalizeMoney(goalForm.income_goal || currentGoal?.income_goal || 0),
      expense_limit: normalizeMoney(goalForm.expense_limit || currentGoal?.expense_limit || 0),
    }, currentGoal)
    setSaving(false)
    setGoalForm({ savings_goal: '', income_goal: '', expense_limit: '' })
  }

  return (
    <section className="view-stack enter-up finance-view">
      <header className="section-heading">
        <div>
          <p className="eyebrow">GESTIÓN PERSONAL</p>
          <h2>Finanzas</h2>
          <p>Registrá ingresos, gastos, objetivos de ahorro y movimientos recurrentes sin mezclarlo con facturación ni contabilidad avanzada.</p>
        </div>
      </header>

      <section className="finance-hero panel">
        <div>
          <p className="eyebrow">BALANCE DEL MES</p>
          <h1>{formatMoney(summary.balance)}</h1>
          <p>Ingresos {formatMoney(summary.income)} · Gastos {formatMoney(summary.expenses)}</p>
        </div>
        <div className="finance-hero-grid">
          <Metric label="Objetivo de ahorro" value={summary.savingsGoal ? formatMoney(summary.savingsGoal) : 'Sin definir'} detail={summary.savingsGoal ? `${summary.savingsProgress}% alcanzado` : 'Cargá un objetivo para medir progreso.'} />
          <Metric label="Falta para ahorrar" value={formatMoney(summary.remainingToSave)} detail={summary.balance >= summary.savingsGoal && summary.savingsGoal ? 'Objetivo mensual cumplido.' : 'Diferencia contra el objetivo.'} />
          <Metric label="Mayor gasto" value={summary.topExpenseCategory?.name || 'Sin datos'} detail={summary.topExpenseCategory ? formatMoney(summary.topExpenseCategory.expense) : 'Todavía no hay egresos este mes.'} />
        </div>
      </section>

      <section className="dashboard-grid finance-grid-main">
        <article className="content-panel panel finance-form-panel">
          <div className="card-heading">
            <div>
              <p className="eyebrow">MOVIMIENTO</p>
              <h3>{editingTransaction ? 'Editar movimiento' : 'Nuevo movimiento'}</h3>
            </div>
            {editingTransaction && <button className="mini-action" type="button" onClick={resetTransactionForm}>Cancelar edición</button>}
          </div>
          <form className="finance-form" onSubmit={submitTransaction}>
            <div className="finance-type-switch">
              <button className={transactionForm.type === 'income' ? 'selected' : ''} type="button" onClick={() => updateTransaction('type', 'income')}>Ingreso</button>
              <button className={transactionForm.type === 'expense' ? 'selected' : ''} type="button" onClick={() => updateTransaction('type', 'expense')}>Gasto</button>
            </div>
            <label><span>Monto</span><input inputMode="decimal" value={transactionForm.amount} onChange={(event) => updateTransaction('amount', event.target.value)} placeholder="35000" /></label>
            <label><span>Categoría</span><select value={transactionForm.category_id || visibleCategories.find((category) => category.name === transactionForm.category_name)?.id || ''} onChange={(event) => updateTransaction('category_id', event.target.value)}>{visibleCategories.map((category) => <option value={category.id} key={category.id}>{category.icon} {category.name}</option>)}</select></label>
            <label><span>Descripción</span><input value={transactionForm.description} onChange={(event) => updateTransaction('description', event.target.value)} placeholder="Gimnasio, cliente web, comida..." /></label>
            <div className="two-column-form">
              <label><span>Fecha</span><input type="date" value={transactionForm.transaction_date} onChange={(event) => updateTransaction('transaction_date', event.target.value)} /></label>
              <label><span>Método</span><select value={transactionForm.payment_method} onChange={(event) => updateTransaction('payment_method', event.target.value)}>{PAYMENT_METHODS.map((method) => <option value={method} key={method}>{method}</option>)}</select></label>
            </div>
            <label><span>Repetición</span><select value={transactionForm.recurrence_type} onChange={(event) => updateTransaction('recurrence_type', event.target.value)}>{Object.entries(RECURRENCE_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label><span>Notas opcionales</span><textarea rows="2" value={transactionForm.notes} onChange={(event) => updateTransaction('notes', event.target.value)} /></label>
            <button className="primary-button wide" type="submit" disabled={saving || !normalizeMoney(transactionForm.amount)}>{saving ? 'Guardando…' : editingTransaction ? 'Guardar cambios' : 'Agregar movimiento'}</button>
          </form>
        </article>

        <article className="content-panel panel">
          <div className="card-heading">
            <div>
              <p className="eyebrow">OBJETIVO MENSUAL</p>
              <h3>Ahorro y límites</h3>
            </div>
          </div>
          <form className="finance-form" onSubmit={submitGoal}>
            <label><span>Objetivo de ahorro</span><input inputMode="decimal" value={goalForm.savings_goal} onChange={(event) => setGoalForm((current) => ({ ...current, savings_goal: event.target.value }))} placeholder={currentGoal?.savings_goal || '240000'} /></label>
            <label><span>Meta de ingresos</span><input inputMode="decimal" value={goalForm.income_goal} onChange={(event) => setGoalForm((current) => ({ ...current, income_goal: event.target.value }))} placeholder={currentGoal?.income_goal || '0'} /></label>
            <label><span>Límite de gastos</span><input inputMode="decimal" value={goalForm.expense_limit} onChange={(event) => setGoalForm((current) => ({ ...current, expense_limit: event.target.value }))} placeholder={currentGoal?.expense_limit || '0'} /></label>
            <button className="ghost-button" type="submit" disabled={saving}>Guardar objetivo mensual</button>
          </form>
          <div className="finance-progress-block">
            <span>Ahorro</span>
            <div className="progress-track"><i style={{ width: `${summary.savingsProgress}%` }} /></div>
            <small>{summary.savingsGoal ? `${summary.savingsProgress}% de ${formatMoney(summary.savingsGoal)}` : 'Sin objetivo cargado.'}</small>
          </div>
          {summary.expenseLimit > 0 && <div className="finance-progress-block danger-progress">
            <span>Gastos</span>
            <div className="progress-track"><i style={{ width: `${summary.expenseProgress}%` }} /></div>
            <small>{summary.expenseProgress}% del límite {formatMoney(summary.expenseLimit)}</small>
          </div>}
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="content-panel panel">
          <div className="card-heading">
            <div>
              <p className="eyebrow">MOVIMIENTOS</p>
              <h3>Últimos registros</h3>
            </div>
          </div>
          <div className="finance-transaction-list">
            {financeTransactions.length ? financeTransactions.slice(0, 18).map((transaction) => (
              <div className={`finance-transaction ${transaction.type}`} key={transaction.id}>
                <span>{transaction.type === 'income' ? '＋' : '−'}</span>
                <div>
                  <strong>{transaction.description || transaction.category_name || 'Movimiento'}</strong>
                  <small>{transaction.transaction_date} · {transaction.category_name || 'Sin categoría'} · {RECURRENCE_LABELS[transaction.recurrence_type] || 'Sin repetir'}</small>
                </div>
                <b>{transaction.type === 'income' ? '+' : '-'}{formatMoney(transaction.amount)}</b>
                <div className="row-actions">
                  <button className="mini-action" type="button" onClick={() => startEdit(transaction)}>Editar</button>
                  <button className="delete-button" type="button" onClick={() => onDeleteFinanceTransaction?.(transaction.id)}>×</button>
                </div>
              </div>
            )) : <div className="empty-state"><p>Todavía no cargaste movimientos financieros.</p></div>}
          </div>
        </article>

        <article className="content-panel panel">
          <div className="card-heading">
            <div>
              <p className="eyebrow">CATEGORÍAS</p>
              <h3>Personalizá tus gastos</h3>
            </div>
          </div>
          <form className="finance-category-form" onSubmit={submitCategory}>
            <input value={categoryForm.name} onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))} placeholder="Nueva categoría" />
            <select value={categoryForm.type} onChange={(event) => setCategoryForm((current) => ({ ...current, type: event.target.value }))}>
              <option value="expense">Gasto</option>
              <option value="income">Ingreso</option>
              <option value="both">Ambos</option>
            </select>
            <input value={categoryForm.icon} onChange={(event) => setCategoryForm((current) => ({ ...current, icon: event.target.value }))} maxLength="2" />
            <input type="color" value={categoryForm.color} onChange={(event) => setCategoryForm((current) => ({ ...current, color: event.target.value }))} />
            <button className="mini-action" type="submit" disabled={saving || !categoryForm.name.trim()}>Agregar</button>
          </form>
          <div className="finance-category-list">
            {categories.map((category) => {
              const custom = !String(category.id).startsWith('default-')
              return <div className="finance-category-chip" key={category.id}><i style={{ background: category.color }} /><span>{category.icon}</span><strong>{category.name}</strong><small>{category.type}</small>{custom && <button className="delete-button" type="button" onClick={() => onDeleteFinanceCategory?.(category.id)}>×</button>}</div>
            })}
          </div>
        </article>
      </section>
    </section>
  )
}

function Metric({ label, value, detail }) {
  return <div className="finance-metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
}
