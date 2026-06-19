export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { OrdersClient } from './orders-client'
import type { Order, Product, Location } from './actions'
import { getCurrentRole } from '@/lib/current-user'
import { can } from '@/lib/permissions'

const CO = process.env.DEMO_COMPANY_ID!

export default async function OrdersPage() {
  const canIssue = can(getCurrentRole(), 'issue_stock')
  const sb = createAdminClient()

  const [{ data: orders }, { data: products }, { data: locations }] = await Promise.all([
    sb
      .from('outgoing_orders')
      .select('id, company_id, order_number, customer_name, status, order_date, expected_date, issued_date, note, created_at, updated_at')
      .eq('company_id', CO)
      .order('created_at', { ascending: false }),
    sb
      .from('products')
      .select('id, name, unit')
      .eq('company_id', CO)
      .eq('status', 'active')
      .order('name'),
    sb
      .from('locations')
      .select('id, code, warehouses(name)')
      .eq('company_id', CO)
      .eq('status', 'active')
      .order('code'),
  ])

  return (
    <OrdersClient
      orders={(orders ?? []) as unknown as Order[]}
      products={(products ?? []) as unknown as Product[]}
      locations={(locations ?? []) as unknown as Location[]}
      canIssue={canIssue}
    />
  )
}
