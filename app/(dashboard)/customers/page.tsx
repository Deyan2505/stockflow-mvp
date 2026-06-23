export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { CustomersClient } from './customers-client'
import type { Customer } from './actions'
import { getCurrentRole } from '@/lib/current-user'
import { can } from '@/lib/permissions'

const CO = process.env.DEMO_COMPANY_ID!

export default async function CustomersPage() {
  const canWrite = can(await getCurrentRole(), 'manage_customers')
  const sb = createAdminClient()
  const { data } = await sb
    .from('customers')
    .select('*')
    .eq('company_id', CO)
    .order('name')

  return <CustomersClient customers={(data ?? []) as Customer[]} canWrite={canWrite} />
}
