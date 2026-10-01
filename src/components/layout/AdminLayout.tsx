'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Sidebar } from '@/components/admin/Sidebar'
import { Topbar } from '@/components/admin/Topbar'

// ===== Shell admin (rangka saja) =====
// Port dari Layouts/AdminLayout.tsx (Laravel). Di Next dipasang DI (protected)/layout.tsx, bukan
// dipanggil per halaman seperti Inertia — supaya layout TIDAK re-mount saat pindah halaman, jadi
// state collapse Sidebar (localStorage) + posisi scroll bertahan antar navigasi.
//
// PENTING: App Router tak bisa mengoper prop `header` per-halaman ke layout. Maka shell ini hanya
// merender rangka (Sidebar + kolom-scroll + Topbar) lalu {children}. SETIAP halaman merender sendiri
// div header (px-4 pt-2 xl:px-8) + elemen main (max-w-full flex-1 px-4 pb-10 pt-2 xl:px-8) PERSIS
// seperti yang dulu dibungkus AdminLayout Laravel — tanpa nesting/padding ganda, DOM identik.
export function AdminLayout({ children }: { children: ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileSidebarOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="relative flex h-dvh w-full max-w-[100vw] overflow-hidden bg-[#F8F9FA] font-bdo text-gray-900">
      <Sidebar mobileOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />

      <div className="relative z-10 flex h-full w-full min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto" data-lenis-prevent="true">
        <Topbar onMobileMenuClick={() => setMobileSidebarOpen(true)} />

        {children}
      </div>
    </div>
  )
}
