'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/current-user'

const CO = process.env.DEMO_COMPANY_ID!

export type Warehouse = {
  id: string
  company_id: string
  name: string
  address: string | null
  status: string
  created_at: string
  updated_at: string
}

export type WarehouseInput = {
  name: string
  address: string | null
}

export async function createWarehouse(input: WarehouseInput) {
  await requirePermission('manage_warehouses')
  const sb = createAdminClient()
  const { error } = await sb
    .from('warehouses')
    .insert({ ...input, company_id: CO, status: 'active' })
  if (error) throw new Error(error.message)
  revalidatePath('/')
  revalidatePath('/warehouses')
}

export async function updateWarehouse(id: string, input: WarehouseInput) {
  await requirePermission('manage_warehouses')
  const sb = createAdminClient()
  const { error } = await sb
    .from('warehouses')
    .update(input)
    .eq('id', id)
    .eq('company_id', CO)
  if (error) throw new Error(error.message)
  revalidatePath('/')
  revalidatePath('/warehouses')
}

export async function archiveWarehouse(id: string) {
  await requirePermission('manage_warehouses')
  const sb = createAdminClient()

  const { data: activeLocations } = await sb
    .from('locations')
    .select('id')
    .eq('warehouse_id', id)
    .eq('company_id', CO)
    .eq('status', 'active')
    .limit(1)

  if (activeLocations && activeLocations.length > 0) {
    throw new Error('Не може да деактивираш склад с активни локации. Първо деактивирай локациите.')
  }

  const { error } = await sb
    .from('warehouses')
    .update({ status: 'inactive' })
    .eq('id', id)
    .eq('company_id', CO)
  if (error) throw new Error(error.message)
  revalidatePath('/')
  revalidatePath('/warehouses')
}

export async function restoreWarehouse(id: string) {
  await requirePermission('manage_warehouses')
  const sb = createAdminClient()
  const { error } = await sb
    .from('warehouses')
    .update({ status: 'active' })
    .eq('id', id)
    .eq('company_id', CO)
  if (error) throw new Error(error.message)
  revalidatePath('/')
  revalidatePath('/warehouses')
}
