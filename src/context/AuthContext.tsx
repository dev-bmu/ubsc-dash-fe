'use client'

import { AUTH_BASE } from '@/config/auth'
import { routes } from '@/config/routes'
import axiosInstance, { setAccessToken } from '../lib/axios'
import { DynamicSkeleton } from '@/components/ui/dynamic-skeleton'
import { useRouter } from 'next/navigation'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { AuthUser } from '@/types/api/auth'

// ===== Tipe respons =====
// Envelope API baru: { success, data }. Endpoint refresh mengembalikan data.accessToken
// dan data.user.
// TODO Fase 1: ganti dengan tipe resmi dari '@/types/contracts' setelah sync:contracts.
interface ApiEnvelope<T> {
  success: boolean
  data: T
}

interface RefreshData {
  accessToken: string
  user: AuthUser
}

interface AuthContextType {
  user: AuthUser | null
  login: (accessToken: string, userData: AuthUser) => void
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Access token hanya hidup di memori — pulihkan sesi dari cookie refresh httpOnly milik API
    // (ubsc_s_refresh, Path=/api/auth) lewat POST AUTH_BASE + '/refresh'. Audience 'staff' adalah
    // segmen URL di ubsc-api, jadi path-nya /api/auth/staff/refresh, bukan /api/auth/refresh.
    const checkUserStatus = async () => {
      try {
        const { data } = await axiosInstance.post<ApiEnvelope<RefreshData>>(`${AUTH_BASE}/refresh`)
        setAccessToken(data.data.accessToken)
        setUser({
          id: data.data.user.id,
          name: data.data.user.name,
          email: data.data.user.email,
          role: data.data.user.role,
          permissions: Array.isArray(data.data.user.permissions) ? data.data.user.permissions : undefined
        })
      } catch {
        setAccessToken(null)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkUserStatus()
  }, [])

  const login = (accessToken: string, userData: AuthUser) => {
    setAccessToken(accessToken)
    setUser(userData)
    router.push(routes.dashboard())
  }

  const logout = async () => {
    try {
      await axiosInstance.delete(`${AUTH_BASE}/logout`)
    } catch (error) {
      console.error('Logout gagal:', error)
    } finally {
      setAccessToken(null)
      setUser(null)
      window.location.href = routes.login()
    }
  }

  const value = { user, login, logout, isLoading }

  // Perilaku boilerplate DIPERTAHANKAN di admin: seluruh panel ditahan di balik skeleton
  // sampai sesi selesai dipulihkan. Panel ini memang tidak punya konten publik, jadi
  // menahan render sekaligus mencegah kedipan chrome sebelum role diketahui.
  return <AuthContext.Provider value={value}>{isLoading ? <DynamicSkeleton variant="fullPageLoader" /> : children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth harus dipakai di dalam AuthProvider')
  }
  return context
}
