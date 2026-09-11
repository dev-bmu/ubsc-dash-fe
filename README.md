# ubsc-admin

Panel staff UB Sport Center — `dash.ubsportcenter.co.id`. Berisi dashboard, pengelolaan fasilitas & harga, booking, check-in, kelas, membership, pembayaran, finance, verifikasi identitas, CMS, RBAC, dan pengaturan.

Repo ini **tidak pernah menyentuh database**. Semua data datang dari `ubsc-api` lewat HTTP, dan setiap permission ditegakkan **di server** — gate di sisi Next hanya UX.

> **Peringatan R12 — kontrak.**
> Kontrak (DTO response, daftar `PERMISSIONS`, format Rupiah/tanggal) **hanya ditulis di `ubsc-api/shared/`**.
> Folder `src/types/contracts/` di repo ini adalah **salinan AUTO-GENERATED** hasil `npm run sync:contracts`, dan salinan itu **di-commit** supaya build tidak butuh akses ke repo API.
> **Jangan pernah mengeditnya dengan tangan.** Suntingan tangan akan tertimpa pada sync berikutnya, dan sampai saat itu tipe di repo ini tetap hijau di atas kontrak yang salah — mode gagalnya diam dan baru muncul di runtime. Kalau sebuah field kurang, tambahkan di `ubsc-api/shared/`, lalu sync.

## Stack

| Bagian | Versi / paket |
| --- | --- |
| Runtime | Node 24 (dipin lewat `.nvmrc` + `engines`) |
| Framework | Next.js 15 (App Router) + Turbopack saat dev |
| UI | React 19, Tailwind v4 dengan blok kompatibilitas v3, shadcn/ui + TanStack Table |
| Data | TanStack Query v5 + axios (`src/lib/axios.ts`, interceptor single-flight refresh) |
| Form | react-hook-form + Zod 4 (schema request memang sengaja diduplikasi dari API, bukan di-share) |
| Notifikasi | Sonner (`toast`) — landing memakai FlashToast bespoke, jangan ditukar |
| Bahasa | TypeScript strict |

## Prasyarat

- **Node 24** dan npm 11.
- **`ubsc-api` harus jalan di `http://localhost:4020`.**
- **Salinan lokal repo `ubsc-api`** untuk `sync:contracts`. Path-nya dibaca dari variabel `UBSC_API_LOCAL_PATH` di `.env` (default: `../ubsc-api`), jadi cara paling mudah adalah menaruh ketiga repo bersebelahan dalam satu folder induk.
- MySQL tidak dibutuhkan di sini. **Docker juga tidak dipakai di proyek ini** — lihat `ubsc-api/docs/fase-0.md`.

## Setup

```bash
cp .env.example .env          # minimal: API_BASE_URL
npm ci                        # WAJIB npm ci — lockfile ter-commit adalah kontraknya (R17)
npm run sync:contracts        # menyalin ubsc-api/shared ke src/types/contracts lalu tsc --noEmit
```

`package-lock.json` **ter-commit** di repo ini. Boilerplate `STARTER-BMU/FE` meng-`.gitignore` lockfile; baris itu sudah dihapus di Fase 0 pada ketiga repo. Tanpa lockfile, `npm ci` mustahil dan build jadi non-deterministik.

## Menjalankan

```bash
npm run dev              # http://localhost:3001
npm run build            # build produksi
npm start                # menjalankan hasil build di port 3001
npm run lint
npm run typecheck        # tsc --noEmit
npm run format:write
npm run sync:contracts   # jalankan tiap kali ada perubahan di ubsc-api/shared
```

`next.config.ts` mem-proxy `/api/*` dan `/uploads/*` ke `API_BASE_URL` lewat `rewrites()`, sehingga browser selalu bicara same-origin dan cookie httpOnly bekerja tanpa CORS. **Di produksi kedua path itu diterminasi di nginx, bukan diteruskan Next** — `rewrites()` adalah jalur dev.

Saat boot di mode dev, aplikasi membandingkan hash salinan kontraknya dengan `GET /api/meta/contract-hash` dan menulis `console.warn` bila berbeda. Peringatan itu artinya: jalankan `npm run sync:contracts`.

## Struktur folder

```
ubsc-admin/
├── public/
└── src/
    ├── app/
    │   ├── login/               # halaman login staff
    │   ├── unauthorized/        # tujuan AuthGuard — boilerplate mendorong ke sini tanpa pernah membuatnya
    │   └── (protected)/
    │       └── layout.tsx       # chrome: Sidebar + Topbar + AuthGuard, tidak re-mount saat navigasi
    ├── features/<domain>/       # kode halaman yang sebenarnya
    ├── components/              # ui/, layout/ (Sidebar, Topbar), table/
    ├── context/                 # AuthContext
    ├── hooks/                   # hooks/api/ untuk TanStack Query
    ├── services/                # satu berkas per domain; path endpoint API tinggal di sini, bukan di komponen
    ├── lib/                     # axios.ts, cn.ts
    ├── config/                  # routes.ts, permissions.ts
    ├── types/
    │   └── contracts/           # AUTO-GENERATED dari ubsc-api/shared — JANGAN EDIT
    ├── styles/                  # admin-motion.css (animasi inti yang tadinya disuntik runtime di 22 berkas)
    └── utils/
```

## Aturan khusus admin

- **Chrome di `app/(protected)/layout.tsx`, bukan `<PageContainer title>` per halaman.** Menyimpang dari boilerplate dan itu disengaja: `Topbar` menurunkan judulnya sendiri, dan layout yang tidak re-mount menjaga posisi scroll serta state collapse sidebar saat berpindah halaman.
- **`Sidebar` dan `Topbar` di-port apa adanya, jangan dibangun ulang di atas `sidebar.tsx` shadcn.** shadcn memaksakan lebar berbasis CSS variable, sibling `SidebarInset`, mobile berbasis `Sheet`, dan semantik `group-data-[collapsible=icon]`. Sidebar UBSC punya collapse ter-persist di localStorage, children bersarang, pill terracotta dengan shimmer, dan keyframes masuknya sendiri.
- **Perilaku badge "Locked" dipertahankan.** Boilerplate menyembunyikan menu yang tidak bisa diakses; UBSC menampilkannya abu-abu dengan pill "Locked" dan tooltip "Akses belum diberikan oleh Administrator". Itu pilihan UX, bukan kelalaian.
- **`getRequiredPermissionsForPath` mengembalikan `anyOf`**, bukan satu permission seperti boilerplate — banyak route admin menerima beberapa permission alternatif. Role Administrator mem-bypass semuanya.
- **Jangan CSS Modules.** Nama class direferensikan sebagai string polos lintas komponen dan di dalam `cn()`.
- **Tidak ada Lenis di admin**, jadi `data-lenis-prevent` yang ada di aplikasi Laravel dihapus.
- Halaman berat dipecah **mekanis dan berurutan** (fungsi murni dulu, lalu blok style, lalu data fetching, JSX terakhir), target 400–600 baris per berkas, dan **tanpa pernah menambah atau menghapus elemen DOM**. Konstanta load-bearing seperti `SLOT_HEIGHT = 58` tetap konstanta ter-export, jangan "dirapikan" menjadi config.

## Resep menambah fitur

Sama untuk ketiga repo, ikuti persis dan berurutan. Langkah 4 ada karena ini tiga repo terpisah.

1. **Permission** — di `ubsc-api`: `shared/permissions.ts`, `src/config/permissions.ts`, `prisma/seed.ts`.
2. **Domain** — di `ubsc-api`: model Prisma, route di `routes/details/`, controller, service; tambahkan DTO-nya di `shared/contracts.ts`.
3. **Daftarkan route** di `private-api.ts` (atau `customer-api.ts` / `public-api.ts` sesuai audience-nya).
4. **Di repo ini: `npm run sync:contracts` lebih dulu.** Jangan menulis satu baris pun yang memakai DTO atau permission baru sebelum langkah ini jalan.
5. **Halaman** — tambah prefix di `src/config/permissions.ts` (`PROTECTED_ROUTE_PREFIXES` + `getRequiredPermissionsForPath`), buat halaman di `app/(protected)/` dengan isinya di `features/`, lalu tambahkan menu di `Sidebar.tsx`.

## Dokumen terkait

- `ubsc-api/docs/fase-0.md` — deliverable Fase 0 dan gate penerimaannya.
- `ubsc-api/docs/media.md` — kebijakan aset berat.
- `Rewrite.md` di repo Laravel lama — dokumen rencana lengkap, termasuk matriks permission 5 role.
