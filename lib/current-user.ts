import { Role, Permission, can } from './permissions';

/**
 * Returns the current role in demo mode.
 * Reads from process.env.DEMO_USER_ROLE, falling back to 'admin' if not set or invalid.
 */
export function getCurrentRole(): Role {
  const envRole = process.env.DEMO_USER_ROLE;
  if (envRole === 'admin' || envRole === 'operator' || envRole === 'viewer') {
    return envRole as Role;
  }
  return 'admin';
}

/**
 * Server guard helper to require a permission.
 * Throws an error if the current role does not have the required permission.
 */
export function requirePermission(permission: Permission): void {
  const role = getCurrentRole();
  if (!can(role, permission)) {
    throw new Error(`Unauthorized: Permission '${permission}' is required.`);
  }
}
