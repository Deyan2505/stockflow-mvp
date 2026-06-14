'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

const CO = process.env.DEMO_COMPANY_ID!

export type Location = {
  id: string
  company_id: string
  warehouse_id: string
  code: string
  zone: string | null
  row: string | null
  shelf: string | null
  bin: string | null
  status: string
  created_at: string
  updated_at: string
  warehouses?: { name: string }
}

export type LocationInput = {
  warehouse_id: string
  code: string
  zone: string | null
  row: string | null
  shelf: string | null
  bin: string | null
}

export async function createLocation(input: LocationInput) {
  const sb = createAdminClient()
  const { error } = await sb
    .from('locations')
    .insert({ ...input, company_id: CO, status: 'active' })
  if (error) {
    if (error.code === '23505') throw new Error(`Код "${input.code}" вече съществува в този склад`)
    throw new Error(error.message)
  }
  revalidatePath('/locations')
  revalidatePath('/movements')
}

export async function updateLocation(id: string, input: LocationInput) {
  const sb = createAdminClient()
  const { error } = await sb
    .from('locations')
    .update(input)
    .eq('id', id)
    .eq('company_id', CO)
  if (error) {
    if (error.code === '23505') throw new Error(`Код "${input.code}" вече съществува в този склад`)
    throw new Error(error.message)
  }
  revalidatePath('/locations')
  revalidatePath('/movements')
}

export async function archiveLocation(id: string) {
  const sb = createAdminClient()

  const { data: stock } = await sb
    .from('inventory_balances')
    .select('quantity_available')
    .eq('location_id', id)
    .eq('company_id', CO)
    .gt('quantity_available', 0)
    .limit(1)
    .maybeSingle()

  if (stock) {
    throw new Error('Не може да деактивираш локация с наличност. Първо премести стоката.')
  }

  const { error } = await sb
    .from('locations')
    .update({ status: 'inactive' })
    .eq('id', id)
    .eq('company_id', CO)
  if (error) throw new Error(error.message)
  revalidatePath('/locations')
}

export async function restoreLocation(id: string) {
  const sb = createAdminClient()
  const { error } = await sb
    .from('locations')
    .update({ status: 'active' })
    .eq('id', id)
    .eq('company_id', CO)
  if (error) throw new Error(error.message)
  revalidatePath('/locations')
}
