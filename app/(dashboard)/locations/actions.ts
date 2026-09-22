'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requireAuthenticatedPermission } from '@/lib/current-user'

export type Location = {
  id: string
  company_id: string
  warehouse_id: string
  code: string
  zone: string | null
  row: string | null
  shelf: string | null
  bin: string | null
  max_capacity_units: number
  is_buffer: boolean
  occupied_units?: number
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
  max_capacity_units: number
}

function validateCapacity(capacity: number) {
  if (!Number.isSafeInteger(capacity) || capacity <= 0 || capacity > 2147483647) {
    throw new Error('Капацитетът трябва да е положително цяло число в бройки (pcs).')
  }
}

export async function createLocation(input: LocationInput) {
  const { companyId } = await requireAuthenticatedPermission('manage_locations')
  validateCapacity(input.max_capacity_units)
  const sb = createAdminClient()
  const { data: warehouse } = await sb.from('warehouses').select('id')
    .eq('id', input.warehouse_id).eq('company_id', companyId).maybeSingle()
  if (!warehouse) throw new Error('Избраният склад не принадлежи на текущата компания.')
  const { error } = await sb
    .from('locations')
    .insert({ ...input, company_id: companyId, status: 'active' })
  if (error) {
    if (error.code === '23505') throw new Error(`Код "${input.code}" вече съществува в този склад`)
    throw new Error(error.message)
  }
  revalidatePath('/')
  revalidatePath('/locations')
  revalidatePath('/movements')
}

export async function updateLocation(id: string, input: LocationInput) {
  const { companyId } = await requireAuthenticatedPermission('manage_locations')
  validateCapacity(input.max_capacity_units)
  const sb = createAdminClient()
  const { data: existing } = await sb.from('locations').select('is_buffer')
    .eq('id', id).eq('company_id', companyId).maybeSingle()
  if (!existing) throw new Error('Локацията не е намерена.')
  if (existing.is_buffer) throw new Error('Системната буферна локация не може да се редактира.')
  const { data: warehouse } = await sb.from('warehouses').select('id')
    .eq('id', input.warehouse_id).eq('company_id', companyId).maybeSingle()
  if (!warehouse) throw new Error('Избраният склад не принадлежи на текущата компания.')
  const { error } = await sb
    .from('locations')
    .update(input)
    .eq('id', id)
    .eq('company_id', companyId)
  if (error) {
    if (error.code === '23505') throw new Error(`Код "${input.code}" вече съществува в този склад`)
    if (error.message.includes('LOCATION_CAPACITY_EXCEEDED'))
      throw new Error('Капацитетът не може да е по-малък от текущото общо количество в локацията.')
    throw new Error(error.message)
  }
  revalidatePath('/')
  revalidatePath('/locations')
  revalidatePath('/movements')
}

export async function archiveLocation(id: string) {
  const { companyId } = await requireAuthenticatedPermission('manage_locations')
  const sb = createAdminClient()
  const { data: existing } = await sb.from('locations').select('is_buffer')
    .eq('id', id).eq('company_id', companyId).maybeSingle()
  if (!existing) throw new Error('Локацията не е намерена.')
  if (existing.is_buffer) throw new Error('Системната буферна локация не може да се деактивира.')

  const { data: stock } = await sb
    .from('inventory_balances')
    .select('quantity_available')
    .eq('location_id', id)
    .eq('company_id', companyId)
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
    .eq('company_id', companyId)
  if (error) throw new Error(error.message)
  revalidatePath('/')
  revalidatePath('/locations')
}

export async function restoreLocation(id: string) {
  const { companyId } = await requireAuthenticatedPermission('manage_locations')
  const sb = createAdminClient()
  const { error } = await sb
    .from('locations')
    .update({ status: 'active' })
    .eq('id', id)
    .eq('company_id', companyId)
  if (error) throw new Error(error.message)
  revalidatePath('/')
  revalidatePath('/locations')
}
