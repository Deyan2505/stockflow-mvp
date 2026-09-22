'use server'

import { randomBytes } from 'node:crypto'
import { createClient as createEphemeralClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { requireAuthenticatedPermission } from '@/lib/current-user'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type OverflowRequestInput = {
  productId: string
  quantity: number
  targetLocationId: string
  reason: string
  deliveryItemId: string | null
}

export type ActionResult =
  | { success: true; status?: string }
  | { success: false; error: string }

export async function createOverflowRequest(input: OverflowRequestInput): Promise<ActionResult> {
  try {
    await requireAuthenticatedPermission('request_overflow')
    if (!Number.isSafeInteger(input.quantity) || input.quantity <= 0 || input.quantity > 2147483647)
      return { success: false, error: 'Количеството трябва да е положително цяло число в pcs.' }
    if (input.reason.trim().length < 10 || input.reason.trim().length > 1000)
      return { success: false, error: 'Опишете причината с 10–1000 символа.' }
    const sb = await createClient()
    const { error } = await sb.rpc('create_overflow_request', {
      p_product_id: input.productId,
      p_quantity: input.quantity,
      p_target_location_id: input.targetLocationId,
      p_reason: input.reason.trim(),
      p_delivery_item_id: input.deliveryItemId,
    })
    if (error) {
      if (error.message.includes('Permanent location has enough space'))
        return { success: false, error: 'Има достатъчно място. Използвайте обикновено приемане.' }
      return { success: false, error: 'Заявката не е създадена. Проверете продукта, локацията и оставащото количество.' }
    }
    revalidatePath('/overflow-requests')
    return { success: true }
  } catch {
    return { success: false, error: 'Нямате право да създадете тази заявка.' }
  }
}

export async function reviewOverflowRequest(input: {
  requestId: string
  email: string
  password: string
  decision: 'approved' | 'rejected'
  rejectionReason: string
}): Promise<ActionResult> {
  let adminClient: ReturnType<typeof createAdminClient> | null = null
  try {
    const operator = await requireAuthenticatedPermission('request_overflow')
    if (!input.email.trim() || !input.password)
      return { success: false, error: 'Въведете имейл и парола на администратор.' }
    if (input.decision === 'rejected' && input.rejectionReason.trim().length < 10)
      return { success: false, error: 'Посочете причина за отказа с поне 10 символа.' }

    const operatorClient = await createClient()
    const { error: reserveError } = await operatorClient.rpc(
      'reserve_overflow_auth_attempt', { p_request_id: input.requestId }
    )
    if (reserveError) {
      return {
        success: false,
        error: reserveError.message.includes('AUTH_ATTEMPTS_LIMIT')
          ? 'Твърде много опити. Изчакайте 15 минути.'
          : 'Заявката е недостъпна, изтекла или не е създадена от този оператор.',
      }
    }

    // No cookie storage, refresh, or browser session replacement.
    adminClient = createEphemeralClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
    )
    const { data: signIn, error: signInError } =
      await adminClient.auth.signInWithPassword({
        email: input.email.trim(),
        password: input.password,
      })
    if (signInError || !signIn.session?.access_token)
      return { success: false, error: 'Невалидни администраторски данни.' }

    const { data: verified, error: verifyError } =
      await adminClient.auth.getUser(signIn.session.access_token)
    if (verifyError || !verified.user)
      return { success: false, error: 'Администраторската идентичност не е потвърдена.' }
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('company_id, role, status')
      .eq('id', verified.user.id)
      .maybeSingle()
    if (profileError || !profile || profile.status !== 'active'
      || profile.role !== 'admin' || profile.company_id !== operator.companyId)
      return { success: false, error: 'Изисква се активен администратор от същата компания.' }

    // A one-use request-bound ticket proves the password check occurred.
    // service_role only mints the ticket; the admin JWT executes the review RPC.
    const ticket = randomBytes(32).toString('hex')
    const service = createAdminClient()
    const { error: mintError } = await service.rpc('mint_overflow_review_ticket', {
      p_request_id: input.requestId,
      p_operator_id: operator.userId,
      p_admin_id: verified.user.id,
      p_token: ticket,
    })
    if (mintError) return { success: false, error: 'Заявката вече не е налична за преглед.' }

    const { data: status, error: reviewError } = await adminClient.rpc(
      'review_overflow_request',
      {
        p_request_id: input.requestId,
        p_ticket: ticket,
        p_decision: input.decision,
        p_rejection_reason: input.decision === 'rejected'
          ? input.rejectionReason.trim() : null,
      }
    )
    if (reviewError) {
      if (reviewError.message.includes('BUFFER_CAPACITY_EXCEEDED'))
        return { success: false, error: 'Буферната локация няма достатъчно място. Нищо не е прието.' }
      if (reviewError.message.includes('TARGET_HAS_DIFFERENT_PRODUCT'))
        return { success: false, error: 'Целевата локация съдържа друг продукт. Изберете друга локация; нищо не е прието.' }
      if (reviewError.message.includes('Delivery item remaining quantity changed'))
        return { success: false, error: 'Количеството по доставката е променено. Нищо не е прието.' }
      return { success: false, error: 'Одобрението не успя; наличностите не са променени.' }
    }
    revalidatePath('/overflow-requests')
    revalidatePath('/locations')
    revalidatePath('/inventory')
    revalidatePath('/movements')
    revalidatePath('/deliveries')
    if (status === 'expired')
      return { success: false, error: 'Срокът на заявката изтече. Нищо не е прието.' }
    return { success: true, status: String(status) }
  } catch {
    return { success: false, error: 'Неуспешно администраторско потвърждение.' }
  } finally {
    if (adminClient) {
      try {
        await adminClient.auth.signOut({ scope: 'local' })
      } catch {
        // The one-shot client has no persisted session; cleanup must not hide the result.
      }
    }
  }
}
