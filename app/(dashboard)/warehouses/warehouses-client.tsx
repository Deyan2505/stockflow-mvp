'use client'

import { useState, useTransition, useMemo } from 'react'
import { Search } from 'lucide-react'
import { type Warehouse, archiveWarehouse, restoreWarehouse } from './actions'
import { WarehouseModal } from './warehouse-modal'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'

export function WarehousesClient({ warehouses, canWrite }: { warehouses: Warehouse[]; canWrite: boolean }) {
  const { t } = useT()
  const w = t.warehouses

  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [modal, setModal] = useState<Warehouse | null | 'new'>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return warehouses.filter((item) => {
      const matchSearch = !q || item.name.toLowerCase().includes(q) || (item.address ?? '').toLowerCase().includes(q)
      return matchSearch && (showInactive || item.status === 'active')
    })
  }, [warehouses, search, showInactive])

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{w.title}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {w.activeCount(warehouses.filter((x) => x.status === 'active').length)}
          </p>
        </div>
        {canWrite ? (
          <button onClick={() => setModal('new')} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            {w.newBtn}
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
          <button onClick={() => setActionError(null)} className="ml-3 text-xs underline opacity-70 hover:opacity-100">{w.close}</button>
        </div>
      )}

      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder={w.searchPlaceholder} value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500" />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="rounded border-gray-300" />
          {w.showInactive}
        </label>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              {w.cols.map((col) => (
                <th key={col} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={w.cols.length} className="px-4 py-16 text-center">
                  <p className="text-sm text-gray-400 dark:text-gray-500">{search ? w.noResults : w.noItems}</p>
                  {!search && <p className="mt-1 text-xs text-gray-300 dark:text-gray-600">{w.addFirst}</p>}
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} className={cn('transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50', item.status === 'inactive' && 'opacity-50')}>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.name}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.address ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', item.status === 'active' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400')}>
                      {item.status === 'active' ? w.active : w.inactive}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {canWrite && (
                      <div className="flex items-center gap-3">
                        <button onClick={() => setModal(item)} className="text-xs text-blue-600 hover:underline dark:text-blue-400">{w.edit}</button>
                        {item.status === 'active' ? (
                          <button onClick={() => startTransition(async () => { try { await archiveWarehouse(item.id) } catch (err) { setActionError(err instanceof Error ? err.message : 'Error') } })} disabled={isPending} className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-50 dark:hover:text-red-400">{w.deactivate}</button>
                        ) : (
                          <button onClick={() => startTransition(() => restoreWarehouse(item.id))} disabled={isPending} className="text-xs text-gray-400 hover:text-green-600 disabled:opacity-50 dark:hover:text-green-400">{w.restore}</button>
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

      {canWrite && modal !== null && <WarehouseModal warehouse={modal === 'new' ? null : modal} onClose={() => setModal(null)} />}
    </div>
  )
}
