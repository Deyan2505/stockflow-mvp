'use server'

import { revalidatePath } from 'next/cache'
import { recordMovement, type MovementInput } from '@/lib/movement-engine'
import { findProductByBarcode } from '@/lib/barcode-utils'
import { requirePermission } from '@/lib/current-user'
import { createAdminClient } from '@/lib/supabase/admin'

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

export type SupplierOption = {
  id: string
  name: string
  status: string
}

export type CustomerOption = {
  id: string
  name: string
  status: string
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
  customer_name?: string | null
  supplier_name?: string | null
}

export type MovementResult = { success: true } | { success: false; error: string }

export type ProductForMovement = { id: string; name: string }

export type MovementActionInput = MovementInput & {
  supplier_id?: string | null
  customer_id?: string | null
  new_customer_name?: string | null
}

export async function findProductForMovement(barcode: string): Promise<ProductForMovement | null> {
  const trimmed = barcode.trim()
  if (!trimmed) return null
  const product = await findProductByBarcode(trimmed)
  if (!product) return null
  return { id: product.id, name: product.name }
}

export async function submitMovement(input: MovementActionInput): Promise<MovementResult> {
  try {
    await requirePermission('create_movement')

    const co = process.env.DEMO_COMPANY_ID!
    const updatedInput: MovementInput = {
      movement_type: input.movement_type,
      product_id: input.product_id,
      from_location_id: input.from_location_id,
      to_location_id: input.to_location_id,
      quantity: input.quantity,
      note: input.note,
    }

    if (input.movement_type === 'IN') {
      if (!input.supplier_id) {
        throw new Error('Изборът на доставчик е задължителен')
      }
      updatedInput.reference_type = 'supplier'
      updatedInput.reference_id = input.supplier_id
    } else if (input.movement_type === 'OUT') {
      if (!input.customer_id) {
        throw new Error('Изборът на клиент е задължителен')
      }

      if (input.customer_id === 'NEW') {
        const trimmedName = input.new_customer_name?.trim()
        if (!trimmedName) {
          throw new Error('Името на новия клиент е задължително')
        }

        const sb = createAdminClient()
        // Check if customer already exists for this company
        const { data: existingCustomer } = await sb
          .from('customers')
          .select('id')
          .eq('company_id', co)
          .eq('name', trimmedName)
          .maybeSingle()

        if (existingCustomer) {
          updatedInput.reference_id = existingCustomer.id
        } else {
          const { data: newCustomer, error: insertErr } = await sb
            .from('customers')
            .insert({
              company_id: co,
              name: trimmedName,
              status: 'active',
            })
            .select('id')
            .single()

          if (insertErr) {
            throw new Error(insertErr.message)
          }
          updatedInput.reference_id = newCustomer.id
        }
      } else {
        updatedInput.reference_id = input.customer_id
      }
      updatedInput.reference_type = 'customer'
    }

    await recordMovement(updatedInput)

    revalidatePath('/')
    revalidatePath('/movements')
    revalidatePath('/inventory')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Грешка, опитай отново' }
  }
}
