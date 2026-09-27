export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUserContext } from '@/lib/current-user'
import { can } from '@/lib/permissions'
import { InvoicesClient } from './invoices-client'
import type { Invoice, CustomerOption, ProductForInvoice, OrderForInvoice } from './actions'


export default async function InvoicesPage() {
  const { companyId: CO, role } = await getCurrentUserContext()
  const canManage = can(role, 'manage_invoices')
  const canIssue = can(role, 'issue_invoice')
  const canManageCompanySettings = can(role, 'manage_company_settings')
  const sb = createAdminClient()

  const [{ data: invoices }, { data: customers }, { data: products }, { data: orders }] = await Promise.all([
    sb
      .from('invoices')
      .select('*, customers(id, name), outgoing_orders(id, order_number, customer_name)')
      .eq('company_id', CO)
      .eq('customers.company_id', CO)
      .eq('outgoing_orders.company_id', CO)
      .order('created_at', { ascending: false }),
    sb
      .from('customers')
      .select('id, name')
      .eq('company_id', CO)
      .eq('status', 'active')
      .order('name'),
    sb
      .from('products')
      .select('id, name, unit')
      .eq('company_id', CO)
      .eq('status', 'active')
      .order('name'),
    sb
      .from('outgoing_orders')
      .select('id, order_number, customer_name')
      .eq('company_id', CO)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false }),
  ])

  return (
    <>
      {canManageCompanySettings && (
        <div className="mb-4 flex justify-end">
          <Link
            href="/company-settings"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Реквизити за фактури
          </Link>
        </div>
      )}
      <InvoicesClient
        invoices={(invoices ?? []) as unknown as Invoice[]}
        customers={(customers ?? []) as CustomerOption[]}
        products={(products ?? []) as ProductForInvoice[]}
        orders={(orders ?? []) as OrderForInvoice[]}
        canManage={canManage}
        canIssue={canIssue}
      />
    </>
  )
}
