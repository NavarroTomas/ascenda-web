import { useEffect, useMemo, useState } from 'react'
import {
  BadgeDollarSign,
  BarChart3,
  Boxes,
  Building2,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  Download,
  FilePlus2,
  FileSpreadsheet,
  LogOut,
  Menu,
  Moon,
  PackagePlus,
  Printer,
  Search,
  ShoppingCart,
  Sun,
  Tags,
  Truck,
  Upload,
  Users,
  WalletCards,
  X,
} from 'lucide-react'
import { hasSupabaseConfig, supabase } from './supabase'
import { dateTime, money, normalizeText, safeNumber, todayInput } from './utils'

const emptyProduct = { id: null, sku: '', name: '', brand_id: '', category: '', retail_price: '', wholesale_price: '', cost_price: '', profit_percent: '', stock: '', min_stock: '0', active: true }
const emptyCustomer = { id: null, name: '', document: '', phone: '', email: '', address: '', notes: '', price_list_id: '' }
const emptyBrand = { id: null, name: '' }
const emptyProvider = { id: null, name: '', document: '', phone: '', email: '', address: '', notes: '' }
const emptyPaymentMethod = { id: null, name: '', active: true }
const emptyPurchase = { provider_id: '', invoice_number: '', invoice_date: todayInput(), initial_paid: '', payment_method_id: '', bonus_percent: '', vat_percent: '21', notes: '' }
const emptyPriceList = { id: null, name: '', description: '', active: true, is_default: false }

const sections = [
  ['dashboard', 'Inicio', ClipboardList],
  ['monthlyBalance', 'Balance mensual', BarChart3],
  ['sales', 'Nueva venta', ShoppingCart],
  ['accounts', 'Cuentas clientes', WalletCards],
  ['providerAccounts', 'Cuentas proveedores', WalletCards],
  ['stock', 'Stock e ingresos', Truck],
  ['purchaseHistory', 'Historial de compras', FileSpreadsheet],
  ['products', 'Productos', Boxes],
  ['priceLists', 'Listas de precios', BadgeDollarSign],
  ['customers', 'Clientes', Users],
  ['providers', 'Proveedores', Building2],
  ['brands', 'Marcas', Tags],
  ['paymentMethods', 'Medios de pago', CreditCard],
  ['history', 'Historial de ventas', CircleDollarSign],
]

const CURRENT_UPDATE_VERSION = 'v21-novedades-tema'
const CURRENT_UPDATE_TITLE = 'Actualización V21'
const CURRENT_UPDATE_ITEMS = [
  'Nuevo modal de Novedades / Actualizaciones para ver los últimos cambios del sistema.',
  'Nuevo botón flotante abajo a la derecha para alternar entre modo luz y modo oscuro.',
  'La preferencia de tema queda guardada en el navegador.',
  'El aviso de actualización aparece automáticamente una vez y después queda marcado como visto.',
]

function App() {
  const [session, setSession] = useState(null)
  const [loadingAuth, setLoadingAuth] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoadingAuth(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoadingAuth(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, current) => setSession(current))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!hasSupabaseConfig) return <SetupMissing />
  if (loadingAuth) return <Centered text="Cargando..." />
  if (!session) return <Login />
  return <System session={session} />
}

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (loginError) setError('No se pudo iniciar sesión. Revisá el correo y la contraseña.')
  }

  return <div className="login-page"><form className="login-card" onSubmit={submit}><div className="logo-mark"><Building2 size={26} /></div><h1>Stock y ventas</h1><p>Ingresá con el usuario autorizado.</p><label>Correo electrónico<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label><label>Contraseña<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>{error && <div className="alert error">{error}</div>}<button className="primary" disabled={loading}>{loading ? 'Ingresando...' : 'Ingresar'}</button></form></div>
}

function System({ session }) {
  const [section, setSection] = useState('dashboard')
  const [invoiceGuard, setInvoiceGuard] = useState(null)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [priceLists, setPriceLists] = useState([])
  const [priceListItems, setPriceListItems] = useState([])
  const [brands, setBrands] = useState([])
  const [providers, setProviders] = useState([])
  const [paymentMethods, setPaymentMethods] = useState([])
  const [sales, setSales] = useState([])
  const [purchases, setPurchases] = useState([])
  const [stockMovements, setStockMovements] = useState([])
  const [accountMovements, setAccountMovements] = useState([])
  const [accountAllocations, setAccountAllocations] = useState([])
  const [providerAccountMovements, setProviderAccountMovements] = useState([])
  const [providerAccountAllocations, setProviderAccountAllocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light'
    return window.localStorage.getItem('stock-theme') || 'light'
  })
  const [showUpdateModal, setShowUpdateModal] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('stock-last-update-seen') !== CURRENT_UPDATE_VERSION
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('stock-theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme((current) => current === 'dark' ? 'light' : 'dark')
  }

  function closeUpdateModal() {
    window.localStorage.setItem('stock-last-update-seen', CURRENT_UPDATE_VERSION)
    setShowUpdateModal(false)
  }

  async function refresh() {
    setLoading(true)
    setError('')
    const [productRes, customerRes, priceListRes, priceListItemRes, brandRes, providerRes, paymentRes, salesRes, purchaseRes, stockRes, accountRes, allocationRes, providerAccountRes, providerAllocationRes] = await Promise.all([
      supabase.from('products').select('*, brands(name)').order('name'),
      supabase.from('customers').select('*, price_lists(name)').order('name'),
      supabase.from('price_lists').select('*').order('name'),
      supabase.from('price_list_items').select('*'),
      supabase.from('brands').select('*').order('name'),
      supabase.from('providers').select('*').order('name'),
      supabase.from('payment_methods').select('*').order('name'),
      supabase.from('sales').select('*, customers(name, address), payments(*, payment_methods(name)), sale_items(*, products(name, sku))').order('created_at', { ascending: false }).limit(250),
      supabase.from('purchases').select('*, providers(name), payment_methods(name), purchase_items(*, products(name, sku))').order('created_at', { ascending: false }).limit(500),
      supabase.from('stock_movements').select('*, products(name, sku), purchases(purchase_number), sales(receipt_number)').order('created_at', { ascending: false }).limit(400),
      supabase.from('account_movements').select('*, customers(name, address), payment_methods(name), sales(receipt_number)').order('created_at', { ascending: false }).limit(500),
      supabase.from('account_payment_allocations').select('*'),
      supabase.from('provider_account_movements').select('*, providers(name), payment_methods(name), purchases(purchase_number, invoice_number)').order('created_at', { ascending: false }).limit(700),
      supabase.from('provider_payment_allocations').select('*'),
    ])
    const results = [productRes, customerRes, priceListRes, priceListItemRes, brandRes, providerRes, paymentRes, salesRes, purchaseRes, stockRes, accountRes, allocationRes, providerAccountRes, providerAllocationRes]
    const firstError = results.find((result) => result.error)?.error
    if (firstError) setError(firstError.message)
    setProducts(productRes.data || [])
    setCustomers(customerRes.data || [])
    setPriceLists(priceListRes.data || [])
    setPriceListItems(priceListItemRes.data || [])
    setBrands(brandRes.data || [])
    setProviders(providerRes.data || [])
    setPaymentMethods(paymentRes.data || [])
    setSales(salesRes.data || [])
    setPurchases(purchaseRes.data || [])
    setStockMovements(stockRes.data || [])
    setAccountMovements(accountRes.data || [])
    setAccountAllocations(allocationRes.data || [])
    setProviderAccountMovements(providerAccountRes.data || [])
    setProviderAccountAllocations(providerAllocationRes.data || [])
    setLoading(false)
  }

  useEffect(() => { refresh() }, [])

  function flash(message) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 3500)
  }

  function requestSection(nextSection) {
    if (nextSection === section) {
      setMobileMenu(false)
      return
    }

    if (invoiceGuard?.active) {
      const confirmed = window.confirm(
        invoiceGuard.message || 'Tenés una factura sin completar. ¿Seguro que querés salir? Se perderán los datos cargados.'
      )

      if (!confirmed) return
    }

    setInvoiceGuard(null)
    setSection(nextSection)
    setMobileMenu(false)
  }

  const props = { products, customers, priceLists, priceListItems, brands, providers, paymentMethods, sales, purchases, stockMovements, accountMovements, accountAllocations, providerAccountMovements, providerAccountAllocations, refresh, flash, setError, setInvoiceGuard }

  return <div className="app-shell"><aside className={mobileMenu ? 'sidebar open' : 'sidebar'}><div className="sidebar-title"><Building2 size={21} /><span>Gestión comercial</span><button className="icon-btn sidebar-close" onClick={() => setMobileMenu(false)}><X size={18} /></button></div><nav>{sections.map(([id, label, Icon]) => <button key={id} className={section === id ? 'nav-item active' : 'nav-item'} onClick={() => requestSection(id)}><Icon size={18} />{label}</button>)}</nav><button className="nav-item logout" onClick={() => { if (!invoiceGuard?.active || window.confirm('Tenés una factura sin completar. ¿Seguro que querés cerrar sesión? Se perderán los datos cargados.')) supabase.auth.signOut() }}><LogOut size={18} />Cerrar sesión</button></aside><main className="main-content"><header className="topbar"><button className="icon-btn menu-button" onClick={() => setMobileMenu(true)}><Menu size={22} /></button><div><h1>{sections.find(([id]) => id === section)?.[1]}</h1><p>{session.user.email}</p></div><button className="secondary topbar-update-button" onClick={() => setShowUpdateModal(true)}>Novedades</button></header>{notice && <div className="alert success">{notice}</div>}{error && <div className="alert error">{error}<button className="link-btn" onClick={() => setError('')}>Cerrar</button></div>}{loading ? <Centered text="Consultando datos..." /> : <>{section === 'dashboard' && <Dashboard {...props} setSection={setSection} />}{section === 'monthlyBalance' && <MonthlyBalance {...props} />}{section === 'sales' && <NewSale {...props} setSection={setSection} />}{section === 'accounts' && <Accounts {...props} />}{section === 'providerAccounts' && <ProviderAccounts {...props} />}{section === 'stock' && <Stock {...props} />}{section === 'purchaseHistory' && <PurchaseHistory {...props} />}{section === 'products' && <Products {...props} />}{section === 'priceLists' && <PriceLists {...props} />}{section === 'customers' && <Customers {...props} setSection={setSection} />}{section === 'providers' && <Providers {...props} />}{section === 'brands' && <Brands {...props} />}{section === 'paymentMethods' && <PaymentMethods {...props} />}{section === 'history' && <History {...props} />}</>}</main><button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'} title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}>{theme === 'dark' ? <Sun size={21} strokeWidth={1.9} /> : <Moon size={21} strokeWidth={1.9} />}</button>{showUpdateModal && <UpdatesModal onClose={closeUpdateModal} />}</div>
}


function UpdatesModal({ onClose }) {
  return (
    <Modal title="Novedades / Actualizaciones" onClose={onClose}>
      <div className="updates-modal-content">
        <span className="updates-kicker">{CURRENT_UPDATE_TITLE}</span>
        <h3>Últimos cambios agregados</h3>
        <ul>
          {CURRENT_UPDATE_ITEMS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p>Este aviso se muestra una vez por actualización. Podés volver a abrirlo desde el botón Novedades.</p>
        <div className="modal-actions">
          <button className="primary" onClick={onClose}>Entendido</button>
        </div>
      </div>
    </Modal>
  )
}


function MonthlyBalance({ sales, purchases, products }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products])

  const monthSales = sales.filter((sale) => String(sale.created_at || '').slice(0, 7) === month)
  const monthPurchases = purchases.filter((purchase) => String(purchase.invoice_date || purchase.created_at || '').slice(0, 7) === month)
  const saleItems = monthSales.flatMap((sale) => (sale.sale_items || sale.items || []).map((item) => ({ ...item, sale })))

  const totalSales = roundCurrency(monthSales.reduce((sum, sale) => sum + Number(sale.total || 0), 0))
  const totalPurchases = roundCurrency(monthPurchases.reduce((sum, purchase) => sum + Number(purchase.total || 0), 0))
  const collected = roundCurrency(monthSales.reduce((sum, sale) => sum + Number(sale.paid_amount || 0), 0))
  const pendingSales = roundCurrency(monthSales.reduce((sum, sale) => sum + Number(sale.outstanding_amount || 0), 0))

  const productResume = new Map()
  let soldCost = 0
  let itemsWithoutCost = 0

  for (const item of saleItems) {
    const product = productMap.get(item.product_id)
    const quantity = safeNumber(item.quantity)
    const revenue = roundCurrency(Number(item.subtotal ?? item.base_subtotal ?? 0))
    const unitCost = safeNumber(item.unit_cost || item.cost_price || product?.cost_price || 0)
    const cost = roundCurrency(quantity * unitCost)
    const profit = roundCurrency(revenue - cost)

    if (unitCost <= 0) itemsWithoutCost += 1
    soldCost = roundCurrency(soldCost + cost)

    const key = item.product_id || item.product_name
    const current = productResume.get(key) || {
      product_name: item.product_name || product?.name || 'Producto',
      quantity: 0,
      revenue: 0,
      cost: 0,
      profit: 0,
    }

    current.quantity = roundCurrency(current.quantity + quantity)
    current.revenue = roundCurrency(current.revenue + revenue)
    current.cost = roundCurrency(current.cost + cost)
    current.profit = roundCurrency(current.profit + profit)
    productResume.set(key, current)
  }

  const grossProfit = roundCurrency(totalSales - soldCost)
  const grossProfitPercent = soldCost > 0 ? roundCurrency(grossProfit / soldCost * 100) : 0
  const profitRows = [...productResume.values()].map((row) => ({
    ...row,
    profit_percent: row.cost > 0 ? roundCurrency(row.profit / row.cost * 100) : 0,
  })).sort((a, b) => b.profit - a.profit)

  return <div className="stack">
    <section className="panel">
      <div className="panel-header split">
        <div>
          <h2>Balance mensual</h2>
          <p>Resumen de compras, ventas y ganancia bruta estimada por mes.</p>
        </div>
        <label className="month-filter">Mes<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label>
      </div>

      <div className="stats-grid five">
        <Stat title="Ventas registradas" value={money(totalSales)} subtitle={`${monthSales.length} comprobantes`} />
        <Stat title="Compras registradas" value={money(totalPurchases)} subtitle={`${monthPurchases.length} facturas de compra`} />
        <Stat title="Costo vendido" value={money(soldCost)} subtitle="según costo cargado en productos" />
        <Stat title="Ganancia bruta" value={money(grossProfit)} subtitle={soldCost > 0 ? `${grossProfitPercent}% sobre costo vendido` : "ventas - costo de productos vendidos"} />
        <Stat title="Cobrado / pendiente" value={money(collected)} subtitle={`Pendiente: ${money(pendingSales)}`} />
      </div>

      {itemsWithoutCost > 0 && <div className="alert warning">Hay {itemsWithoutCost} ítems vendidos sin costo base cargado. La ganancia de esos productos puede estar inflada. Cargá el costo en Productos para mejorar el balance.</div>}
    </section>

    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Ganancia por producto vendido</h2>
          <p>El cálculo usa el subtotal vendido de cada producto menos su costo base.</p>
        </div>
      </div>

      {profitRows.length === 0 ? <Empty text="No hay ventas para este mes." /> : <div className="table-wrap"><table><thead><tr><th>Producto</th><th>Cantidad vendida</th><th>Venta total</th><th>Costo estimado</th><th>Ganancia estimada</th><th>Ganancia %</th></tr></thead><tbody>{profitRows.map((row) => <tr key={row.product_name}><td>{row.product_name}</td><td>{row.quantity}</td><td>{money(row.revenue)}</td><td>{money(row.cost)}</td><td className={row.profit >= 0 ? 'profit-positive' : 'profit-negative'}>{money(row.profit)}</td><td className={row.profit >= 0 ? 'profit-positive' : 'profit-negative'}>{row.cost > 0 ? `${row.profit_percent}%` : '-'}</td></tr>)}</tbody></table></div>}
    </section>

    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Facturas de compra del mes</h2>
          <p>Total comprado según las facturas registradas.</p>
        </div>
      </div>

      {monthPurchases.length === 0 ? <Empty text="No hay compras registradas para este mes." /> : <div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Factura</th><th>Proveedor</th><th>Total</th><th>Pagado</th><th>Debe</th></tr></thead><tbody>{monthPurchases.map((purchase) => <tr key={purchase.id}><td>{purchase.invoice_date || dateTime(purchase.created_at)}</td><td>{purchase.invoice_number || `#${purchase.purchase_number}`}</td><td>{purchase.providers?.name || '-'}</td><td>{money(purchase.total)}</td><td>{money(purchase.paid_amount)}</td><td>{money(purchase.outstanding_amount)}</td></tr>)}</tbody></table></div>}
    </section>
  </div>
}

function Dashboard({ products, brands, customers, sales, accountMovements, setSection }) {
  const [stockBrandId, setStockBrandId] = useState('')
  const today = new Date().toISOString().slice(0, 10)
  const todaySales = sales.filter((sale) => sale.created_at.slice(0, 10) === today)
  const todayTotal = todaySales.reduce((sum, sale) => sum + Number(sale.total), 0)
  const activeProducts = products.filter((product) => product.active)
  const lowStock = activeProducts.filter((product) => Number(product.stock) <= Number(product.min_stock))
  const negativeStock = activeProducts.filter((product) => Number(product.stock) < 0)
  const debt = accountMovements.reduce((sum, movement) => sum + Number(movement.amount), 0)
  const stockValueProducts = activeProducts.filter((product) => {
    if (!stockBrandId) return true
    if (stockBrandId === '__without_brand__') return !product.brand_id
    return product.brand_id === stockBrandId
  })
  const stockRetailValue = stockValueProducts.reduce(
    (sum, product) => sum + Math.max(0, Number(product.stock || 0)) * Number(product.retail_price || 0),
    0
  )
  const stockUnits = stockValueProducts.reduce(
    (sum, product) => sum + Math.max(0, Number(product.stock || 0)),
    0
  )

  return <div className="stack">
    <div className="stats-grid five">
      <Stat title="Ventas de hoy" value={money(todayTotal)} subtitle={`${todaySales.length} comprobantes`} />
      <div className="stat-card stock-value-card">
        <span>Valor del stock</span>
        <strong>{money(stockRetailValue)}</strong>
        <small>{stockValueProducts.length} productos · {stockUnits} unidades · precio de venta</small>
        <select value={stockBrandId} onChange={(event) => setStockBrandId(event.target.value)}>
          <option value="">Todas las marcas</option>
          {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
          {activeProducts.some((product) => !product.brand_id) && <option value="__without_brand__">Sin marca</option>}
        </select>
      </div>
      <Stat title="Productos activos" value={activeProducts.length} subtitle={`${lowStock.length} con stock bajo · ${negativeStock.length} negativos`} />
      <Stat title="Clientes" value={customers.length} subtitle="registrados" />
      <Stat title="Saldo en cuentas corrientes" value={money(debt)} subtitle="pendiente de cobro" />
    </div>
    <div className="actions-grid">
      <button className="action-card" onClick={() => setSection('sales')}><ShoppingCart /><strong>Cargar una venta</strong><span>Armá el comprobante y descontá stock.</span></button>
      <button className="action-card" onClick={() => setSection('stock')}><Truck /><strong>Registrar ingreso</strong><span>Cargá una factura de compra y sumá mercadería.</span></button>
      <button className="action-card" onClick={() => setSection('accounts')}><WalletCards /><strong>Cuentas corrientes</strong><span>Consultá deudas y registrá cobros.</span></button>
    </div>
    <section className="panel">
      <div className="panel-header"><div><h2>Alertas de stock</h2><p>Productos que alcanzaron el mínimo configurado.</p></div></div>
      {lowStock.length === 0 ? <Empty text="No hay productos con stock bajo." /> : <DataTable headers={['Producto', 'Marca', 'Stock', 'Mínimo']} rows={lowStock.map((p) => [p.name, p.brands?.name || '-', p.stock, p.min_stock])} />}
    </section>
  </div>
}

function Products({ products, brands, refresh, flash, setError, setInvoiceGuard }) {
  const [search, setSearch] = useState('')
  const [productBrandId, setProductBrandId] = useState('')
  const [form, setForm] = useState(emptyProduct)
  const [showForm, setShowForm] = useState(false)
  const [showBulk, setShowBulk] = useState(false)
  const [saving, setSaving] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkPercent, setBulkPercent] = useState('')
  const [bulkScope, setBulkScope] = useState('all')
  const [bulkBrand, setBulkBrand] = useState('')
  const [bulkPriceType, setBulkPriceType] = useState('both')

  const visible = products.filter((p) => {
    const matchesBrand = !productBrandId
      || (productBrandId === '__without_brand__' ? !p.brand_id : p.brand_id === productBrandId)
    const matchesSearch = `${p.name} ${p.sku} ${p.category} ${p.brands?.name || ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
    return matchesBrand && matchesSearch
  })

  function edit(product) {
    setForm({
      ...product,
      brand_id: product.brand_id || '',
      cost_price: product.cost_price ?? '',
      profit_percent: product.profit_percent ?? '',
    })
    setShowForm(true)
  }

  async function save(event) {
    event.preventDefault()
    setSaving(true)

    const payload = {
      sku: normalizeText(form.sku) || null,
      name: normalizeText(form.name),
      brand_id: form.brand_id || null,
      category: normalizeText(form.category) || null,
      retail_price: safeNumber(form.retail_price),
      wholesale_price: safeNumber(form.retail_price),
      cost_price: safeNumber(form.cost_price),
      profit_percent: safeNumber(form.profit_percent),
      stock: safeNumber(form.stock),
      min_stock: safeNumber(form.min_stock),
      active: Boolean(form.active),
    }

    const result = form.id
      ? await supabase.from('products').update(payload).eq('id', form.id)
      : await supabase.from('products').insert(payload)

    setSaving(false)
    if (result.error) return setError(result.error.message)

    setForm(emptyProduct)
    setShowForm(false)
    flash('Producto guardado.')
    refresh()
  }

  async function deactivate(id) {
    if (!window.confirm('¿Desactivar este producto? Seguirá visible en operaciones anteriores.')) return
    const { error } = await supabase.from('products').update({ active: false }).eq('id', id)
    if (error) return setError(error.message)
    flash('Producto desactivado.')
    refresh()
  }

  async function hardDelete(id) {
    if (!window.confirm('¿Eliminar definitivamente este producto? Esta acción no se puede deshacer.')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) return setError(error.message)
    flash('Producto eliminado.')
    refresh()
  }

  async function bulkImport() {
    const lines = bulkText.split('\n').map((line) => line.trim()).filter(Boolean)
    if (!lines.length) return

    const normalizedBrands = new Map(brands.map((brand) => [brand.name.toLowerCase(), brand.id]))
    const rows = []

    for (const [index, line] of lines.entries()) {
      const parts = line.split(';').map((value) => value.trim())
      if (parts.length < 6) return setError(`La fila ${index + 1} no tiene los campos requeridos.`)

      let sku = ''
      let name = ''
      let brandName = ''
      let category = ''
      let retail = ''
      let stock = ''
      let minStock = '0'
      let cost = '0'
      let profit = '0'

      if (parts.length >= 10) {
        ;[sku, name, brandName, category, retail, , stock, minStock = '0', cost = '0', profit = '0'] = parts
      } else {
        ;[sku, name, brandName, category, retail, stock, minStock = '0', cost = '0', profit = '0'] = parts
      }

      let brandId = null

      if (brandName) {
        brandId = normalizedBrands.get(brandName.toLowerCase())
        if (!brandId) {
          const { data, error } = await supabase.from('brands').insert({ name: brandName }).select().single()
          if (error) return setError(`No se pudo crear la marca ${brandName}: ${error.message}`)
          brandId = data.id
          normalizedBrands.set(brandName.toLowerCase(), brandId)
        }
      }

      rows.push({
        sku: sku || null,
        name,
        brand_id: brandId,
        category: category || null,
        retail_price: safeNumber(retail),
        wholesale_price: safeNumber(retail),
        stock: safeNumber(stock),
        min_stock: safeNumber(minStock),
        cost_price: safeNumber(cost),
        profit_percent: safeNumber(profit),
        active: true,
      })
    }

    const { error } = await supabase.from('products').upsert(rows, { onConflict: 'sku' })
    if (error) return setError(error.message)

    setBulkText('')
    setShowBulk(false)
    flash(`${rows.length} productos procesados.`)
    refresh()
  }

  async function applyBulkPrice() {
    const percent = safeNumber(bulkPercent)
    if (!percent) return setError('Ingresá un porcentaje distinto de cero.')

    const { error } = await supabase.rpc('bulk_update_prices', {
      p_percent: percent,
      p_brand_id: bulkScope === 'brand' ? bulkBrand || null : null,
      p_price_type: 'both',
    })

    if (error) return setError(error.message)

    setBulkPercent('')
    flash('Precios actualizados.')
    refresh()
  }

  const formCost = safeNumber(form.cost_price)
  const formProfitPercent = safeNumber(form.profit_percent)
  const formSuggestedRetail = calculateSuggestedPrice(formCost, formProfitPercent)
  const formRetailProfit = roundCurrency(safeNumber(form.retail_price) - formCost)
  const formRealProfitPercent = calculateProfitPercent(formCost, form.retail_price)

  function updateCostPrice(value) {
    const nextCost = safeNumber(value)
    const currentRetail = safeNumber(form.retail_price)
    const currentProfitPercent = safeNumber(form.profit_percent)

    if (currentRetail > 0 && nextCost > 0) {
      setForm({ ...form, cost_price: value, profit_percent: String(calculateProfitPercent(nextCost, currentRetail)) })
      return
    }

    if (currentProfitPercent && nextCost > 0) {
      setForm({ ...form, cost_price: value, retail_price: String(calculateSuggestedPrice(nextCost, currentProfitPercent)) })
      return
    }

    setForm({ ...form, cost_price: value })
  }

  function updateRetailPrice(value) {
    const percent = calculateProfitPercent(form.cost_price, value)
    setForm({
      ...form,
      retail_price: value,
      profit_percent: safeNumber(form.cost_price) > 0 ? String(percent) : form.profit_percent,
    })
  }

  function updateProfitPercent(value) {
    const cost = safeNumber(form.cost_price)
    setForm({
      ...form,
      profit_percent: value,
      retail_price: cost > 0 ? String(calculateSuggestedPrice(cost, value)) : form.retail_price,
    })
  }

  return <div className="stack">
    <section className="panel">
      <div className="panel-header split">
        <div>
          <h2>Listado de productos</h2>
          <p>Precio de venta, disponibilidad, costo base y ganancia estimada.</p>
        </div>
        <div className="button-row">
          <button className="secondary" onClick={() => setShowBulk(!showBulk)}><Upload size={17} />Carga y precios masivos</button>
          <button className="primary" onClick={() => { setForm(emptyProduct); setShowForm(true) }}><PackagePlus size={17} />Nuevo producto</button>
        </div>
      </div>

      <div className="form-grid compact">
        <label>Filtrar por marca
          <select value={productBrandId} onChange={(e) => setProductBrandId(e.target.value)}>
            <option value="">Todas las marcas</option>
            {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
            {products.some((product) => !product.brand_id) && <option value="__without_brand__">Sin marca</option>}
          </select>
        </label>
      </div>

      <SearchBox value={search} setValue={setSearch} placeholder="Buscar por nombre, código, marca o categoría" />

      {showBulk && <div className="bulk-box">
        <h3>Carga masiva</h3>
        <p>Pegá una fila por producto separando los campos con punto y coma. Los últimos tres campos son opcionales. Si pegás una carga vieja con precio mayorista, el sistema la acepta e ignora ese campo.</p>
        <code>codigo;nombre;marca;categoria;precio_venta;stock;stock_minimo;costo_base;ganancia_%</code>
        <textarea rows="6" value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder="A001;Ravioles x 500g;La Italiana;Pastas;2500;20;5;1600;30" />
        <button className="secondary" onClick={bulkImport}>Procesar carga masiva</button>
        <hr />
        <h3>Modificar precio de venta por porcentaje</h3>
        <div className="form-grid compact">
          <label>Porcentaje<input value={bulkPercent} onChange={(e) => setBulkPercent(e.target.value)} placeholder="Ej.: 10 o -5" /></label>
          <label>Aplicar a<select value={bulkScope} onChange={(e) => setBulkScope(e.target.value)}><option value="all">Todos los productos</option><option value="brand">Una marca</option></select></label>
          {bulkScope === 'brand' && <label>Marca<select value={bulkBrand} onChange={(e) => setBulkBrand(e.target.value)}><option value="">Seleccionar</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}

        </div>
        <button className="secondary" onClick={applyBulkPrice}>Aplicar modificación</button>
      </div>}

      {visible.length === 0 ? <Empty text="No hay productos para mostrar." /> : <div className="table-wrap"><table><thead><tr><th>Código</th><th>Producto</th><th>Marca</th><th>Categoría</th><th>Precio de venta</th><th>Costo</th><th>Ganancia % real</th><th>Gana x unidad</th><th>Stock</th><th></th></tr></thead><tbody>{visible.map((p) => {
        const unitProfit = roundCurrency(Number(p.retail_price || 0) - Number(p.cost_price || 0))
        const realProfitPercent = Number(p.cost_price || 0) > 0 ? roundCurrency(unitProfit / Number(p.cost_price) * 100) : 0
        return <tr key={p.id} className={!p.active ? 'muted-row' : ''}>
          <td>{p.sku || '-'}</td>
          <td><strong>{p.name}</strong>{!p.active && <small>Desactivado</small>}</td>
          <td>{p.brands?.name || '-'}</td>
          <td>{p.category || '-'}</td>
          <td>{money(p.retail_price)}</td>
          <td>{Number(p.cost_price || 0) > 0 ? money(p.cost_price) : '-'}</td>
          <td className={realProfitPercent >= 0 ? 'profit-positive' : 'profit-negative'}>{Number(p.cost_price || 0) > 0 ? `${realProfitPercent}%` : '-'}</td>
          <td className={unitProfit >= 0 ? 'profit-positive' : 'profit-negative'}>{Number(p.cost_price || 0) > 0 ? money(unitProfit) : '-'}</td>
          <td><span className={Number(p.stock) < 0 ? 'badge danger-badge' : Number(p.stock) <= Number(p.min_stock) ? 'badge warning' : 'badge'}>{p.stock}</span></td>
          <td className="actions"><button className="link-btn" onClick={() => edit(p)}>Editar</button>{p.active && <button className="link-btn" onClick={() => deactivate(p.id)}>Desactivar</button>}<button className="link-btn danger" onClick={() => hardDelete(p.id)}>Eliminar</button></td>
        </tr>
      })}</tbody></table></div>}
    </section>

    {showForm && <Modal title={form.id ? 'Editar producto' : 'Nuevo producto'} onClose={() => setShowForm(false)}>
      <form onSubmit={save} className="form-grid">
        <label>Código / SKU<input value={form.sku || ''} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></label>
        <label className="wide">Nombre<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>Marca<select value={form.brand_id || ''} onChange={(e) => setForm({ ...form, brand_id: e.target.value })}><option value="">Sin marca</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        <label>Categoría<input value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label>
        <label>Precio de venta<input required inputMode="decimal" value={form.retail_price} onChange={(e) => updateRetailPrice(e.target.value)} /></label>
        <label>Costo base<input inputMode="decimal" value={form.cost_price} onChange={(e) => updateCostPrice(e.target.value)} placeholder="Costo de compra" /></label>
        <label>Ganancia %<input inputMode="decimal" value={form.profit_percent} onChange={(e) => updateProfitPercent(e.target.value)} placeholder="Ej.: 30" /></label>
        <div className="helper-box wide">
          <span>Precio de venta según ganancia: <b>{formCost > 0 && formProfitPercent !== 0 ? money(formSuggestedRetail) : '-'}</b></span>
          <span>Ganancia actual por unidad: <b>{formCost > 0 ? money(formRetailProfit) : '-'}</b></span>
        </div>
        <label>Stock<input required inputMode="decimal" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></label>
        <label>Stock mínimo<input inputMode="decimal" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} /></label>
        <label className="checkbox wide"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />Producto activo</label>
        <div className="modal-actions wide"><button type="button" className="secondary" onClick={() => setShowForm(false)}>Cancelar</button><button className="primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button></div>
      </form>
    </Modal>}
  </div>
}

function PriceLists({ priceLists, priceListItems, products, brands, refresh, flash, setError, setInvoiceGuard }) {
  const [form, setForm] = useState(emptyPriceList)
  const [showForm, setShowForm] = useState(false)
  const [editingPrices, setEditingPrices] = useState(null)
  const [priceDraft, setPriceDraft] = useState({})
  const [previewList, setPreviewList] = useState(null)
  const [previewBrandId, setPreviewBrandId] = useState('')
  const activeProducts = products.filter((product) => product.active)

  async function save(event) {
    event.preventDefault()
    const payload = {
      name: normalizeText(form.name),
      description: normalizeText(form.description) || null,
      active: Boolean(form.active),
      is_default: Boolean(form.is_default),
    }
    if (payload.is_default) {
      const { error: clearError } = await supabase.from('price_lists').update({ is_default: false }).neq('id', form.id || '00000000-0000-0000-0000-000000000000')
      if (clearError) return setError(clearError.message)
    }
    const result = form.id
      ? await supabase.from('price_lists').update(payload).eq('id', form.id)
      : await supabase.from('price_lists').insert(payload)
    if (result.error) return setError(result.error.message)
    setForm(emptyPriceList)
    setShowForm(false)
    flash('Lista de precios guardada.')
    refresh()
  }

  async function remove(list) {
    if (list.is_default) return setError('No podés eliminar la lista predeterminada. Marcá otra lista como predeterminada primero.')
    if (!window.confirm(`¿Eliminar la lista de precios "${list.name}"?`)) return
    const { error } = await supabase.from('price_lists').delete().eq('id', list.id)
    if (error) return setError(error.message)
    flash('Lista de precios eliminada.')
    refresh()
  }

  function openPrices(list) {
    const current = {}
    priceListItems.filter((item) => item.price_list_id === list.id).forEach((item) => { current[item.product_id] = String(item.price) })
    setPriceDraft(current)
    setEditingPrices(list)
  }

  function openPreview(list) {
    setPreviewBrandId('')
    setPreviewList(list)
  }

  async function savePrices() {
    const rows = activeProducts
      .filter((product) => String(priceDraft[product.id] ?? '').trim() !== '')
      .map((product) => ({ price_list_id: editingPrices.id, product_id: product.id, price: safeNumber(priceDraft[product.id]) }))
    const invalid = rows.find((row) => row.price < 0)
    if (invalid) return setError('Los precios no pueden ser negativos.')
    const { error: deleteError } = await supabase.from('price_list_items').delete().eq('price_list_id', editingPrices.id)
    if (deleteError) return setError(deleteError.message)
    if (rows.length) {
      const { error: insertError } = await supabase.from('price_list_items').insert(rows)
      if (insertError) return setError(insertError.message)
    }
    setEditingPrices(null)
    setPriceDraft({})
    flash('Precios de la lista actualizados.')
    refresh()
  }

  return <div className="stack">
    <section className="panel">
      <div className="panel-header split">
        <div><h2>Listas de precios</h2><p>Asigná precios específicos, imprimí listas comerciales y vinculá una lista predeterminada a cada cliente.</p></div>
        <button className="primary" onClick={() => { setForm(emptyPriceList); setShowForm(true) }}><PackagePlus size={17} />Nueva lista</button>
      </div>
      {priceLists.length === 0 ? <Empty text="No hay listas de precios." /> : <div className="table-wrap"><table><thead><tr><th>Nombre</th><th>Descripción</th><th>Estado</th><th>Predeterminada</th><th>Precios definidos</th><th></th></tr></thead><tbody>{priceLists.map((list) => <tr key={list.id}><td><strong>{list.name}</strong></td><td>{list.description || '-'}</td><td>{list.active ? 'Activa' : 'Desactivada'}</td><td>{list.is_default ? <span className="badge">Sí</span> : '-'}</td><td>{priceListItems.filter((item) => item.price_list_id === list.id).length}</td><td className="actions"><button className="link-btn" onClick={() => openPreview(list)}>Imprimir / exportar</button><button className="link-btn" onClick={() => openPrices(list)}>Gestionar precios</button><button className="link-btn" onClick={() => { setForm({ ...list }); setShowForm(true) }}>Editar</button><button className="link-btn danger" onClick={() => remove(list)}>Eliminar</button></td></tr>)}</tbody></table></div>}
    </section>
    {showForm && <Modal title={form.id ? 'Editar lista de precios' : 'Nueva lista de precios'} onClose={() => setShowForm(false)}><form className="form-grid" onSubmit={save}><label className="wide">Nombre<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label className="wide">Descripción<textarea rows="3" value={form.description || ''} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><label className="checkbox wide"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />Lista activa</label><label className="checkbox wide"><input type="checkbox" checked={form.is_default} onChange={(event) => setForm({ ...form, is_default: event.target.checked })} />Usar como lista predeterminada</label><div className="modal-actions wide"><button type="button" className="secondary" onClick={() => setShowForm(false)}>Cancelar</button><button className="primary">Guardar</button></div></form></Modal>}
    {editingPrices && <Modal wide title={`Precios de ${editingPrices.name}`} onClose={() => setEditingPrices(null)}><p>Dejá un campo vacío para utilizar el precio de venta general del producto como respaldo.</p><div className="table-wrap"><table><thead><tr><th>Código</th><th>Producto</th><th>Precio de venta general</th><th>Precio específico de la lista</th></tr></thead><tbody>{activeProducts.map((product) => <tr key={product.id}><td>{product.sku || '-'}</td><td>{product.name}</td><td>{money(product.retail_price)}</td><td><input inputMode="decimal" placeholder="Usar precio general" value={priceDraft[product.id] ?? ''} onChange={(event) => setPriceDraft({ ...priceDraft, [product.id]: event.target.value })} /></td></tr>)}</tbody></table></div><div className="modal-actions"><button className="secondary" onClick={() => setEditingPrices(null)}>Cancelar</button><button className="primary" onClick={savePrices}>Guardar precios</button></div></Modal>}
    {previewList && <PriceListPreview list={previewList} products={activeProducts} brands={brands} priceListItems={priceListItems} brandId={previewBrandId} setBrandId={setPreviewBrandId} onClose={() => setPreviewList(null)} />}
  </div>
}

function Customers({ customers, priceLists, refresh, flash, setError, setSection }) {
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(emptyCustomer)
  const [show, setShow] = useState(false)
  const visible = customers.filter((customer) => `${customer.name} ${customer.document} ${customer.phone}`.toLowerCase().includes(search.toLowerCase()))
  const defaultList = priceLists.find((list) => list.is_default && list.active)

  function openNew() {
    setForm({ ...emptyCustomer, price_list_id: defaultList?.id || '' })
    setShow(true)
  }

  async function save(event) {
    event.preventDefault()
    const payload = {
      name: normalizeText(form.name),
      document: normalizeText(form.document) || null,
      phone: normalizeText(form.phone) || null,
      email: normalizeText(form.email) || null,
      address: normalizeText(form.address) || null,
      notes: normalizeText(form.notes) || null,
      price_list_id: form.price_list_id || null,
    }
    const result = form.id ? await supabase.from('customers').update(payload).eq('id', form.id) : await supabase.from('customers').insert(payload)
    if (result.error) return setError(result.error.message)
    setShow(false)
    setForm(emptyCustomer)
    flash('Cliente guardado.')
    refresh()
  }

  async function remove(id) {
    if (!window.confirm('¿Eliminar este cliente? También se eliminarán sus movimientos de cuenta corriente.')) return
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) return setError(error.message)
    flash('Cliente eliminado.')
    refresh()
  }

  return <section className="panel"><div className="panel-header split"><div><h2>Clientes</h2><p>Datos de contacto, cuenta corriente y lista de precios predeterminada.</p></div><button className="primary" onClick={openNew}><Users size={17} />Nuevo cliente</button></div><SearchBox value={search} setValue={setSearch} placeholder="Buscar cliente" />{visible.length === 0 ? <Empty text="No hay clientes cargados." /> : <div className="table-wrap"><table><thead><tr><th>Nombre</th><th>Documento</th><th>Teléfono</th><th>Domicilio</th><th>Correo</th><th>Lista de precios</th><th></th></tr></thead><tbody>{visible.map((customer) => <tr key={customer.id}><td><strong>{customer.name}</strong></td><td>{customer.document || '-'}</td><td>{customer.phone || '-'}</td><td>{customer.address || '-'}</td><td>{customer.email || '-'}</td><td>{customer.price_lists?.name || defaultList?.name || 'Precio de venta general'}</td><td className="actions"><button className="link-btn" onClick={() => { setForm({ ...customer, price_list_id: customer.price_list_id || '' }); setShow(true) }}>Editar</button><button className="link-btn" onClick={() => { localStorage.setItem('selectedCustomerAccount', customer.id); setSection('accounts') }}>Cuenta corriente</button><button className="link-btn danger" onClick={() => remove(customer.id)}>Eliminar</button></td></tr>)}</tbody></table></div>}{show && <Modal title={form.id ? 'Editar cliente' : 'Nuevo cliente'} onClose={() => setShow(false)}><form className="form-grid" onSubmit={save}><label className="wide">Nombre<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Documento<input value={form.document || ''} onChange={(event) => setForm({ ...form, document: event.target.value })} /></label><label>Teléfono<input value={form.phone || ''} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label><label>Correo<input type="email" value={form.email || ''} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label>Dirección<input value={form.address || ''} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label><label className="wide">Lista de precios predeterminada<select value={form.price_list_id || ''} onChange={(event) => setForm({ ...form, price_list_id: event.target.value })}><option value="">Usar lista predeterminada del sistema</option>{priceLists.filter((list) => list.active).map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}</select></label><label className="wide">Notas<textarea rows="3" value={form.notes || ''} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label><div className="modal-actions wide"><button type="button" className="secondary" onClick={() => setShow(false)}>Cancelar</button><button className="primary">Guardar</button></div></form></Modal>}</section>
}

function GenericCrud({ title, description, items, emptyForm, fields, saveTable, refresh, flash, setError, deleteMessage }) {
  const [form, setForm] = useState(emptyForm)
  async function save(event) { event.preventDefault(); const payload = Object.fromEntries(fields.map(({ key }) => [key, typeof form[key] === 'boolean' ? form[key] : normalizeText(form[key]) || null])); const result = form.id ? await supabase.from(saveTable).update(payload).eq('id', form.id) : await supabase.from(saveTable).insert(payload); if (result.error) return setError(result.error.message); setForm(emptyForm); flash(`${title.slice(0, -1)} guardado.`); refresh() }
  async function remove(id) { if (!window.confirm(deleteMessage)) return; const { error } = await supabase.from(saveTable).delete().eq('id', id); if (error) return setError(error.message); flash(`${title.slice(0, -1)} eliminado.`); refresh() }
  return <div className="two-columns"><section className="panel"><div className="panel-header"><h2>{form.id ? 'Editar' : 'Nuevo registro'}</h2><p>{description}</p></div><form onSubmit={save} className="stack">{fields.map((field) => field.type === 'textarea' ? <label key={field.key}>{field.label}<textarea rows="3" value={form[field.key] || ''} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })} /></label> : field.type === 'checkbox' ? <label className="checkbox" key={field.key}><input type="checkbox" checked={Boolean(form[field.key])} onChange={(e) => setForm({ ...form, [field.key]: e.target.checked })} />{field.label}</label> : <label key={field.key}>{field.label}<input required={field.required} value={form[field.key] || ''} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })} /></label>)}<div className="button-row"><button className="primary">Guardar</button>{form.id && <button type="button" className="secondary" onClick={() => setForm(emptyForm)}>Cancelar</button>}</div></form></section><section className="panel"><div className="panel-header"><h2>{title}</h2></div>{items.length === 0 ? <Empty text="Todavía no hay registros." /> : <div className="table-wrap"><table><thead><tr><th>Nombre</th><th></th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.name}</strong>{item.phone && <small>{item.phone}</small>}</td><td className="actions"><button className="link-btn" onClick={() => setForm(item)}>Editar</button><button className="link-btn danger" onClick={() => remove(item.id)}>Eliminar</button></td></tr>)}</tbody></table></div>}</section></div>
}
function Brands(props) { return <GenericCrud {...props} title="Marcas" description="Creá, editá o eliminá marcas." items={props.brands} emptyForm={emptyBrand} saveTable="brands" fields={[{ key: 'name', label: 'Nombre', required: true }]} deleteMessage="¿Eliminar esta marca? Los productos quedarán sin marca." /> }
function Providers(props) { return <GenericCrud {...props} title="Proveedores" description="Datos para registrar facturas de compra." items={props.providers} emptyForm={emptyProvider} saveTable="providers" fields={[{ key: 'name', label: 'Nombre / Razón social', required: true }, { key: 'document', label: 'CUIT / Documento' }, { key: 'phone', label: 'Teléfono' }, { key: 'email', label: 'Correo' }, { key: 'address', label: 'Dirección' }, { key: 'notes', label: 'Notas', type: 'textarea' }]} deleteMessage="¿Eliminar este proveedor? Las compras anteriores conservarán el comprobante pero quedarán sin proveedor asociado." /> }
function PaymentMethods(props) { return <GenericCrud {...props} title="Medios de pago" description="Administrá las opciones disponibles al cobrar." items={props.paymentMethods} emptyForm={emptyPaymentMethod} saveTable="payment_methods" fields={[{ key: 'name', label: 'Nombre', required: true }, { key: 'active', label: 'Medio de pago activo', type: 'checkbox' }]} deleteMessage="¿Eliminar este medio de pago? Los comprobantes anteriores conservarán el importe pero quedarán sin método asociado." /> }

function NewSale({ products, brands, customers, priceLists, priceListItems, paymentMethods, refresh, flash, setError, setSection, setInvoiceGuard }) {
  const activeProducts = products.filter((product) => product.active)
  const activePriceLists = priceLists.filter((list) => list.active)
  const defaultPriceList = activePriceLists.find((list) => list.is_default) || activePriceLists[0]
  const [search, setSearch] = useState('')
  const [saleBrandId, setSaleBrandId] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [priceListId, setPriceListId] = useState(defaultPriceList?.id || '')
  const [cart, setCart] = useState([])
  const [payments, setPayments] = useState([{ payment_method_id: '', amount: '' }])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [receipt, setReceipt] = useState(null)

  const hasSaleDraft =
    cart.length > 0 ||
    Boolean(customerId) ||
    Boolean(notes.trim()) ||
    payments.some((payment) => payment.payment_method_id || payment.amount)

  useEffect(() => {
    if (!priceListId && defaultPriceList?.id) setPriceListId(defaultPriceList.id)
  }, [defaultPriceList?.id, priceListId])

  useEffect(() => {
    if (!setInvoiceGuard) return

    if (hasSaleDraft) {
      setInvoiceGuard({
        source: 'sale',
        active: true,
        message: 'Tenés una factura de venta sin completar. ¿Seguro que querés salir? Se perderán los datos cargados.',
      })
    } else {
      setInvoiceGuard((current) => current?.source === 'sale' ? null : current)
    }

    return () => setInvoiceGuard((current) => current?.source === 'sale' ? null : current)
  }, [hasSaleDraft, setInvoiceGuard])

  const lineBase = (item) => roundCurrency(safeNumber(item.quantity) * safeNumber(item.unit_price))
  const lineDiscount = (item) => roundCurrency(lineBase(item) * safeNumber(item.discount_percent) / 100)
  const lineTotal = (item) => roundCurrency(Math.max(0, lineBase(item) - lineDiscount(item)))
  const subtotal = roundCurrency(cart.reduce((sum, item) => sum + lineBase(item), 0))
  const discountAmount = roundCurrency(cart.reduce((sum, item) => sum + lineDiscount(item), 0))
  const total = roundCurrency(cart.reduce((sum, item) => sum + lineTotal(item), 0))
  const paid = roundCurrency(payments.reduce((sum, payment) => sum + safeNumber(payment.amount), 0))
  const accountMethod = paymentMethods.find((method) => method.name.toLowerCase() === 'cuenta corriente')
  const visible = activeProducts.filter((product) => (!saleBrandId || product.brand_id === saleBrandId) && `${product.name} ${product.sku} ${product.brands?.name || ''}`.toLowerCase().includes(search.toLowerCase())).slice(0, 30)

  function getProductPrice(product, selectedListId = priceListId) {
    const custom = priceListItems.find((item) => item.price_list_id === selectedListId && item.product_id === product.id)
    return safeNumber(custom?.price ?? product.retail_price)
  }

  function changeCustomer(nextCustomerId) {
    const customer = customers.find((item) => item.id === nextCustomerId)
    const nextListId = customer?.price_list_id || defaultPriceList?.id || ''
    setCustomerId(nextCustomerId)
    setPriceListId(nextListId)
    setCart([])
  }

  function changePriceList(nextPriceListId) {
    setPriceListId(nextPriceListId)
    setCart([])
  }

  function add(product) {
    const price = getProductPrice(product)
    setCart((current) => current.some((item) => item.product_id === product.id)
      ? current.map((item) => item.product_id === product.id ? { ...item, quantity: String(safeNumber(item.quantity) + 1) } : item)
      : [...current, { product_id: product.id, product_name: product.name, quantity: '1', unit_price: String(price), discount_percent: '', unit_cost: String(product.cost_price || 0), stock: Number(product.stock) }])
  }

  function updateCart(index, key, value) {
    setCart((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item))
  }

  function updatePayment(index, key, value) {
    setPayments((current) => current.map((payment, paymentIndex) => paymentIndex === index ? { ...payment, [key]: value } : payment))
  }

  function resetSaleDraft() {
    setCustomerId('')
    setCart([])
    setPayments([{ payment_method_id: '', amount: '' }])
    setNotes('')
    setInvoiceGuard?.(null)
  }

  function cancelSaleDraft() {
    if (!hasSaleDraft) return

    const confirmed = window.confirm('¿Seguro que querés salir de esta factura de venta? Se perderán los productos y pagos cargados.')
    if (!confirmed) return

    resetSaleDraft()
    setSection('dashboard')
  }

  async function submit() {
    if (!cart.length) return setError('Agregá productos a la venta.')
    const invalidDiscount = cart.find((item) => safeNumber(item.discount_percent) < 0 || safeNumber(item.discount_percent) > 100)
    if (invalidDiscount) return setError(`El descuento de ${invalidDiscount.product_name} debe estar entre 0% y 100%.`)
    if (Math.abs(total - paid) > 0.01) return setError('La suma de pagos debe coincidir con el total final.')
    const accountAmount = payments.filter((payment) => payment.payment_method_id === accountMethod?.id).reduce((sum, payment) => sum + safeNumber(payment.amount), 0)
    if (accountAmount > 0 && !customerId) return setError('Para dejar deuda en cuenta corriente tenés que seleccionar un cliente.')

    const confirmed = window.confirm(`¿Confirmás que querés registrar esta factura de venta por ${money(total)}? Una vez registrada se descontará el stock y quedará guardada en el historial.`)
    if (!confirmed) return

    setSaving(true)
    const { data, error } = await supabase.rpc('create_sale', {
      p_customer_id: customerId || null,
      p_price_type: 'retail',
      p_price_list_id: priceListId || null,
      p_notes: notes || null,
      p_items: cart.map(({ product_id, quantity, unit_price, discount_percent, unit_cost }) => ({ product_id, quantity: safeNumber(quantity), unit_price: safeNumber(unit_price), discount_percent: safeNumber(discount_percent), surcharge_percent: 0, unit_cost: safeNumber(unit_cost) })),
      p_payments: payments.map((payment) => ({ payment_method_id: payment.payment_method_id, amount: safeNumber(payment.amount) })),
    })
    setSaving(false)
    if (error) return setError(error.message)
    setInvoiceGuard?.(null)
    const selectedCustomer = customers.find((customer) => customer.id === customerId)
    setReceipt({
      ...data,
      customer_address: selectedCustomer?.address || '',
    })
    setCart([])
    setPayments([{ payment_method_id: '', amount: '' }])
    setNotes('')
    refresh()
    flash('Venta registrada.')
    setSection('history')
  }

  return <div className="sale-layout"><section className="panel product-picker"><h2>Productos</h2><label>Filtrar por marca<select value={saleBrandId} onChange={(event) => setSaleBrandId(event.target.value)}><option value="">Todas las marcas</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label><SearchBox value={search} setValue={setSearch} placeholder="Buscar producto" />{visible.map((product) => <button key={product.id} className="product-option" onClick={() => add(product)}><span><strong>{product.name}</strong><small>{product.sku || 'Sin código'} · {product.brands?.name || 'Sin marca'} · Stock: {product.stock}</small></span><b>{money(getProductPrice(product))}</b></button>)}</section><section className="panel"><div className="panel-header"><h2>Comprobante de venta</h2><p>La lista del cliente se aplica automáticamente. También podés aplicar descuentos por producto.</p></div><div className="form-grid"><label>Cliente<select value={customerId} onChange={(event) => changeCustomer(event.target.value)}><option value="">Consumidor final</option>{customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name}</option>)}</select></label><label>Lista de precios<select value={priceListId} onChange={(event) => changePriceList(event.target.value)}><option value="">Precio de venta general</option>{activePriceLists.map((list) => <option key={list.id} value={list.id}>{list.name}{list.is_default ? ' · Predeterminada' : ''}</option>)}</select></label></div><div className="table-wrap"><table><thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Desc. %</th><th>Total línea</th><th></th></tr></thead><tbody>{cart.map((item, index) => <tr key={item.product_id}><td>{item.product_name}</td><td><input className="small-input" inputMode="decimal" value={item.quantity} onChange={(event) => updateCart(index, 'quantity', event.target.value)} /></td><td><input className="price-input" inputMode="decimal" value={item.unit_price} onChange={(event) => updateCart(index, 'unit_price', event.target.value)} /></td><td><input className="small-input" inputMode="decimal" placeholder="0" value={item.discount_percent} onChange={(event) => updateCart(index, 'discount_percent', event.target.value)} /></td><td>{money(lineTotal(item))}</td><td><button className="link-btn danger" onClick={() => setCart((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Quitar</button></td></tr>)}</tbody></table></div><div className="total-row"><span>Subtotal sin ajustes</span><strong>{money(subtotal)}</strong></div>{discountAmount > 0 && <div className="total-row"><span>Descuentos aplicados</span><strong>- {money(discountAmount)}</strong></div>}<div className="total-row"><span>Total final</span><strong>{money(total)}</strong></div><div className="payments"><h3>Medios de pago</h3>{payments.map((payment, index) => <div className="payment-row" key={index}><select value={payment.payment_method_id} onChange={(event) => updatePayment(index, 'payment_method_id', event.target.value)}><option value="">Seleccionar</option>{paymentMethods.filter((method) => method.active).map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}</select><input inputMode="decimal" placeholder="Importe" value={payment.amount} onChange={(event) => updatePayment(index, 'amount', event.target.value)} /><button className="link-btn danger" onClick={() => setPayments((current) => current.filter((_, paymentIndex) => paymentIndex !== index))}>Eliminar</button></div>)}<button className="secondary" onClick={() => setPayments((current) => [...current, { payment_method_id: '', amount: '' }])}>Agregar medio de pago</button><p className={Math.abs(total - paid) < 0.01 ? 'payment-ok' : 'payment-pending'}>{Math.abs(total - paid) < 0.01 ? 'Importe completo.' : `Falta asignar ${money(total - paid)}.`}</p></div><label>Notas<textarea rows="3" value={notes} onChange={(event) => setNotes(event.target.value)} /></label><div className="modal-actions"><button type="button" className="secondary" disabled={!hasSaleDraft || saving} onClick={cancelSaleDraft}>Cancelar venta</button><button className="primary finish-sale" disabled={saving} onClick={submit}>{saving ? 'Registrando...' : 'Registrar venta'}</button></div></section>{receipt && <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />}</div>
}

function Accounts({ customers, sales, paymentMethods, accountMovements, refresh, flash, setError, setInvoiceGuard }) {
  const [customerId, setCustomerId] = useState(() => localStorage.getItem('selectedCustomerAccount') || '')
  const [showPayment, setShowPayment] = useState(false); const [showAdjustment, setShowAdjustment] = useState(false)
  const [payment, setPayment] = useState({ amount: '', payment_method_id: '', notes: '' }); const [adjustment, setAdjustment] = useState({ amount: '', notes: '' })
  useEffect(() => { if (customerId) localStorage.setItem('selectedCustomerAccount', customerId) }, [customerId])
  const movements = accountMovements.filter((m) => m.customer_id === customerId); const balance = movements.reduce((sum, m) => sum + Number(m.amount), 0); const openSales = sales.filter((sale) => sale.customer_id === customerId && Number(sale.outstanding_amount) > 0)
  async function registerPayment(event) { event.preventDefault(); const { error } = await supabase.rpc('register_customer_payment', { p_customer_id: customerId, p_amount: safeNumber(payment.amount), p_payment_method_id: payment.payment_method_id || null, p_notes: payment.notes || null }); if (error) return setError(error.message); setPayment({ amount: '', payment_method_id: '', notes: '' }); setShowPayment(false); flash('Cobro registrado.'); refresh() }
  async function registerAdjustment(event) { event.preventDefault(); const { error } = await supabase.rpc('register_account_adjustment', { p_customer_id: customerId, p_amount: safeNumber(adjustment.amount), p_notes: adjustment.notes || null }); if (error) return setError(error.message); setAdjustment({ amount: '', notes: '' }); setShowAdjustment(false); flash('Ajuste registrado.'); refresh() }
  async function removeMovement(id) { if (!window.confirm('¿Eliminar este movimiento de cuenta corriente? Si era un cobro se reabrirán los saldos correspondientes.')) return; const { error } = await supabase.rpc('delete_account_movement', { p_movement_id: id }); if (error) return setError(error.message); flash('Movimiento eliminado.'); refresh() }
  return <div className="stack"><section className="panel"><div className="panel-header split"><div><h2>Cuenta corriente por cliente</h2><p>Compras adeudadas, cobros y ajustes manuales.</p></div>{customerId && <div className="button-row"><button className="secondary" onClick={() => setShowAdjustment(true)}>Agregar ajuste</button><button className="primary" onClick={() => setShowPayment(true)}><BadgeDollarSign size={17} />Registrar cobro</button></div>}</div><label>Cliente<select value={customerId} onChange={(e) => setCustomerId(e.target.value)}><option value="">Seleccionar cliente</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>{customerId && <div className="stats-grid account-summary"><Stat title="Saldo pendiente" value={money(balance)} subtitle={balance > 0 ? 'El cliente debe este importe' : 'Cuenta al día o con saldo a favor'} /><Stat title="Ventas pendientes" value={openSales.length} subtitle="comprobantes con saldo abierto" /></div>}</section>{customerId && <section className="panel"><div className="panel-header"><h2>Ventas pendientes</h2></div>{openSales.length === 0 ? <Empty text="No hay ventas pendientes de pago." /> : <div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Comprobante</th><th>Total</th><th>Pagado</th><th>Debe</th><th>Estado</th></tr></thead><tbody>{openSales.map((sale) => <tr key={sale.id}><td>{dateTime(sale.created_at)}</td><td>#{sale.receipt_number}</td><td>{money(sale.total)}</td><td>{money(sale.paid_amount)}</td><td>{money(sale.outstanding_amount)}</td><td><Status value={sale.payment_status} /></td></tr>)}</tbody></table></div>}</section>}{customerId && <section className="panel"><div className="panel-header"><h2>Movimientos</h2><p>Los importes positivos aumentan la deuda. Los negativos la reducen.</p></div>{movements.length === 0 ? <Empty text="No hay movimientos para este cliente." /> : <div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Referencia</th><th>Notas</th><th>Importe</th><th></th></tr></thead><tbody>{movements.map((m) => <tr key={m.id}><td>{dateTime(m.created_at)}</td><td>{movementLabel(m.movement_type)}</td><td>{m.sales?.receipt_number ? `Venta #${m.sales.receipt_number}` : '-'}</td><td>{m.notes || '-'}</td><td className={Number(m.amount) >= 0 ? 'amount-debt' : 'amount-paid'}>{money(m.amount)}</td><td className="actions">{m.movement_type !== 'sale_debt' && <button className="link-btn danger" onClick={() => removeMovement(m.id)}>Eliminar</button>}</td></tr>)}</tbody></table></div>}</section>}{showPayment && <Modal title="Registrar cobro" onClose={() => setShowPayment(false)}><form className="form-grid" onSubmit={registerPayment}><label>Importe<input required inputMode="decimal" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} /></label><label>Medio de pago<select value={payment.payment_method_id} onChange={(e) => setPayment({ ...payment, payment_method_id: e.target.value })}><option value="">Sin especificar</option>{paymentMethods.filter((m) => m.active && m.name.toLowerCase() !== 'cuenta corriente').map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label><label className="wide">Notas<textarea rows="3" value={payment.notes} onChange={(e) => setPayment({ ...payment, notes: e.target.value })} /></label><div className="modal-actions wide"><button type="button" className="secondary" onClick={() => setShowPayment(false)}>Cancelar</button><button className="primary">Registrar</button></div></form></Modal>}{showAdjustment && <Modal title="Agregar ajuste manual" onClose={() => setShowAdjustment(false)}><form className="form-grid" onSubmit={registerAdjustment}><label>Importe<input required inputMode="decimal" value={adjustment.amount} onChange={(e) => setAdjustment({ ...adjustment, amount: e.target.value })} /></label><p className="wide">Usá un importe positivo para sumar deuda o uno negativo para descontarla.</p><label className="wide">Motivo<textarea rows="3" required value={adjustment.notes} onChange={(e) => setAdjustment({ ...adjustment, notes: e.target.value })} /></label><div className="modal-actions wide"><button type="button" className="secondary" onClick={() => setShowAdjustment(false)}>Cancelar</button><button className="primary">Registrar ajuste</button></div></form></Modal>}</div>
}

function Stock({ products, brands, providers, purchases, stockMovements, paymentMethods, refresh, flash, setError, setInvoiceGuard }) {
  const emptyPurchaseItem = { product_id: '', quantity: '', unit_cost: '', discount_percent: '' }
  const [showPurchase, setShowPurchase] = useState(false)
  const [purchase, setPurchase] = useState(emptyPurchase)
  const [items, setItems] = useState([{ ...emptyPurchaseItem }])
  const [purchaseBrandId, setPurchaseBrandId] = useState('')
  const [viewPurchase, setViewPurchase] = useState(null)
  const [adjustment, setAdjustment] = useState({ product_id: '', quantity: '', notes: '' })
  const [showAdjustment, setShowAdjustment] = useState(false)

  const purchaseProducts = products.filter((product) => product.active && (!purchaseBrandId || product.brand_id === purchaseBrandId))
  const lineBase = (item) => roundCurrency(safeNumber(item.quantity) * safeNumber(item.unit_cost))
  const lineDiscount = (item) => roundCurrency(lineBase(item) * safeNumber(item.discount_percent) / 100)
  const lineTotal = (item) => roundCurrency(Math.max(0, lineBase(item) - lineDiscount(item)))
  const purchaseSubtotal = roundCurrency(items.reduce((sum, item) => sum + lineBase(item), 0))
  const purchaseDiscountAmount = roundCurrency(items.reduce((sum, item) => sum + lineDiscount(item), 0))
  const purchaseAfterDiscounts = roundCurrency(items.reduce((sum, item) => sum + lineTotal(item), 0))
  const purchaseBonusAmount = roundCurrency(purchaseAfterDiscounts * safeNumber(purchase.bonus_percent) / 100)
  const purchaseAfterBonus = roundCurrency(Math.max(0, purchaseAfterDiscounts - purchaseBonusAmount))
  const purchaseVatAmount = roundCurrency(purchaseAfterBonus * safeNumber(purchase.vat_percent) / 100)
  const purchaseTotal = roundCurrency(purchaseAfterBonus + purchaseVatAmount)
  const purchaseHasDraft = showPurchase && (
    Boolean(purchase.provider_id) ||
    Boolean(purchase.invoice_number.trim()) ||
    Boolean(purchase.initial_paid) ||
    Boolean(purchase.payment_method_id) ||
    Boolean(purchase.bonus_percent) ||
    Boolean(purchase.notes.trim()) ||
    Boolean(purchaseBrandId) ||
    String(purchase.vat_percent ?? '') !== '21' ||
    items.some((item) => item.product_id || item.quantity || item.unit_cost || item.discount_percent)
  )

  useEffect(() => {
    if (!setInvoiceGuard) return

    if (purchaseHasDraft) {
      setInvoiceGuard({
        source: 'purchase',
        active: true,
        message: 'Tenés una factura de compra sin completar. ¿Seguro que querés salir? Se perderán los datos cargados.',
      })
    } else {
      setInvoiceGuard((current) => current?.source === 'purchase' ? null : current)
    }

    return () => setInvoiceGuard((current) => current?.source === 'purchase' ? null : current)
  }, [purchaseHasDraft, setInvoiceGuard])

  function updateItem(index, key, value) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item))
  }

  function resetPurchaseDraft() {
    setPurchase({ ...emptyPurchase, invoice_date: todayInput() })
    setItems([{ ...emptyPurchaseItem }])
    setPurchaseBrandId('')
    setInvoiceGuard?.((current) => current?.source === 'purchase' ? null : current)
  }

  function closePurchaseDraft() {
    if (purchaseHasDraft) {
      const confirmed = window.confirm('¿Seguro que querés salir de esta factura de compra? Se perderán los productos y datos cargados.')
      if (!confirmed) return
    }

    resetPurchaseDraft()
    setShowPurchase(false)
  }

  async function savePurchase(event) {
    event.preventDefault()
    const validItems = items.filter((item) => item.product_id && safeNumber(item.quantity) > 0)
    if (!validItems.length) return setError('Agregá al menos un producto con cantidad válida.')

    const invalid = validItems.find((item) => safeNumber(item.discount_percent) < 0 || safeNumber(item.discount_percent) > 100 || lineTotal(item) < 0)
    if (invalid) return setError('Revisá los descuentos. Cada porcentaje debe estar entre 0% y 100%.')

    if (safeNumber(purchase.bonus_percent) < 0 || safeNumber(purchase.bonus_percent) > 100) {
      return setError('La bonificación final debe estar entre 0% y 100%.')
    }

    if (safeNumber(purchase.vat_percent) < 0 || safeNumber(purchase.vat_percent) > 100) {
      return setError('El IVA debe estar entre 0% y 100%.')
    }

    const initialPaid = safeNumber(purchase.initial_paid)
    if (initialPaid < 0 || initialPaid - purchaseTotal > 0.01) return setError('El importe abonado debe estar entre $0 y el total final de la compra.')
    if (initialPaid > 0 && !purchase.payment_method_id) return setError('Seleccioná el medio de pago utilizado para el importe abonado.')
    if (purchaseTotal - initialPaid > 0.01 && !purchase.provider_id) return setError('Para dejar deuda en cuenta corriente tenés que seleccionar un proveedor / marca.')

    const confirmed = window.confirm(`¿Confirmás que querés registrar esta factura de compra por ${money(purchaseTotal)}? Una vez registrada se sumará la mercadería al stock y quedará guardada en el historial.`)
    if (!confirmed) return

    const { error } = await supabase.rpc('create_purchase', {
      p_provider_id: purchase.provider_id || null,
      p_invoice_number: purchase.invoice_number || null,
      p_invoice_date: purchase.invoice_date || null,
      p_notes: purchase.notes || null,
      p_initial_paid: initialPaid,
      p_payment_method_id: purchase.payment_method_id || null,
      p_bonus_percent: safeNumber(purchase.bonus_percent),
      p_vat_percent: safeNumber(purchase.vat_percent),
      p_items: validItems.map((item) => ({
        product_id: item.product_id,
        quantity: safeNumber(item.quantity),
        unit_cost: safeNumber(item.unit_cost),
        discount_percent: safeNumber(item.discount_percent),
      })),
    })

    if (error) return setError(error.message)
    resetPurchaseDraft()
    setShowPurchase(false)
    flash('Factura de compra registrada y stock actualizado.')
    refresh()
  }

  async function deletePurchase(id) {
    if (!window.confirm('¿Eliminar esta factura de compra? Se descontará del stock la mercadería ingresada y se corregirá la cuenta corriente del proveedor.')) return
    const { error } = await supabase.rpc('delete_purchase', { p_purchase_id: id })
    if (error) return setError(error.message)
    flash('Compra eliminada y stock corregido.')
    refresh()
  }

  async function saveAdjustment(event) {
    event.preventDefault()
    const { error } = await supabase.rpc('create_stock_adjustment', { p_product_id: adjustment.product_id, p_quantity: safeNumber(adjustment.quantity), p_notes: adjustment.notes || null })
    if (error) return setError(error.message)
    setAdjustment({ product_id: '', quantity: '', notes: '' })
    setShowAdjustment(false)
    flash('Ajuste de stock registrado.')
    refresh()
  }

  async function deleteMovement(id) {
    if (!window.confirm('¿Eliminar este ajuste manual? El stock volverá al valor anterior.')) return
    const { error } = await supabase.rpc('delete_stock_adjustment', { p_movement_id: id })
    if (error) return setError(error.message)
    flash('Ajuste eliminado.')
    refresh()
  }

  return <div className="stack">
    <section className="panel"><div className="panel-header split"><div><h2>Stock actual</h2><p>La venta puede dejar unidades negativas. Los ingresos posteriores recomponen el stock automáticamente.</p></div><div className="button-row"><button className="secondary" onClick={() => setShowAdjustment(true)}>Ajuste manual</button><button className="primary" onClick={() => setShowPurchase(true)}><FilePlus2 size={17} />Cargar factura de compra</button></div></div><div className="table-wrap"><table><thead><tr><th>Producto</th><th>Marca</th><th>Stock</th><th>Mínimo</th><th>Estado</th></tr></thead><tbody>{products.filter((product) => product.active).map((product) => <tr key={product.id}><td><strong>{product.name}</strong><small>{product.sku || 'Sin código'}</small></td><td>{product.brands?.name || '-'}</td><td>{product.stock}</td><td>{product.min_stock}</td><td><span className={Number(product.stock) < 0 ? 'badge danger-badge' : Number(product.stock) <= Number(product.min_stock) ? 'badge warning' : 'badge'}>{Number(product.stock) < 0 ? 'Stock negativo' : Number(product.stock) <= Number(product.min_stock) ? 'Stock bajo' : 'Disponible'}</span></td></tr>)}</tbody></table></div></section>

    <section className="panel"><div className="panel-header"><h2>Últimas facturas de compra</h2><p>El historial completo está disponible desde el menú lateral.</p></div>{purchases.length === 0 ? <Empty text="No hay facturas de compra cargadas." /> : <div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Número</th><th>Proveedor</th><th>Total</th><th>Pagado</th><th>Debe</th><th>Estado</th><th></th></tr></thead><tbody>{purchases.slice(0, 15).map((row) => <tr key={row.id}><td>{row.invoice_date || '-'}</td><td>{row.invoice_number || `Ingreso #${row.purchase_number}`}</td><td>{row.providers?.name || '-'}</td><td>{money(row.total)}</td><td>{money(row.paid_amount)}</td><td>{money(row.outstanding_amount)}</td><td><Status value={row.payment_status} /></td><td className="actions"><button className="link-btn" onClick={() => setViewPurchase(row)}>Ver</button><button className="link-btn danger" onClick={() => deletePurchase(row.id)}>Eliminar</button></td></tr>)}</tbody></table></div>}</section>

    <section className="panel"><div className="panel-header"><h2>Últimos movimientos de stock</h2></div>{stockMovements.length === 0 ? <Empty text="Todavía no hay movimientos." /> : <div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Notas</th><th></th></tr></thead><tbody>{stockMovements.map((movement) => <tr key={movement.id}><td>{dateTime(movement.created_at)}</td><td>{movement.products?.name || movement.product_name || '-'}</td><td>{stockLabel(movement.movement_type)}</td><td className={Number(movement.quantity) >= 0 ? 'amount-paid' : 'amount-debt'}>{Number(movement.quantity) > 0 ? '+' : ''}{movement.quantity}</td><td>{movement.notes || '-'}</td><td className="actions">{movement.movement_type === 'manual_adjustment' && <button className="link-btn danger" onClick={() => deleteMovement(movement.id)}>Eliminar</button>}</td></tr>)}</tbody></table></div>}</section>

    {showPurchase && <Modal wide title="Cargar factura de compra" onClose={closePurchaseDraft}><form className="stack" onSubmit={savePurchase}><div className="form-grid"><label>Proveedor / marca<select value={purchase.provider_id} onChange={(event) => setPurchase({ ...purchase, provider_id: event.target.value })}><option value="">Sin especificar</option>{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></label><label>Número de factura<input value={purchase.invoice_number} onChange={(event) => setPurchase({ ...purchase, invoice_number: event.target.value })} /></label><label>Fecha<input type="date" required value={purchase.invoice_date} onChange={(event) => setPurchase({ ...purchase, invoice_date: event.target.value })} /></label><label>Filtrar productos por marca<select value={purchaseBrandId} onChange={(event) => setPurchaseBrandId(event.target.value)}><option value="">Todas las marcas</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label><label>Importe abonado<input inputMode="decimal" placeholder="0" value={purchase.initial_paid} onChange={(event) => setPurchase({ ...purchase, initial_paid: event.target.value })} /></label><label>Medio de pago<select value={purchase.payment_method_id} onChange={(event) => setPurchase({ ...purchase, payment_method_id: event.target.value })}><option value="">Seleccionar</option>{paymentMethods.filter((method) => method.active && method.name.toLowerCase() !== 'cuenta corriente').map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}</select></label><label className="wide">Notas<input value={purchase.notes} onChange={(event) => setPurchase({ ...purchase, notes: event.target.value })} /></label></div>

      <div className="table-wrap"><table><thead><tr><th>Producto</th><th>Cantidad</th><th>Costo unitario</th><th>Desc. %</th><th>Total línea</th><th></th></tr></thead><tbody>{items.map((item, index) => <tr key={index}><td><select value={item.product_id} onChange={(event) => updateItem(index, 'product_id', event.target.value)}><option value="">Seleccionar</option>{purchaseProducts.map((product) => <option key={product.id} value={product.id}>{product.name}{product.brands?.name ? ` · ${product.brands.name}` : ''}</option>)}</select></td><td><input inputMode="decimal" value={item.quantity} onChange={(event) => updateItem(index, 'quantity', event.target.value)} /></td><td><input inputMode="decimal" value={item.unit_cost} onChange={(event) => updateItem(index, 'unit_cost', event.target.value)} /></td><td><input className="small-input" inputMode="decimal" placeholder="0" value={item.discount_percent} onChange={(event) => updateItem(index, 'discount_percent', event.target.value)} /></td><td>{money(lineTotal(item))}</td><td><button type="button" className="link-btn danger" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Eliminar</button></td></tr>)}</tbody></table></div>

      <div className="button-row"><button type="button" className="secondary" onClick={() => setItems((current) => [...current, { ...emptyPurchaseItem }])}>Agregar producto</button></div>

      <div className="form-grid compact purchase-final-adjustments"><label>Bonificación final (%)<input inputMode="decimal" placeholder="0" value={purchase.bonus_percent} onChange={(event) => setPurchase({ ...purchase, bonus_percent: event.target.value })} /></label><label>IVA (%)<input inputMode="decimal" placeholder="21" value={purchase.vat_percent} onChange={(event) => setPurchase({ ...purchase, vat_percent: event.target.value })} /></label></div>

      <div className="total-row"><span>Precio antes de bonificación e IVA</span><strong>{money(purchaseAfterDiscounts)}</strong></div>
      {purchaseBonusAmount > 0 && <div className="total-row"><span>Bonificación final ({safeNumber(purchase.bonus_percent)}%)</span><strong>- {money(purchaseBonusAmount)}</strong></div>}
      <div className="total-row"><span>Precio luego de bonificación</span><strong>{money(purchaseAfterBonus)}</strong></div>
      {purchaseVatAmount > 0 && <div className="total-row"><span>IVA ({safeNumber(purchase.vat_percent)}%)</span><strong>+ {money(purchaseVatAmount)}</strong></div>}
      <div className="total-row"><span>Precio final</span><strong>{money(purchaseTotal)}</strong></div>
      <div className="total-row"><span>Importe abonado</span><strong>{money(purchase.initial_paid)}</strong></div>
      <div className="total-row"><span>Saldo en cuenta corriente</span><strong>{money(Math.max(0, purchaseTotal - safeNumber(purchase.initial_paid)))}</strong></div>
      <div className="modal-actions"><button type="button" className="secondary" onClick={closePurchaseDraft}>Cancelar</button><button className="primary">Registrar ingreso</button></div>
    </form></Modal>}

    {showAdjustment && <Modal title="Ajuste manual de stock" onClose={() => setShowAdjustment(false)}><form className="form-grid" onSubmit={saveAdjustment}><label className="wide">Producto<select required value={adjustment.product_id} onChange={(event) => setAdjustment({ ...adjustment, product_id: event.target.value })}><option value="">Seleccionar</option>{products.filter((product) => product.active).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><label>Cantidad<input required inputMode="decimal" value={adjustment.quantity} onChange={(event) => setAdjustment({ ...adjustment, quantity: event.target.value })} placeholder="Ej.: 10 o -3" /></label><label className="wide">Motivo<textarea rows="3" required value={adjustment.notes} onChange={(event) => setAdjustment({ ...adjustment, notes: event.target.value })} /></label><div className="modal-actions wide"><button type="button" className="secondary" onClick={() => setShowAdjustment(false)}>Cancelar</button><button className="primary">Registrar ajuste</button></div></form></Modal>}
    {viewPurchase && <PurchaseReceiptModal purchase={viewPurchase} onClose={() => setViewPurchase(null)} />}
  </div>
}
function ProviderAccounts({ providers, purchases, paymentMethods, providerAccountMovements, refresh, flash, setError, setInvoiceGuard }) {
  const [providerId, setProviderId] = useState(() => localStorage.getItem('selectedProviderAccount') || '')
  const [showPayment, setShowPayment] = useState(false)
  const [showAdjustment, setShowAdjustment] = useState(false)
  const [payment, setPayment] = useState({ amount: '', payment_method_id: '', notes: '' })
  const [adjustment, setAdjustment] = useState({ amount: '', notes: '' })
  useEffect(() => { if (providerId) localStorage.setItem('selectedProviderAccount', providerId) }, [providerId])
  const movements = providerAccountMovements.filter((movement) => movement.provider_id === providerId)
  const balance = roundCurrency(movements.reduce((sum, movement) => sum + Number(movement.amount), 0))
  const openPurchases = purchases.filter((purchase) => purchase.provider_id === providerId && Number(purchase.outstanding_amount) > 0)

  async function registerPayment(event) {
    event.preventDefault()
    const { error } = await supabase.rpc('register_provider_payment', { p_provider_id: providerId, p_amount: safeNumber(payment.amount), p_payment_method_id: payment.payment_method_id || null, p_notes: payment.notes || null })
    if (error) return setError(error.message)
    setPayment({ amount: '', payment_method_id: '', notes: '' })
    setShowPayment(false)
    flash('Pago al proveedor registrado.')
    refresh()
  }

  async function registerAdjustment(event) {
    event.preventDefault()
    const { error } = await supabase.rpc('register_provider_account_adjustment', { p_provider_id: providerId, p_amount: safeNumber(adjustment.amount), p_notes: adjustment.notes || null })
    if (error) return setError(error.message)
    setAdjustment({ amount: '', notes: '' })
    setShowAdjustment(false)
    flash('Ajuste registrado.')
    refresh()
  }

  async function removeMovement(id) {
    if (!window.confirm('¿Eliminar este movimiento? Si era un pago se reabrirán los saldos de las facturas correspondientes.')) return
    const { error } = await supabase.rpc('delete_provider_account_movement', { p_movement_id: id })
    if (error) return setError(error.message)
    flash('Movimiento eliminado.')
    refresh()
  }

  return <div className="stack"><section className="panel"><div className="panel-header split"><div><h2>Cuenta corriente de proveedores / marcas</h2><p>Seleccioná el proveedor que cargaste en la factura de compra. Los importes positivos representan deuda pendiente.</p></div>{providerId && <div className="button-row"><button className="secondary" onClick={() => setShowAdjustment(true)}>Agregar ajuste</button><button className="primary" onClick={() => setShowPayment(true)}><BadgeDollarSign size={17} />Registrar pago</button></div>}</div><label>Proveedor / marca<select value={providerId} onChange={(event) => setProviderId(event.target.value)}><option value="">Seleccionar proveedor</option>{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></label>{providerId && <div className="stats-grid account-summary"><Stat title="Saldo pendiente" value={money(balance)} subtitle={balance > 0 ? 'Importe adeudado al proveedor' : 'Cuenta al día o con saldo a favor'} /><Stat title="Facturas pendientes" value={openPurchases.length} subtitle="comprobantes con saldo abierto" /></div>}</section>{providerId && <section className="panel"><div className="panel-header"><h2>Facturas pendientes</h2></div>{openPurchases.length === 0 ? <Empty text="No hay facturas pendientes de pago." /> : <div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Factura</th><th>Total</th><th>Pagado</th><th>Debe</th><th>Estado</th></tr></thead><tbody>{openPurchases.map((purchase) => <tr key={purchase.id}><td>{purchase.invoice_date || '-'}</td><td>{purchase.invoice_number || `Ingreso #${purchase.purchase_number}`}</td><td>{money(purchase.total)}</td><td>{money(purchase.paid_amount)}</td><td>{money(purchase.outstanding_amount)}</td><td><Status value={purchase.payment_status} /></td></tr>)}</tbody></table></div>}</section>}{providerId && <section className="panel"><div className="panel-header"><h2>Movimientos</h2><p>Los importes positivos aumentan la deuda. Los negativos representan pagos o ajustes a favor.</p></div>{movements.length === 0 ? <Empty text="No hay movimientos para este proveedor." /> : <div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Referencia</th><th>Medio</th><th>Notas</th><th>Importe</th><th></th></tr></thead><tbody>{movements.map((movement) => <tr key={movement.id}><td>{dateTime(movement.created_at)}</td><td>{providerMovementLabel(movement.movement_type)}</td><td>{movement.purchases?.invoice_number || (movement.purchases?.purchase_number ? `Ingreso #${movement.purchases.purchase_number}` : '-')}</td><td>{movement.payment_methods?.name || '-'}</td><td>{movement.notes || '-'}</td><td className={Number(movement.amount) >= 0 ? 'amount-debt' : 'amount-paid'}>{money(movement.amount)}</td><td className="actions">{movement.movement_type !== 'purchase_debt' && <button className="link-btn danger" onClick={() => removeMovement(movement.id)}>Eliminar</button>}</td></tr>)}</tbody></table></div>}</section>}{showPayment && <Modal title="Registrar pago a proveedor" onClose={() => setShowPayment(false)}><form className="form-grid" onSubmit={registerPayment}><label>Importe<input required inputMode="decimal" value={payment.amount} onChange={(event) => setPayment({ ...payment, amount: event.target.value })} /></label><label>Medio de pago<select value={payment.payment_method_id} onChange={(event) => setPayment({ ...payment, payment_method_id: event.target.value })}><option value="">Sin especificar</option>{paymentMethods.filter((method) => method.active && method.name.toLowerCase() !== 'cuenta corriente').map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}</select></label><label className="wide">Notas<textarea rows="3" value={payment.notes} onChange={(event) => setPayment({ ...payment, notes: event.target.value })} /></label><div className="modal-actions wide"><button type="button" className="secondary" onClick={() => setShowPayment(false)}>Cancelar</button><button className="primary">Registrar pago</button></div></form></Modal>}{showAdjustment && <Modal title="Ajuste manual de cuenta" onClose={() => setShowAdjustment(false)}><form className="form-grid" onSubmit={registerAdjustment}><label>Importe<input required inputMode="decimal" value={adjustment.amount} onChange={(event) => setAdjustment({ ...adjustment, amount: event.target.value })} /></label><p className="wide">Usá un importe positivo para sumar deuda o uno negativo para descontarla.</p><label className="wide">Motivo<textarea rows="3" required value={adjustment.notes} onChange={(event) => setAdjustment({ ...adjustment, notes: event.target.value })} /></label><div className="modal-actions wide"><button type="button" className="secondary" onClick={() => setShowAdjustment(false)}>Cancelar</button><button className="primary">Registrar ajuste</button></div></form></Modal>}</div>
}


function History({ sales }) {
  const [selectedSale, setSelectedSale] = useState(null)

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Historial de ventas</h2>
          <p>Consultá comprobantes anteriores y volvé a imprimirlos cuando sea necesario.</p>
        </div>
      </div>

      {sales.length === 0 ? (
        <Empty text="Todavía no hay ventas registradas." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Comprobante</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Pagado</th>
                <th>Debe</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td>{dateTime(sale.created_at)}</td>
                  <td>#{sale.receipt_number}</td>
                  <td>{sale.customers?.name || 'Consumidor final'}</td>
                  <td>{money(sale.total)}</td>
                  <td>{money(sale.paid_amount)}</td>
                  <td>{money(sale.outstanding_amount)}</td>
                  <td><Status value={sale.payment_status} /></td>
                  <td className="actions">
                    <button
                      className="link-btn"
                      onClick={() => setSelectedSale(sale)}
                    >
                      Ver / imprimir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedSale && (
        <ReceiptModal
          receipt={selectedSale}
          onClose={() => setSelectedSale(null)}
        />
      )}
    </section>
  )
}

function PurchaseHistory({ purchases, refresh, flash, setError, setInvoiceGuard }) {
  const [purchase, setPurchase] = useState(null)
  async function remove(id) {
    if (!window.confirm('¿Eliminar esta factura de compra? Se descontará la mercadería ingresada y se corregirá la cuenta del proveedor.')) return
    const { error } = await supabase.rpc('delete_purchase', { p_purchase_id: id })
    if (error) return setError(error.message)
    flash('Factura de compra eliminada.')
    refresh()
  }
  return <section className="panel"><div className="panel-header"><h2>Historial de facturas de compra</h2><p>Consultá importes pagados, saldos pendientes y detalle de mercadería ingresada.</p></div>{purchases.length === 0 ? <Empty text="Todavía no hay facturas de compra." /> : <div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Número</th><th>Proveedor</th><th>Total</th><th>Pagado</th><th>Debe</th><th>Estado</th><th></th></tr></thead><tbody>{purchases.map((row) => <tr key={row.id}><td>{row.invoice_date || '-'}</td><td>{row.invoice_number || `Ingreso #${row.purchase_number}`}</td><td>{row.providers?.name || '-'}</td><td>{money(row.total)}</td><td>{money(row.paid_amount)}</td><td>{money(row.outstanding_amount)}</td><td><Status value={row.payment_status} /></td><td className="actions"><button className="link-btn" onClick={() => setPurchase(row)}>Ver</button><button className="link-btn danger" onClick={() => remove(row.id)}>Eliminar</button></td></tr>)}</tbody></table></div>}{purchase && <PurchaseReceiptModal purchase={purchase} onClose={() => setPurchase(null)} />}</section>
}

function PurchaseReceiptModal({ purchase, onClose }) {
  const subtotal = Number(purchase.subtotal ?? purchase.total ?? 0)
  const discountAmount = Number(purchase.discount_amount || 0)
  const bonusAmount = Number(purchase.bonus_amount || 0)
  const vatAmount = Number(purchase.vat_amount || 0)
  const historicalSurcharge = Number(purchase.surcharge_amount || 0)
  const afterDiscounts = roundCurrency(subtotal - discountAmount)
  const afterBonus = roundCurrency(afterDiscounts - bonusAmount)
  const bonusLabel = Number(purchase.bonus_percent || 0) > 0
    ? `Bonificación final (${purchase.bonus_percent}%)`
    : 'Bonificación histórica'

  return <Modal wide title={`Factura de compra ${purchase.invoice_number || `#${purchase.purchase_number}`}`} onClose={onClose}><div className="receipt"><div className="receipt-header"><h2>Factura de compra</h2><p>Registro interno de ingreso de mercadería</p></div><div className="receipt-meta"><span><b>Número:</b> {purchase.invoice_number || `Ingreso #${purchase.purchase_number}`}</span><span><b>Fecha:</b> {purchase.invoice_date || '-'}</span><span className="receipt-customer"><b>Proveedor / marca:</b> <span className="receipt-customer-name">{purchase.providers?.name || 'Sin especificar'}</span></span><span><b>Estado:</b> {statusLabel(purchase.payment_status)}</span></div><DataTable headers={['Producto', 'Cantidad', 'Costo', 'Subtotal base', 'Descuento', 'Total línea']} rows={(purchase.purchase_items || []).map((item) => [item.product_name, item.quantity, money(item.unit_cost), money(item.base_subtotal ?? item.subtotal), purchaseItemAdjustmentText(item, 'discount'), money(item.subtotal)])} /><div className="receipt-total">Subtotal sin ajustes: {money(subtotal)}</div>{discountAmount > 0 && <div className="receipt-total">Descuentos por producto: - {money(discountAmount)}</div>}<div className="receipt-total">Precio antes de bonificación e IVA: {money(afterDiscounts)}</div>{bonusAmount > 0 && <div className="receipt-total">{bonusLabel}: - {money(bonusAmount)}</div>}<div className="receipt-total">Precio luego de bonificación: {money(afterBonus)}</div>{vatAmount > 0 && <div className="receipt-total">IVA ({purchase.vat_percent || 0}%): + {money(vatAmount)}</div>}{historicalSurcharge > 0 && <div className="receipt-total">Recargo histórico aplicado: + {money(historicalSurcharge)}</div>}<div className="receipt-total">Precio final: {money(purchase.total)}</div><div className="receipt-payments"><span>Pagado: {money(purchase.paid_amount)}</span><span>Saldo pendiente: {money(purchase.outstanding_amount)}</span>{purchase.payment_methods?.name && <span>Pago inicial: {purchase.payment_methods.name}</span>}</div>{purchase.notes && <p><b>Notas:</b> {purchase.notes}</p>}</div><div className="modal-actions"><button className="secondary" onClick={onClose}>Cerrar</button><button className="primary" onClick={() => window.print()}><Printer size={17} />Imprimir</button></div></Modal>
}
function ReceiptModal({ receipt, onClose }) { return <Modal wide title={`Comprobante #${receipt.receipt_number}`} onClose={onClose}><div className="receipt sale-receipt"><div className="receipt-header"><h2>Comprobante interno</h2><p>No válido como factura fiscal</p></div><div className="receipt-meta"><span><b>Número:</b> #{receipt.receipt_number}</span><span><b>Fecha:</b> {dateTime(receipt.created_at)}</span><span className="receipt-customer"><b>Cliente:</b> <span className="receipt-customer-name">{receipt.customer_name || receipt.customers?.name || 'Consumidor final'}</span></span>{(receipt.customer_address || receipt.customers?.address) && <span className="receipt-address"><b>Domicilio:</b> <span>{receipt.customer_address || receipt.customers?.address}</span></span>}<span><b>Lista de precios:</b> {receipt.price_list_name || 'Precio de venta general'}</span><span><b>Estado:</b> {statusLabel(receipt.payment_status)}</span></div><DataTable className="sale-receipt-items" headers={['Producto', 'Cantidad', 'Precio', 'Subtotal base', 'Descuento', 'Total línea']} rows={(receipt.items || receipt.sale_items || []).map((item) => [<span className="sale-receipt-product-name">{item.product_name}</span>, item.quantity, money(item.unit_price), money(item.base_subtotal ?? item.subtotal), itemAdjustmentText(item, 'discount'), money(item.subtotal)])} /><div className="receipt-total">Subtotal sin ajustes: {money(receipt.subtotal ?? receipt.total)}</div>{Number(receipt.discount_amount || 0) > 0 && <div className="receipt-total">Descuentos aplicados: - {money(receipt.discount_amount)}</div>}{Number(receipt.surcharge_amount || 0) > 0 && <div className="receipt-total">Recargo histórico aplicado: + {money(receipt.surcharge_amount)}</div>}<div className="receipt-total">Total final: {money(receipt.total)}</div><div className="receipt-payments">{(receipt.payments || []).map((payment, index) => <span key={payment.id || index}>{payment.payment_method_name || payment.payment_methods?.name || 'Pago'}: {money(payment.amount)}</span>)}</div>{Number(receipt.outstanding_amount || 0) > 0 && <p><b>Saldo pendiente:</b> {money(receipt.outstanding_amount)}</p>}{receipt.notes && <p><b>Notas:</b> {receipt.notes}</p>}</div><div className="modal-actions"><button className="secondary" onClick={onClose}>Cerrar</button><button className="primary" onClick={() => window.print()}><Printer size={17} />Imprimir</button></div></Modal> }

function PriceListPreview({ list, products, brands, priceListItems, brandId, setBrandId, onClose }) {
  const rows = buildPriceListRows(list, products, priceListItems, brandId)
  const selectedBrand = brands.find((brand) => brand.id === brandId)

  return <Modal wide title={`Lista de precios: ${list.name}`} onClose={onClose}>
    <div className="price-list-toolbar">
      <label>Filtrar por marca<select value={brandId} onChange={(event) => setBrandId(event.target.value)}><option value="">Todas las marcas</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label>
      <p>El PDF se genera desde la vista de impresión. En el diálogo del navegador elegí <b>Guardar como PDF</b>.</p>
    </div>
    <div className="price-list-sheet">
      <table className="price-list-title-table"><tbody><tr><td className="price-list-code">LISTA</td><td><strong>{selectedBrand?.name || list.name}</strong><small>{list.description || 'Lista de precios comercial'}</small></td><td><strong>PRECIOS<br />VIGENTES</strong><small>{new Date().toLocaleDateString('es-AR')}</small></td></tr></tbody></table>
      <table className="price-list-table"><thead><tr><th>COD.</th><th>PRODUCTO</th><th>PRECIO</th></tr></thead><tbody>{rows.map((row, index) => row.type === 'heading' ? <tr className={row.level === 'brand' ? 'price-list-brand-row' : 'price-list-category-row'} key={`${row.type}-${row.label}-${index}`}><td></td><td>{row.label}</td><td></td></tr> : <tr key={row.product.id}><td>{row.product.sku || ''}</td><td>{row.product.name}</td><td>{money(row.price)}</td></tr>)}</tbody></table>
    </div>
    <div className="modal-actions"><button className="secondary" onClick={onClose}>Cerrar</button><button className="secondary" onClick={() => downloadPriceListExcel(list, rows, selectedBrand)}><FileSpreadsheet size={17} />Descargar Excel</button><button className="secondary" onClick={() => window.print()}><Printer size={17} />Imprimir PDF</button><button className="primary" onClick={() => downloadPriceListPdf(list, rows, selectedBrand)}><Download size={17} />Descargar</button></div>
  </Modal>
}

function buildPriceListRows(list, products, priceListItems, brandId = '') {
  const specificPrices = new Map(priceListItems.filter((item) => item.price_list_id === list.id).map((item) => [item.product_id, Number(item.price)]))
  const filtered = products
    .filter((product) => !brandId || product.brand_id === brandId)
    .slice()
    .sort((a, b) => `${a.brands?.name || ''}|${a.category || 'SIN CATEGORÍA'}|${a.name}`.localeCompare(`${b.brands?.name || ''}|${b.category || 'SIN CATEGORÍA'}|${b.name}`, 'es'))
  const rows = []
  let previousBrand = null
  let previousCategory = null

  for (const product of filtered) {
    const currentBrand = product.brands?.name || 'SIN MARCA'
    const currentCategory = product.category || 'SIN CATEGORÍA'
    if (!brandId && currentBrand !== previousBrand) {
      rows.push({ type: 'heading', level: 'brand', label: currentBrand })
      previousBrand = currentBrand
      previousCategory = null
    }
    if (currentCategory !== previousCategory) {
      rows.push({ type: 'heading', level: 'category', label: currentCategory })
      previousCategory = currentCategory
    }
    rows.push({ type: 'product', product, price: specificPrices.get(product.id) ?? Number(product.retail_price || 0) })
  }
  return rows
}


function downloadPriceListPdf(list, rows, selectedBrand) {
  const title = selectedBrand?.name || list.name
  const date = new Date().toLocaleDateString('es-AR')
  const filename = `${fileSafeName(list.name)}${selectedBrand ? `-${fileSafeName(selectedBrand.name)}` : ''}.pdf`
  const pdfBlob = createPriceListPdf({ title, description: list.description, date, rows })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(pdfBlob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(link.href)
}

function createPriceListPdf({ title, description, date, rows }) {
  const pageWidth = 595.28
  const pageHeight = 841.89
  const margin = 24
  const colCode = 54
  const colPrice = 90
  const colProduct = pageWidth - margin * 2 - colCode - colPrice
  const rowPadding = 5
  const lineHeight = 10
  const pages = []
  let commands = []
  let y = pageHeight - margin

  const add = (command) => commands.push(command)
  const text = (value, x, yPos, size = 9, options = {}) => {
    const weight = options.bold ? 'F2' : 'F1'
    add(`BT /${weight} ${size} Tf ${number(x)} ${number(yPos)} Td ${pdfText(value)} Tj ET`)
  }
  const line = (x1, y1, x2, y2, gray = 0) => add(`${gray} G ${number(x1)} ${number(y1)} m ${number(x2)} ${number(y2)} l S`)
  const rect = (x, yPos, width, height, fillGray = 0.95) => add(`${fillGray} g ${number(x)} ${number(yPos)} ${number(width)} ${number(height)} re f`)

  const startPage = () => {
    commands = []
    y = pageHeight - margin
    text('LISTA DE PRECIOS', margin, y, 15, { bold: true })
    text(title, margin + 140, y, 13, { bold: true })
    text(`Vigencia: ${date}`, pageWidth - margin - 120, y, 9)
    y -= 18
    if (description) {
      text(description, margin, y, 8)
      y -= 12
    }
    drawTableHeader()
  }

  const finishPage = () => {
    text('Sistema de gestión comercial', margin, 18, 7)
    pages.push(commands.join('\n'))
  }

  const drawTableHeader = () => {
    const headerHeight = 18
    rect(margin, y - headerHeight + 5, pageWidth - margin * 2, headerHeight, 0.88)
    text('COD.', margin + rowPadding, y - 7, 8, { bold: true })
    text('PRODUCTO', margin + colCode + rowPadding, y - 7, 8, { bold: true })
    text('PRECIO', pageWidth - margin - colPrice + rowPadding, y - 7, 8, { bold: true })
    line(margin, y - headerHeight + 5, pageWidth - margin, y - headerHeight + 5, 0.25)
    y -= headerHeight
  }

  const ensureSpace = (height) => {
    if (y - height < 42) {
      finishPage()
      startPage()
    }
  }

  startPage()

  rows.forEach((row) => {
    if (row.type === 'heading') {
      const height = row.level === 'brand' ? 18 : 15
      ensureSpace(height)
      rect(margin, y - height + 5, pageWidth - margin * 2, height, row.level === 'brand' ? 0.9 : 0.96)
      text(row.label, margin + rowPadding, y - 7, row.level === 'brand' ? 8.5 : 8, { bold: true })
      y -= height
      return
    }

    const productLines = wrapText(row.product.name, 58)
    const height = Math.max(17, productLines.length * lineHeight + 7)
    ensureSpace(height)
    line(margin, y + 4, pageWidth - margin, y + 4, 0.82)
    text(row.product.sku || '', margin + rowPadding, y - 7, 8)
    productLines.forEach((lineText, index) => text(lineText, margin + colCode + rowPadding, y - 7 - index * lineHeight, 8))
    text(formatCurrencyPlain(row.price), pageWidth - margin - colPrice + rowPadding, y - 7, 8)
    y -= height
  })

  finishPage()
  return buildPdfDocument(pages, pageWidth, pageHeight)
}

function buildPdfDocument(pageStreams, pageWidth, pageHeight) {
  const encoder = new TextEncoder()
  const objects = []
  const addObject = (body) => {
    objects.push(body)
    return objects.length
  }

  const catalogId = addObject('')
  const pagesId = addObject('')
  const fontRegularId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  const fontBoldId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>')
  const pageIds = []

  pageStreams.forEach((stream) => {
    const streamBytes = encoder.encode(stream)
    const contentId = addObject(`<< /Length ${streamBytes.length} >>\nstream\n${stream}\nendstream`)
    const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${number(pageWidth)} ${number(pageHeight)}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`)
    pageIds.push(pageId)
  })

  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`

  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'
  const offsets = [0]
  objects.forEach((body, index) => {
    offsets.push(encoder.encode(pdf).length)
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`
  })
  const xrefOffset = encoder.encode(pdf).length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return new Blob([pdf], { type: 'application/pdf' })
}

function pdfText(value) {
  const text = String(value ?? '')
  let hex = 'FEFF'
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i)
    hex += code.toString(16).padStart(4, '0').toUpperCase()
  }
  return `<${hex}>`
}

function number(value) {
  return Number(value || 0).toFixed(2).replace(/\.00$/, '')
}

function wrapText(value, maxChars) {
  const words = String(value || '').split(/\s+/).filter(Boolean)
  const lines = []
  let current = ''
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word
    if (next.length > maxChars && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  })
  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

function formatCurrencyPlain(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

function downloadPriceListExcel(list, rows, selectedBrand) {
  const title = selectedBrand?.name || list.name
  const date = new Date().toLocaleDateString('es-AR')
  const tableRows = rows.map((row) => row.type === 'heading'
    ? `<tr><td></td><td><b>${escapeHtml(row.label)}</b></td><td></td></tr>`
    : `<tr><td>${escapeHtml(row.product.sku || '')}</td><td>${escapeHtml(row.product.name)}</td><td>${Number(row.price || 0).toFixed(2)}</td></tr>`
  ).join('')
  const html = `<!doctype html><html><head><meta charset="UTF-8"></head><body><table border="1"><tr><th>LISTA</th><th>${escapeHtml(title)}</th><th>PRECIOS VIGENTES ${escapeHtml(date)}</th></tr><tr><th>COD.</th><th>PRODUCTO</th><th>PRECIO</th></tr>${tableRows}</table></body></html>`
  const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${fileSafeName(list.name)}${selectedBrand ? `-${fileSafeName(selectedBrand.name)}` : ''}.xls`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(link.href)
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]))
}

function fileSafeName(value) {
  return String(value || 'lista-precios').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase()
}

function Stat({ title, value, subtitle }) { return <div className="stat-card"><span>{title}</span><strong>{value}</strong><small>{subtitle}</small></div> }

function calculateSuggestedPrice(cost, profitPercent) {
  const cleanCost = safeNumber(cost)
  const cleanPercent = safeNumber(profitPercent)
  if (cleanCost <= 0) return 0
  return roundCurrency(cleanCost * (1 + cleanPercent / 100))
}

function calculateProfitPercent(cost, finalPrice) {
  const cleanCost = safeNumber(cost)
  const cleanFinalPrice = safeNumber(finalPrice)
  if (cleanCost <= 0) return 0
  return roundCurrency((cleanFinalPrice - cleanCost) / cleanCost * 100)
}

function SearchBox({ value, setValue, placeholder }) { return <div className="search-box"><Search size={18} /><input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} /></div> }
function Empty({ text }) { return <div className="empty">{text}</div> }
function DataTable({ headers, rows, className = '' }) { return <div className="table-wrap"><table className={className}><thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, i) => <td key={i}>{cell}</td>)}</tr>)}</tbody></table></div> }
function Centered({ text }) { return <div className="centered">{text}</div> }
function Modal({ title, onClose, children, wide = false }) { return <div className="modal-backdrop"><div className={wide ? 'modal wide-modal' : 'modal'}><div className="modal-header"><h2>{title}</h2><button className="icon-btn" onClick={onClose}><X size={20} /></button></div>{children}</div></div> }
function Status({ value }) { return <span className={value === 'paid' ? 'badge' : value === 'partial' ? 'badge warning' : 'badge danger-badge'}>{statusLabel(value)}</span> }
function statusLabel(value) { return value === 'paid' ? 'Pagado' : value === 'partial' ? 'Pago parcial' : 'Pendiente' }
function movementLabel(value) { return value === 'sale_debt' ? 'Compra adeudada' : value === 'payment' ? 'Cobro recibido' : 'Ajuste manual' }
function stockLabel(value) { return value === 'sale' ? 'Venta' : value === 'purchase' ? 'Ingreso por compra' : value === 'manual_adjustment' ? 'Ajuste manual' : 'Carga inicial' }
function providerMovementLabel(value) { return value === 'purchase_debt' ? 'Factura adeudada' : value === 'payment' ? 'Pago realizado' : 'Ajuste manual' }
function roundCurrency(value) { return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100 }
function adjustmentText(record) { const parts = []; if (Number(record.discount_amount || 0) > 0) parts.push(`-${money(record.discount_amount)}`); if (Number(record.surcharge_amount || 0) > 0) parts.push(`+${money(record.surcharge_amount)}`); return parts.length ? parts.join(' · ') : '-' }
function itemAdjustmentText(item, type) { const percent = Number(item[`${type}_percent`] || 0); const amount = Number(item[`${type}_amount`] || 0); return percent > 0 ? `${percent}% (${type === 'discount' ? '-' : '+'}${money(amount)})` : '-' }
function purchaseItemAdjustmentText(item, type) { const percent = Number(item[`${type}_percent`] || 0); const amount = Number(item[`${type}_amount`] || 0); const sign = type === 'surcharge' ? '+' : '-'; return percent > 0 ? `${percent}% (${sign}${money(amount)})` : '-' }
function SetupMissing() { return <div className="login-page"><div className="login-card setup-card"><h1>Falta conectar Supabase</h1><p>Copiá el archivo <code>.env.example</code> como <code>.env</code> y completá las dos variables. La guía incluida en el ZIP explica el procedimiento completo.</p></div></div> }

export default App
