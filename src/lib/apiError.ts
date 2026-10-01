import type { ApiErrorBody } from '@/types/contracts/contracts'

// ===== Ekstraksi error API (envelope { success:false, error:{code,message,fields} }) =====
// Dipakai form admin Fase 8 untuk memetakan 422 VALIDATION_ERROR ke pesan per field, dan error
// lain ke pesan umum. Aman terhadap error non-axios / tanpa body.

export interface ExtractedApiError {
  code: string
  message: string
  fields: Record<string, string[]>
}

export function extractApiError(error: unknown): ExtractedApiError {
  const fallback: ExtractedApiError = { code: 'UNKNOWN', message: 'Terjadi kesalahan. Silakan coba lagi.', fields: {} }
  if (typeof error !== 'object' || error === null) return fallback
  const body = (error as { response?: { data?: { error?: ApiErrorBody } } }).response?.data?.error
  if (!body) return fallback
  return { code: body.code ?? fallback.code, message: body.message ?? fallback.message, fields: body.fields ?? {} }
}

/** Pesan pertama tiap field, untuk ditempel langsung ke input (Record<field, pesan>). */
export function fieldErrorMap(error: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, messages] of Object.entries(extractApiError(error).fields)) {
    if (messages?.length) out[key] = messages[0]
  }
  return out
}
