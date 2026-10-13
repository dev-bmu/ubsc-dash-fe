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
  getRescheduleOptions,
  rescheduleBooking,
  restoreClassSession,
  updateBookingStatus,
  type CancelSessionPayload,
  type CreateBookingPayload,
  type ReschedulePayload,
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

// ---- Pindah jadwal ----
// Di bawah BOOKINGS, jadi ikut segar setiap kali mutasi booking menginvalidasi daftar.
export function useRescheduleOptions(id: string, date: string, facilityUnitId: string, enabled: boolean) {
  return useQuery({
    queryKey: [...BOOKINGS, 'reschedule-options', id, date, facilityUnitId],
    queryFn: () => getRescheduleOptions(id, date, facilityUnitId),
    enabled: enabled && Boolean(date)
  })
}

// Booking pindah hari/jam/unit: daftar reservasi, roster kelas, dan daftar check-in ikut berubah.
export function useRescheduleBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: ReschedulePayload & { id: string }) => rescheduleBooking(id, payload),
    onSuccess: () => {
      for (const queryKey of [BOOKINGS, CLASSES, CHECKIN]) qc.invalidateQueries({ queryKey })
    }
  })
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
