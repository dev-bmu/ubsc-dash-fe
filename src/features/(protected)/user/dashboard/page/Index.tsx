'use client'

import React from 'react'
import Link from 'next/link'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { getEffectivePermissions, PERMISSIONS } from '@/config/permissions'
import { routes } from '@/config/routes'

const Dashboard = () => {
  const { user } = useAuth()
  const perms = getEffectivePermissions(user?.role, user?.permissions)
  const isAdmin = perms.includes(PERMISSIONS.RBAC_MANAGE)

  return (
    <PageContainer title="Dashboard">
      <div className="mb-8">
        <h2 className="text-xl font-bold tracking-tight">Hai, {user?.name || 'Pengguna'} 👋</h2>
        {/* Sebelumnya menampilkan unit/cluster pengguna — model organisasi itu dibuang di Fase 0.
            TODO Fase 7: halaman ini diganti Dashboard admin UBSC yang di-port dari Laravel. */}
        <p className="text-muted-foreground">UBSC Admin</p>
      </div>

      {/* Kartu statistik boilerplate DIHAPUS: sumbernya useGetDashboardStats -> GET /admin/dashboard/stats,
          controller yang sudah tidak ada di ubsc-api, dan angkanya (total divisi) berasal dari model
          organisasi yang dibuang. TODO Fase 7: statistik Dashboard UBSC yang sebenarnya di-port bersama
          halamannya, lewat endpoint dashboard yang dibangun di fase itu. */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isAdmin && (
          // routes.ts tidak punya entri `settings` tunggal — Laravel pun tidak punya halaman itu, yang ada
          // sub-halaman. Diarahkan ke settings pertama yang benar-benar ada di Laravel (ubsc-staff/settings/users).
          // TODO Fase 8: navigasi Settings sesungguhnya berupa grup menu BERSARANG di Sidebar Laravel yang
          // di-port apa adanya, bukan satu kartu pintasan seperti di sini.
          <Link href={routes.settingsUsers()}>
            <Card className="h-full transition-colors hover:border-primary/50">
              <CardHeader>
                <Settings className="h-6 w-6 text-primary" />
                <CardTitle className="text-base">Pengaturan</CardTitle>
                <CardDescription>Pengguna staff, role & jadwal</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          </Link>
        )}
      </div>
    </PageContainer>
  )
}

export default Dashboard
