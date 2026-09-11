// ===== Konstanta auth (satu sumber kebenaran) =====
// Dipakai bersama oleh src/lib/axios.ts, src/services/Auth.ts, src/context/AuthContext.tsx,
// src/middleware.ts, dan src/app/page.tsx. Ditaruh terpisah dari lib/axios.ts karena middleware
// berjalan di edge runtime dan tidak boleh menyeret axios ke dalam bundle-nya.

// ===== Basis path auth =====
// ubsc-api mendaftarkan audience sebagai SEGMEN URL, bukan menebaknya dari header Origin:
//   POST   /api/auth/staff/login      POST /api/auth/customer/login
//   POST   /api/auth/staff/refresh    ...
//   POST   /api/auth/staff/logout     (juga DELETE)
//   GET    /api/auth/staff/sessions   DELETE /api/auth/staff/sessions[/:id]
// Lihat ubsc-api/src/routes/details/auth.ts. Panel ini SELALU audience 'staff'.
//
// Nilainya relatif terhadap baseURL axios ('/api'), jadi hasil akhirnya '/api/auth/staff/...'
// yang diteruskan ke ubsc-api lewat rewrite di next.config.ts.
export const AUTH_BASE = '/auth/staff'

// ===== Cookie mirror =====
// ubsc-api menyetel tiga cookie untuk audience staff (lihat ubsc-api/src/services/auth-services.ts):
//   ubsc_s_refresh     httpOnly, Path=/api/auth  -> SECARA DESAIN tidak terlihat di path '/'
//   ubsc_s_role        non-httpOnly, Path=/       -> penanda "ada sesi" untuk middleware
//   ubsc_s_permissions non-httpOnly, Path=/       -> daftar permission, JSON ter-encode
//
// Karena cookie refresh ber-Path=/api/auth, middleware yang berjalan di '/' TIDAK PERNAH
// melihatnya. Gate akses karena itu hanya boleh bergantung pada ubsc_s_role — memeriksa
// refresh token di sini berarti setiap pengguna yang sudah login dianggap tamu.
export const ROLE_COOKIE = 'ubsc_s_role'
export const PERMISSIONS_COOKIE = 'ubsc_s_permissions'

// ===== Pembaca cookie permission =====
// Nilainya JSON yang di-encode ubsc-api, lalu di-encode sekali lagi oleh res.cookie() Express.
// Berapa lapis yang tersisa saat sampai di sini tergantung runtime yang membaca cookie, jadi
// parser ini mencoba apa adanya dulu baru mengurai lapisannya. Bentuk apa pun yang tidak
// menghasilkan array dianggap tidak ada — permission lalu jatuh ke default per role.
export const parsePermissionsCookie = (raw?: string): string[] | undefined => {
  if (!raw) return undefined

  let candidate = raw
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const parsed: unknown = JSON.parse(candidate)
      if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === 'string')
      return undefined
    } catch {
      let decoded: string
      try {
        decoded = decodeURIComponent(candidate)
      } catch {
        return undefined
      }
      if (decoded === candidate) return undefined
      candidate = decoded
    }
  }

  return undefined
}
