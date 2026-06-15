'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import {
  type Delivery,
  type ReceiveDeliveryInput,
  receiveDelivery,
} from './actions'
import { useT } from '@/lib/i18n'

type ProductOption = { id: string; name: string; unit: string }
type LocationOption = { id: string; code: string }

type Props = {
  delivery: Delivery
  products: ProductOption[]
  locations: LocationOption[]
  onClose: (successMsg?: string) => void
}

type ReceiveRow = {
  item_id: string
  product_id: string
  product_name: string
  unit: string
  expected_quantity: number
  already_received: number
  remaining: number
  quantity_to_receive: string
  location_id: string
}

function initRows(
  delivery: Delivery,
  products: ProductOption[],
  locations: LocationOption[]
): ReceiveRow[] {
  return delivery.incoming_delivery_items.map((item) => {
    const product = products.find((p) => p.id === item.product_id)
    const location = locations.find((l) => l.id === (item.location_id ?? ''))
    const remaining = Math.max(
      0,
      Number(item.expected_quantity) - Number(item.received_quantity)
    )
    return {
      item_id: item.id,
      product_id: item.product_id,
      product_name: product?.name ?? '—',
      unit: product?.unit ?? 'бр.',
      expected_quantity: Number(item.expected_quantity),
      already_received: Number(item.received_quantity),
      remaining,
      quantity_to_receive: remaining > 0 ? String(remaining) : '0',
      location_id: item.location_id ?? (location?.id ?? ''),
    }
  })
}

export function ReceiveModal({ delivery, products, locations, onClose }: Props) {
  const { t } = useT()
  const d = t.deliveries

  const [rows, setRows] = useState<ReceiveRow[]>(() =>
    initRows(delivery, products, locations)
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const setRowQty = (idx: number, val: string) =>
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, quantity_to_receive: val } : r)))

  const setRowLocation = (idx: number, locationId: string) =>
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, location_id: locationId } : r))
    )

  const validate = (): string | null => {
    const hasAny = rows.some((r) => Number(r.quantity_to_receive) > 0)
    if (!hasAny) return d.errNothingToReceive
    for (const row of rows) {
      const qty = Number(row.quantity_to_receive)
      if (qty < 0 || qty > row.remaining) return d.errExceedsExpected
      if (qty > 0 && !row.location_id) return d.errLocationRequired
    }
    return null
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }
    setError(null)

    const input: ReceiveDeliveryInput = {
      delivery_id: delivery.id,
      delivery_number: delivery.delivery_number,
      items: rows
        .filter((r) => Number(r.quantity_to_receive) > 0)
        .map((r) => ({
          item_id: r.item_id,
          product_id: r.product_id,
          quantity_to_receive: Number(r.quantity_to_receive),
          location_id: r.location_id,
        })),
    }

    startTransition(async () => {
      const result = await receiveDelivery(input)
      if (!result.success) { setError(result.error); return }
      const msg =
        result.newStatus === 'received' ? d.successReceived : d.successPartial
      onClose(msg)
    })
  }

  const allDone = rows.every((r) => r.remaining === 0)

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
            <h2 className="font-semibold text-gray-900 dark:text-white">
              {d.receiveTitle}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              #{delivery.delivery_number}
              {delivery.suppliers?.name ? ` · ${delivery.suppliers.name}` : ''}
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
            {allDone ? (
              <p className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                {d.errAlreadyReceived}
              </p>
            ) : (
              <div className="rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">
                        {d.fProduct}
                      </th>
                      <th className="w-12 px-3 py-2 text-left text-xs font-medium text-gray-400">
                        {d.colUnit}
                      </th>
                      <th className="w-20 px-3 py-2 text-right text-xs font-medium text-gray-400">
                        {d.colExpected}
                      </th>
                      <th className="w-20 px-3 py-2 text-right text-xs font-medium text-gray-400">
                        {d.colAlreadyReceived}
                      </th>
                      <th className="w-28 px-3 py-2 text-left text-xs font-medium text-gray-400">
                        {d.colToReceive}
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">
                        {d.fLocation}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {rows.map((row, idx) => {
                      const isDone = row.remaining === 0
                      return (
                        <tr
                          key={row.item_id}
                          className={isDone ? 'opacity-40' : ''}
                        >
                          <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">
                            {row.product_name}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">
                            {row.unit}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-gray-500 dark:text-gray-400">
                            {row.expected_quantity}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {row.already_received > 0 ? (
                              <span className="font-medium text-green-600 dark:text-green-400">
                                {row.already_received}
                              </span>
                            ) : (
                              <span className="text-gray-400">0</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              max={row.remaining}
                              step="0.01"
                              value={row.quantity_to_receive}
                              onChange={(e) => setRowQty(idx, e.target.value)}
                              disabled={isDone}
                              className={cellCls + ' text-center'}
                            />
                          </td>
                          <td className="px-3 py-2">
                            {isDone ? (
                              <span className="text-xs text-gray-400">—</span>
                            ) : (
                              <select
                                value={row.location_id}
                                onChange={(e) => setRowLocation(idx, e.target.value)}
                                className={cellCls}
                              >
                                <option value="">—</option>
                                {locations.map((l) => (
                                  <option key={l.id} value={l.id}>
                                    {l.code}
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
              {d.cancel}
            </button>
            <button
              type="submit"
              disabled={isPending || allDone}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {isPending ? d.saving : d.receiveConfirm}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
