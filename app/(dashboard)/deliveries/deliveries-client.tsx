'use client'

import { useState, useTransition, useMemo } from 'react'
import { Search } from 'lucide-react'
import { type Delivery, type DeliveryResult, cancelDelivery } from './actions'
import { DeliveryModal } from './delivery-modal'
import { ReceiveModal } from './receive-modal'
import { DeliveryDetailModal, type DeliveryMovement } from './delivery-detail-modal'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'

type Props = {
  deliveries: Delivery[]
  suppliers: { id: string; name: string }[]
  products: { id: string; name: string; unit: string }[]
  locations: { id: string; code: string }[]
  deliveryMovements: DeliveryMovement[]
  canReceive: boolean
}

export function DeliveriesClient({ deliveries, suppliers, products, locations, deliveryMovements, canReceive }: Props) {
  const { t } = useT()
  const d = t.deliveries

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [modal, setModal] = useState<Delivery | null | 'new'>(null)
  const [receiveModal, setReceiveModal] = useState<Delivery | null>(null)
  const [detailModal, setDetailModal] = useState<Delivery | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const STATUS_FILTERS = [
    { value: 'all', label: d.filterAll },
    { value: 'draft', label: d.statusDraft },
    { value: 'expected', label: d.statusExpected },
    { value: 'cancelled', label: d.statusCancelled },
  ]

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return deliveries.filter((item) => {
      const matchSearch =
        !q ||
        item.delivery_number.toLowerCase().includes(q) ||
        (item.suppliers?.name ?? '').toLowerCase().includes(q)
      const matchStatus = statusFilter === 'all' || item.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [deliveries, search, statusFilter])

  const handleCancel = (id: string) => {
    startTransition(async () => {
      const result: DeliveryResult = await cancelDelivery(id)
      if (!result.success) { setActionError(result.error); return }
      setSuccessMsg(d.successCancel)
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

  const handleReceiveClose = (msg?: string) => {
    setReceiveModal(null)
    if (msg) {
      setSuccessMsg(msg)
      setTimeout(() => setSuccessMsg(null), 3500)
    }
  }

  const statusBadge = (status: Delivery['status']) => {
    const colorMap: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
      expected: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
      received: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
      partially_received: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
      cancelled: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
    }
    const labelMap: Record<string, string> = {
      draft: d.statusDraft,
      expected: d.statusExpected,
      received: d.statusReceived,
      partially_received: d.statusPartial,
      cancelled: d.statusCancelled,
    }
    return (
      <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', colorMap[status] ?? colorMap.draft)}>
        {labelMap[status] ?? status}
      </span>
    )
  }

  // Only draft and expected can be edited or cancelled
  const canEdit = (status: Delivery['status']) => status === 'draft' || status === 'expected'

  // draft, expected, and partially_received can still receive more stock
  const isReceivable = (status: Delivery['status']) =>
    status === 'draft' || status === 'expected' || status === 'partially_received'

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{d.title}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{d.subtitle}</p>
        </div>
        <button
          onClick={() => setModal('new')}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {d.newBtn}
        </button>
      </div>

      {/* Banners */}
      {successMsg && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900/30 dark:bg-green-900/10 dark:text-green-400">
          {successMsg}
          <button onClick={() => setSuccessMsg(null)} className="ml-3 text-xs underline opacity-70 hover:opacity-100">{d.close}</button>
        </div>
      )}
      {actionError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
          {actionError}
          <button onClick={() => setActionError(null)} className="ml-3 text-xs underline opacity-70 hover:opacity-100">{d.close}</button>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={d.searchPlaceholder}
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
              {d.cols.map((col) => (
                <th key={col} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={d.cols.length} className="px-4 py-16 text-center">
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    {search || statusFilter !== 'all' ? d.noResults : d.noItems}
                  </p>
                  {!search && statusFilter === 'all' && (
                    <p className="mt-1 text-xs text-gray-300 dark:text-gray-600">{d.addFirst}</p>
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
                    {item.delivery_number}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {item.suppliers?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3">{statusBadge(item.status)}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {item.expected_date ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {d.items(item.incoming_delivery_items?.length ?? 0)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {/* Detail is always available */}
                      <button
                        onClick={() => setDetailModal(item)}
                        className="text-xs text-gray-500 hover:underline dark:text-gray-400"
                      >
                        {d.detailBtn}
                      </button>

                      {/* Receive: draft / expected / partially_received */}
                      {isReceivable(item.status) && canReceive && (
                        <button
                          onClick={() => setReceiveModal(item)}
                          className="text-xs font-medium text-green-600 hover:underline dark:text-green-400"
                        >
                          {d.receiveBtn}
                        </button>
                      )}

                      {/* Edit / Cancel: draft / expected only */}
                      {canEdit(item.status) && (
                        <button
                          onClick={() => setModal(item)}
                          className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {d.edit}
                        </button>
                      )}
                      {canEdit(item.status) && (
                        <button
                          onClick={() => handleCancel(item.id)}
                          disabled={isPending}
                          className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-50 dark:hover:text-red-400"
                        >
                          {d.cancelDelivery}
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

      {/* Edit / create modal */}
      {modal !== null && (
        <DeliveryModal
          delivery={modal === 'new' ? null : modal}
          suppliers={suppliers}
          products={products}
          locations={locations}
          onClose={handleModalClose}
        />
      )}

      {/* Receive modal */}
      {canReceive && receiveModal !== null && (
        <ReceiveModal
          delivery={receiveModal}
          products={products}
          locations={locations}
          onClose={handleReceiveClose}
        />
      )}

      {/* Detail modal */}
      {detailModal !== null && (
        <DeliveryDetailModal
          delivery={detailModal}
          movements={deliveryMovements}
          products={products}
          locations={locations}
          onClose={() => setDetailModal(null)}
        />
      )}
    </div>
  )
}
