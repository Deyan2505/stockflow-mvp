'use client'

import { useState, useTransition, useMemo } from 'react'
import { Search } from 'lucide-react'
import { type Location, archiveLocation, restoreLocation } from './actions'
import { type Warehouse } from '../warehouses/actions'
import { LocationModal } from './location-modal'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'

type Props = {
  locations: Location[]
  warehouses: Warehouse[]
  canWrite: boolean
}

export function LocationsClient({ locations, warehouses, canWrite }: Props) {
  const { t } = useT()
  const l = t.locations

  const [search, setSearch] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all')
  const [showInactive, setShowInactive] = useState(false)
  const [modal, setModal] = useState<Location | null | 'new'>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return locations.filter((loc) => {
      const matchSearch =
        !q ||
        loc.code.toLowerCase().includes(q) ||
        (loc.zone ?? '').toLowerCase().includes(q) ||
        (loc.warehouses?.name ?? '').toLowerCase().includes(q)
      const matchWarehouse = warehouseFilter === 'all' || loc.warehouse_id === warehouseFilter
      const matchStatus = showInactive || loc.status === 'active'
      return matchSearch && matchWarehouse && matchStatus
    })
  }, [locations, search, warehouseFilter, showInactive])

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{l.title}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {l.activeCount(locations.filter((x) => x.status === 'active').length)}
          </p>
        </div>
        {canWrite ? (
          <button
            onClick={() => setModal('new')}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {l.newBtn}
          </button>
        ) : (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
            {t.common.readOnly}
          </span>
        )}
      </div>

      {actionError && (
        <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
          {actionError}
          <button onClick={() => setActionError(null)} className="ml-3 text-xs underline opacity-70 hover:opacity-100">
            {l.close}
          </button>
        </div>
      )}

      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={l.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
          />
        </div>

        <select
          value={warehouseFilter}
          onChange={(e) => setWarehouseFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        >
          <option value="all">{l.allWarehouses}</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="rounded border-gray-300" />
          {l.showInactive}
        </label>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              {l.cols.map((col) => (
                <th key={col} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={l.cols.length} className="px-4 py-16 text-center">
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    {search || warehouseFilter !== 'all' ? l.noResults : l.noItems}
                  </p>
                  {!search && warehouseFilter === 'all' && (
                    <p className="mt-1 text-xs text-gray-300 dark:text-gray-600">{l.addFirst}</p>
                  )}
                </td>
              </tr>
            ) : (
              filtered.map((loc) => (
                <tr key={loc.id} className={cn('transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50', loc.status === 'inactive' && 'opacity-50')}>
                  <td className="px-4 py-3 font-mono text-sm font-medium text-gray-900 dark:text-white">{loc.code}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{loc.warehouses?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{loc.zone ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{loc.row ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{loc.shelf ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{loc.bin ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', loc.status === 'active' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400')}>
                      {loc.status === 'active' ? l.active : l.inactive}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {canWrite && (
                      <div className="flex items-center gap-3">
                        <button onClick={() => setModal(loc)} className="text-xs text-blue-600 hover:underline dark:text-blue-400">{l.edit}</button>
                        {loc.status === 'active' ? (
                          <button onClick={() => startTransition(async () => { try { await archiveLocation(loc.id) } catch (err) { setActionError(err instanceof Error ? err.message : 'Error') } })} disabled={isPending} className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-50 dark:hover:text-red-400">{l.deactivate}</button>
                        ) : (
                          <button onClick={() => startTransition(() => restoreLocation(loc.id))} disabled={isPending} className="text-xs text-gray-400 hover:text-green-600 disabled:opacity-50 dark:hover:text-green-400">{l.restore}</button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {canWrite && modal !== null && (
        <LocationModal
          location={modal === 'new' ? null : modal}
          warehouses={warehouses.filter((w) => w.status === 'active')}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
