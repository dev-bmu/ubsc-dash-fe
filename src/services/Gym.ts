import axiosInstance from '@/lib/axios'
import type { GymCheckInLookupDto, GymCheckInPayload, GymDeskDto, GymVisitReportDto } from '@/types/contracts/contracts'

// ===== Service admin Gym: meja check-in + analitik kunjungan (tahap D) =====
// Semua lewat axiosInstance (baseURL '/api', Bearer). Envelope { success, data } di-unwrap.

type Envelope<T> = { success: true; data: T }

export const getGymDesk = async (): Promise<GymDeskDto> => {
  const res = await axiosInstance.get<Envelope<GymDeskDto>>('/admin/gym/checkin')
  return res.data.data
}

/** Langkah pertama meja: tampilkan member + vonis, belum mencatat apa pun. */
export const lookupGymMember = async (code: string): Promise<GymCheckInLookupDto> => {
  const res = await axiosInstance.get<Envelope<GymCheckInLookupDto>>('/admin/gym/checkin/lookup', { params: { code } })
  return res.data.data
}

/** Langkah kedua: catat. Balasannya vonis terbaru (termasuk kunjungan yang baru dicatat). */
export const recordGymVisit = async (payload: GymCheckInPayload): Promise<GymCheckInLookupDto> => {
  const res = await axiosInstance.post<Envelope<GymCheckInLookupDto>>('/admin/gym/checkin', payload)
  return res.data.data
}

export const getGymVisitReport = async (from: string, to: string): Promise<GymVisitReportDto> => {
  const res = await axiosInstance.get<Envelope<GymVisitReportDto>>('/admin/gym/visits', { params: { from, to } })
  return res.data.data
}
