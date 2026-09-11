import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ROLE_COOKIE } from '@/config/auth'

// Root hanya pengarah: sudah login -> dashboard, belum -> login.
//
// Penanda sesi yang dibaca HANYA cookie mirror ubsc_s_role. Cookie refresh (ubsc_s_refresh)
// ber-Path=/api/auth, jadi request ke '/' tidak pernah membawanya dan memeriksanya di sini
// akan membuat pengguna yang sudah login selalu terlempar ke /login.
//
// TODO Fase 7: routes.dashboard() sudah menunjuk '/', tapi halaman dashboard masih berada di
// app/(protected)/dashboard. Saat Dashboard UBSC di-port, pindahkan halamannya ke
// app/(protected)/page.tsx dan hapus berkas jembatan ini.
export default async function Home() {
  const cookieStore = await cookies()
  const isLoggedIn = Boolean(cookieStore.get(ROLE_COOKIE)?.value)
  redirect(isLoggedIn ? '/dashboard' : '/login')
}
