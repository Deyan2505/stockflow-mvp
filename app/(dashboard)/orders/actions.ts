'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

const CO = process.env.DEMO_COMPANY_ID!

// v0.6 Step 1: header only — no order items, no fulfillment, no stock movements

export type Order = {
  id: string
  company_id: string
  order_number: string
  customer_name: string | null
  status: 'draft' | 'open' | 'cancelled'
  order_date: string | null
  expected_date: string | null
  note: string | null
  created_at: string
  updated_at: string
}

export type OrderInput = {
  order_number: string
  customer_name: string | null
  status: 'draft' | 'open'
  order_date: string | null
  expected_date: string | null
  note: string | null
}

export type OrderResult = { success: true } | { success: false; error: string }

export async function createOrder(input: OrderInput): Promise<OrderResult> {
  try {
    const sb = createAdminClient()

    const { error } = await sb
      .from('outgoing_orders')
      .insert({
        company_id:    CO,
        order_number:  input.order_number.trim(),
        customer_name: input.customer_name || null,
        status:        input.status,
        order_date:    input.order_date || null,
        expected_date: input.expected_date || null,
        note:          input.note || null,
      })

    if (error) {
      if (error.code === '23505') throw new Error('Номерът на поръчка вече е зает')
      throw new Error(error.message)
    }

    revalidatePath('/orders')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Грешка, опитай отново' }
  }
}

export async function updateOrder(id: string, input: OrderInput): Promise<OrderResult> {
  try {
    const sb = createAdminClient()

    const { error } = await sb
      .from('outgoing_orders')
      .update({
        order_number:  input.order_number.trim(),
        customer_name: input.customer_name || null,
        status:        input.status,
        order_date:    input.order_date || null,
        expected_date: input.expected_date || null,
        note:          input.note || null,
      })
      .eq('id', id)
      .eq('company_id', CO)

    if (error) {
      if (error.code === '23505') throw new Error('Номерът на поръчка вече е зает')
      throw new Error(error.message)
    }

    revalidatePath('/orders')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Грешка, опитай отново' }
  }
}

export async function cancelOrder(id: string): Promise<OrderResult> {
  try {
    const sb = createAdminClient()
    const { error } = await sb
      .from('outgoing_orders')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('company_id', CO)
    if (error) throw new Error(error.message)
    revalidatePath('/orders')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Грешка, опитай отново' }
  }
}
