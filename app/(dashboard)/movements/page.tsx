export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { MovementsClient } from './movements-client'
import type { ProductOption, LocationOption, BalanceRow, Movement, SupplierOption, CustomerOption } from './actions'
import { getCurrentRole } from '@/lib/current-user'
import { can } from '@/lib/permissions'

export default async function MovementsPage() {
  const role = await getCurrentRole()
  const canWrite = can(role, 'create_movement')
  const canExport = role !== 'viewer'
  const sb = createAdminClient()
  const co = process.env.DEMO_COMPANY_ID!

  const [
    { data: products, error: errProducts },
    { data: rawLocations, error: errLocations },
    { data: warehouses, error: errWarehouses },
    { data: movements, error: errMovements },
    { data: balances, error: errBalances },
    { data: dbSuppliers, error: errSuppliers },
    { data: dbCustomers, error: errCustomers },
  ] = await Promise.all([
    sb.from('products').select('id, name, sku, unit, status').eq('company_id', co),
    sb.from('locations').select('id, code, warehouse_id, status').eq('company_id', co).order('code'),
    sb.from('warehouses').select('id, name').eq('company_id', co),
    sb.from('stock_movements').select('*').eq('company_id', co).order('created_at', { ascending: false }).limit(100),
    sb.from('inventory_balances').select('product_id, location_id, quantity_available').eq('company_id', co),
    sb.from('suppliers').select('id, name, status').eq('company_id', co).order('name'),
    sb.from('customers').select('id, name, status').eq('company_id', co).order('name'),
  ])

  const warehouseMap = new Map((warehouses ?? []).map((w: { id: string; name: string }) => [w.id, w.name]))
  const locations = (rawLocations ?? []).map((l: { id: string; code: string; warehouse_id: string; status: string }) => ({
    ...l,
    warehouses: { name: warehouseMap.get(l.warehouse_id) ?? '?' },
  }))

  const dbError = errProducts ?? errLocations ?? errWarehouses ?? errMovements ?? errBalances ?? errSuppliers ?? errCustomers
  if (dbError) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
        Database error: {dbError.message}
      </div>
    )
  }

  // Batch lookup for v0.6.2 & v0.6.3 (Movement History Business Direction Display & Manual Parties)
  const ordersMap = new Map<string, string>()
  const deliveryToSupplierIdMap = new Map<string, string>()
  const supplierIdToNameMap = new Map<string, string>()
  const customerIdToNameMap = new Map<string, string>()

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

    const directSupplierIds = Array.from(new Set(
      rawMovements
        .filter((m) => m.reference_type === 'supplier' && m.reference_id)
        .map((m) => m.reference_id as string)
    ))

    const directCustomerIds = Array.from(new Set(
      rawMovements
        .filter((m) => m.reference_type === 'customer' && m.reference_id)
        .map((m) => m.reference_id as string)
    ))

    // 1. Fetch outgoing orders
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

    // 2. Fetch incoming deliveries to map to supplier_id
    if (deliveryIds.length > 0) {
      try {
        const { data: deliveriesData } = await sb
          .from('incoming_deliveries')
          .select('id, supplier_id')
          .in('id', deliveryIds)
        const deliveries = deliveriesData as { id: string; supplier_id: string | null }[] | null
        if (deliveries) {
          deliveries.forEach((d) => {
            if (d.supplier_id) deliveryToSupplierIdMap.set(d.id, d.supplier_id)
          })
        }
      } catch (e) {
        console.error('Error fetching incoming deliveries for movements:', e)
      }
    }

    // 3. Fetch suppliers (both direct and via deliveries)
    const allSupplierIds = Array.from(new Set([
      ...directSupplierIds,
      ...Array.from(deliveryToSupplierIdMap.values())
    ]))

    if (allSupplierIds.length > 0) {
      try {
        const { data: suppliersData } = await sb
          .from('suppliers')
          .select('id, name')
          .in('id', allSupplierIds)
        const suppliers = suppliersData as { id: string; name: string }[] | null
        if (suppliers) {
          suppliers.forEach((s) => {
            supplierIdToNameMap.set(s.id, s.name)
          })
        }
      } catch (e) {
        console.error('Error fetching suppliers for movements:', e)
      }
    }

    // 4. Fetch direct customers
    if (directCustomerIds.length > 0) {
      try {
        const { data: customersData } = await sb
          .from('customers')
          .select('id, name')
          .in('id', directCustomerIds)
        const customers = customersData as { id: string; name: string }[] | null
        if (customers) {
          customers.forEach((c) => {
            customerIdToNameMap.set(c.id, c.name)
          })
        }
      } catch (e) {
        console.error('Error fetching customers for movements:', e)
      }
    }
  }

  // Enrich movements with fetched customer_name and supplier_name
  const enrichedMovements = rawMovements.map((m) => {
    let customerName: string | null = null
    let supplierName: string | null = null

    if (m.reference_type === 'outgoing_order' && m.reference_id) {
      customerName = ordersMap.get(m.reference_id) ?? null
    } else if (m.reference_type === 'customer' && m.reference_id) {
      customerName = customerIdToNameMap.get(m.reference_id) ?? null
    }

    if (m.reference_type === 'incoming_delivery' && m.reference_id) {
      const supplierId = deliveryToSupplierIdMap.get(m.reference_id)
      supplierName = supplierId ? (supplierIdToNameMap.get(supplierId) ?? null) : null
    } else if (m.reference_type === 'supplier' && m.reference_id) {
      supplierName = supplierIdToNameMap.get(m.reference_id) ?? null
    }

    return {
      ...m,
      customer_name: customerName,
      supplier_name: supplierName,
    }
  })

  return (
    <MovementsClient
      products={(products as ProductOption[]) ?? []}
      locations={(locations as LocationOption[]) ?? []}
      movements={(enrichedMovements as Movement[]) ?? []}
      balances={(balances as BalanceRow[]) ?? []}
      suppliers={(dbSuppliers as SupplierOption[]) ?? []}
      customers={(dbCustomers as CustomerOption[]) ?? []}
      canWrite={canWrite}
      canExport={canExport}
    />
  )
}
