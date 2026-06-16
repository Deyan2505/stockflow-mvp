'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { recordMovement } from '@/lib/movement-engine'
import { findProductByBarcode } from '@/lib/barcode-utils'

const CO = process.env.DEMO_COMPANY_ID!

export async function findProductForDelivery(barcode: string): Promise<{ id: string; name: string } | null> {
  const trimmed = barcode.trim()
  if (!trimmed) return null
  const product = await findProductByBarcode(trimmed)
  if (!product) return null
  return { id: product.id, name: product.name }
}

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

// ─── Receive delivery (F-021) ─────────────────────────────────────────────────

export type ReceiveItemInput = {
  item_id: string
  product_id: string
  quantity_to_receive: number
  location_id: string
}

export type ReceiveDeliveryInput = {
  delivery_id: string
  delivery_number: string
  items: ReceiveItemInput[]
}

export type ReceiveResult =
  | { success: true; newStatus: 'received' | 'partially_received' }
  | { success: false; error: string }

export async function receiveDelivery(input: ReceiveDeliveryInput): Promise<ReceiveResult> {
  try {
    const sb = createAdminClient()

    // Guard: re-read delivery status from DB to prevent double-receive
    const { data: delivery, error: delErr } = await sb
      .from('incoming_deliveries')
      .select('id, status, delivery_number')
      .eq('id', input.delivery_id)
      .eq('company_id', CO)
      .single()

    if (delErr || !delivery) throw new Error('Доставката не е намерена')
    if (delivery.status === 'received')
      throw new Error('Тази доставка вече е получена.')
    if (delivery.status === 'cancelled')
      throw new Error('Отменена доставка не може да бъде приемана.')

    // Authoritative item state from DB (received_quantity may differ from what UI sent)
    const { data: dbItems, error: itemsErr } = await sb
      .from('incoming_delivery_items')
      .select('id, expected_quantity, received_quantity, product_id, location_id')
      .eq('delivery_id', input.delivery_id)
      .eq('company_id', CO)

    if (itemsErr) throw new Error(itemsErr.message)
    if (!dbItems?.length) throw new Error('Доставката няма продукти')

    const note = `Приемане от доставка #${delivery.delivery_number}`

    // Process each item: movement first, then received_quantity update
    for (const receiveItem of input.items) {
      if (!receiveItem.quantity_to_receive || receiveItem.quantity_to_receive <= 0) continue

      const dbItem = dbItems.find((i) => i.id === receiveItem.item_id)
      if (!dbItem) continue

      // Cap at remaining (safety net against stale UI data)
      const maxReceivable =
        Number(dbItem.expected_quantity) - Number(dbItem.received_quantity)
      const actualQty = Math.min(receiveItem.quantity_to_receive, maxReceivable)
      if (actualQty <= 0) continue

      // Atomic: creates stock movement + upserts inventory_balances via RPC
      await recordMovement({
        movement_type: 'IN',
        product_id: dbItem.product_id,
        from_location_id: null,
        to_location_id: receiveItem.location_id,
        quantity: actualQty,
        note,
        reference_type: 'incoming_delivery',
        reference_id: input.delivery_id,
      })

      // Update received_quantity immediately after each successful movement
      const newReceivedQty = Number(dbItem.received_quantity) + actualQty
      const { error: updateErr } = await sb
        .from('incoming_delivery_items')
        .update({ received_quantity: newReceivedQty })
        .eq('id', receiveItem.item_id)
        .eq('company_id', CO)

      if (updateErr) throw new Error(updateErr.message)

      // Keep in-memory state accurate for next iterations
      dbItem.received_quantity = newReceivedQty
    }

    // Determine new delivery status
    const { data: finalItems } = await sb
      .from('incoming_delivery_items')
      .select('expected_quantity, received_quantity')
      .eq('delivery_id', input.delivery_id)
      .eq('company_id', CO)

    const allReceived =
      finalItems?.every(
        (i) => Number(i.received_quantity) >= Number(i.expected_quantity)
      ) ?? false
    const anyReceived = finalItems?.some((i) => Number(i.received_quantity) > 0) ?? false

    const newStatus = allReceived ? 'received' : 'partially_received'

    const updatePayload: Record<string, unknown> = { status: newStatus }
    if (anyReceived) {
      updatePayload.received_date = new Date().toISOString().split('T')[0]
    }

    const { error: statusErr } = await sb
      .from('incoming_deliveries')
      .update(updatePayload)
      .eq('id', input.delivery_id)
      .eq('company_id', CO)

    if (statusErr) throw new Error(statusErr.message)

    revalidatePath('/deliveries')
    revalidatePath('/movements')
    revalidatePath('/inventory')
    revalidatePath('/')

    return { success: true, newStatus }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Грешка, опитай отново',
    }
  }
}
