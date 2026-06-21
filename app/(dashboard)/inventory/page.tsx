export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { InventoryClient } from './inventory-client'
import { getCurrentRole } from '@/lib/current-user'

const CO = process.env.DEMO_COMPANY_ID!

export default async function InventoryPage() {
  const role = await getCurrentRole()
  const canExport = role !== 'viewer'
  const sb = createAdminClient()

  const [{ data: rows, error: errRows }, { data: warehouses, error: errWarehouses }] =
    await Promise.all([
      sb
        .from('inventory_balances')
        .select(
          `product_id, location_id, quantity_available,
           products ( name, sku, barcode, category, unit, min_quantity, cost_price ),
           locations ( code, zone, warehouse_id, warehouses ( name ) )`
        )
        .eq('company_id', CO)
        .order('quantity_available', { ascending: true }),
      sb
        .from('warehouses')
        .select('id, name')
        .eq('company_id', CO)
        .eq('status', 'active')
        .order('name'),
    ])

  if (errRows ?? errWarehouses) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
        Грешка при зареждане на наличността
      </div>
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <InventoryClient rows={(rows as any[]) ?? []} warehouses={warehouses ?? []} canExport={canExport} />
}
