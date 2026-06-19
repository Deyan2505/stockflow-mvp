export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { MovementsClient } from './movements-client'
import type { ProductOption, LocationOption, BalanceRow, Movement } from './actions'

export default async function MovementsPage() {
  const sb = createAdminClient()
  const co = process.env.DEMO_COMPANY_ID!

  const [
    { data: products, error: errProducts },
    { data: rawLocations, error: errLocations },
    { data: warehouses, error: errWarehouses },
    { data: movements, error: errMovements },
    { data: balances, error: errBalances },
  ] = await Promise.all([
    sb.from('products').select('id, name, sku, unit, status').eq('company_id', co),
    sb.from('locations').select('id, code, warehouse_id, status').eq('company_id', co).order('code'),
    sb.from('warehouses').select('id, name').eq('company_id', co),
    sb.from('stock_movements').select('*').eq('company_id', co).order('created_at', { ascending: false }).limit(100),
    sb.from('inventory_balances').select('product_id, location_id, quantity_available').eq('company_id', co),
  ])

  const warehouseMap = new Map((warehouses ?? []).map((w: { id: string; name: string }) => [w.id, w.name]))
  const locations = (rawLocations ?? []).map((l: { id: string; code: string; warehouse_id: string; status: string }) => ({
    ...l,
    warehouses: { name: warehouseMap.get(l.warehouse_id) ?? '?' },
  }))

  const dbError = errProducts ?? errLocations ?? errWarehouses ?? errMovements ?? errBalances
  if (dbError) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
        Database error: {dbError.message}
      </div>
    )
  }

  // Batch lookup for v0.6.2 (Movement History Business Direction Display)
  const ordersMap = new Map<string, string>()
  const suppliersMap = new Map<string, string>()

  const rawMovements = (movements as Movement[]) ?? []

  if (rawMovements.length > 0) {
    const orderIds = Array.from(new Set(
      rawMovements
        .filter((m) => m.reference_type === 'outgoing_order' && m.reference_id)
        .map((m) => m.reference_id as string)
    ))

    const deliveryIds = Array.from(new Set(
      rawMovements
        .filter((m) => m.reference_type === 'incoming_delivery' && m.reference_id)
        .map((m) => m.reference_id as string)
    ))

    if (orderIds.length > 0) {
      try {
        const { data: ordersData } = await sb
          .from('outgoing_orders')
          .select('id, customer_name')
          .in('id', orderIds)
        const orders = ordersData as { id: string; customer_name: string | null }[] | null
        if (orders) {
          orders.forEach((o) => {
            if (o.customer_name) ordersMap.set(o.id, o.customer_name)
          })
        }
      } catch (e) {
        console.error('Error fetching outgoing orders for movements:', e)
      }
    }

    if (deliveryIds.length > 0) {
      try {
        // Safe two-step batch fetch for deliveries and suppliers
        const { data: deliveriesData } = await sb
          .from('incoming_deliveries')
          .select('id, supplier_id')
          .in('id', deliveryIds)
        const deliveries = deliveriesData as { id: string; supplier_id: string | null }[] | null

        if (deliveries && deliveries.length > 0) {
          const supplierIds = Array.from(new Set(
            deliveries
              .filter((d) => d.supplier_id)
              .map((d) => d.supplier_id as string)
          ))

          if (supplierIds.length > 0) {
            const { data: suppliersData } = await sb
              .from('suppliers')
              .select('id, name')
              .in('id', supplierIds)
            const suppliers = suppliersData as { id: string; name: string }[] | null

            if (suppliers) {
              const sMap = new Map(suppliers.map((s) => [s.id, s.name]))
              deliveries.forEach((d) => {
                const sName = d.supplier_id ? sMap.get(d.supplier_id) : undefined
                if (sName) suppliersMap.set(d.id, sName)
              })
            }
          }
        }
      } catch (e) {
        console.error('Error fetching suppliers/deliveries for movements:', e)
      }
    }
  }

  // Enrich movements with fetched customer_name and supplier_name
  const enrichedMovements = rawMovements.map((m) => ({
    ...m,
    customer_name: m.reference_type === 'outgoing_order' && m.reference_id ? (ordersMap.get(m.reference_id) ?? null) : null,
    supplier_name: m.reference_type === 'incoming_delivery' && m.reference_id ? (suppliersMap.get(m.reference_id) ?? null) : null,
  }))

  return (
    <MovementsClient
      products={(products as ProductOption[]) ?? []}
      locations={(locations as LocationOption[]) ?? []}
      movements={(enrichedMovements as Movement[]) ?? []}
      balances={(balances as BalanceRow[]) ?? []}
    />
  )
}
