'use client'

import { useState, useMemo } from 'react'
import { Search, ChevronDown, ChevronRight, AlertTriangle, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import { exportToCSV, todayStr } from '@/lib/export-csv'
import { exportToXLSX } from '@/lib/export-xlsx'

export type LowStockProduct = {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  category: string | null
  unit: string
  min_quantity: number
  cost_price: number | null
  total_available: number
  shortage: number
  locations: Array<{
    location_id: string
    location_code: string
    warehouse_id: string
    warehouse_name: string
    quantity: number
  }>
}

type Props = {
  items: LowStockProduct[]
  warehouses: { id: string; name: string }[]
}

type Filters = {
  search: string
  category: string
  warehouseId: string
  criticalOnly: boolean
}

function emptyFilters(): Filters {
  return { search: '', category: '', warehouseId: '', criticalOnly: false }
}

function hasActiveFilters(f: Filters) {
  return !!(f.search || f.category || f.warehouseId || f.criticalOnly)
}

export function LowStockClient({ items, warehouses }: Props) {
  const { t } = useT()
  const r = t.reports

  const [filters, setFilters] = useState<Filters>(emptyFilters())
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const setFilter = <K extends keyof Filters>(k: K, v: Filters[K]) =>
    setFilters((f) => ({ ...f, [k]: v }))

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })

  const categoryOptions = useMemo(() => {
    const seen = new Set<string>()
    for (const item of items) if (item.category) seen.add(item.category)
    return Array.from(seen).sort((a, b) => a.localeCompare(b, 'bg'))
  }, [items])

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase()
    return items.filter((item) => {
      if (q) {
        const matchName = item.name.toLowerCase().includes(q)
        const matchSku = (item.sku ?? '').toLowerCase().includes(q)
        const matchBarcode = (item.barcode ?? '').toLowerCase().includes(q)
        if (!matchName && !matchSku && !matchBarcode) return false
      }
      if (filters.category && item.category !== filters.category) return false
      if (filters.warehouseId) {
        const hasInWarehouse = item.locations.some((l) => l.warehouse_id === filters.warehouseId)
        // Show the product if it has ANY stock in this warehouse (still needs restocking)
        // OR if total_available is 0 (no stock anywhere)
        if (!hasInWarehouse && item.total_available > 0) return false
      }
      if (filters.criticalOnly && item.total_available > 0) return false
      return true
    })
  }, [items, filters])

  const active = hasActiveFilters(filters)

  const filterSelectClass =
    'rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white'

  const buildLowStockRows = () =>
    filtered.map((item) => {
      const shortageValue = item.cost_price != null
        ? Number((item.shortage * item.cost_price).toFixed(2))
        : ''
      return [
        item.name,
        item.sku ?? '',
        item.unit,
        item.min_quantity,
        item.total_available,
        item.shortage,
        shortageValue,
        item.locations.length,
      ]
    })

  const handleExport = () => {
    const headers = ['Продукт', 'SKU', 'Единица', 'Минимално количество', 'Обща наличност', 'Недостиг', 'Приблизителна стойност на недостига (€)', 'Брой локации']
    exportToCSV(`stockflow_low_stock_${todayStr()}.csv`, headers, buildLowStockRows())
  }

  const handleXlsxExport = () => {
    const columns = [
      { header: 'Продукт', width: 28 },
      { header: 'SKU', width: 14 },
      { header: 'Единица', width: 10 },
      { header: 'Минимално количество', width: 22 },
      { header: 'Обща наличност', width: 18 },
      { header: 'Недостиг', width: 12 },
      { header: 'Приблизителна стойност на недостига (€)', width: 38 },
      { header: 'Брой локации', width: 14 },
    ]
    exportToXLSX(`stockflow_low_stock_${todayStr()}.xlsx`, 'Под минимум', columns, buildLowStockRows())
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{r.title}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{r.subtitle}</p>
      </div>

      {/* Low Stock section */}
      <div className="rounded-xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
        {/* Section header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-800 dark:text-white">{r.lowStockTitle}</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {items.length > 0 ? r.lowStockSub(items.length) : r.noLowStock}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={filtered.length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <Download className="h-3.5 w-3.5" />
              {r.exportCsv}
            </button>
            <button
              onClick={handleXlsxExport}
              disabled={filtered.length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30"
            >
              <Download className="h-3.5 w-3.5" />
              {r.exportXlsx}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div className="mb-3 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={r.searchPlaceholder}
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
                {r.clearFilters}
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {categoryOptions.length > 0 && (
              <select
                value={filters.category}
                onChange={(e) => setFilter('category', e.target.value)}
                className={filterSelectClass}
              >
                <option value="">{r.filterCategory}</option>
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            )}
            <select
              value={filters.warehouseId}
              onChange={(e) => setFilter('warehouseId', e.target.value)}
              className={filterSelectClass}
            >
              <option value="">{r.filterWarehouse}</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <input
                type="checkbox"
                checked={filters.criticalOnly}
                onChange={(e) => setFilter('criticalOnly', e.target.checked)}
                className="rounded border-gray-300"
              />
              {r.filterCritical}
            </label>
          </div>
        </div>

        {/* Table */}
        {items.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">{r.noLowStock}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">{r.noFilteredLowStock}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="w-8 px-4 py-3" />
                  {[r.colProduct, r.colSku, r.colUnit, r.colMin, r.colTotal, r.colShortage, r.colShortageValue, r.colLocations, r.colStatus].map((col) => (
                    <th key={col} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {filtered.map((item) => {
                  const isExpanded = expanded.has(item.id)
                  const isCritical = item.total_available === 0
                  const shortageValue =
                    item.cost_price != null
                      ? (item.shortage * item.cost_price).toFixed(2)
                      : null

                  return (
                    <>
                      <tr
                        key={item.id}
                        className={cn(
                          'cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50',
                          isCritical && 'bg-red-50/40 dark:bg-red-900/5'
                        )}
                        onClick={() => toggleExpand(item.id)}
                      >
                        <td className="px-4 py-3 text-gray-400">
                          {isExpanded
                            ? <ChevronDown className="h-4 w-4" />
                            : <ChevronRight className="h-4 w-4" />
                          }
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                          {item.name}
                          {item.category && (
                            <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">{item.category}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                          {item.sku ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                          {item.unit}
                        </td>
                        <td className="px-4 py-3 font-mono text-sm text-gray-500 dark:text-gray-400">
                          {item.min_quantity} {item.unit}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('font-mono text-sm font-semibold', isCritical ? 'text-red-500 dark:text-red-400' : 'text-amber-600 dark:text-amber-400')}>
                            {item.total_available} {item.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm font-bold text-red-600 dark:text-red-400">
                            -{item.shortage} {item.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                          {shortageValue != null ? `${shortageValue} €` : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500">
                          {item.locations.length}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                            isCritical
                              ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                          )}>
                            {isCritical ? r.statusCritical : r.statusLow}
                          </span>
                        </td>
                      </tr>

                      {/* Expandable location breakdown */}
                      {isExpanded && (
                        <tr key={`${item.id}-expand`} className="bg-gray-50/80 dark:bg-gray-800/30">
                          <td />
                          <td colSpan={9} className="px-4 pb-4 pt-2">
                            <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                              {r.expandTitle}
                            </p>
                            {item.locations.length === 0 ? (
                              <p className="text-xs text-gray-400 dark:text-gray-500">{r.noLocations}</p>
                            ) : (
                              <table className="w-full max-w-xl text-xs">
                                <thead>
                                  <tr className="text-left text-gray-400 dark:text-gray-600">
                                    <th className="pb-1 pr-6 font-medium">{r.colWarehouse}</th>
                                    <th className="pb-1 pr-6 font-medium">{r.colLocation}</th>
                                    <th className="pb-1 font-medium">{r.colQty}</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                  {item.locations.map((loc) => (
                                    <tr key={loc.location_id}>
                                      <td className="py-1.5 pr-6 text-gray-600 dark:text-gray-400">{loc.warehouse_name}</td>
                                      <td className="py-1.5 pr-6 font-mono text-gray-700 dark:text-gray-300">{loc.location_code}</td>
                                      <td className="py-1.5 font-mono font-medium text-gray-900 dark:text-white">
                                        {loc.quantity} {item.unit}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
