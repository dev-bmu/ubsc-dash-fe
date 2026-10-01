import axiosInstance from '@/lib/axios'
import type {
  AdminFacilityFormDto,
  AdminFacilityIndexDto,
  AdminFacilityPricingDto,
  AdminFacilityUnitsDto,
  FacilityPriceRowDto
} from '@/types/contracts/contracts'

// ===== Service admin Facilities (Fase 8A) =====
// Semua lewat axiosInstance (baseURL '/api', Bearer disisipkan interceptor). Endpoint membungkus
// payload sukses dalam envelope { success, data }; di-unwrap ke .data.data. Panggil dari komponen
// client di balik AuthGuard.

type Envelope<T> = { success: true; data: T }

// ---- Facilities ----
export const getFacilitiesIndex = async (): Promise<AdminFacilityIndexDto> => {
  const res = await axiosInstance.get<Envelope<AdminFacilityIndexDto>>('/admin/facilities')
  return res.data.data
}

/** Form create (tanpa id) atau edit (dengan id). */
export const getFacilityForm = async (id?: string): Promise<AdminFacilityFormDto> => {
  const url = id ? `/admin/facilities/${id}/edit` : '/admin/facilities/create'
  const res = await axiosInstance.get<Envelope<AdminFacilityFormDto>>(url)
  return res.data.data
}

/** Create facility (multipart: field teks camelCase + file hero/gallery). */
export const createFacility = async (formData: FormData): Promise<void> => {
  await axiosInstance.post('/admin/facilities', formData)
}

/** Update facility (multipart PUT). */
export const updateFacility = async (id: string, formData: FormData): Promise<void> => {
  await axiosInstance.put(`/admin/facilities/${id}`, formData)
}

export const deleteFacility = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/admin/facilities/${id}`)
}

export const reorderFacilities = async (ids: string[]): Promise<void> => {
  await axiosInstance.post('/admin/facilities/reorder', { ids })
}

export const deleteFacilityGalleryImage = async (mediaId: string): Promise<void> => {
  await axiosInstance.delete(`/admin/facilities/gallery/${mediaId}`)
}

// ---- Pricing ----
export const getFacilityPricing = async (id: string): Promise<AdminFacilityPricingDto> => {
  const res = await axiosInstance.get<Envelope<AdminFacilityPricingDto>>(`/admin/facilities/${id}/pricing`)
  return res.data.data
}

export const syncFacilityPricing = async (id: string, prices: FacilityPriceRowDto[]): Promise<void> => {
  await axiosInstance.post(`/admin/facilities/${id}/pricing/sync`, { prices })
}

// ---- Units ----
export const getFacilityUnits = async (id: string): Promise<AdminFacilityUnitsDto> => {
  const res = await axiosInstance.get<Envelope<AdminFacilityUnitsDto>>(`/admin/facilities/${id}/units`)
  return res.data.data
}

/** Create unit (multipart: field teks + file unit_image). */
export const createFacilityUnit = async (facilityId: string, formData: FormData): Promise<void> => {
  await axiosInstance.post(`/admin/facilities/${facilityId}/units`, formData)
}

/** Update unit (multipart PUT). */
export const updateFacilityUnit = async (unitId: string, formData: FormData): Promise<void> => {
  await axiosInstance.put(`/admin/facility-units/${unitId}`, formData)
}

export const deleteFacilityUnit = async (unitId: string): Promise<void> => {
  await axiosInstance.delete(`/admin/facility-units/${unitId}`)
}

// ---- Categories ----
export interface CategoryPayload {
  name: string
  description: string | null
  sortOrder: number
}

export const createFacilityCategory = async (payload: CategoryPayload): Promise<void> => {
  await axiosInstance.post('/admin/facility-categories', payload)
}

export const updateFacilityCategory = async (id: string, payload: CategoryPayload): Promise<void> => {
  await axiosInstance.put(`/admin/facility-categories/${id}`, payload)
}

export const deleteFacilityCategory = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/admin/facility-categories/${id}`)
}

export const reorderFacilityCategories = async (ids: string[]): Promise<void> => {
  await axiosInstance.post('/admin/facility-categories/reorder', { ids })
}
