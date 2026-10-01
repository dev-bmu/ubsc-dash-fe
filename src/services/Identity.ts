import axiosInstance from '@/lib/axios'
import type {
  AdminIdentityIndexDto,
  AdminMemberPhotoIndexDto,
  IdentityUserDto,
  IdentityVerifyPayload,
  MemberPhotoDecisionPayload,
  MemberPhotoReviewDto
} from '@/types/contracts/contracts'

// ===== Service admin Antrean Identitas (Fase 8E) =====
// Semua lewat axiosInstance (baseURL '/api', Bearer). Envelope { success, data } di-unwrap.

type Envelope<T> = { success: true; data: T }

export const getIdentityIndex = async (): Promise<AdminIdentityIndexDto> => {
  const res = await axiosInstance.get<Envelope<AdminIdentityIndexDto>>('/admin/identity')
  return res.data.data
}

export const verifyIdentity = async (id: string, payload: IdentityVerifyPayload): Promise<IdentityUserDto> => {
  const res = await axiosInstance.patch<Envelope<IdentityUserDto>>(`/admin/identity/${id}/verify`, payload)
  return res.data.data
}

// ---- Foto member (tahap B) — foto publik, jadi dipasang langsung ke <img src>, tanpa blob ----
export const getMemberPhotoIndex = async (): Promise<AdminMemberPhotoIndexDto> => {
  const res = await axiosInstance.get<Envelope<AdminMemberPhotoIndexDto>>('/admin/identity/member-photos')
  return res.data.data
}

export const decideMemberPhoto = async (id: string, payload: MemberPhotoDecisionPayload): Promise<MemberPhotoReviewDto> => {
  const res = await axiosInstance.patch<Envelope<MemberPhotoReviewDto>>(`/admin/identity/${id}/member-photo`, payload)
  return res.data.data
}

/**
 * Dokumen identitas bersifat privat dan butuh Bearer, jadi tidak bisa dipasang langsung ke
 * `<img src>` seperti di Laravel (cookie sesi). Ambil sebagai blob; pemanggil membuat object URL-nya
 * lalu WAJIB me-revoke saat komponen dilepas.
 */
export const getIdentityDocumentBlob = async (documentUrl: string): Promise<Blob> => {
  const res = await axiosInstance.get<Blob>(documentUrl, { responseType: 'blob' })
  return res.data
}
