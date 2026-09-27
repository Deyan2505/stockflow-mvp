export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { SuppliersClient } from './suppliers-client'
import type { Supplier } from './actions'
import { getCurrentUserContext } from '@/lib/current-user'
import { can } from '@/lib/permissions'


export default async function SuppliersPage() {
  const { companyId: CO, role } = await getCurrentUserContext()
  const canWrite = can(role, 'manage_suppliers')
  const sb = createAdminClient()
  const { data } = await sb
    .from('suppliers')
    .select('*')
    .eq('company_id', CO)
    .order('name')

  return <SuppliersClient suppliers={(data ?? []) as Supplier[]} canWrite={canWrite} />
}
