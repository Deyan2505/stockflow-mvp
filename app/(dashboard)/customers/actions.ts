'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requirePermission } from '@/lib/current-user'

const CO = process.env.DEMO_COMPANY_ID!

export type Customer = {
  id: string
  company_id: string
  name: string
  email: string | null
  phone: string | null
  note: string | null
  status: string
  created_at: string
  updated_at: string
}

export type CustomerInput = {
  name: string
  email: string | null
  phone: string | null
  note: string | null
}

export type CustomerResult = { success: true } | { success: false; error: string }

export async function createCustomer(input: CustomerInput): Promise<CustomerResult> {
  try {
    await requirePermission('manage_customers')
    const sb = createAdminClient()
    const { error } = await sb.from('customers').insert({
      company_id: CO,
      name: input.name.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      note: input.note?.trim() || null,
      status: 'active',
    })
    if (error) {
      if (error.code === '23505') throw new Error('errDuplicate')
      throw new Error(error.message)
    }
    revalidatePath('/customers')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Грешка, опитай отново' }
  }
}

export async function updateCustomer(id: string, input: CustomerInput): Promise<CustomerResult> {
  try {
    await requirePermission('manage_customers')
    const sb = createAdminClient()
    const { error } = await sb
      .from('customers')
      .update({
        name: input.name.trim(),
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        note: input.note?.trim() || null,
      })
      .eq('id', id)
      .eq('company_id', CO)
    if (error) {
      if (error.code === '23505') throw new Error('errDuplicate')
      throw new Error(error.message)
    }
    revalidatePath('/customers')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Грешка, опитай отново' }
  }
}

export async function deactivateCustomer(id: string): Promise<CustomerResult> {
  try {
    await requirePermission('manage_customers')
    const sb = createAdminClient()
    const { error } = await sb
      .from('customers')
      .update({ status: 'inactive' })
      .eq('id', id)
      .eq('company_id', CO)
    if (error) throw new Error(error.message)
    revalidatePath('/customers')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Грешка, опитай отново' }
  }
}

export async function restoreCustomer(id: string): Promise<CustomerResult> {
  try {
    await requirePermission('manage_customers')
    const sb = createAdminClient()
    const { error } = await sb
      .from('customers')
      .update({ status: 'active' })
      .eq('id', id)
      .eq('company_id', CO)
    if (error) throw new Error(error.message)
    revalidatePath('/customers')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Грешка, опитай отново' }
  }
}
