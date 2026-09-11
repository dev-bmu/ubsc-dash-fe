export type QueryParamValue = string | number | boolean | null | undefined | Array<string | number | boolean>

export type QueryParamsRecord = Record<string, QueryParamValue>

/**
 * Build URLSearchParams string from a record. Skips null/undefined/empty string.
 * - Arrays become repeated query params: key=a&key=b
 * - Booleans/numbers are stringified
 */
export function buildSearchParams(params: QueryParamsRecord): string {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined) return
    if (Array.isArray(value)) {
      value.forEach((v) => {
        if (v === null || v === undefined) return
        const s = String(v)
        if (s === '') return
        sp.append(key, s)
      })
      return
    }
    const s = String(value)
    if (s === '') return
    sp.set(key, s)
  })
  return sp.toString()
}
