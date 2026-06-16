export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { OrdersClient } from './orders-client'
import type { Order, Product } from './actions'

const CO = process.env.DEMO_COMPANY_ID!

export default async function OrdersPage() {
  const sb = createAdminClient()

  const [{ data: orders }, { data: products }] = await Promise.all([
    sb
      .from('outgoing_orders')
      .select('id, company_id, order_number, customer_name, status, order_date, expected_date, note, created_at, updated_at')
      .eq('company_id', CO)
      .order('created_at', { ascending: false }),
    sb
      .from('products')
      .select('id, name, unit')
      .eq('company_id', CO)
      .eq('status', 'active')
      .order('name'),
  ])

  return (
    <OrdersClient
      orders={(orders ?? []) as unknown as Order[]}
      products={(products ?? []) as unknown as Product[]}
    />
  )
}
