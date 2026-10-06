import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { PERMISSIONS_COOKIE, parsePermissionsCookie, ROLE_COOKIE } from '@/config/auth'
import { canAccessPathByRole } from '@/config/permissions'
import { routes } from '@/config/routes'

// Semua peran berbagi satu dashboard; routes.dashboard() menetapkannya di '/'.
const DEFAULT_HOME = routes.dashboard()

// Route yang hanya boleh diakses saat BELUM login.
const guestRoutes: string[] = [routes.login()]

// Halaman 403: butuh sesi (kalau tamu -> login), tapi TIDAK butuh permission apa pun —
// justru ke sinilah pengguna terautentikasi-tapi-tak-berwenang dialihkan.
const UNAUTHORIZED_PATH = routes.unauthorized()

const buildLoginUrl = (request: NextRequest) => {
  const url = new URL(routes.login(), request.nextUrl)
  const requestedPathWithQuery = `${request.nextUrl.pathname}${request.nextUrl.search}`
  if (requestedPathWithQuery !== DEFAULT_HOME) url.searchParams.set('returnUrl', requestedPathWithQuery)
  return url
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Hanya cookie mirror yang dibaca. Cookie refresh (ubsc_s_refresh) ber-Path=/api/auth dan
  // karena itu TIDAK PERNAH ikut terkirim ke path '/', jadi memeriksanya di sini akan membuat
  // setiap pengguna yang sudah login terbaca sebagai tamu dan terlempar ke /login selamanya.
  const userRole = request.cookies.get(ROLE_COOKIE)?.value
  const explicitPermissions = parsePermissionsCookie(request.cookies.get(PERMISSIONS_COOKIE)?.value)
  const isLoggedIn = Boolean(userRole)

  // ===== Route tamu (/login) =====
  // SELALU dirender, juga saat cookie role ada. ubsc_s_role hanya petunjuk: cookie basi (mis. sisa
  // Domain=.ubsportcenter.co.id yang tak bisa dihapus host-only) atau role tanpa refresh token
  // membuat /login -> '/' lalu AuthGuard (refresh 401) -> /login berputar tanpa henti dan form
  // login tak pernah muncul. Staff yang sesinya masih sah cukup login ulang.
  if (guestRoutes.includes(path)) return NextResponse.next()

  // ===== Semua route lain butuh sesi =====
  // Panel ini tidak punya halaman publik selain /login: '/', dashboard, dan seluruh area admin
  // terlindungi. Beda dengan boilerplate lama yang hanya menjaga ['/dashboard','/settings'] dan
  // membiarkan '/' (dashboard sebenarnya) lolos.
  if (!isLoggedIn) {
    return NextResponse.redirect(buildLoginUrl(request))
  }

  // Halaman 403 boleh dibuka siapa pun yang sudah login (tanpa cek permission), jika tidak
  // pengalihan ke sini akan memantul.
  if (path === UNAUTHORIZED_PATH) {
    return NextResponse.next()
  }

  // Route terlindungi tapi permission tidak cukup → /unauthorized, BUKAN DEFAULT_HOME.
  // DEFAULT_HOME '/' bisa jadi justru halaman yang tidak boleh dia buka; mengembalikannya ke sana
  // memantul bolak-balik. Disamakan dengan AuthGuard di src/app/(protected)/layout.tsx.
  if (!canAccessPathByRole(path, userRole, explicitPermissions)) {
    return NextResponse.redirect(new URL(UNAUTHORIZED_PATH, request.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  // Matcher agar middleware tidak berjalan di file statis atau API internal. `.*\..*` mengecualikan
  // semua berkas public/ (logo, /fonts/*, /BES.png, /img/*): tanpa itu tamu di /login dialihkan
  // saat meminta logo/font, dan staff bisa terlempar ke /unauthorized karena path berkas tak lolos
  // cek permission. Route halaman panel tidak pernah memakai titik.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)']
}
