import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname
})

// ===== Aturan href =====
// R10: aplikasi Laravel lama memanggil route() Ziggy di 47 file. Penggantinya
// adalah builder terpusat di src/config/routes.ts. Path internal yang ditulis
// sebagai string literal di href tidak ikut berubah saat route dipindah dan
// tidak tertangkap typedRoutes, jadi ditolak di sini. Link eksternal
// (https:, mailto:, tel:) dan anchor (#...) tetap boleh literal.
const HREF_MESSAGE = 'Jangan tulis path internal sebagai literal di href. Pakai builder dari src/config/routes.ts (lihat R10 di Rewrite.md).'

const noLiteralInternalHref = [
  'error',
  {
    // Contoh ditolak: href="/bookings"
    selector: 'JSXAttribute[name.name="href"] > Literal[value=/^\\//]',
    message: HREF_MESSAGE
  },
  {
    // Contoh ditolak: href={'/bookings'}
    selector: 'JSXAttribute[name.name="href"] > JSXExpressionContainer > Literal[value=/^\\//]',
    message: HREF_MESSAGE
  },
  {
    // Contoh ditolak: href={template literal yang diawali garis miring}
    selector: 'JSXAttribute[name.name="href"] > JSXExpressionContainer > TemplateLiteral[quasis.0.value.raw=/^\\//]',
    message: HREF_MESSAGE
  }
]

const eslintConfig = [
  {
    // src/types/contracts/ adalah salinan AUTO-GENERATED dari ubsc-api/shared
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'src/types/contracts/**']
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': noLiteralInternalHref
    }
  }
]

export default eslintConfig
