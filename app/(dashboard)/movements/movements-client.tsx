'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Download, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { submitMovement, findProductForMovement } from './actions'
import type { ProductOption, LocationOption, BalanceRow, Movement, SupplierOption, CustomerOption, MovementActionInput, MovementResult } from './actions'
import { useT } from '@/lib/i18n'
import { exportToCSV, csvDateTime, todayStr } from '@/lib/export-csv'
import { exportToXLSX } from '@/lib/export-xlsx'

type Props = {
  products: ProductOption[]
  locations: LocationOption[]
  movements: Movement[]
  balances: BalanceRow[]
  suppliers: SupplierOption[]
  customers: CustomerOption[]
  canWrite: boolean
}

type Tab = 'IN' | 'OUT' | 'TRANSFER'

type FormState = {
  product_id: string
  from_location_id: string
  to_location_id: string
  quantity: string
  note: string
  supplier_id: string
  customer_id: string
  new_customer_name: string
}

type Filters = {
  type: '' | 'IN' | 'OUT' | 'TRANSFER'
  productId: string
  warehouseId: string
  dateFrom: string
  dateTo: string
  referenceType: '' | 'manual' | 'incoming_delivery' | 'outgoing_order'
}

function emptyForm(): FormState {
  return {
    product_id: '',
    from_location_id: '',
    to_location_id: '',
    quantity: '',
    note: '',
    supplier_id: '',
    customer_id: '',
    new_customer_name: '',
  }
}

function emptyFilters(): Filters {
  return { type: '', productId: '', warehouseId: '', dateFrom: '', dateTo: '', referenceType: '' }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

function hasActiveFilters(f: Filters): boolean {
  return !!(f.type || f.productId || f.warehouseId || f.dateFrom || f.dateTo || f.referenceType)
}

export function MovementsClient({ products, locations, movements, balances, suppliers, customers, canWrite }: Props) {
  const { t } = useT()
  const m = t.movements

  const router = useRouter()
  const [tab, setTab] = useState<Tab>('IN')
  const [form, setForm] = useState<FormState>(emptyForm())
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isBarcodeSearching, startBarcodeSearch] = useTransition()
  const [barcodeInput, setBarcodeInput] = useState('')
  const [barcodeMsg, setBarcodeMsg] = useState<{ type: 'found' | 'notFound'; text: string } | null>(null)
  const [filters, setFilters] = useState<Filters>(emptyFilters())

  const tabs: { id: Tab; label: string; btnClass: string }[] = [
    { id: 'IN', label: m.tabIn, btnClass: 'bg-green-600 hover:bg-green-700' },
    { id: 'OUT', label: m.tabOut, btnClass: 'bg-red-600 hover:bg-red-700' },
    { id: 'TRANSFER', label: m.tabTransfer, btnClass: 'bg-blue-600 hover:bg-blue-700' },
  ]

  const TYPE_LABEL: Record<string, string> = {
    IN: m.typeIn, OUT: m.typeOut, TRANSFER: m.typeTransfer,
  }

  const SUCCESS_MSG: Record<Tab, string> = {
    IN: m.successIn, OUT: m.successOut, TRANSFER: m.successTransfer,
  }

  const activeProducts = useMemo(() => products.filter((p) => p.status === 'active'), [products])
  const activeLocations = useMemo(() => locations.filter((l) => l.status === 'active'), [locations])
  const activeSuppliers = useMemo(() => suppliers.filter((s) => s.status === 'active'), [suppliers])
  const activeCustomers = useMemo(() => customers.filter((c) => c.status === 'active'), [customers])

  const balanceMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const b of balances) map.set(`${b.product_id}:${b.location_id}`, Number(b.quantity_available))
    return map
  }, [balances])

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])
  const locationMap = useMemo(() => new Map(locations.map((l) => [l.id, l])), [locations])

  // unique warehouses derived from locations — no extra DB query
  const warehouses = useMemo(() => {
    const seen = new Map<string, string>()
    for (const loc of locations) {
      if (!seen.has(loc.warehouse_id) && loc.warehouses?.name) {
        seen.set(loc.warehouse_id, loc.warehouses.name)
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
  }, [locations])

  const availableStock = useMemo(() => {
    if (!form.product_id || !form.from_location_id) return null
    return balanceMap.get(`${form.product_id}:${form.from_location_id}`) ?? 0
  }, [form.product_id, form.from_location_id, balanceMap])

  const filteredMovements = useMemo(() => {
    return movements.filter((mv) => {
      if (filters.type && mv.movement_type !== filters.type) return false
      if (filters.productId && mv.product_id !== filters.productId) return false
      if (filters.warehouseId) {
        const fromWarehouse = mv.from_location_id ? locationMap.get(mv.from_location_id)?.warehouse_id : undefined
        const toWarehouse = mv.to_location_id ? locationMap.get(mv.to_location_id)?.warehouse_id : undefined
        if (fromWarehouse !== filters.warehouseId && toWarehouse !== filters.warehouseId) return false
      }
      if (filters.dateFrom && mv.created_at.substring(0, 10) < filters.dateFrom) return false
      if (filters.dateTo && mv.created_at.substring(0, 10) > filters.dateTo) return false
      if (filters.referenceType) {
        if (filters.referenceType === 'manual' && mv.reference_type != null && mv.reference_type !== 'supplier' && mv.reference_type !== 'customer') return false
        if (filters.referenceType === 'incoming_delivery' && mv.reference_type !== 'incoming_delivery') return false
        if (filters.referenceType === 'outgoing_order' && mv.reference_type !== 'outgoing_order') return false
      }
      return true
    })
  }, [movements, filters, locationMap])

  const setFilter = <K extends keyof Filters>(k: K, v: Filters[K]) => {
    setFilters((f) => ({ ...f, [k]: v }))
  }

  const set = (k: keyof FormState, v: string) => {
    setForm((f) => ({ ...f, [k]: v }))
    setError(null)
    setSuccess(null)
  }

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab)
    setForm(emptyForm())
    setBarcodeInput('')
    setBarcodeMsg(null)
    setError(null)
    setSuccess(null)
  }

  const handleBarcodeSearch = () => {
    const trimmed = barcodeInput.trim()
    if (!trimmed) return
    startBarcodeSearch(async () => {
      const result = await findProductForMovement(trimmed)
      if (result) {
        set('product_id', result.id)
        setBarcodeMsg({ type: 'found', text: m.barcodeFound(result.name) })
      } else {
        setBarcodeMsg({ type: 'notFound', text: m.barcodeNotFound })
      }
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const qty = Number(form.quantity)
    if (!form.product_id) { setError(m.errProduct); return }
    if (isNaN(qty) || qty <= 0) { setError(m.errQty); return }
    if ((tab === 'OUT' || tab === 'TRANSFER') && !form.from_location_id) { setError(m.errFromLoc); return }
    if ((tab === 'IN' || tab === 'TRANSFER') && !form.to_location_id) { setError(m.errToLoc); return }
    if (tab === 'TRANSFER' && form.from_location_id === form.to_location_id) { setError(m.errSameLoc); return }

    if (tab === 'IN' && !form.supplier_id) { setError(m.errSupplierRequired); return }
    if (tab === 'OUT' && !form.customer_id) { setError(m.errCustomerRequired); return }
    if (tab === 'OUT' && form.customer_id === 'NEW' && !form.new_customer_name.trim()) {
      setError(m.errNewCustomerNameRequired)
      return
    }

    if ((tab === 'OUT' || tab === 'TRANSFER') && availableStock !== null && qty > availableStock) {
      const unit = productMap.get(form.product_id)?.unit ?? ''
      setError(m.errInsufficientStock(availableStock, unit))
      return
    }

    const input: MovementActionInput = {
      movement_type: tab,
      product_id: form.product_id,
      from_location_id: tab === 'IN' ? null : form.from_location_id || null,
      to_location_id: tab === 'OUT' ? null : form.to_location_id || null,
      quantity: qty,
      note: form.note || null,
      supplier_id: tab === 'IN' ? form.supplier_id : null,
      customer_id: tab === 'OUT' ? form.customer_id : null,
      new_customer_name: tab === 'OUT' && form.customer_id === 'NEW' ? form.new_customer_name : null,
    }

    startTransition(async () => {
      const result: MovementResult = await submitMovement(input)
      if (!result.success) {
        setError(result.error)
        return
      }
      setSuccess(SUCCESS_MSG[tab])
      setForm(emptyForm())
      router.refresh()
    })
  }

  const locationLabel = (loc: LocationOption) => `${loc.warehouses?.name ?? '?'} / ${loc.code}`
  const tabConfig = tabs.find((tb) => tb.id === tab)!

  const selectClass =
    'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white'

  const filterSelectClass =
    'rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white'

  const refLabel = (mv: Movement): string => {
    if (!mv.reference_type) return '—'
    if (mv.reference_type === 'incoming_delivery') return m.refDelivery
    if (mv.reference_type === 'outgoing_order') return m.refOutgoingOrder
    if (mv.reference_type === 'supplier') return '—'
    if (mv.reference_type === 'customer') return '—'
    return mv.reference_type
  }

  const active = hasActiveFilters(filters)

  const getFromDisplay = (mv: Movement): string => {
    if (mv.movement_type === 'IN') {
      if (mv.reference_type === 'incoming_delivery' || mv.reference_type === 'supplier') {
        const sName = mv.supplier_name?.trim()
        return sName ? `${m.supplierLabelPrefix}${sName}` : m.displayManualInSupplier
      }
      return m.displayManualInSupplier
    }
    const fromLoc = mv.from_location_id ? locationMap.get(mv.from_location_id) : null
    return fromLoc ? `${fromLoc.warehouses?.name ?? '?'} / ${fromLoc.code}` : '—'
  }

  const getToDisplay = (mv: Movement): string => {
    if (mv.movement_type === 'OUT') {
      if (mv.reference_type === 'outgoing_order') {
        const cName = mv.customer_name?.trim()
        return cName ? `${m.customerLabelPrefix}${cName}` : `${m.customerLabelPrefix}${t.orders.noCustomer}`
      }
      if (mv.reference_type === 'customer') {
        const cName = mv.customer_name?.trim()
        return cName ? `${m.customerLabelPrefix}${cName}` : m.displayManualOutCustomer
      }
      return m.displayManualOutCustomer
    }
    const toLoc = mv.to_location_id ? locationMap.get(mv.to_location_id) : null
    return toLoc ? `${toLoc.warehouses?.name ?? '?'} / ${toLoc.code}` : '—'
  }

  const buildMovementRows = () =>
    filteredMovements.map((mv) => {
      const product = productMap.get(mv.product_id)
      const refVal = (!mv.reference_type || mv.reference_type === 'supplier' || mv.reference_type === 'customer')
        ? 'Ръчно'
        : mv.reference_type === 'incoming_delivery'
        ? 'Вх. доставка'
        : mv.reference_type === 'outgoing_order'
        ? 'Изх. поръчка'
        : mv.reference_type
      return [
        csvDateTime(mv.created_at),
        TYPE_LABEL[mv.movement_type] ?? mv.movement_type,
        product?.name ?? '',
        getFromDisplay(mv),
        getToDisplay(mv),
        Number(mv.quantity),
        product?.unit ?? '',
        mv.note ?? '',
        refVal,
      ]
    })

  const handleExport = () => {
    const headers = ['Дата', 'Тип', 'Продукт', 'От', 'До', 'Количество', 'Единица', 'Забележка', 'Източник']
    exportToCSV(`stockflow_movements_${todayStr()}.csv`, headers, buildMovementRows())
  }

  const handleXlsxExport = () => {
    const columns = [
      { header: 'Дата', width: 20 },
      { header: 'Тип', width: 10 },
      { header: 'Продукт', width: 28 },
      { header: 'От', width: 22 },
      { header: 'До', width: 22 },
      { header: 'Количество', width: 13 },
      { header: 'Единица', width: 10 },
      { header: 'Забележка', width: 30 },
      { header: 'Източник', width: 16 },
    ]
    exportToXLSX(`stockflow_movements_${todayStr()}.xlsx`, 'Движения', columns, buildMovementRows())
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{m.title}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{m.subtitle}</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* LEFT: Form */}
        <div className="col-span-1">
          {canWrite ? (
            <>
          <div className="flex rounded-lg border border-gray-100 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-800">
            {tabs.map((tb) => (
              <button
                key={tb.id}
                onClick={() => handleTabChange(tb.id)}
                className={cn(
                  'flex-1 rounded-md py-1.5 text-xs font-medium transition-colors',
                  tab === tb.id
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                )}
              >
                {tb.label}
              </button>
            ))}
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-4 rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="space-y-4">
              {/* Barcode lookup */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  {m.fBarcodeLabel}
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => { setBarcodeInput(e.target.value); setBarcodeMsg(null) }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleBarcodeSearch() } }}
                    placeholder={m.fBarcodePlaceholder}
                    autoComplete="off"
                    className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                  />
                  <button
                    type="button"
                    onClick={handleBarcodeSearch}
                    disabled={isBarcodeSearching || !barcodeInput.trim()}
                    className="shrink-0 rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    {m.barcodeSearch}
                  </button>
                  {barcodeInput && (
                    <button
                      type="button"
                      onClick={() => { setBarcodeInput(''); setBarcodeMsg(null) }}
                      className="shrink-0 rounded-lg border border-gray-200 px-2 py-2 text-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {barcodeMsg && (
                  <p className={cn(
                    'mt-1 text-xs',
                    barcodeMsg.type === 'found'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-amber-600 dark:text-amber-500'
                  )}>
                    {barcodeMsg.text}
                  </p>
                )}
              </div>

              {/* Product */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  {m.fProduct} <span className="text-red-500">*</span>
                </label>
                {activeProducts.length === 0 ? (
                  <p className="text-xs text-red-500">{m.noActiveProducts}</p>
                ) : (
                  <select value={form.product_id} onChange={(e) => set('product_id', e.target.value)} className={selectClass}>
                    <option value="">{m.selectProduct}</option>
                    {activeProducts.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}{p.sku ? ` (${p.sku})` : ''}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* From supplier (Only for IN) */}
              {tab === 'IN' && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                    {m.fFromSupplier} <span className="text-red-500">*</span>
                  </label>
                  {activeSuppliers.length === 0 ? (
                    <p className="text-xs text-red-500">{t.deliveries.noSuppliers}</p>
                  ) : (
                    <select
                      value={form.supplier_id}
                      onChange={(e) => set('supplier_id', e.target.value)}
                      className={selectClass}
                    >
                      <option value="">{m.selectSupplier}</option>
                      {activeSuppliers.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* From location — OUT + TRANSFER */}
              {(tab === 'OUT' || tab === 'TRANSFER') && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                    {m.fFromLoc} <span className="text-red-500">*</span>
                  </label>
                  <select value={form.from_location_id} onChange={(e) => set('from_location_id', e.target.value)} className={selectClass}>
                    <option value="">{m.selectLocation}</option>
                    {activeLocations.map((loc) => (
                      <option key={loc.id} value={loc.id}>{locationLabel(loc)}</option>
                    ))}
                  </select>
                  {availableStock !== null && (
                    <p className={cn('mt-1 text-xs', availableStock === 0 ? 'text-red-500' : 'text-gray-400 dark:text-gray-500')}>
                      {m.available} {availableStock} {productMap.get(form.product_id)?.unit ?? ''}
                    </p>
                  )}
                </div>
              )}

              {/* To customer (Only for OUT) */}
              {tab === 'OUT' && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                      {m.fToCustomer} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.customer_id}
                      onChange={(e) => set('customer_id', e.target.value)}
                      className={selectClass}
                    >
                      <option value="">{m.selectCustomer}</option>
                      {activeCustomers.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                      <option value="NEW">{m.addNewCustomer}</option>
                    </select>
                  </div>

                  {form.customer_id === 'NEW' && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                        {m.fNewCustomerName} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.new_customer_name}
                        onChange={(e) => set('new_customer_name', e.target.value)}
                        placeholder={t.orders.customerPlaceholder}
                        className={selectClass}
                      />
                    </div>
                  )}
                </>
              )}

              {/* To location — IN + TRANSFER */}
              {(tab === 'IN' || tab === 'TRANSFER') && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                    {m.fToLoc} <span className="text-red-500">*</span>
                  </label>
                  <select value={form.to_location_id} onChange={(e) => set('to_location_id', e.target.value)} className={selectClass}>
                    <option value="">{m.selectLocation}</option>
                    {activeLocations
                      .filter((loc) => loc.id !== form.from_location_id)
                      .map((loc) => (
                        <option key={loc.id} value={loc.id}>{locationLabel(loc)}</option>
                      ))}
                  </select>
                </div>
              )}

              {/* Quantity */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  {m.fQty} <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min="0.001" step="any"
                    value={form.quantity} onChange={(e) => set('quantity', e.target.value)}
                    placeholder="0" className={selectClass}
                  />
                  {form.product_id && (
                    <span className="shrink-0 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-2 text-sm font-medium text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                      {productMap.get(form.product_id)?.unit ?? ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  {m.fNote}
                </label>
                <textarea
                  rows={2} value={form.note} onChange={(e) => set('note', e.target.value)}
                  placeholder={m.notePlaceholder} className={cn(selectClass, 'resize-none')}
                />
              </div>
            </div>

            {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
            {success && <p className="mt-3 text-xs text-green-600 dark:text-green-400">{success}</p>}

            <button
              type="submit"
              disabled={isPending || activeProducts.length === 0 || activeLocations.length === 0}
              className={cn('mt-5 w-full rounded-lg py-2 text-sm font-medium text-white transition-colors disabled:opacity-50', tabConfig.btnClass)}
            >
              {isPending ? m.saving : m.saveBtn(tabConfig.label)}
            </button>
          </form>
            </>) : (
              <div className="rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                  {t.common.readOnly}
                </span>
              </div>
            )}
        </div>

        {/* RIGHT: History */}
        <div className="col-span-2">
          <div className="rounded-xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
            {/* History header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {m.historyTitle}
                <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
                  {active ? `${filteredMovements.length} / ${movements.length}` : `${movements.length}`} {m.records}
                </span>
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExport}
                  disabled={filteredMovements.length === 0}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  <Download className="h-3.5 w-3.5" />
                  {m.exportCsv}
                </button>
                <button
                  onClick={handleXlsxExport}
                  disabled={filteredMovements.length === 0}
                  className="flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30"
                >
                  <Download className="h-3.5 w-3.5" />
                  {m.exportXlsx}
                </button>
              </div>
            </div>

            {/* Filter bar */}
            <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
              {/* Row 1: type buttons + clear */}
              <div className="mb-2 flex items-center gap-2">
                {(['', 'IN', 'OUT', 'TRANSFER'] as const).map((type) => {
                  const label = type === '' ? m.filterAllTypes : TYPE_LABEL[type]
                  const isActive = filters.type === type
                  const colorClass = type === 'IN'
                    ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-400'
                    : type === 'OUT'
                    ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400'
                    : type === 'TRANSFER'
                    ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  return (
                    <button
                      key={type}
                      onClick={() => setFilter('type', type)}
                      className={cn(
                        'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                        isActive ? colorClass : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800'
                      )}
                    >
                      {label}
                    </button>
                  )
                })}
                {active && (
                  <button
                    onClick={() => setFilters(emptyFilters())}
                    className="ml-auto text-xs text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {m.clearFilters}
                  </button>
                )}
              </div>

              {/* Row 2: dropdowns + date inputs */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={filters.productId}
                  onChange={(e) => setFilter('productId', e.target.value)}
                  className={filterSelectClass}
                >
                  <option value="">{m.filterProduct}</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>

                <select
                  value={filters.warehouseId}
                  onChange={(e) => setFilter('warehouseId', e.target.value)}
                  className={filterSelectClass}
                >
                  <option value="">{m.filterWarehouse}</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>

                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-gray-400 dark:text-gray-500">{m.filterDateFrom}</span>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilter('dateFrom', e.target.value)}
                    className={filterSelectClass}
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-gray-400 dark:text-gray-500">{m.filterDateTo}</span>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilter('dateTo', e.target.value)}
                    className={filterSelectClass}
                  />
                </div>

                <select
                  value={filters.referenceType}
                  onChange={(e) => setFilter('referenceType', e.target.value as Filters['referenceType'])}
                  className={filterSelectClass}
                >
                  <option value="">{m.filterAllRef}</option>
                  <option value="manual">{m.filterManual}</option>
                  <option value="incoming_delivery">{m.filterDelivery}</option>
                  <option value="outgoing_order">{m.filterOutgoingOrder}</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    {m.histCols.map((col) => (
                      <th key={col} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {movements.length === 0 ? (
                    <tr>
                      <td colSpan={m.histCols.length} className="px-4 py-16 text-center">
                        <p className="text-sm text-gray-400 dark:text-gray-500">{m.noMovements}</p>
                        <p className="mt-1 text-xs text-gray-300 dark:text-gray-600">{m.noMovementsSub}</p>
                      </td>
                    </tr>
                  ) : filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={m.histCols.length} className="px-4 py-12 text-center">
                        <p className="text-sm text-gray-400 dark:text-gray-500">{m.noFilteredMovements}</p>
                      </td>
                    </tr>
                  ) : (
                    filteredMovements.map((mv) => {
                      const product = productMap.get(mv.product_id)

                      return (
                        <tr key={mv.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(mv.created_at)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                              mv.movement_type === 'IN'
                                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                : mv.movement_type === 'OUT'
                                ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                                : 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                            )}>
                              {TYPE_LABEL[mv.movement_type] ?? mv.movement_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{product?.name ?? '—'}</td>
                          <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                            {getFromDisplay(mv)}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                            {getToDisplay(mv)}
                          </td>
                          <td className="px-4 py-3 font-mono text-sm font-medium text-gray-900 dark:text-white">
                            {Number(mv.quantity)}
                          </td>
                          <td className="min-w-[120px] px-4 py-3 text-xs text-gray-400 dark:text-gray-500">
                            <span className="block break-words">{mv.note ?? '—'}</span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-400 dark:text-gray-500">
                            {refLabel(mv)}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
