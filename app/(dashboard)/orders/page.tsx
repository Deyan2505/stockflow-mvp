export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { OrdersClient } from './orders-client'
import type { Order } from './actions'

const CO = process.env.DEMO_COMPANY_ID!

export default async function OrdersPage() {
  const sb = createAdminClient()

  const [ordersRes, productsRes, locationsRes] = await Promise.all([
    sb
      .from('outgoing_orders')
      .select('*, outgoing_order_items(id, product_id, ordered_quantity, issued_quantity, location_id)')
      .eq('company_id', CO)
      .order('created_at', { ascending: false }),
    sb.from('products').select('id, name, unit').eq('company_id', CO).eq('status', 'active').order('name'),
    sb.from('locations').select('id, code').eq('company_id', CO).eq('status', 'active').order('code'),
  ])

  return (
    <OrdersClient
      orders={(ordersRes.data ?? []) as unknown as Order[]}
      products={(productsRes.data ?? []) as { id: string; name: string; unit: string }[]}
      locations={(locationsRes.data ?? []) as { id: string; code: string }[]}
    />
  )
}
