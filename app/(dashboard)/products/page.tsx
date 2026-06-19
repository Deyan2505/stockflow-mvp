export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { ProductsClient } from './products-client'
import { type Product } from './actions'
import { getCurrentRole } from '@/lib/current-user'
import { can } from '@/lib/permissions'

export default async function ProductsPage() {
  const canWrite = can(await getCurrentRole(), 'manage_products')
  const sb = createAdminClient()

  const { data, error } = await sb
    .from('products')
    .select('*')
    .eq('company_id', process.env.DEMO_COMPANY_ID!)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
        Database error: {error.message}
      </div>
    )
  }

  return <ProductsClient products={(data as Product[]) ?? []} canWrite={canWrite} />
}
