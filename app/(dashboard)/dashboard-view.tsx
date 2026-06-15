'use client'

import { Package, Warehouse, MapPin, ArrowRightLeft, AlertTriangle, type LucideIcon } from 'lucide-react'
import { useT } from '@/lib/i18n'

// ─── Types (mirrored from page.tsx) ──────────────────────────────────────────

export type Stats    = { products: number; warehouses: number; locations: number; movements: number }
export type DayData  = { label: string; labelEn?: string; date: string; in: number; out: number }
export type TopProd  = { name: string; sku: string | null; unit: string; qty: number; maxQty: number }
export type LowItem  = { id: string; name: string; sku: string | null; unit: string; current: number; min: number }

// ─── Stat Card ────────────────────────────────────────────────────────────────

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

// ─── SVG Bar Chart ────────────────────────────────────────────────────────────

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

// ─── Top Products ─────────────────────────────────────────────────────────────

const RANK_COLORS = ['#6366f1', '#818cf8', '#a5b4fc', '#94a3b8', '#cbd5e1']

function TopProductsList({ products, title, subtitle, noStockLabel }: {
  products: TopProd[]; title: string; subtitle: string; noStockLabel: string
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-sm font-semibold text-gray-800 dark:text-white">{title}</p>
      <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{subtitle}</p>
      {products.length === 0 ? (
        <div className="mt-4 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800/50" style={{ height: 180 }}>
          <p className="text-sm text-gray-300 dark:text-gray-600">{noStockLabel}</p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {products.map((p, i) => (
            <div key={i}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    {i + 1}
                  </span>
                  <span className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">{p.name}</span>
                  {p.sku && <span className="shrink-0 text-[10px] text-gray-400">{p.sku}</span>}
                </div>
                <span className="shrink-0 text-sm font-bold tabular-nums text-gray-700 dark:text-gray-300">
                  {p.qty.toLocaleString()}{' '}
                  <span className="text-xs font-normal text-gray-400">{p.unit}</span>
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${(p.qty / p.maxQty) * 100}%`, background: RANK_COLORS[i] ?? '#e2e8f0' }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Low Stock ────────────────────────────────────────────────────────────────

function LowStockPanel({ items, title, subtitle, minLabel }: {
  items: LowItem[]; title: string; subtitle: string; minLabel: string
}) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/60 p-5 dark:border-amber-900/40 dark:from-amber-950/25 dark:to-orange-950/10">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" strokeWidth={2} />
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">{title}</p>
          <p className="text-xs text-amber-600/70 dark:text-amber-500/60">{subtitle}</p>
        </div>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => {
          const pct = item.min > 0 ? Math.min((item.current / item.min) * 100, 100) : 0
          return (
            <div key={i} className="rounded-xl border border-amber-100 bg-white/80 p-3.5 dark:border-amber-900/30 dark:bg-gray-900/70">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">{item.name}</p>
                  {item.sku && <p className="mt-0.5 text-[10px] text-gray-400">{item.sku}</p>}
                </div>
                <span className="shrink-0 rounded-md px-2 py-0.5 text-xs font-bold tabular-nums"
                  style={{ background: 'rgb(255 241 242)', color: '#e11d48' }}>
                  {item.current} {item.unit}
                </span>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-amber-100 dark:bg-amber-900/30">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#fb7185' }} />
              </div>
              <p className="mt-1.5 text-[10px] text-gray-400 dark:text-gray-600">{minLabel} {item.min} {item.unit}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function DashboardView({ stats, chartData, topProducts, lowStock }: {
  stats: Stats; chartData: DayData[]; topProducts: TopProd[]; lowStock: LowItem[]
}) {
  const { t, lang } = useT()
  const d = t.dashboard
  const noData = stats.products === 0 && stats.warehouses === 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{d.title}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{d.subtitle}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={d.statProducts} value={stats.products} icon={Package} color="indigo"
          sub={stats.products > 0 ? d.subActiveProducts : d.subNoProducts} />
        <StatCard label={d.statWarehouses} value={stats.warehouses} icon={Warehouse} color="violet"
          sub={stats.warehouses > 0 ? d.subActiveWarehouses : d.subNoWarehouses} />
        <StatCard label={d.statLocations} value={stats.locations} icon={MapPin} color="sky"
          sub={stats.locations > 0 ? d.subActiveLocations : d.subNoLocations} />
        <StatCard label={d.statMovements} value={stats.movements} icon={ArrowRightLeft} color="emerald"
          sub={stats.movements > 0 ? d.subTotalMovements : d.subNoMovements} />
      </div>

      {/* Chart + Top Products */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <MovementsChart data={chartData} inLabel={d.in} outLabel={d.out}
            noDataLabel={d.noMovements} title={d.chartTitle} subtitle={d.chartSub} lang={lang} />
        </div>
        <div className="lg:col-span-2">
          <TopProductsList products={topProducts} title={d.topTitle} subtitle={d.topSub}
            noStockLabel={d.noStock} />
        </div>
      </div>

      {/* Low Stock */}
      {lowStock.length > 0 && (
        <LowStockPanel items={lowStock} title={d.lowStock}
          subtitle={d.lowStockSub(lowStock.length)} minLabel={d.minLabel} />
      )}

      {/* Onboarding */}
      {noData && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-16 text-center dark:border-gray-700 dark:bg-gray-900">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40">
            <Package className="h-6 w-6 text-indigo-500" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{d.onboarding}</p>
          <p className="mt-1 text-xs text-gray-300 dark:text-gray-600">{d.onboardingSub}</p>
        </div>
      )}
    </div>
  )
}
