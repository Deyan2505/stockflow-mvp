'use client'

import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import type { Delivery } from './actions'

export type DeliveryMovement = {
  id: string
  product_id: string
  movement_type: string
  quantity: number
  to_location_id: string | null
  from_location_id: string | null
  note: string | null
  created_at: string
  reference_id: string | null
}

type ProductOption = { id: string; name: string; unit: string }
type LocationOption = { id: string; code: string }

type Props = {
  delivery: Delivery
  movements: DeliveryMovement[]
  products: ProductOption[]
  locations: LocationOption[]
  onClose: () => void
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  expected: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  received: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  partially_received: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  cancelled: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('bg-BG', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function DeliveryDetailModal({ delivery, movements, products, locations, onClose }: Props) {
  const { t } = useT()
  const d = t.deliveries

  const productMap = new Map(products.map((p) => [p.id, p]))
  const locationMap = new Map(locations.map((l) => [l.id, l.code]))

  const relatedMovements = movements.filter((m) => m.reference_id === delivery.id)

  const statusLabel: Record<string, string> = {
    draft: d.statusDraft,
    expected: d.statusExpected,
    received: d.statusReceived,
    partially_received: d.statusPartial,
    cancelled: d.statusCancelled,
  }

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
              {d.detailTitle} #{delivery.delivery_number}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {delivery.suppliers?.name ?? '—'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {/* Meta fields */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500">{d.detailFieldStatus}</p>
              <span
                className={cn(
                  'mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                  STATUS_BADGE[delivery.status] ?? STATUS_BADGE.draft
                )}
              >
                {statusLabel[delivery.status] ?? delivery.status}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500">{d.detailFieldExpected}</p>
              <p className="mt-1 font-medium text-gray-900 dark:text-white">
                {delivery.expected_date ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500">{d.detailFieldReceived}</p>
              <p className="mt-1 font-medium text-gray-900 dark:text-white">
                {delivery.received_date ?? '—'}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-4">
              <p className="text-xs text-gray-400 dark:text-gray-500">{d.detailFieldNote}</p>
              <p className="mt-1 text-gray-700 dark:text-gray-300">{delivery.note || '—'}</p>
            </div>
          </div>

          {/* Items table */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              {d.detailItemsTitle}
            </h3>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">
                      {d.detailColProduct}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">
                      {d.colUnit}
                    </th>
                    <th className="w-20 px-3 py-2 text-right text-xs font-medium text-gray-400">
                      {d.colExpected}
                    </th>
                    <th className="w-20 px-3 py-2 text-right text-xs font-medium text-gray-400">
                      {d.colAlreadyReceived}
                    </th>
                    <th className="w-20 px-3 py-2 text-right text-xs font-medium text-gray-400">
                      {d.detailColRemaining}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">
                      {d.fLocation}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {delivery.incoming_delivery_items.map((item) => {
                    const product = productMap.get(item.product_id)
                    const remaining = Math.max(
                      0,
                      Number(item.expected_quantity) - Number(item.received_quantity)
                    )
                    const fullyReceived = remaining === 0 && Number(item.received_quantity) > 0
                    return (
                      <tr key={item.id} className={cn(fullyReceived && 'opacity-60')}>
                        <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">
                          {product?.name ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">
                          {product?.unit ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-500 dark:text-gray-400">
                          {Number(item.expected_quantity)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {Number(item.received_quantity) > 0 ? (
                            <span className="font-medium text-green-600 dark:text-green-400">
                              {Number(item.received_quantity)}
                            </span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {remaining > 0 ? (
                            <span className="font-medium text-amber-600 dark:text-amber-400">
                              {remaining}
                            </span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-gray-500 dark:text-gray-400">
                          {item.location_id ? (locationMap.get(item.location_id) ?? '—') : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Related movements */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              {d.detailMovementsTitle}
            </h3>
            {relatedMovements.length === 0 ? (
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-8 text-center dark:border-gray-800 dark:bg-gray-800/50">
                <p className="text-sm text-gray-400 dark:text-gray-500">{d.detailNoMovements}</p>
                <p className="mt-1 text-xs text-gray-300 dark:text-gray-600">
                  {d.detailNoMovementsSub}
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">
                        {d.detailColDate}
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">
                        {d.detailColProduct}
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">
                        {d.detailColType}
                      </th>
                      <th className="w-16 px-3 py-2 text-right text-xs font-medium text-gray-400">
                        {d.detailColQty}
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">
                        {d.fLocation}
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">
                        {d.detailColMovNote}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {relatedMovements.map((mov) => {
                      const product = productMap.get(mov.product_id)
                      const locationCode = mov.to_location_id
                        ? locationMap.get(mov.to_location_id)
                        : null
                      return (
                        <tr key={mov.id}>
                          <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(mov.created_at)}
                          </td>
                          <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">
                            {product?.name ?? '—'}
                          </td>
                          <td className="px-3 py-2">
                            <span className="inline-flex rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
                              ВХОД
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums font-semibold text-gray-900 dark:text-white">
                            {Number(mov.quantity)}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-gray-500 dark:text-gray-400">
                            {locationCode ?? '—'}
                          </td>
                          <td className="max-w-[160px] truncate px-3 py-2 text-xs text-gray-400 dark:text-gray-500">
                            {mov.note ?? '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-gray-100 px-6 py-4 dark:border-gray-800">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            {d.close}
          </button>
        </div>
      </div>
    </div>
  )
}
