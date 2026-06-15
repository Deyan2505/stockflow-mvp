'use client'

import { useState, useMemo } from 'react'
import { Search, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import { exportToCSV, todayStr } from '@/lib/export-csv'
import { exportToXLSX } from '@/lib/export-xlsx'

type InventoryRow = {
  product_id: string
  location_id: string
  quantity_available: number
  products: {
    name: string
    sku: string | null
    barcode: string | null
    category: string | null
    unit: string
    min_quantity: number
    cost_price: number | null
  } | null
  locations: {
    code: string
    zone: string | null
    warehouse_id: string
    warehouses: { name: string } | null
  } | null
}

type Warehouse = { id: string; name: string }

type Props = {
  rows: InventoryRow[]
  warehouses: Warehouse[]
}

type StockStatus = 'ok' | 'low' | 'zero'

type Filters = {
  search: string
  productId: string
  warehouseId: string
  locationId: string
  status: '' | StockStatus
  category: string
}

function emptyFilters(): Filters {
  return { search: '', productId: '', warehouseId: '', locationId: '', status: '', category: '' }
}

function stockStatus(qty: number, min: number): StockStatus {
  if (qty <= 0) return 'zero'
  if (min > 0 && qty < min) return 'low'
  return 'ok'
}

function hasActiveFilters(f: Filters): boolean {
  return !!(f.search || f.productId || f.warehouseId || f.locationId || f.status || f.category)
}

const STATUS_BADGE: Record<StockStatus, string> = {
  ok: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  low: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-500',
  zero: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
}

const QTY_COLOR: Record<StockStatus, string> = {
  ok: 'text-gray-900 dark:text-white',
  low: 'text-yellow-600 dark:text-yellow-400',
  zero: 'text-red-500 dark:text-red-400',
}

export function InventoryClient({ rows, warehouses }: Props) {
  const { t } = useT()
  const inv = t.inventory

  const [filters, setFilters] = useState<Filters>(emptyFilters())

  const setFilter = <K extends keyof Filters>(k: K, v: Filters[K]) => {
    setFilters((f) => {
      const next = { ...f, [k]: v }
      // reset location when warehouse changes and location no longer belongs to it
      if (k === 'warehouseId' && f.locationId) {
        const locRow = rows.find((r) => r.location_id === f.locationId)
        if (locRow && locRow.locations?.warehouse_id !== v) {
          next.locationId = ''
        }
      }
      return next
    })
  }

  // Unique products from rows
  const productOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const r of rows) {
      if (r.products && !seen.has(r.product_id)) seen.set(r.product_id, r.products.name)
    }
    return Array.from(seen.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'bg'))
  }, [rows])

  // Unique locations from rows, filtered by selected warehouse
  const locationOptions = useMemo(() => {
    const seen = new Map<string, { id: string; code: string; warehouseId: string }>()
    for (const r of rows) {
      if (r.locations && !seen.has(r.location_id)) {
        seen.set(r.location_id, {
          id: r.location_id,
          code: r.locations.code,
          warehouseId: r.locations.warehouse_id,
        })
      }
    }
    return Array.from(seen.values())
      .filter((l) => !filters.warehouseId || l.warehouseId === filters.warehouseId)
      .sort((a, b) => a.code.localeCompare(b.code))
  }, [rows, filters.warehouseId])

  // Unique non-empty categories from rows
  const categoryOptions = useMemo(() => {
    const seen = new Set<string>()
    for (const r of rows) {
      if (r.products?.category) seen.add(r.products.category)
    }
    return Array.from(seen).sort((a, b) => a.localeCompare(b, 'bg'))
  }, [rows])

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase()
    return rows.filter((r) => {
      if (q) {
        const matchName = (r.products?.name ?? '').toLowerCase().includes(q)
        const matchSku = (r.products?.sku ?? '').toLowerCase().includes(q)
        const matchBarcode = (r.products?.barcode ?? '').toLowerCase().includes(q)
        if (!matchName && !matchSku && !matchBarcode) return false
      }
      if (filters.productId && r.product_id !== filters.productId) return false
      if (filters.warehouseId && r.locations?.warehouse_id !== filters.warehouseId) return false
      if (filters.locationId && r.location_id !== filters.locationId) return false
      if (filters.status) {
        const min = r.products?.min_quantity ?? 0
        if (stockStatus(r.quantity_available, min) !== filters.status) return false
      }
      if (filters.category && (r.products?.category ?? '') !== filters.category) return false
      return true
    })
  }, [rows, filters])

  // Summary cards always based on all rows
  const totalWithStock = rows.filter((r) => r.quantity_available > 0).length
  const zeroStock = rows.filter((r) => r.quantity_available <= 0).length

  // belowMin at product level: sum all locations per product, compare to min_quantity
  const belowMin = useMemo(() => {
    const byProduct = new Map<string, { total: number; min: number }>()
    for (const r of rows) {
      const min = r.products?.min_quantity ?? 0
      const existing = byProduct.get(r.product_id)
      if (existing) {
        existing.total += Number(r.quantity_available)
      } else {
        byProduct.set(r.product_id, { total: Number(r.quantity_available), min })
      }
    }
    let count = 0
    byProduct.forEach(({ total, min }) => {
      if (min > 0 && total < min) count++
    })
    return count
  }, [rows])

  const statusLabel: Record<StockStatus, string> = {
    ok: inv.statusOk,
    low: inv.statusLow,
    zero: inv.statusZero,
  }

  const active = hasActiveFilters(filters)

  const buildInventoryRows = () =>
    filtered.map((r) => {
      const min = r.products?.min_quantity ?? 0
      const status = stockStatus(r.quantity_available, min)
      const approxValue = r.products?.cost_price != null
        ? Number((Number(r.products.cost_price) * Number(r.quantity_available)).toFixed(2))
        : ''
      return [
        r.products?.name ?? '',
        r.products?.sku ?? '',
        r.locations?.warehouses?.name ?? '',
        r.locations?.code ?? '',
        Number(r.quantity_available),
        r.products?.unit ?? '',
        min > 0 ? min : '',
        statusLabel[status],
        approxValue,
      ]
    })

  const handleExport = () => {
    const headers = ['Продукт', 'SKU', 'Склад', 'Локация', 'Налично количество', 'Единица', 'Минимално количество', 'Статус', 'Приблизителна стойност (€)']
    exportToCSV(`stockflow_inventory_${todayStr()}.csv`, headers, buildInventoryRows())
  }

  const handleXlsxExport = () => {
    const columns = [
      { header: 'Продукт', width: 28 },
      { header: 'SKU', width: 14 },
      { header: 'Склад', width: 20 },
      { header: 'Локация', width: 14 },
      { header: 'Налично количество', width: 20 },
      { header: 'Единица', width: 10 },
      { header: 'Минимално количество', width: 22 },
      { header: 'Статус', width: 16 },
      { header: 'Приблизителна стойност (€)', width: 26 },
    ]
    exportToXLSX(`stockflow_inventory_${todayStr()}.xlsx`, 'Наличност', columns, buildInventoryRows())
  }

  const filterSelectClass =
    'rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white'

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{inv.title}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{inv.subtitle}</p>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{inv.cardInStock}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{totalWithStock}</p>
          <p className="text-xs text-gray-400 dark:text-gray-600">{inv.positions}</p>
        </div>

        <div className={cn('rounded-xl border p-4', belowMin > 0 ? 'border-yellow-100 bg-yellow-50 dark:border-yellow-900/30 dark:bg-yellow-900/10' : 'border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900')}>
          <p className={cn('text-xs font-medium', belowMin > 0 ? 'text-yellow-700 dark:text-yellow-400' : 'text-gray-500 dark:text-gray-400')}>
            {inv.cardBelowMin}
          </p>
          <p className={cn('mt-1 text-2xl font-semibold', belowMin > 0 ? 'text-yellow-700 dark:text-yellow-400' : 'text-gray-900 dark:text-white')}>
            {belowMin}
          </p>
          <p className={cn('text-xs', belowMin > 0 ? 'text-yellow-600 dark:text-yellow-500' : 'text-gray-400 dark:text-gray-600')}>
            {inv.positions}
          </p>
        </div>

        <div className={cn('rounded-xl border p-4', zeroStock > 0 ? 'border-red-100 bg-red-50 dark:border-red-900/30 dark:bg-red-900/10' : 'border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900')}>
          <p className={cn('text-xs font-medium', zeroStock > 0 ? 'text-red-700 dark:text-red-400' : 'text-gray-500 dark:text-gray-400')}>
            {inv.cardZero}
          </p>
          <p className={cn('mt-1 text-2xl font-semibold', zeroStock > 0 ? 'text-red-700 dark:text-red-400' : 'text-gray-900 dark:text-white')}>
            {zeroStock}
          </p>
          <p className={cn('text-xs', zeroStock > 0 ? 'text-red-600 dark:text-red-500' : 'text-gray-400 dark:text-gray-600')}>
            {inv.positions}
          </p>
        </div>
      </div>

      {/* Filter area */}
      <div className="mb-4 rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        {/* Row 1: search + clear */}
        <div className="mb-3 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={inv.searchPlaceholder}
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            />
          </div>
          {active && (
            <button
              onClick={() => setFilters(emptyFilters())}
              className="shrink-0 text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              {inv.clearFilters}
            </button>
          )}
        </div>

        {/* Row 2: dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filters.productId}
            onChange={(e) => setFilter('productId', e.target.value)}
            className={filterSelectClass}
          >
            <option value="">{inv.filterProduct}</option>
            {productOptions.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            value={filters.warehouseId}
            onChange={(e) => setFilter('warehouseId', e.target.value)}
            className={filterSelectClass}
          >
            <option value="">{inv.allWarehouses}</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>

          <select
            value={filters.locationId}
            onChange={(e) => setFilter('locationId', e.target.value)}
            className={filterSelectClass}
          >
            <option value="">{inv.filterLocation}</option>
            {locationOptions.map((l) => (
              <option key={l.id} value={l.id}>{l.code}</option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilter('status', e.target.value as Filters['status'])}
            className={filterSelectClass}
          >
            <option value="">{inv.filterStatusAll}</option>
            <option value="ok">{inv.statusOk}</option>
            <option value="low">{inv.statusLow}</option>
            <option value="zero">{inv.statusZero}</option>
          </select>

          {categoryOptions.length > 0 && (
            <select
              value={filters.category}
              onChange={(e) => setFilter('category', e.target.value)}
              className={filterSelectClass}
            >
              <option value="">{inv.filterCategory}</option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          )}
        </div>

        {/* Counter */}
        <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
          {inv.shown(filtered.length, rows.length)}
        </p>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-end gap-2 border-b border-gray-100 px-4 py-2 dark:border-gray-800">
          <button
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <Download className="h-3.5 w-3.5" />
            {inv.exportCsv}
          </button>
          <button
            onClick={handleXlsxExport}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30"
          >
            <Download className="h-3.5 w-3.5" />
            {inv.exportXlsx}
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              {inv.cols.map((col) => (
                <th key={col} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={inv.cols.length} className="px-4 py-16 text-center">
                  <p className="text-sm text-gray-400 dark:text-gray-500">{inv.noItems}</p>
                  <p className="mt-1 text-xs text-gray-300 dark:text-gray-600">{inv.autoUpdate}</p>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={inv.cols.length} className="px-4 py-12 text-center">
                  <p className="text-sm text-gray-400 dark:text-gray-500">{inv.noFilteredItems}</p>
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const min = r.products?.min_quantity ?? 0
                const status = stockStatus(r.quantity_available, min)
                const approxValue =
                  r.products?.cost_price != null
                    ? (Number(r.products.cost_price) * Number(r.quantity_available)).toFixed(2)
                    : null

                return (
                  <tr
                    key={`${r.product_id}:${r.location_id}`}
                    className={cn('transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50', status === 'zero' && 'opacity-60')}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{r.products?.name ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{r.products?.sku ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{r.locations?.warehouses?.name ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-sm font-medium text-gray-700 dark:text-gray-300">{r.locations?.code ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{r.products?.unit ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={cn('font-mono text-sm font-semibold', QTY_COLOR[status])}>
                        {Number(r.quantity_available)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400 dark:text-gray-600">
                      {min > 0 ? min : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', STATUS_BADGE[status])}>
                        {statusLabel[status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                      {approxValue != null ? `${approxValue} €` : '—'}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

