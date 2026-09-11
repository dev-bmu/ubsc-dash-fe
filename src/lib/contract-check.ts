import type { ClientRequest, IncomingMessage, RequestOptions } from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

// ===== Pemeriksaan drift kontrak (R12) =====
// Saat boot DEV, bandingkan hash kontrak milik API dengan salinan lokal hasil
// `npm run sync:contracts`. Kalau berbeda, salinan tipe di src/types/contracts sudah
// usang: tipe tetap hijau padahal bentuk respons API sudah berubah, dan mode gagalnya
// diam sampai muncul di runtime.
//
// Tiga jaminan yang tidak boleh dilanggar:
//   1. TIDAK PERNAH melempar — API mati, endpoint belum ada, atau .contract-hash belum
//      dibuat semuanya berakhir diam.
//   2. TIDAK PERNAH jalan di produksi (termasuk saat `next build`, yang NODE_ENV-nya
//      sudah production).
//   3. TIDAK memakai fetch bawaan Next. Modul node:http/node:https dipakai langsung
//      supaya permintaan ini mustahil terhitung sebagai fetch di dalam render dan
//      menyeret route menjadi dinamis — landing bergantung pada ISR per halaman.

const HASH_FILE = 'src/types/contracts/.contract-hash'
const CONTRACT_HASH_PATH = '/api/meta/contract-hash'
const REQUEST_TIMEOUT_MS = 2000

let hasRun = false

/** Base URL API. Sama dengan yang dipakai rewrite di next.config.ts. */
function resolveApiBaseUrl(): string {
  return process.env.API_BASE_URL ?? 'http://localhost:4020'
}

/** Ambil nilai hash dari bentuk respons apa pun yang masuk akal: envelope { success, data }, { hash }, atau string mentah. */
function extractHash(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  if (typeof value !== 'object' || value === null) return null

  const record = value as Record<string, unknown>
  if (typeof record.hash === 'string') {
    const trimmed = record.hash.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  if ('data' in record) return extractHash(record.data)

  return null
}

function readHashFromBody(body: string): string | null {
  try {
    const parsed: unknown = JSON.parse(body)
    return extractHash(parsed)
  } catch {
    // Bukan JSON — terima hash mentah, tapi tolak badan respons yang jelas bukan hash.
    const raw = body.trim()
    return raw.length > 0 && raw.length <= 128 ? raw : null
  }
}

/** GET hash kontrak dari API. Mengembalikan null untuk SETIAP kegagalan, tidak pernah reject. */
async function fetchRemoteHash(baseUrl: string): Promise<string | null> {
  const target = new URL(CONTRACT_HASH_PATH, baseUrl)
  const isHttps = target.protocol === 'https:'

  const httpModule = await import('node:http')
  const httpsModule = await import('node:https')

  return new Promise<string | null>((resolve) => {
    const options: RequestOptions = {
      method: 'GET',
      timeout: REQUEST_TIMEOUT_MS,
      headers: { accept: 'application/json' }
    }

    const onResponse = (res: IncomingMessage) => {
      if (res.statusCode !== 200) {
        res.resume()
        resolve(null)
        return
      }

      let body = ''
      res.setEncoding('utf8')
      res.on('data', (chunk: string) => {
        body += chunk
      })
      res.on('end', () => resolve(readHashFromBody(body)))
      res.on('error', () => resolve(null))
    }

    const request: ClientRequest = isHttps ? httpsModule.request(target, options, onResponse) : httpModule.request(target, options, onResponse)

    request.on('error', () => resolve(null))
    request.on('timeout', () => {
      request.destroy()
      resolve(null)
    })
    request.end()
  })
}

async function compareContractHash(): Promise<void> {
  try {
    const remoteHash = await fetchRemoteHash(resolveApiBaseUrl())

    // API belum jalan atau endpoint /api/meta/contract-hash belum ada — bukan urusan kita.
    if (remoteHash === null) return

    const localHash = await readFile(path.resolve(process.cwd(), HASH_FILE), 'utf8')
      .then((content) => content.trim())
      .catch(() => null)

    if (localHash === null) {
      console.warn(`[kontrak] Salinan kontrak belum ada (${HASH_FILE} tidak ditemukan). Jalankan: npm run sync:contracts`)
      return
    }

    if (localHash !== remoteHash) {
      console.warn(
        `[kontrak] Salinan kontrak USANG — src/types/contracts sudah beda dengan API.` +
          ` (lokal: ${localHash}, API: ${remoteHash}). Jalankan: npm run sync:contracts`
      )
    }
  } catch {
    // Sengaja ditelan: pemeriksaan ini bantuan developer, bukan syarat boot.
  }
}

/**
 * Jalankan pemeriksaan kontrak sekali per proses server, khusus DEV.
 * Aman dipanggil dari lingkup modul layout.tsx — fire-and-forget, tanpa await.
 */
export function runContractCheck(): void {
  if (hasRun) return
  if (process.env.NODE_ENV === 'production') return
  if (typeof window !== 'undefined') return

  hasRun = true
  void compareContractHash().catch(() => {})
}
