import { Role, Permission, can } from './permissions'
import { createClient } from './supabase/server'
import { createAdminClient } from './supabase/admin'

export type AuthenticatedUserContext = {
  userId: string
  companyId: string
  role: Role
  status: 'active'
}

async function loadAuthenticatedProfile(userId: string): Promise<AuthenticatedUserContext> {
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('company_id, role, status')
    .eq('id', userId)
    .maybeSingle()

  if (!profile) {
    throw new Error('No profile found for authenticated user. Account setup required.')
  }

  if (profile.status !== 'active') {
    throw new Error('User account is inactive.')
  }

  if (!profile.company_id) {
    throw new Error('No company found for authenticated user.')
  }

  const role = profile.role as string
  if (role !== 'admin' && role !== 'operator' && role !== 'viewer') {
    throw new Error(`Invalid role '${role}' in user profile.`)
  }

  return {
    userId,
    companyId: profile.company_id,
    role: role as Role,
    status: 'active',
  }
}

/**
 * Resolves the authenticated actor and their active tenant profile.
 * Unlike getCurrentRole(), this has no development fallback because callers
 * use the context for tenant-scoped database operations.
 */
export async function getCurrentUserContext(): Promise<AuthenticatedUserContext> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Authentication is required.')
  }

  return loadAuthenticatedProfile(user.id)
}

/**
 * Returns the role of the currently authenticated user by reading profiles.role.
 *
 * For authenticated users:
 *   - Reads profiles.role + profiles.status via admin client (bypasses RLS).
 *   - Missing profile   → throws (account setup required, not a silent viewer fallback).
 *   - Inactive profile  → throws (account locked).
 *   - Invalid role      → throws.
 *
 * For unauthenticated requests:
 *   - Development only: falls back to DEMO_USER_ROLE env var when set and valid.
 *   - Production: middleware already redirects to /login before this is reached.
 *
 * Never returns 'admin' as a fallback — admin is only granted by an active profile.
 */
export async function getCurrentRole(): Promise<Role> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    return (await loadAuthenticatedProfile(user.id)).role
  }

  // No active session — development fallback only.
  // In production the middleware redirects to /login before reaching here.
  if (process.env.NODE_ENV === 'development') {
    const env = process.env.DEMO_USER_ROLE
    if (env === 'admin' || env === 'operator' || env === 'viewer') {
      return env as Role
    }
  }

  // Absolute safe fallback: middleware should have prevented reaching this point.
  return 'viewer'
}

/**
 * Throws if the current user does not have the required permission.
 * Used in server actions as the last line of defense before DB mutations.
 */
export async function requirePermission(permission: Permission): Promise<void> {
  const role = await getCurrentRole()
  if (!can(role, permission)) {
    throw new Error(`Unauthorized: Permission '${permission}' is required.`)
  }
}

/**
 * Requires both an authenticated active profile and the requested permission,
 * then returns the trusted actor/tenant context for server-side operations.
 */
export async function requireAuthenticatedPermission(
  permission: Permission
): Promise<AuthenticatedUserContext> {
  const context = await getCurrentUserContext()
  if (!can(context.role, permission)) {
    throw new Error(`Unauthorized: Permission '${permission}' is required.`)
  }
  return context
}
