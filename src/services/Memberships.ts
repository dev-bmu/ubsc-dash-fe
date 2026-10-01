import axiosInstance from '@/lib/axios'
import type {
  AdminMembershipDto,
  AdminMembershipIndexDto,
  CustomerCreatePayload,
  MemberPhotoStateDto,
  AdminMembershipPlanIndexDto,
  CustomerHitDto,
  MembershipStatus
} from '@/types/contracts/contracts'

// ===== Service admin Membership + Paket (Fase 8C) =====
// Semua lewat axiosInstance (baseURL '/api', Bearer). Envelope { success, data } di-unwrap.

type Envelope<T> = { success: true; data: T }

// ---- Memberships ----
export const getMembershipsIndex = async (): Promise<AdminMembershipIndexDto> => {
  const res = await axiosInstance.get<Envelope<AdminMembershipIndexDto>>('/admin/memberships')
  return res.data.data
}

export interface CreateMembershipPayload {
  userId: string | null
  customerName: string | null
  membershipPlanId: string | null
  startDate: string
  endDate: string | null
  amount: number | null
}

export const createMembership = async (payload: CreateMembershipPayload): Promise<AdminMembershipDto> => {
  const res = await axiosInstance.post<Envelope<AdminMembershipDto>>('/admin/memberships', payload)
  return res.data.data
}

export interface RenewMembershipPayload {
  membershipPlanId: string | null
  amount: number | null
}

export const renewMembership = async (id: string, payload: RenewMembershipPayload): Promise<AdminMembershipDto> => {
  const res = await axiosInstance.post<Envelope<AdminMembershipDto>>(`/admin/memberships/${id}/renew`, payload)
  return res.data.data
}

export const updateMembershipStatus = async (id: string, status: MembershipStatus): Promise<void> => {
  await axiosInstance.patch(`/admin/memberships/${id}`, { status })
}

export const cancelMembership = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/admin/memberships/${id}`)
}

/** Typeahead akun customer (non-staff). Server mengembalikan [] bila q < 2 karakter. */
export const searchCustomers = async (q: string): Promise<CustomerHitDto[]> => {
  const res = await axiosInstance.get<Envelope<CustomerHitDto[]>>('/admin/customers/search', { params: { q } })
  return res.data.data
}

/** Akun minimal walk-in (tanpa password) — balasannya berbentuk sama dengan hasil pencarian. */
export const createCustomerAccount = async (payload: CustomerCreatePayload): Promise<CustomerHitDto> => {
  const res = await axiosInstance.post<Envelope<CustomerHitDto>>('/admin/customers', payload)
  return res.data.data
}

/** Foto member yang diambil staff di meja — langsung disetujui. */
export const captureMemberPhoto = async (userId: string, file: File): Promise<MemberPhotoStateDto> => {
  const body = new FormData()
  body.append('photo', file)
  const res = await axiosInstance.post<Envelope<MemberPhotoStateDto>>(`/admin/identity/${userId}/member-photo`, body)
  return res.data.data
}

// ---- Paket ----
export const getMembershipPlans = async (): Promise<AdminMembershipPlanIndexDto> => {
  const res = await axiosInstance.get<Envelope<AdminMembershipPlanIndexDto>>('/admin/memberships/plans')
  return res.data.data
}

export interface MembershipPlanPayload {
  name: string
  description: string | null
  publicBadge: string | null
  savingsLabel: string | null
  ctaLabel: string | null
  cardImageUrl: string | null
  price: number
  /** null = tanpa tarif Warga UB. */
  wargaPrice: number | null
  /** Nomor barang/jasa Accurate (export faktur) tarif umum; null = belum diisi. */
  accurateItemNo: string | null
  /** Nomor barang/jasa Accurate tarif Warga UB. */
  accurateItemNoWarga: string | null
  durationMonths: number
  features: string[]
  isActive: boolean
  sortOrder: number
}

export const createMembershipPlan = async (payload: MembershipPlanPayload): Promise<void> => {
  await axiosInstance.post('/admin/memberships/plans', payload)
}

export const updateMembershipPlan = async (id: string, payload: MembershipPlanPayload): Promise<void> => {
  await axiosInstance.patch(`/admin/memberships/plans/${id}`, payload)
}

export const deleteMembershipPlan = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/admin/memberships/plans/${id}`)
}

/** "Tandai Lunas": transfer membership meja depan sudah masuk mutasi — membership aktif. */
export const markMembershipPaid = async (id: string): Promise<AdminMembershipDto> => {
  const res = await axiosInstance.post<Envelope<AdminMembershipDto>>(`/admin/memberships/${id}/lunas`)
  return res.data.data
}
