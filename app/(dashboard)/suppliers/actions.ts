'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

const CO = process.env.DEMO_COMPANY_ID!

export type Supplier = {
  id: string
  company_id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  note: string | null
  status: string
  created_at: string
  updated_at: string
}

export type SupplierInput = {
  name: string
  phone: string | null
  email: string | null
  address: string | null
  note: string | null
}

export type SupplierResult = { success: true } | { success: false; error: string }

export async function createSupplier(input: SupplierInput): Promise<SupplierResult> {
  try {
    const sb = createAdminClient()
    const { error } = await sb.from('suppliers').insert({
      company_id: CO,
      name: input.name.trim(),
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
      note: input.note || null,
      status: 'active',
    })
    if (error) throw new Error(error.message)
    revalidatePath('/suppliers')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Грешка, опитай отново' }
  }
}

export async function updateSupplier(id: string, input: SupplierInput): Promise<SupplierResult> {
  try {
    const sb = createAdminClient()
    const { error } = await sb
      .from('suppliers')
      .update({
        name: input.name.trim(),
        phone: input.phone || null,
        email: input.email || null,
        address: input.address || null,
        note: input.note || null,
      })
      .eq('id', id)
      .eq('company_id', CO)
    if (error) throw new Error(error.message)
    revalidatePath('/suppliers')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Грешка, опитай отново' }
  }
}

export async function deactivateSupplier(id: string): Promise<SupplierResult> {
  try {
    const sb = createAdminClient()
    const { error } = await sb
      .from('suppliers')
      .update({ status: 'inactive' })
      .eq('id', id)
      .eq('company_id', CO)
    if (error) throw new Error(error.message)
    revalidatePath('/suppliers')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Грешка, опитай отново' }
  }
}

export async function restoreSupplier(id: string): Promise<SupplierResult> {
  try {
    const sb = createAdminClient()
    const { error } = await sb
      .from('suppliers')
      .update({ status: 'active' })
      .eq('id', id)
      .eq('company_id', CO)
    if (error) throw new Error(error.message)
    revalidatePath('/suppliers')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Грешка, опитай отново' }
  }
}
