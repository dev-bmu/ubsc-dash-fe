'use client'

import {
  approvePayment,
  getFinanceReport,
  getPaymentsIndex,
  type PaymentsQuery,
  rejectPayment,
  removeQrisImage,
  updatePaymentSettings,
  uploadQrisImage
} from '@/services/Payments'
import type { PaymentSettingsPayload } from '@/types/contracts/contracts'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// ===== Hooks data admin Verifikasi Pembayaran + Laporan Keuangan (Fase 8D) =====
// Keputusan pembayaran mengubah transaksi/booking/membership → invalidate antrean, finance, booking,
// membership, dan dashboard sekaligus.

const PAYMENTS = ['admin', 'payments'] as const
const FINANCE = ['admin', 'finance'] as const

export function usePaymentsIndex(query: PaymentsQuery) {
  return useQuery({ queryKey: [...PAYMENTS, query], queryFn: () => getPaymentsIndex(query), placeholderData: keepPreviousData })
}

function useInvalidateAfterDecision() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: PAYMENTS })
    qc.invalidateQueries({ queryKey: FINANCE })
    qc.invalidateQueries({ queryKey: ['admin', 'bookings'] })
    qc.invalidateQueries({ queryKey: ['admin', 'memberships'] })
    qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
  }
}

export function useApprovePayment() {
  const invalidate = useInvalidateAfterDecision()
  return useMutation({ mutationFn: (id: string) => approvePayment(id), onSuccess: invalidate })
}

export function useRejectPayment() {
  const invalidate = useInvalidateAfterDecision()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectPayment(id, reason),
    onSuccess: invalidate
  })
}

export function useUpdatePaymentSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: PaymentSettingsPayload) => updatePaymentSettings(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: PAYMENTS })
  })
}

export function useUploadQris() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (file: File) => uploadQrisImage(file), onSuccess: () => qc.invalidateQueries({ queryKey: PAYMENTS }) })
}

export function useRemoveQris() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: () => removeQrisImage(), onSuccess: () => qc.invalidateQueries({ queryKey: PAYMENTS }) })
}

export function useFinanceReport(month: number, year: number) {
  return useQuery({ queryKey: [...FINANCE, year, month], queryFn: () => getFinanceReport(month, year), placeholderData: keepPreviousData })
}
