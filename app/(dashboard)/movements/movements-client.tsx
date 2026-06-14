'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { submitMovement } from './actions'
import type { ProductOption, LocationOption, BalanceRow, Movement, MovementInput } from './actions'

type Props = {
  products: ProductOption[]
  locations: LocationOption[]
  movements: Movement[]
  balances: BalanceRow[]
}

type Tab = 'IN' | 'OUT' | 'TRANSFER'

type FormState = {
  product_id: string
  from_location_id: string
  to_location_id: string
  quantity: string
  note: string
}

function emptyForm(): FormState {
  return { product_id: '', from_location_id: '', to_location_id: '', quantity: '', note: '' }
}

const tabs: { id: Tab; label: string; btnClass: string }[] = [
  { id: 'IN', label: 'Вход', btnClass: 'bg-green-600 hover:bg-green-700' },
  { id: 'OUT', label: 'Изход', btnClass: 'bg-red-600 hover:bg-red-700' },
  { id: 'TRANSFER', label: 'Прехвърляне', btnClass: 'bg-blue-600 hover:bg-blue-700' },
]

const TYPE_BG: Record<string, string> = { IN: 'ВХОД', OUT: 'ИЗХОД', TRANSFER: 'ПРЕХВ.' }
const SUCCESS_BG: Record<Tab, string> = {
  IN: 'Входът е записан успешно',
  OUT: 'Изходът е записан успешно',
  TRANSFER: 'Прехвърлянето е записано успешно',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function MovementsClient({ products, locations, movements, balances }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('IN')
  const [form, setForm] = useState<FormState>(emptyForm())
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const activeProducts = useMemo(
    () => products.filter((p) => p.status === 'active'),
    [products]
  )
  const activeLocations = useMemo(
    () => locations.filter((l) => l.status === 'active'),
    [locations]
  )

  const balanceMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const b of balances) {
      map.set(`${b.product_id}:${b.location_id}`, Number(b.quantity_available))
    }
    return map
  }, [balances])

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])
  const locationMap = useMemo(() => new Map(locations.map((l) => [l.id, l])), [locations])

  const availableStock = useMemo(() => {
    if (!form.product_id || !form.from_location_id) return null
    return balanceMap.get(`${form.product_id}:${form.from_location_id}`) ?? 0
  }, [form.product_id, form.from_location_id, balanceMap])

  const set = (k: keyof FormState, v: string) => {
    setForm((f) => ({ ...f, [k]: v }))
    setError(null)
    setSuccess(null)
  }

  const handleTabChange = (t: Tab) => {
    setTab(t)
    setForm(emptyForm())
    setError(null)
    setSuccess(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const qty = Number(form.quantity)
    if (!form.product_id) { setError('Избери продукт'); return }
    if (isNaN(qty) || qty <= 0) { setError('Количеството трябва да е над 0'); return }
    if ((tab === 'OUT' || tab === 'TRANSFER') && !form.from_location_id) {
      setError('Избери изходна локация')
      return
    }
    if ((tab === 'IN' || tab === 'TRANSFER') && !form.to_location_id) {
      setError('Избери входна локация')
      return
    }
    if (tab === 'TRANSFER' && form.from_location_id === form.to_location_id) {
      setError('Изходната и входната локация трябва да са различни')
      return
    }

    const input: MovementInput = {
      movement_type: tab,
      product_id: form.product_id,
      from_location_id: tab === 'IN' ? null : form.from_location_id || null,
      to_location_id: tab === 'OUT' ? null : form.to_location_id || null,
      quantity: qty,
      note: form.note || null,
    }

    startTransition(async () => {
      try {
        await submitMovement(input)
        setSuccess(SUCCESS_BG[tab])
        setForm(emptyForm())
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Грешка, опитай отново')
      }
    })
  }

  const locationLabel = (l: LocationOption) =>
    `${l.warehouses?.name ?? '?'} / ${l.code}`

  const tabConfig = tabs.find((t) => t.id === tab)!

  const selectClass =
    'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white'

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Движения</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Запиши движения на стока: вход, изход или прехвърляне между локации
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* LEFT: Form */}
        <div className="col-span-1">
          {/* Tabs */}
          <div className="flex rounded-lg border border-gray-100 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-800">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => handleTabChange(t.id)}
                className={cn(
                  'flex-1 rounded-md py-1.5 text-xs font-medium transition-colors',
                  tab === t.id
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Form card */}
          <form
            onSubmit={handleSubmit}
            className="mt-4 rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="space-y-4">
              {/* Product */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  Продукт <span className="text-red-500">*</span>
                </label>
                {activeProducts.length === 0 ? (
                  <p className="text-xs text-red-500">Няма активни продукти. Първо създай продукт.</p>
                ) : (
                  <select
                    value={form.product_id}
                    onChange={(e) => set('product_id', e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Избери продукт…</option>
                    {activeProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.sku ? ` (${p.sku})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* From location — OUT + TRANSFER */}
              {(tab === 'OUT' || tab === 'TRANSFER') && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                    От локация <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.from_location_id}
                    onChange={(e) => set('from_location_id', e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Избери локация…</option>
                    {activeLocations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {locationLabel(l)}
                      </option>
                    ))}
                  </select>
                  {availableStock !== null && (
                    <p
                      className={cn(
                        'mt-1 text-xs',
                        availableStock === 0
                          ? 'text-red-500'
                          : 'text-gray-400 dark:text-gray-500'
                      )}
                    >
                      Налично: {availableStock}{' '}
                      {productMap.get(form.product_id)?.unit ?? ''}
                    </p>
                  )}
                </div>
              )}

              {/* To location — IN + TRANSFER */}
              {(tab === 'IN' || tab === 'TRANSFER') && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                    До локация <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.to_location_id}
                    onChange={(e) => set('to_location_id', e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Избери локация…</option>
                    {activeLocations
                      .filter((l) => l.id !== form.from_location_id)
                      .map((l) => (
                        <option key={l.id} value={l.id}>
                          {locationLabel(l)}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Quantity */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  Количество <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0.001"
                  step="any"
                  value={form.quantity}
                  onChange={(e) => set('quantity', e.target.value)}
                  placeholder="0"
                  className={selectClass}
                />
              </div>

              {/* Note */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  Забележка
                </label>
                <textarea
                  rows={2}
                  value={form.note}
                  onChange={(e) => set('note', e.target.value)}
                  placeholder="Незадължителна забележка…"
                  className={cn(selectClass, 'resize-none')}
                />
              </div>
            </div>

            {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
            {success && (
              <p className="mt-3 text-xs text-green-600 dark:text-green-400">{success}</p>
            )}

            <button
              type="submit"
              disabled={isPending || activeProducts.length === 0 || activeLocations.length === 0}
              className={cn(
                'mt-5 w-full rounded-lg py-2 text-sm font-medium text-white transition-colors disabled:opacity-50',
                tabConfig.btnClass
              )}
            >
              {isPending ? 'Записване…' : `Запиши ${tabConfig.label}`}
            </button>
          </form>
        </div>

        {/* RIGHT: History */}
        <div className="col-span-2">
          <div className="rounded-xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                История на движенията
                <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
                  {movements.length} записа
                </span>
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    {['Дата', 'Тип', 'Продукт', 'От', 'До', 'Кол.', 'Забележка'].map((col) => (
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
                  {movements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center">
                        <p className="text-sm text-gray-400 dark:text-gray-500">Все още няма движения</p>
                        <p className="mt-1 text-xs text-gray-300 dark:text-gray-600">
                          Всяко движение се записва тук завинаги
                        </p>
                      </td>
                    </tr>
                  ) : (
                    movements.map((m) => {
                      const product = productMap.get(m.product_id)
                      const fromLoc = m.from_location_id
                        ? locationMap.get(m.from_location_id)
                        : null
                      const toLoc = m.to_location_id
                        ? locationMap.get(m.to_location_id)
                        : null

                      return (
                        <tr
                          key={m.id}
                          className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(m.created_at)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                                m.movement_type === 'IN'
                                  ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                  : m.movement_type === 'OUT'
                                  ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                                  : 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                              )}
                            >
                              {TYPE_BG[m.movement_type] ?? m.movement_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                            {product?.name ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                            {fromLoc
                              ? `${fromLoc.warehouses?.name ?? '?'} / ${fromLoc.code}`
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                            {toLoc
                              ? `${toLoc.warehouses?.name ?? '?'} / ${toLoc.code}`
                              : '—'}
                          </td>
                          <td className="px-4 py-3 font-mono text-sm font-medium text-gray-900 dark:text-white">
                            {Number(m.quantity)}
                          </td>
                          <td className="max-w-[100px] truncate px-4 py-3 text-xs text-gray-400 dark:text-gray-500">
                            {m.note ?? '—'}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
