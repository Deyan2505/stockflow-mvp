export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { DashboardView, type Stats, type DayData, type RecentMovement, type ActiveDelivery } from './dashboard-view'

const CO = process.env.DEMO_COMPANY_ID!
const BG_DAYS = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const EN_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default async function DashboardPage() {
  const sb = createAdminClient()
  const since7d = new Date()
  since7d.setDate(since7d.getDate() - 6)
  since7d.setHours(0, 0, 0, 0)

  const [
    { count: productCount },
    { count: warehouseCount },
    { count: locationCount },
    { count: movementCount },
    { data: balanceRows },
    { data: minProducts },
    { data: chartMoves },
    { data: recentMoves },
    { data: activeDels },
    { data: delStatuses },
  ] = await Promise.all([
    sb.from('products').select('id', { count: 'exact', head: true })
      .eq('company_id', CO).eq('status', 'active'),
    sb.from('warehouses').select('id', { count: 'exact', head: true })
      .eq('company_id', CO).eq('status', 'active'),
    sb.from('locations').select('id', { count: 'exact', head: true })
      .eq('company_id', CO).eq('status', 'active'),
    sb.from('stock_movements').select('id', { count: 'exact', head: true })
      .eq('company_id', CO),
    sb.from('inventory_balances')
      .select('product_id, quantity_available, products(cost_price)')
      .eq('company_id', CO),
    sb.from('products')
      .select('id, name, sku, unit, min_quantity')
      .eq('company_id', CO).eq('status', 'active').gt('min_quantity', 0),
    sb.from('stock_movements')
      .select('created_at, movement_type, quantity')
      .eq('company_id', CO)
      .gte('created_at', since7d.toISOString()),
    sb.from('stock_movements')
      .select('id, created_at, movement_type, quantity, reference_type, products(name, unit), from_loc:locations!from_location_id(code), to_loc:locations!to_location_id(code)')
      .eq('company_id', CO)
      .order('created_at', { ascending: false })
      .limit(8),
    sb.from('incoming_deliveries')
      .select('id, delivery_number, status, expected_date, suppliers(name), incoming_delivery_items(expected_quantity, received_quantity)')
      .eq('company_id', CO)
      .in('status', ['expected', 'partially_received'])
      .order('created_at', { ascending: false })
      .limit(5),
    sb.from('incoming_deliveries')
      .select('status')
      .eq('company_id', CO)
      .in('status', ['expected', 'partially_received']),
  ])

  // ── Inventory calculations ─────────────────────────────────────────────────
  const stockByProduct = new Map<string, number>()
  let inventoryPositions = 0
  let inventoryValue = 0
  let inventoryValueKnown = false

  for (const b of balanceRows ?? []) {
    const qty = Number(b.quantity_available)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = (b as any).products as { cost_price: number | null } | null
    stockByProduct.set(b.product_id, (stockByProduct.get(b.product_id) ?? 0) + qty)
    if (qty > 0) inventoryPositions++
    if (qty > 0 && p?.cost_price != null) {
      inventoryValue += qty * Number(p.cost_price)
      inventoryValueKnown = true
    }
  }

  // ── Low stock (product-level, same logic as /reports) ─────────────────────
  const allLowStock = (minProducts ?? [])
    .filter(p => (stockByProduct.get(p.id) ?? 0) < Number(p.min_quantity))
    .map(p => ({
      id: p.id, name: p.name, sku: p.sku ?? null, unit: p.unit ?? 'бр.',
      current: stockByProduct.get(p.id) ?? 0,
      min: Number(p.min_quantity),
      shortage: Number(p.min_quantity) - (stockByProduct.get(p.id) ?? 0),
    }))
    .sort((a, b) => b.shortage - a.shortage)

  // ── Chart data ─────────────────────────────────────────────────────────────
  const chartData: DayData[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return { label: BG_DAYS[d.getDay()], labelEn: EN_DAYS[d.getDay()], date: d.toISOString().split('T')[0], in: 0, out: 0 }
  })
  for (const row of chartMoves ?? []) {
    const day = chartData.find(d => d.date === (row.created_at as string).split('T')[0])
    if (!day) continue
    if (row.movement_type === 'IN') day.in += Number(row.quantity)
    else if (row.movement_type === 'OUT') day.out += Number(row.quantity)
  }

  // ── Recent movements ───────────────────────────────────────────────────────
  const recentMovements: RecentMovement[] = (recentMoves ?? []).map(m => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const any = m as any
    const p   = any.products  as { name: string; unit: string } | null
    const fl  = any.from_loc  as { code: string } | null
    const tl  = any.to_loc    as { code: string } | null

    let location_display: string | null = null
    if (m.movement_type === 'IN')       location_display = tl?.code ?? null
    else if (m.movement_type === 'OUT') location_display = fl?.code ?? null
    else if (m.movement_type === 'TRANSFER') {
      if (fl && tl) location_display = `${fl.code} → ${tl.code}`
      else          location_display = fl?.code ?? tl?.code ?? null
    }

    return {
      id: m.id, created_at: m.created_at as string,
      movement_type: m.movement_type, quantity: Number(m.quantity),
      reference_type: any.reference_type as string | null ?? null,
      product_name: p?.name ?? '—', product_unit: p?.unit ?? '',
      location_display,
    }
  })

  // ── Active deliveries ──────────────────────────────────────────────────────
  const expectedCount = (delStatuses ?? []).filter(d => d.status === 'expected').length
  const partialCount = (delStatuses ?? []).filter(d => d.status === 'partially_received').length

  const activeDeliveries: ActiveDelivery[] = (activeDels ?? [])
    .map(d => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = ((d as any).incoming_delivery_items ?? []) as { expected_quantity: number; received_quantity: number }[]
      const total_expected = items.reduce((s, i) => s + Number(i.expected_quantity), 0)
      const total_received = items.reduce((s, i) => s + Number(i.received_quantity), 0)
      return {
        id: d.id, delivery_number: d.delivery_number,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supplier_name: ((d as any).suppliers as { name: string } | null)?.name ?? '—',
        status: d.status, expected_date: d.expected_date ?? null,
        total_expected, total_received, remaining: total_expected - total_received,
      }
    })
    .sort((a, b) => {
      if (!a.expected_date && !b.expected_date) return 0
      if (!a.expected_date) return 1
      if (!b.expected_date) return -1
      return a.expected_date.localeCompare(b.expected_date)
    })

  const stats: Stats = {
    products: productCount ?? 0, warehouses: warehouseCount ?? 0,
    locations: locationCount ?? 0, movements: movementCount ?? 0,
    inventoryPositions, belowMin: allLowStock.length,
    expectedDeliveries: expectedCount, partialDeliveries: partialCount,
    inventoryValue: Math.round(inventoryValue * 100) / 100,
    inventoryValueKnown,
  }

  return (
    <DashboardView
      stats={stats}
      chartData={chartData}
      lowStock={allLowStock.slice(0, 6)}
      recentMovements={recentMovements}
      activeDeliveries={activeDeliveries}
    />
  )
}
