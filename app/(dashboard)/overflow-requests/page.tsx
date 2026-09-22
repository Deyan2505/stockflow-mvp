export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuthenticatedPermission } from '@/lib/current-user'
import { OverflowRequestsClient, type OverflowRequestRow } from './overflow-requests-client'

export default async function OverflowRequestsPage() {
  const context = await requireAuthenticatedPermission('request_overflow')
  const sb = createAdminClient()
  const co = context.companyId
  const [requests, products, locations, balances, deliveryItems, deliveries] =
    await Promise.all([
      sb.from('overflow_requests').select('*').eq('company_id', co)
        .order('created_at', { ascending: false }).limit(100),
      sb.from('products').select('id, name, unit, status')
        .eq('company_id', co).eq('status', 'active'),
      sb.from('locations')
        .select('id, code, warehouse_id, is_buffer, max_capacity_units, status')
        .eq('company_id', co).eq('status', 'active').order('code'),
      sb.from('inventory_balances').select('location_id, quantity_available')
        .eq('company_id', co),
      sb.from('incoming_delivery_items')
        .select('id, delivery_id, product_id, expected_quantity, received_quantity')
        .eq('company_id', co),
      sb.from('incoming_deliveries').select('id, delivery_number, status')
        .eq('company_id', co),
    ])

  const error = requests.error ?? products.error ?? locations.error
    ?? balances.error ?? deliveryItems.error ?? deliveries.error
  if (error) {
    return <p className="rounded-lg bg-red-50 p-4 text-red-700">
      Заявките не могат да се заредят: {error.message}
    </p>
  }
  const deliveryMap = new Map((deliveries.data ?? []).map((d) => [d.id, d]))
  const openItems = (deliveryItems.data ?? []).flatMap((i) => {
    const delivery = deliveryMap.get(i.delivery_id)
    if (!delivery || !['draft', 'expected', 'partially_received'].includes(delivery.status)
      || Number(i.expected_quantity) <= Number(i.received_quantity)) return []
    return [{
      id: i.id, product_id: i.product_id,
      remaining: Number(i.expected_quantity) - Number(i.received_quantity),
      delivery_number: delivery.delivery_number,
    }]
  })
  const occupied = new Map<string, number>()
  for (const b of balances.data ?? [])
    occupied.set(b.location_id,
      (occupied.get(b.location_id) ?? 0) + Number(b.quantity_available))

  return <OverflowRequestsClient
    operatorId={context.userId}
    products={(products.data ?? []) as { id: string; name: string; unit: string }[]}
    locations={(locations.data ?? []) as {
      id: string; code: string; warehouse_id: string; is_buffer: boolean;
      max_capacity_units: number; status: string
    }[]}
    occupied={Object.fromEntries(occupied)}
    deliveryItems={openItems}
    requests={(requests.data ?? []) as OverflowRequestRow[]}
  />
}
