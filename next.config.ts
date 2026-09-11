import type { NextConfig } from 'next'

// ===== Konfigurasi Next (panel admin, port 3001) =====
// Browser hanya bicara same-origin ke :3001; semua panggilan API di-proxy
// lewat rewrite di bawah supaya cookie refresh token tetap same-site.
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4020'

const nextConfig: NextConfig = {
  // R10: href harus berasal dari builder di src/config/routes.ts, bukan string bebas.
  // typedRoutes membuat path yang tidak ada gagal saat build.
  // Opsinya stabil di level teratas sejak Next 15.5 (sebelumnya experimental.typedRoutes, yang
  // juga tidak kompatibel dengan Turbopack). Repo ini mem-pin Next ^15.5.25 dan menjalankan
  // `next dev --turbopack`, jadi bentuk inilah yang benar — sama dengan ubsc-landing.
  typedRoutes: true,

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_BASE_URL}/api/:path*`
      },
      {
        source: '/uploads/:path*',
        destination: `${API_BASE_URL}/uploads/:path*`
      }
    ]
  }
}

export default nextConfig
