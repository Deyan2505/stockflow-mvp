'use client'

import { useState, useMemo } from 'react'
import { Search, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import { exportToCSV, csvDate, todayStr } from '@/lib/export-csv'

export type DeliveryReport = {
  id: string
  delivery_number: string
  status: string
  expected_date: string | null
  received_date: string | null
  supplier_name: string
  supplier_id: string
  item_count: number
  total_expected: number
  total_received: number
  remaining: number
}

type Supplier = { id: string; name: string }

type Props = {
  deliveries: DeliveryReport[]
  suppliers: Supplier[]
}

type Filters = {
  search: string
  supplierId: string
  status: string
  dateFrom: string
  dateTo: string
}

function emptyFilters(): Filters {
  return { search: '', supplierId: '', status: '', dateFrom: '', dateTo: '' }
}

function hasActiveFilters(f: Filters) {
  return !!(f.search || f.supplierId || f.status || f.dateFrom || f.dateTo)
}

const STATUS_COLORS: Record<string, string> = {
  draft:              'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  expected:           'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  partially_received: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  received:           'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  cancelled:          'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('bg-BG', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function DeliveryReportsClient({ deliveries, suppliers }: Props) {
  const { t } = useT()
  const r = t.reports

  const [filters, setFilters] = useState<Filters>(emptyFilters())
  const setFilter = <K extends keyof Filters>(k: K, v: Filters[K]) =>
    setFilters((f) => ({ ...f, [k]: v }))

  // ── Summary cards (always from all deliveries) ─────────────────────────────

  const summary = useMemo(() => {
    const uniqueSuppliers = new Set<string>()
    let totalItems = 0
    let expected = 0, partial = 0, received = 0, cancelled = 0

    for (const d of deliveries) {
      uniqueSuppliers.add(d.supplier_id)
      totalItems += d.total_received
      if (d.status === 'expected') expected++
      else if (d.status === 'partially_received') partial++
      else if (d.status === 'received') received++
      else if (d.status === 'cancelled') cancelled++
    }
    return {
      total: deliveries.length,
      expected,
      partial,
      received,
      cancelled,
      totalItems,
      supplierCount: uniqueSuppliers.size,
    }
  }, [deliveries])

  // ── Filtered deliveries ────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase()
    return deliveries.filter((d) => {
      if (q) {
        const matchNum = d.delivery_number.toLowerCase().includes(q)
        const matchSup = d.supplier_name.toLowerCase().includes(q)
        if (!matchNum && !matchSup) return false
      }
      if (filters.supplierId && d.supplier_id !== filters.supplierId) return false
      if (filters.status && d.status !== filters.status) return false
      if (filters.dateFrom && d.expected_date && d.expected_date.substring(0, 10) < filters.dateFrom) return false
      if (filters.dateTo && d.expected_date && d.expected_date.substring(0, 10) > filters.dateTo) return false
      return true
    })
  }, [deliveries, filters])

  // ── Supplier mini report ───────────────────────────────────────────────────

  const supplierStats = useMemo(() => {
    const map = new Map<string, { name: string; count: number; received: number; lastDate: string | null }>()
    for (const d of deliveries) {
      const existing = map.get(d.supplier_id)
      const date = d.received_date ?? d.expected_date ?? null
      if (existing) {
        existing.count++
        existing.received += d.total_received
        if (date && (!existing.lastDate || date > existing.lastDate)) existing.lastDate = date
      } else {
        map.set(d.supplier_id, { name: d.supplier_name, count: 1, received: d.total_received, lastDate: date })
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count)
  }, [deliveries])

  const active = hasActiveFilters(filters)

  const handleExport = () => {
    const statusMap: Record<string, string> = {
      draft: r.delStatusDraft,
      expected: r.delStatusExpected,
      partially_received: r.delStatusPartial,
      received: r.delStatusReceived,
      cancelled: r.delStatusCancelled,
    }
    const headers = [
      'Номер на доставка', 'Доставчик', 'Статус',
      'Очаквана дата', 'Дата на получаване', 'Брой продукти',
      'Общо очаквано количество', 'Общо получено количество', 'Оставащо количество',
    ]
    const rows = filtered.map((d) => [
      d.delivery_number,
      d.supplier_name,
      statusMap[d.status] ?? d.status,
      csvDate(d.expected_date),
      csvDate(d.received_date),
      d.item_count,
      d.total_expected,
      d.total_received,
      d.remaining,
    ])
    exportToCSV(`stockflow_deliveries_${todayStr()}.csv`, headers, rows)
  }

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      draft: r.delStatusDraft,
      expected: r.delStatusExpected,
      partially_received: r.delStatusPartial,
      received: r.delStatusReceived,
      cancelled: r.delStatusCancelled,
    }
    return map[s] ?? s
  }

  const filterSelectClass =
    'rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white'

  const SummaryCard = ({ label, value, highlight }: { label: string; value: number; highlight?: string }) => (
    <div className={cn(
      'rounded-xl border p-4',
      highlight
        ? 'border-amber-100 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-900/10'
        : 'border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900'
    )}>
      <p className={cn('text-xs font-medium', highlight ? 'text-amber-700 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400')}>
        {label}
      </p>
      <p className={cn('mt-1 text-2xl font-bold tabular-nums', highlight ? 'text-amber-700 dark:text-amber-400' : 'text-gray-900 dark:text-white')}>
        {value}
      </p>
    </div>
  )

  return (
    <div>
      {/* Section header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{r.deliveriesTitle}</h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {r.deliveriesSub(deliveries.length)}
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={filtered.length === 0}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <Download className="h-3.5 w-3.5" />
          {r.exportCsv}
        </button>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <SummaryCard label={r.cardTotal} value={summary.total} />
        <SummaryCard label={r.cardExpected} value={summary.expected} highlight={summary.expected > 0 ? 'amber' : undefined} />
        <SummaryCard label={r.cardPartial} value={summary.partial} highlight={summary.partial > 0 ? 'amber' : undefined} />
        <SummaryCard label={r.cardReceived} value={summary.received} />
        <SummaryCard label={r.cardCancelled} value={summary.cancelled} />
        <SummaryCard label={r.cardTotalItems} value={summary.totalItems} />
        <SummaryCard label={r.cardSupplierCount} value={summary.supplierCount} />
      </div>

      {/* Deliveries table */}
      <div className="rounded-xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
        {/* Filter bar */}
        <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div className="mb-3 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={r.delSearch}
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
            <select value={filters.supplierId} onChange={(e) => setFilter('supplierId', e.target.value)} className={filterSelectClass}>
              <option value="">{r.delFilterSupplier}</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className={filterSelectClass}>
              <option value="">{r.delFilterStatus}</option>
              <option value="draft">{r.delStatusDraft}</option>
              <option value="expected">{r.delStatusExpected}</option>
              <option value="partially_received">{r.delStatusPartial}</option>
              <option value="received">{r.delStatusReceived}</option>
              <option value="cancelled">{r.delStatusCancelled}</option>
            </select>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-gray-400 dark:text-gray-500">{r.delFilterDateFrom}</span>
              <input type="date" value={filters.dateFrom} onChange={(e) => setFilter('dateFrom', e.target.value)} className={filterSelectClass} />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-gray-400 dark:text-gray-500">{r.delFilterDateTo}</span>
              <input type="date" value={filters.dateTo} onChange={(e) => setFilter('dateTo', e.target.value)} className={filterSelectClass} />
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
            {active && filtered.length !== deliveries.length
              ? `${r.deliveriesSub(filtered.length)} / ${r.deliveriesSub(deliveries.length)}`
              : r.deliveriesSub(deliveries.length)
            }
          </p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {deliveries.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <p className="text-sm text-gray-400 dark:text-gray-500">{r.noDeliveries}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-gray-400 dark:text-gray-500">{r.noFilteredDeliveries}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  {[r.delColNum, r.delColSupplier, r.delColStatus, r.delColExpDate, r.delColRecDate,
                    r.delColItems, r.delColTotalExp, r.delColTotalRec, r.delColRemaining].map((col) => (
                    <th key={col} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {filtered.map((d) => {
                  const isPartial = d.status === 'partially_received'
                  const isCancelled = d.status === 'cancelled'
                  return (
                    <tr
                      key={d.id}
                      className={cn(
                        'transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50',
                        isCancelled && 'opacity-50'
                      )}
                    >
                      <td className="px-4 py-3 font-mono text-sm font-medium text-gray-900 dark:text-white">
                        {d.delivery_number}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{d.supplier_name}</td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', STATUS_COLORS[d.status] ?? STATUS_COLORS.draft)}>
                          {statusLabel(d.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(d.expected_date)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(d.received_date)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                        {d.item_count}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-gray-700 dark:text-gray-300">
                        {d.total_expected}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm font-medium text-green-700 dark:text-green-400">
                        {d.total_received}
                      </td>
                      <td className="px-4 py-3">
                        {d.remaining > 0 ? (
                          <span className={cn(
                            'font-mono text-sm font-semibold',
                            isPartial ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'
                          )}>
                            -{d.remaining}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Supplier activity mini report */}
      {supplierStats.length > 0 && (
        <div className="mt-6 rounded-xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{r.supplierReportTitle}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  {[r.delColSupplier, r.supColDeliveries, r.supColReceived, r.supColLastDel].map((col) => (
                    <th key={col} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {supplierStats.map((s, i) => (
                  <tr key={i} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.name}</td>
                    <td className="px-4 py-3 font-mono text-sm text-gray-700 dark:text-gray-300">{s.count}</td>
                    <td className="px-4 py-3 font-mono text-sm text-gray-700 dark:text-gray-300">{s.received}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{formatDate(s.lastDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
