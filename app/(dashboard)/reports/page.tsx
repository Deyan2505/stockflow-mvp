export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { LowStockClient, type LowStockProduct } from './low-stock-client'
import { DeliveryReportsClient, type DeliveryReport } from './delivery-reports-client'
import { getCurrentRole } from '@/lib/current-user'
import { can } from '@/lib/permissions'

const CO = process.env.DEMO_COMPANY_ID!

export default async function ReportsPage() {
  const role = await getCurrentRole()
  const canExport = can(role, 'export_reports')
  const sb = createAdminClient()

  const [
    { data: products, error: errProducts },
    { data: balances, error: errBalances },
    { data: warehouses, error: errWarehouses },
    { data: deliveries, error: errDeliveries },
    { data: suppliers, error: errSuppliers },
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
    sb
      .from('incoming_deliveries')
      .select('id, delivery_number, status, expected_date, received_date, supplier_id, suppliers(name), incoming_delivery_items(expected_quantity, received_quantity)')
      .eq('company_id', CO)
      .order('created_at', { ascending: false }),
    sb
      .from('suppliers')
      .select('id, name')
      .eq('company_id', CO)
      .eq('status', 'active'),
  ])

  if (errProducts ?? errBalances ?? errWarehouses ?? errDeliveries ?? errSuppliers) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
        Грешка при зареждане на справките
      </div>
    )
  }

  // ── Low Stock ────────────────────────────────────────────────────────────────

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
    .filter((p) => (stockByProduct.get(p.id) ?? 0) < Number(p.min_quantity))
    .map((p) => {
      const total = stockByProduct.get(p.id) ?? 0
      const min = Number(p.min_quantity)
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
        shortage: min - total,
        locations: locs,
      }
    })
    .sort((a, b) => b.shortage - a.shortage)

  // ── Delivery Reports ─────────────────────────────────────────────────────────

  const deliveryReports: DeliveryReport[] = (deliveries ?? []).map((d) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: { expected_quantity: number; received_quantity: number }[] = (d as any).incoming_delivery_items ?? []
    const total_expected = items.reduce((s, i) => s + Number(i.expected_quantity), 0)
    const total_received = items.reduce((s, i) => s + Number(i.received_quantity), 0)
    return {
      id: d.id,
      delivery_number: d.delivery_number,
      status: d.status,
      expected_date: d.expected_date ?? null,
      received_date: d.received_date ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supplier_name: ((d as any).suppliers as { name: string } | null)?.name ?? '—',
      supplier_id: d.supplier_id,
      item_count: items.length,
      total_expected,
      total_received,
      remaining: total_expected - total_received,
    }
  })

  return (
    <div className="space-y-8">
      <LowStockClient
        items={lowStock}
        warehouses={(warehouses ?? []).map((w) => ({ id: w.id, name: w.name }))}
        canExport={canExport}
      />
      <DeliveryReportsClient
        deliveries={deliveryReports}
        suppliers={(suppliers ?? []).map((s) => ({ id: s.id, name: s.name }))}
        canExport={canExport}
      />
    </div>
  )
}
