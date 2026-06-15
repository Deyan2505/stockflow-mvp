import { createAdminClient } from '@/lib/supabase/admin'
import { DeliveriesClient } from './deliveries-client'
import type { Delivery } from './actions'

const CO = process.env.DEMO_COMPANY_ID!

export default async function DeliveriesPage() {
  const sb = createAdminClient()

  const [deliveriesRes, suppliersRes, productsRes, locationsRes] = await Promise.all([
    sb
      .from('incoming_deliveries')
      .select(
        '*, suppliers(name), incoming_delivery_items(id, product_id, expected_quantity, received_quantity, location_id)'
      )
      .eq('company_id', CO)
      .order('created_at', { ascending: false }),
    sb.from('suppliers').select('id, name').eq('company_id', CO).eq('status', 'active').order('name'),
    sb.from('products').select('id, name, unit').eq('company_id', CO).eq('status', 'active').order('name'),
    sb.from('locations').select('id, code').eq('company_id', CO).eq('status', 'active').order('code'),
  ])

  return (
    <DeliveriesClient
      deliveries={(deliveriesRes.data ?? []) as unknown as Delivery[]}
      suppliers={(suppliersRes.data ?? []) as { id: string; name: string }[]}
      products={(productsRes.data ?? []) as { id: string; name: string; unit: string }[]}
      locations={(locationsRes.data ?? []) as { id: string; code: string }[]}
    />
  )
}
