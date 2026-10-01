'use client'

import {
  cancelMembership,
  captureMemberPhoto,
  createCustomerAccount,
  createMembership,
  createMembershipPlan,
  deleteMembershipPlan,
  getMembershipPlans,
  getMembershipsIndex,
  markMembershipPaid,
  renewMembership,
  searchCustomers,
  updateMembershipPlan,
  updateMembershipStatus,
  type CreateMembershipPayload,
  type MembershipPlanPayload,
  type RenewMembershipPayload
} from '@/services/Memberships'
import type { CustomerCreatePayload, MembershipStatus } from '@/types/contracts/contracts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// ===== Hooks data admin Membership + Paket (Fase 8C) =====
// Mutasi paket juga meng-invalidate MEMBERSHIPS (opsi paket di form create/renew ikut berubah).

const MEMBERSHIPS = ['admin', 'memberships'] as const
const PLANS = ['admin', 'membership-plans'] as const

// ---- Memberships ----
export function useMembershipsIndex() {
  return useQuery({ queryKey: MEMBERSHIPS, queryFn: getMembershipsIndex })
}

export function useCreateMembership() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateMembershipPayload) => createMembership(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: MEMBERSHIPS })
  })
}

export function useRenewMembership() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RenewMembershipPayload }) => renewMembership(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: MEMBERSHIPS })
  })
}

export function useUpdateMembershipStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: MembershipStatus }) => updateMembershipStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: MEMBERSHIPS })
  })
}

/** Tandai Lunas ikut mengubah antrean Verifikasi Pembayaran dan laporan keuangan. */
export function useMarkMembershipPaid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => markMembershipPaid(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MEMBERSHIPS })
      qc.invalidateQueries({ queryKey: ['admin', 'payments'] })
      qc.invalidateQueries({ queryKey: ['admin', 'finance'] })
    }
  })
}

export function useCreateCustomerAccount() {
  return useMutation({ mutationFn: (payload: CustomerCreatePayload) => createCustomerAccount(payload) })
}

/** Foto dari meja ikut mengubah antrean foto di halaman verifikasi identitas. */
export function useCaptureMemberPhoto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, file }: { userId: string; file: File }) => captureMemberPhoto(userId, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MEMBERSHIPS })
      qc.invalidateQueries({ queryKey: ['admin', 'identity'] })
    }
  })
}

export function useCancelMembership() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: string) => cancelMembership(id), onSuccess: () => qc.invalidateQueries({ queryKey: MEMBERSHIPS }) })
}

/** Typeahead customer. Hanya jalan bila q >= 2 karakter (sama seperti CustomerPicker Laravel). */
export function useCustomerSearch(q: string) {
  const term = q.trim()
  return useQuery({ queryKey: ['admin', 'customers', 'search', term], queryFn: () => searchCustomers(term), enabled: term.length >= 2 })
}

// ---- Paket ----
export function useMembershipPlans() {
  return useQuery({ queryKey: PLANS, queryFn: getMembershipPlans })
}

export function useCreatePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: MembershipPlanPayload) => createMembershipPlan(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PLANS })
      qc.invalidateQueries({ queryKey: MEMBERSHIPS })
    }
  })
}

export function useUpdatePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: MembershipPlanPayload }) => updateMembershipPlan(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PLANS })
      qc.invalidateQueries({ queryKey: MEMBERSHIPS })
    }
  })
}

export function useDeletePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteMembershipPlan(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PLANS })
      qc.invalidateQueries({ queryKey: MEMBERSHIPS })
    }
  })
}
