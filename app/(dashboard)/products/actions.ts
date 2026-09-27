'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/current-user'

export type Product = {
  id: string
  company_id: string
  name: string
  sku: string | null
  barcode: string | null
  category: string | null
  unit: string
  min_quantity: number
  cost_price: number | null
  sale_price: number | null
  status: string
  created_at: string
  updated_at: string
}

export type ProductInput = {
  name: string
  sku: string | null
  barcode: string | null
  category: string | null
  unit: string
  min_quantity: number
  cost_price: number | null
  sale_price: number | null
}

export async function createProduct(input: ProductInput) {
  const { companyId: CO } = await requirePermission('manage_products')
  if (input.unit !== 'pcs') throw new Error('Мерната единица трябва да бъде pcs.')
  const sb = createAdminClient()
  const { error } = await sb
    .from('products')
    .insert({
      name: input.name, sku: input.sku, barcode: input.barcode,
      category: input.category, unit: input.unit, min_quantity: input.min_quantity,
      cost_price: input.cost_price, sale_price: input.sale_price,
      company_id: CO, status: 'active',
    })
  if (error) {
    if (error.code === '23505') {
      if (error.message.includes('barcode')) throw new Error(`Баркодът вече е зает от друг продукт`)
      throw new Error(`SKU "${input.sku}" вече съществува`)
    }
    throw new Error(error.message)
  }
  revalidatePath('/')
  revalidatePath('/products')
  revalidatePath('/movements')
}

export async function updateProduct(id: string, input: ProductInput) {
  const { companyId: CO } = await requirePermission('manage_products')
  if (input.unit !== 'pcs') throw new Error('Мерната единица трябва да бъде pcs.')
  const sb = createAdminClient()
  const { error } = await sb
    .from('products')
    .update({
      name: input.name, sku: input.sku, barcode: input.barcode,
      category: input.category, unit: input.unit, min_quantity: input.min_quantity,
      cost_price: input.cost_price, sale_price: input.sale_price,
    })
    .eq('id', id)
    .eq('company_id', CO)
  if (error) {
    if (error.code === '23505') {
      if (error.message.includes('barcode')) throw new Error(`Баркодът вече е зает от друг продукт`)
      throw new Error(`SKU "${input.sku}" вече съществува`)
    }
    throw new Error(error.message)
  }
  revalidatePath('/')
  revalidatePath('/products')
}

export async function archiveProduct(id: string) {
  const { companyId: CO } = await requirePermission('manage_products')
  const sb = createAdminClient()
  const { error } = await sb
    .from('products')
    .update({ status: 'archived' })
    .eq('id', id)
    .eq('company_id', CO)
  if (error) throw new Error(error.message)
  revalidatePath('/')
  revalidatePath('/products')
}

export async function restoreProduct(id: string) {
  const { companyId: CO } = await requirePermission('manage_products')
  const sb = createAdminClient()
  const { error } = await sb
    .from('products')
    .update({ status: 'active' })
    .eq('id', id)
    .eq('company_id', CO)
  if (error) throw new Error(error.message)
  revalidatePath('/')
  revalidatePath('/products')
}
