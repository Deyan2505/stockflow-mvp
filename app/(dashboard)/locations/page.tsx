export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { LocationsClient } from './locations-client'
import { type Location } from './actions'
import { type Warehouse } from '../warehouses/actions'
import { getCurrentUserContext } from '@/lib/current-user'
import { can } from '@/lib/permissions'

export default async function LocationsPage() {
  const { companyId, role } = await getCurrentUserContext()
  const canWrite = can(role, 'manage_locations')
  const sb = createAdminClient()

  const [{ data: locations, error: locError }, { data: warehouses, error: whError }, { data: balances, error: balError }] =
    await Promise.all([
      sb
        .from('locations')
        .select('*, warehouses(name)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false }),
      sb
        .from('warehouses')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('name'),
      sb.from('inventory_balances')
        .select('location_id, quantity_available')
        .eq('company_id', companyId),
    ])

  if (locError || whError || balError) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
        Database error: {(locError ?? whError ?? balError)?.message}
      </div>
    )
  }

  const occupancy = new Map<string, number>()
  for (const b of balances ?? [])
    occupancy.set(b.location_id, (occupancy.get(b.location_id) ?? 0) + Number(b.quantity_available))

  return (
    <LocationsClient
      locations={((locations as Location[]) ?? []).map((l) => ({
        ...l, occupied_units: occupancy.get(l.id) ?? 0,
      }))}
      warehouses={(warehouses as Warehouse[]) ?? []}
      canWrite={canWrite}
    />
  )
}
