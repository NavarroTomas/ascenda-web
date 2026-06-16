import { toDateISO } from './date.js'

export const DEFAULT_FINANCE_CATEGORIES = [
  { id: 'default-income-work', name: 'Trabajo', type: 'income', icon: '▣', color: '#42dac8' },
  { id: 'default-income-freelance', name: 'Freelance', type: 'income', icon: '◇', color: '#80a8ff' },
  { id: 'default-expense-gym', name: 'Gimnasio', type: 'expense', icon: '◆', color: '#e5ff3f' },
  { id: 'default-expense-health', name: 'Salud', type: 'expense', icon: '✚', color: '#ff7a83' },
  { id: 'default-expense-food', name: 'Comida', type: 'expense', icon: '○', color: '#f0bd65' },
  { id: 'default-expense-transport', name: 'Transporte', type: 'expense', icon: '→', color: '#b8adff' },
  { id: 'default-expense-services', name: 'Servicios', type: 'expense', icon: '⌁', color: '#9aa8b5' },
  { id: 'default-expense-education', name: 'Educación', type: 'expense', icon: '▤', color: '#61e6ad' },
  { id: 'default-expense-leisure', name: 'Ocio', type: 'expense', icon: '✦', color: '#c997ff' },
  { id: 'default-saving', name: 'Ahorro', type: 'both', icon: '⬢', color: '#3dffb5' },
  { id: 'default-other', name: 'Otro', type: 'both', icon: '•', color: '#718090' },
]

export function getMonthStartISO(date = new Date()) {
  const value = new Date(date)
  value.setDate(1)
  value.setHours(0, 0, 0, 0)
  return toDateISO(value)
}

export function getMonthEndISO(monthStart = getMonthStartISO()) {
  const value = new Date(`${monthStart}T00:00:00`)
  value.setMonth(value.getMonth() + 1)
  value.setDate(0)
  return toDateISO(value)
}

export function normalizeMoney(value) {
  const parsed = Number(String(value ?? '').replace(',', '.'))
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.round(parsed * 100) / 100)
}

export function formatMoney(value, currency = 'ARS') {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

export function mergeFinanceCategories(customCategories = []) {
  const custom = Array.isArray(customCategories) ? customCategories : []
  const names = new Set(custom.map((category) => String(category.name || '').toLowerCase()))
  return [
    ...custom,
    ...DEFAULT_FINANCE_CATEGORIES.filter((category) => !names.has(category.name.toLowerCase())),
  ]
}

export function getFinanceMonthSummary({ transactions = [], monthlyGoal = null, monthStart = getMonthStartISO() }) {
  const monthEnd = getMonthEndISO(monthStart)
  const monthTransactions = transactions.filter((item) => item.transaction_date >= monthStart && item.transaction_date <= monthEnd)
  const income = monthTransactions
    .filter((item) => item.type === 'income')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const expenses = monthTransactions
    .filter((item) => item.type === 'expense')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const balance = income - expenses
  const savingsGoal = Number(monthlyGoal?.savings_goal || 0)
  const expenseLimit = Number(monthlyGoal?.expense_limit || 0)
  const incomeGoal = Number(monthlyGoal?.income_goal || 0)
  const byCategory = monthTransactions.reduce((groups, item) => {
    const key = item.category_name || 'Sin categoría'
    if (!groups[key]) groups[key] = { name: key, income: 0, expense: 0, total: 0 }
    if (item.type === 'income') groups[key].income += Number(item.amount || 0)
    if (item.type === 'expense') groups[key].expense += Number(item.amount || 0)
    groups[key].total += Number(item.amount || 0)
    return groups
  }, {})
  const topExpenseCategory = Object.values(byCategory).sort((a, b) => b.expense - a.expense)[0] || null

  return {
    monthStart,
    monthEnd,
    transactions: monthTransactions,
    income,
    expenses,
    balance,
    savingsGoal,
    incomeGoal,
    expenseLimit,
    remainingToSave: Math.max(savingsGoal - balance, 0),
    savingsProgress: savingsGoal ? Math.min(100, Math.max(0, Math.round((balance / savingsGoal) * 100))) : 0,
    expenseProgress: expenseLimit ? Math.min(100, Math.max(0, Math.round((expenses / expenseLimit) * 100))) : 0,
    topExpenseCategory,
    byCategory: Object.values(byCategory),
  }
}
