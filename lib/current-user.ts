import { Role, Permission, can } from './permissions'
import { createClient } from './supabase/server'
import { createAdminClient } from './supabase/admin'

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
    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile) {
      throw new Error('No profile found for authenticated user. Account setup required.')
    }

    if (profile.status !== 'active') {
      throw new Error('User account is inactive.')
    }

    const role = profile.role as string
    if (role === 'admin' || role === 'operator' || role === 'viewer') {
      return role as Role
    }

    throw new Error(`Invalid role '${role}' in user profile.`)
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
