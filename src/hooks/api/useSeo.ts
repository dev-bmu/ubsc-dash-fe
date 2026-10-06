'use client'

import { getSeoPages, updateSeoPage } from '@/services/Seo'
import type { SeoPageKey } from '@/types/contracts/seo'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// ===== Hooks SEO halaman statis landing =====

const SEO_PAGES = ['admin', 'seo-pages'] as const

export function useSeoPages() {
  return useQuery({ queryKey: SEO_PAGES, queryFn: getSeoPages })
}

export function useUpdateSeoPage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ key, formData }: { key: SeoPageKey; formData: FormData }) => updateSeoPage(key, formData),
    onSuccess: () => qc.invalidateQueries({ queryKey: SEO_PAGES })
  })
}
