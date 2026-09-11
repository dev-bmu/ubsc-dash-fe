import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { routes } from '@/config/routes'

// Halaman tujuan AuthGuard saat permission tidak cukup. Boilerplate mendorong ke
// /unauthorized tapi tidak pernah membuat halamannya — jadi 404, bukan penolakan.
//
// Teksnya sengaja sama persis dengan tooltip badge "Locked" di Sidebar supaya pengguna
// membaca kalimat yang sama dari dua arah (lihat TODO Fase 7 di (protected)/layout.tsx).

export const metadata: Metadata = {
  title: 'Akses Ditolak | UBSC Admin',
  description: 'Halaman ini membutuhkan akses yang belum diberikan.',
  robots: {
    index: false,
    follow: false
  }
}

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-secondary text-accent-red">
        <ShieldAlert className="size-8" aria-hidden="true" />
      </span>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Akses belum diberikan oleh Administrator</h1>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Akun Anda tidak memiliki izin untuk membuka halaman ini. Hubungi Administrator bila Anda merasa seharusnya punya akses.
        </p>
      </div>

      <Button asChild>
        <Link href={routes.dashboard()}>Kembali ke dashboard</Link>
      </Button>
    </main>
  )
}
