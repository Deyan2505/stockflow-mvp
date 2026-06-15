'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { type Supplier, type SupplierInput, createSupplier, updateSupplier } from './actions'
import { useT } from '@/lib/i18n'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Props = {
  supplier: Supplier | null
  onClose: (successMsg?: string) => void
}

function toInput(s: Supplier): SupplierInput {
  return { name: s.name, phone: s.phone, email: s.email, address: s.address, note: s.note }
}

const empty: SupplierInput = { name: '', phone: null, email: null, address: null, note: null }

export function SupplierModal({ supplier, onClose }: Props) {
  const { t } = useT()
  const s = t.suppliers

  const [form, setForm] = useState<SupplierInput>(supplier ? toInput(supplier) : empty)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const set = (key: keyof SupplierInput, val: string) =>
    setForm((f) => ({ ...f, [key]: val || null }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError(s.errRequired); return }
    if (form.email && !EMAIL_RE.test(form.email)) { setError(s.errEmail); return }
    setError(null)

    startTransition(async () => {
      const result = supplier
        ? await updateSupplier(supplier.id, form)
        : await createSupplier(form)

      if (!result.success) { setError(result.error); return }
      onClose(supplier ? s.successUpdate : s.successCreate)
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
            {supplier ? s.modalEditTitle : s.modalNewTitle}
          </h2>
          <button
            onClick={() => onClose()}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-2 gap-4">
            {/* Name — full width */}
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                {s.fName} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={inputClass}
                placeholder={s.namePlaceholder}
              />
            </div>

            {/* Phone */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">{s.fPhone}</label>
              <input
                type="tel"
                value={form.phone ?? ''}
                onChange={(e) => set('phone', e.target.value)}
                className={inputClass}
                placeholder="+359 88 888 8888"
              />
            </div>

            {/* Email */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">{s.fEmail}</label>
              <input
                type="email"
                value={form.email ?? ''}
                onChange={(e) => set('email', e.target.value)}
                className={inputClass}
                placeholder="office@example.com"
              />
            </div>

            {/* Address — full width */}
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">{s.fAddress}</label>
              <input
                type="text"
                value={form.address ?? ''}
                onChange={(e) => set('address', e.target.value)}
                className={inputClass}
                placeholder={s.addressPlaceholder}
              />
            </div>

            {/* Note — full width */}
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">{s.fNote}</label>
              <textarea
                rows={2}
                value={form.note ?? ''}
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
              {isPending ? s.saving : supplier ? s.save : s.create}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
