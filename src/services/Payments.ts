import axiosInstance from '@/lib/axios'
import type {
  AdminFinanceDto,
  AdminPaymentIndexDto,
  InvoiceDto,
  PaymentDecisionDto,
  PaymentQueueTab,
  PaymentSettingsDto,
  PaymentSettingsPayload
} from '@/types/contracts/contracts'

// ===== Service admin Verifikasi Pembayaran + Laporan Keuangan (Fase 8D) =====
// Semua lewat axiosInstance (baseURL '/api', Bearer). Envelope { success, data } di-unwrap.

type Envelope<T> = { success: true; data: T }

// ---- Verifikasi pembayaran ----
export const getPaymentsIndex = async (tab: PaymentQueueTab): Promise<AdminPaymentIndexDto> => {
  const res = await axiosInstance.get<Envelope<AdminPaymentIndexDto>>('/admin/payments', { params: { tab } })
  return res.data.data
}

export const approvePayment = async (id: string): Promise<PaymentDecisionDto> => {
  const res = await axiosInstance.post<Envelope<PaymentDecisionDto>>(`/admin/payments/${id}/approve`)
  return res.data.data
}

export const rejectPayment = async (id: string, reason: string): Promise<PaymentDecisionDto> => {
  const res = await axiosInstance.post<Envelope<PaymentDecisionDto>>(`/admin/payments/${id}/reject`, { reason })
  return res.data.data
}

export const updatePaymentSettings = async (payload: PaymentSettingsPayload): Promise<void> => {
  await axiosInstance.post('/admin/payments/settings', payload)
}

/** Unggah gambar QRIS merchant (field `image`) — mengganti yang lama. */
export const uploadQrisImage = async (file: File): Promise<PaymentSettingsDto> => {
  const body = new FormData()
  body.append('image', file)
  const res = await axiosInstance.post<Envelope<PaymentSettingsDto>>('/admin/payments/settings/qris', body)
  return res.data.data
}

/** Hapus QRIS — halaman bayar pelanggan kembali menampilkan rekening. */
export const removeQrisImage = async (): Promise<PaymentSettingsDto> => {
  const res = await axiosInstance.delete<Envelope<PaymentSettingsDto>>('/admin/payments/settings/qris')
  return res.data.data
}

/**
 * Bukti transfer butuh Bearer, jadi tidak bisa dibuka lewat <a href> biasa seperti di Laravel (cookie sesi).
 * Ambil sebagai blob lalu buka object URL-nya di tab baru.
 */
export const getPaymentProofBlob = async (proofUrl: string): Promise<Blob> => {
  const res = await axiosInstance.get<Blob>(proofUrl, { responseType: 'blob' })
  return res.data
}

/**
 * Pengganti `<a href={proof_url} target="_blank">` Laravel. Panggil dari onClick (setelah preventDefault):
 * tab dibuka SINKRON supaya tidak kena popup blocker, lalu diarahkan ke object URL blob bukti.
 * Melempar ulang error supaya pemanggil bisa menampilkan toast.
 */
export const openPaymentProof = async (proofUrl: string): Promise<void> => {
  const w = window.open('', '_blank')
  try {
    const blob = await getPaymentProofBlob(proofUrl)
    if (w) w.location.href = URL.createObjectURL(blob)
  } catch (error) {
    w?.close()
    throw error
  }
}

// ---- Laporan keuangan ----
export const getFinanceReport = async (month: number, year: number): Promise<AdminFinanceDto> => {
  const res = await axiosInstance.get<Envelope<AdminFinanceDto>>('/admin/finance', { params: { month, year } })
  return res.data.data
}

/**
 * Invoice/kuitansi satu transaksi: dokumen HTML siap cetak dari API (tombol "Cetak / Simpan PDF" ada di
 * dalamnya) — dipakai FO di meja depan. Pola sama dengan openPaymentProof: tab dibuka SINKRON supaya
 * tidak kena popup blocker, lalu diisi. Melempar ulang error supaya pemanggil bisa menampilkan toast.
 */
export const openInvoice = async (transactionId: string): Promise<void> => {
  const w = window.open('', '_blank')
  try {
    const res = await axiosInstance.get<Envelope<InvoiceDto>>(`/admin/payments/${transactionId}/invoice`)
    if (w) {
      w.document.open()
      w.document.write(res.data.data.html)
      w.document.close()
    }
  } catch (error) {
    w?.close()
    throw error
  }
}

// ---- Export Accurate (.xlsx) ----

/**
 * Unduh berkas impor Accurate untuk rentang [from, to]. Error dari endpoint berkas datang sebagai Blob;
 * isinya diurai kembali ke JSON supaya extractApiError() membaca pesannya seperti error lain.
 */
export type AccurateExportKind = 'pelanggan' | 'faktur' | 'penerimaan'

export const downloadAccurateExport = async (kind: AccurateExportKind, from: string, to: string): Promise<void> => {
  try {
    const res = await axiosInstance.get<Blob>(`/admin/finance/accurate/${kind}`, { params: { from, to }, responseType: 'blob' })
    const name = /filename="([^"]+)"/.exec(String(res.headers['content-disposition'] ?? ''))?.[1] ?? `accurate-${kind}.xlsx`
    const url = URL.createObjectURL(res.data)
    const link = document.createElement('a')
    link.href = url
    link.download = name
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (error) {
    const response = (error as { response?: { data?: unknown } }).response
    if (response?.data instanceof Blob) {
      try {
        response.data = JSON.parse(await response.data.text())
      } catch {}
    }
    throw error
  }
}
