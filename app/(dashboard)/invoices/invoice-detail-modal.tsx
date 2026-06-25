'use client'

import { useEffect, useState, useTransition } from 'react'
import { X } from 'lucide-react'
import {
  type Invoice,
  type InvoiceItem,
  type ProductForInvoice,
  type InvoicePayment,
  type PaymentInput,
  type PaymentMethod,
  getInvoiceItems,
  getInvoicePayments,
  addInvoiceItem,
  updateInvoiceItem,
  removeInvoiceItem,
  importOrderItems,
  issueInvoice,
  recordPayment,
  deletePayment,
} from './actions'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'

const round2 = (n: number) => Math.round(n * 100) / 100
const fmt = (d: string | null) => (d ? d.split('-').reverse().join('.') : '—')

type AddForm = {
  product_id: string
  description: string
  qty: string
  unit_price: string
}

type EditForm = {
  description: string
  qty: string
  unit_price: string
}

type Props = {
  invoice: Invoice
  products: ProductForInvoice[]
  canManage: boolean
  canIssue: boolean
  onClose: (msg?: string) => void
  onEditHeader: () => void
}

export function InvoiceDetailModal({ invoice, products, canManage, canIssue, onClose, onEditHeader }: Props) {
  const { t } = useT()
  const s = t.invoices

  const canEdit = invoice.status === 'draft'

  const [items, setItems] = useState<InvoiceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState<string | null>(null)

  const [addForm, setAddForm] = useState<AddForm>({ product_id: '', description: '', qty: '', unit_price: '' })
  const [addError, setAddError] = useState<string | null>(null)
  const [isAdding, startAdd] = useTransition()

  const [editItemId, setEditItemId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ description: '', qty: '', unit_price: '' })
  const [editError, setEditError] = useState<string | null>(null)
  const [isSaving, startSave] = useTransition()

  const [isRemoving, startRemove] = useTransition()

  const [confirmImport, setConfirmImport] = useState(false)
  const [isImporting, startImport] = useTransition()

  const [confirmIssue, setConfirmIssue] = useState(false)
  const [isIssuing, startIssue] = useTransition()

  const [payments, setPayments] = useState<InvoicePayment[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)
  const [payForm, setPayForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method: 'bank_transfer' as PaymentMethod,
    note: '',
  })
  const [isRecording, startRecord] = useTransition()
  const [isDeletingPayment, startDeletePayment] = useTransition()

  useEffect(() => {
    let active = true
    getInvoiceItems(invoice.id).then((fresh) => {
      if (active) { setItems(fresh); setLoading(false) }
    })
    setPaymentsLoading(true)
    getInvoicePayments(invoice.id).then((data) => {
      if (active) { setPayments(data); setPaymentsLoading(false) }
    })
    return () => { active = false }
  }, [invoice.id])

  const refresh = async () => {
    const fresh = await getInvoiceItems(invoice.id)
    setItems(fresh)
  }

  const refreshPayments = async () => {
    setPaymentsLoading(true)
    try {
      const data = await getInvoicePayments(invoice.id)
      setPayments(data)
    } finally {
      setPaymentsLoading(false)
    }
  }

  const round2Local = (n: number) => Math.round(n * 100) / 100
  const amountPaid = round2Local(Number(invoice.amount_paid || 0))
  const balanceDue = Math.max(0, round2Local(Number(invoice.total || 0) - amountPaid))

  const subtotal = round2(items.reduce((sum, item) => sum + Number(item.amount), 0))
  const vatAmount = round2((subtotal * invoice.vat_rate) / 100)
  const total = round2(subtotal + vatAmount)

  const handleProductChange = (productId: string) => {
    setAddForm((f) => {
      const p = products.find((p) => p.id === productId)
      return { ...f, product_id: productId, description: f.description || (p ? p.name : '') }
    })
  }

  const validateItemForm = (description: string, qty: string, unit_price: string) => {
    if (!description.trim()) return s.itemErrDesc
    const qtyNum = parseFloat(qty)
    if (!qty || isNaN(qtyNum) || qtyNum <= 0) return s.itemErrQty
    const priceNum = parseFloat(unit_price)
    if (!unit_price || isNaN(priceNum) || priceNum < 0) return s.itemErrUnitPrice
    return null
  }

  const handleAdd = () => {
    const err = validateItemForm(addForm.description, addForm.qty, addForm.unit_price)
    if (err) { setAddError(err); return }
    setAddError(null)
    startAdd(async () => {
      const result = await addInvoiceItem(invoice.id, {
        product_id: addForm.product_id || null,
        description: addForm.description,
        quantity: parseFloat(addForm.qty),
        unit_price: parseFloat(addForm.unit_price),
      })
      if (!result.success) {
        const msg = result.error === 'errLocked' ? s.errLocked : result.error
        setActionError(msg)
        return
      }
      setAddForm({ product_id: '', description: '', qty: '', unit_price: '' })
      await refresh()
    })
  }

  const startEdit = (item: InvoiceItem) => {
    setEditItemId(item.id)
    setEditForm({
      description: item.description,
      qty: String(item.quantity),
      unit_price: String(item.unit_price),
    })
    setEditError(null)
  }

  const handleSave = (itemId: string) => {
    const err = validateItemForm(editForm.description, editForm.qty, editForm.unit_price)
    if (err) { setEditError(err); return }
    setEditError(null)
    startSave(async () => {
      const item = items.find((i) => i.id === itemId)
      const result = await updateInvoiceItem(itemId, {
        product_id: item?.product_id ?? null,
        description: editForm.description,
        quantity: parseFloat(editForm.qty),
        unit_price: parseFloat(editForm.unit_price),
      })
      if (!result.success) {
        const msg = result.error === 'errLocked' ? s.errLocked : result.error
        setActionError(msg)
        return
      }
      setEditItemId(null)
      await refresh()
    })
  }

  const handleRemove = (itemId: string) => {
    startRemove(async () => {
      const result = await removeInvoiceItem(itemId)
      if (!result.success) {
        const msg = result.error === 'errLocked' ? s.errLocked : result.error
        setActionError(msg)
        return
      }
      await refresh()
    })
  }

  const handleImport = () => {
    startImport(async () => {
      const result = await importOrderItems(invoice.id)
      if (!result.success) {
        const msg =
          result.error === 'errImportNotEmpty' ? s.errImportNotEmpty :
          result.error === 'errNoOrderLink'    ? s.errNoOrderLink :
          result.error === 'errNoOrderItems'   ? s.errNoOrderItems :
          result.error === 'errLocked'         ? s.errLocked :
          result.error
        setActionError(msg)
        setConfirmImport(false)
        return
      }
      setConfirmImport(false)
      await refresh()
    })
  }

  const handleIssue = () => {
    startIssue(async () => {
      const result = await issueInvoice(invoice.id)
      if (!result.success) {
        const msg =
          result.error === 'errIssueNoItems' ? s.errIssueNoItems :
          result.error === 'errLocked'       ? s.errLocked :
          result.error
        setActionError(msg)
        setConfirmIssue(false)
        return
      }
      onClose(s.successIssue)
    })
  }

  const paymentMethodLabel = (method: PaymentMethod) => {
    if (method === 'cash') return s.paymentMethodCash
    if (method === 'card') return s.paymentMethodCard
    if (method === 'other') return s.paymentMethodOther
    return s.paymentMethodBankTransfer
  }

  const paymentStatusLabel = (status: string) => {
    if (status === 'paid') return s.paymentStatusPaid
    if (status === 'partially_paid') return s.paymentStatusPartiallyPaid
    return s.paymentStatusUnpaid
  }

  const paymentStatusBadgeClass = (status: string) => {
    if (status === 'paid') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
    if (status === 'partially_paid') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
    return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
  }

  const handleRecordPayment = () => {
    setPayError(null)
    startRecord(async () => {
      const input: PaymentInput = {
        amount: Number(payForm.amount),
        payment_date: payForm.payment_date,
        payment_method: payForm.payment_method,
        note: payForm.note || null,
      }
      const result = await recordPayment(invoice.id, input)
      if (!result.success) {
        const msg =
          result.error === 'errOverpayment'        ? s.errOverpayment :
          result.error === 'errPaymentAmount'       ? s.errPaymentAmount :
          result.error === 'errPaymentNotIssued'    ? s.errPaymentNotIssued :
          result.error
        setPayError(msg)
        return
      }
      setPayForm({ amount: '', payment_date: new Date().toISOString().slice(0, 10), payment_method: 'bank_transfer', note: '' })
      await refreshPayments()
      await refresh()
    })
  }

  const handleDeletePayment = (paymentId: string) => {
    startDeletePayment(async () => {
      const result = await deletePayment(paymentId)
      if (!result.success) {
        const msg = result.error === 'errPaymentNotIssued' ? s.errPaymentNotIssued : result.error
        setPayError(msg)
        return
      }
      await refreshPayments()
      await refresh()
    })
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

  const addAmountPreview =
    addForm.qty && addForm.unit_price
      ? round2(parseFloat(addForm.qty || '0') * parseFloat(addForm.unit_price || '0'))
      : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {s.detailTitle}
              </h2>
              <span
                className={cn(
                  'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                  statusBadgeClass(invoice.status)
                )}
              >
                {statusLabel(invoice.status)}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {invoice.invoice_number}
              {invoice.customers?.name ? ` · ${invoice.customers.name}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canManage && canEdit && !confirmIssue && (
              <button
                onClick={onEditHeader}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                {s.modalEditTitle}
              </button>
            )}
            {canIssue && canEdit && !confirmIssue && (
              <button
                onClick={() => setConfirmIssue(true)}
                className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
              >
                {s.issueAction}
              </button>
            )}
            <button
              onClick={() => onClose()}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Issue confirmation strip */}
        {confirmIssue && (
          <div className="border-b border-amber-100 bg-amber-50 px-6 py-3 dark:border-amber-900/30 dark:bg-amber-900/10">
            <p className="mb-2 text-xs text-amber-700 dark:text-amber-400">{s.issueConfirm}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleIssue}
                disabled={isIssuing}
                className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {isIssuing ? s.issuing : s.issueAction}
              </button>
              <button
                onClick={() => setConfirmIssue(false)}
                className="text-xs text-gray-500 hover:underline dark:text-gray-400"
              >
                {s.cancel}
              </button>
            </div>
          </div>
        )}

        {/* Summary strip */}
        <div className="flex flex-wrap gap-x-6 gap-y-1 border-b border-gray-50 bg-gray-50/50 px-6 py-3 text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-800/30 dark:text-gray-400">
          <span>{s.fInvoiceDate}: <strong className="text-gray-700 dark:text-gray-300">{fmt(invoice.invoice_date)}</strong></span>
          <span>{s.fDueDate}: <strong className="text-gray-700 dark:text-gray-300">{fmt(invoice.due_date)}</strong></span>
          <span>{s.fVatRate}: <strong className="text-gray-700 dark:text-gray-300">{invoice.vat_rate}%</strong></span>
          {invoice.note && (
            <span>{s.fNote}: <strong className="text-gray-700 dark:text-gray-300">{invoice.note}</strong></span>
          )}
          {invoice.outgoing_orders && (
            <span>
              {s.orderRefLabel}:{' '}
              <strong className="text-gray-700 dark:text-gray-300">
                {invoice.outgoing_orders.order_number}
                {invoice.outgoing_orders.customer_name ? ` — ${invoice.outgoing_orders.customer_name}` : ''}
              </strong>
            </span>
          )}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {actionError && (
            <div className="mb-3 flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-400">
              {actionError}
              <button onClick={() => setActionError(null)} className="ml-2 underline opacity-70 hover:opacity-100">
                {s.close}
              </button>
            </div>
          )}

          {/* Status notice */}
          {invoice.status === 'issued' && (
            <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
              {s.itemLockedNote}
            </div>
          )}
          {invoice.status === 'cancelled' && (
            <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-400">
              {s.itemCancelledNote}
            </div>
          )}

          {/* Items section */}
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            {s.itemsTitle}
          </h3>

          {loading ? (
            <p className="py-6 text-center text-sm text-gray-400">{s.loading}</p>
          ) : items.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-gray-400 dark:text-gray-500">{s.itemsEmpty}</p>
              {canManage && canEdit && invoice.outgoing_order_id && !confirmImport && (
                <button
                  onClick={() => setConfirmImport(true)}
                  className="mt-3 text-xs text-blue-600 hover:underline dark:text-blue-400"
                >
                  {s.importBtn}
                </button>
              )}
              {canManage && canEdit && invoice.outgoing_order_id && confirmImport && (
                <div className="mt-3 space-y-2 px-4">
                  <p className="text-xs text-amber-700 dark:text-amber-400">{s.importConfirm}</p>
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={handleImport}
                      disabled={isImporting}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isImporting ? s.importing : s.importBtn}
                    </button>
                    <button
                      onClick={() => setConfirmImport(false)}
                      className="text-xs text-gray-400 hover:underline dark:text-gray-500"
                    >
                      {s.cancel}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mb-4 rounded-lg border border-gray-100 dark:border-gray-800">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="px-3 py-2 text-left font-medium text-gray-400">{s.itemColDescription}</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-400">{s.itemColQty}</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-400">{s.itemColUnitPrice}</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-400">{s.itemColAmount}</th>
                    {canManage && canEdit && <th className="px-3 py-2" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {items.map((item) =>
                    editItemId === item.id ? (
                      <tr key={item.id} className="bg-blue-50/40 dark:bg-blue-900/10">
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={editForm.description}
                            onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                            className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                          />
                          {editError && <p className="mt-1 text-red-500">{editError}</p>}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0.001"
                            step="any"
                            value={editForm.qty}
                            onChange={(e) => setEditForm((f) => ({ ...f, qty: e.target.value }))}
                            className="w-20 rounded border border-gray-200 px-2 py-1 text-right text-xs focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editForm.unit_price}
                            onChange={(e) => setEditForm((f) => ({ ...f, unit_price: e.target.value }))}
                            className="w-24 rounded border border-gray-200 px-2 py-1 text-right text-xs focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                          />
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-500">
                          {editForm.qty && editForm.unit_price
                            ? round2(parseFloat(editForm.qty || '0') * parseFloat(editForm.unit_price || '0')).toFixed(2)
                            : '—'}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSave(item.id)}
                              disabled={isSaving}
                              className="text-xs text-blue-600 hover:underline disabled:opacity-50 dark:text-blue-400"
                            >
                              {isSaving ? s.saving : s.save}
                            </button>
                            <button
                              onClick={() => setEditItemId(null)}
                              className="text-xs text-gray-400 hover:underline"
                            >
                              {s.cancel}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-3 py-2 text-gray-900 dark:text-white">
                          <div>{item.description}</div>
                          {item.products?.name && item.products.name !== item.description && (
                            <div className="mt-0.5 text-gray-400 dark:text-gray-500">{item.products.name}</div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-500">{item.quantity}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-500">{Number(item.unit_price).toFixed(2)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-900 dark:text-white">{Number(item.amount).toFixed(2)}</td>
                        {canManage && canEdit && (
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => startEdit(item)}
                                className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                              >
                                {s.edit}
                              </button>
                              <button
                                onClick={() => handleRemove(item.id)}
                                disabled={isRemoving}
                                className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-50 dark:hover:text-red-400"
                              >
                                {s.remove}
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals */}
          <div className="mb-4 space-y-1 rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/30">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{s.subtotalLabel}</span>
              <span className="tabular-nums">{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{s.vatLabel(invoice.vat_rate)}</span>
              <span className="tabular-nums">{vatAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-1 text-sm font-semibold text-gray-900 dark:border-gray-700 dark:text-white">
              <span>{s.totalLabel}</span>
              <span className="tabular-nums">{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payments section — visible for all users on issued invoices */}
          {invoice.status === 'issued' && (
            <div className="mb-4">
              {/* Payment summary */}
              <div className="mb-3 flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/30">
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span>{s.paymentAmountPaid}: <strong className="tabular-nums text-gray-800 dark:text-gray-200">{amountPaid.toFixed(2)}</strong></span>
                  <span>{s.paymentBalanceDue}: <strong className="tabular-nums text-gray-800 dark:text-gray-200">{balanceDue.toFixed(2)}</strong></span>
                </div>
                <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium', paymentStatusBadgeClass(invoice.payment_status ?? 'unpaid'))}>
                  {paymentStatusLabel(invoice.payment_status ?? 'unpaid')}
                </span>
              </div>

              {/* Payments list */}
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                {s.paymentsTitle}
              </h3>

              {payError && (
                <div className="mb-2 flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-400">
                  {payError}
                  <button onClick={() => setPayError(null)} className="ml-2 underline opacity-70 hover:opacity-100">{s.close}</button>
                </div>
              )}

              {paymentsLoading ? (
                <p className="py-3 text-center text-xs text-gray-400">{s.loading}</p>
              ) : payments.length === 0 ? (
                <p className="py-3 text-center text-xs text-gray-400 dark:text-gray-500">{s.paymentsEmpty}</p>
              ) : (
                <div className="mb-3 rounded-lg border border-gray-100 dark:border-gray-800">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <th className="px-3 py-2 text-left font-medium text-gray-400">{s.paymentDate}</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-400">{s.paymentAmount}</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-400">{s.paymentMethod}</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-400">{s.fNote}</th>
                        {canManage && <th className="px-3 py-2" />}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="px-3 py-2 tabular-nums text-gray-500">{fmt(p.payment_date)}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-gray-900 dark:text-white">{Number(p.amount).toFixed(2)}</td>
                          <td className="px-3 py-2 text-gray-500">{paymentMethodLabel(p.payment_method)}</td>
                          <td className="px-3 py-2 text-gray-400">{p.note ?? '—'}</td>
                          {canManage && (
                            <td className="px-3 py-2">
                              <button
                                onClick={() => handleDeletePayment(p.id)}
                                disabled={isDeletingPayment}
                                className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-50 dark:hover:text-red-400"
                              >
                                {s.deletePayment}
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Record payment form */}
              {canManage && balanceDue > 0 && (
                <div className="rounded-lg border border-dashed border-gray-200 px-4 py-3 dark:border-gray-700">
                  <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">{s.recordPayment}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      value={payForm.payment_date}
                      onChange={(e) => setPayForm((f) => ({ ...f, payment_date: e.target.value }))}
                      className="rounded border border-gray-200 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={balanceDue}
                      placeholder={s.paymentAmount}
                      value={payForm.amount}
                      onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
                      className="w-28 rounded border border-gray-200 px-2 py-1.5 text-right text-xs focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
                    />
                    <select
                      value={payForm.payment_method}
                      onChange={(e) => setPayForm((f) => ({ ...f, payment_method: e.target.value as PaymentMethod }))}
                      className="rounded border border-gray-200 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    >
                      <option value="bank_transfer">{s.paymentMethodBankTransfer}</option>
                      <option value="cash">{s.paymentMethodCash}</option>
                      <option value="card">{s.paymentMethodCard}</option>
                      <option value="other">{s.paymentMethodOther}</option>
                    </select>
                    <input
                      type="text"
                      placeholder={s.paymentNote}
                      value={payForm.note}
                      onChange={(e) => setPayForm((f) => ({ ...f, note: e.target.value }))}
                      className="flex-1 rounded border border-gray-200 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
                    />
                    <button
                      onClick={handleRecordPayment}
                      disabled={isRecording || !payForm.amount}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isRecording ? s.saving : s.recordPayment}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Add item form */}
          {canManage && canEdit && (
            <div className="rounded-lg border border-dashed border-gray-200 px-4 py-3 dark:border-gray-700">
              <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">{s.itemAddTitle}</p>
              <div className="mb-2 grid grid-cols-2 gap-2">
                <select
                  value={addForm.product_id}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="rounded border border-gray-200 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <option value="">{s.itemSelectProduct}</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.unit ? ` (${p.unit})` : ''}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder={s.itemDescPlaceholder}
                  value={addForm.description}
                  onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))}
                  className="rounded border border-gray-200 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.001"
                  step="any"
                  placeholder={s.itemQtyPlaceholder}
                  value={addForm.qty}
                  onChange={(e) => setAddForm((f) => ({ ...f, qty: e.target.value }))}
                  className="w-24 rounded border border-gray-200 px-2 py-1.5 text-right text-xs focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={s.itemUnitPricePlaceholder}
                  value={addForm.unit_price}
                  onChange={(e) => setAddForm((f) => ({ ...f, unit_price: e.target.value }))}
                  className="w-28 rounded border border-gray-200 px-2 py-1.5 text-right text-xs focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
                />
                {addAmountPreview !== null && (
                  <span className="text-xs tabular-nums text-gray-400">= {addAmountPreview.toFixed(2)}</span>
                )}
                <div className="ml-auto">
                  <button
                    onClick={handleAdd}
                    disabled={isAdding}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isAdding ? s.adding : s.itemAddBtn}
                  </button>
                </div>
              </div>
              {addError && <p className="mt-1.5 text-xs text-red-500">{addError}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-gray-100 px-6 py-4 dark:border-gray-800">
          <button
            onClick={() => onClose()}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            {s.close}
          </button>
        </div>
      </div>
    </div>
  )
}
