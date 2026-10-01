'use client'

import { getGymDesk, getGymVisitReport, recordGymVisit } from '@/services/Gym'
import type { GymCheckInPayload } from '@/types/contracts/contracts'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// ===== Hooks admin Gym (tahap D) =====
// Mencatat kunjungan mengubah log meja, analitik, dan angka "kunjungan hari ini" di dashboard.

const GYM = ['admin', 'gym'] as const

/** Log hari ini di samping meja; disegarkan berkala karena FO lain bisa mencatat dari komputer lain. */
export function useGymDesk() {
  return useQuery({ queryKey: [...GYM, 'desk'], queryFn: getGymDesk, refetchInterval: 30_000 })
}

export function useGymVisitReport(from: string, to: string) {
  return useQuery({ queryKey: [...GYM, 'visits', from, to], queryFn: () => getGymVisitReport(from, to), placeholderData: keepPreviousData })
}

export function useRecordGymVisit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: GymCheckInPayload) => recordGymVisit(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GYM })
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    }
  })
}
