'use client'

import { useState, useTransition } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { type Order, type OrderInput, createOrder, updateOrder, findProductForOrder } from './actions'
import { useT } from '@/lib/i18n'

type ProductOption = { id: string; name: string; unit: string }
type LocationOption = { id: string; code: string }

type Props = {
  order: Order | null
  products: ProductOption[]
  locations: LocationOption[]
  onClose: (successMsg?: string) => void
}

type HeaderForm = {
  order_number: string
  customer_name: string
  status: 'draft' | 'confirmed'
  order_date: string
  note: string
}

type ItemRow = {
  product_id: string
  ordered_quantity: string
  location_id: string
}

const emptyItem = (): ItemRow => ({ product_id: '', ordered_quantity: '', location_id: '' })

function initHeader(o: Order | null): HeaderForm {
  return o
    ? {
        order_number:  o.order_number,
        customer_name: o.customer_name ?? '',
        status:        o.status === 'draft' || o.status === 'confirmed' ? o.status : 'draft',
        order_date:    o.order_date ?? '',
        note:          o.note ?? '',
      }
    : { order_number: '', customer_name: '', status: 'draft', order_date: '', note: '' }
}

function initItems(o: Order | null): ItemRow[] {
  if (!o || !o.outgoing_order_items?.length) return [emptyItem()]
  return o.outgoing_order_items.map((i) => ({
    product_id:       i.product_id,
    ordered_quantity: String(i.ordered_quantity),
    location_id:      i.location_id ?? '',
  }))
}

export function OrderModal({ order, products, locations, onClose }: Props) {
  const { t } = useT()
  const o = t.orders

  const [form, setForm] = useState<HeaderForm>(initHeader(order))
  const [items, setItems] = useState<ItemRow[]>(initItems(order))
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isBarcodeSearching, startBarcodeSearch] = useTransition()
  const [barcodeInputs, setBarcodeInputs] = useState<Record<number, string>>({})
  const [barcodeMsgs, setBarcodeMsgs] = useState<Record<number, { type: 'found' | 'notFound'; text: string }>>({})

  const setField = (key: keyof HeaderForm, val: string) =>
    setForm((f) => ({ ...f, [key]: val }))

  const setItem = (idx: number, key: keyof ItemRow, val: string) =>
    setItems((prev) => prev.map((row, i) => (i === idx ? { ...row, [key]: val } : row)))

  const addItem = () => setItems((prev) => [...prev, emptyItem()])

  const removeItem = (idx: number) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev))
    setBarcodeInputs({})
    setBarcodeMsgs({})
  }

  const clearBarcode = (idx: number) => {
    setBarcodeInputs((prev) => { const n = { ...prev }; delete n[idx]; return n })
    setBarcodeMsgs((prev) => { const n = { ...prev }; delete n[idx]; return n })
  }

  const handleBarcodeSearch = (idx: number) => {
    const trimmed = (barcodeInputs[idx] ?? '').trim()
    if (!trimmed) return
    startBarcodeSearch(async () => {
      const result = await findProductForOrder(trimmed)
      if (result) {
        setItem(idx, 'product_id', result.id)
        setBarcodeMsgs((prev) => ({ ...prev, [idx]: { type: 'found', text: o.itemBarcodeFound(result.name) } }))
      } else {
        setBarcodeMsgs((prev) => ({ ...prev, [idx]: { type: 'notFound', text: o.itemBarcodeNotFound } }))
      }
    })
  }

  const validate = (): string | null => {
    if (!form.order_number.trim()) return o.errNumber
    if (items.length === 0) return o.errItems
    for (const item of items) {
      if (!item.product_id) return o.errProduct
      const qty = Number(item.ordered_quantity)
      if (!qty || qty <= 0) return o.errQty
    }
    return null
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }
    setError(null)

    const input: OrderInput = {
      order_number:  form.order_number,
      customer_name: form.customer_name || null,
      status:        form.status,
      order_date:    form.order_date || null,
      note:          form.note || null,
      items: items.map((i) => ({
        product_id:       i.product_id,
        ordered_quantity: Number(i.ordered_quantity),
        location_id:      i.location_id || null,
      })),
    }

    startTransition(async () => {
      const result = order
        ? await updateOrder(order.id, input)
        : await createOrder(input)
      if (!result.success) { setError(result.error); return }
      onClose(order ? o.successUpdate : o.successCreate)
    })
  }

  const inputCls =
    'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500'
  const selectCls = inputCls
  const labelCls = 'mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400'
  const cellSelectCls =
    'w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white'
  const cellInputCls = cellSelectCls

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            {order ? o.modalEditTitle : o.modalNewTitle}
          </h2>
          <button
            onClick={() => onClose()}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            {/* Header fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>
                  {o.fOrderNumber} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.order_number}
                  onChange={(e) => setField('order_number', e.target.value)}
                  className={inputCls}
                  placeholder={o.orderNumberPlaceholder}
                />
              </div>

              <div>
                <label className={labelCls}>{o.fCustomer}</label>
                <input
                  type="text"
                  value={form.customer_name}
                  onChange={(e) => setField('customer_name', e.target.value)}
                  className={inputCls}
                  placeholder={o.customerPlaceholder}
                />
              </div>

              <div>
                <label className={labelCls}>{o.fStatus}</label>
                <select
                  value={form.status}
                  onChange={(e) => setField('status', e.target.value as 'draft' | 'confirmed')}
                  className={selectCls}
                >
                  <option value="draft">{o.statusDraft}</option>
                  <option value="confirmed">{o.statusConfirmed}</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>{o.fOrderDate}</label>
                <input
                  type="date"
                  value={form.order_date}
                  onChange={(e) => setField('order_date', e.target.value)}
                  className={inputCls}
                />
              </div>

              <div className="col-span-2">
                <label className={labelCls}>{o.fNote}</label>
                <textarea
                  rows={2}
                  value={form.note}
                  onChange={(e) => setField('note', e.target.value)}
                  className={inputCls + ' resize-none'}
                  placeholder={o.notePlaceholder}
                />
              </div>
            </div>

            {/* Items section */}
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                {o.itemsTitle} <span className="text-red-500">*</span>
              </h3>

              <div className="rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">{o.fProduct}</th>
                      <th className="w-24 px-3 py-2 text-left text-xs font-medium text-gray-400">{o.fQty}</th>
                      <th className="w-44 px-3 py-2 text-left text-xs font-medium text-gray-400">{o.fLocation}</th>
                      <th className="w-8 px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2">
                          <select
                            value={item.product_id}
                            onChange={(e) => setItem(idx, 'product_id', e.target.value)}
                            className={cellSelectCls}
                          >
                            <option value="">— {o.selectProduct} —</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                          {/* Barcode lookup */}
                          <div className="mt-1.5 flex gap-1">
                            <input
                              type="text"
                              value={barcodeInputs[idx] ?? ''}
                              onChange={(e) => {
                                setBarcodeInputs((prev) => ({ ...prev, [idx]: e.target.value }))
                                setBarcodeMsgs((prev) => { const n = { ...prev }; delete n[idx]; return n })
                              }}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleBarcodeSearch(idx) } }}
                              placeholder={o.itemBarcodePlaceholder}
                              aria-label={o.itemBarcodeLabel}
                              autoComplete="off"
                              className="min-w-0 flex-1 rounded border border-gray-200 px-2 py-1 font-mono text-xs focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleBarcodeSearch(idx)}
                              disabled={isBarcodeSearching || !(barcodeInputs[idx] ?? '').trim()}
                              className="shrink-0 rounded border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                            >
                              {o.itemBarcodeSearch}
                            </button>
                            {(barcodeInputs[idx] ?? '') && (
                              <button
                                type="button"
                                onClick={() => clearBarcode(idx)}
                                className="shrink-0 rounded border border-gray-200 px-1.5 py-1 text-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                          {barcodeMsgs[idx] != null && (
                            <p className={`mt-0.5 text-xs ${barcodeMsgs[idx]!.type === 'found' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-500'}`}>
                              {barcodeMsgs[idx]!.text}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.ordered_quantity}
                            onChange={(e) => setItem(idx, 'ordered_quantity', e.target.value)}
                            className={cellInputCls}
                            placeholder="0"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={item.location_id}
                            onChange={(e) => setItem(idx, 'location_id', e.target.value)}
                            className={cellSelectCls}
                          >
                            <option value="">— {o.selectLocation} —</option>
                            {locations.map((l) => (
                              <option key={l.id} value={l.id}>{l.code}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            disabled={items.length === 1}
                            className="rounded p-1 text-gray-300 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30 dark:text-gray-600 dark:hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="border-t border-gray-100 px-3 py-2 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {o.addItem}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="border-t border-gray-100 px-6 py-2 text-xs text-red-500 dark:border-gray-800">
              {error}
            </p>
          )}

          {/* Footer */}
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
              disabled={isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? o.saving : order ? o.save : o.create}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
