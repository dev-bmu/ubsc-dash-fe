import axiosInstance from '@/lib/axios'
import type {
  AdminPromoIndexDto,
  AdminReelIndexDto,
  AdminSponsorIndexDto,
  AdminTestimonialIndexDto,
  ReorderPayload
} from '@/types/contracts/contracts'

// ===== Service admin Promo / Sponsor / Reel / Testimoni + Review (Fase 8F) =====
// Semua create/update MULTIPART (slide, logo, image, thumbnail, video) — pemanggil merakit FormData,
// sama seperti Facilities (8A). Reorder & review JSON biasa. Envelope { success, data } di-unwrap.

type Envelope<T> = { success: true; data: T }

// ---- Promo carousel ----
export const getPromoIndex = async (): Promise<AdminPromoIndexDto> => {
  const res = await axiosInstance.get<Envelope<AdminPromoIndexDto>>('/admin/promo')
  return res.data.data
}

export const createPromo = async (formData: FormData): Promise<void> => {
  await axiosInstance.post('/admin/promo', formData)
}

export const updatePromo = async (id: string, formData: FormData): Promise<void> => {
  await axiosInstance.put(`/admin/promo/${id}`, formData)
}

export const reorderPromo = async (payload: ReorderPayload): Promise<void> => {
  await axiosInstance.post('/admin/promo/reorder', payload)
}

export const deletePromo = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/admin/promo/${id}`)
}

// ---- Sponsor logo ----
export const getSponsorIndex = async (): Promise<AdminSponsorIndexDto> => {
  const res = await axiosInstance.get<Envelope<AdminSponsorIndexDto>>('/admin/sponsors')
  return res.data.data
}

export const createSponsor = async (formData: FormData): Promise<void> => {
  await axiosInstance.post('/admin/sponsors', formData)
}

export const updateSponsor = async (id: string, formData: FormData): Promise<void> => {
  await axiosInstance.put(`/admin/sponsors/${id}`, formData)
}

export const reorderSponsors = async (payload: ReorderPayload): Promise<void> => {
  await axiosInstance.post('/admin/sponsors/reorder', payload)
}

export const deleteSponsor = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/admin/sponsors/${id}`)
}

// ---- Reel ----
export const getReelIndex = async (): Promise<AdminReelIndexDto> => {
  const res = await axiosInstance.get<Envelope<AdminReelIndexDto>>('/admin/reels')
  return res.data.data
}

export const createReel = async (formData: FormData): Promise<void> => {
  await axiosInstance.post('/admin/reels', formData)
}

export const updateReel = async (id: string, formData: FormData): Promise<void> => {
  await axiosInstance.put(`/admin/reels/${id}`, formData)
}

export const deleteReel = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/admin/reels/${id}`)
}

// ---- Testimoni ----
export const getTestimonialIndex = async (): Promise<AdminTestimonialIndexDto> => {
  const res = await axiosInstance.get<Envelope<AdminTestimonialIndexDto>>('/admin/testimonials')
  return res.data.data
}

export const createTestimonial = async (formData: FormData): Promise<void> => {
  await axiosInstance.post('/admin/testimonials', formData)
}

export const updateTestimonial = async (id: string, formData: FormData): Promise<void> => {
  await axiosInstance.put(`/admin/testimonials/${id}`, formData)
}

export const reorderTestimonials = async (payload: ReorderPayload): Promise<void> => {
  await axiosInstance.post('/admin/testimonials/reorder', payload)
}

export const deleteTestimonial = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/admin/testimonials/${id}`)
}

// ---- Review customer (dirender di halaman Testimoni) ----
export const toggleReviewApproval = async (id: string): Promise<void> => {
  await axiosInstance.post(`/admin/reviews/${id}/toggle-approve`)
}

export const deleteReview = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/admin/reviews/${id}`)
}
