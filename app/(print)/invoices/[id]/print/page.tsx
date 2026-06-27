export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentRole } from '@/lib/current-user'
import { can } from '@/lib/permissions'
import { PrintButton } from './print-button'

const CO = process.env.DEMO_COMPANY_ID!

const fmtDate = (d?: string | null) =>
  d ? d.split('-').reverse().join('.') : '—'

const money = (v: number | string | null | undefined) =>
  `${Number(v || 0).toFixed(2)} €`

const paymentStatusLabel = (status?: string | null) => {
  if (status === 'paid') return 'Платена'
  if (status === 'partially_paid') return 'Частично платена'
  return 'Неплатена'
}

// Bulgarian amount-in-words for EUR (MVP: numeric cents, words for euros only)
function amountInWords(total: number): string {
  const totalCents = Math.round(total * 100)
  const euros = Math.floor(totalCents / 100)
  const cents = totalCents % 100

  const ONES  = ['', 'едно', 'две', 'три', 'четири', 'пет', 'шест', 'седем', 'осем', 'девет']
  const TEENS = ['десет', 'единадесет', 'дванадесет', 'тринадесет', 'четиринадесет',
                 'петнадесет', 'шестнадесет', 'седемнадесет', 'осемнадесет', 'деветнадесет']
  const TENS  = ['', '', 'двадесет', 'тридесет', 'четиридесет', 'петдесет',
                 'шестдесет', 'седемдесет', 'осемдесет', 'деветдесет']
  const HUNDS = ['', 'сто', 'двеста', 'триста', 'четиристотин', 'петстотин',
                 'шестстотин', 'седемстотин', 'осемстотин', 'деветстотин']

  const sub100 = (n: number): string => {
    if (n === 0) return ''
    if (n < 10) return ONES[n]
    if (n < 20) return TEENS[n - 10]
    const o = n % 10
    return o ? `${TENS[Math.floor(n / 10)]} и ${ONES[o]}` : TENS[Math.floor(n / 10)]
  }

  const sub1000 = (n: number): string => {
    const h = Math.floor(n / 100)
    const r = n % 100
    if (!h) return sub100(r)
    if (!r) return HUNDS[h]
    return `${HUNDS[h]}${r < 20 ? ' и ' : ' '}${sub100(r)}`
  }

  if (!euros) return `НУЛА ЕВРО${cents ? ` И ${cents} ЦЕНТА` : ''}`

  const th  = Math.floor(euros / 1000)
  const rem = euros % 1000
  const parts: string[] = []

  if (th) parts.push(th === 1 ? 'хиляда' : `${sub100(th)} хиляди`)
  if (rem) parts.push(sub1000(rem))

  const sep = th && rem && rem < 100 ? ' и ' : ' '
  const euroWords = (th && rem ? parts.join(sep) : parts.join('')).trim()

  return `${euroWords.toUpperCase()} ЕВРО${cents ? ` И ${cents} ЦЕНТА` : ''}`
}

type CustomerJoin = {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  eik: string | null
  vat_number: string | null
  mol: string | null
} | null

type OrderJoin = {
  id: string
  order_number: string
  customer_name: string | null
} | null

type InvoiceRow = {
  id: string
  invoice_number: string
  status: string
  invoice_date: string
  due_date: string | null
  note: string | null
  subtotal: number
  vat_rate: number
  vat_amount: number
  total: number
  amount_paid: number
  payment_status: string
  customers: CustomerJoin
  outgoing_orders: OrderJoin
}

type ItemRow = {
  id: string
  description: string
  quantity: number
  unit_price: number
  amount: number
  products: { name: string; unit: string | null } | null
}

export default async function InvoicePrintPage({ params }: { params: { id: string } }) {
  const role = await getCurrentRole()

  if (!can(role, 'manage_invoices')) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-8">
        <div className="text-center">
          <p className="text-sm text-gray-600">Нямате достъп до тази страница.</p>
          <Link href="/invoices" className="mt-4 inline-block text-sm text-blue-600 underline">
            ← Назад към фактури
          </Link>
        </div>
      </div>
    )
  }

  const sb = createAdminClient()
  const { id } = params

  const [{ data: rawInvoice }, { data: rawItems }] = await Promise.all([
    sb
      .from('invoices')
      .select('*, customers(id, name, email, phone, address, eik, vat_number, mol), outgoing_orders(id, order_number, customer_name)')
      .eq('id', id)
      .eq('company_id', CO)
      .single(),
    sb
      .from('invoice_items')
      .select('*, products(name, unit)')
      .eq('invoice_id', id)
      .eq('company_id', CO)
      .order('created_at', { ascending: true }),
  ])

  if (!rawInvoice) notFound()

  const invoice = rawInvoice as unknown as InvoiceRow
  const items   = (rawItems ?? []) as unknown as ItemRow[]

  // Issuer identity — env vars, all optional (empty string = omit the line)
  const issuer = {
    name:    process.env.NEXT_PUBLIC_COMPANY_NAME    || 'StockFlow Demo',
    address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || '',
    eik:     process.env.NEXT_PUBLIC_COMPANY_EIK     || '',
    vat:     process.env.NEXT_PUBLIC_COMPANY_VAT     || '',
    mol:     process.env.NEXT_PUBLIC_COMPANY_MOL     || '',
    email:   process.env.NEXT_PUBLIC_COMPANY_EMAIL   || '',
    phone:   process.env.NEXT_PUBLIC_COMPANY_PHONE   || '',
    bank:    process.env.NEXT_PUBLIC_COMPANY_BANK    || '',
    iban:    process.env.NEXT_PUBLIC_COMPANY_IBAN    || '',
    bic:     process.env.NEXT_PUBLIC_COMPANY_BIC     || '',
  }

  const customer    = invoice.customers
  const linkedOrder = invoice.outgoing_orders
  const balanceDue  = Math.max(
    0,
    Math.round((Number(invoice.total || 0) - Number(invoice.amount_paid || 0)) * 100) / 100,
  )

  return (
    <>
      <style>{`
        @media print {
          @page { margin: 1.5cm; size: A4; }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>

      <div className="mx-auto max-w-3xl bg-white p-8 text-gray-900 print:p-0">

        {/* Screen-only toolbar */}
        <div className="mb-6 flex items-center gap-4 border-b border-gray-100 pb-4 print:hidden">
          <PrintButton label="Печат / Запази PDF" />
          <Link href="/invoices" className="text-sm text-gray-500 hover:underline">
            ← Назад към фактури
          </Link>
        </div>

        {/* Cancelled banner */}
        {invoice.status === 'cancelled' && (
          <div className="mb-6 rounded-lg border-2 border-red-500 bg-red-50 px-6 py-4 text-center">
            <p className="text-lg font-bold tracking-wide text-red-700">
              АНУЛИРАНА ФАКТУРА / CANCELLED INVOICE
            </p>
          </div>
        )}

        {/* Document header: issuer (left) + invoice meta (right) */}
        <div className="mb-6 grid grid-cols-2 gap-8 border-b border-gray-200 pb-6">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              От / Издател
            </p>
            <p className="font-semibold text-gray-900">{issuer.name}</p>
            {issuer.address && <p className="text-sm text-gray-600">{issuer.address}</p>}
            {issuer.eik     && <p className="text-sm text-gray-600">ЕИК: {issuer.eik}</p>}
            {issuer.vat     && <p className="text-sm text-gray-600">ДДС №: {issuer.vat}</p>}
            {issuer.mol     && <p className="text-sm text-gray-600">МОЛ: {issuer.mol}</p>}
            {issuer.email   && <p className="text-sm text-gray-600">{issuer.email}</p>}
            {issuer.phone   && <p className="text-sm text-gray-600">{issuer.phone}</p>}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">ФАКТУРА</p>
            <p className="text-xs text-gray-400">(Оригинал)</p>
            <p className="mt-2 text-sm text-gray-600">№ {invoice.invoice_number}</p>
            <p className="text-sm text-gray-600">Дата на издаване: {fmtDate(invoice.invoice_date)}</p>
            <p className="text-sm text-gray-600">Данъчно събитие: {fmtDate(invoice.invoice_date)}</p>
            {invoice.due_date && (
              <p className="text-sm text-gray-600">Краен срок: {fmtDate(invoice.due_date)}</p>
            )}
          </div>
        </div>

        {/* Recipient section */}
        <div className="mb-8 rounded-lg border border-gray-200 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            До / Получател
          </p>
          <p className="font-semibold text-gray-900">{customer?.name ?? '—'}</p>
          {customer?.address    && <p className="text-sm text-gray-600">{customer.address}</p>}
          {customer?.eik        && <p className="text-sm text-gray-600">ЕИК: {customer.eik}</p>}
          {customer?.vat_number && <p className="text-sm text-gray-600">ДДС №: {customer.vat_number}</p>}
          {customer?.mol        && <p className="text-sm text-gray-600">МОЛ: {customer.mol}</p>}
          {customer?.email      && <p className="text-sm text-gray-600">{customer.email}</p>}
          {customer?.phone      && <p className="text-sm text-gray-600">{customer.phone}</p>}
          {linkedOrder && (
            <p className="mt-2 border-t border-gray-100 pt-2 text-xs text-gray-500">
              Поръчка:{' '}
              <span className="font-medium">{linkedOrder.order_number}</span>
              {linkedOrder.customer_name ? ` — ${linkedOrder.customer_name}` : ''}
            </p>
          )}
        </div>

        {/* Items table */}
        <table className="mb-2 w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">#</th>
              <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Описание</th>
              <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Кол.</th>
              <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Ед. цена</th>
              <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Сума</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 text-center text-sm text-gray-400">Няма артикули</td>
              </tr>
            ) : (
              items.map((item, i) => (
                <tr key={item.id}>
                  <td className="py-2 pr-3 text-gray-400">{i + 1}</td>
                  <td className="py-2 text-gray-900">{item.description}</td>
                  <td className="py-2 text-right tabular-nums text-gray-700">{item.quantity}</td>
                  <td className="py-2 text-right tabular-nums text-gray-700">{money(item.unit_price)}</td>
                  <td className="py-2 text-right tabular-nums font-medium text-gray-900">{money(item.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Amount in words */}
        <p className="mb-6 border-t border-gray-100 pt-2 text-xs uppercase tracking-wide text-gray-400">
          {amountInWords(Number(invoice.total || 0))}
        </p>

        {/* Totals */}
        <div className="mb-8 flex justify-end">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Нето:</span>
              <span className="tabular-nums">{money(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>ДДС {invoice.vat_rate}%:</span>
              <span className="tabular-nums">{money(invoice.vat_amount)}</span>
            </div>
            <div className="flex justify-between border-t-2 border-gray-300 pt-2 text-base font-bold text-gray-900">
              <span>Сума за плащане:</span>
              <span className="tabular-nums">{money(invoice.total)}</span>
            </div>
          </div>
        </div>

        {/* Payment summary — issued invoices only */}
        {invoice.status === 'issued' && (
          <div className="mb-8 rounded-lg border border-gray-200 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Статус на плащане
            </p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Статус:</span>
                <span className="font-medium text-gray-900">{paymentStatusLabel(invoice.payment_status)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Платено:</span>
                <span className="tabular-nums text-gray-900">{money(invoice.amount_paid)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-gray-700">Остатък:</span>
                <span className="tabular-nums text-gray-900">{money(balanceDue)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Note */}
        {invoice.note && (
          <div className="mb-8 rounded-lg border border-gray-200 p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Бележка</p>
            <p className="text-sm text-gray-700">{invoice.note}</p>
          </div>
        )}

        {/* Footer: company + bank details */}
        <div className="mt-8 border-t-2 border-gray-300 pt-4">
          <div className="grid grid-cols-3 gap-4 text-xs text-gray-600">
            <div>
              <p className="font-semibold text-gray-900">{issuer.name}</p>
              {issuer.eik  && <p>ЕИК: {issuer.eik}</p>}
              {issuer.vat  && <p>ДДС №: {issuer.vat}</p>}
              {issuer.mol  && <p>МОЛ: {issuer.mol}</p>}
            </div>
            <div>
              {issuer.address && <p>{issuer.address}</p>}
              {issuer.phone   && <p>Тел.: {issuer.phone}</p>}
              {issuer.email   && <p>{issuer.email}</p>}
            </div>
            <div>
              {issuer.bank && <p>{issuer.bank}</p>}
              {issuer.iban && <p>IBAN: {issuer.iban}</p>}
              {issuer.bic  && <p>BIC/SWIFT: {issuer.bic}</p>}
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div className="mt-8 grid grid-cols-2 gap-8 border-t border-gray-100 pt-6 text-xs text-gray-500">
          <div>
            <p className="mb-6">Съставил: _______________________</p>
            <p>(подпис и печат)</p>
          </div>
          <div>
            <p className="mb-6">Получател: ______________________</p>
            <p>(подпис и печат)</p>
          </div>
        </div>

      </div>
    </>
  )
}
