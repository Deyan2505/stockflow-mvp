'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { type Product } from '@/app/(dashboard)/products/actions'

const CO = process.env.DEMO_COMPANY_ID!

/**
 * Find an active product by its barcode value.
 * Read-only — never creates stock movements, never modifies inventory.
 * Returns null if barcode is empty, not found, or archived.
 */
export async function findProductByBarcode(barcode: string): Promise<Product | null> {
  const trimmed = barcode.trim()
  if (!trimmed) return null

  const sb = createAdminClient()
  const { data, error } = await sb
    .from('products')
    .select('*')
    .eq('company_id', CO)
    .eq('barcode', trimmed)
    .eq('status', 'active')
    .maybeSingle()

  if (error || !data) return null
  return data as Product
}
