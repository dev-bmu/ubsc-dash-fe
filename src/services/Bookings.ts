import axiosInstance from '@/lib/axios'
import type {
  AdminBookingCreatedDto,
  AdminBookingIndexDto,
  BookingStatus,
  CheckInDetailDto,
  CheckInIndexDto,
  ClassRosterDto
} from '@/types/contracts/contracts'

// ===== Service admin Booking / Check-in / Class roster (Fase 8B) =====
// Semua lewat axiosInstance (baseURL '/api', Bearer). Envelope { success, data } di-unwrap.

type Envelope<T> = { success: true; data: T }

// ---- Bookings ----
export const getBookingsIndex = async (): Promise<AdminBookingIndexDto> => {
  const res = await axiosInstance.get<Envelope<AdminBookingIndexDto>>('/admin/bookings')
  return res.data.data
}

export interface CreateBookingPayload {
  customerName: string
  facilityId: string
  facilityUnitId: string | null
  bookingDate: string
  startTime: string
  endTime: string
  pax: number
  isFree: boolean
  notes: string
}

export const createBooking = async (payload: CreateBookingPayload): Promise<AdminBookingCreatedDto> => {
  const res = await axiosInstance.post<Envelope<AdminBookingCreatedDto>>('/admin/bookings', payload)
  return res.data.data
}

export const updateBookingStatus = async (id: string, status: BookingStatus): Promise<void> => {
  await axiosInstance.patch(`/admin/bookings/${id}`, { status })
}

export const cancelBooking = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/admin/bookings/${id}`)
}

// ---- Check-in ----
export const getCheckInIndex = async (q: string): Promise<CheckInIndexDto> => {
  const res = await axiosInstance.get<Envelope<CheckInIndexDto>>('/admin/checkin', { params: q ? { q } : {} })
  return res.data.data
}

export const getCheckIn = async (token: string): Promise<CheckInDetailDto> => {
  const res = await axiosInstance.get<Envelope<CheckInDetailDto>>(`/admin/checkin/${token}`)
  return res.data.data
}

export const checkIn = async (token: string): Promise<void> => {
  await axiosInstance.post(`/admin/checkin/${token}`, {})
}

// ---- Class roster ----
export interface RosterParams {
  facilityId?: string
  facilityUnitId?: string
  month?: string
  date?: string
}

export const getClassRoster = async (params: RosterParams): Promise<ClassRosterDto> => {
  const res = await axiosInstance.get<Envelope<ClassRosterDto>>('/admin/classes', { params })
  return res.data.data
}

export interface CancelSessionPayload {
  facilityId: string
  facilityUnitId: string
  sessionDate: string
  startTime: string
  reason: string | null
}

export const cancelClassSession = async (payload: CancelSessionPayload): Promise<void> => {
  await axiosInstance.post('/admin/classes/cancel-session', payload)
}

export interface RestoreSessionPayload {
  facilityUnitId: string
  sessionDate: string
  startTime: string
}

export const restoreClassSession = async (payload: RestoreSessionPayload): Promise<void> => {
  await axiosInstance.post('/admin/classes/restore-session', payload)
}
