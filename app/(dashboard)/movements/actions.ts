'use server'

import { revalidatePath } from 'next/cache'
import { recordMovement, type MovementInput } from '@/lib/movement-engine'

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
}

export type MovementResult = { success: true } | { success: false; error: string }

export async function submitMovement(input: MovementInput): Promise<MovementResult> {
  try {
    await recordMovement(input)
    revalidatePath('/')
    revalidatePath('/movements')
    revalidatePath('/inventory')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Грешка, опитай отново' }
  }
}
