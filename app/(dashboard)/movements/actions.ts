'use server'

import { revalidatePath } from 'next/cache'
import { recordMovement, type MovementInput } from '@/lib/movement-engine'
import { findProductByBarcode } from '@/lib/barcode-utils'
import { requirePermission } from '@/lib/current-user'

export type { MovementInput }

export type ProductOption = {
  id: string
  name: string
  sku: string | null
  unit: string
  status: string
}

export type LocationOption = {
  id: string
  code: string
  warehouse_id: string
  status: string
  warehouses?: { name: string }
}

export type BalanceRow = {
  product_id: string
  location_id: string
  quantity_available: number
}

export type Movement = {
  id: string
  company_id: string
  product_id: string
  movement_type: 'IN' | 'OUT' | 'TRANSFER'
  quantity: number
  from_location_id: string | null
  to_location_id: string | null
  user_id: string | null
  note: string | null
  created_at: string
  reference_type: string | null
  reference_id: string | null
}

export type MovementResult = { success: true } | { success: false; error: string }

export type ProductForMovement = { id: string; name: string }

export async function findProductForMovement(barcode: string): Promise<ProductForMovement | null> {
  const trimmed = barcode.trim()
  if (!trimmed) return null
  const product = await findProductByBarcode(trimmed)
  if (!product) return null
  return { id: product.id, name: product.name }
}

export async function submitMovement(input: MovementInput): Promise<MovementResult> {
  try {
    await requirePermission('create_movement')
    await recordMovement(input)
    revalidatePath('/')
    revalidatePath('/movements')
    revalidatePath('/inventory')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Грешка, опитай отново' }
  }
}
