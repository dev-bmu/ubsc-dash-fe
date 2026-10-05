import './globals.css'
import type { Metadata } from 'next'
import { Providers } from './providers'
import { Toaster } from '@/components/ui/sonner'
import { runContractCheck } from '@/lib/contract-check'

// ===== Pemeriksaan kontrak (dev saja) =====
// Dipanggil di lingkup modul, bukan di dalam komponen: jalan sekali per proses server
// dan di luar siklus render, jadi tidak menyentuh strategi caching route mana pun.
runContractCheck()

// ===== Font =====
// Keputusan sama dengan landing: tidak ada next/font. Panel admin memakai .font-clash / .font-bdo
// sebagai class polos di banyak file, jadi family-nya @font-face mentah dengan nama asli di
// src/styles/ubsc-base.css (salinan identik landing). Figtree dari app.blade.php tidak di-port —
// dimuat Laravel tetapi tidak pernah dipakai.

export const metadata: Metadata = {
  title: 'UBSC Admin',
  description: 'Panel pengelolaan UB Sport Center',
  robots: {
    // Panel internal: jangan pernah diindeks.
    index: false,
    follow: false
  }
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Tidak ada ThemeProvider/next-themes di sini. Boilerplate memasangnya dengan
  // defaultTheme="dark" yang menaruh class="dark" di <html> dan mengaktifkan blok .dark
  // yang tidak terpakai. Panel admin UBSC hanya punya satu tema: terang.
  return (
    <html lang="id">
      {/* Sama persis dengan <body class="font-sans antialiased"> di app.blade.php Laravel. */}
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
        {/* Sonner dipertahankan — hanya di admin. Landing memakai FlashToast bespoke. */}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
