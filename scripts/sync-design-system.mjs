// ===== Sinkronisasi design system dari ubsc-landing =====
// Fondasi CSS (kompat Tailwind v3, token & font UBSC, token boilerplate) ditulis dan diukur gate Fase 2 di
// ubsc-landing. ubsc-admin memakai SALINAN IDENTIK tanpa ubsc-bespoke.css. Salinan yang melenceng berarti
// panel admin memakai CSS yang tidak pernah diuji lawan Laravel — itu yang dicegah skrip ini.
//
//   npm run sync:design-system    salin dari ../ubsc-landing/src/styles (atau UBSC_LANDING_LOCAL_PATH)
//   npm run check:design-system   bandingkan saja; exit 1 bila ada yang berbeda
//
// Node ESM murni, tanpa dependency.

import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const LANDING = resolve(REPO_ROOT, process.env.UBSC_LANDING_LOCAL_PATH || '../ubsc-landing')
const FILES = ['tailwind-v3-compat.css', 'ubsc-base.css', 'tailwind-v3-utilities.css', 'boilerplate-tokens.css']
const CHECK_ONLY = process.argv.includes('--check')

const sha = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')

if (!existsSync(resolve(LANDING, 'src/styles'))) {
  console.error(`[design-system] GAGAL: ${LANDING}/src/styles tidak ada — set UBSC_LANDING_LOCAL_PATH`)
  process.exit(1)
}

if (!CHECK_ONLY) mkdirSync(resolve(REPO_ROOT, 'src/styles'), { recursive: true })

let drift = 0
for (const name of FILES) {
  const source = resolve(LANDING, 'src/styles', name)
  const target = resolve(REPO_ROOT, 'src/styles', name)
  const same = existsSync(target) && sha(source) === sha(target)
  if (same) continue
  drift++
  if (CHECK_ONLY) console.error(`[design-system] BERBEDA: src/styles/${name}`)
  else {
    copyFileSync(source, target)
    console.log(`[design-system] disalin: src/styles/${name}`)
  }
}

if (CHECK_ONLY && drift) {
  console.error(`[design-system] ${drift} berkas tidak identik dengan ubsc-landing. Jalankan npm run sync:design-system.`)
  process.exit(1)
}
console.log(`[design-system] ${CHECK_ONLY ? 'identik' : drift ? `${drift} berkas diperbarui` : 'sudah identik'} (${FILES.length} berkas)`)
