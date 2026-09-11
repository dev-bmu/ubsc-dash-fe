'use client'

import { useEffect, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { canAccessPathByRole } from '@/config/permissions'
import { routes } from '@/config/routes'
import { DynamicSkeleton } from '@/components/ui/dynamic-skeleton'

// ===== Penjaga akses =====
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // Dihitung sekali, dipakai dua kali (efek pengalihan + keputusan render).
  // Boilerplate memanggil canAccessPathByRole() dua kali dan sempat tidak sinkron.
  const isAuthorized = useMemo(() => {
    if (!user) return false
    return canAccessPathByRole(pathname, user.role, user.permissions)
  }, [user, pathname])

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      router.replace(routes.login())
      return
    }

    if (!isAuthorized) {
      // replace, bukan push: kalau push, tombol Back melempar pengguna kembali ke halaman
      // terlarang dan memicu pengalihan berulang.
      router.replace(routes.unauthorized())
    }
  }, [user, isLoading, isAuthorized, router])

  if (isLoading || !user) {
    return <DynamicSkeleton variant="fullPageLoader" loaderText="Memuat Sesi..." />
  }

  if (!isAuthorized) {
    return <DynamicSkeleton variant="fullPageLoader" loaderText="Mengalihkan..." />
  }

  return <>{children}</>
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  // TODO Fase 7: chrome panel dipasang DI SINI, bukan lewat <PageContainer title> per halaman
  // (menyimpang dari boilerplate, disengaja):
  //   - Sidebar (46 KB) dan Topbar (61 KB) dari Laravel di-port APA ADANYA. Jangan dibangun
  //     ulang di atas shadcn sidebar.tsx — shadcn memaksakan lebar berbasis CSS variable,
  //     sibling SidebarInset, mobile berbasis Sheet, dan semantik group-data-[collapsible=icon];
  //     Sidebar UBSC punya collapse ter-persist di localStorage, children bersarang, pill
  //     terracotta dengan shimmer, dan keyframes masuknya sendiri.
  //   - Perilaku badge "Locked" DIPERTAHANKAN: item yang tidak bisa diakses tetap tampil,
  //     abu-abu, dengan pill "Locked" dan tooltip "Akses belum diberikan oleh Administrator" —
  //     BUKAN disembunyikan seperti boilerplate.
  //   - Topbar menurunkan judulnya sendiri dari tabel pattern, jadi halaman tidak mengirim prop title.
  // Layout ini tidak boleh re-mount saat navigasi: itu yang menjaga posisi scroll dan state
  // collapse sidebar bertahan antar halaman.
  return (
    <AuthProvider>
      <AuthGuard>{children}</AuthGuard>
    </AuthProvider>
  )
}
