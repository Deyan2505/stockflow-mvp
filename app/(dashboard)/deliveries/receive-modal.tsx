'use client'

import { useState, useTransition, useMemo } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import {
  type Delivery,
  type ReceiveDeliveryInput,
  receiveDelivery,
} from './actions'
import { useT } from '@/lib/i18n'

type ProductOption = { id: string; name: string; unit: string }
type LocationOption = { id: string; code: string }
type OccupancyRow = { location_id: string; product_id: string }

type LocStatus = 'empty' | 'same' | 'other'

type Props = {
  delivery: Delivery
  products: ProductOption[]
  locations: LocationOption[]
  occupancy: OccupancyRow[]
  onClose: (successMsg?: string) => void
}

type Placement = {
  location_id: string
  quantity: string
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
  placements: Placement[]
}

function initRows(
  delivery: Delivery,
  products: ProductOption[],
  locations: LocationOption[]
): ReceiveRow[] {
  return delivery.incoming_delivery_items.map((item) => {
    const product = products.find((p) => p.id === item.product_id)
    const seededLocation = locations.find((l) => l.id === (item.location_id ?? ''))
    const remaining = Math.max(
      0,
      Number(item.expected_quantity) - Number(item.received_quantity)
    )
    const qtyToReceive = remaining > 0 ? String(remaining) : '0'
    return {
      item_id: item.id,
      product_id: item.product_id,
      product_name: product?.name ?? '—',
      unit: product?.unit ?? 'бр.',
      expected_quantity: Number(item.expected_quantity),
      already_received: Number(item.received_quantity),
      remaining,
      quantity_to_receive: qtyToReceive,
      // Seed a single placement from the item's existing location (backward compat).
      // Its quantity mirrors the full remaining so single-location receiving is a
      // one-click confirm; the user can split further from here.
      placements: [
        {
          location_id: seededLocation?.id ?? (item.location_id ?? ''),
          quantity: remaining > 0 ? String(remaining) : '',
        },
      ],
    }
  })
}

function assignedOf(row: ReceiveRow): number {
  return row.placements.reduce((sum, p) => {
    const n = Number(p.quantity)
    return sum + (Number.isFinite(n) ? n : 0)
  }, 0)
}

export function ReceiveModal({ delivery, products, locations, occupancy, onClose }: Props) {
  const { t } = useT()
  const d = t.deliveries

  const [rows, setRows] = useState<ReceiveRow[]>(() =>
    initRows(delivery, products, locations)
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // location_id → set of product_ids currently holding stock there (quantity > 0)
  const occByLocation = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const o of occupancy) {
      let s = map.get(o.location_id)
      if (!s) { s = new Set<string>(); map.set(o.location_id, s) }
      s.add(o.product_id)
    }
    return map
  }, [occupancy])

  // Occupancy of a location relative to the product being received:
  // 'other' = holds a different product (no-mixed-products → blocked),
  // 'same'  = already holds this product, 'empty' = holds nothing.
  const locStatus = (locationId: string, productId: string): LocStatus => {
    const occupants = occByLocation.get(locationId)
    if (!occupants || occupants.size === 0) return 'empty'
    if (occupants.size === 1 && occupants.has(productId)) return 'same'
    return 'other'
  }

  const locLabel = (l: LocationOption, productId: string): string => {
    const status = locStatus(l.id, productId)
    const suffix =
      status === 'other' ? d.locOtherProduct
      : status === 'same' ? d.locSameProduct
      : d.locEmpty
    return `${l.code} — ${suffix}`
  }

  const updateRow = (idx: number, patch: (r: ReceiveRow) => ReceiveRow) =>
    setRows((prev) => prev.map((r, i) => (i === idx ? patch(r) : r)))

  const setRowQty = (idx: number, val: string) =>
    updateRow(idx, (r) => {
      // If the item has a single placement, keep it in sync for frictionless
      // single-location receiving. With multiple placements the user manages them.
      if (r.placements.length === 1) {
        return {
          ...r,
          quantity_to_receive: val,
          placements: [{ ...r.placements[0], quantity: val }],
        }
      }
      return { ...r, quantity_to_receive: val }
    })

  const setPlacementLocation = (idx: number, pIdx: number, locationId: string) =>
    updateRow(idx, (r) => ({
      ...r,
      placements: r.placements.map((p, i) =>
        i === pIdx ? { ...p, location_id: locationId } : p
      ),
    }))

  const setPlacementQty = (idx: number, pIdx: number, val: string) =>
    updateRow(idx, (r) => ({
      ...r,
      placements: r.placements.map((p, i) =>
        i === pIdx ? { ...p, quantity: val } : p
      ),
    }))

  const addPlacement = (idx: number) =>
    updateRow(idx, (r) => ({
      ...r,
      placements: [...r.placements, { location_id: '', quantity: '' }],
    }))

  const removePlacement = (idx: number, pIdx: number) =>
    updateRow(idx, (r) => {
      // Always keep at least one placement row while this item is being received
      if (r.placements.length <= 1) return r
      return { ...r, placements: r.placements.filter((_, i) => i !== pIdx) }
    })

  const validate = (): string | null => {
    const activeRows = rows.filter((r) => Number(r.quantity_to_receive) > 0)
    if (activeRows.length === 0) return d.errNothingToReceive

    for (const row of activeRows) {
      const qty = Number(row.quantity_to_receive)
      if (qty < 0 || qty > row.remaining) return d.errExceedsExpected

      for (const p of row.placements) {
        if (!p.location_id) return d.errPlacementLocationRequired
        const pQty = Number(p.quantity)
        if (!pQty || pQty <= 0) return d.errPlacementQty
        if (locStatus(p.location_id, row.product_id) === 'other') return d.errMixedProduct
      }

      if (Math.abs(assignedOf(row) - qty) > 1e-6) return d.errPlacementMismatch
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
          placements: r.placements.map((p) => ({
            location_id: p.location_id,
            quantity: Number(p.quantity),
          })),
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
              <>
                <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
                  {d.putawayHelper}
                </p>
                <div className="space-y-4">
                  {rows.map((row, idx) => {
                    const isDone = row.remaining === 0
                    if (isDone) {
                      return (
                        <div
                          key={row.item_id}
                          className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 opacity-50 dark:border-gray-800"
                        >
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {row.product_name}
                          </span>
                          <span className="text-xs text-gray-400">
                            {d.colAlreadyReceived}: {row.already_received} {row.unit}
                          </span>
                        </div>
                      )
                    }

                    const assigned = assignedOf(row)
                    const target = Number(row.quantity_to_receive) || 0
                    const balanced = Math.abs(assigned - target) < 1e-6 && target > 0

                    return (
                      <div
                        key={row.item_id}
                        className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                      >
                        {/* Item header */}
                        <div className="mb-3 flex items-start justify-between gap-4">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {row.product_name}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                              {d.colExpected}: {row.remaining} {row.unit}
                              {row.already_received > 0 && (
                                <>
                                  {' · '}
                                  {d.colAlreadyReceived}: {row.already_received}
                                </>
                              )}
                            </p>
                          </div>
                          <div className="shrink-0">
                            <label className="mb-1 block text-right text-xs font-medium text-gray-400">
                              {d.putawayColQty}
                            </label>
                            <input
                              type="number"
                              min="0"
                              max={row.remaining}
                              step="1"
                              value={row.quantity_to_receive}
                              onChange={(e) => setRowQty(idx, e.target.value)}
                              className={cellCls + ' w-28 text-center'}
                            />
                          </div>
                        </div>

                        {/* Placements */}
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                          {d.putawayPlacementsTitle}
                        </p>
                        <div className="space-y-2">
                          {row.placements.map((p, pIdx) => (
                            <div key={pIdx} className="flex items-center gap-2">
                              <select
                                value={p.location_id}
                                onChange={(e) =>
                                  setPlacementLocation(idx, pIdx, e.target.value)
                                }
                                className={cellCls + ' flex-1'}
                              >
                                <option value="">{d.selectLocation}</option>
                                {locations.map((l) => {
                                  const occupied =
                                    locStatus(l.id, row.product_id) === 'other'
                                  return (
                                    <option
                                      key={l.id}
                                      value={l.id}
                                      disabled={occupied}
                                    >
                                      {locLabel(l, row.product_id)}
                                    </option>
                                  )
                                })}
                              </select>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={p.quantity}
                                onChange={(e) =>
                                  setPlacementQty(idx, pIdx, e.target.value)
                                }
                                placeholder="0"
                                className={cellCls + ' w-24 text-center'}
                              />
                              <button
                                type="button"
                                onClick={() => removePlacement(idx, pIdx)}
                                disabled={row.placements.length <= 1}
                                title={d.removeLocation}
                                aria-label={d.removeLocation}
                                className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-gray-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Add location + counter */}
                        <div className="mt-3 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => addPlacement(idx)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            {d.addLocation}
                          </button>
                          <span
                            className={
                              'text-xs font-medium tabular-nums ' +
                              (balanced
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-amber-600 dark:text-amber-400')
                            }
                          >
                            {d.assigned}: {assigned} / {target} {row.unit}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
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
