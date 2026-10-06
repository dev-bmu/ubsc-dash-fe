import type { NewsSection } from '@/types/contracts/contracts'

// ===== Origin situs publik (ubsc-landing) =====
// Untuk pratinjau SEO dan tautan "Lihat di situs". URL ini EKSTERNAL (origin lain dari panel admin), jadi
// dirender lewat <a target="_blank" rel="noopener noreferrer">, bukan <Link>: typedRoutes dan builder
// src/config/routes.ts tidak berlaku. NEXT_PUBLIC_* di-inline saat build — set di .env.local / env build.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://ubsportcenter.co.id').replace(/\/+$/, '')

/** URL publik artikel: /berita/<slug> atau /artikel/<slug> (lihat NewsDto.section). */
export const articleUrl = (section: NewsSection, slug: string) => `${SITE_URL}/${section}/${slug}`
