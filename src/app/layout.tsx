import './globals.css'
import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Geist_Mono } from 'next/font/google'
import { Providers } from './providers'
import { Toaster } from '@/components/ui/sonner'
import { runContractCheck } from '@/lib/contract-check'

// ===== Pemeriksaan kontrak (dev saja) =====
// Dipanggil di lingkup modul, bukan di dalam komponen: jalan sekali per proses server
// dan di luar siklus render, jadi tidak menyentuh strategi caching route mana pun.
runContractCheck()

// ===== Font =====
// TODO Fase 2: samakan dengan keputusan font landing. Panel admin memakai .font-clash /
// .font-bdo sebagai class polos di banyak file, jadi family-nya harus @font-face mentah
// dengan nama asli — bukan nama ter-obfuscate hasil next/font.
const jakarta = Plus_Jakarta_Sans({
  variable: '--font-sans',
  subsets: ['latin']
})

const jakartaDisplay = Plus_Jakarta_Sans({
  variable: '--font-display',
  weight: ['600', '700', '800'],
  subsets: ['latin']
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin']
})

export const metadata: Metadata = {
  title: 'UBSC Admin',
  description: 'Panel pengelolaan UBS Port Center',
  icons: {
    // TODO Fase 9: ganti dengan favicon UBSC hasil diet aset.
    icon: '/img/favicon.svg',
    shortcut: '/img/favicon.svg',
    apple: '/img/favicon.svg'
  },
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
      <body className={`${jakarta.variable} ${jakartaDisplay.variable} ${geistMono.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
        {/* Sonner dipertahankan — hanya di admin. Landing memakai FlashToast bespoke. */}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
