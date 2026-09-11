import { AUTH_BASE } from '@/config/auth'
import axiosInstance from '@/lib/axios'
import type { ApiError } from '@/types/api/api'
import type { LoginRequest, LoginResponse, LogoutResponse, SessionInfo } from '@/types/api/auth'

const toApiError = (error: unknown, message: string, code: string): ApiError => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const err = error as { response?: { data?: { error?: string; message?: string; code?: string; details?: unknown } } }
    return {
      message: err.response?.data?.error || err.response?.data?.message || message,
      code: err.response?.data?.code || code,
      details: err.response?.data?.details
    }
  }
  return { message, code, details: undefined }
}

export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  try {
    const response = await axiosInstance.post<LoginResponse>(`${AUTH_BASE}/login`, data)
    return response.data
  } catch (error: unknown) {
    throw toApiError(error, 'Gagal login', 'LOGIN_ERROR')
  }
}

export const logout = async (): Promise<LogoutResponse> => {
  try {
    const response = await axiosInstance.delete<LogoutResponse>(`${AUTH_BASE}/logout`)
    return response.data
  } catch (error: unknown) {
    throw toApiError(error, 'Gagal logout', 'LOGOUT_ERROR')
  }
}

export const getSessions = async (): Promise<SessionInfo[]> => {
  const response = await axiosInstance.get<{ data: SessionInfo[] }>(`${AUTH_BASE}/sessions`)
  return response.data.data
}

export const revokeSession = async (sessionId: string): Promise<LogoutResponse> => {
  const response = await axiosInstance.delete<LogoutResponse>(`${AUTH_BASE}/sessions/${sessionId}`)
  return response.data
}

export const forceLogoutAll = async (): Promise<LogoutResponse> => {
  const response = await axiosInstance.delete<LogoutResponse>(`${AUTH_BASE}/sessions`)
  return response.data
}
