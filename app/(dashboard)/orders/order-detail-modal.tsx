'use client'

import { useState, useTransition, useEffect } from 'react'
import { X } from 'lucide-react'
import {
  type Order,
  type Product,
  type OrderItem,
  type OrderItemResult,
  getOrderItems,
  addOrderItem,
  updateOrderItem,
  removeOrderItem,
  findProductForOrder,
} from './actions'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

// v0.6 Step 2: order items CRUD
// No fulfillment, no stock movements, no inventory balance changes.

type Props = {
  order: Order
  products: Product[]
  onClose: () => void
  onEditHeader: () => void
  onIssueStock?: () => void
}

const statusColor: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  open:      'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  fulfilled: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  cancelled: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
}

export function OrderDetailModal({ order, products, onClose, onEditHeader, onIssueStock }: Props) {
  const { t } = useT()
  const o = t.orders

  const [items, setItems]     = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState<string | null>(null)

  // Add item form
  const [addProductId, setAddProductId] = useState('')
  const [addQty, setAddQty]             = useState('')
  const [addError, setAddError]         = useState<string | null>(null)
  const [isAdding, startAdd]            = useTransition()

  // Inline edit
  const [editItemId, setEditItemId] = useState<string | null>(null)
  const [editQty, setEditQty]       = useState('')
  const [editError, setEditError]   = useState<string | null>(null)
  const [isSaving, startSave]       = useTransition()

  // Remove
  const [isRemoving, startRemove] = useTransition()

  // Barcode
  const [barcodeVal, setBarcodeVal]   = useState('')
  const [barcodeMsg, setBarcodeMsg]   = useState<{ type: 'found' | 'notFound'; text: string } | null>(null)
  const [isBarcodeSearching, startBarcodeSearch] = useTransition()

  const canEdit = order.status === 'draft' || order.status === 'open'

  const refresh = async () => {
    const fresh = await getOrderItems(order.id)
    setItems(fresh)
    setLoading(false)
  }

  useEffect(() => {
    let active = true
    getOrderItems(order.id).then((fresh) => { if (active) { setItems(fresh); setLoading(false) } })
    return () => { active = false }
  }, [order.id])

  // ── Add item ────────────────────────────────────────────────────────────────

  const handleAdd = () => {
    if (!addProductId) { setAddError(o.itemErrNoProduct); return }
    const qty = parseFloat(addQty)
    if (!addQty || isNaN(qty) || qty <= 0) { setAddError(o.itemErrQty); return }
    if (items.some((i) => i.product_id === addProductId)) { setAddError(o.itemErrDuplicate); return }
    setAddError(null)
    startAdd(async () => {
      const result: OrderItemResult = await addOrderItem(order.id, addProductId, qty)
      if (!result.success) { setAddError(result.error); return }
      setAddProductId('')
      setAddQty('')
      await refresh()
    })
  }

  // ── Edit item ────────────────────────────────────────────────────────────────

  const startEdit = (item: OrderItem) => {
    setEditItemId(item.id)
    setEditQty(String(item.ordered_quantity))
    setEditError(null)
  }

  const handleSave = (itemId: string) => {
    const qty = parseFloat(editQty)
    if (!editQty || isNaN(qty) || qty <= 0) { setEditError(o.itemErrQty); return }
    setEditError(null)
    startSave(async () => {
      const result: OrderItemResult = await updateOrderItem(itemId, qty)
      if (!result.success) { setEditError(result.error); return }
      setEditItemId(null)
      await refresh()
    })
  }

  // ── Remove item ──────────────────────────────────────────────────────────────

  const handleRemove = (itemId: string) => {
    setActionError(null)
    startRemove(async () => {
      const result: OrderItemResult = await removeOrderItem(itemId)
      if (!result.success) { setActionError(result.error); return }
      await refresh()
    })
  }

  // ── Barcode handlers ─────────────────────────────────────────────────────────

  const handleBarcodeSearch = () => {
    const trimmed = barcodeVal.trim()
    if (!trimmed) return
    setBarcodeMsg(null)
    startBarcodeSearch(async () => {
      const result = await findProductForOrder(trimmed)
      if (!result) {
        setBarcodeMsg({ type: 'notFound', text: o.itemBarcodeNotFound })
        return
      }
      if (items.some((i) => i.product_id === result.id)) {
        setBarcodeMsg({ type: 'notFound', text: o.itemErrDuplicate })
        return
      }
      setAddProductId(result.id)
      setAddError(null)
      setBarcodeMsg({ type: 'found', text: o.itemBarcodeFound(result.name) })
    })
  }

  const clearBarcode = () => {
    setBarcodeVal('')
    setBarcodeMsg(null)
  }

  // ── Shared styles ────────────────────────────────────────────────────────────

  const inputCls =
    'rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl dark:bg-gray-900">

        {/* ── Modal header ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">{order.order_number}</h2>
            <p className="mt-0.5 text-xs text-gray-400">{order.customer_name ?? o.noCustomer}</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                statusColor[order.status] ?? statusColor.draft,
              )}
            >
              {{ draft: o.statusDraft, open: o.statusOpen, cancelled: o.statusCancelled, fulfilled: o.statusFulfilled }[order.status] ?? order.status}
            </span>
            {order.status === 'open' && onIssueStock && (
              <button
                onClick={onIssueStock}
                disabled={!loading && items.length === 0}
                title={!loading && items.length === 0 ? o.issueNoItems : undefined}
                className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {o.issueStockBtn}
              </button>
            )}
            {canEdit && (
              <button
                onClick={onEditHeader}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                {o.editHeader}
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Order header summary (read-only) ──────────────────────────────── */}
        <div className="flex flex-wrap gap-x-6 gap-y-1 border-b border-gray-100 px-6 py-3 text-xs dark:border-gray-800">
          <span>
            <span className="text-gray-400">{o.fOrderDate}:</span>{' '}
            <span className="text-gray-700 dark:text-gray-300">{order.order_date ?? '—'}</span>
          </span>
          <span>
            <span className="text-gray-400">{o.fExpectedDate}:</span>{' '}
            <span className="text-gray-700 dark:text-gray-300">{order.expected_date ?? '—'}</span>
          </span>
          {order.issued_date && (
            <span>
              <span className="text-gray-400">{o.fIssuedDate}:</span>{' '}
              <span className="text-gray-700 dark:text-gray-300">{order.issued_date}</span>
            </span>
          )}
          {order.note && (
            <span className="w-full">
              <span className="text-gray-400">{o.fNote}:</span>{' '}
              <span className="text-gray-700 dark:text-gray-300">{order.note}</span>
            </span>
          )}
        </div>

        {/* ── Items section ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
            {o.itemsTitle}
          </h3>

          {/* Status notices */}
          {order.status === 'cancelled' && (
            <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-xs text-red-600 dark:bg-red-900/10 dark:text-red-400">
              {o.itemsCancelledNote}
            </p>
          )}

          {/* Action-level error */}
          {actionError && (
            <p className="mb-3 text-xs text-red-500">{actionError}</p>
          )}

          {/* Items table */}
          {loading ? (
            <p className="py-10 text-center text-sm text-gray-400">{o.loading}</p>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">{o.itemsEmpty}</p>
          ) : (
            <div className="mb-5 overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                      {o.itemColProduct}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                      {o.itemColQty}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                      {o.itemColIssued}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                      {o.itemColUnit}
                    </th>
                    {canEdit && <th className="px-4 py-2" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-2 text-gray-900 dark:text-white">
                        {item.products?.name ?? '—'}
                      </td>
                      <td className="px-4 py-2">
                        {editItemId === item.id ? (
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={editQty}
                            onChange={(e) => setEditQty(e.target.value)}
                            className="w-24 rounded-lg border border-blue-400 px-2 py-1 text-sm focus:outline-none dark:bg-gray-800 dark:text-white"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleSave(item.id)}
                          />
                        ) : (
                          <span className="text-gray-700 dark:text-gray-300">
                            {item.ordered_quantity}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 tabular-nums">
                        {item.issued_quantity > 0 ? (
                          <span className="font-medium text-amber-600 dark:text-amber-400">
                            {item.issued_quantity}
                          </span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-gray-500 dark:text-gray-400">
                        {item.products?.unit ?? '—'}
                      </td>
                      {canEdit && (
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-end gap-3">
                            {editItemId === item.id ? (
                              <>
                                <button
                                  onClick={() => handleSave(item.id)}
                                  disabled={isSaving}
                                  className="text-xs text-blue-600 hover:underline disabled:opacity-50 dark:text-blue-400"
                                >
                                  {isSaving ? o.saving : o.save}
                                </button>
                                <button
                                  onClick={() => { setEditItemId(null); setEditError(null) }}
                                  className="text-xs text-gray-400 hover:underline"
                                >
                                  {o.cancel}
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEdit(item)}
                                  className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                                >
                                  {o.edit}
                                </button>
                                <button
                                  onClick={() => handleRemove(item.id)}
                                  disabled={isRemoving}
                                  className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-50 dark:hover:text-red-400"
                                >
                                  {o.remove}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Inline edit error */}
              {editError && (
                <p className="border-t border-gray-100 px-4 py-2 text-xs text-red-500 dark:border-gray-800">
                  {editError}
                </p>
              )}
            </div>
          )}

          {/* ── Add item form ──────────────────────────────────────────────── */}
          {canEdit && (
            <div>
              <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                {o.itemAddTitle}
              </p>

              {/* Barcode row */}
              <div className="mb-2 flex gap-1">
                <input
                  type="text"
                  value={barcodeVal}
                  onChange={(e) => { setBarcodeVal(e.target.value); setBarcodeMsg(null) }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleBarcodeSearch() } }}
                  placeholder={o.itemBarcodePlaceholder}
                  aria-label={o.itemBarcodeLabel}
                  autoComplete="off"
                  className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                />
                <button
                  type="button"
                  onClick={handleBarcodeSearch}
                  disabled={isBarcodeSearching || !barcodeVal.trim()}
                  className="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  {o.itemBarcodeSearch}
                </button>
                {barcodeVal && (
                  <button
                    type="button"
                    onClick={clearBarcode}
                    className="shrink-0 rounded-lg border border-gray-200 px-2.5 py-2 text-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {barcodeMsg && (
                <p className={`mb-2 text-xs ${barcodeMsg.type === 'found' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-500'}`}>
                  {barcodeMsg.text}
                </p>
              )}

              {/* Product + qty + Add row */}
              <div className="flex gap-2">
                <select
                  value={addProductId}
                  onChange={(e) => { setAddProductId(e.target.value); setAddError(null) }}
                  className={cn(inputCls, 'flex-1')}
                >
                  <option value="">{o.itemSelectProduct}</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.unit ? ` (${p.unit})` : ''}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={addQty}
                  onChange={(e) => { setAddQty(e.target.value); setAddError(null) }}
                  placeholder={o.itemQtyPlaceholder}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  className={cn(inputCls, 'w-24')}
                />
                <button
                  onClick={handleAdd}
                  disabled={isAdding}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isAdding ? o.adding : o.itemAddBtn}
                </button>
              </div>
              {addError && (
                <p className="mt-1.5 text-xs text-red-500">{addError}</p>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <div className="flex justify-end border-t border-gray-100 px-6 py-4 dark:border-gray-800">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            {o.close}
          </button>
        </div>
      </div>
    </div>
  )
}
