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
}

export type CustomerOption = {
  id: string
  name: string
}

export type InvoiceInput = {
  invoice_number: string
  customer_id: string
  invoice_date: string | null
  due_date: string | null
  note: string | null
  vat_rate: number
}

export type InvoiceResult = { success: true } | { success: false; error: string }

export async function createInvoice(input: InvoiceInput): Promise<InvoiceResult> {
  try {
    await requirePermission('manage_invoices')
    const sb = createAdminClient()
    const { error } = await sb.from('invoices').insert({
      company_id: CO,
      invoice_number: input.invoice_number.trim(),
      customer_id: input.customer_id,
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
