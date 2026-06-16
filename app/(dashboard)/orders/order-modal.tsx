'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { type Order, type OrderInput, createOrder, updateOrder } from './actions'
import { useT } from '@/lib/i18n'

// v0.6 Step 1: header only — no order items, no products, no quantities

type Props = {
  order: Order | null
  onClose: (successMsg?: string) => void
}

type HeaderForm = {
  order_number:  string
  customer_name: string
  status:        'draft' | 'open'
  order_date:    string
  expected_date: string
  note:          string
}

function initHeader(o: Order | null): HeaderForm {
  return o
    ? {
        order_number:  o.order_number,
        customer_name: o.customer_name ?? '',
        status:        o.status === 'open' ? 'open' : 'draft',
        order_date:    o.order_date ?? '',
        expected_date: o.expected_date ?? '',
        note:          o.note ?? '',
      }
    : { order_number: '', customer_name: '', status: 'draft', order_date: '', expected_date: '', note: '' }
}

export function OrderModal({ order, onClose }: Props) {
  const { t } = useT()
  const o = t.orders

  const [form, setForm] = useState<HeaderForm>(initHeader(order))
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const setField = (key: keyof HeaderForm, val: string) =>
    setForm((f) => ({ ...f, [key]: val }))

  const validate = (): string | null => {
    if (!form.order_number.trim()) return o.errNumber
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
      expected_date: form.expected_date || null,
      note:          form.note || null,
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
  const labelCls = 'mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl dark:bg-gray-900">
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
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
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

              <div className="col-span-2">
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
                  onChange={(e) => setField('status', e.target.value as 'draft' | 'open')}
                  className={inputCls}
                >
                  <option value="draft">{o.statusDraft}</option>
                  <option value="open">{o.statusOpen}</option>
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
                <label className={labelCls}>{o.fExpectedDate}</label>
                <input
                  type="date"
                  value={form.expected_date}
                  onChange={(e) => setField('expected_date', e.target.value)}
                  className={inputCls}
                />
              </div>

              <div className="col-span-2">
                <label className={labelCls}>{o.fNote}</label>
                <textarea
                  rows={3}
                  value={form.note}
                  onChange={(e) => setField('note', e.target.value)}
                  className={inputCls + ' resize-none'}
                  placeholder={o.notePlaceholder}
                />
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
