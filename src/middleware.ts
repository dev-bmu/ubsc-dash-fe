import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { PERMISSIONS_COOKIE, parsePermissionsCookie, ROLE_COOKIE } from '@/config/auth'
import { canAccessPathByRole, matchPrefix, PROTECTED_ROUTE_PREFIXES } from '@/config/permissions'
import { routes } from '@/config/routes'

// Semua peran berbagi satu dashboard; routes.dashboard() menetapkannya di '/'.
const DEFAULT_HOME = routes.dashboard()

// Route yang hanya boleh diakses saat BELUM login.
const guestRoutes: string[] = [routes.login()]

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

  const isProtectedRoute = PROTECTED_ROUTE_PREFIXES.some((prefix) => matchPrefix(path, prefix))
  const isLoggedIn = Boolean(userRole)

  // Belum login tapi buka route protected → lempar ke halaman login.
  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(buildLoginUrl(request))
  }

  if (isLoggedIn) {
    // Sudah login tapi buka /login → langsung ke dashboard.
    if (guestRoutes.includes(path)) {
      return NextResponse.redirect(new URL(DEFAULT_HOME, request.nextUrl))
    }

    // Route protected tapi permission tidak cukup → /unauthorized, BUKAN DEFAULT_HOME.
    // DEFAULT_HOME sekarang '/', dan '/' mengarahkan lagi ke dashboard (app/page.tsx), jadi
    // mengembalikan pengguna ke sana akan memantul bolak-balik tanpa henti saat justru
    // dashboard-nya yang tidak boleh dia buka. Tujuannya disamakan dengan AuthGuard di
    // src/app/(protected)/layout.tsx, yang juga mendorong ke /unauthorized.
    if (isProtectedRoute && !canAccessPathByRole(path, userRole, explicitPermissions)) {
      return NextResponse.redirect(new URL(routes.unauthorized(), request.nextUrl))
    }
  }

  return NextResponse.next()
}

export const config = {
  // Matcher agar middleware tidak berjalan di file statis atau API internal
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}
