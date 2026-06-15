import { createAdminClient } from '@/lib/supabase/admin'
import { Package, Warehouse, MapPin, ArrowRightLeft, AlertTriangle, type LucideIcon } from 'lucide-react'

const CO = process.env.DEMO_COMPANY_ID!
const BG_DAYS = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

// ─── Types ────────────────────────────────────────────────────────────────────

type Stats     = { products: number; warehouses: number; locations: number; movements: number }
type DayData   = { label: string; date: string; in: number; out: number }
type TopProd   = { name: string; sku: string | null; unit: string; qty: number; maxQty: number }
type LowItem   = { id: string; name: string; sku: string | null; unit: string; current: number; min: number }

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function getStats(): Promise<Stats> {
  const sb = createAdminClient()
  const [p, w, l, m] = await Promise.all([
    sb.from('products').select('id', { count: 'exact', head: true }).eq('company_id', CO).eq('status', 'active'),
    sb.from('warehouses').select('id', { count: 'exact', head: true }).eq('company_id', CO).eq('status', 'active'),
    sb.from('locations').select('id', { count: 'exact', head: true }).eq('company_id', CO).eq('status', 'active'),
    sb.from('stock_movements').select('id', { count: 'exact', head: true }).eq('company_id', CO),
  ])
  return { products: p.count ?? 0, warehouses: w.count ?? 0, locations: l.count ?? 0, movements: m.count ?? 0 }
}

async function getChartData(): Promise<DayData[]> {
  const sb = createAdminClient()
  const since = new Date()
  since.setDate(since.getDate() - 6)
  since.setHours(0, 0, 0, 0)

  const { data } = await sb
    .from('stock_movements')
    .select('created_at, movement_type, quantity')
    .eq('company_id', CO)
    .gte('created_at', since.toISOString())

  const days: DayData[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return { label: BG_DAYS[d.getDay()], date: d.toISOString().split('T')[0], in: 0, out: 0 }
  })

  for (const row of data ?? []) {
    const day = days.find(d => d.date === (row.created_at as string).split('T')[0])
    if (!day) continue
    if (row.movement_type === 'IN') day.in += Number(row.quantity)
    else if (row.movement_type === 'OUT') day.out += Number(row.quantity)
  }
  return days
}

async function getTopProducts(): Promise<TopProd[]> {
  const sb = createAdminClient()
  const { data } = await sb
    .from('inventory_balances')
    .select('product_id, quantity_available, products(name, sku, unit)')
    .eq('company_id', CO)
    .gt('quantity_available', 0)

  if (!data?.length) return []
  const map = new Map<string, { name: string; sku: string | null; unit: string; qty: number }>()
  for (const row of data) {
    const p = (row.products as unknown) as { name: string; sku: string | null; unit: string } | null
    if (!p) continue
    const e = map.get(row.product_id)
    if (e) e.qty += Number(row.quantity_available)
    else map.set(row.product_id, { name: p.name, sku: p.sku, unit: p.unit, qty: Number(row.quantity_available) })
  }
  const sorted = Array.from(map.values()).sort((a, b) => b.qty - a.qty).slice(0, 5)
  const maxQty = sorted[0]?.qty ?? 1
  return sorted.map(p => ({ ...p, maxQty }))
}

async function getLowStock(): Promise<LowItem[]> {
  const sb = createAdminClient()
  const [{ data: products }, { data: balances }] = await Promise.all([
    sb.from('products').select('id, name, sku, unit, min_quantity')
      .eq('company_id', CO).eq('status', 'active').gt('min_quantity', 0),
    sb.from('inventory_balances').select('product_id, quantity_available').eq('company_id', CO),
  ])
  if (!products?.length) return []
  const stock = new Map<string, number>()
  for (const r of balances ?? []) stock.set(r.product_id, (stock.get(r.product_id) ?? 0) + Number(r.quantity_available))
  return products
    .filter(p => (stock.get(p.id) ?? 0) < p.min_quantity)
    .map(p => ({ id: p.id, name: p.name, sku: p.sku, unit: p.unit, current: stock.get(p.id) ?? 0, min: p.min_quantity }))
    .slice(0, 6)
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

type CardColor = 'indigo' | 'violet' | 'sky' | 'emerald'

const CARD_COLORS: Record<CardColor, { iconBg: string; iconColor: string; bar: string; glow: string }> = {
  indigo:  { iconBg: '#eef2ff', iconColor: '#4f46e5', bar: '#6366f1', glow: 'rgba(99,102,241,0.15)'  },
  violet:  { iconBg: '#f5f3ff', iconColor: '#7c3aed', bar: '#8b5cf6', glow: 'rgba(139,92,246,0.15)' },
  sky:     { iconBg: '#f0f9ff', iconColor: '#0284c7', bar: '#0ea5e9', glow: 'rgba(14,165,233,0.15)'  },
  emerald: { iconBg: '#ecfdf5', iconColor: '#059669', bar: '#10b981', glow: 'rgba(16,185,129,0.15)'  },
}

const CARD_COLORS_DARK: Record<CardColor, { iconBg: string }> = {
  indigo:  { iconBg: 'rgba(79,70,229,0.15)'  },
  violet:  { iconBg: 'rgba(124,58,237,0.15)' },
  sky:     { iconBg: 'rgba(2,132,199,0.15)'  },
  emerald: { iconBg: 'rgba(5,150,105,0.15)'  },
}

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: number; sub: string; icon: LucideIcon; color: CardColor
}) {
  const c = CARD_COLORS[color]
  const hasData = value > 0
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      {/* glow blob — inline style so never purged */}
      <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full blur-2xl"
        style={{ background: `radial-gradient(circle, ${c.glow} 0%, transparent 70%)` }} />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1.5 text-3xl font-bold tabular-nums text-gray-900 dark:text-white">
            {hasData ? value.toLocaleString('bg-BG') : '—'}
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-600">{sub}</p>
        </div>
        {/* icon — inline style for bg */}
        <div className="shrink-0 rounded-xl p-2.5 dark:hidden" style={{ background: c.iconBg }}>
          <Icon className="h-5 w-5" style={{ color: c.iconColor }} strokeWidth={1.8} />
        </div>
        <div className="hidden shrink-0 rounded-xl p-2.5 dark:block"
          style={{ background: CARD_COLORS_DARK[color].iconBg }}>
          <Icon className="h-5 w-5" style={{ color: c.bar }} strokeWidth={1.8} />
        </div>
      </div>

      {/* accent bar */}
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: hasData ? '65%' : '0%', background: c.bar }} />
      </div>
    </div>
  )
}

// ─── SVG Bar Chart ────────────────────────────────────────────────────────────

function MovementsChart({ data }: { data: DayData[] }) {
  const maxVal = Math.max(...data.flatMap(d => [d.in, d.out]), 1)
  const noData = data.every(d => d.in === 0 && d.out === 0)

  const VW = 560   // SVG viewBox width
  const VH = 160   // bar area height
  const LB = 24    // label area below bars
  const groupW = VW / 7
  const barW = groupW * 0.28

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      {/* header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-white">Движения</p>
          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">последните 7 дни</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: '#6366f1' }} />Вход
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: '#fb7185' }} />Изход
          </span>
        </div>
      </div>

      {noData ? (
        <div className="mt-4 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800/50"
          style={{ height: 180 }}>
          <p className="text-sm text-gray-300 dark:text-gray-600">Все още няма движения</p>
        </div>
      ) : (
        <svg viewBox={`0 0 ${VW} ${VH + LB}`} className="mt-4 w-full" style={{ overflow: 'visible' }}>
          {/* gridlines */}
          {[0, 0.5, 1].map((pct, i) => (
            <line key={i} x1={0} y1={VH * (1 - pct)} x2={VW} y2={VH * (1 - pct)}
              stroke="currentColor" strokeWidth="1"
              className="text-gray-100 dark:text-gray-800" />
          ))}

          {/* bar groups */}
          {data.map((day, i) => {
            const cx = (i + 0.5) * groupW
            const inH  = maxVal > 0 ? (day.in  / maxVal) * VH : 0
            const outH = maxVal > 0 ? (day.out / maxVal) * VH : 0
            return (
              <g key={i}>
                {/* IN */}
                <rect x={cx - barW - 1} y={VH - (inH || 0)}
                  width={barW} height={inH || 3}
                  fill="#6366f1" rx={3} opacity={day.in > 0 ? 1 : 0.12} />
                {/* OUT */}
                <rect x={cx + 1} y={VH - (outH || 0)}
                  width={barW} height={outH || 3}
                  fill="#fb7185" rx={3} opacity={day.out > 0 ? 1 : 0.12} />
                {/* label */}
                <text x={cx} y={VH + 16} textAnchor="middle" fontSize={11}
                  fill="currentColor" className="text-gray-400 dark:text-gray-600">
                  {day.label}
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

function TopProductsList({ products }: { products: TopProd[] }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-sm font-semibold text-gray-800 dark:text-white">Топ продукти</p>
      <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">по налично количество</p>

      {products.length === 0 ? (
        <div className="mt-4 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800/50"
          style={{ height: 180 }}>
          <p className="text-sm text-gray-300 dark:text-gray-600">Няма наличност</p>
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
                  {p.qty.toLocaleString('bg-BG')}{' '}
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

// ─── Low Stock Alerts ─────────────────────────────────────────────────────────

function LowStockPanel({ items }: { items: LowItem[] }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/60 p-5 dark:border-amber-900/40 dark:from-amber-950/25 dark:to-orange-950/10">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" strokeWidth={2} />
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">Ниска наличност</p>
          <p className="text-xs text-amber-600/70 dark:text-amber-500/60">
            {items.length} {items.length === 1 ? 'продукт' : 'продукта'} под минималното количество
          </p>
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
              <p className="mt-1.5 text-[10px] text-gray-400 dark:text-gray-600">мин. {item.min} {item.unit}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const [stats, chartData, topProducts, lowStock] = await Promise.all([
    getStats(),
    getChartData(),
    getTopProducts(),
    getLowStock(),
  ])

  const noData = stats.products === 0 && stats.warehouses === 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Начало</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Преглед на наличността</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Продукти" value={stats.products} icon={Package} color="indigo"
          sub={stats.products > 0 ? 'активни продукта' : 'Добави стока'} />
        <StatCard label="Складове" value={stats.warehouses} icon={Warehouse} color="violet"
          sub={stats.warehouses > 0 ? 'активни склада' : 'Добави склад'} />
        <StatCard label="Локации" value={stats.locations} icon={MapPin} color="sky"
          sub={stats.locations > 0 ? 'активни локации' : 'Добави локация'} />
        <StatCard label="Движения" value={stats.movements} icon={ArrowRightLeft} color="emerald"
          sub={stats.movements > 0 ? 'записани общо' : 'Все още няма'} />
      </div>

      {/* Chart + Top Products — always visible */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <MovementsChart data={chartData} />
        </div>
        <div className="lg:col-span-2">
          <TopProductsList products={topProducts} />
        </div>
      </div>

      {/* Low Stock */}
      {lowStock.length > 0 && <LowStockPanel items={lowStock} />}

      {/* Onboarding */}
      {noData && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-16 text-center dark:border-gray-700 dark:bg-gray-900">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40">
            <Package className="h-6 w-6 text-indigo-500" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Започни като добавиш продукти, складове и локации.
          </p>
          <p className="mt-1 text-xs text-gray-300 dark:text-gray-600">
            Таблото ще се попълни с данни при записване на движения.
          </p>
        </div>
      )}
    </div>
  )
}
