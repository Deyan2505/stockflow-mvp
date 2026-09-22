'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { recordMovement } from '@/lib/movement-engine'
import { findProductByBarcode } from '@/lib/barcode-utils'
import { requireAuthenticatedPermission } from '@/lib/current-user'

export async function findProductForDelivery(barcode: string): Promise<{ id: string; name: string } | null> {
  const trimmed = barcode.trim()
  if (!trimmed) return null
  const context = await requireAuthenticatedPermission('manage_deliveries')
  const product = await findProductByBarcode(trimmed, context.companyId)
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
    const { companyId: CO } = await requireAuthenticatedPermission('manage_deliveries')
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
    const { companyId: CO } = await requireAuthenticatedPermission('manage_deliveries')
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
    const { companyId: CO } = await requireAuthenticatedPermission('manage_deliveries')
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

export type PlacementInput = {
  location_id: string
  quantity: number
}

export type ReceiveItemInput = {
  item_id: string
  product_id: string
  quantity_to_receive: number
  // v0.9 Step 3A: one delivery item can be split across multiple locations
  placements: PlacementInput[]
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
    const context = await requireAuthenticatedPermission('receive_delivery')
    const co = context.companyId
    const sb = createAdminClient()

    // Guard: re-read delivery status from DB to prevent double-receive
    const { data: delivery, error: delErr } = await sb
      .from('incoming_deliveries')
      .select('id, status, delivery_number')
      .eq('id', input.delivery_id)
      .eq('company_id', co)
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
      .eq('company_id', co)

    if (itemsErr) throw new Error(itemsErr.message)
    if (!dbItems?.length) throw new Error('Доставката няма продукти')

    const note = `Приемане от доставка #${delivery.delivery_number}`
    const EPS = 1e-6

    // v0.9 Step 3A: resolve which of the submitted placement locations are actually
    // active. Server-side safety net — admin client bypasses RLS, so we never trust
    // the client to have offered only valid locations.
    const placementLocationIds = Array.from(
      new Set(
        input.items.flatMap((it) =>
          (it.placements ?? []).map((p) => p.location_id).filter(Boolean)
        )
      )
    )

    const activeLocationIds = new Set<string>()
    const capacityByLocation = new Map<string, number>()
    if (placementLocationIds.length > 0) {
      const { data: activeLocs, error: locErr } = await sb
        .from('locations')
        .select('id, max_capacity_units')
        .eq('company_id', co)
        .eq('status', 'active')
        .in('id', placementLocationIds)
      if (locErr) throw new Error(locErr.message)
      for (const l of activeLocs ?? []) {
        activeLocationIds.add(l.id)
        capacityByLocation.set(l.id, Number(l.max_capacity_units))
      }
    }

    // v0.9 Step 3A: current occupancy of each placement location — which product(s)
    // hold stock there right now (quantity_available > 0). Used to enforce the
    // no-mixed-products rule (MVP default; allow_mixed_products is Step 3B).
    const occByLocation = new Map<string, Set<string>>()
    const occupiedByLocation = new Map<string, number>()
    if (placementLocationIds.length > 0) {
      const { data: bals, error: balErr } = await sb
        .from('inventory_balances')
        .select('location_id, product_id, quantity_available')
        .eq('company_id', co)
        .in('location_id', placementLocationIds)
        .gt('quantity_available', 0)
      if (balErr) throw new Error(balErr.message)
      for (const b of bals ?? []) {
        occupiedByLocation.set(b.location_id, (occupiedByLocation.get(b.location_id) ?? 0) + Number(b.quantity_available))
        let s = occByLocation.get(b.location_id)
        if (!s) { s = new Set<string>(); occByLocation.set(b.location_id, s) }
        s.add(b.product_id)
      }
    }

    // ── PASS 1: validate everything up front; build the movement work list ──
    // No stock movement is created until every placement of every item passes.
    // This keeps receiving all-or-nothing (a mixed-product placement on item 2
    // must not leave item 1 already received).
    type Move = { item_id: string; product_id: string; location_id: string; quantity: number }
    const work: Move[] = []
    const runningReceived = new Map<string, number>() // item_id → received so far
    const intendedProductByLocation = new Map<string, string>() // loc → product placed in THIS op

    for (const receiveItem of input.items) {
      const qtyToReceive = Number(receiveItem.quantity_to_receive)
      if (!qtyToReceive || qtyToReceive <= 0) continue
      if (!Number.isSafeInteger(qtyToReceive))
        throw new Error('Полученото количество трябва да е цяло число в pcs.')

      const dbItem = dbItems.find((i) => i.id === receiveItem.item_id)
      if (!dbItem) continue

      // Cannot receive more than what remains on this line (authoritative from DB)
      const maxReceivable =
        Number(dbItem.expected_quantity) - Number(dbItem.received_quantity)
      if (qtyToReceive > maxReceivable + EPS) {
        throw new Error('Полученото количество не може да надвишава оставащото количество.')
      }

      const placements = receiveItem.placements ?? []
      if (placements.length === 0) {
        throw new Error('Изберете локация за всяко разпределение.')
      }

      let assigned = 0
      for (const p of placements) {
        const pQty = Number(p.quantity)
        if (!p.location_id) {
          throw new Error('Изберете локация за всяко разпределение.')
        }
        if (!pQty || pQty <= 0) {
          throw new Error('Количеството за всяко разпределение трябва да е над 0.')
        }
        if (!Number.isSafeInteger(pQty))
          throw new Error('Количеството за всяко разпределение трябва да е цяло число в pcs.')
        if (!activeLocationIds.has(p.location_id)) {
          throw new Error('Избрана е неактивна локация.')
        }

        // No-mixed-products: reject if the location currently holds ANOTHER product.
        // 'only same product' = exactly one occupant and it is the product we receive.
        const occupants = occByLocation.get(p.location_id)
        if (occupants && occupants.size > 0) {
          const onlySameProduct = occupants.size === 1 && occupants.has(dbItem.product_id)
          if (!onlySameProduct) {
            throw new Error('Локацията вече съдържа друг продукт. Изберете празна локация или локация със същия продукт.')
          }
        }
        // …or if THIS same receive operation already routed a different product here
        const intended = intendedProductByLocation.get(p.location_id)
        if (intended && intended !== dbItem.product_id) {
          throw new Error('Локацията вече съдържа друг продукт. Изберете празна локация или локация със същия продукт.')
        }
        intendedProductByLocation.set(p.location_id, dbItem.product_id)

        assigned += pQty
        work.push({ item_id: dbItem.id, product_id: dbItem.product_id, location_id: p.location_id, quantity: pQty })
      }

      if (Math.abs(assigned - qtyToReceive) > EPS) {
        throw new Error('Разпределеното количество трябва да е точно равно на количеството за приемане за всеки продукт.')
      }

      runningReceived.set(dbItem.id, Number(dbItem.received_quantity))
    }

    // ── PASS 2: execute — one IN movement per placement, all validated above ──
    // Catch a known aggregate overflow before the first placement. The RPC
    // remains authoritative because capacity may change concurrently.
    const incomingByLocation = new Map<string, number>()
    for (const m of work)
      incomingByLocation.set(m.location_id, (incomingByLocation.get(m.location_id) ?? 0) + m.quantity)
    for (const [locationId, incoming] of Array.from(incomingByLocation.entries())) {
      const capacity = capacityByLocation.get(locationId)
      if (capacity === undefined || (occupiedByLocation.get(locationId) ?? 0) + incoming > capacity)
        throw new Error('Няма достатъчно място в избраната локация. Изберете друга или намалете количеството.')
    }

    for (const m of work) {
      // Atomic: creates stock movement + upserts inventory_balances via RPC
      await recordMovement({
        movement_type: 'IN',
        product_id: m.product_id,
        from_location_id: null,
        to_location_id: m.location_id,
        quantity: m.quantity,
        note,
        reference_type: 'incoming_delivery',
        reference_id: input.delivery_id,
      }, context)

      const newReceivedQty = (runningReceived.get(m.item_id) ?? 0) + m.quantity
      const { error: updateErr } = await sb
        .from('incoming_delivery_items')
        .update({ received_quantity: newReceivedQty })
        .eq('id', m.item_id)
        .eq('company_id', co)

      if (updateErr) throw new Error(updateErr.message)

      runningReceived.set(m.item_id, newReceivedQty)
    }

    // Determine new delivery status
    const { data: finalItems } = await sb
      .from('incoming_delivery_items')
      .select('expected_quantity, received_quantity')
      .eq('delivery_id', input.delivery_id)
      .eq('company_id', co)

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
      .eq('company_id', co)

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
