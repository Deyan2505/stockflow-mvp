export type Role = 'admin' | 'operator' | 'viewer';

export type Permission =
  // Read-only
  | 'view_dashboard'
  | 'view_products'
  | 'view_inventory'
  | 'view_movements'
  | 'view_reports'
  | 'scan_lookup'
  | 'view_customers'
  | 'view_invoices'
  // Master data
  | 'manage_products'
  | 'manage_warehouses'
  | 'manage_locations'
  | 'manage_suppliers'
  | 'manage_customers'
  | 'manage_invoices'
  // Operational
  | 'create_movement'
  | 'receive_delivery'
  | 'manage_deliveries'
  | 'manage_orders'
  | 'issue_stock'
  | 'issue_invoice'
  | 'export_reports'
  // Admin
  | 'manage_users'
  | 'manage_company_settings';

export const READ_ONLY_PERMISSIONS: Permission[] = [
  'view_dashboard',
  'view_products',
  'view_inventory',
  'view_movements',
  'view_reports',
  'scan_lookup',
  'view_customers',
  'view_invoices',
];

export const MASTER_DATA_PERMISSIONS: Permission[] = [
  'manage_products',
  'manage_warehouses',
  'manage_locations',
  'manage_suppliers',
  'manage_customers',
  'manage_invoices',
];

export const OPERATIONAL_PERMISSIONS: Permission[] = [
  'create_movement',
  'receive_delivery',
  'manage_deliveries',
  'manage_orders',
  'issue_stock',
  'issue_invoice',
  'export_reports',
];

export const ADMIN_PERMISSIONS: Permission[] = [
  'manage_users',
  'manage_company_settings'
];

// Mapping permissions to roles
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    ...READ_ONLY_PERMISSIONS,
    ...MASTER_DATA_PERMISSIONS,
    ...OPERATIONAL_PERMISSIONS,
    ...ADMIN_PERMISSIONS
  ],
  operator: [
    ...READ_ONLY_PERMISSIONS,
    ...MASTER_DATA_PERMISSIONS,
    ...OPERATIONAL_PERMISSIONS
  ],
  viewer: [
    ...READ_ONLY_PERMISSIONS
  ]
};

/**
 * Checks if a specific role has a given permission.
 */
export function can(role: Role, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(permission);
}
