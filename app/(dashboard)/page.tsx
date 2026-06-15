import { createAdminClient } from '@/lib/supabase/admin'
import { DashboardView, type Stats, type DayData, type TopProd, type LowItem } from './dashboard-view'

const CO = process.env.DEMO_COMPANY_ID!
const BG_DAYS = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const EN_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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

  // Build both BG and EN labels — client will pick one
  const days: DayData[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return {
      label: BG_DAYS[d.getDay()],
      labelEn: EN_DAYS[d.getDay()],
      date: d.toISOString().split('T')[0],
      in: 0,
      out: 0,
    }
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

export default async function DashboardPage() {
  const [stats, chartData, topProducts, lowStock] = await Promise.all([
    getStats(), getChartData(), getTopProducts(), getLowStock(),
  ])
  return <DashboardView stats={stats} chartData={chartData} topProducts={topProducts} lowStock={lowStock} />
}
