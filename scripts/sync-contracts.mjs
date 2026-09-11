// ===== Sinkronisasi kontrak dari ubsc-api =====
// Menyalin seluruh <UBSC_API_LOCAL_PATH>/shared/*.ts ke src/types/contracts/, menyisipkan header
// AUTO-GENERATED di tiap berkas, menulis src/types/contracts/.contract-hash, lalu memverifikasi
// hasilnya dengan `tsc --noEmit`.
//
// Kenapa ada: dengan 3 repo terpisah tidak ada paket @ubsc/contracts yang bisa di-import. ubsc-api/shared
// adalah satu-satunya tempat kontrak ditulis; folder ini cuma cerminnya. Jangan pernah mengedit salinan
// di src/types/contracts — perbaikannya di ubsc-api, lalu jalankan skrip ini lagi.
//
// Node ESM murni, tanpa dependency, supaya bisa dijalankan tanpa menambah paket apa pun.

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..')
const TARGET_DIR = resolve(REPO_ROOT, 'src/types/contracts')
const HASH_FILE = resolve(TARGET_DIR, '.contract-hash')
const DEFAULT_API_PATH = '../ubsc-api'

// ===== Util konsol =====
const info = (message) => console.log(`[sync:contracts] ${message}`)

const fail = (message) => {
  console.error(`\n[sync:contracts] GAGAL: ${message}\n`)
  process.exit(1)
}

// ===== Menentukan lokasi repo ubsc-api =====
// Urutan prioritas: variabel environment proses, lalu .env.local, lalu .env, lalu default ../ubsc-api.
// Nilai dari environment sengaja menang supaya bisa di-override sekali jalan:
//   UBSC_API_LOCAL_PATH=../lain npm run sync:contracts
// process.loadEnvFile() bawaan Node dipakai supaya skrip ini tetap bebas dependency (repo mem-pin Node 24).
function readApiLocalPath() {
  const fromProcess = process.env.UBSC_API_LOCAL_PATH
  if (fromProcess) return { value: fromProcess, origin: 'environment proses' }

  for (const envFile of ['.env.local', '.env']) {
    const envPath = resolve(REPO_ROOT, envFile)
    if (!existsSync(envPath)) continue

    try {
      process.loadEnvFile(envPath)
    } catch {
      // Berkas .env yang rusak bukan alasan menghentikan sinkronisasi — coba kandidat berikutnya.
      continue
    }

    if (process.env.UBSC_API_LOCAL_PATH) return { value: process.env.UBSC_API_LOCAL_PATH, origin: envFile }
  }

  return { value: DEFAULT_API_PATH, origin: 'nilai default' }
}

const apiLocalPath = readApiLocalPath()
const sharedDir = resolve(REPO_ROOT, apiLocalPath.value, 'shared')

if (!existsSync(sharedDir) || !statSync(sharedDir).isDirectory()) {
  fail(
    [
      `folder kontrak tidak ditemukan di ${sharedDir}`,
      '',
      `Nilai yang dipakai: UBSC_API_LOCAL_PATH=${apiLocalPath.value} (dari ${apiLocalPath.origin})`,
      '',
      'Perbaiki dengan salah satu cara berikut:',
      `  1. Clone repo ubsc-api sejajar dengan repo ini sehingga path ${DEFAULT_API_PATH}/shared valid, atau`,
      '  2. Salin .env.example jadi .env, lalu set UBSC_API_LOCAL_PATH ke path lokal repo ubsc-api:',
      '       UBSC_API_LOCAL_PATH=../ubsc-api',
      '',
      'Path relatif dihitung dari root repo ini, bukan dari folder scripts/.'
    ].join('\n')
  )
}

// ===== Membaca berkas sumber =====
// Hanya *.ts di level teratas shared/, diurutkan berdasarkan nama supaya hash-nya stabil.
const sourceNames = readdirSync(sharedDir)
  .filter((name) => name.endsWith('.ts'))
  .filter((name) => statSync(resolve(sharedDir, name)).isFile())
  .sort()

if (sourceNames.length === 0) {
  fail(`tidak ada berkas .ts di ${sharedDir}. Pastikan ubsc-api sudah punya shared/ yang terisi (contracts.ts, permissions.ts, format.ts).`)
}

// Normalisasi isi berkas, PERSIS seperti `normalize` di ubsc-api/src/utils/contract-hash.ts: buang BOM,
// lalu ubah CRLF maupun CR tunggal menjadi LF. Tanpa ini, repo yang di-clone di Windows dengan
// core.autocrlf=true menghasilkan hash berbeda dari server Linux padahal isinya sama persis.
const normalize = (text) => text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')

// Dua bentuk untuk dua kebutuhan yang tidak boleh dicampur:
//   source  — bahan hash, hasil normalisasi apa adanya tanpa tambahan apa pun, supaya byte yang masuk
//             digest identik dengan yang dibaca API dari shared/.
//   content — yang ditulis ke disk. Hanya di sini newline penutup dipaksakan; kalau pemaksaan itu ikut
//             ke dalam hash, berkas sumber yang kebetulan tidak diakhiri newline akan menghasilkan hash
//             berbeda dari milik API dan peringatan drift menyala palsu.
const files = sourceNames.map((name) => {
  const source = normalize(readFileSync(resolve(sharedDir, name), 'utf8'))
  return { name, source, content: source.endsWith('\n') ? source : `${source}\n` }
})

// ===== Hash kontrak (R12) =====
// WAJIB identik dengan ubsc-api/src/utils/contract-hash.ts, karena hash inilah yang dibandingkan dengan
// GET /api/meta/contract-hash saat boot dev. Algoritmanya, per berkas dan berurutan menurut nama:
// nama + '\n', lalu isi yang sudah dinormalisasi, lalu '\n' penutup. Ketiganya di-feed ke satu digest
// sha256. Newline penutup itu bukan hiasan — ia pemisah antar berkas; tanpa ia, dua berkas yang isinya
// digeser satu baris bisa menghasilkan digest yang sama, dan hash di sini tidak akan pernah cocok
// dengan milik API.
//
// Header AUTO-GENERATED di bawah SENGAJA tidak ikut di-hash. Yang di-hash adalah isi sumber apa adanya,
// byte-per-byte sama dengan yang di-hash API. Kalau header ikut, hash salinan ini tidak akan pernah sama
// dengan hash milik API dan peringatan drift jadi selalu menyala palsu — persis kebalikan gunanya.
function computeContractHash(entries) {
  const digest = createHash('sha256')

  for (const entry of entries) {
    digest.update(`${entry.name}\n`, 'utf8')
    digest.update(entry.source, 'utf8')
    digest.update('\n', 'utf8')
  }

  return digest.digest('hex')
}

const contractHash = computeContractHash(files)

// ===== Header AUTO-GENERATED =====
const buildHeader = (name) =>
  [
    '// AUTO-GENERATED — jangan edit tangan.',
    `// Sumber: ubsc-api/shared/${name} — jalankan \`npm run sync:contracts\` untuk memperbarui.`,
    '',
    ''
  ].join('\n')

// ===== Menulis salinan =====
mkdirSync(TARGET_DIR, { recursive: true })

// Buang salinan lama lebih dulu supaya berkas yang sudah dihapus di ubsc-api tidak tertinggal
// jadi kontrak hantu yang tetap hijau saat typecheck.
const staleNames = readdirSync(TARGET_DIR).filter((name) => name.endsWith('.ts'))

for (const stale of staleNames) {
  if (!sourceNames.includes(stale)) info(`Menghapus kontrak usang: ${stale}`)
  rmSync(resolve(TARGET_DIR, stale))
}

for (const file of files) {
  writeFileSync(resolve(TARGET_DIR, file.name), `${buildHeader(file.name)}${file.content}`, 'utf8')
}

writeFileSync(HASH_FILE, `${contractHash}\n`, 'utf8')

info(`Sumber  : ${sharedDir}`)
info(`Tujuan  : ${relative(REPO_ROOT, TARGET_DIR)}`)
info(`Disalin : ${files.length} berkas (${sourceNames.join(', ')})`)
info(`Hash    : ${contractHash}`)

// ===== Verifikasi =====
// Salinan baru bisa saja mengubah bentuk DTO yang sudah dipakai komponen. Typecheck di sini mengubah
// drift kontrak dari bug runtime di produksi jadi kegagalan satu perintah di terminal.
//
// Dicek lebih dulu supaya pesan gagalnya jujur: tanpa ini, typescript yang belum ter-install akan
// terbaca sebagai "typecheck gagal" dan menyesatkan orang untuk mengubah kode yang sebenarnya benar.
if (!existsSync(resolve(REPO_ROOT, 'node_modules/typescript'))) {
  fail('typescript belum ter-install di repo ini. Jalankan `npm ci` lebih dulu, baru `npm run sync:contracts`.')
}

info('Menjalankan `npx tsc --noEmit`...')

// --no-install WAJIB. Tanpa flag itu, npx yang tidak menemukan tsc lokal akan MENGUNDUH paket pihak
// ketiga bernama "tsc" dari npm lalu menjalankannya — lubang supply-chain sekaligus sumber pesan error
// yang membingungkan. Dengan --no-install, npx hanya boleh memakai binary dari node_modules repo ini.
const typecheck = spawnSync('npx', ['--no-install', 'tsc', '--noEmit'], {
  cwd: REPO_ROOT,
  stdio: 'inherit',
  // Di Windows, npx adalah npx.cmd dan hanya bisa dipanggil lewat shell.
  shell: process.platform === 'win32'
})

if (typecheck.error) {
  fail(`tidak bisa menjalankan npx tsc: ${typecheck.error.message}. Pastikan dependency sudah ter-install (npm ci).`)
}

if (typecheck.status !== 0) {
  fail(
    [
      'typecheck gagal setelah kontrak disalin.',
      '',
      'Kontraknya sendiri sudah tersalin — yang gagal adalah kode di repo ini yang belum mengikuti',
      'perubahan terbaru dari ubsc-api. Perbaiki pemakaiannya di src/, jangan mengedit src/types/contracts.'
    ].join('\n')
  )
}

info('Selesai. Commit perubahan di src/types/contracts/ bersama kode yang memakainya.')
