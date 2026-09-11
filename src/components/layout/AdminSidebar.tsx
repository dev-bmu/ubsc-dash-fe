'use client'

import { getEffectivePermissions, PERMISSIONS } from '@/config/permissions'
import { matchPrefix, routes } from '@/config/routes'
import { useAuth } from '@/context/AuthContext'
import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Settings, LogOut } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
  useSidebar
} from '@/components/ui/sidebar'

// `url` sengaja bertipe literal hasil builder routes.ts, bukan `string`: typedRoutes menolak
// `string` di href. `Route` dari 'next' tidak diimpor karena tipe itu baru ada setelah
// .next/types ditulis, jadi `tsc --noEmit` di clone yang masih bersih akan gagal me-resolve-nya
// (keputusan yang sama dengan ubsc-landing/src/config/routes.ts).
//
// Daftarnya ditulis eksplisit, bukan diturunkan dari seluruh isi routes.ts: sebagian besar builder
// di sana halamannya baru dibuat di fase domain masing-masing, dan union yang memuat mereka akan
// ditolak typedRoutes. Tambahkan entri di sini bersamaan dengan halamannya.
type MenuHref = ReturnType<typeof routes.dashboard> | ReturnType<typeof routes.settingsUsers>

type MenuItem = { name: string; url: MenuHref; icon: React.ComponentType<{ className?: string }> }

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, logout } = useAuth()
  const { state } = useSidebar()
  const pathname = usePathname()

  if (!user) return null

  const handleLogout = () => logout()

  const perms = getEffectivePermissions(user.role, user.permissions)
  const can = (p: string) => perms.includes(p)

  const menuItems: MenuItem[] = [...(can(PERMISSIONS.DASHBOARD_READ) ? [{ name: 'Dashboard', url: routes.dashboard(), icon: Home }] : [])]

  const showSettings = can(PERMISSIONS.RBAC_MANAGE)

  // Dashboard ada di '/' (routes.dashboard()), jadi pencocokannya harus persis — matchPrefix('/x', '/')
  // selalu benar dan akan menyalakan semua item sekaligus.
  const isActive = (url: string) => (url === routes.dashboard() ? pathname === url : matchPrefix(pathname, url))

  const renderMenuItems = (items: MenuItem[]) =>
    items.map((item) => (
      <SidebarMenuItem key={item.name}>
        <Link href={item.url} passHref>
          <SidebarMenuButton tooltip={item.name} isActive={isActive(item.url)}>
            <item.icon className="h-4 w-4" />
            <span className="group-data-[collapsible=icon]:hidden">{item.name}</span>
          </SidebarMenuButton>
        </Link>
      </SidebarMenuItem>
    ))

  return (
    <Sidebar variant="floating" collapsible="icon" {...props}>
      <SidebarHeader className="px-4 py-4">
        <SidebarMenuButton
          size="lg"
          className="hover:bg-transparent data-[state=open]:bg-transparent data-[state=open]:text-sidebar-accent-foreground"
        >
          <div className="flex aspect-square size-8 items-center justify-center">
            {/* Boilerplate memilih logo gelap/terang lewat resolvedTheme dari next-themes. Paket itu
                SENGAJA dibuang di repo ini (lihat globals.css, layout.tsx, Navbar.tsx): panel UBSC
                hanya punya satu tema, terang. Cabang temanya dibuang dan varian terang dipatok —
                jangan memasang kembali next-themes untuk menghidupkan cabang ini. */}
            <Image src="/img/SidebarLogos.svg" alt="Starter BMU" width={state === 'collapsed' ? 24 : 32} height={state === 'collapsed' ? 24 : 32} />
          </div>
          <span className="font-display text-base font-bold tracking-tight group-data-[collapsible=icon]:hidden">
            <span className="text-foreground">Starter</span> <span className="text-primary">BMU</span>
          </span>
        </SidebarMenuButton>
      </SidebarHeader>

      <SidebarContent>
        {menuItems.length > 0 && (
          <SidebarGroup>
            <SidebarMenu>{renderMenuItems(menuItems)}</SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {showSettings && (
            <SidebarMenuItem>
              {/* routes.ts tidak punya entri `settings` tunggal — Laravel pun tidak punya halaman itu,
                  yang ada sub-halaman. Tujuannya diarahkan ke settings pertama yang benar-benar ada
                  di Laravel (ubsc-staff/settings/users).
                  TODO Fase 8: navigasi Settings sesungguhnya berupa grup menu BERSARANG di Sidebar
                  Laravel yang di-port apa adanya (roles, schedules, users, gym traffic), bukan satu
                  item datar seperti di sini. */}
              <Link href={routes.settingsUsers()} passHref>
                <SidebarMenuButton tooltip="Pengaturan" isActive={isActive(routes.settingsUsers())}>
                  <Settings className="h-4 w-4" />
                  <span className="group-data-[collapsible=icon]:hidden">Pengaturan</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Log Out" onClick={handleLogout} className="text-stat-rose hover:bg-stat-rose-soft hover:text-stat-rose">
              <LogOut className="h-4 w-4" />
              <span className="group-data-[collapsible=icon]:hidden">Log Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
