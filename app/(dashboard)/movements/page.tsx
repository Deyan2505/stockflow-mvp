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

  return (
    <MovementsClient
      products={(products as ProductOption[]) ?? []}
      locations={(locations as LocationOption[]) ?? []}
      movements={(movements as Movement[]) ?? []}
      balances={(balances as BalanceRow[]) ?? []}
    />
  )
}
