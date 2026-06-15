'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'

type InventoryRow = {
  product_id: string
  location_id: string
  quantity_available: number
  products: { name: string; sku: string | null; unit: string; min_quantity: number } | null
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

function stockStatus(qty: number, min: number): StockStatus {
  if (qty <= 0) return 'zero'
  if (qty < min) return 'low'
  return 'ok'
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

  const [search, setSearch] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('all')
  const [showZero, setShowZero] = useState(false)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return rows.filter((r) => {
      const matchSearch =
        !q ||
        (r.products?.name ?? '').toLowerCase().includes(q) ||
        (r.products?.sku ?? '').toLowerCase().includes(q)
      const matchWarehouse = warehouseFilter === 'all' || r.locations?.warehouse_id === warehouseFilter
      const matchZero = showZero || r.quantity_available > 0
      return matchSearch && matchWarehouse && matchZero
    })
  }, [rows, search, warehouseFilter, showZero])

  const totalWithStock = rows.filter((r) => r.quantity_available > 0).length
  const belowMin = rows.filter((r) => {
    const min = r.products?.min_quantity ?? 0
    return r.quantity_available > 0 && r.quantity_available < min
  }).length
  const zeroStock = rows.filter((r) => r.quantity_available <= 0).length

  const statusLabel: Record<StockStatus, string> = {
    ok: inv.statusOk,
    low: inv.statusLow,
    zero: inv.statusZero,
  }

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

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text" placeholder={inv.searchPlaceholder} value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
          />
        </div>

        <select
          value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        >
          <option value="all">{inv.allWarehouses}</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <input type="checkbox" checked={showZero} onChange={(e) => setShowZero(e.target.checked)} className="rounded border-gray-300" />
          {inv.showZero}
        </label>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
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
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={inv.cols.length} className="px-4 py-16 text-center">
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    {rows.length === 0 ? inv.noItems : inv.noResults}
                  </p>
                  {rows.length === 0 && (
                    <p className="mt-1 text-xs text-gray-300 dark:text-gray-600">{inv.autoUpdate}</p>
                  )}
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const status = stockStatus(r.quantity_available, r.products?.min_quantity ?? 0)
                return (
                  <tr key={`${r.product_id}:${r.location_id}`} className={cn('transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50', status === 'zero' && 'opacity-60')}>
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
                      {r.products?.min_quantity ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', STATUS_BADGE[status])}>
                        {statusLabel[status]}
                      </span>
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
