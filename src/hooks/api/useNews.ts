'use client'

import {
  createInfoBanner,
  createNews,
  createNewsCategory,
  deleteInfoBanner,
  deleteNews,
  deleteNewsCategory,
  getNewsCreateForm,
  getNewsEditForm,
  getNewsIndex,
  reorderInfoBanners,
  updateGymTraffic,
  updateInfoBanner,
  updateNews,
  updateNewsCategory
} from '@/services/News'
import type { InfoBannerPayload, NewsCategoryPayload } from '@/types/contracts/contracts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// ===== Hooks data admin News + Kategori + Info Banner + Gym Traffic (Fase 8F) =====
// Info banner & gym traffic juga dirender di Dashboard → mutasinya ikut meng-invalidate dashboard.

const NEWS = ['admin', 'news'] as const
const DASHBOARD = ['admin', 'dashboard'] as const

// ---- News ----
export function useNewsIndex() {
  return useQuery({ queryKey: NEWS, queryFn: getNewsIndex })
}

/**
 * `enabled` ada karena SATU komponen melayani /news/create dan /news/[id]/edit: tanpa itu, mode edit
 * ikut memanggil GET /admin/news/create yang hasilnya dibuang.
 */
export function useNewsCreateForm(enabled = true) {
  return useQuery({ queryKey: [...NEWS, 'create'], queryFn: getNewsCreateForm, enabled })
}

export function useNewsEditForm(id: string) {
  return useQuery({ queryKey: [...NEWS, 'edit', id], queryFn: () => getNewsEditForm(id), enabled: id !== '' })
}

export function useCreateNews() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (formData: FormData) => createNews(formData), onSuccess: () => qc.invalidateQueries({ queryKey: NEWS }) })
}

export function useUpdateNews() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) => updateNews(id, formData),
    onSuccess: () => qc.invalidateQueries({ queryKey: NEWS })
  })
}

export function useDeleteNews() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: string) => deleteNews(id), onSuccess: () => qc.invalidateQueries({ queryKey: NEWS }) })
}

// ---- Kategori ----
export function useCreateNewsCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: NewsCategoryPayload) => createNewsCategory(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: NEWS })
  })
}

export function useUpdateNewsCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: NewsCategoryPayload }) => updateNewsCategory(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: NEWS })
  })
}

export function useDeleteNewsCategory() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: string) => deleteNewsCategory(id), onSuccess: () => qc.invalidateQueries({ queryKey: NEWS }) })
}

// ---- Info banner ----
function useBannerInvalidate() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: NEWS })
    qc.invalidateQueries({ queryKey: DASHBOARD })
  }
}

export function useCreateInfoBanner() {
  const invalidate = useBannerInvalidate()
  return useMutation({ mutationFn: (payload: InfoBannerPayload) => createInfoBanner(payload), onSuccess: invalidate })
}

export function useUpdateInfoBanner() {
  const invalidate = useBannerInvalidate()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: InfoBannerPayload }) => updateInfoBanner(id, payload),
    onSuccess: invalidate
  })
}

export function useReorderInfoBanners() {
  const invalidate = useBannerInvalidate()
  return useMutation({ mutationFn: (ids: string[]) => reorderInfoBanners({ ids }), onSuccess: invalidate })
}

export function useDeleteInfoBanner() {
  const invalidate = useBannerInvalidate()
  return useMutation({ mutationFn: (id: string) => deleteInfoBanner(id), onSuccess: invalidate })
}

// ---- Gym traffic ----
export function useUpdateGymTraffic() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (value: string) => updateGymTraffic(value), onSuccess: () => qc.invalidateQueries({ queryKey: DASHBOARD }) })
}
