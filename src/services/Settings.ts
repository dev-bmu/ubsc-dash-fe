import axiosInstance from '@/lib/axios'
import type {
  AdminNotificationsDto,
  AdminRoleIndexDto,
  AdminScheduleIndexDto,
  AdminStaffUserIndexDto,
  NotificationIdsPayload,
  RolePermissionsPayload,
  ScheduleClosedDatesPayload,
  ScheduleTogglePayload,
  StaffAccountDeletePayload,
  StaffPasswordPayload,
  StaffProfileDto,
  StaffUserPayload
} from '@/types/contracts/contracts'

// ===== Service admin Settings: Roles / Schedules / Users / Notifikasi / Profil (Fase 8G) =====
// Profil memakai MULTIPART bila avatar ikut — pemanggil merakit FormData, sama seperti Facilities (8A).

type Envelope<T> = { success: true; data: T }

// ---- Roles (RBAC) ----
export const getRoles = async (): Promise<AdminRoleIndexDto> => {
  const res = await axiosInstance.get<Envelope<AdminRoleIndexDto>>('/admin/settings/roles')
  return res.data.data
}

/** Kunci role adalah NAMA-nya (RolePermission.roleName), bukan uuid. */
export const updateRolePermissions = async (name: string, payload: RolePermissionsPayload): Promise<void> => {
  await axiosInstance.put(`/admin/settings/roles/${encodeURIComponent(name)}`, payload)
}

// ---- Schedules ----
export const getSchedules = async (): Promise<AdminScheduleIndexDto> => {
  const res = await axiosInstance.get<Envelope<AdminScheduleIndexDto>>('/admin/settings/schedules')
  return res.data.data
}

export const toggleSchedule = async (payload: ScheduleTogglePayload): Promise<void> => {
  await axiosInstance.post('/admin/settings/schedules/toggle', payload)
}

export const updateScheduleClosedDates = async (payload: ScheduleClosedDatesPayload): Promise<void> => {
  await axiosInstance.post('/admin/settings/schedules/update-dates', payload)
}

export const quickOpenNextSchedule = async (): Promise<void> => {
  await axiosInstance.post('/admin/settings/schedules/quick-open-next')
}

// ---- Users (staf) ----
export const getStaffUsers = async (): Promise<AdminStaffUserIndexDto> => {
  const res = await axiosInstance.get<Envelope<AdminStaffUserIndexDto>>('/admin/settings/users')
  return res.data.data
}

export const createStaffUser = async (payload: StaffUserPayload): Promise<void> => {
  await axiosInstance.post('/admin/settings/users', payload)
}

export const updateStaffUser = async (id: string, payload: StaffUserPayload): Promise<void> => {
  await axiosInstance.put(`/admin/settings/users/${id}`, payload)
}

export const deleteStaffUser = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/admin/settings/users/${id}`)
}

// ---- Notifikasi (lonceng Topbar) ----
export const getNotifications = async (): Promise<AdminNotificationsDto> => {
  const res = await axiosInstance.get<Envelope<AdminNotificationsDto>>('/admin/notifications')
  return res.data.data
}

export const markNotificationsRead = async (payload: NotificationIdsPayload = {}): Promise<AdminNotificationsDto> => {
  const res = await axiosInstance.post<Envelope<AdminNotificationsDto>>('/admin/notifications/read', payload)
  return res.data.data
}

export const clearReadNotifications = async (payload: NotificationIdsPayload = {}): Promise<AdminNotificationsDto> => {
  const res = await axiosInstance.post<Envelope<AdminNotificationsDto>>('/admin/notifications/clear-read', payload)
  return res.data.data
}

// ---- Profil staf ----
export const getStaffProfile = async (): Promise<StaffProfileDto> => {
  const res = await axiosInstance.get<Envelope<StaffProfileDto>>('/admin/profile')
  return res.data.data
}

/** FormData: name, email, dan `avatar` HANYA bila user memilih berkas baru. */
export const updateStaffProfile = async (formData: FormData): Promise<StaffProfileDto> => {
  const res = await axiosInstance.patch<Envelope<StaffProfileDto>>('/admin/profile', formData)
  return res.data.data
}

export const updateStaffPassword = async (payload: StaffPasswordPayload): Promise<void> => {
  await axiosInstance.put('/admin/profile/password', payload)
}

export const deleteStaffAccount = async (payload: StaffAccountDeletePayload): Promise<void> => {
  await axiosInstance.delete('/admin/profile', { data: payload })
}

export const resendStaffEmailVerification = async (): Promise<void> => {
  await axiosInstance.post('/admin/email/verification-notification')
}
