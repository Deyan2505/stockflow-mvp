'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { type Invoice, type InvoiceInput, type CustomerOption, type OrderForInvoice, createInvoice, updateInvoice } from './actions'
import { useT } from '@/lib/i18n'

type FormState = {
  invoice_number: string
  customer_id: string
  outgoing_order_id: string
  invoice_date: string
  due_date: string
  note: string
  vat_rate: string
}

const today = () => new Date().toISOString().split('T')[0]

const empty = (): FormState => ({
  invoice_number: '',
  customer_id: '',
  outgoing_order_id: '',
  invoice_date: today(),
  due_date: '',
  note: '',
  vat_rate: '20',
})

function toForm(inv: Invoice): FormState {
  return {
    invoice_number: inv.invoice_number,
    customer_id: inv.customer_id,
    outgoing_order_id: inv.outgoing_order_id ?? '',
    invoice_date: inv.invoice_date,
    due_date: inv.due_date ?? '',
    note: inv.note ?? '',
    vat_rate: String(inv.vat_rate),
  }
}

type Props = {
  invoice: Invoice | null
  customers: CustomerOption[]
  orders: OrderForInvoice[]
  onClose: (msg?: string) => void
}

export function InvoiceModal({ invoice, customers, orders, onClose }: Props) {
  const { t } = useT()
  const s = t.invoices

  const [form, setForm] = useState<FormState>(invoice ? toForm(invoice) : empty())
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const set = (key: keyof FormState, val: string) =>
    setForm((f) => ({ ...f, [key]: val }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.invoice_number.trim()) { setError(s.errRequired); return }
    if (!form.customer_id) { setError(s.errCustomerRequired); return }
    const vatNum = parseFloat(form.vat_rate)
    if (isNaN(vatNum) || vatNum < 0 || vatNum > 100) { setError(s.errVatRate); return }
    setError(null)

    const input: InvoiceInput = {
      invoice_number: form.invoice_number,
      customer_id: form.customer_id,
      outgoing_order_id: form.outgoing_order_id || null,
      invoice_date: form.invoice_date || null,
      due_date: form.due_date || null,
      note: form.note || null,
      vat_rate: vatNum,
    }

    startTransition(async () => {
      const result = invoice
        ? await updateInvoice(invoice.id, input)
        : await createInvoice(input)

      if (!result.success) {
        if (result.error === 'errDuplicate') { setError(s.errDuplicate); return }
        if (result.error === 'errLocked') { setError(s.errLocked); return }
        setError(result.error)
        return
      }
      onClose(invoice ? s.successUpdate : s.successCreate)
    })
  }

  const inputClass =
    'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            {invoice ? s.modalEditTitle : s.modalNewTitle}
          </h2>
          <button
            onClick={() => onClose()}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {customers.length === 0 ? (
          <div className="p-6">
            <p className="text-sm text-amber-600 dark:text-amber-400">{s.noCustomers}</p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => onClose()}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                {s.close}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-2 gap-4">
              {/* Invoice number — full width */}
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  {s.fInvoiceNumber} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.invoice_number}
                  onChange={(e) => set('invoice_number', e.target.value)}
                  className={inputClass}
                  placeholder={s.invoiceNumberPlaceholder}
                />
              </div>

              {/* Outgoing order — full width, optional */}
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  {s.fOrder}
                </label>
                <select
                  value={form.outgoing_order_id}
                  onChange={(e) => set('outgoing_order_id', e.target.value)}
                  className={inputClass}
                >
                  <option value="">{s.noOrder}</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.order_number}{o.customer_name ? ` — ${o.customer_name}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer — full width */}
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  {s.fCustomer} <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.customer_id}
                  onChange={(e) => set('customer_id', e.target.value)}
                  className={inputClass}
                >
                  <option value="">{s.selectCustomer}</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Invoice date */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  {s.fInvoiceDate}
                </label>
                <input
                  type="date"
                  value={form.invoice_date}
                  onChange={(e) => set('invoice_date', e.target.value)}
                  className={inputClass}
                />
              </div>

              {/* Due date */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  {s.fDueDate}
                </label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => set('due_date', e.target.value)}
                  className={inputClass}
                />
              </div>

              {/* VAT rate */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  {s.fVatRate}
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.vat_rate}
                  onChange={(e) => set('vat_rate', e.target.value)}
                  className={inputClass}
                />
              </div>

              {/* Note — full width */}
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  {s.fNote}
                </label>
                <textarea
                  rows={2}
                  value={form.note}
                  onChange={(e) => set('note', e.target.value)}
                  className={inputClass + ' resize-none'}
                  placeholder={s.notePlaceholder}
                />
              </div>
            </div>

            {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => onClose()}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                {s.cancel}
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending ? s.saving : invoice ? s.save : s.create}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
