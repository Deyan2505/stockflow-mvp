'use client'

import { useState, useTransition, useEffect } from 'react'
import { X } from 'lucide-react'
import { type Order, type OrderItem, type Location, getOrderItems, issueOrder } from './actions'
import { useT } from '@/lib/i18n'

type IssueRow = {
  item_id: string
  product_id: string
  product_name: string
  unit: string
  ordered: number
  already_issued: number
  remaining: number
  from_location_id: string
}

type Props = {
  order: Order
  locations: Location[]
  onClose: (successMsg?: string) => void
}

function initRows(items: OrderItem[]): IssueRow[] {
  return items.map((item) => {
    const remaining = Math.max(0, item.ordered_quantity - item.issued_quantity)
    return {
      item_id:          item.id,
      product_id:       item.product_id,
      product_name:     item.products?.name ?? '—',
      unit:             item.products?.unit ?? 'бр.',
      ordered:          item.ordered_quantity,
      already_issued:   item.issued_quantity,
      remaining,
      from_location_id: item.location_id ?? '',
    }
  })
}

export function IssueModal({ order, locations, onClose }: Props) {
  const { t } = useT()
  const o = t.orders

  const [rows, setRows]       = useState<IssueRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    let active = true
    getOrderItems(order.id).then((fresh) => {
      if (active) { setRows(initRows(fresh)); setLoading(false) }
    })
    return () => { active = false }
  }, [order.id])

  const setRowLocation = (idx: number, locationId: string) =>
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, from_location_id: locationId } : r)))

  const validate = (): string | null => {
    for (const row of rows) {
      if (row.remaining > 0 && !row.from_location_id) return o.issueErrLocationRequired
    }
    return null
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }
    setError(null)

    startTransition(async () => {
      const result = await issueOrder({
        order_id: order.id,
        items: rows
          .filter((r) => r.remaining > 0)
          .map((r) => ({
            item_id:          r.item_id,
            product_id:       r.product_id,
            from_location_id: r.from_location_id,
          })),
      })
      if (!result.success) { setError(result.error); return }
      onClose(o.issueSuccessFulfilled)
    })
  }

  const noItems = !loading && rows.length === 0
  const allDone = rows.length > 0 && rows.every((r) => r.remaining === 0)

  const cellCls =
    'w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-xl dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">{o.issueTitle} #{order.order_number}</h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {o.issueToCustomerLabel} <span className="font-semibold text-gray-700 dark:text-gray-300">{order.customer_name?.trim() || o.noCustomer}</span>
            </p>
          </div>
          <button
            onClick={() => onClose()}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <p className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">{o.loading}</p>
            ) : noItems ? (
              <p className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">{o.issueNoItems}</p>
            ) : allDone ? (
              <p className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">{o.issueAllDone}</p>
            ) : (
              <div>
                <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                  {o.issueLocationHelper}
                </p>
                <div className="rounded-lg border border-gray-200 dark:border-gray-700">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">
                          {o.itemColProduct}
                        </th>
                        <th className="w-12 px-3 py-2 text-left text-xs font-medium text-gray-400">
                          {o.issueColUnit}
                        </th>
                        <th className="w-20 px-3 py-2 text-right text-xs font-medium text-gray-400">
                          {o.issueColOrdered}
                        </th>
                        <th className="w-20 px-3 py-2 text-right text-xs font-medium text-gray-400">
                          {o.issueColIssued}
                        </th>
                        <th className="w-24 px-3 py-2 text-right text-xs font-medium text-gray-400">
                          {o.issueColToIssue}
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">
                          {o.issueColFromLoc}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {rows.map((row, idx) => {
                        const isDone = row.remaining === 0
                        return (
                          <tr key={row.item_id} className={isDone ? 'opacity-40' : ''}>
                            <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">
                              {row.product_name}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">
                              {row.unit}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-gray-500 dark:text-gray-400">
                              {row.ordered}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {row.already_issued > 0 ? (
                                <span className="font-medium text-amber-600 dark:text-amber-400">
                                  {row.already_issued}
                                </span>
                              ) : (
                                <span className="text-gray-400">0</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {isDone ? (
                                <span className="text-gray-400">—</span>
                              ) : (
                                <span className="font-semibold text-orange-600 dark:text-orange-400">
                                  {row.remaining}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {isDone ? (
                                <span className="text-xs text-gray-400">—</span>
                              ) : (
                                <select
                                  value={row.from_location_id}
                                  onChange={(e) => setRowLocation(idx, e.target.value)}
                                  className={cellCls}
                                >
                                  <option value="">—</option>
                                  {locations.map((l) => (
                                    <option key={l.id} value={l.id}>
                                      {l.warehouses?.name ? `${l.warehouses.name} / ${l.code}` : l.code}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {error && (
            <p className="border-t border-gray-100 px-6 py-2 text-xs text-red-500 dark:border-gray-800">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
            <button
              type="button"
              onClick={() => onClose()}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              {o.cancel}
            </button>
            <button
              type="submit"
              disabled={isPending || loading || noItems || allDone}
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
            >
              {isPending ? o.saving : o.issueConfirm}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
