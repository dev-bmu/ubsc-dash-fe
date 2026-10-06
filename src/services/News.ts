import axiosInstance from '@/lib/axios'
import type {
  AdminNewsFormDto,
  AdminNewsIndexDto,
  InfoBannerPayload,
  NewsCategoryPayload,
  NewsContentImageDto,
  ReorderPayload
} from '@/types/contracts/contracts'

// ===== Service admin News + Kategori + Info Banner + Gym Traffic (Fase 8F) =====
// News store/update MULTIPART (thumbnail) — pemanggil merakit FormData, sama seperti Facilities (8A).
// Sisanya JSON biasa. Envelope { success, data } di-unwrap.

type Envelope<T> = { success: true; data: T }

// ---- News ----
export const getNewsIndex = async (): Promise<AdminNewsIndexDto> => {
  const res = await axiosInstance.get<Envelope<AdminNewsIndexDto>>('/admin/news')
  return res.data.data
}

/** Form create: `article` null, hanya daftar kategori. */
export const getNewsCreateForm = async (): Promise<AdminNewsFormDto> => {
  const res = await axiosInstance.get<Envelope<AdminNewsFormDto>>('/admin/news/create')
  return res.data.data
}

export const getNewsEditForm = async (id: string): Promise<AdminNewsFormDto> => {
  const res = await axiosInstance.get<Envelope<AdminNewsFormDto>>(`/admin/news/${id}/edit`)
  return res.data.data
}

export const createNews = async (formData: FormData): Promise<void> => {
  await axiosInstance.post('/admin/news', formData)
}

export const updateNews = async (id: string, formData: FormData): Promise<void> => {
  await axiosInstance.put(`/admin/news/${id}`, formData)
}

export const deleteNews = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/admin/news/${id}`)
}

/** Gambar di dalam isi artikel (RichEditor). Server menautkannya ke artikel saat artikel disimpan. */
export const uploadNewsContentImage = async (file: File): Promise<NewsContentImageDto> => {
  const formData = new FormData()
  formData.append('image', file)
  const res = await axiosInstance.post<Envelope<NewsContentImageDto>>('/admin/news/content-images', formData)
  return res.data.data
}

// ---- Kategori berita ----
export const createNewsCategory = async (payload: NewsCategoryPayload): Promise<void> => {
  await axiosInstance.post('/admin/news-categories', payload)
}

export const updateNewsCategory = async (id: string, payload: NewsCategoryPayload): Promise<void> => {
  await axiosInstance.put(`/admin/news-categories/${id}`, payload)
}

export const deleteNewsCategory = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/admin/news-categories/${id}`)
}

// ---- Info banner (dirender di halaman News DAN Dashboard) ----
export const createInfoBanner = async (payload: InfoBannerPayload): Promise<void> => {
  await axiosInstance.post('/admin/info-banners', payload)
}

export const updateInfoBanner = async (id: string, payload: InfoBannerPayload): Promise<void> => {
  await axiosInstance.put(`/admin/info-banners/${id}`, payload)
}

export const reorderInfoBanners = async (payload: ReorderPayload): Promise<void> => {
  await axiosInstance.post('/admin/info-banners/reorder', payload)
}

export const deleteInfoBanner = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/admin/info-banners/${id}`)
}

// ---- Gym traffic (widget Dashboard) ----
export const updateGymTraffic = async (value: string): Promise<void> => {
  await axiosInstance.put('/admin/settings/gym-traffic', { value })
}
