'use client'

import { useState, useTransition, useRef, useCallback } from 'react'
import { Search, X, Package, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { lookupByBarcode, type LookupResult } from '@/lib/barcode-utils'
import { useT, type T } from '@/lib/i18n'
import { cn } from '@/lib/utils'

// ── State ──────────────────────────────────────────────────────────────────────

type ScanState =
  | { kind: 'idle' }
  | { kind: 'notFound'; barcode: string }
  | { kind: 'found'; result: LookupResult }

// ── Main component ─────────────────────────────────────────────────────────────

export function ScanClient() {
  const { t } = useT()
  const s = t.scan

  const [input, setInput]     = useState('')
  const [state, setState]     = useState<ScanState>({ kind: 'idle' })
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSearch = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed) return
    startTransition(async () => {
      const result = await lookupByBarcode(trimmed)
      setState(result ? { kind: 'found', result } : { kind: 'notFound', barcode: trimmed })
    })
  }, [input])

  const handleClear = () => {
    setInput('')
    setState({ kind: 'idle' })
    inputRef.current?.focus()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{s.title}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{s.subtitle}</p>
      </div>

      {/* Scan input */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {s.inputLabel}
        </label>
        <div className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={s.inputPlaceholder}
            autoFocus
            autoComplete="off"
            className="flex-1 rounded-xl border border-gray-200 px-4 py-3 font-mono text-base focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
          />
          <button
            onClick={handleSearch}
            disabled={isPending || !input.trim()}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Search className="h-4 w-4" />
            {s.btnSearch}
          </button>
          <button
            onClick={handleClear}
            className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <X className="h-4 w-4" />
            {s.btnClear}
          </button>
        </div>
      </div>

      {/* Loading */}
      {isPending && (
        <div className="flex items-center gap-3 rounded-xl bg-blue-50 px-5 py-4 text-sm text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          {s.searching}
        </div>
      )}

      {/* Not found */}
      {!isPending && state.kind === 'notFound' && (
        <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
          <XCircle className="h-4 w-4 shrink-0" />
          {s.notFound}
        </div>
      )}

      {/* Found */}
      {!isPending && state.kind === 'found' && (
        <ProductResult result={state.result} s={s} />
      )}
    </div>
  )
}

// ── Product result ─────────────────────────────────────────────────────────────

function ProductResult({ result, s }: { result: LookupResult; s: T['scan'] }) {
  const { product, totalQty, balances } = result

  const isOut  = totalQty === 0
  const isLow  = !isOut && product.min_quantity > 0 && totalQty < Number(product.min_quantity)

  const statusLabel = isOut ? s.statusOut : isLow ? s.statusLow : s.statusOk
  const StatusIcon  = isOut ? XCircle : isLow ? AlertTriangle : CheckCircle
  const statusCls   = isOut
    ? 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400'
    : isLow
    ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400'
    : 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400'

  return (
    <div className="space-y-4">
      {/* Product card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40">
              <Package className="h-5 w-5 text-indigo-600 dark:text-indigo-400" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500">{s.resultTitle}</p>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{product.name}</h2>
            </div>
          </div>
          <span className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium', statusCls)}>
            <StatusIcon className="h-4 w-4" />
            {statusLabel}
          </span>
        </div>

        {/* Product meta */}
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label={s.labelSku}     value={product.sku     ?? '—'} mono />
          <Field label={s.labelBarcode} value={product.barcode ?? '—'} mono />
          <Field label={s.labelUnit}    value={product.unit} />
          <Field label={s.labelMinQty}  value={Number(product.min_quantity) > 0 ? String(product.min_quantity) : '—'} />
        </div>

        {/* Total qty */}
        <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800/60">
          <p className="text-xs text-gray-400 dark:text-gray-500">{s.labelTotalQty}</p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
            {totalQty.toLocaleString()}
            <span className="ml-1.5 text-sm font-normal text-gray-400">{product.unit}</span>
          </p>
        </div>
      </div>

      {/* Inventory by location */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <p className="mb-4 text-sm font-semibold text-gray-800 dark:text-white">{s.stockTitle}</p>
        {balances.length === 0 ? (
          <div className="rounded-xl bg-gray-50 px-4 py-8 text-center dark:bg-gray-800/50">
            <p className="text-sm text-gray-400 dark:text-gray-500">{s.noStock}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="pb-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-400">{s.colWarehouse}</th>
                  <th className="pb-2.5 pl-4 text-left text-xs font-medium uppercase tracking-wide text-gray-400">{s.colLocation}</th>
                  <th className="pb-2.5 pl-4 text-right text-xs font-medium uppercase tracking-wide text-gray-400">{s.colQty}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {balances.map((b, i) => (
                  <tr key={i}>
                    <td className="py-2.5 text-gray-700 dark:text-gray-300">{b.warehouse_name}</td>
                    <td className="py-2.5 pl-4 font-mono text-xs text-gray-500 dark:text-gray-400">{b.location_code}</td>
                    <td className="py-2.5 pl-4 text-right font-semibold tabular-nums text-gray-800 dark:text-gray-200">
                      {b.quantity_available.toLocaleString()}
                      <span className="ml-1 text-xs font-normal text-gray-400">{b.unit}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Helper ─────────────────────────────────────────────────────────────────────

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
      <p className={cn('mt-0.5 text-sm font-medium text-gray-800 dark:text-gray-200', mono && 'font-mono')}>{value}</p>
    </div>
  )
}
