'use client'

import {
  createPromo,
  createReel,
  createSponsor,
  createTestimonial,
  deletePromo,
  deleteReel,
  deleteReview,
  deleteSponsor,
  deleteTestimonial,
  getPromoIndex,
  getReelIndex,
  getSponsorIndex,
  getTestimonialIndex,
  reorderPromo,
  reorderSponsors,
  reorderTestimonials,
  toggleReviewApproval,
  updatePromo,
  updateReel,
  updateSponsor,
  updateTestimonial
} from '@/services/Cms'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// ===== Hooks data admin Promo / Sponsor / Reel / Testimoni + Review (Fase 8F) =====

const PROMO = ['admin', 'promo'] as const
const SPONSORS = ['admin', 'sponsors'] as const
const REELS = ['admin', 'reels'] as const
const TESTIMONIALS = ['admin', 'testimonials'] as const

type IdForm = { id: string; formData: FormData }

// ---- Promo ----
export function usePromoIndex() {
  return useQuery({ queryKey: PROMO, queryFn: getPromoIndex })
}

export function useCreatePromo() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (formData: FormData) => createPromo(formData), onSuccess: () => qc.invalidateQueries({ queryKey: PROMO }) })
}

export function useUpdatePromo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, formData }: IdForm) => updatePromo(id, formData),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROMO })
  })
}

export function useReorderPromo() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (ids: string[]) => reorderPromo({ ids }), onSuccess: () => qc.invalidateQueries({ queryKey: PROMO }) })
}

export function useDeletePromo() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: string) => deletePromo(id), onSuccess: () => qc.invalidateQueries({ queryKey: PROMO }) })
}

// ---- Sponsor ----
export function useSponsorIndex() {
  return useQuery({ queryKey: SPONSORS, queryFn: getSponsorIndex })
}

export function useCreateSponsor() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (formData: FormData) => createSponsor(formData), onSuccess: () => qc.invalidateQueries({ queryKey: SPONSORS }) })
}

export function useUpdateSponsor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, formData }: IdForm) => updateSponsor(id, formData),
    onSuccess: () => qc.invalidateQueries({ queryKey: SPONSORS })
  })
}

export function useReorderSponsors() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (ids: string[]) => reorderSponsors({ ids }), onSuccess: () => qc.invalidateQueries({ queryKey: SPONSORS }) })
}

export function useDeleteSponsor() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: string) => deleteSponsor(id), onSuccess: () => qc.invalidateQueries({ queryKey: SPONSORS }) })
}

// ---- Reel ----
export function useReelIndex() {
  return useQuery({ queryKey: REELS, queryFn: getReelIndex })
}

export function useCreateReel() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (formData: FormData) => createReel(formData), onSuccess: () => qc.invalidateQueries({ queryKey: REELS }) })
}

export function useUpdateReel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, formData }: IdForm) => updateReel(id, formData),
    onSuccess: () => qc.invalidateQueries({ queryKey: REELS })
  })
}

export function useDeleteReel() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: string) => deleteReel(id), onSuccess: () => qc.invalidateQueries({ queryKey: REELS }) })
}

// ---- Testimoni ----
export function useTestimonialIndex() {
  return useQuery({ queryKey: TESTIMONIALS, queryFn: getTestimonialIndex })
}

export function useCreateTestimonial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (formData: FormData) => createTestimonial(formData),
    onSuccess: () => qc.invalidateQueries({ queryKey: TESTIMONIALS })
  })
}

export function useUpdateTestimonial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, formData }: IdForm) => updateTestimonial(id, formData),
    onSuccess: () => qc.invalidateQueries({ queryKey: TESTIMONIALS })
  })
}

export function useReorderTestimonials() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => reorderTestimonials({ ids }),
    onSuccess: () => qc.invalidateQueries({ queryKey: TESTIMONIALS })
  })
}

export function useDeleteTestimonial() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: string) => deleteTestimonial(id), onSuccess: () => qc.invalidateQueries({ queryKey: TESTIMONIALS }) })
}

// ---- Review ----
export function useToggleReviewApproval() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: string) => toggleReviewApproval(id), onSuccess: () => qc.invalidateQueries({ queryKey: TESTIMONIALS }) })
}

export function useDeleteReview() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: string) => deleteReview(id), onSuccess: () => qc.invalidateQueries({ queryKey: TESTIMONIALS }) })
}
