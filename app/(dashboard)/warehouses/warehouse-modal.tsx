'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { type Warehouse, type WarehouseInput, createWarehouse, updateWarehouse } from './actions'
import { useT } from '@/lib/i18n'

type Props = {
  warehouse: Warehouse | null
  onClose: () => void
}

const empty: WarehouseInput = { name: '', address: null }

export function WarehouseModal({ warehouse, onClose }: Props) {
  const { t } = useT()
  const w = t.warehouses

  const [form, setForm] = useState<WarehouseInput>(
    warehouse ? { name: warehouse.name, address: warehouse.address } : empty
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError(w.errRequired); return }
    setError(null)

    startTransition(async () => {
      try {
        if (warehouse) {
          await updateWarehouse(warehouse.id, form)
        } else {
          await createWarehouse(form)
        }
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : w.errGeneric)
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            {warehouse ? w.modalEditTitle : w.modalNewTitle}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                {w.fName} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder={w.namePlaceholder}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                {w.fAddress}
              </label>
              <input
                type="text"
                value={form.address ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value || null }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder={w.addressPlaceholder}
              />
            </div>
          </div>

          {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              {w.cancel}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? w.saving : warehouse ? w.save : w.create}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
