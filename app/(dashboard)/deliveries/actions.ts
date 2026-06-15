'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

const CO = process.env.DEMO_COMPANY_ID!

export type DeliveryItemRow = {
  id: string
  product_id: string
  expected_quantity: number
  received_quantity: number
  location_id: string | null
}

export type Delivery = {
  id: string
  company_id: string
  supplier_id: string
  delivery_number: string
  status: 'draft' | 'expected' | 'received' | 'partially_received' | 'cancelled'
  expected_date: string | null
  received_date: string | null
  note: string | null
  created_at: string
  updated_at: string
  suppliers: { name: string } | null
  incoming_delivery_items: DeliveryItemRow[]
}

export type DeliveryItemInput = {
  product_id: string
  expected_quantity: number
  location_id: string | null
}

export type DeliveryInput = {
  supplier_id: string
  delivery_number: string
  status: 'draft' | 'expected'
  expected_date: string | null
  note: string | null
  items: DeliveryItemInput[]
}

export type DeliveryResult = { success: true } | { success: false; error: string }

export async function createDelivery(input: DeliveryInput): Promise<DeliveryResult> {
  try {
    const sb = createAdminClient()

    const { data: delivery, error: delErr } = await sb
      .from('incoming_deliveries')
      .insert({
        company_id: CO,
        supplier_id: input.supplier_id,
        delivery_number: input.delivery_number.trim(),
        status: input.status,
        expected_date: input.expected_date || null,
        note: input.note || null,
      })
      .select('id')
      .single()

    if (delErr) throw new Error(delErr.message)

    const { error: itemsErr } = await sb.from('incoming_delivery_items').insert(
      input.items.map((item) => ({
        company_id: CO,
        delivery_id: delivery.id,
        product_id: item.product_id,
        expected_quantity: item.expected_quantity,
        received_quantity: 0,
        location_id: item.location_id || null,
      }))
    )

    if (itemsErr) {
      await sb.from('incoming_deliveries').delete().eq('id', delivery.id)
      throw new Error(itemsErr.message)
    }

    revalidatePath('/deliveries')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Грешка, опитай отново' }
  }
}

export async function updateDelivery(id: string, input: DeliveryInput): Promise<DeliveryResult> {
  try {
    const sb = createAdminClient()

    const { error: delErr } = await sb
      .from('incoming_deliveries')
      .update({
        supplier_id: input.supplier_id,
        delivery_number: input.delivery_number.trim(),
        status: input.status,
        expected_date: input.expected_date || null,
        note: input.note || null,
      })
      .eq('id', id)
      .eq('company_id', CO)

    if (delErr) throw new Error(delErr.message)

    const { error: deleteErr } = await sb
      .from('incoming_delivery_items')
      .delete()
      .eq('delivery_id', id)
      .eq('company_id', CO)

    if (deleteErr) throw new Error(deleteErr.message)

    const { error: itemsErr } = await sb.from('incoming_delivery_items').insert(
      input.items.map((item) => ({
        company_id: CO,
        delivery_id: id,
        product_id: item.product_id,
        expected_quantity: item.expected_quantity,
        received_quantity: 0,
        location_id: item.location_id || null,
      }))
    )

    if (itemsErr) throw new Error(itemsErr.message)

    revalidatePath('/deliveries')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Грешка, опитай отново' }
  }
}

export async function cancelDelivery(id: string): Promise<DeliveryResult> {
  try {
    const sb = createAdminClient()
    const { error } = await sb
      .from('incoming_deliveries')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('company_id', CO)
    if (error) throw new Error(error.message)
    revalidatePath('/deliveries')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Грешка, опитай отново' }
  }
}
