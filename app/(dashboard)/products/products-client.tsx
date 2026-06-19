'use client'

import { useState, useTransition, useMemo } from 'react'
import { Search } from 'lucide-react'
import { type Product, archiveProduct, restoreProduct } from './actions'
import { ProductModal } from './product-modal'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'

export function ProductsClient({ products, canWrite }: { products: Product[]; canWrite: boolean }) {
  const { t } = useT()
  const p = t.products

  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [modalProduct, setModalProduct] = useState<Product | null | 'new'>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return products.filter((item) => {
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.sku ?? '').toLowerCase().includes(q) ||
        (item.barcode ?? '').toLowerCase().includes(q)
      const matchStatus = showArchived || item.status === 'active'
      return matchSearch && matchStatus
    })
  }, [products, search, showArchived])

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{p.title}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {p.activeCount(products.filter((x) => x.status === 'active').length)}
          </p>
        </div>
        {canWrite ? (
          <button
            onClick={() => setModalProduct('new')}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {p.newBtn}
          </button>
        ) : (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
            {t.common.readOnly}
          </span>
        )}
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={p.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="rounded border-gray-300" />
          {p.showArchived}
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              {p.cols.map((col) => (
                <th key={col} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={p.cols.length} className="px-4 py-16 text-center">
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    {search ? p.noResults : p.noItems}
                  </p>
                  {!search && <p className="mt-1 text-xs text-gray-300 dark:text-gray-600">{p.addFirst}</p>}
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} className={cn('transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50', item.status === 'archived' && 'opacity-50')}>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{item.sku ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400 dark:text-gray-500">{item.barcode ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.category ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.unit}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.cost_price != null ? item.cost_price.toFixed(2) : '—'}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.sale_price != null ? item.sale_price.toFixed(2) : '—'}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.min_quantity}</td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', item.status === 'active' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400')}>
                      {item.status === 'active' ? p.active : p.archived}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {canWrite && (
                      <div className="flex items-center gap-3">
                        <button onClick={() => setModalProduct(item)} className="text-xs text-blue-600 hover:underline dark:text-blue-400">{p.edit}</button>
                        {item.status === 'active' ? (
                          <button onClick={() => startTransition(() => archiveProduct(item.id))} disabled={isPending} className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-50 dark:hover:text-red-400">{p.archive}</button>
                        ) : (
                          <button onClick={() => startTransition(() => restoreProduct(item.id))} disabled={isPending} className="text-xs text-gray-400 hover:text-green-600 disabled:opacity-50 dark:hover:text-green-400">{p.restore}</button>
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

      {canWrite && modalProduct !== null && (
        <ProductModal product={modalProduct === 'new' ? null : modalProduct} onClose={() => setModalProduct(null)} />
      )}
    </div>
  )
}
