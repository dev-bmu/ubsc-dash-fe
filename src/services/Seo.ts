import axiosInstance from '@/lib/axios'
import type { AdminPageSeoDto } from '@/types/contracts/contracts'
import type { SeoPageKey } from '@/types/contracts/seo'

// ===== Service SEO halaman statis landing (PRD tambahan §7.7) =====
// PUT MULTIPART (berkas `ogImage` opsional) — pemanggil merakit FormData, sama seperti News.

type Envelope<T> = { success: true; data: T }

/** Seluruh SEO_PAGES (urutan shared/seo.ts) digabung dengan isian tersimpan. */
export const getSeoPages = async (): Promise<AdminPageSeoDto[]> => {
  const res = await axiosInstance.get<Envelope<AdminPageSeoDto[]>>('/admin/seo-pages')
  return res.data.data
}

export const updateSeoPage = async (key: SeoPageKey, formData: FormData): Promise<AdminPageSeoDto> => {
  const res = await axiosInstance.put<Envelope<AdminPageSeoDto>>(`/admin/seo-pages/${key}`, formData)
  return res.data.data
}
