'use client'

import { useAuth } from '@/context/AuthContext'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'

// TODO Fase 7: komponen ini diganti Topbar (61 KB) yang di-port apa adanya dari Laravel.
// Dua bagian warisan boilerplate sudah dicabut di Fase 0:
//   - tombol ganti tema — ThemeProvider/next-themes dibuang, jadi tombolnya tidak menggerakkan apa pun;
//   - pill "unit" — model organisasi unit/cluster/division tidak dipakai UBSC dan sudah hilang dari AuthUser.
export function Navbar({ title }: { title?: string }) {
  const { user } = useAuth()

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U'

  return (
    <header className="sticky top-2 z-30 mx-2 flex h-14 items-center justify-between rounded-xl border border-border bg-card px-4 shadow-sm">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-5" />
        {title && <span className="text-sm font-semibold">{title}</span>}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="hidden text-right sm:block">
            <p className="text-sm leading-none font-medium">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">{initials}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
