export interface LoginRequest {
  email: string
  password: string
}

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
  // Field unit / cluster / division DIHAPUS di Fase 0: model organisasi
  // (unit - cluster - division) warisan PERSURATAN tidak dipakai UBSC.
  // TODO Fase 1: AuthUser pindah ke src/types/contracts (hasil sync:contracts).
  permissions?: string[]
}

export interface LoginResponse {
  accessToken: string
  user: AuthUser
}

export interface LogoutResponse {
  ok: boolean
}

export interface SessionInfo {
  id: string
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  lastUsedAt: string
}
