export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { LocationsClient } from './locations-client'
import { type Location } from './actions'
import { type Warehouse } from '../warehouses/actions'

export default async function LocationsPage() {
  const sb = createAdminClient()
  const co = process.env.DEMO_COMPANY_ID!

  const [{ data: locations, error: locError }, { data: warehouses, error: whError }] =
    await Promise.all([
      sb
        .from('locations')
        .select('*, warehouses(name)')
        .eq('company_id', co)
        .order('created_at', { ascending: false }),
      sb
        .from('warehouses')
        .select('*')
        .eq('company_id', co)
        .eq('status', 'active')
        .order('name'),
    ])

  if (locError || whError) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
        Database error: {(locError ?? whError)?.message}
      </div>
    )
  }

  return (
    <LocationsClient
      locations={(locations as Location[]) ?? []}
      warehouses={(warehouses as Warehouse[]) ?? []}
    />
  )
}
