'use client'

import { useEffect, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { canAccessPathByRole } from '@/config/permissions'
import { routes } from '@/config/routes'
import { DynamicSkeleton } from '@/components/ui/dynamic-skeleton'
import { AdminLayout } from '@/components/layout/AdminLayout'

// ===== Penjaga akses + chrome =====
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // Dihitung sekali, dipakai dua kali (efek pengalihan + keputusan render).
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

  // Chrome dipasang DI SINI (bukan lewat <PageContainer title> per halaman): Sidebar + Topbar
  // di-port 1:1 dari Laravel. Layout ini tidak re-mount saat navigasi, jadi collapse Sidebar
  // (localStorage) + posisi scroll bertahan. Halaman 403 (/unauthorized) juga hidup di grup ini
  // sehingga tampil BERSAMA chrome — sama seperti Forbidden Laravel yang membungkus AdminLayout
  // untuk staff.
  return <AdminLayout>{children}</AdminLayout>
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuard>{children}</AuthGuard>
    </AuthProvider>
  )
}
