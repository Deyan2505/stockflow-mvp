export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { DeliveriesClient } from './deliveries-client'
import type { Delivery } from './actions'
import { getCurrentRole } from '@/lib/current-user'
import { can } from '@/lib/permissions'

const CO = process.env.DEMO_COMPANY_ID!

export default async function DeliveriesPage() {
  const role = await getCurrentRole()
  const canReceive = can(role, 'receive_delivery')
  const canManage = can(role, 'manage_deliveries')
  const sb = createAdminClient()

  const [deliveriesRes, suppliersRes, productsRes, locationsRes, movementsRes] = await Promise.all([
    sb
      .from('incoming_deliveries')
      .select(
        '*, suppliers(name), incoming_delivery_items(id, product_id, expected_quantity, received_quantity, location_id)'
      )
      .eq('company_id', CO)
      .order('created_at', { ascending: false }),
    sb.from('suppliers').select('id, name').eq('company_id', CO).eq('status', 'active').order('name'),
    sb.from('products').select('id, name, unit').eq('company_id', CO).eq('status', 'active'),
    sb.from('locations').select('id, code').eq('company_id', CO).eq('status', 'active').order('code'),
    // Movements linked to incoming deliveries — gracefully falls back to [] if migration 004 not yet run
    sb
      .from('stock_movements')
      .select('id, product_id, movement_type, quantity, to_location_id, from_location_id, note, created_at, reference_id')
      .eq('company_id', CO)
      .eq('reference_type', 'incoming_delivery')
      .order('created_at', { ascending: false }),
  ])

  // If migration 004 hasn't been applied yet, the reference_type column doesn't exist
  // → movementsRes.error is set → use empty array so the page still renders
  const deliveryMovements = movementsRes.error ? [] : (movementsRes.data ?? [])

  return (
    <DeliveriesClient
      deliveries={(deliveriesRes.data ?? []) as unknown as Delivery[]}
      suppliers={(suppliersRes.data ?? []) as { id: string; name: string }[]}
      products={(productsRes.data ?? []) as { id: string; name: string; unit: string }[]}
      locations={(locationsRes.data ?? []) as { id: string; code: string }[]}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      deliveryMovements={deliveryMovements as any[]}
      canReceive={canReceive}
      canManage={canManage}
    />
  )
}
