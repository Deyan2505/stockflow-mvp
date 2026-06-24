'use client'

import { useEffect, useState, useTransition } from 'react'
import { X } from 'lucide-react'
import {
  type Invoice,
  type InvoiceItem,
  type ProductForInvoice,
  getInvoiceItems,
  addInvoiceItem,
  updateInvoiceItem,
  removeInvoiceItem,
  issueInvoice,
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

  const [confirmIssue, setConfirmIssue] = useState(false)
  const [isIssuing, startIssue] = useTransition()

  useEffect(() => {
    let active = true
    getInvoiceItems(invoice.id).then((fresh) => {
      if (active) {
        setItems(fresh)
        setLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [invoice.id])

  const refresh = async () => {
    const fresh = await getInvoiceItems(invoice.id)
    setItems(fresh)
  }

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
            <p className="py-6 text-center text-sm text-gray-400">{s.itemsEmpty}</p>
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
