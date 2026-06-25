'use client'

import { useState, useTransition, useMemo } from 'react'
import { Search } from 'lucide-react'
import { type Invoice, type InvoiceResult, type CustomerOption, type ProductForInvoice, type OrderForInvoice, cancelInvoice } from './actions'
import { InvoiceModal } from './invoice-modal'
import { InvoiceDetailModal } from './invoice-detail-modal'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'

type StatusFilter = 'all' | 'draft' | 'issued' | 'cancelled'

const fmt = (d: string | null) => (d ? d.split('-').reverse().join('.') : '—')

export function InvoicesClient({
  invoices,
  customers,
  products,
  orders,
  canManage,
  canIssue,
}: {
  invoices: Invoice[]
  customers: CustomerOption[]
  products: ProductForInvoice[]
  orders: OrderForInvoice[]
  canManage: boolean
  canIssue: boolean
}) {
  const { t } = useT()
  const s = t.invoices

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [modal, setModal] = useState<Invoice | null | 'new'>(null)
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: s.filterAll },
    { value: 'draft', label: s.statusDraft },
    { value: 'issued', label: s.statusIssued },
    { value: 'cancelled', label: s.statusCancelled },
  ]

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return invoices.filter((item) => {
      const matchSearch =
        !q ||
        item.invoice_number.toLowerCase().includes(q) ||
        (item.customers?.name ?? '').toLowerCase().includes(q)
      const matchStatus = statusFilter === 'all' || item.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [invoices, search, statusFilter])

  const canEditInvoice = (inv: Invoice) => inv.status === 'draft'

  const handleCancel = (id: string) => {
    startTransition(async () => {
      const result: InvoiceResult = await cancelInvoice(id)
      if (!result.success) {
        const errMsg = result.error === 'errLocked' ? s.errLocked : result.error
        setActionError(errMsg)
        return
      }
      setSuccessMsg(s.successCancel)
      setTimeout(() => setSuccessMsg(null), 3500)
    })
  }

  const handleModalClose = (msg?: string) => {
    setModal(null)
    if (msg) {
      setSuccessMsg(msg)
      setTimeout(() => setSuccessMsg(null), 3500)
    }
  }

  const statusBadgeClass = (status: string) => {
    if (status === 'draft') return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
    if (status === 'issued') return 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
    return 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
  }

  const statusLabel = (status: string) => {
    if (status === 'draft') return s.statusDraft
    if (status === 'issued') return s.statusIssued
    return s.statusCancelled
  }

  const paymentStatusLabel = (status?: string | null) => {
    if (status === 'paid') return s.paymentStatusPaid
    if (status === 'partially_paid') return s.paymentStatusPartiallyPaid
    return s.paymentStatusUnpaid
  }

  const paymentStatusClass = (status?: string | null) => {
    if (status === 'paid') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
    if (status === 'partially_paid') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
    return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{s.title}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {s.activeCount(invoices.length)}
          </p>
        </div>
        {canManage ? (
          <button
            onClick={() => setModal('new')}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {s.newBtn}
          </button>
        ) : (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
            {t.common.readOnly}
          </span>
        )}
      </div>

      {successMsg && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900/30 dark:bg-green-900/10 dark:text-green-400">
          {successMsg}
          <button onClick={() => setSuccessMsg(null)} className="ml-3 text-xs underline opacity-70 hover:opacity-100">
            {s.close}
          </button>
        </div>
      )}

      {actionError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
          {actionError}
          <button onClick={() => setActionError(null)} className="ml-3 text-xs underline opacity-70 hover:opacity-100">
            {s.close}
          </button>
        </div>
      )}

      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={s.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-lg border border-gray-200 py-2 pl-3 pr-8 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              {s.cols.map((col) => (
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
                <td colSpan={s.cols.length} className="px-4 py-16 text-center">
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    {search || statusFilter !== 'all' ? s.noResults : s.noItems}
                  </p>
                  {!search && statusFilter === 'all' && (
                    <p className="mt-1 text-xs text-gray-300 dark:text-gray-600">{s.addFirst}</p>
                  )}
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    {item.invoice_number}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {item.customers?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {fmt(item.invoice_date)}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {fmt(item.due_date)}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {item.vat_rate}%
                  </td>
                  <td className="px-4 py-3 tabular-nums text-gray-900 dark:text-white">
                    {item.total.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-1">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                          statusBadgeClass(item.status)
                        )}
                      >
                        {statusLabel(item.status)}
                      </span>
                      {item.status === 'issued' && item.payment_status && (
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium',
                            paymentStatusClass(item.payment_status)
                          )}
                        >
                          {paymentStatusLabel(item.payment_status)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setDetailInvoice(item)}
                        className="text-xs text-gray-500 hover:underline dark:text-gray-400"
                      >
                        {s.detail}
                      </button>
                      {canManage && canEditInvoice(item) && (
                        <>
                          <button
                            onClick={() => setModal(item)}
                            className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                          >
                            {s.edit}
                          </button>
                          <button
                            onClick={() => handleCancel(item.id)}
                            disabled={isPending}
                            className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-50 dark:hover:text-red-400"
                          >
                            {s.cancelAction}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {canManage && modal !== null && (
        <InvoiceModal
          invoice={modal === 'new' ? null : modal}
          customers={customers}
          orders={orders}
          onClose={handleModalClose}
        />
      )}

      {detailInvoice !== null && (
        <InvoiceDetailModal
          invoice={detailInvoice}
          products={products}
          canManage={canManage}
          canIssue={canIssue}
          onClose={(msg) => {
            setDetailInvoice(null)
            if (msg) {
              setSuccessMsg(msg)
              setTimeout(() => setSuccessMsg(null), 3500)
            }
          }}
          onEditHeader={() => {
            const inv = detailInvoice
            setDetailInvoice(null)
            setModal(inv)
          }}
        />
      )}
    </div>
  )
}
