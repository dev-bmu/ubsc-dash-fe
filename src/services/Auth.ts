import { AUTH_BASE } from '@/config/auth'
import { extractApiError } from '@/lib/apiError'
import axiosInstance from '@/lib/axios'
import type { ApiError } from '@/types/api/api'
import type { LoginRequest, LoginResponse, LogoutResponse, SessionInfo } from '@/types/api/auth'
import type { ApiSuccess } from '@/types/contracts/contracts'

// `error` di envelope gagal API adalah OBJEK { code, message, fields?, requestId? }. Dulu dibaca sebagai
// string, sehingga halaman login merender objek itu dan seluruh panel crash (React #31) setiap kali login
// gagal — password salah, akun terkunci, atau rate limit.
const toApiError = (error: unknown, message: string, code: string): ApiError => {
  const parsed = extractApiError(error)
  if (parsed.code === 'UNKNOWN') return { message, code }
  return { message: parsed.message, code: parsed.code, details: parsed.fields }
}

export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  try {
    // ubsc-api SELALU membungkus payload sukses dalam envelope { success, data }. Boilerplate
    // membaca response.data langsung sehingga data.accessToken selalu undefined (bug ini tertutup
    // oleh /refresh yang menyusul); di sini di-unwrap ke response.data.data.
    const response = await axiosInstance.post<ApiSuccess<LoginResponse>>(`${AUTH_BASE}/login`, data)
    return response.data.data
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
