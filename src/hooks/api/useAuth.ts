'use client'

import { login, logout, getSessions, revokeSession, forceLogoutAll } from '@/services/Auth'
import type { LoginRequest } from '@/types/api/auth'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: LoginRequest) => login(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    }
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      queryClient.clear()
    }
  })
}

export function useSessions() {
  return useQuery({ queryKey: ['sessions'], queryFn: () => getSessions() })
}

export function useRevokeSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (sessionId: string) => revokeSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    }
  })
}

export function useForceLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => forceLogoutAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    }
  })
}
