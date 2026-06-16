'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

const CO = process.env.DEMO_COMPANY_ID!

// v0.6 Step 1: header CRUD — no fulfillment, no stock movements
// v0.6 Step 2: order items CRUD — no fulfillment, no stock movements, no inventory change

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

// ─── Products (for dropdown in order items) ───────────────────────────────────

export type Product = { id: string; name: string; unit: string | null }

// ─── Order Items ──────────────────────────────────────────────────────────────

export type OrderItem = {
  id: string
  order_id: string
  product_id: string
  ordered_quantity: number
  created_at: string
  products: { name: string; unit: string | null } | null
}

export type OrderItemResult = { success: true } | { success: false; error: string }

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

// ─── Order Items Actions ──────────────────────────────────────────────────────
// None of these create stock movements or touch inventory_balances.

export async function getOrderItems(orderId: string): Promise<OrderItem[]> {
  const sb = createAdminClient()
  const { data } = await sb
    .from('outgoing_order_items')
    .select('id, order_id, product_id, ordered_quantity, created_at, products(name, unit)')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })
  return (data ?? []) as unknown as OrderItem[]
}

export async function addOrderItem(
  orderId: string,
  productId: string,
  quantity: number
): Promise<OrderItemResult> {
  if (quantity <= 0) return { success: false, error: 'Количеството трябва да е положително' }
  try {
    const sb = createAdminClient()
    const { error } = await sb
      .from('outgoing_order_items')
      .insert({
        company_id:       CO,
        order_id:         orderId,
        product_id:       productId,
        ordered_quantity: quantity,
      })
    if (error) {
      if (error.code === '23505') throw new Error('Продуктът вече е добавен в тази поръчка')
      throw new Error(error.message)
    }
    revalidatePath('/orders')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Грешка, опитай отново' }
  }
}

export async function updateOrderItem(
  itemId: string,
  quantity: number
): Promise<OrderItemResult> {
  if (quantity <= 0) return { success: false, error: 'Количеството трябва да е положително' }
  try {
    const sb = createAdminClient()
    const { error } = await sb
      .from('outgoing_order_items')
      .update({ ordered_quantity: quantity })
      .eq('id', itemId)
    if (error) throw new Error(error.message)
    revalidatePath('/orders')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Грешка, опитай отново' }
  }
}

export async function removeOrderItem(itemId: string): Promise<OrderItemResult> {
  try {
    const sb = createAdminClient()
    const { error } = await sb
      .from('outgoing_order_items')
      .delete()
      .eq('id', itemId)
    if (error) throw new Error(error.message)
    revalidatePath('/orders')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Грешка, опитай отново' }
  }
}
