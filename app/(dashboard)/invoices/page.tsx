export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentRole } from '@/lib/current-user'
import { can } from '@/lib/permissions'
import { InvoicesClient } from './invoices-client'
import type { Invoice, CustomerOption } from './actions'

const CO = process.env.DEMO_COMPANY_ID!

export default async function InvoicesPage() {
  const role = await getCurrentRole()
  const canManage = can(role, 'manage_invoices')
  const sb = createAdminClient()

  const [{ data: invoices }, { data: customers }] = await Promise.all([
    sb
      .from('invoices')
      .select('*, customers(id, name)')
      .eq('company_id', CO)
      .order('created_at', { ascending: false }),
    sb
      .from('customers')
      .select('id, name')
      .eq('company_id', CO)
      .eq('status', 'active')
      .order('name'),
  ])

  return (
    <InvoicesClient
      invoices={(invoices ?? []) as unknown as Invoice[]}
      customers={(customers ?? []) as CustomerOption[]}
      canManage={canManage}
    />
  )
}
