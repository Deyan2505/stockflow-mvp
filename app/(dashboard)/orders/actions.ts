'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { findProductByBarcode } from '@/lib/barcode-utils'

const CO = process.env.DEMO_COMPANY_ID!

export async function findProductForOrder(barcode: string): Promise<{ id: string; name: string } | null> {
  const trimmed = barcode.trim()
  if (!trimmed) return null
  const product = await findProductByBarcode(trimmed)
  if (!product) return null
  return { id: product.id, name: product.name }
}

export type OrderItemRow = {
  id: string
  product_id: string
  ordered_quantity: number
  issued_quantity: number
  location_id: string | null
}

export type Order = {
  id: string
  company_id: string
  order_number: string
  customer_name: string | null
  status: 'draft' | 'confirmed' | 'issued' | 'partially_issued' | 'cancelled'
  order_date: string | null
  issued_date: string | null
  note: string | null
  created_at: string
  updated_at: string
  outgoing_order_items: OrderItemRow[]
}

export type OrderItemInput = {
  product_id: string
  ordered_quantity: number
  location_id: string | null
}

export type OrderInput = {
  order_number: string
  customer_name: string | null
  status: 'draft' | 'confirmed'
  order_date: string | null
  note: string | null
  items: OrderItemInput[]
}

export type OrderResult = { success: true } | { success: false; error: string }

export async function createOrder(input: OrderInput): Promise<OrderResult> {
  try {
    const sb = createAdminClient()

    const { data: order, error: ordErr } = await sb
      .from('outgoing_orders')
      .insert({
        company_id: CO,
        order_number: input.order_number.trim(),
        customer_name: input.customer_name || null,
        status: input.status,
        order_date: input.order_date || null,
        note: input.note || null,
      })
      .select('id')
      .single()

    if (ordErr) {
      if (ordErr.code === '23505') throw new Error('Номерът на поръчка вече е зает')
      throw new Error(ordErr.message)
    }

    const { error: itemsErr } = await sb.from('outgoing_order_items').insert(
      input.items.map((item) => ({
        company_id: CO,
        order_id: order.id,
        product_id: item.product_id,
        ordered_quantity: item.ordered_quantity,
        issued_quantity: 0,
        location_id: item.location_id || null,
      }))
    )

    if (itemsErr) {
      await sb.from('outgoing_orders').delete().eq('id', order.id)
      throw new Error(itemsErr.message)
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

    const { error: ordErr } = await sb
      .from('outgoing_orders')
      .update({
        order_number: input.order_number.trim(),
        customer_name: input.customer_name || null,
        status: input.status,
        order_date: input.order_date || null,
        note: input.note || null,
      })
      .eq('id', id)
      .eq('company_id', CO)

    if (ordErr) {
      if (ordErr.code === '23505') throw new Error('Номерът на поръчка вече е зает')
      throw new Error(ordErr.message)
    }

    const { error: deleteErr } = await sb
      .from('outgoing_order_items')
      .delete()
      .eq('order_id', id)
      .eq('company_id', CO)

    if (deleteErr) throw new Error(deleteErr.message)

    const { error: itemsErr } = await sb.from('outgoing_order_items').insert(
      input.items.map((item) => ({
        company_id: CO,
        order_id: id,
        product_id: item.product_id,
        ordered_quantity: item.ordered_quantity,
        issued_quantity: 0,
        location_id: item.location_id || null,
      }))
    )

    if (itemsErr) throw new Error(itemsErr.message)

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
