import { createClient } from '@/lib/supabase/server'
import type { AuthenticatedUserContext } from '@/lib/current-user'

export type MovementInput = {
  movement_type: 'IN' | 'OUT' | 'TRANSFER'
  product_id: string
  from_location_id: string | null
  to_location_id: string | null
  quantity: number
  note: string | null
  reference_type?: string | null
  reference_id?: string | null
}

export async function recordMovement(
  input: MovementInput,
  context: AuthenticatedUserContext
): Promise<void> {
  const { movement_type, product_id, from_location_id, to_location_id, quantity, note, reference_type, reference_id } = input

  if (!context.userId || !context.companyId || context.status !== 'active')
    throw new Error('An active authenticated profile is required')
  if (context.role !== 'admin' && context.role !== 'operator')
    throw new Error('Unauthorized: operational permission is required')

  // Client-side guards (fast-fail before network round-trip)
  if (!Number.isSafeInteger(quantity) || quantity <= 0)
    throw new Error('Количеството трябва да е положително цяло число в pcs.')
  if (movement_type === 'IN' && !to_location_id)
    throw new Error('Входната локация е задължителна')
  if (movement_type === 'OUT' && !from_location_id)
    throw new Error('Изходната локация е задължителна')
  if (movement_type === 'TRANSFER' && (!from_location_id || !to_location_id))
    throw new Error('И двете локации са задължителни за прехвърляне')
  if (movement_type === 'TRANSFER' && from_location_id === to_location_id)
    throw new Error('Изходната и входната локация трябва да са различни')

  const sb = await createClient()

  // Server-side stock check — safety net even if client validation is bypassed
  if ((movement_type === 'OUT' || movement_type === 'TRANSFER') && from_location_id) {
    const { data: bal } = await sb
      .from('inventory_balances')
      .select('quantity_available, products(unit)')
      .eq('company_id', context.companyId)
      .eq('product_id', product_id)
      .eq('location_id', from_location_id)
      .maybeSingle()

    const available = Number(bal?.quantity_available ?? 0)
    if (quantity > available) {
      const unit = (bal?.products as unknown as { unit: string } | null)?.unit ?? 'бр.'
      throw new Error(`Няма достатъчна наличност. Налични са само ${available} ${unit}.`)
    }
  }

  // Single atomic DB call: availability check + INSERT movement + UPSERT balances
  // Everything happens in one PostgreSQL transaction (migration 002_movement_rpc.sql).
  // If any step fails the entire operation rolls back — no orphaned records.
  const { error } = await sb.rpc('record_stock_movement', {
    p_product_id:        product_id,
    p_movement_type:     movement_type,
    p_quantity:          quantity,
    p_from_location_id:  from_location_id,
    p_to_location_id:    to_location_id,
    p_note:              note,
    p_reference_type:    reference_type ?? null,
    p_reference_id:      reference_id ?? null,
  })

  if (error) {
    if (error.message.includes('LOCATION_CAPACITY_EXCEEDED'))
      throw new Error('Няма достатъчно място в избраната локация. Изберете друга или намалете количеството.')
    if (error.message.includes('BUFFER_DRAIN_FIRST'))
      throw new Error('Първо прехвърлете стоката от буферната локация към постоянна локация в склада.')
    if (error.message.includes('BUFFER_REQUIRES_APPROVAL'))
      throw new Error('Вход към буфера е възможен само след лично администраторско одобрение.')
    if (error.message.includes('Only products measured in pcs') || error.message.includes('whole number of pcs'))
      throw new Error('За движение са допустими само цели бройки (pcs).')
    throw new Error(error.message)
  }
}
