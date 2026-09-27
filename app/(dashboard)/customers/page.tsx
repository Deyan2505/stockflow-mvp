export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { CustomersClient } from './customers-client'
import type { Customer } from './actions'
import { getCurrentUserContext } from '@/lib/current-user'
import { can } from '@/lib/permissions'


export default async function CustomersPage() {
  const { companyId: CO, role } = await getCurrentUserContext()
  const canWrite = can(role, 'manage_customers')
  const sb = createAdminClient()
  const { data } = await sb
    .from('customers')
    .select('*')
    .eq('company_id', CO)
    .order('name')

  return <CustomersClient customers={(data ?? []) as Customer[]} canWrite={canWrite} />
}
