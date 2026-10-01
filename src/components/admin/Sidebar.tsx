'use client'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Sidebar.tsx  —  admin chrome (port 1:1 dari Laravel Inertia)
//  Lokasi: src/components/admin/Sidebar.tsx
//  Sumber: UBSC-LARAVEL/resources/js/Components/Admin/Sidebar.tsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import './sidebar.css'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Activity,
  Award,
  BadgeCheck,
  Banknote,
  BarChart3,
  CalendarCheck2,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  Dumbbell,
  Film,
  HelpCircle,
  ImagePlus,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Newspaper,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ScanLine,
  ShieldCheck,
  UserCog,
  Users2,
  X
} from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { PERMISSIONS, isAdministrator, matchPrefix } from '@/config/permissions'
import { routes } from '@/config/routes'
import { useAuth } from '@/context/AuthContext'

const SIDEBAR_SCROLL_KEY = 'ubsc_admin_sidebar_scroll_top'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface SidebarProps {
  mobileOpen: boolean
  onClose: () => void
}

interface AccessGuard {
  permissions?: string[]
  requireAllPermissions?: boolean
  roles?: string[]
}

// href harus bertipe literal hasil builder routes.ts (bukan `string`): next.config.ts memakai
// typedRoutes, jadi `<Link href>` menolak `string` biasa saat `next build`. `Route` dari 'next'
// sengaja tidak diimpor (baru ada setelah .next/types ditulis; gagal di `tsc --noEmit` clone bersih)
// — pola sama dengan AdminSidebar boilerplate & catatan di src/config/routes.ts.
type NavHref = ReturnType<
  | typeof routes.dashboard
  | typeof routes.identity
  | typeof routes.facilities
  | typeof routes.bookings
  | typeof routes.checkin
  | typeof routes.classes
  | typeof routes.memberships
  | typeof routes.membershipPlans
  | typeof routes.gymCheckin
  | typeof routes.gymVisits
  | typeof routes.payments
  | typeof routes.finance
  | typeof routes.news
  | typeof routes.promo
  | typeof routes.sponsors
  | typeof routes.reels
  | typeof routes.testimonials
  | typeof routes.settingsSchedules
  | typeof routes.settingsRoles
  | typeof routes.settingsUsers
>

interface NavChild extends AccessGuard {
  icon: React.ElementType
  label: string
  href?: NavHref
  active: boolean
  badge?: string
  disabled?: boolean
  disabledReason?: string
}
interface NavItem extends NavChild {
  method?: string
  as?: string
  children?: NavChild[]
}
interface NavGroup {
  label: string
  items: NavItem[]
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TOOLTIP (collapsed mode)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function Tooltip({ label, visible }: { label: string; visible: boolean }) {
  if (!visible) return null
  return (
    <div className="sb-tooltip absolute top-1/2 left-full z-9999 ml-3 -translate-y-1/2 whitespace-nowrap">
      <div className="relative flex items-center">
        {/* Arrow */}
        <div className="absolute top-1/2 -left-1 h-0 w-0 -translate-y-1/2 border-t-[5px] border-r-[6px] border-b-[5px] border-t-transparent border-r-white border-b-transparent" />
        {/* Bubble */}
        <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.1),0_2px_6px_rgba(0,0,0,0.06)]">
          <p className="font-clash text-[13px] font-semibold text-slate-800">{label}</p>
        </div>
      </div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SINGLE NAV LINK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function NavLink({
  item,
  collapsed,
  depth = 0,
  animClass = '',
  onLogout
}: {
  item: NavItem | NavChild
  collapsed: boolean
  depth?: number
  animClass?: string
  onLogout?: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const [subOpen, setSubOpen] = useState(() => 'children' in item && !!item.children?.some((c) => c.active))

  const isLogout = item.label.toLowerCase().includes('log out')
  const hasChildren = 'children' in item && !!item.children?.length
  const Icon = item.icon
  const disabled = item.disabled ?? false

  // ── Wrapper classes ──────────────────────────────────────

  const wrapperCls = cn(
    'group relative flex items-center gap-3 rounded-xl',
    'transition-all duration-200 outline-hidden w-full text-left',
    'overflow-hidden select-none',
    disabled ? 'cursor-not-allowed' : 'cursor-pointer',
    collapsed ? 'px-0 py-0 justify-center' : depth > 0 ? 'px-3 py-2' : 'px-3 py-2.5',
    // ── TERRACOTTA active system — matches #12131c + terracotta shadow from pages ──
    disabled
      ? 'border border-slate-200/80 bg-slate-50/75 text-slate-400 opacity-55 grayscale'
      : item.active
        ? [
            'border border-[#F8B5A8]/75',
            'bg-[radial-gradient(circle_at_13%_12%,rgba(255,255,255,.96),transparent_30%),radial-gradient(circle_at_86%_80%,rgba(153,246,228,.52),transparent_34%),linear-gradient(135deg,#FFFFFF_0%,#FFF7F5_54%,#ECFDF5_100%)]',
            'text-slate-950',
            'shadow-[0_16px_30px_-24px_rgba(20,184,166,.75),0_12px_30px_-28px_rgba(227,83,54,.8),inset_0_1px_0_rgba(255,255,255,.96)]',
            'sb-active-glint'
          ].join(' ')
        : isLogout
          ? 'border border-transparent hover:bg-rose-50 hover:border-rose-100'
          : depth > 0
            ? 'hover:bg-[#FFF1EE]/60 hover:border hover:border-[#FFD5CD]/50'
            : 'border border-transparent hover:bg-[#FFF1EE]/40 hover:border-[#FFD5CD]/40',
    !collapsed && animClass
  )

  // ── Icon classes ─────────────────────────────────────────

  const iconCls = cn(
    'shrink-0 transition-all duration-200',
    collapsed ? 'mx-auto' : '',
    disabled
      ? 'text-slate-300'
      : item.active
        ? 'text-[#0F766E] drop-shadow-[0_0_10px_rgba(45,212,191,0.36)] scale-105'
        : isLogout
          ? 'text-slate-400 group-hover:text-rose-500 group-hover:scale-105'
          : depth > 0
            ? 'text-slate-400 group-hover:text-[#E35336] group-hover:scale-105'
            : 'text-slate-400 group-hover:text-[#E35336] group-hover:scale-105'
  )

  // ── Label classes ────────────────────────────────────────

  const labelCls = cn(
    'flex-1 font-clash leading-tight whitespace-nowrap transition-colors',
    depth > 0 ? 'text-[12.5px] font-medium' : 'text-[13.5px] font-semibold',
    disabled
      ? 'text-slate-400'
      : item.active
        ? 'text-slate-950'
        : isLogout
          ? 'text-slate-600 group-hover:text-rose-600 font-medium'
          : depth > 0
            ? 'text-slate-600 group-hover:text-slate-900'
            : 'text-slate-700 group-hover:text-slate-900'
  )

  // ── Badge ────────────────────────────────────────────────

  const badgeEl = item.badge ? <span className={item.active ? 'sb-badge-preview-active' : 'sb-badge-preview'}>{item.badge}</span> : null

  // ── Inner content ────────────────────────────────────────

  const lockedBadge =
    disabled && !collapsed ? (
      <span className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-bdo text-[8px] font-bold tracking-wider text-slate-400 uppercase">
        Locked
      </span>
    ) : null

  const tooltipLabel = disabled ? `${item.label} - ${item.disabledReason ?? 'akses belum diberikan'}` : item.label

  const inner = (
    <>
      {/* Caustic shimmer on active */}
      {item.active && <div className="sb-caustics pointer-events-none absolute inset-0 rounded-xl opacity-100" />}

      {/* Terracotta left accent bar on active (expanded) */}
      {item.active && !collapsed && (
        <div className="absolute top-[20%] bottom-[20%] left-0 w-[3px] rounded-full bg-linear-to-b from-[#EA684F] to-[#B93D2A] shadow-[0_0_6px_rgba(227,83,54,0.7)]" />
      )}

      {/* Icon container */}
      <div
        className={cn(
          'relative flex shrink-0 items-center justify-center transition-all duration-200',
          collapsed
            ? cn(
                'h-10 w-10 rounded-xl',
                item.active
                  ? 'border border-[#99F6E4]/70 bg-[linear-gradient(135deg,#ECFDF5,#FFFFFF_52%,#FFF7F5)] shadow-[0_10px_22px_-16px_rgba(20,184,166,.75),inset_0_1px_0_rgba(255,255,255,.95)]'
                  : isLogout
                    ? 'hover:bg-rose-50'
                    : 'hover:bg-[#FFF1EE]'
              )
            : 'h-[26px] w-[26px] rounded-lg'
        )}
      >
        <Icon size={collapsed ? 18 : 15} className={iconCls} />

        {/* Active indicator dot (collapsed only) */}
        {collapsed && item.active && <span className="sb-active-dot absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#14B8A6]" />}
      </div>

      {/* Label + badge + chevron (expanded only) */}
      {!collapsed && (
        <>
          <span className={labelCls}>{item.label}</span>
          {badgeEl}
          {lockedBadge}
          {hasChildren && (
            <ChevronDown
              size={12}
              className={cn('shrink-0 text-slate-400 transition-transform duration-200', subOpen && 'rotate-180 text-[#E35336]')}
            />
          )}
        </>
      )}

      {/* Tooltip (collapsed mode hover) */}
      {collapsed && <Tooltip label={tooltipLabel} visible={hovered} />}
    </>
  )

  // ── Render logic ─────────────────────────────────────────

  const handleParentClick = (e: React.MouseEvent) => {
    if (hasChildren && !collapsed) {
      e.preventDefault()
      setSubOpen((v) => !v)
    }
  }

  const isLogoutPost = 'method' in item && item.method === 'post'

  const wrapped = (() => {
    // Logout: di Laravel <Link method="post" as="button">; di Next tombol biasa + logout() dari
    // useAuth (bukan Inertia Link). Cek ini didahulukan agar tak jatuh ke cabang disabled karena
    // logout tidak lagi punya href (tidak ada route logout di routes.ts).
    if (isLogoutPost) {
      return (
        <button type="button" onClick={onLogout} className={wrapperCls}>
          {inner}
        </button>
      )
    }
    if (disabled || !item.href) {
      return (
        <button type="button" disabled title={item.disabledReason ?? 'Akses belum diberikan oleh Administrator'} className={wrapperCls}>
          {inner}
        </button>
      )
    }
    if (hasChildren && !collapsed) {
      return (
        <button type="button" onClick={handleParentClick} className={wrapperCls}>
          {inner}
        </button>
      )
    }
    return (
      <Link href={item.href} className={wrapperCls}>
        {inner}
      </Link>
    )
  })()

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn('relative', collapsed && 'flex justify-center')}
      data-sidebar-active={item.active ? 'true' : undefined}
    >
      {wrapped}

      {/* Submenu */}
      {hasChildren && !collapsed && (
        <div className={cn('mt-0.5 ml-5 flex flex-col gap-0.5 border-l-2 border-[#FFD5CD] pl-3', subOpen ? 'sb-submenu-open' : 'sb-submenu-close')}>
          {subOpen &&
            'children' in item &&
            item.children?.map((child, ci) => (
              <NavLink key={child.label} item={child} collapsed={false} depth={1} animClass={`sb-slide-right sb-d${ci + 1}`} />
            ))}
        </div>
      )}
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  NAV GROUP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function NavGroup({ group, collapsed, startDelay }: { group: NavGroup; collapsed: boolean; startDelay: number }) {
  return (
    <div className="mb-4">
      {/* Label (expanded) */}
      {!collapsed && (
        <div className="mb-1.5 flex items-center gap-2 px-3">
          <span className="font-bdo text-[9px] font-bold tracking-[0.22em] text-slate-400 uppercase">{group.label}</span>
          <div className="h-px flex-1 bg-linear-to-r from-slate-200 to-transparent" />
        </div>
      )}
      {/* Collapsed: separator dot */}
      {collapsed && (
        <div className="my-2 flex justify-center">
          <span className="h-1 w-1 rounded-full bg-[#F8B5A8]" />
        </div>
      )}

      <div className={cn('flex flex-col', collapsed ? 'items-center gap-1.5 px-0' : 'gap-0.5')}>
        {group.items.map((item, i) => (
          <NavLink key={item.label} item={item} collapsed={collapsed} animClass={`sb-fade-up sb-d${startDelay + i + 1}`} />
        ))}
      </div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SIDEBAR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth()
  const navScrollRef = useRef<HTMLElement | null>(null)
  const userRole = user?.role ?? null
  const permissionSet = new Set(user?.permissions ?? [])

  const can = (permissions: string[] = [], requireAll = false): boolean => {
    if (isAdministrator(userRole) || permissions.length === 0) return true

    return requireAll
      ? permissions.every((permission) => permissionSet.has(permission))
      : permissions.some((permission) => permissionSet.has(permission))
  }

  const hasRole = (roles: string[] = []): boolean => {
    if (isAdministrator(userRole) || roles.length === 0) return true

    return Boolean(userRole && roles.includes(userRole))
  }

  const guardedItem = <T extends NavItem | NavChild>(
    item: T & {
      permissions?: string[]
      requireAllPermissions?: boolean
      roles?: string[]
    }
  ): T => {
    const children = 'children' in item && item.children ? item.children.map((child) => guardedItem(child)) : undefined
    const allowed = can(item.permissions, item.requireAllPermissions) && hasRole(item.roles)

    return {
      ...item,
      disabled: item.disabled || !allowed,
      disabledReason: !allowed && !item.disabledReason ? 'Akses belum diberikan oleh Administrator' : item.disabledReason,
      ...(children ? { children } : {})
    } as T
  }

  // Persist collapse state in localStorage
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('sb_collapsed') === '1'
  })

  const toggleCollapsed = () =>
    setCollapsed((v) => {
      const next = !v
      localStorage.setItem('sb_collapsed', next ? '1' : '0')
      return next
    })

  const [isDesktop, setIsDesktop] = useState(true)
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1280)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const effectiveCollapsed = collapsed && isDesktop

  useEffect(() => {
    const nav = navScrollRef.current
    if (!nav || typeof window === 'undefined') return

    const savedValue = sessionStorage.getItem(SIDEBAR_SCROLL_KEY)
    const savedTop = Number(savedValue)
    const hasSavedTop = savedValue !== null && Number.isFinite(savedTop)

    const restore = () => {
      if (hasSavedTop) {
        nav.scrollTop = savedTop
        return
      }

      nav.querySelector<HTMLElement>('[data-sidebar-active="true"]')?.scrollIntoView({ block: 'center', inline: 'nearest' })
    }

    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(restore)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [effectiveCollapsed, mobileOpen])

  const rememberSidebarScroll = () => {
    const nav = navScrollRef.current
    if (!nav || typeof window === 'undefined') return
    sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(nav.scrollTop))
  }

  // ── Active states — IDENTICAL to original (route().current(...) -> matchPrefix(pathname, ...)) ──
  const pathname = usePathname()

  const dashboardActive = matchPrefix(pathname, '/')
  const identityActive = matchPrefix(pathname, '/identity')
  const facilitiesActive = matchPrefix(pathname, '/facilities')
  const bookingsActive = matchPrefix(pathname, '/bookings')
  const classesActive = matchPrefix(pathname, '/classes')
  const checkinActive = matchPrefix(pathname, '/checkin')
  const newsActive = matchPrefix(pathname, '/news')
  const promoActive = matchPrefix(pathname, '/promo')
  const sponsorsActive = matchPrefix(pathname, '/sponsors')
  const reelsActive = matchPrefix(pathname, '/reels')
  const testimonialsActive = matchPrefix(pathname, '/testimonials')
  // Laravel: membershipsActive hanya untuk admin.memberships.index|store (BUKAN plans). Karena
  // matchPrefix('/memberships/plans', '/memberships') true, kecualikan plans agar child "Anggota"
  // tidak ikut aktif di halaman Paket — sama seperti Laravel.
  const membershipsActive = matchPrefix(pathname, '/memberships') && !matchPrefix(pathname, '/memberships/plans')
  const plansActive = matchPrefix(pathname, '/memberships/plans')
  const gymCheckinActive = matchPrefix(pathname, '/gym/checkin')
  const gymVisitsActive = matchPrefix(pathname, '/gym/visits')
  const financeActive = matchPrefix(pathname, '/finance')
  const paymentsActive = matchPrefix(pathname, '/payments')
  const schedulesActive = matchPrefix(pathname, '/settings/schedules')
  const rolesActive = matchPrefix(pathname, '/settings/roles')
  const usersActive = matchPrefix(pathname, '/settings/users')

  // ── Nav structure — routes IDENTICAL to original ──────────
  const navGroups: NavGroup[] = [
    {
      label: 'Main',
      items: [
        {
          icon: LayoutDashboard,
          label: 'Dashboard',
          href: routes.dashboard(),
          active: dashboardActive
        },
        {
          icon: BadgeCheck,
          label: 'Identity Queue',
          href: routes.identity(),
          active: identityActive,
          permissions: [PERMISSIONS.IDENTITY_VERIFY]
        },
        {
          icon: Dumbbell,
          label: 'Facilities',
          href: routes.facilities(),
          active: facilitiesActive,
          permissions: [PERMISSIONS.FACILITIES_READ, PERMISSIONS.FACILITIES_MANAGE, PERMISSIONS.PRICING_MANAGE]
        },
        {
          icon: CalendarCheck2,
          label: 'Bookings',
          href: routes.bookings(),
          active: bookingsActive || classesActive || checkinActive,
          permissions: [PERMISSIONS.BOOKINGS_READ, PERMISSIONS.BOOKINGS_MANAGE, PERMISSIONS.PAYMENTS_MANAGE],
          children: [
            {
              icon: CalendarCheck2,
              label: 'Reservasi',
              href: routes.bookings(),
              active: bookingsActive,
              permissions: [PERMISSIONS.BOOKINGS_READ, PERMISSIONS.BOOKINGS_MANAGE, PERMISSIONS.PAYMENTS_MANAGE]
            },
            {
              // The desk's home screen. Front Office holds only
              // view-bookings, so this must accept that.
              icon: CheckCircle2,
              label: 'Check-in',
              href: routes.checkin(),
              active: checkinActive,
              permissions: [PERMISSIONS.BOOKINGS_READ, PERMISSIONS.BOOKINGS_MANAGE]
            },
            {
              icon: Users2,
              label: 'Roster Kelas',
              href: routes.classes(),
              active: classesActive,
              permissions: [PERMISSIONS.BOOKINGS_MANAGE]
            }
          ]
        },
        {
          icon: Users2,
          label: 'Memberships',
          href: routes.memberships(),
          active: membershipsActive || plansActive,
          permissions: [PERMISSIONS.MEMBERS_READ, PERMISSIONS.MEMBERS_MANAGE, PERMISSIONS.BOOKINGS_MANAGE, PERMISSIONS.PAYMENTS_MANAGE],
          children: [
            {
              icon: Users2,
              label: 'Anggota',
              href: routes.memberships(),
              active: membershipsActive,
              permissions: [PERMISSIONS.MEMBERS_READ, PERMISSIONS.MEMBERS_MANAGE, PERMISSIONS.BOOKINGS_MANAGE, PERMISSIONS.PAYMENTS_MANAGE]
            },
            {
              icon: Package,
              label: 'Paket',
              href: routes.membershipPlans(),
              active: plansActive,
              permissions: [PERMISSIONS.MEMBERS_MANAGE]
            }
          ]
        },
        {
          icon: ScanLine,
          label: 'Gym',
          href: routes.gymCheckin(),
          active: gymCheckinActive || gymVisitsActive,
          permissions: [PERMISSIONS.GYM_CHECKIN, PERMISSIONS.REPORTS_READ],
          children: [
            {
              icon: ScanLine,
              label: 'Check-in Gym',
              href: routes.gymCheckin(),
              active: gymCheckinActive,
              permissions: [PERMISSIONS.GYM_CHECKIN]
            },
            {
              icon: Activity,
              label: 'Kunjungan',
              href: routes.gymVisits(),
              active: gymVisitsActive,
              permissions: [PERMISSIONS.GYM_CHECKIN, PERMISSIONS.REPORTS_READ]
            }
          ]
        },
        {
          icon: Banknote,
          label: 'Pembayaran',
          href: routes.payments(),
          active: paymentsActive,
          permissions: [PERMISSIONS.BOOKINGS_MANAGE, PERMISSIONS.PAYMENTS_MANAGE]
        },
        {
          icon: BarChart3,
          label: 'Finance',
          href: routes.finance(),
          active: financeActive,
          permissions: [PERMISSIONS.REPORTS_READ]
        }
      ]
    },
    {
      label: 'Content',
      items: [
        {
          icon: Newspaper,
          label: 'News',
          href: routes.news(),
          active: newsActive,
          permissions: [PERMISSIONS.CMS_MANAGE]
        },
        {
          icon: ImagePlus,
          label: 'Promo',
          href: routes.promo(),
          active: promoActive,
          permissions: [PERMISSIONS.CMS_MANAGE]
        },
        {
          icon: Award,
          label: 'Sponsors',
          href: routes.sponsors(),
          active: sponsorsActive,
          permissions: [PERMISSIONS.CMS_MANAGE]
        },
        {
          icon: Film,
          label: 'Reels',
          href: routes.reels(),
          active: reelsActive,
          permissions: [PERMISSIONS.CMS_MANAGE]
        },
        {
          icon: MessageSquare,
          label: 'Testimonials',
          href: routes.testimonials(),
          active: testimonialsActive,
          permissions: [PERMISSIONS.CMS_MANAGE]
        }
      ]
    },
    {
      label: 'Settings',
      items: [
        {
          icon: CalendarRange,
          label: 'Schedule Control',
          href: routes.settingsSchedules(),
          active: schedulesActive,
          permissions: [PERMISSIONS.BOOKINGS_LIMITS_MANAGE]
        },
        {
          icon: ShieldCheck,
          label: 'Role & Access',
          href: routes.settingsRoles(),
          active: rolesActive
        },
        {
          icon: UserCog,
          label: 'Internal Users',
          href: routes.settingsUsers(),
          active: usersActive
        }
      ]
    },
    {
      label: 'Other',
      items: [
        {
          icon: HelpCircle,
          label: 'Help',
          disabled: true,
          active: false
        }
      ]
    }
  ]

  const visibleNavGroups = navGroups.map((group) => ({
    ...group,
    items: group.items.map((item) => guardedItem(item))
  }))

  const logoutItem: NavItem = {
    icon: LogOut,
    label: 'Log out',
    method: 'post',
    as: 'button',
    active: false
  }

  let delayCounter = 0

  return (
    <>
      {/* ── Mobile backdrop ── */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={cn(
          'fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300 xl:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          SIDEBAR PANEL
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-60 flex h-full shrink-0 flex-col',
          'w-[268px] max-w-[85vw]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          'xl:relative xl:z-0 xl:translate-x-0',
          effectiveCollapsed ? 'xl:w-[68px]' : 'xl:w-[268px]',
          'border-r border-slate-200/80 bg-white shadow-2xl xl:shadow-[4px_0_32px_rgba(0,0,0,0.05)]',
          'sb-panel-shimmer transition-[transform,width] duration-300 ease-in-out'
        )}
        aria-label="Admin sidebar"
      >
        {/* ── Top accent line — terracotta gradient matching pages ── */}
        <div className="absolute top-0 right-0 left-0 z-10 h-[2.5px] bg-linear-to-r from-[#E35336] via-[#EA684F] to-[#F08C78] opacity-80" />

        {/* ── Subtle inner left warm glow strip ── */}
        <div className="pointer-events-none absolute top-0 bottom-0 left-0 w-px bg-linear-to-b from-[#F08C78]/60 via-transparent to-transparent" />

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            HEADER
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div
          className={cn(
            'flex h-[68px] shrink-0 items-center border-b border-slate-100',
            'relative transition-all duration-300',
            effectiveCollapsed ? 'justify-center gap-0 px-0' : 'justify-between px-5'
          )}
        >
          <Link href={routes.dashboard()} className="group flex min-w-0 items-center gap-3 outline-hidden">
            {/* Logo */}
            <div className="relative shrink-0">
              <div className="sb-logo-breathe absolute inset-0 scale-75 rounded-full bg-[#EA684F]/15 blur-xl transition-transform duration-500 group-hover:scale-125" />
              {/* eslint-disable-next-line @next/next/no-img-element -- aset publik statis /UBSC PRO.png, bukan komponen next/image */}
              <img
                src="/UBSC PRO.png"
                alt="UBSC"
                className={cn(
                  'relative z-10 w-auto drop-shadow-xs transition-all duration-300 group-hover:scale-105',
                  effectiveCollapsed ? 'h-9 xl:h-3' : 'h-9'
                )}
              />
            </div>
          </Link>

          {/* Mobile close button (hidden in collapsed) */}
          {!effectiveCollapsed && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-[#FFF1EE] hover:text-[#B93D2A] xl:hidden"
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            NAV — scroll isolation applied here
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* Minimize control - separate from logo section */}
        <div
          className={cn(
            'hidden shrink-0 border-b border-slate-100 bg-white/95 xl:flex',
            effectiveCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
          )}
        >
          <button
            type="button"
            onClick={toggleCollapsed}
            title={effectiveCollapsed ? 'Expand sidebar' : 'Minimize sidebar'}
            aria-label={effectiveCollapsed ? 'Expand sidebar' : 'Minimize sidebar'}
            className={cn(
              'group flex w-full items-center gap-2.5 rounded-xl py-2',
              'border border-transparent font-bdo text-[10.5px] font-bold tracking-wider text-slate-400 uppercase',
              'transition-all duration-200 hover:border-[#FFD5CD] hover:bg-[#FFF1EE] hover:text-[#B93D2A]',
              effectiveCollapsed ? 'justify-center px-0' : 'px-3'
            )}
          >
            {effectiveCollapsed ? (
              <PanelLeftOpen size={15} className="text-slate-400 transition-colors group-hover:text-[#E35336]" />
            ) : (
              <>
                <PanelLeftClose size={15} className="shrink-0 text-slate-400 transition-colors group-hover:text-[#E35336]" />
                <span className="sb-fade-in">Minimize</span>
              </>
            )}
          </button>
        </div>

        <nav
          ref={navScrollRef}
          onScroll={rememberSidebarScroll}
          className={cn(
            // sb-scroll carries overscroll-behavior: contain (CSS above)
            'sb-scroll flex-1 transition-all duration-300',
            effectiveCollapsed ? 'px-2 py-5' : 'px-3 py-5'
          )}
          data-lenis-prevent="true"
        >
          {visibleNavGroups.map((group) => {
            const groupStart = delayCounter
            delayCounter += group.items.length
            return <NavGroup key={group.label} group={group} collapsed={effectiveCollapsed} startDelay={groupStart} />
          })}
        </nav>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            FOOTER — logout
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div
          className={cn(
            'shrink-0 border-t border-slate-100 bg-linear-to-b from-white to-slate-50/80',
            effectiveCollapsed ? 'px-2 py-3' : 'px-3 py-3'
          )}
        >
          {/* Logout */}
          <NavLink item={logoutItem} collapsed={effectiveCollapsed} onLogout={logout} />
        </div>
      </aside>
    </>
  )
}
