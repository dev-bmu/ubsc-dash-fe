'use client'

import { getDashboard } from '@/services/Dashboard'
import { useQuery } from '@tanstack/react-query'

// ===== Hook data dashboard admin =====
// Membungkus GET /api/admin/dashboard lewat TanStack Query. Dipakai halaman Dashboard (client,
// di balik AuthGuard) menggantikan props Inertia dari controller Laravel.
export function useDashboard() {
  return useQuery({ queryKey: ['admin', 'dashboard'], queryFn: getDashboard })
}
