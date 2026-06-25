'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requirePermission } from '@/lib/current-user'

const CO = process.env.DEMO_COMPANY_ID!

export type InvoiceStatus = 'draft' | 'issued' | 'cancelled'

export type Invoice = {
  id: string
  company_id: string
  invoice_number: string
  customer_id: string
  outgoing_order_id: string | null
  status: InvoiceStatus
  invoice_date: string
  due_date: string | null
  note: string | null
  subtotal: number
  vat_rate: number
  vat_amount: number
  total: number
  created_at: string
  updated_at: string
  customers: { id: string; name: string } | null
  outgoing_orders: { id: string; order_number: string; customer_name: string | null } | null
}

export type CustomerOption = {
  id: string
  name: string
}

export type OrderForInvoice = {
  id: string
  order_number: string
  customer_name: string | null
}

export type InvoiceInput = {
  invoice_number: string
  customer_id: string
  outgoing_order_id: string | null
  invoice_date: string | null
  due_date: string | null
  note: string | null
  vat_rate: number
}

export type InvoiceResult = { success: true } | { success: false; error: string }

export type ProductForInvoice = {
  id: string
  name: string
  unit: string | null
}

export type InvoiceItem = {
  id: string
  invoice_id: string
  company_id: string
  product_id: string | null
  description: string
  quantity: number
  unit_price: number
  amount: number
  created_at: string
  updated_at: string
  products: { name: string; unit: string | null } | null
}

export type InvoiceItemInput = {
  product_id: string | null
  description: string
  quantity: number
  unit_price: number
}

export type InvoiceItemResult = { success: true } | { success: false; error: string }

const round2 = (n: number) => Math.round(n * 100) / 100

async function recalcInvoiceTotals(
  sb: ReturnType<typeof createAdminClient>,
  invoiceId: string,
  vatRate: number
) {
  const { data: rows, error: rowsError } = await sb
    .from('invoice_items')
    .select('amount')
    .eq('invoice_id', invoiceId)
    .eq('company_id', CO)
  if (rowsError) throw new Error(rowsError.message)
  const subtotal = round2((rows ?? []).reduce((sum, row) => sum + Number(row.amount), 0))
  const vat_amount = round2((subtotal * vatRate) / 100)
  const total = round2(subtotal + vat_amount)
  const { error } = await sb
    .from('invoices')
    .update({ subtotal, vat_amount, total })
    .eq('id', invoiceId)
    .eq('company_id', CO)
  if (error) throw new Error(error.message)
}

export async function getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
  try {
    const sb = createAdminClient()
    const { data } = await sb
      .from('invoice_items')
      .select('*, products(name, unit)')
      .eq('invoice_id', invoiceId)
      .eq('company_id', CO)
      .order('created_at', { ascending: true })
    return (data ?? []) as unknown as InvoiceItem[]
  } catch {
    return []
  }
}

export async function addInvoiceItem(
  invoiceId: string,
  input: InvoiceItemInput
): Promise<InvoiceItemResult> {
  try {
    await requirePermission('manage_invoices')
    if (!input.description.trim()) throw new Error('errItemDesc')
    if (input.quantity <= 0) throw new Error('errItemQty')
    if (input.unit_price < 0) throw new Error('errItemUnitPrice')
    const sb = createAdminClient()
    const { data: inv } = await sb
      .from('invoices')
      .select('status, vat_rate')
      .eq('id', invoiceId)
      .eq('company_id', CO)
      .single()
    if (!inv) throw new Error('Фактурата не е намерена')
    if (inv.status !== 'draft') throw new Error('errLocked')
    const amount = round2(input.quantity * input.unit_price)
    const { error } = await sb.from('invoice_items').insert({
      invoice_id: invoiceId,
      company_id: CO,
      product_id: input.product_id || null,
      description: input.description.trim(),
      quantity: input.quantity,
      unit_price: input.unit_price,
      amount,
    })
    if (error) throw new Error(error.message)
    await recalcInvoiceTotals(sb, invoiceId, Number(inv.vat_rate))
    revalidatePath('/invoices')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Грешка, опитай отново' }
  }
}

export async function updateInvoiceItem(
  itemId: string,
  input: InvoiceItemInput
): Promise<InvoiceItemResult> {
  try {
    await requirePermission('manage_invoices')
    if (!input.description.trim()) throw new Error('errItemDesc')
    if (input.quantity <= 0) throw new Error('errItemQty')
    if (input.unit_price < 0) throw new Error('errItemUnitPrice')
    const sb = createAdminClient()
    const { data: existingItem } = await sb
      .from('invoice_items')
      .select('invoice_id')
      .eq('id', itemId)
      .eq('company_id', CO)
      .single()
    if (!existingItem) throw new Error('Редът не е намерен')
    const { data: inv } = await sb
      .from('invoices')
      .select('status, vat_rate')
      .eq('id', existingItem.invoice_id)
      .eq('company_id', CO)
      .single()
    if (!inv || inv.status !== 'draft') throw new Error('errLocked')
    const amount = round2(input.quantity * input.unit_price)
    const { error } = await sb
      .from('invoice_items')
      .update({
        product_id: input.product_id || null,
        description: input.description.trim(),
        quantity: input.quantity,
        unit_price: input.unit_price,
        amount,
      })
      .eq('id', itemId)
      .eq('company_id', CO)
    if (error) throw new Error(error.message)
    await recalcInvoiceTotals(sb, existingItem.invoice_id, Number(inv.vat_rate))
    revalidatePath('/invoices')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Грешка, опитай отново' }
  }
}

export async function removeInvoiceItem(itemId: string): Promise<InvoiceItemResult> {
  try {
    await requirePermission('manage_invoices')
    const sb = createAdminClient()
    const { data: existingItem } = await sb
      .from('invoice_items')
      .select('invoice_id')
      .eq('id', itemId)
      .eq('company_id', CO)
      .single()
    if (!existingItem) throw new Error('Редът не е намерен')
    const { data: inv } = await sb
      .from('invoices')
      .select('status, vat_rate')
      .eq('id', existingItem.invoice_id)
      .eq('company_id', CO)
      .single()
    if (!inv || inv.status !== 'draft') throw new Error('errLocked')
    const { error } = await sb
      .from('invoice_items')
      .delete()
      .eq('id', itemId)
      .eq('company_id', CO)
    if (error) throw new Error(error.message)
    await recalcInvoiceTotals(sb, existingItem.invoice_id, Number(inv.vat_rate))
    revalidatePath('/invoices')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Грешка, опитай отново' }
  }
}

export async function importOrderItems(invoiceId: string): Promise<InvoiceResult> {
  try {
    await requirePermission('manage_invoices')
    const sb = createAdminClient()

    const { data: inv } = await sb
      .from('invoices')
      .select('status, vat_rate, outgoing_order_id')
      .eq('id', invoiceId)
      .eq('company_id', CO)
      .single()

    if (!inv) throw new Error('Фактурата не е намерена')
    if (inv.status !== 'draft') throw new Error('errLocked')
    if (!inv.outgoing_order_id) throw new Error('errNoOrderLink')

    const { count: existingCount } = await sb
      .from('invoice_items')
      .select('id', { count: 'exact', head: true })
      .eq('invoice_id', invoiceId)
      .eq('company_id', CO)

    if (existingCount && existingCount > 0) throw new Error('errImportNotEmpty')

    // Uses ordered_quantity — invoice is a commercial document, not a fulfillment document
    const { data: orderItems } = await sb
      .from('outgoing_order_items')
      .select('product_id, ordered_quantity, products(name, sale_price)')
      .eq('order_id', inv.outgoing_order_id)
      .order('created_at', { ascending: true })

    if (!orderItems || orderItems.length === 0) throw new Error('errNoOrderItems')

    const rows = orderItems.map((oi) => {
      const product = oi.products as unknown as { name: string; sale_price: number | null } | null
      const quantity = Number(oi.ordered_quantity)
      const unit_price = round2(Number(product?.sale_price ?? 0))
      return {
        invoice_id: invoiceId,
        company_id: CO,
        product_id: oi.product_id,
        description: product?.name ?? 'Продукт',
        quantity,
        unit_price,
        amount: round2(quantity * unit_price),
      }
    })

    const { error } = await sb.from('invoice_items').insert(rows)
    if (error) throw new Error(error.message)

    await recalcInvoiceTotals(sb, invoiceId, Number(inv.vat_rate))

    revalidatePath('/invoices')
    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Грешка, опитай отново',
    }
  }
}

export async function issueInvoice(id: string): Promise<InvoiceResult> {
  try {
    await requirePermission('issue_invoice')
    const sb = createAdminClient()
    const { data: inv } = await sb
      .from('invoices')
      .select('status, vat_rate')
      .eq('id', id)
      .eq('company_id', CO)
      .single()
    if (!inv) throw new Error('Фактурата не е намерена')
    if (inv.status !== 'draft') throw new Error('errLocked')
    const { data: items } = await sb
      .from('invoice_items')
      .select('id')
      .eq('invoice_id', id)
      .eq('company_id', CO)
    if (!items || items.length === 0) throw new Error('errIssueNoItems')
    await recalcInvoiceTotals(sb, id, Number(inv.vat_rate))
    const { error } = await sb
      .from('invoices')
      .update({ status: 'issued' })
      .eq('id', id)
      .eq('company_id', CO)
    if (error) throw new Error(error.message)
    revalidatePath('/invoices')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Грешка, опитай отново' }
  }
}

export async function createInvoice(input: InvoiceInput): Promise<InvoiceResult> {
  try {
    await requirePermission('manage_invoices')
    const sb = createAdminClient()
    const { error } = await sb.from('invoices').insert({
      company_id: CO,
      invoice_number: input.invoice_number.trim(),
      customer_id: input.customer_id,
      outgoing_order_id: input.outgoing_order_id || null,
      invoice_date: input.invoice_date || null,
      due_date: input.due_date || null,
      note: input.note?.trim() || null,
      vat_rate: input.vat_rate,
      status: 'draft',
    })
    if (error) {
      if (error.code === '23505') throw new Error('errDuplicate')
      throw new Error(error.message)
    }
    revalidatePath('/invoices')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Грешка, опитай отново' }
  }
}

export async function updateInvoice(id: string, input: InvoiceInput): Promise<InvoiceResult> {
  try {
    await requirePermission('manage_invoices')
    const sb = createAdminClient()
    const { data: existing } = await sb
      .from('invoices')
      .select('status')
      .eq('id', id)
      .eq('company_id', CO)
      .single()
    if (!existing) throw new Error('Фактурата не е намерена')
    if (existing.status !== 'draft') throw new Error('errLocked')
    const { error } = await sb
      .from('invoices')
      .update({
        invoice_number: input.invoice_number.trim(),
        customer_id: input.customer_id,
        outgoing_order_id: input.outgoing_order_id || null,
        invoice_date: input.invoice_date || null,
        due_date: input.due_date || null,
        note: input.note?.trim() || null,
        vat_rate: input.vat_rate,
      })
      .eq('id', id)
      .eq('company_id', CO)
    if (error) {
      if (error.code === '23505') throw new Error('errDuplicate')
      throw new Error(error.message)
    }
    revalidatePath('/invoices')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Грешка, опитай отново' }
  }
}

export async function cancelInvoice(id: string): Promise<InvoiceResult> {
  try {
    await requirePermission('manage_invoices')
    const sb = createAdminClient()
    const { data: existing } = await sb
      .from('invoices')
      .select('status')
      .eq('id', id)
      .eq('company_id', CO)
      .single()
    if (!existing) throw new Error('Фактурата не е намерена')
    if (existing.status !== 'draft') throw new Error('errLocked')
    const { error } = await sb
      .from('invoices')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('company_id', CO)
    if (error) throw new Error(error.message)
    revalidatePath('/invoices')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Грешка, опитай отново' }
  }
}
