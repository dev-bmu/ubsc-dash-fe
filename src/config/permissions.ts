export const PERMISSIONS = {
  DASHBOARD_READ: 'dashboard.read',
  RBAC_MANAGE: 'rbac.manage',
  ACCOUNT_READ: 'account.read',
  ACCOUNT_UPDATE: 'account.update'
} as const

export type KnownPermission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]
export type Permission = string

type RolePermissionMap = Record<string, Permission[]>

const USER_BASE_PERMISSIONS: Permission[] = [PERMISSIONS.DASHBOARD_READ, PERMISSIONS.ACCOUNT_READ, PERMISSIONS.ACCOUNT_UPDATE]

// Default fallback (sumber utama = permission dari BE /me). Admin = semua.
export const ROLE_PERMISSIONS: RolePermissionMap = {
  Admin: Object.values(PERMISSIONS),
  Staff: USER_BASE_PERMISSIONS
}

export const PROTECTED_ROUTE_PREFIXES = ['/dashboard', '/settings'] as const

export const matchPrefix = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`)

export const getRolePermissions = (role?: string): Permission[] => {
  if (!role) return []
  return ROLE_PERMISSIONS[role] ?? USER_BASE_PERMISSIONS
}

export const normalizePermissions = (permissions?: string[] | null): Permission[] => {
  if (!permissions?.length) return []
  return permissions
}

export const getEffectivePermissions = (role?: string, explicitPermissions?: string[] | null): Permission[] => {
  const normalizedExplicitPermissions = normalizePermissions(explicitPermissions)
  if (normalizedExplicitPermissions.length > 0) return normalizedExplicitPermissions
  return getRolePermissions(role)
}

export const hasPermission = (role: string | undefined, permission: Permission, explicitPermissions?: string[] | null): boolean => {
  return getEffectivePermissions(role, explicitPermissions).includes(permission)
}

const getRequiredPermissionForPath = (path: string): Permission | null => {
  if (matchPrefix(path, '/settings')) return PERMISSIONS.RBAC_MANAGE
  if (matchPrefix(path, '/dashboard')) return PERMISSIONS.DASHBOARD_READ
  return null
}

export const canAccessPathByRole = (path: string, role?: string, explicitPermissions?: string[] | null): boolean => {
  if (!role) return false

  const required = getRequiredPermissionForPath(path)
  if (!required) return true

  return hasPermission(role, required, explicitPermissions)
}
