export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { LowStockClient, type LowStockProduct } from './low-stock-client'

const CO = process.env.DEMO_COMPANY_ID!

export default async function ReportsPage() {
  const sb = createAdminClient()

  const [
    { data: products, error: errProducts },
    { data: balances, error: errBalances },
    { data: warehouses, error: errWarehouses },
  ] = await Promise.all([
    sb
      .from('products')
      .select('id, name, sku, barcode, category, unit, min_quantity, cost_price')
      .eq('company_id', CO)
      .eq('status', 'active')
      .gt('min_quantity', 0),
    sb
      .from('inventory_balances')
      .select('product_id, location_id, quantity_available, locations(id, code, warehouse_id, warehouses(name))')
      .eq('company_id', CO),
    sb
      .from('warehouses')
      .select('id, name')
      .eq('company_id', CO)
      .eq('status', 'active'),
  ])

  if (errProducts ?? errBalances ?? errWarehouses) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
        Грешка при зареждане на справката
      </div>
    )
  }

  // Build product-level totals and location breakdown
  type BalLoc = {
    location_id: string
    quantity: number
    location_code: string
    warehouse_id: string
    warehouse_name: string
  }

  const stockByProduct = new Map<string, number>()
  const locationsByProduct = new Map<string, BalLoc[]>()

  for (const b of balances ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loc = (b.locations as any)
    const warehouseName: string = loc?.warehouses?.name ?? '—'
    const locationCode: string = loc?.code ?? '—'
    const warehouseId: string = loc?.warehouse_id ?? ''

    stockByProduct.set(b.product_id, (stockByProduct.get(b.product_id) ?? 0) + Number(b.quantity_available))

    if (!locationsByProduct.has(b.product_id)) locationsByProduct.set(b.product_id, [])
    locationsByProduct.get(b.product_id)!.push({
      location_id: b.location_id,
      quantity: Number(b.quantity_available),
      location_code: locationCode,
      warehouse_id: warehouseId,
      warehouse_name: warehouseName,
    })
  }

  const lowStock: LowStockProduct[] = (products ?? [])
    .filter((p) => {
      const total = stockByProduct.get(p.id) ?? 0
      return total < Number(p.min_quantity)
    })
    .map((p) => {
      const total = stockByProduct.get(p.id) ?? 0
      const min = Number(p.min_quantity)
      const shortage = min - total
      const locs = (locationsByProduct.get(p.id) ?? [])
        .filter((l) => l.quantity > 0)
        .sort((a, b) => a.warehouse_name.localeCompare(b.warehouse_name))
      return {
        id: p.id,
        name: p.name,
        sku: p.sku ?? null,
        barcode: p.barcode ?? null,
        category: p.category ?? null,
        unit: p.unit ?? 'бр.',
        min_quantity: min,
        cost_price: p.cost_price != null ? Number(p.cost_price) : null,
        total_available: total,
        shortage,
        locations: locs,
      }
    })
    .sort((a, b) => b.shortage - a.shortage) // worst shortage first

  return (
    <LowStockClient
      items={lowStock}
      warehouses={(warehouses ?? []).map((w) => ({ id: w.id, name: w.name }))}
    />
  )
}
