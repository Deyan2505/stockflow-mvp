'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requireAuthenticatedPermission } from '@/lib/current-user'

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
  const { companyId } = await requireAuthenticatedPermission('manage_warehouses')
  const sb = createAdminClient()
  const { error } = await sb
    .from('warehouses')
    .insert({ ...input, company_id: companyId, status: 'active' })
  if (error) throw new Error(error.message)
  revalidatePath('/')
  revalidatePath('/warehouses')
}

export async function updateWarehouse(id: string, input: WarehouseInput) {
  const { companyId } = await requireAuthenticatedPermission('manage_warehouses')
  const sb = createAdminClient()
  const { error } = await sb
    .from('warehouses')
    .update(input)
    .eq('id', id)
    .eq('company_id', companyId)
  if (error) throw new Error(error.message)
  revalidatePath('/')
  revalidatePath('/warehouses')
}

export async function archiveWarehouse(id: string) {
  const { companyId } = await requireAuthenticatedPermission('manage_warehouses')
  const sb = createAdminClient()

  const { data: activeLocations } = await sb
    .from('locations')
    .select('id')
    .eq('warehouse_id', id)
    .eq('company_id', companyId)
    .eq('is_buffer', false)
    .eq('status', 'active')
    .limit(1)

  if (activeLocations && activeLocations.length > 0) {
    throw new Error('Не може да деактивираш склад с активни локации. Първо деактивирай локациите.')
  }

  const { data: bufferLocations, error: bufferError } = await sb
    .from('locations')
    .select('id')
    .eq('warehouse_id', id)
    .eq('company_id', companyId)
    .eq('is_buffer', true)
  if (bufferError) throw new Error(bufferError.message)
  if (bufferLocations?.length) {
    const { data: bufferStock, error: stockError } = await sb
      .from('inventory_balances')
      .select('id')
      .in('location_id', bufferLocations.map((location) => location.id))
      .eq('company_id', companyId)
      .gt('quantity_available', 0)
      .limit(1)
    if (stockError) throw new Error(stockError.message)
    if (bufferStock?.length) {
      throw new Error('Не може да деактивираш склад с наличност в буферната локация.')
    }
  }

  const { error } = await sb
    .from('warehouses')
    .update({ status: 'inactive' })
    .eq('id', id)
    .eq('company_id', companyId)
  if (error) throw new Error(error.message)
  revalidatePath('/')
  revalidatePath('/warehouses')
}

export async function restoreWarehouse(id: string) {
  const { companyId } = await requireAuthenticatedPermission('manage_warehouses')
  const sb = createAdminClient()
  const { error } = await sb
    .from('warehouses')
    .update({ status: 'active' })
    .eq('id', id)
    .eq('company_id', companyId)
  if (error) throw new Error(error.message)
  revalidatePath('/')
  revalidatePath('/warehouses')
}
