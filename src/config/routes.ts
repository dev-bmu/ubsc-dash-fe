// ===== Route builder halaman admin =====
// Pengganti `route()` Ziggy dari Laravel. Isinya HANYA URL halaman.
//
// Prefix `ubsc-staff/` DIBUANG seluruhnya: admin sekarang origin sendiri di dash.ubsportcenter.co.id,
// bukan lagi subfolder di dalam situs publik. Dua konsekuensi yang paling sering bikin salah port:
//   - `ubsc-staff.login`  (GET ubsc-staff/login) -> '/login'
//   - `admin.dashboard`   (GET ubsc-staff)       -> '/'
//
// Yang sengaja TIDAK ada di sini: semua endpoint tulis dan endpoint data admin — admin.customers.search,
// admin.notifications.index, admin.identity.document, dan seluruh store/update/destroy/reorder.
// Semuanya menjadi path API di dalam src/services/*.ts pada fase domain masing-masing.
// Peta kerjanya: ubsc-api/docs/route-inventory.md

// Catatan tipe: setiap builder di bawah diakhiri `as const` supaya tipe kembaliannya tetap literal
// ('/', '/login', dst), bukan `string` yang melebar. `typedRoutes` sudah aktif di next.config.ts, dan
// di sana `Link href` bertipe union route yang benar-benar ada — nilai `string` biasa ditolak saat
// `next build`. Tanpa `as const`, aturan ESLint no-restricted-syntax (wajib pakai builder ini) dan
// typedRoutes saling meniadakan: href literal gagal lint, href dari builder gagal build.
// `Route` dari 'next' sengaja tidak dipakai di sini — tipe itu baru ada setelah `next build` menulis
// .next/types, jadi `tsc --noEmit` di clone yang masih bersih akan gagal me-resolve-nya.
export const routes = {
  // ===== Chrome admin =====
  dashboard: () => '/' as const,
  login: () => '/login' as const,
  unauthorized: () => '/unauthorized' as const,

  // ===== Booking + operasional harian =====
  bookings: () => '/bookings' as const,
  checkin: () => '/checkin' as const,
  checkinToken: (token: string) => `/checkin/${token}` as const,
  classes: () => '/classes' as const,

  // ===== Fasilitas =====
  facilities: () => '/facilities' as const,
  facilitiesCreate: () => '/facilities/create' as const,
  facilitiesEdit: (id: string) => `/facilities/${id}/edit` as const,
  facilitiesPricing: (id: string) => `/facilities/${id}/pricing` as const,
  facilitiesUnits: (id: string) => `/facilities/${id}/units` as const,
  facilityCategories: () => '/facility-categories' as const,

  // ===== Keuangan, pembayaran, identitas =====
  finance: () => '/finance' as const,
  payments: () => '/payments' as const,
  identity: () => '/identity' as const,

  // ===== Membership =====
  memberships: () => '/memberships' as const,
  membershipPlans: () => '/memberships/plans' as const,

  gymCheckin: () => '/gym/checkin' as const,
  gymVisits: () => '/gym/visits' as const,

  // ===== CMS =====
  news: () => '/news' as const,
  newsCreate: () => '/news/create' as const,
  newsEdit: (id: string) => `/news/${id}/edit` as const,
  seoPages: () => '/seo-pages' as const,
  promo: () => '/promo' as const,
  reels: () => '/reels' as const,
  sponsors: () => '/sponsors' as const,
  testimonials: () => '/testimonials' as const,

  // ===== Settings =====
  settingsRoles: () => '/settings/roles' as const,
  settingsSchedules: () => '/settings/schedules' as const,
  settingsUsers: () => '/settings/users' as const,
  // Halaman baru: di Laravel gym traffic tidak punya halaman sendiri, hanya endpoint
  // PUT ubsc-staff/settings/gym-traffic yang dipanggil dari kontrol inline di Dashboard.
  // Fase 8F: diputuskan TETAP inline di Dashboard (GymTrafficWidget memanggil
  // PUT /admin/settings/gym-traffic lewat useUpdateGymTraffic). Tidak ada halaman
  // /settings/gym-traffic dan tidak akan dibuat — entri ini BUKAN href yang sah.
  settingsGymTraffic: () => '/settings/gym-traffic' as const
} as const

// ===== Pencocokan path aktif =====
// Pengganti `route().current('admin.facilities.*')` Ziggy untuk state aktif Sidebar:
// matchPrefix(usePathname(), '/facilities'). Definisi kanoniknya ada di src/config/permissions.ts;
// di-re-export di sini supaya kode navigasi cukup mengimpor satu modul.
export { matchPrefix } from './permissions'

// TODO Fase 7: PROTECTED_ROUTE_PREFIXES di permissions.ts masih bawaan boilerplate
// (['/dashboard', '/settings']) sedangkan dashboard admin ada di '/'. Selaraskan saat AuthGuard dirakit.

// TODO Fase 7: halaman dashboard masih berada di app/(protected)/dashboard, sedangkan
// dashboard() di atas sudah menunjuk '/'. Untuk sementara app/page.tsx yang menjembatani
// ('/' -> '/dashboard'). Saat Dashboard UBSC di-port, pindahkan halamannya ke
// app/(protected)/page.tsx, hapus app/page.tsx, lalu selaraskan PROTECTED_ROUTE_PREFIXES.

// TODO Fase 7: builder di atas yang halamannya belum dibuat akan ditolak `next build` begitu
// dipakai di `href` — buat halamannya pada fase yang bersangkutan, jangan melonggarkan tipenya.
