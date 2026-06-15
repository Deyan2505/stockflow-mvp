'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { type Location, type LocationInput, createLocation, updateLocation } from './actions'
import type { Warehouse } from '../warehouses/actions'
import { useT } from '@/lib/i18n'

type Props = {
  location: Location | null
  warehouses: Warehouse[]
  onClose: () => void
}

function emptyForm(warehouses: Warehouse[]): LocationInput {
  return {
    warehouse_id: warehouses[0]?.id ?? '',
    code: '',
    zone: null,
    row: null,
    shelf: null,
    bin: null,
  }
}

function toInput(l: Location): LocationInput {
  return {
    warehouse_id: l.warehouse_id,
    code: l.code,
    zone: l.zone,
    row: l.row,
    shelf: l.shelf,
    bin: l.bin,
  }
}

export function LocationModal({ location, warehouses, onClose }: Props) {
  const { t } = useT()
  const l = t.locations

  const [form, setForm] = useState<LocationInput>(
    location ? toInput(location) : emptyForm(warehouses)
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const set = <K extends keyof LocationInput>(k: K, v: LocationInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.code.trim()) { setError(l.errCode); return }
    if (!form.warehouse_id) { setError(l.errWarehouse); return }
    setError(null)

    startTransition(async () => {
      try {
        if (location) {
          await updateLocation(location.id, form)
        } else {
          await createLocation(form)
        }
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : l.errGeneric)
      }
    })
  }

  const inputClass =
    'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white'

  const subFields: [string, keyof LocationInput, string][] = [
    [l.fZone, 'zone', 'A'],
    [l.fRow, 'row', '01'],
    [l.fShelf, 'shelf', '02'],
    [l.fBin, 'bin', ''],
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            {location ? l.modalEditTitle : l.modalNewTitle}
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
                {l.fWarehouse} <span className="text-red-500">*</span>
              </label>
              {warehouses.length === 0 ? (
                <p className="text-xs text-red-500">{l.noWarehouses}</p>
              ) : (
                <select
                  value={form.warehouse_id}
                  onChange={(e) => set('warehouse_id', e.target.value)}
                  className={inputClass}
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                {l.fCode} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => set('code', e.target.value.toUpperCase())}
                placeholder="A-01-02"
                className={inputClass}
              />
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-600">{l.codeHint}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {subFields.map(([label, key, placeholder]) => (
                <div key={key}>
                  <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                    {label}
                  </label>
                  <input
                    type="text"
                    value={(form[key] as string) ?? ''}
                    onChange={(e) => set(key, e.target.value || null)}
                    placeholder={placeholder}
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
          </div>

          {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              {l.cancel}
            </button>
            <button
              type="submit"
              disabled={isPending || warehouses.length === 0}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? l.saving : location ? l.save : l.create}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
