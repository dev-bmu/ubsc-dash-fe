'use client'

import {
  cancelBooking,
  cancelClassSession,
  checkIn,
  createBooking,
  getBookingsIndex,
  getCheckIn,
  getCheckInIndex,
  getClassRoster,
  restoreClassSession,
  updateBookingStatus,
  type CancelSessionPayload,
  type CreateBookingPayload,
  type RestoreSessionPayload,
  type RosterParams
} from '@/services/Bookings'
import type { BookingStatus } from '@/types/contracts/contracts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const BOOKINGS = ['admin', 'bookings'] as const
const CHECKIN = ['admin', 'checkin'] as const
const CLASSES = ['admin', 'classes'] as const

// ---- Bookings ----
// Auto-refetch 45 detik (Laravel Bookings/Index reload prop tiap 45s saat tab terlihat).
export function useBookingsIndex() {
  return useQuery({ queryKey: BOOKINGS, queryFn: getBookingsIndex, refetchInterval: 45_000 })
}

export function useCreateBooking() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (payload: CreateBookingPayload) => createBooking(payload), onSuccess: () => qc.invalidateQueries({ queryKey: BOOKINGS }) })
}

export function useUpdateBookingStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: BookingStatus }) => updateBookingStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: BOOKINGS })
  })
}

export function useCancelBooking() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: string) => cancelBooking(id), onSuccess: () => qc.invalidateQueries({ queryKey: BOOKINGS }) })
}

// ---- Check-in ----
export function useCheckInIndex(q: string) {
  return useQuery({ queryKey: [...CHECKIN, 'list', q], queryFn: () => getCheckInIndex(q) })
}

export function useCheckIn(token: string) {
  return useQuery({ queryKey: [...CHECKIN, 'detail', token], queryFn: () => getCheckIn(token) })
}

export function useCheckInMutation(token: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => checkIn(token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...CHECKIN, 'detail', token] })
      qc.invalidateQueries({ queryKey: [...CHECKIN, 'list'] })
    }
  })
}

// ---- Class roster ----
export function useClassRoster(params: RosterParams) {
  return useQuery({ queryKey: [...CLASSES, params], queryFn: () => getClassRoster(params) })
}

export function useCancelSession() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (payload: CancelSessionPayload) => cancelClassSession(payload), onSuccess: () => qc.invalidateQueries({ queryKey: CLASSES }) })
}

export function useRestoreSession() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (payload: RestoreSessionPayload) => restoreClassSession(payload), onSuccess: () => qc.invalidateQueries({ queryKey: CLASSES }) })
}
