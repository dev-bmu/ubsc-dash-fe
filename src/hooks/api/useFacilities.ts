'use client'

import {
  createFacility,
  createFacilityCategory,
  createFacilityUnit,
  deleteFacility,
  deleteFacilityCategory,
  deleteFacilityGalleryImage,
  deleteFacilityUnit,
  getFacilitiesIndex,
  getFacilityForm,
  getFacilityPricing,
  getFacilityUnits,
  reorderFacilities,
  reorderFacilityCategories,
  syncFacilityPricing,
  updateFacility,
  updateFacilityCategory,
  updateFacilityUnit,
  type CategoryPayload
} from '@/services/Facilities'
import type { FacilityPriceRowDto } from '@/types/contracts/contracts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// ===== Hooks data admin Facilities =====
// Query key root ['admin','facilities']. Mutasi meng-invalidate query terkait.

const KEY = ['admin', 'facilities'] as const

export function useFacilitiesIndex() {
  return useQuery({ queryKey: KEY, queryFn: getFacilitiesIndex })
}

export function useFacilityForm(id?: string) {
  return useQuery({ queryKey: [...KEY, 'form', id ?? 'create'], queryFn: () => getFacilityForm(id) })
}

export function useFacilityPricing(id: string) {
  return useQuery({ queryKey: [...KEY, id, 'pricing'], queryFn: () => getFacilityPricing(id) })
}

export function useFacilityUnits(id: string) {
  return useQuery({ queryKey: [...KEY, id, 'units'], queryFn: () => getFacilityUnits(id) })
}

// ---- Facility mutations ----
export function useCreateFacility() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (formData: FormData) => createFacility(formData), onSuccess: () => qc.invalidateQueries({ queryKey: KEY }) })
}

export function useUpdateFacility(id: string) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (formData: FormData) => updateFacility(id, formData), onSuccess: () => qc.invalidateQueries({ queryKey: KEY }) })
}

export function useDeleteFacility() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: string) => deleteFacility(id), onSuccess: () => qc.invalidateQueries({ queryKey: KEY }) })
}

export function useReorderFacilities() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (ids: string[]) => reorderFacilities(ids), onSuccess: () => qc.invalidateQueries({ queryKey: KEY }) })
}

export function useDeleteGalleryImage() {
  const qc = useQueryClient()
  // Invalidate KEY (mencakup query form facility) supaya galeri di form ikut refetch tanpa gambar itu.
  return useMutation({
    mutationFn: (mediaId: string) => deleteFacilityGalleryImage(mediaId),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY })
  })
}

// ---- Pricing ----
export function useSyncPricing(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (prices: FacilityPriceRowDto[]) => syncFacilityPricing(id, prices),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...KEY, id, 'pricing'] })
  })
}

// ---- Units ----
export function useCreateUnit(facilityId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (formData: FormData) => createFacilityUnit(facilityId, formData),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...KEY, facilityId, 'units'] })
  })
}

export function useUpdateUnit(facilityId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ unitId, formData }: { unitId: string; formData: FormData }) => updateFacilityUnit(unitId, formData),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...KEY, facilityId, 'units'] })
  })
}

export function useDeleteUnit(facilityId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (unitId: string) => deleteFacilityUnit(unitId),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...KEY, facilityId, 'units'] })
  })
}

// ---- Categories ----
export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CategoryPayload) => createFacilityCategory(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY })
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CategoryPayload }) => updateFacilityCategory(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY })
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: string) => deleteFacilityCategory(id), onSuccess: () => qc.invalidateQueries({ queryKey: KEY }) })
}

export function useReorderCategories() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (ids: string[]) => reorderFacilityCategories(ids), onSuccess: () => qc.invalidateQueries({ queryKey: KEY }) })
}
