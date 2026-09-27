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
 * All authorization paths use this context, including role-only checks.
 */
export async function getCurrentUserContext(): Promise<AuthenticatedUserContext> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Authentication is required.')
  }

  return loadAuthenticatedProfile(user.id)
}

/** Returns the role only after validating an authenticated active profile. */
export async function getCurrentRole(): Promise<Role> {
  return (await getCurrentUserContext()).role
}

/**
 * Throws if the current user does not have the required permission.
 * Used in server actions as the last line of defense before DB mutations.
 */
export async function requirePermission(permission: Permission): Promise<AuthenticatedUserContext> {
  return requireAuthenticatedPermission(permission)
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
