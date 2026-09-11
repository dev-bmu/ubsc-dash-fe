'use client'
import { Toaster as Sonner, ToasterProps } from 'sonner'

// ===== Toaster =====
// Boilerplate membaca tema lewat useTheme() dari next-themes. Paket itu SENGAJA dibuang di
// repo ini (lihat catatan di src/app/globals.css, src/app/layout.tsx, dan
// src/components/layout/Navbar.tsx): panel UBSC hanya punya satu tema, terang, dan tidak
// pernah memasang ThemeProvider. Karena Sonner menerima `theme` sebagai prop biasa, nilainya
// cukup dipatok 'light' — jangan memasang kembali next-themes hanya demi baris ini.
//
// Tetap bisa ditimpa lewat prop karena {...props} disebar setelahnya.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      richColors
      toastOptions={{
        classNames: {
          toast: 'backdrop-blur-lg shadow-lg',
          success: '!bg-stat-emerald-soft !text-stat-emerald !border-stat-emerald/20',
          error: '!bg-stat-rose-soft !text-stat-rose !border-stat-rose/20',
          warning: '!bg-stat-amber-soft !text-stat-amber !border-stat-amber/20',
          info: '!bg-stat-blue-soft !text-stat-blue !border-stat-blue/20',
          loading: '!bg-muted !text-muted-foreground'
        }
      }}
      {...props}
    />
  )
}

export { Toaster }
