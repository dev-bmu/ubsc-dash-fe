'use client'

import { approvePayment, getFinanceReport, getPaymentsIndex, rejectPayment, updatePaymentSettings } from '@/services/Payments'
import type { PaymentQueueTab, PaymentSettingsPayload } from '@/types/contracts/contracts'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// ===== Hooks data admin Verifikasi Pembayaran + Laporan Keuangan (Fase 8D) =====
// Keputusan pembayaran mengubah transaksi/booking/membership → invalidate antrean, finance, booking,
// membership, dan dashboard sekaligus.

const PAYMENTS = ['admin', 'payments'] as const
const FINANCE = ['admin', 'finance'] as const

export function usePaymentsIndex(tab: PaymentQueueTab) {
  return useQuery({ queryKey: [...PAYMENTS, tab], queryFn: () => getPaymentsIndex(tab), placeholderData: keepPreviousData })
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

export function useFinanceReport(month: number, year: number) {
  return useQuery({ queryKey: [...FINANCE, year, month], queryFn: () => getFinanceReport(month, year), placeholderData: keepPreviousData })
}
