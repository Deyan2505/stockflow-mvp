'use client'

import { useState, useTransition, useMemo } from 'react'
import { Search } from 'lucide-react'
import { type Order, type Product, type Location, type OrderResult, cancelOrder } from './actions'
import { OrderModal } from './order-modal'
import { OrderDetailModal } from './order-detail-modal'
import { IssueModal } from './issue-modal'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'

type Props = {
  orders: Order[]
  products: Product[]
  locations: Location[]
  canIssue: boolean
}

export function OrdersClient({ orders, products, locations, canIssue }: Props) {
  const { t } = useT()
  const o = t.orders

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [modal, setModal] = useState<Order | null | 'new'>(null)
  const [detailOrder, setDetailOrder] = useState<Order | null>(null)
  const [issueModalOrder, setIssueModalOrder] = useState<Order | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const STATUS_FILTERS = [
    { value: 'all',       label: o.filterAll       },
    { value: 'draft',     label: o.statusDraft     },
    { value: 'open',      label: o.statusOpen      },
    { value: 'fulfilled', label: o.statusFulfilled },
    { value: 'cancelled', label: o.statusCancelled },
  ]

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return orders.filter((item) => {
      const matchSearch =
        !q ||
        item.order_number.toLowerCase().includes(q) ||
        (item.customer_name ?? '').toLowerCase().includes(q)
      const matchStatus = statusFilter === 'all' || item.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [orders, search, statusFilter])

  const handleCancel = (id: string) => {
    startTransition(async () => {
      const result: OrderResult = await cancelOrder(id)
      if (!result.success) { setActionError(result.error); return }
      setSuccessMsg(o.successCancel)
      setTimeout(() => setSuccessMsg(null), 3500)
    })
  }

  const handleModalClose = (msg?: string) => {
    setModal(null)
    if (msg) {
      setSuccessMsg(msg)
      setTimeout(() => setSuccessMsg(null), 3500)
    }
  }

  const statusBadge = (status: Order['status']) => {
    const colorMap: Record<string, string> = {
      draft:     'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
      open:      'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
      fulfilled: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
      cancelled: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
    }
    const labelMap: Record<string, string> = {
      draft:     o.statusDraft,
      open:      o.statusOpen,
      fulfilled: o.statusFulfilled,
      cancelled: o.statusCancelled,
    }
    return (
      <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', colorMap[status] ?? colorMap.draft)}>
        {labelMap[status] ?? status}
      </span>
    )
  }

  const canEdit = (status: Order['status']) => status === 'draft' || status === 'open'

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{o.title}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{o.subtitle}</p>
        </div>
        <button
          onClick={() => setModal('new')}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {o.newBtn}
        </button>
      </div>

      {/* Banners */}
      {successMsg && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900/30 dark:bg-green-900/10 dark:text-green-400">
          {successMsg}
          <button onClick={() => setSuccessMsg(null)} className="ml-3 text-xs underline opacity-70 hover:opacity-100">{o.close}</button>
        </div>
      )}
      {actionError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
          {actionError}
          <button onClick={() => setActionError(null)} className="ml-3 text-xs underline opacity-70 hover:opacity-100">{o.close}</button>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={o.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              {o.cols.map((col) => (
                <th key={col} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={o.cols.length} className="px-4 py-16 text-center">
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    {search || statusFilter !== 'all' ? o.noResults : o.noItems}
                  </p>
                  {!search && statusFilter === 'all' && (
                    <p className="mt-1 text-xs text-gray-300 dark:text-gray-600">{o.addFirst}</p>
                  )}
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr
                  key={item.id}
                  className={cn(
                    'transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50',
                    item.status === 'cancelled' && 'opacity-50'
                  )}
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    {item.order_number}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {item.customer_name?.trim() || o.noCustomer}
                  </td>
                  <td className="px-4 py-3">{statusBadge(item.status)}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {item.order_date ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {item.expected_date ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setDetailOrder(item)}
                        className="text-xs text-gray-500 hover:underline dark:text-gray-400"
                      >
                        {o.detail}
                      </button>
                      {item.status === 'open' && canIssue && (
                        <button
                          onClick={() => setIssueModalOrder(item)}
                          className="text-xs font-medium text-orange-600 hover:underline dark:text-orange-400"
                        >
                          {o.issueStockBtn}
                        </button>
                      )}
                      {canEdit(item.status) && (
                        <button
                          onClick={() => setModal(item)}
                          className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {o.edit}
                        </button>
                      )}
                      {canEdit(item.status) && (
                        <button
                          onClick={() => handleCancel(item.id)}
                          disabled={isPending}
                          className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-50 dark:hover:text-red-400"
                        >
                          {o.cancelOrder}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <OrderModal
          order={modal === 'new' ? null : modal}
          onClose={handleModalClose}
        />
      )}

      {detailOrder !== null && (
        <OrderDetailModal
          order={detailOrder}
          products={products}
          onClose={() => setDetailOrder(null)}
          onEditHeader={() => {
            const ord = detailOrder
            setDetailOrder(null)
            setModal(ord)
          }}
          onIssueStock={canIssue ? () => {
            const ord = detailOrder
            setDetailOrder(null)
            setIssueModalOrder(ord)
          } : undefined}
        />
      )}

      {canIssue && issueModalOrder !== null && (
        <IssueModal
          order={issueModalOrder}
          locations={locations}
          onClose={(msg) => {
            setIssueModalOrder(null)
            if (msg) {
              setSuccessMsg(msg)
              setTimeout(() => setSuccessMsg(null), 3500)
            }
          }}
        />
      )}
    </div>
  )
}
