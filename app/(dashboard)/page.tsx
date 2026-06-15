import { createAdminClient } from '@/lib/supabase/admin'
import {
  Package,
  Warehouse,
  MapPin,
  ArrowRightLeft,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react'

const CO = process.env.DEMO_COMPANY_ID!
const BG_DAYS = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

// ─── Types ───────────────────────────────────────────────────────────────────

type Stats = { products: number; warehouses: number; locations: number; movements: number }
type DayData = { label: string; date: string; in: number; out: number }
type TopProduct = { name: string; sku: string | null; unit: string; qty: number; maxQty: number }
type LowStockItem = {
  id: string
  name: string
  sku: string | null
  unit: string
  currentQty: number
  minQty: number
}

// ─── Data fetchers ───────────────────────────────────────────────────────────

async function getStats(): Promise<Stats> {
  const sb = createAdminClient()
  const [products, warehouses, locations, movements] = await Promise.all([
    sb.from('products').select('id', { count: 'exact', head: true }).eq('company_id', CO).eq('status', 'active'),
    sb.from('warehouses').select('id', { count: 'exact', head: true }).eq('company_id', CO).eq('status', 'active'),
    sb.from('locations').select('id', { count: 'exact', head: true }).eq('company_id', CO).eq('status', 'active'),
    sb.from('stock_movements').select('id', { count: 'exact', head: true }).eq('company_id', CO),
  ])
  return {
    products: products.count ?? 0,
    warehouses: warehouses.count ?? 0,
    locations: locations.count ?? 0,
    movements: movements.count ?? 0,
  }
}

async function getMovementsByDay(): Promise<DayData[]> {
  const sb = createAdminClient()
  const since = new Date()
  since.setDate(since.getDate() - 6)
  since.setHours(0, 0, 0, 0)

  const { data } = await sb
    .from('stock_movements')
    .select('created_at, movement_type, quantity')
    .eq('company_id', CO)
    .gte('created_at', since.toISOString())

  const days: DayData[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push({ label: BG_DAYS[d.getDay()], date: d.toISOString().split('T')[0], in: 0, out: 0 })
  }

  for (const row of data ?? []) {
    const rowDate = (row.created_at as string).split('T')[0]
    const day = days.find(d => d.date === rowDate)
    if (!day) continue
    if (row.movement_type === 'IN') day.in += Number(row.quantity)
    else if (row.movement_type === 'OUT') day.out += Number(row.quantity)
  }

  return days
}

async function getTopProducts(): Promise<TopProduct[]> {
  const sb = createAdminClient()
  const { data } = await sb
    .from('inventory_balances')
    .select('product_id, quantity_available, products(name, sku, unit)')
    .eq('company_id', CO)
    .gt('quantity_available', 0)

  if (!data?.length) return []

  const map = new Map<string, { name: string; sku: string | null; unit: string; qty: number }>()
  for (const row of data) {
    const p = row.products as { name: string; sku: string | null; unit: string } | null
    if (!p) continue
    const existing = map.get(row.product_id)
    if (existing) {
      existing.qty += Number(row.quantity_available)
    } else {
      map.set(row.product_id, { name: p.name, sku: p.sku, unit: p.unit, qty: Number(row.quantity_available) })
    }
  }

  const sorted = [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 5)
  const maxQty = sorted[0]?.qty ?? 1
  return sorted.map(p => ({ ...p, maxQty }))
}

async function getLowStockAlerts(): Promise<LowStockItem[]> {
  const sb = createAdminClient()
  const [{ data: products }, { data: balances }] = await Promise.all([
    sb
      .from('products')
      .select('id, name, sku, unit, min_quantity')
      .eq('company_id', CO)
      .eq('status', 'active')
      .gt('min_quantity', 0),
    sb.from('inventory_balances').select('product_id, quantity_available').eq('company_id', CO),
  ])

  if (!products?.length) return []

  const stockMap = new Map<string, number>()
  for (const row of balances ?? []) {
    stockMap.set(row.product_id, (stockMap.get(row.product_id) ?? 0) + Number(row.quantity_available))
  }

  return products
    .filter(p => (stockMap.get(p.id) ?? 0) < p.min_quantity)
    .map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      unit: p.unit,
      currentQty: stockMap.get(p.id) ?? 0,
      minQty: p.min_quantity,
    }))
    .slice(0, 6)
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

const COLORS = {
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    icon: 'text-indigo-600 dark:text-indigo-400',
    bar: 'bg-indigo-500',
    glow: 'rgba(99,102,241,0.18)',
  },
  violet: {
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    icon: 'text-violet-600 dark:text-violet-400',
    bar: 'bg-violet-500',
    glow: 'rgba(139,92,246,0.18)',
  },
  sky: {
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    icon: 'text-sky-600 dark:text-sky-400',
    bar: 'bg-sky-500',
    glow: 'rgba(14,165,233,0.18)',
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    icon: 'text-emerald-600 dark:text-emerald-400',
    bar: 'bg-emerald-500',
    glow: 'rgba(16,185,129,0.18)',
  },
} as const

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string
  value: number
  sub: string
  icon: LucideIcon
  color: keyof typeof COLORS
}) {
  const c = COLORS[color]
  const hasData = value > 0

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      {/* glow blob */}
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full blur-2xl"
        style={{ background: `radial-gradient(circle, ${c.glow} 0%, transparent 70%)` }}
      />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1.5 text-3xl font-bold tabular-nums text-gray-900 dark:text-white">
            {hasData ? value.toLocaleString('bg-BG') : '—'}
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-600">{sub}</p>
        </div>
        <div className={`shrink-0 rounded-xl p-2.5 ${c.bg}`}>
          <Icon className={`h-5 w-5 ${c.icon}`} strokeWidth={1.8} />
        </div>
      </div>

      <div className="mt-4 h-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className={`h-full rounded-full transition-all duration-700 ${hasData ? c.bar : ''}`}
          style={{ width: hasData ? '65%' : '0%' }}
        />
      </div>
    </div>
  )
}

// ─── Movements Chart ──────────────────────────────────────────────────────────

const CHART_H = 140 // px — fixed bar area height

function MovementsChart({ data }: { data: DayData[] }) {
  const maxVal = Math.max(...data.flatMap(d => [d.in, d.out]), 1)
  const isEmpty = data.every(d => d.in === 0 && d.out === 0)

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
            <span className="inline-block h-2.5 w-2.5 rounded-[3px] bg-indigo-500" />
            Вход
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <span className="inline-block h-2.5 w-2.5 rounded-[3px] bg-rose-400" />
            Изход
          </span>
        </div>
      </div>

      {isEmpty ? (
        <div className="mt-4 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800/40"
          style={{ height: CHART_H + 24 }}>
          <p className="text-sm text-gray-300 dark:text-gray-600">Все още няма движения</p>
        </div>
      ) : (
        <div className="mt-5 flex gap-2">
          {/* Y axis */}
          <div className="flex flex-col justify-between" style={{ height: CHART_H + 20 }}>
            {[maxVal, Math.round(maxVal * 0.5), 0].map((v, i) => (
              <span key={i} className="text-right text-[9px] tabular-nums text-gray-300 dark:text-gray-700 leading-none">
                {v > 0 ? v : ''}
              </span>
            ))}
          </div>

          {/* chart area */}
          <div className="relative flex-1">
            {/* gridlines */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 flex flex-col justify-between"
              style={{ height: CHART_H }}
            >
              {[0, 1, 2].map(i => (
                <div key={i} className="h-px w-full bg-gray-100 dark:bg-gray-800" />
              ))}
            </div>

            {/* bars */}
            <div className="flex items-end gap-1" style={{ height: CHART_H }}>
              {data.map((day, i) => (
                <div key={i} className="group flex flex-1 items-end justify-center gap-[2px]"
                  style={{ height: CHART_H }}>
                  <div
                    className="flex-1 rounded-t-[3px] bg-indigo-500 transition-all duration-500 group-hover:brightness-110"
                    style={{
                      height: day.in > 0 ? `${(day.in / maxVal) * 100}%` : 3,
                      opacity: day.in > 0 ? 1 : 0.12,
                    }}
                    title={`Вход: ${day.in}`}
                  />
                  <div
                    className="flex-1 rounded-t-[3px] bg-rose-400 transition-all duration-500 group-hover:brightness-110"
                    style={{
                      height: day.out > 0 ? `${(day.out / maxVal) * 100}%` : 3,
                      opacity: day.out > 0 ? 1 : 0.12,
                    }}
                    title={`Изход: ${day.out}`}
                  />
                </div>
              ))}
            </div>

            {/* x labels */}
            <div className="mt-1.5 flex gap-1">
              {data.map((day, i) => (
                <div key={i} className="flex-1 text-center">
                  <span className="text-[10px] font-medium text-gray-400 dark:text-gray-600">{day.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Top Products ─────────────────────────────────────────────────────────────

const RANK_BARS = [
  'bg-indigo-500',
  'bg-indigo-400',
  'bg-indigo-300',
  'bg-slate-300 dark:bg-slate-600',
  'bg-slate-200 dark:bg-slate-700',
]

function TopProductsList({ products }: { products: TopProduct[] }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div>
        <p className="text-sm font-semibold text-gray-800 dark:text-white">Топ продукти</p>
        <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">по налично количество</p>
      </div>

      {products.length === 0 ? (
        <div className="mt-4 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800/40"
          style={{ height: CHART_H + 24 }}>
          <p className="text-sm text-gray-300 dark:text-gray-600">Няма наличност</p>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-4">
          {products.map((p, i) => (
            <div key={i}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    {i + 1}
                  </span>
                  <span className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">{p.name}</span>
                  {p.sku && (
                    <span className="shrink-0 text-[10px] text-gray-400">{p.sku}</span>
                  )}
                </div>
                <span className="shrink-0 text-sm font-bold tabular-nums text-gray-700 dark:text-gray-300">
                  {p.qty.toLocaleString('bg-BG')}{' '}
                  <span className="text-xs font-normal text-gray-400">{p.unit}</span>
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${RANK_BARS[i] ?? 'bg-gray-300'}`}
                  style={{ width: `${(p.qty / p.maxQty) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Low Stock Alerts ─────────────────────────────────────────────────────────

function LowStockPanel({ items }: { items: LowStockItem[] }) {
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
          const pct = item.minQty > 0 ? Math.min((item.currentQty / item.minQty) * 100, 100) : 0
          return (
            <div
              key={i}
              className="rounded-xl border border-amber-100 bg-white/75 p-3.5 backdrop-blur-sm dark:border-amber-900/30 dark:bg-gray-900/70"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">{item.name}</p>
                  {item.sku && (
                    <p className="mt-0.5 text-[10px] text-gray-400">{item.sku}</p>
                  )}
                </div>
                <span className="shrink-0 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-bold tabular-nums text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
                  {item.currentQty} {item.unit}
                </span>
              </div>

              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-amber-100 dark:bg-amber-900/30">
                <div
                  className="h-full rounded-full bg-rose-400 transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1.5 text-[10px] text-gray-400 dark:text-gray-600">
                мин. {item.minQty} {item.unit}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const [stats, chartData, topProducts, lowStock] = await Promise.all([
    getStats(),
    getMovementsByDay(),
    getTopProducts(),
    getLowStockAlerts(),
  ])

  const isEmpty = stats.products === 0 && stats.warehouses === 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Начало</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Преглед на наличността</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Продукти"
          value={stats.products}
          sub={stats.products === 1 ? 'активен продукт' : stats.products > 0 ? 'активни продукта' : 'Добави стока'}
          icon={Package}
          color="indigo"
        />
        <StatCard
          label="Складове"
          value={stats.warehouses}
          sub={stats.warehouses === 1 ? 'активен склад' : stats.warehouses > 0 ? 'активни склада' : 'Добави склад'}
          icon={Warehouse}
          color="violet"
        />
        <StatCard
          label="Локации"
          value={stats.locations}
          sub={stats.locations === 1 ? 'активна локация' : stats.locations > 0 ? 'активни локации' : 'Добави локация'}
          icon={MapPin}
          color="sky"
        />
        <StatCard
          label="Движения"
          value={stats.movements}
          sub={stats.movements > 0 ? 'записани общо' : 'Все още няма'}
          icon={ArrowRightLeft}
          color="emerald"
        />
      </div>

      {/* Chart + Top Products */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <MovementsChart data={chartData} />
        </div>
        <div className="lg:col-span-2">
          <TopProductsList products={topProducts} />
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStock.length > 0 && <LowStockPanel items={lowStock} />}

      {/* Onboarding empty state */}
      {isEmpty && (
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
