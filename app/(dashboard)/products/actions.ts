'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

const CO = process.env.DEMO_COMPANY_ID!

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
  const sb = createAdminClient()
  const { error } = await sb
    .from('products')
    .insert({ ...input, company_id: CO, status: 'active' })
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
  const sb = createAdminClient()
  const { error } = await sb
    .from('products')
    .update(input)
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
