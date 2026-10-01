import axiosInstance from '@/lib/axios'
import type { ApiSuccess, DashboardDto } from '@/types/contracts/contracts'

// ===== Service dashboard admin =====
// GET /api/admin/dashboard (baseURL axios '/api' + '/admin/dashboard'). Endpoint membungkus
// payload dalam envelope { success, data }; di-unwrap ke .data.data. Bearer token disisipkan
// interceptor axios (sesi staff), jadi ini harus dipanggil dari komponen client di balik AuthGuard.
export const getDashboard = async (): Promise<DashboardDto> => {
  const response = await axiosInstance.get<ApiSuccess<DashboardDto>>('/admin/dashboard')
  return response.data.data
}
