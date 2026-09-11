'use client'

import { PageContainer } from '@/components/layout/PageContainer'

// ===== Placeholder halaman Settings > Users =====
// Halaman /settings boilerplate (layar RBAC lama) DIHAPUS di Fase 0 bersama controller
// /admin/rbac, /admin/dashboard, dan /admin/master yang sudah tidak ada di ubsc-api.
//
// Berkas ini ada karena satu alasan teknis, bukan karena isinya: `typedRoutes` menolak href yang
// halamannya tidak ada, sedangkan Sidebar dan Dashboard sudah menunjuk routes.settingsUsers()
// (halaman settings pertama yang benar-benar ada di Laravel: ubsc-staff/settings/users).
// Tanpa berkas ini `next build` gagal. Jangan diisi fitur — isinya dibangun di Fase 8.
//
// TODO Fase 8: port layar Settings dari Laravel APA ADANYA — daftar user staff beserta
// grup menu Settings bersarang di Sidebar (roles, schedules, users, gym traffic).
export default function SettingsUsersPage() {
  return (
    <PageContainer title="Pengaturan Pengguna">
      <div className="space-y-2">
        <h2 className="text-xl font-bold tracking-tight">Pengaturan Pengguna</h2>
        <p className="text-sm text-muted-foreground">Halaman ini belum dibangun. Layar Settings di-port dari Laravel pada Fase 8.</p>
      </div>
    </PageContainer>
  )
}
