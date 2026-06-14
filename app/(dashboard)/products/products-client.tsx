'use client'

import { useState, useTransition, useMemo } from 'react'
import { Search } from 'lucide-react'
import { type Product, archiveProduct, restoreProduct } from './actions'
import { ProductModal } from './product-modal'
import { cn } from '@/lib/utils'

export function ProductsClient({ products }: { products: Product[] }) {
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [modalProduct, setModalProduct] = useState<Product | null | 'new'>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return products.filter((p) => {
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.sku ?? '').toLowerCase().includes(q) ||
        (p.barcode ?? '').toLowerCase().includes(q)
      const matchStatus = showArchived || p.status === 'active'
      return matchSearch && matchStatus
    })
  }, [products, search, showArchived])

  const handleArchive = (id: string) =>
    startTransition(() => archiveProduct(id))

  const handleRestore = (id: string) =>
    startTransition(() => restoreProduct(id))

  const columns = ['Наименование', 'SKU', 'Категория', 'Ед.мярка', 'Дост. цена', 'Прод. цена', 'Мин. кол.', 'Статус', '']

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Продукти</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {products.filter((p) => p.status === 'active').length} активни продукта
          </p>
        </div>
        <button
          onClick={() => setModalProduct('new')}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Нов продукт
        </button>
      </div>

      {/* Search + filter */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Търси по наименование, SKU или баркод…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="rounded border-gray-300"
          />
          Покажи архивирани
        </label>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center">
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    {search ? 'Няма намерени продукти' : 'Все още няма продукти'}
                  </p>
                  {!search && (
                    <p className="mt-1 text-xs text-gray-300 dark:text-gray-600">
                      Натисни &quot;Нов продукт&quot; за да добавиш първия
                    </p>
                  )}
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr
                  key={p.id}
                  className={cn(
                    'transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50',
                    p.status === 'archived' && 'opacity-50'
                  )}
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    {p.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                    {p.sku ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {p.category ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{p.unit}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {p.cost_price != null ? p.cost_price.toFixed(2) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {p.sale_price != null ? p.sale_price.toFixed(2) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {p.min_quantity}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                        p.status === 'active'
                          ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                      )}
                    >
                      {p.status === 'active' ? 'активен' : 'архивиран'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setModalProduct(p)}
                        className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                      >
                        Редактирай
                      </button>
                      {p.status === 'active' ? (
                        <button
                          onClick={() => handleArchive(p.id)}
                          disabled={isPending}
                          className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-50 dark:hover:text-red-400"
                        >
                          Архивирай
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRestore(p.id)}
                          disabled={isPending}
                          className="text-xs text-gray-400 hover:text-green-600 disabled:opacity-50 dark:hover:text-green-400"
                        >
                          Възстанови
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalProduct !== null && (
        <ProductModal
          product={modalProduct === 'new' ? null : modalProduct}
          onClose={() => setModalProduct(null)}
        />
      )}
    </div>
  )
}
