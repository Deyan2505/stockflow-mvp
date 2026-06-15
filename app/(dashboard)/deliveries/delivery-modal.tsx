'use client'

import { useState, useTransition } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { type Delivery, type DeliveryInput, createDelivery, updateDelivery } from './actions'
import { useT } from '@/lib/i18n'

type SupplierOption = { id: string; name: string }
type ProductOption = { id: string; name: string; unit: string }
type LocationOption = { id: string; code: string }

type Props = {
  delivery: Delivery | null
  suppliers: SupplierOption[]
  products: ProductOption[]
  locations: LocationOption[]
  onClose: (successMsg?: string) => void
}

type HeaderForm = {
  supplier_id: string
  delivery_number: string
  status: 'draft' | 'expected'
  expected_date: string
  note: string
}

type ItemRow = {
  product_id: string
  expected_quantity: string
  location_id: string
}

const emptyItem = (): ItemRow => ({ product_id: '', expected_quantity: '', location_id: '' })

function initHeader(d: Delivery | null): HeaderForm {
  return d
    ? {
        supplier_id: d.supplier_id,
        delivery_number: d.delivery_number,
        status: d.status as 'draft' | 'expected',
        expected_date: d.expected_date ?? '',
        note: d.note ?? '',
      }
    : { supplier_id: '', delivery_number: '', status: 'draft', expected_date: '', note: '' }
}

function initItems(d: Delivery | null): ItemRow[] {
  if (!d || !d.incoming_delivery_items?.length) return [emptyItem()]
  return d.incoming_delivery_items.map((i) => ({
    product_id: i.product_id,
    expected_quantity: String(i.expected_quantity),
    location_id: i.location_id ?? '',
  }))
}

export function DeliveryModal({ delivery, suppliers, products, locations, onClose }: Props) {
  const { t } = useT()
  const d = t.deliveries

  const [form, setForm] = useState<HeaderForm>(initHeader(delivery))
  const [items, setItems] = useState<ItemRow[]>(initItems(delivery))
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const setField = (key: keyof HeaderForm, val: string) =>
    setForm((f) => ({ ...f, [key]: val }))

  const setItem = (idx: number, key: keyof ItemRow, val: string) =>
    setItems((prev) => prev.map((row, i) => (i === idx ? { ...row, [key]: val } : row)))

  const addItem = () => setItems((prev) => [...prev, emptyItem()])

  const removeItem = (idx: number) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev))

  const validate = (): string | null => {
    if (!form.supplier_id) return d.errSupplier
    if (!form.delivery_number.trim()) return d.errNumber
    if (items.length === 0) return d.errItems
    for (const item of items) {
      if (!item.product_id) return d.errProduct
      const qty = Number(item.expected_quantity)
      if (!qty || qty <= 0) return d.errQty
      if (!item.location_id) return d.errLocation
    }
    return null
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }
    setError(null)

    const input: DeliveryInput = {
      supplier_id: form.supplier_id,
      delivery_number: form.delivery_number,
      status: form.status,
      expected_date: form.expected_date || null,
      note: form.note || null,
      items: items.map((i) => ({
        product_id: i.product_id,
        expected_quantity: Number(i.expected_quantity),
        location_id: i.location_id || null,
      })),
    }

    startTransition(async () => {
      const result = delivery
        ? await updateDelivery(delivery.id, input)
        : await createDelivery(input)
      if (!result.success) { setError(result.error); return }
      onClose(delivery ? d.successUpdate : d.successCreate)
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
            {delivery ? d.modalEditTitle : d.modalNewTitle}
          </h2>
          <button
            onClick={() => onClose()}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Header fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>
                  {d.fDeliveryNumber} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.delivery_number}
                  onChange={(e) => setField('delivery_number', e.target.value)}
                  className={inputCls}
                  placeholder={d.deliveryNumberPlaceholder}
                />
              </div>

              <div>
                <label className={labelCls}>
                  {d.fSupplier} <span className="text-red-500">*</span>
                </label>
                {suppliers.length === 0 ? (
                  <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-500">
                    {d.noSuppliers}
                  </p>
                ) : (
                  <select
                    value={form.supplier_id}
                    onChange={(e) => setField('supplier_id', e.target.value)}
                    className={selectCls}
                  >
                    <option value="">—</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className={labelCls}>{d.fStatus}</label>
                <select
                  value={form.status}
                  onChange={(e) => setField('status', e.target.value as 'draft' | 'expected')}
                  className={selectCls}
                >
                  <option value="draft">{d.statusDraft}</option>
                  <option value="expected">{d.statusExpected}</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>{d.fExpectedDate}</label>
                <input
                  type="date"
                  value={form.expected_date}
                  onChange={(e) => setField('expected_date', e.target.value)}
                  className={inputCls}
                />
              </div>

              <div className="col-span-2">
                <label className={labelCls}>{d.fNote}</label>
                <textarea
                  rows={2}
                  value={form.note}
                  onChange={(e) => setField('note', e.target.value)}
                  className={inputCls + ' resize-none'}
                  placeholder={d.notePlaceholder}
                />
              </div>
            </div>

            {/* Items section */}
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                {d.itemsTitle} <span className="text-red-500">*</span>
              </h3>

              <div className="rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">{d.fProduct}</th>
                      <th className="w-24 px-3 py-2 text-left text-xs font-medium text-gray-400">{d.fQty}</th>
                      <th className="w-44 px-3 py-2 text-left text-xs font-medium text-gray-400">{d.fLocation}</th>
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
                            <option value="">— {d.selectProduct} —</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.expected_quantity}
                            onChange={(e) => setItem(idx, 'expected_quantity', e.target.value)}
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
                            <option value="">— {d.selectLocation} —</option>
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
                    {d.addItem}
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

          {/* Footer buttons */}
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
              disabled={isPending || suppliers.length === 0}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? d.saving : delivery ? d.save : d.create}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
