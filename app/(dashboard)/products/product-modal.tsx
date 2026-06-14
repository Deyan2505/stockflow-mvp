'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { type Product, type ProductInput, createProduct, updateProduct } from './actions'

type Props = {
  product: Product | null
  onClose: () => void
}

const empty: ProductInput = {
  name: '',
  sku: null,
  barcode: null,
  category: null,
  unit: 'бр.',
  min_quantity: 0,
  cost_price: null,
  sale_price: null,
}

function toInput(p: Product): ProductInput {
  return {
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
    category: p.category,
    unit: p.unit,
    min_quantity: p.min_quantity,
    cost_price: p.cost_price,
    sale_price: p.sale_price,
  }
}

export function ProductModal({ product, onClose }: Props) {
  const [form, setForm] = useState<ProductInput>(product ? toInput(product) : empty)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const set = <K extends keyof ProductInput>(key: K, val: ProductInput[K]) =>
    setForm((f) => ({ ...f, [key]: val }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Наименованието е задължително'); return }
    setError(null)

    startTransition(async () => {
      try {
        if (product) {
          await updateProduct(product.id, form)
        } else {
          await createProduct(form)
        }
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Грешка, опитай отново')
      }
    })
  }

  const field = (
    label: string,
    key: keyof ProductInput,
    opts?: { type?: string; required?: boolean; step?: string; min?: string; colSpan?: boolean }
  ) => (
    <div className={opts?.colSpan ? 'col-span-2' : ''}>
      <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
        {label} {opts?.required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={opts?.type ?? 'text'}
        step={opts?.step}
        min={opts?.min}
        required={opts?.required}
        value={(form[key] as string | number) ?? ''}
        onChange={(e) => {
          const v = e.target.value
          if (opts?.type === 'number') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            set(key, (v === '' ? null : parseFloat(v)) as any)
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            set(key, (v || null) as any)
          }
        }}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
      />
    </div>
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            {product ? 'Редактиране на продукт' : 'Нов продукт'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-2 gap-4">
            {field('Наименование', 'name', { required: true, colSpan: true })}
            {field('SKU', 'sku')}
            {field('Баркод', 'barcode')}
            {field('Категория', 'category')}
            {field('Ед. мярка', 'unit')}
            {field('Доставна цена', 'cost_price', { type: 'number', step: '0.01', min: '0' })}
            {field('Продажна цена', 'sale_price', { type: 'number', step: '0.01', min: '0' })}
            {field('Мин. количество', 'min_quantity', { type: 'number', min: '0' })}
          </div>

          {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Отказ
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? 'Запазване…' : product ? 'Запази' : 'Създай продукт'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
