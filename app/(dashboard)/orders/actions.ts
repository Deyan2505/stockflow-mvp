'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { findProductByBarcode } from '@/lib/barcode-utils'
import { recordMovement } from '@/lib/movement-engine'
import { requirePermission } from '@/lib/current-user'

const CO = process.env.DEMO_COMPANY_ID!

// v0.6 Step 1: header CRUD — no fulfillment, no stock movements
// v0.6 Step 2: order items CRUD — no fulfillment, no stock movements, no inventory change
// v0.6 Step 2B: barcode-assisted product selection — read-only lookup, no stock movement

export type Order = {
  id: string
  company_id: string
  order_number: string
  customer_id: string | null
  customer_name: string | null
  status: 'draft' | 'open' | 'fulfilled' | 'cancelled'
  order_date: string | null
  expected_date: string | null
  issued_date: string | null
  note: string | null
  created_at: string
  updated_at: string
}

export type OrderInput = {
  order_number: string
  customer_id: string | null
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
  issued_quantity: number
  location_id: string | null
  created_at: string
  products: { name: string; unit: string | null } | null
}

export type Location = { id: string; code: string; warehouses: { name: string } | null }

export type OrderItemResult = { success: true } | { success: false; error: string }

export async function createOrder(input: OrderInput): Promise<OrderResult> {
  try {
    await requirePermission('manage_orders')
    const sb = createAdminClient()

    if (!input.customer_id) {
      throw new Error('errCustomerRequired')
    }

    const { error } = await sb
      .from('outgoing_orders')
      .insert({
        company_id:    CO,
        order_number:  input.order_number.trim(),
        customer_id:   input.customer_id,
        customer_name: input.customer_name?.trim() || null,
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
    await requirePermission('manage_orders')
    const sb = createAdminClient()

    const { error } = await sb
      .from('outgoing_orders')
      .update({
        order_number:  input.order_number.trim(),
        customer_id:   input.customer_id || null,
        customer_name: input.customer_name?.trim() || null,
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
    await requirePermission('manage_orders')
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

// ─── Barcode Lookup (read-only) ───────────────────────────────────────────────
// Mirrors findProductForDelivery in deliveries/actions.ts.
// Never creates stock movements or modifies inventory balances.

export async function findProductForOrder(barcode: string): Promise<{ id: string; name: string } | null> {
  const trimmed = barcode.trim()
  if (!trimmed) return null
  const product = await findProductByBarcode(trimmed)
  if (!product) return null
  return { id: product.id, name: product.name }
}

// ─── Order Items Actions ──────────────────────────────────────────────────────
// None of these create stock movements or touch inventory_balances.

export async function getOrderItems(orderId: string): Promise<OrderItem[]> {
  const sb = createAdminClient()
  const { data } = await sb
    .from('outgoing_order_items')
    .select('id, order_id, product_id, ordered_quantity, issued_quantity, location_id, created_at, products(name, unit)')
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
    await requirePermission('manage_orders')
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
    await requirePermission('manage_orders')
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
    await requirePermission('manage_orders')
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

// ─── Fulfillment — Issue Stock ─────────────────────────────────────────────────
// Creates OUT stock movements only on explicit user action.
// Never triggered automatically by order creation or item addition.

export type IssueItem = {
  item_id: string
  product_id: string
  from_location_id: string
}

export type IssueOrderInput = {
  order_id: string
  items: IssueItem[]
}

export type IssueResult =
  | { success: true; newStatus: 'fulfilled' }
  | { success: false; error: string }

export async function issueOrder(input: IssueOrderInput): Promise<IssueResult> {
  try {
    await requirePermission('issue_stock')
    const sb = createAdminClient()

    // 1. Re-read order — guard against double-issue / cancelled / draft
    const { data: order } = await sb
      .from('outgoing_orders')
      .select('id, status, order_number, customer_name')
      .eq('id', input.order_id)
      .eq('company_id', CO)
      .single()

    if (!order) throw new Error('Поръчката не е намерена')
    if (order.status === 'fulfilled')
      throw new Error('Поръчката вече е изцяло изпълнена')
    if (order.status === 'cancelled')
      throw new Error('Отменена поръчка не може да бъде изпълнена')
    if (order.status === 'draft')
      throw new Error('Чернова поръчка не може да бъде изпълнена')

    // 2. Re-read items from DB — authoritative quantities
    const { data: dbItems } = await sb
      .from('outgoing_order_items')
      .select('id, product_id, ordered_quantity, issued_quantity')
      .eq('order_id', input.order_id)
      .eq('company_id', CO)

    const dbItemsArr = dbItems ?? []
    const locationMap = new Map(input.items.map((i) => [i.item_id, i.from_location_id]))

    // 3. Build work list — server computes remaining qty (Variant A: full-order, all-or-nothing)
    type ItemToProcess = {
      item_id: string
      product_id: string
      qty: number
      from_location_id: string
    }

    const toProcess: ItemToProcess[] = []
    for (const dbItem of dbItemsArr) {
      const remaining = Number(dbItem.ordered_quantity) - Number(dbItem.issued_quantity)
      if (remaining <= 0) continue

      const from_location_id = locationMap.get(dbItem.id) ?? ''
      if (!from_location_id)
        throw new Error('Изберете локация за всеки артикул за изписване')

      toProcess.push({ item_id: dbItem.id, product_id: dbItem.product_id, qty: remaining, from_location_id })
    }

    if (toProcess.length === 0)
      throw new Error('Всички артикули са вече изцяло изписани')

    // 4. Pre-validate stock for ALL items before any movement (all-or-nothing)
    for (const item of toProcess) {
      const { data: bal } = await sb
        .from('inventory_balances')
        .select('quantity_available, products(unit)')
        .eq('company_id', CO)
        .eq('product_id', item.product_id)
        .eq('location_id', item.from_location_id)
        .maybeSingle()

      const available = Number(bal?.quantity_available ?? 0)
      if (item.qty > available) {
        const unit = (bal?.products as unknown as { unit: string } | null)?.unit ?? 'бр.'
        throw new Error(`Няма достатъчна наличност. Налични са само ${available} ${unit}.`)
      }
    }

    // 5. Execute OUT movements + update issued_quantity per item (full remaining)
    for (const item of toProcess) {
      await recordMovement({
        movement_type:    'OUT',
        product_id:       item.product_id,
        from_location_id: item.from_location_id,
        to_location_id:   null,
        quantity:         item.qty,
        note:             order.customer_name
          ? `Изписване по поръчка #${order.order_number} (Клиент: ${order.customer_name})`
          : `Изписване по поръчка #${order.order_number}`,
        reference_type:   'outgoing_order',
        reference_id:     order.id,
      })

      const dbItem = dbItemsArr.find((i) => i.id === item.item_id)!
      await sb
        .from('outgoing_order_items')
        .update({ issued_quantity: Number(dbItem.issued_quantity) + item.qty })
        .eq('id', item.item_id)
        .eq('company_id', CO)
    }

    // 6. Mark order fulfilled + set issued_date
    await sb
      .from('outgoing_orders')
      .update({
        status:      'fulfilled',
        issued_date: new Date().toISOString().substring(0, 10),
      })
      .eq('id', input.order_id)
      .eq('company_id', CO)

    revalidatePath('/orders')
    revalidatePath('/movements')
    revalidatePath('/inventory')

    return { success: true, newStatus: 'fulfilled' }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Грешка, опитай отново' }
  }
}
