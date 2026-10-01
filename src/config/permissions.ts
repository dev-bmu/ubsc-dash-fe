// ===== RBAC frontend (lapisan UX di atas kontrak) =====
//
// SATU sumber kebenaran permission = src/types/contracts/permissions.ts (hasil sync:contracts
// dari ubsc-api/shared/permissions.ts). File ini TIDAK mendefinisikan permission apa pun sendiri;
// ia hanya me-re-export katalog itu dan menambah helper khusus frontend (gate menu Sidebar,
// gate path untuk middleware + AuthGuard).
//
// Sebelum Fase 7 file ini berisi katalog boilerplate palsu (dashboard.read / account.read,
// role Admin/Staff) yang TIDAK cocok dengan backend. Semua itu dibuang dan diganti kontrak asli.
//
// Ingat: gate FE hanya UX (menyembunyikan/mengunci menu, mengalihkan path). Otoritas sebenarnya
// ada di server (ubsc-api requirePermission + tabel role_permissions). Administrator mem-bypass
// seluruh pengecekan, sama seperti di Sidebar Laravel dan di middleware ubsc-api.

import {
  ADMINISTRATOR_ROLE,
  ALL_PERMISSIONS,
  getDefaultPermissionsByRole,
  isAdministrator,
  isPermissionCode,
  PERMISSIONS,
  PERMISSION_CODES,
  ROLE_PERMISSIONS,
  STAFF_ROLES,
  type PermissionCode,
  type StaffRoleName
} from '@/types/contracts/permissions'

// Re-export supaya seluruh chrome cukup mengimpor satu modul (@/config/permissions).
export {
  ADMINISTRATOR_ROLE,
  ALL_PERMISSIONS,
  getDefaultPermissionsByRole,
  isAdministrator,
  isPermissionCode,
  PERMISSIONS,
  PERMISSION_CODES,
  ROLE_PERMISSIONS,
  STAFF_ROLES
}
export type { PermissionCode, StaffRoleName }

// ===== Pencocokan prefix path =====
// Pengganti route().current('admin.facilities.*') Ziggy. Dipakai Sidebar (state aktif),
// middleware, dan AuthGuard. Di-re-export juga oleh src/config/routes.ts.
export const matchPrefix = (path: string, prefix: string): boolean => path === prefix || path.startsWith(`${prefix}/`)

// ===== Permission efektif =====
// Sama dengan boilerplate: permission eksplisit dari /me (atau cookie mirror) MENANG; bila kosong
// jatuh ke default per role dari matriks kontrak. Role tak dikenal -> array kosong (fail-closed).
export const getEffectivePermissions = (role?: string | null, explicitPermissions?: string[] | null): PermissionCode[] => {
  if (explicitPermissions && explicitPermissions.length > 0) {
    return explicitPermissions.filter(isPermissionCode)
  }
  return getDefaultPermissionsByRole(role)
}

// ===== can() / hasRole() =====
// Reproduksi verbatim logika Sidebar Laravel (Components/Admin/Sidebar.tsx):
//   - Administrator SELALU true.
//   - Daftar kosong SELALU true (item tanpa gate).
//   - `can` default ANY-of (.some); requireAll -> .every.
// Komponen chrome membangun closure-nya sendiri dari useAuth().user lewat createAccessChecker.
export const can = (role: string | null | undefined, permissions: string[], required: string[] = [], requireAll = false): boolean => {
  if (isAdministrator(role) || required.length === 0) return true
  const set = new Set(permissions)
  return requireAll ? required.every((permission) => set.has(permission)) : required.some((permission) => set.has(permission))
}

export const hasRole = (role: string | null | undefined, roles: string[] = []): boolean => {
  if (isAdministrator(role) || roles.length === 0) return true
  return Boolean(role && roles.includes(role))
}

/**
 * Membangun pemeriksa akses yang menutup role + permission efektif satu user, meniru pola
 * `const can = (perms, requireAll) => ...` di Sidebar Laravel. Dipakai Sidebar/Topbar/Forbidden.
 */
export const createAccessChecker = (role?: string | null, explicitPermissions?: string[] | null) => {
  const permissions = getEffectivePermissions(role, explicitPermissions)
  return {
    permissions,
    isAdministrator: isAdministrator(role),
    can: (required: string[] = [], requireAll = false) => can(role, permissions, required, requireAll),
    hasRole: (roles: string[] = []) => hasRole(role, roles)
  }
}

// ===== Gate path -> permission =====
// Diturunkan langsung dari gate menu Sidebar Laravel (ANY-of). Nama kebab Laravel sudah
// dipetakan ke dot-code lewat LARAVEL_PERMISSION_MAP; di sini ditulis final sebagai dot-code.
// Path yang TIDAK terdaftar tidak butuh permission khusus — sama seperti item Sidebar tanpa gate:
//   '/'  (Dashboard)          -> tanpa gate
//   '/settings/roles'         -> tanpa gate FE (Laravel: selalu aktif; otoritas rbac.manage di server)
//   '/settings/users'         -> tanpa gate FE (Laravel: selalu aktif; otoritas users.manage di server)
// Aturan dicocokkan dengan prefix TERPANJANG lebih dulu, jadi '/memberships/plans' menang atas
// '/memberships'.
const PATH_PERMISSIONS: ReadonlyArray<{ prefix: string; permissions: PermissionCode[] }> = [
  { prefix: '/identity', permissions: [PERMISSIONS.IDENTITY_VERIFY] },
  { prefix: '/facilities', permissions: [PERMISSIONS.FACILITIES_READ, PERMISSIONS.FACILITIES_MANAGE, PERMISSIONS.PRICING_MANAGE] },
  { prefix: '/facility-categories', permissions: [PERMISSIONS.FACILITIES_READ, PERMISSIONS.FACILITIES_MANAGE, PERMISSIONS.PRICING_MANAGE] },
  { prefix: '/checkin', permissions: [PERMISSIONS.BOOKINGS_READ, PERMISSIONS.BOOKINGS_MANAGE] },
  { prefix: '/classes', permissions: [PERMISSIONS.BOOKINGS_MANAGE] },
  { prefix: '/bookings', permissions: [PERMISSIONS.BOOKINGS_READ, PERMISSIONS.BOOKINGS_MANAGE, PERMISSIONS.PAYMENTS_MANAGE] },
  { prefix: '/memberships/plans', permissions: [PERMISSIONS.MEMBERS_MANAGE] },
  {
    prefix: '/memberships',
    permissions: [PERMISSIONS.MEMBERS_READ, PERMISSIONS.MEMBERS_MANAGE, PERMISSIONS.BOOKINGS_MANAGE, PERMISSIONS.PAYMENTS_MANAGE]
  },
  { prefix: '/payments', permissions: [PERMISSIONS.BOOKINGS_MANAGE, PERMISSIONS.PAYMENTS_MANAGE] },
  { prefix: '/gym/checkin', permissions: [PERMISSIONS.GYM_CHECKIN] },
  { prefix: '/gym/visits', permissions: [PERMISSIONS.GYM_CHECKIN, PERMISSIONS.REPORTS_READ] },
  { prefix: '/finance', permissions: [PERMISSIONS.REPORTS_READ] },
  { prefix: '/news', permissions: [PERMISSIONS.CMS_MANAGE] },
  { prefix: '/promo', permissions: [PERMISSIONS.CMS_MANAGE] },
  { prefix: '/sponsors', permissions: [PERMISSIONS.CMS_MANAGE] },
  { prefix: '/reels', permissions: [PERMISSIONS.CMS_MANAGE] },
  { prefix: '/testimonials', permissions: [PERMISSIONS.CMS_MANAGE] },
  { prefix: '/settings/schedules', permissions: [PERMISSIONS.BOOKINGS_LIMITS_MANAGE] }
]

// Semua prefix di atas dianggap "butuh sesi" untuk middleware. '/' dan halaman settings tanpa gate
// tetap terlindungi (butuh login) lewat logika middleware, bukan lewat daftar ini.
export const PROTECTED_ROUTE_PREFIXES = PATH_PERMISSIONS.map((rule) => rule.prefix)

/**
 * Boleh-tidaknya sebuah role membuka path. Dipakai middleware (edge) dan AuthGuard (client).
 * Tanpa role -> false (belum login). Path tanpa aturan -> true (mis. Dashboard '/'). Selain itu
 * cocokkan aturan prefix TERPANJANG lalu jalankan can() ANY-of.
 */
export const canAccessPathByRole = (path: string, role?: string | null, explicitPermissions?: string[] | null): boolean => {
  if (!role) return false

  const rule = PATH_PERMISSIONS.filter((candidate) => matchPrefix(path, candidate.prefix)).sort((a, b) => b.prefix.length - a.prefix.length)[0]

  if (!rule) return true

  return can(role, getEffectivePermissions(role, explicitPermissions), rule.permissions)
}
