'use client'

import {
  clearReadNotifications,
  createStaffUser,
  deleteStaffUser,
  getNotifications,
  getRoles,
  getSchedules,
  getStaffProfile,
  getStaffUsers,
  markNotificationsRead,
  quickOpenNextSchedule,
  toggleSchedule,
  updateRolePermissions,
  updateScheduleClosedDates,
  updateStaffPassword,
  updateStaffProfile,
  updateStaffUser
} from '@/services/Settings'
import type {
  NotificationIdsPayload,
  RolePermissionsPayload,
  ScheduleClosedDatesPayload,
  ScheduleTogglePayload,
  StaffPasswordPayload,
  StaffUserPayload
} from '@/types/contracts/contracts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// ===== Hooks data admin Settings (Fase 8G) =====

const ROLES = ['admin', 'roles'] as const
const SCHEDULES = ['admin', 'schedules'] as const
const STAFF_USERS = ['admin', 'staff-users'] as const
const NOTIFICATIONS = ['admin', 'notifications'] as const
const PROFILE = ['admin', 'profile'] as const

// ---- Roles ----
export function useRoles() {
  return useQuery({ queryKey: ROLES, queryFn: getRoles })
}

export function useUpdateRolePermissions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ name, payload }: { name: string; payload: RolePermissionsPayload }) => updateRolePermissions(name, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ROLES })
      // Permission efektif milik user yang sedang login bisa ikut berubah.
      qc.invalidateQueries({ queryKey: ['auth', 'me'] })
    }
  })
}

// ---- Schedules ----
export function useSchedules() {
  return useQuery({ queryKey: SCHEDULES, queryFn: getSchedules })
}

function useScheduleInvalidate() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: SCHEDULES })
    // Jadwal buka/tutup mengubah ketersediaan booking.
    qc.invalidateQueries({ queryKey: ['admin', 'bookings'] })
  }
}

export function useToggleSchedule() {
  const invalidate = useScheduleInvalidate()
  return useMutation({ mutationFn: (payload: ScheduleTogglePayload) => toggleSchedule(payload), onSuccess: invalidate })
}

export function useUpdateScheduleClosedDates() {
  const invalidate = useScheduleInvalidate()
  return useMutation({ mutationFn: (payload: ScheduleClosedDatesPayload) => updateScheduleClosedDates(payload), onSuccess: invalidate })
}

export function useQuickOpenNextSchedule() {
  const invalidate = useScheduleInvalidate()
  return useMutation({ mutationFn: () => quickOpenNextSchedule(), onSuccess: invalidate })
}

// ---- Users (staf) ----
export function useStaffUsers() {
  return useQuery({ queryKey: STAFF_USERS, queryFn: getStaffUsers })
}

export function useCreateStaffUser() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (payload: StaffUserPayload) => createStaffUser(payload), onSuccess: () => qc.invalidateQueries({ queryKey: STAFF_USERS }) })
}

export function useUpdateStaffUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: StaffUserPayload }) => updateStaffUser(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STAFF_USERS })
      qc.invalidateQueries({ queryKey: ROLES })
    }
  })
}

export function useDeleteStaffUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteStaffUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STAFF_USERS })
      qc.invalidateQueries({ queryKey: ROLES })
    }
  })
}

// ---- Notifikasi ----
export function useNotifications(enabled = true) {
  return useQuery({ queryKey: NOTIFICATIONS, queryFn: getNotifications, enabled, refetchInterval: 60_000 })
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: NotificationIdsPayload = {}) => markNotificationsRead(payload),
    onSuccess: (data) => qc.setQueryData(NOTIFICATIONS, data)
  })
}

export function useClearReadNotifications() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: NotificationIdsPayload = {}) => clearReadNotifications(payload),
    onSuccess: (data) => qc.setQueryData(NOTIFICATIONS, data)
  })
}

// ---- Profil staf ----
export function useStaffProfile(enabled = true) {
  return useQuery({ queryKey: PROFILE, queryFn: getStaffProfile, enabled })
}

export function useUpdateStaffProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (formData: FormData) => updateStaffProfile(formData),
    onSuccess: (data) => {
      qc.setQueryData(PROFILE, data)
      // Nama/avatar tampil di Topbar, yang dibaca dari /me.
      qc.invalidateQueries({ queryKey: ['auth', 'me'] })
    }
  })
}

export function useUpdateStaffPassword() {
  return useMutation({ mutationFn: (payload: StaffPasswordPayload) => updateStaffPassword(payload) })
}
