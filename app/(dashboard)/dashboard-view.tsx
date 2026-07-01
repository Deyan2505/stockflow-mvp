'use client'

import Link from 'next/link'
import {
  Package, Warehouse, MapPin, Layers, AlertTriangle,
  Truck, ClipboardList, BarChart3, ArrowRightLeft,
  Users, ShoppingCart, PackageOpen, FileText, CreditCard, Printer,
  CheckCircle2, ArrowRight, Info, type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT, type T } from '@/lib/i18n'

// ── Types ──────────────────────────────────────────────────────────────────────

export type Stats = {
  products: number; warehouses: number; locations: number; movements: number
  inventoryPositions: number; belowMin: number
  expectedDeliveries: number; partialDeliveries: number
  inventoryValue: number; inventoryValueKnown: boolean
}

export type DayData  = { label: string; labelEn?: string; date: string; in: number; out: number }

export type LowItem  = {
  id: string; name: string; sku: string | null; unit: string
  current: number; min: number; shortage: number
}

export type RecentMovement = {
  id: string; created_at: string; movement_type: string
  quantity: number; reference_type: string | null
  product_name: string; product_unit: string
  location_display: string | null
}

export type ActiveDelivery = {
  id: string; delivery_number: string; supplier_name: string
  status: string; expected_date: string | null
  total_expected: number; total_received: number; remaining: number
}

export type OnboardingData = {
  warehouseCount: number; locationCount: number; productCount: number
  inventoryPositions: number; customerCount: number; orderCount: number
  fulfilledOrderCount: number; invoiceCount: number; paymentCount: number
  canCreate: boolean
}

// ── StatCard (row 1) ───────────────────────────────────────────────────────────

type CardColor = 'indigo' | 'violet' | 'sky' | 'emerald'

const CARD_COLORS: Record<CardColor, { iconBg: string; iconColor: string; bar: string; glow: string }> = {
  indigo:  { iconBg: '#eef2ff', iconColor: '#4f46e5', bar: '#6366f1', glow: 'rgba(99,102,241,0.15)'  },
  violet:  { iconBg: '#f5f3ff', iconColor: '#7c3aed', bar: '#8b5cf6', glow: 'rgba(139,92,246,0.15)' },
  sky:     { iconBg: '#f0f9ff', iconColor: '#0284c7', bar: '#0ea5e9', glow: 'rgba(14,165,233,0.15)'  },
  emerald: { iconBg: '#ecfdf5', iconColor: '#059669', bar: '#10b981', glow: 'rgba(16,185,129,0.15)'  },
}
const CARD_DARK_BG: Record<CardColor, string> = {
  indigo:  'rgba(79,70,229,0.15)',
  violet:  'rgba(124,58,237,0.15)',
  sky:     'rgba(2,132,199,0.15)',
  emerald: 'rgba(5,150,105,0.15)',
}

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: number; sub: string; icon: LucideIcon; color: CardColor
}) {
  const c = CARD_COLORS[color]
  const hasData = value > 0
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full blur-2xl"
        style={{ background: `radial-gradient(circle, ${c.glow} 0%, transparent 70%)` }} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1.5 text-3xl font-bold tabular-nums text-gray-900 dark:text-white">
            {hasData ? value.toLocaleString() : '—'}
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-600">{sub}</p>
        </div>
        <div className="shrink-0 rounded-xl p-2.5 dark:hidden" style={{ background: c.iconBg }}>
          <Icon className="h-5 w-5" style={{ color: c.iconColor }} strokeWidth={1.8} />
        </div>
        <div className="hidden shrink-0 rounded-xl p-2.5 dark:block" style={{ background: CARD_DARK_BG[color] }}>
          <Icon className="h-5 w-5" style={{ color: c.bar }} strokeWidth={1.8} />
        </div>
      </div>
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: hasData ? '65%' : '0%', background: c.bar }} />
      </div>
    </div>
  )
}

// ── SecondaryKpiCard (row 2) ───────────────────────────────────────────────────

function SecondaryKpiCard({ label, displayValue, sub, icon: Icon, alert }: {
  label: string; displayValue: string; sub: string; icon: LucideIcon; alert?: boolean
}) {
  return (
    <div className={cn(
      'rounded-xl border p-4',
      alert
        ? 'border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20'
        : 'border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900'
    )}>
      <div className="flex items-center justify-between">
        <p className={cn('text-xs font-medium', alert ? 'text-amber-700 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400')}>
          {label}
        </p>
        <Icon className={cn('h-4 w-4', alert ? 'text-amber-500 dark:text-amber-400' : 'text-gray-300 dark:text-gray-600')} strokeWidth={1.8} />
      </div>
      <p className={cn('mt-2 text-2xl font-bold tabular-nums', alert ? 'text-amber-800 dark:text-amber-300' : 'text-gray-900 dark:text-white')}>
        {displayValue}
      </p>
      <p className={cn('mt-0.5 text-xs', alert ? 'text-amber-600/70 dark:text-amber-500/60' : 'text-gray-400 dark:text-gray-600')}>
        {sub}
      </p>
    </div>
  )
}

// ── SVG Bar Chart ──────────────────────────────────────────────────────────────

function MovementsChart({ data, inLabel, outLabel, noDataLabel, title, subtitle, lang }: {
  data: DayData[]
  inLabel: string; outLabel: string; noDataLabel: string
  title: string; subtitle: string; lang: string
}) {
  const maxVal = Math.max(...data.flatMap(d => [d.in, d.out]), 1)
  const noData = data.every(d => d.in === 0 && d.out === 0)
  const VW = 560; const VH = 160; const LB = 24
  const groupW = VW / 7; const barW = groupW * 0.28

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-white">{title}</p>
          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: '#6366f1' }} />{inLabel}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: '#fb7185' }} />{outLabel}
          </span>
        </div>
      </div>
      {noData ? (
        <div className="mt-4 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800/50" style={{ height: 180 }}>
          <p className="text-sm text-gray-300 dark:text-gray-600">{noDataLabel}</p>
        </div>
      ) : (
        <svg viewBox={`0 0 ${VW} ${VH + LB}`} className="mt-4 w-full" style={{ overflow: 'visible' }}>
          {[0, 0.5, 1].map((pct, i) => (
            <line key={i} x1={0} y1={VH * (1 - pct)} x2={VW} y2={VH * (1 - pct)}
              stroke="currentColor" strokeWidth="1" className="text-gray-100 dark:text-gray-800" />
          ))}
          {data.map((day, i) => {
            const cx = (i + 0.5) * groupW
            const inH = (day.in / maxVal) * VH
            const outH = (day.out / maxVal) * VH
            return (
              <g key={i}>
                <rect x={cx - barW - 1} y={VH - (inH || 0)} width={barW} height={inH || 3}
                  fill="#6366f1" rx={3} opacity={day.in > 0 ? 1 : 0.12} />
                <rect x={cx + 1} y={VH - (outH || 0)} width={barW} height={outH || 3}
                  fill="#fb7185" rx={3} opacity={day.out > 0 ? 1 : 0.12} />
                <text x={cx} y={VH + 16} textAnchor="middle" fontSize={11}
                  fill="currentColor" className="text-gray-400 dark:text-gray-600">
                  {lang === 'en' && day.labelEn ? day.labelEn : day.label}
                </text>
              </g>
            )
          })}
        </svg>
      )}
    </div>
  )
}

// ── Quick Actions ──────────────────────────────────────────────────────────────

function QuickActionsCard({ d }: { d: T['dashboard'] }) {
  const items = [
    { href: '/products',   icon: Package,       label: d.qaProducts,   cls: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400' },
    { href: '/movements',  icon: ArrowRightLeft, label: d.qaMovements,  cls: 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400' },
    { href: '/deliveries', icon: ClipboardList,  label: d.qaDeliveries, cls: 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400' },
    { href: '/suppliers',  icon: Truck,          label: d.qaSuppliers,  cls: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' },
  ]
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <p className="mb-4 text-sm font-semibold text-gray-800 dark:text-white">{d.qaTitle}</p>
      <div className="grid grid-cols-2 gap-2.5">
        {items.map(item => (
          <Link key={item.href} href={item.href}
            className="flex items-center gap-2.5 rounded-xl border border-gray-100 p-3 text-sm font-medium text-gray-700 transition-colors hover:border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800">
            <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', item.cls)}>
              <item.icon className="h-4 w-4" strokeWidth={1.8} />
            </div>
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

// ── Recent Movements ───────────────────────────────────────────────────────────

const MOVE_BADGE: Record<string, { bg: string; text: string; label?: string }> = {
  IN:       { bg: 'bg-blue-50 dark:bg-blue-950/40',   text: 'text-blue-700 dark:text-blue-300' },
  OUT:      { bg: 'bg-rose-50 dark:bg-rose-950/40',   text: 'text-rose-700 dark:text-rose-300' },
  TRANSFER: { bg: 'bg-violet-50 dark:bg-violet-950/40', text: 'text-violet-700 dark:text-violet-300' },
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('bg-BG', { day: '2-digit', month: '2-digit' })
}

function RecentMovementsPanel({ movements, d }: { movements: RecentMovement[]; d: T['dashboard'] }) {
  const thCls = 'pb-2.5 pr-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500 whitespace-nowrap'
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40">
          <ArrowRightLeft className="h-4 w-4 text-indigo-600 dark:text-indigo-400" strokeWidth={1.8} />
        </div>
        <p className="text-sm font-semibold text-gray-800 dark:text-white">{d.recentTitle}</p>
      </div>
      {movements.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl bg-gray-50 py-10 dark:bg-gray-800/50">
          <p className="text-sm text-gray-300 dark:text-gray-600">{d.noRecent}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className={thCls}>{d.chartTitle.slice(0, 4)}</th>
                <th className={thCls}>Тип</th>
                <th className={thCls + ' w-full'}>Продукт</th>
                <th className={cn(thCls, 'text-right')}>Кол.</th>
                <th className={thCls}>{d.colLocation}</th>
                <th className={thCls}>Ref.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {movements.map(m => {
                const badge = MOVE_BADGE[m.movement_type] ?? MOVE_BADGE.IN
                const typeLabel = m.movement_type === 'IN' ? d.typeIn : m.movement_type === 'OUT' ? d.typeOut : d.typeTransfer
                const refLabel  = m.reference_type === 'incoming_delivery' ? d.refDelivery : d.refManual
                return (
                  <tr key={m.id} className="align-middle">
                    <td className="py-2 pr-3 text-xs tabular-nums text-gray-400 dark:text-gray-600 whitespace-nowrap">
                      {fmtDate(m.created_at)}
                    </td>
                    <td className="py-2 pr-3">
                      <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap', badge.bg, badge.text)}>
                        {typeLabel}
                      </span>
                    </td>
                    <td className="max-w-0 py-2 pr-3">
                      <span className="block truncate text-sm text-gray-700 dark:text-gray-300">{m.product_name}</span>
                    </td>
                    <td className="py-2 pr-3 text-right text-sm font-semibold tabular-nums text-gray-800 dark:text-gray-200 whitespace-nowrap">
                      {m.quantity.toLocaleString()}
                      <span className="ml-1 text-xs font-normal text-gray-400">{m.product_unit}</span>
                    </td>
                    <td className="py-2 pr-3 text-xs font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {m.location_display ?? '—'}
                    </td>
                    <td className="py-2 text-[10px] text-gray-400 dark:text-gray-600 whitespace-nowrap">
                      {refLabel}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Active Deliveries ──────────────────────────────────────────────────────────

const DEL_STATUS: Record<string, { bg: string; text: string }> = {
  expected:             { bg: 'bg-blue-50 dark:bg-blue-950/40',   text: 'text-blue-700 dark:text-blue-300' },
  partially_received:   { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-300' },
}

function ActiveDeliveriesPanel({ deliveries, d }: { deliveries: ActiveDelivery[]; d: T['dashboard'] }) {
  const thCls = 'pb-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500 whitespace-nowrap'
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-950/40">
          <Truck className="h-4 w-4 text-sky-600 dark:text-sky-400" strokeWidth={1.8} />
        </div>
        <p className="text-sm font-semibold text-gray-800 dark:text-white">{d.activeDelTitle}</p>
      </div>
      {deliveries.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl bg-gray-50 py-10 dark:bg-gray-800/50">
          <p className="text-sm text-gray-300 dark:text-gray-600">{d.noDel}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className={thCls + ' pr-3'}>{d.colDeliveryNum}</th>
                <th className={thCls + ' pr-3 w-full'}>{d.colSupplier}</th>
                <th className={thCls + ' pr-3'}>{d.colStatus}</th>
                <th className={cn(thCls, 'pr-3 text-right')}>{d.colExpectedQty}</th>
                <th className={cn(thCls, 'pr-3 text-right')}>{d.colReceived}</th>
                <th className={cn(thCls, 'text-right')}>{d.colRemaining}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {deliveries.map(del => {
                const badge = DEL_STATUS[del.status] ?? DEL_STATUS.expected
                return (
                  <tr key={del.id} className="align-middle">
                    <td className="py-2 pr-3 font-mono text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {del.delivery_number}
                    </td>
                    <td className="max-w-0 py-2 pr-3">
                      <span className="block truncate text-xs text-gray-600 dark:text-gray-400">{del.supplier_name}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap', badge.bg, badge.text)}>
                        {del.status === 'partially_received' ? d.statPartial : d.statExpected}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right text-xs tabular-nums text-gray-500 dark:text-gray-400">
                      {del.total_expected.toLocaleString()}
                    </td>
                    <td className="py-2 pr-3 text-right text-xs tabular-nums text-gray-500 dark:text-gray-400">
                      {del.total_received.toLocaleString()}
                    </td>
                    <td className="py-2 text-right text-xs font-semibold tabular-nums text-sky-700 dark:text-sky-400">
                      {del.remaining.toLocaleString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Low Stock Panel ────────────────────────────────────────────────────────────

function LowStockPanel({ items, d }: { items: LowItem[]; d: T['dashboard'] }) {
  const thCls = 'pb-2.5 text-[11px] font-medium uppercase tracking-wide text-amber-700/70 dark:text-amber-500/60 whitespace-nowrap'
  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/60 p-5 dark:border-amber-900/40 dark:from-amber-950/25 dark:to-orange-950/10">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" strokeWidth={2} />
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">{d.lowStock}</p>
          <p className="text-xs text-amber-600/70 dark:text-amber-500/60">{d.lowStockSub(items.length)}</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-amber-200/60 dark:border-amber-900/40">
              <th className={thCls + ' pr-4 text-left w-full'}>Продукт</th>
              <th className={cn(thCls, 'pr-4 text-right')}>{d.colAvailable}</th>
              <th className={cn(thCls, 'pr-4 text-right')}>{d.minLabel.replace('.', '')}.</th>
              <th className={cn(thCls, 'pr-4 text-right')}>{d.colShortage}</th>
              <th className={cn(thCls, 'text-left')}>Ед.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-100/60 dark:divide-amber-900/20">
            {items.map((item, i) => (
              <tr key={i} className="align-middle">
                <td className="py-2 pr-4">
                  <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">{item.name}</p>
                  {item.sku && <p className="text-[10px] text-gray-400 dark:text-gray-600">{item.sku}</p>}
                </td>
                <td className="py-2 pr-4 text-right text-sm font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                  {item.current.toLocaleString()}
                </td>
                <td className="py-2 pr-4 text-right text-xs tabular-nums text-gray-500 dark:text-gray-400">
                  {item.min.toLocaleString()}
                </td>
                <td className="py-2 pr-4 text-right text-sm font-bold tabular-nums text-red-600 dark:text-red-400">
                  -{item.shortage.toLocaleString()}
                </td>
                <td className="py-2 text-xs text-gray-500 dark:text-gray-400">
                  {item.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Getting Started ────────────────────────────────────────────────────────────

type StepStatus = 'done' | 'next' | 'pending'

function OnboardingStepCard({
  number, icon: Icon, title, desc, href, status, canCreate, actionGo, actionView,
  statusDone, statusNext, statusPending,
}: {
  number: number; icon: LucideIcon; title: string; desc: string; href: string
  status: StepStatus; canCreate: boolean
  actionGo: string; actionView: string; statusDone: string; statusNext: string; statusPending: string
}) {
  const isDone    = status === 'done'
  const isNext    = status === 'next'
  const isPending = status === 'pending'
  return (
    <div className={cn(
      'flex flex-col rounded-xl border p-3 transition-all',
      isDone    ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/10' :
      isNext    ? 'border-indigo-300 bg-indigo-50/60 ring-1 ring-indigo-200 dark:border-indigo-700 dark:bg-indigo-950/20 dark:ring-indigo-800' :
      'border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900',
    )}>
      {/* Header: step number + status badge */}
      <div className="mb-2 flex items-start justify-between gap-1">
        <div className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold',
          isDone    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
          isNext    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400' :
          'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500',
        )}>
          {number}
        </div>
        <span className={cn(
          'rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap',
          isDone    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
          isNext    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
          'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500',
        )}>
          {isDone ? statusDone : isNext ? statusNext : statusPending}
        </span>
      </div>
      {/* Icon + title */}
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className={cn(
          'h-4 w-4 shrink-0',
          isDone    ? 'text-emerald-600 dark:text-emerald-400' :
          isNext    ? 'text-indigo-600 dark:text-indigo-400' :
          'text-gray-300 dark:text-gray-600',
        )} strokeWidth={1.8} />
        <p className={cn(
          'text-xs font-semibold leading-tight',
          isDone    ? 'text-emerald-900 dark:text-emerald-200' :
          isNext    ? 'text-indigo-900 dark:text-indigo-100' :
          isPending ? 'text-gray-500 dark:text-gray-500' : '',
        )}>{title}</p>
      </div>
      {/* Description */}
      <p className={cn(
        'flex-1 text-[11px] leading-relaxed',
        isDone    ? 'text-emerald-700/70 dark:text-emerald-500/60' :
        isNext    ? 'text-indigo-700/80 dark:text-indigo-400/70' :
        'text-gray-400 dark:text-gray-600',
      )}>{desc}</p>
      {/* Button */}
      <div className="mt-3">
        <Link href={href} className={cn(
          'flex items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors',
          isDone    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50' :
          isNext    ? 'bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600' :
          'bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:hover:bg-gray-700',
        )}>
          {canCreate ? actionGo : actionView}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
}

function GettingStartedSection({ data, gs }: {
  data: OnboardingData
  gs: T['gettingStarted']
}) {
  const isDoneArr: boolean[] = [
    data.warehouseCount > 0,
    data.locationCount > 0,
    data.productCount > 0,
    data.inventoryPositions > 0,
    data.customerCount > 0,
    data.orderCount > 0,
    data.fulfilledOrderCount > 0,
    data.invoiceCount > 0,
    data.paymentCount > 0,
    data.invoiceCount > 0,
  ]

  const nextIdx   = isDoneArr.findIndex(d => !d)
  const allDone   = nextIdx === -1

  const HREFS: string[] = [
    '/warehouses', '/locations', '/products', '/deliveries',
    '/customers', '/orders', '/orders', '/invoices', '/invoices', '/invoices',
  ]

  const ICONS: LucideIcon[] = [
    Warehouse, MapPin, Package, Truck,
    Users, ShoppingCart, PackageOpen, FileText, CreditCard, Printer,
  ]

  const steps = gs.steps as readonly { title: string; desc: string }[]

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      {/* Title */}
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">{gs.title}</h2>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{gs.subtitle}</p>
      </div>

      {/* Recommended next step / all-done banner */}
      {allDone ? (
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3 dark:bg-emerald-950/20">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">{gs.allDoneTitle}</p>
            <p className="text-xs text-emerald-700/70 dark:text-emerald-500/60">{gs.allDoneMsg}</p>
          </div>
        </div>
      ) : (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-indigo-50 px-4 py-3 dark:bg-indigo-950/20">
          <div className="flex min-w-0 items-center gap-2">
            <ArrowRight className="h-4 w-4 shrink-0 text-indigo-500 dark:text-indigo-400" />
            <p className="truncate text-sm text-indigo-800 dark:text-indigo-300">
              <span className="font-medium">{gs.recommendedLabel}</span>{' '}
              {steps[nextIdx]?.title ?? ''}
            </p>
          </div>
          <Link href={HREFS[nextIdx] ?? '/'}
            className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600">
            →
          </Link>
        </div>
      )}

      {/* Step grid: 1 col → 2 col → 5 col */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map((step, i) => {
          const status: StepStatus = isDoneArr[i] ? 'done' : i === nextIdx ? 'next' : 'pending'
          return (
            <OnboardingStepCard
              key={i}
              number={i + 1}
              icon={ICONS[i]}
              title={step.title}
              desc={step.desc}
              href={HREFS[i]}
              status={status}
              canCreate={data.canCreate}
              actionGo={gs.actionGo}
              actionView={gs.actionView}
              statusDone={gs.statusDone}
              statusNext={gs.statusNext}
              statusPending={gs.statusPending}
            />
          )
        })}
      </div>

      {/* Workflow explanation callout */}
      <div className="mt-4 flex gap-3 rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3 dark:border-blue-900/30 dark:bg-blue-950/10">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500 dark:text-blue-400" />
        <div>
          <p className="text-xs font-semibold text-blue-900 dark:text-blue-300">{gs.workflowNoteTitle}</p>
          <p className="mt-0.5 text-xs text-blue-700/70 dark:text-blue-400/60">{gs.workflowNoteBody}</p>
        </div>
      </div>
    </div>
  )
}

// ── Main View ──────────────────────────────────────────────────────────────────

export function DashboardView({ stats, chartData, lowStock, recentMovements, activeDeliveries, onboarding }: {
  stats: Stats; chartData: DayData[]; lowStock: LowItem[]
  recentMovements: RecentMovement[]; activeDeliveries: ActiveDelivery[]
  onboarding: OnboardingData
}) {
  const { t, lang } = useT()
  const d = t.dashboard
  const gs = t.gettingStarted

  const valueDisplay = stats.inventoryValueKnown
    ? stats.inventoryValue.toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—'

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{d.title}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{d.subtitle}</p>
      </div>

      {/* Getting Started */}
      <GettingStartedSection data={onboarding} gs={gs} />

      {/* Row 1 — main KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={d.statProducts} value={stats.products} icon={Package} color="indigo"
          sub={stats.products > 0 ? d.subActiveProducts : d.subNoProducts} />
        <StatCard label={d.statWarehouses} value={stats.warehouses} icon={Warehouse} color="violet"
          sub={stats.warehouses > 0 ? d.subActiveWarehouses : d.subNoWarehouses} />
        <StatCard label={d.statLocations} value={stats.locations} icon={MapPin} color="sky"
          sub={stats.locations > 0 ? d.subActiveLocations : d.subNoLocations} />
        <StatCard label={d.statPositions} value={stats.inventoryPositions} icon={Layers} color="emerald"
          sub={stats.inventoryPositions > 0 ? d.subPositions : d.subNoProducts} />
      </div>

      {/* Row 2 — secondary KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SecondaryKpiCard
          label={d.statBelowMin}
          displayValue={stats.belowMin > 0 ? stats.belowMin.toString() : '0'}
          sub={stats.belowMin > 0 ? `${stats.belowMin} ${d.subBelowMin}` : d.subNoBelowMin}
          icon={AlertTriangle}
          alert={stats.belowMin > 0}
        />
        <SecondaryKpiCard
          label={d.statExpected}
          displayValue={stats.expectedDeliveries > 0 ? stats.expectedDeliveries.toString() : '0'}
          sub={stats.expectedDeliveries > 0 ? d.subExpected : d.subNoExpected}
          icon={ClipboardList}
          alert={false}
        />
        <SecondaryKpiCard
          label={d.statPartial}
          displayValue={stats.partialDeliveries > 0 ? stats.partialDeliveries.toString() : '0'}
          sub={stats.partialDeliveries > 0 ? d.subPartial : d.subNoPartial}
          icon={Truck}
          alert={false}
        />
        <SecondaryKpiCard
          label={d.statValue}
          displayValue={valueDisplay}
          sub={stats.inventoryValueKnown ? d.subValue : d.subNoValue}
          icon={BarChart3}
          alert={false}
        />
      </div>

      {/* Row 3 — Chart + Quick Actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <MovementsChart data={chartData} inLabel={d.in} outLabel={d.out}
            noDataLabel={d.noMovements} title={d.chartTitle} subtitle={d.chartSub} lang={lang} />
        </div>
        <div className="lg:col-span-2">
          <QuickActionsCard d={d} />
        </div>
      </div>

      {/* Row 4 — Recent Movements + Active Deliveries */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <RecentMovementsPanel movements={recentMovements} d={d} />
        </div>
        <div className="lg:col-span-2">
          <ActiveDeliveriesPanel deliveries={activeDeliveries} d={d} />
        </div>
      </div>

      {/* Row 5 — Low Stock */}
      {lowStock.length > 0 && (
        <LowStockPanel items={lowStock} d={d} />
      )}
    </div>
  )
}
