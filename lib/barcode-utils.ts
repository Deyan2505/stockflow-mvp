'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { type Product } from '@/app/(dashboard)/products/actions'

const CO = process.env.DEMO_COMPANY_ID!

/**
 * Find an active product by its barcode value.
 * Read-only — used by products form for duplicate-check guard.
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

// ── Lookup types ───────────────────────────────────────────────────────────────

export type InventoryBalance = {
  warehouse_name: string
  location_code: string
  quantity_available: number
  unit: string
}

export type LookupResult = {
  product: Product
  totalQty: number
  balances: InventoryBalance[]
}

/**
 * Full barcode lookup for /scan page.
 * Read-only — returns product + inventory breakdown by location.
 * Never creates stock movements or modifies inventory balances.
 */
export async function lookupByBarcode(barcode: string): Promise<LookupResult | null> {
  const trimmed = barcode.trim()
  if (!trimmed) return null

  const sb = createAdminClient()

  const { data: productData } = await sb
    .from('products')
    .select('*')
    .eq('company_id', CO)
    .eq('barcode', trimmed)
    .eq('status', 'active')
    .maybeSingle()

  if (!productData) return null
  const product = productData as Product

  const { data: balanceData } = await sb
    .from('inventory_balances')
    .select('quantity_available, locations ( code, warehouses ( name ) )')
    .eq('company_id', CO)
    .eq('product_id', product.id)
    .gt('quantity_available', 0)
    .order('quantity_available', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const balances: InventoryBalance[] = (balanceData ?? []).map((row: any) => ({
    warehouse_name: (row.locations?.warehouses?.name ?? '—') as string,
    location_code: (row.locations?.code ?? '—') as string,
    quantity_available: Number(row.quantity_available),
    unit: product.unit,
  }))

  const totalQty = balances.reduce((sum, b) => sum + b.quantity_available, 0)

  return { product, totalQty, balances }
}
