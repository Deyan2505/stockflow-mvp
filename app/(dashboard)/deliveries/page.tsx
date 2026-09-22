export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { DeliveriesClient } from './deliveries-client'
import type { Delivery } from './actions'
import { getCurrentUserContext } from '@/lib/current-user'
import { can } from '@/lib/permissions'

export default async function DeliveriesPage() {
  const { companyId: CO, role } = await getCurrentUserContext()
  const canReceive = can(role, 'receive_delivery')
  const canManage = can(role, 'manage_deliveries')
  const sb = createAdminClient()

  const [deliveriesRes, suppliersRes, productsRes, locationsRes, movementsRes, occupancyRes] = await Promise.all([
    sb
      .from('incoming_deliveries')
      .select(
        '*, suppliers(name), incoming_delivery_items(id, product_id, expected_quantity, received_quantity, location_id)'
      )
      .eq('company_id', CO)
      .order('created_at', { ascending: false }),
    sb.from('suppliers').select('id, name').eq('company_id', CO).eq('status', 'active').order('name'),
    sb.from('products').select('id, name, unit').eq('company_id', CO).eq('status', 'active'),
    sb.from('locations').select('id, code').eq('company_id', CO).eq('status', 'active').eq('is_buffer', false).order('code'),
    // Movements linked to incoming deliveries — gracefully falls back to [] if migration 004 not yet run
    sb
      .from('stock_movements')
      .select('id, product_id, movement_type, quantity, to_location_id, from_location_id, note, created_at, reference_id')
      .eq('company_id', CO)
      .eq('reference_type', 'incoming_delivery')
      .order('created_at', { ascending: false }),
    // v0.9 Step 3A: current location occupancy — which product holds stock in each
    // location right now. Drives the no-mixed-products put-away UX in the receive modal.
    sb
      .from('inventory_balances')
      .select('location_id, product_id, quantity_available')
      .eq('company_id', CO)
      .gt('quantity_available', 0),
  ])

  // If migration 004 hasn't been applied yet, the reference_type column doesn't exist
  // → movementsRes.error is set → use empty array so the page still renders
  const deliveryMovements = movementsRes.error ? [] : (movementsRes.data ?? [])
  const occupancy = (occupancyRes.data ?? []).map((o) => ({
    location_id: o.location_id as string,
    product_id: o.product_id as string,
  }))

  return (
    <DeliveriesClient
      deliveries={(deliveriesRes.data ?? []) as unknown as Delivery[]}
      suppliers={(suppliersRes.data ?? []) as { id: string; name: string }[]}
      products={(productsRes.data ?? []) as { id: string; name: string; unit: string }[]}
      locations={(locationsRes.data ?? []) as { id: string; code: string }[]}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      deliveryMovements={deliveryMovements as any[]}
      occupancy={occupancy}
      canReceive={canReceive}
      canManage={canManage}
    />
  )
}
