// ===== PostCSS =====
// optimize: false WAJIB — sama dengan ubsc-landing, terukur di gate Fase 2 (ubsc-api/docs/fase-2.md). Lightning CSS di
// build produksi @tailwindcss/postcss menulis ulang 1.1428571em menjadi 1.14286em; selisih sub-piksel itu menumpuk per
// elemen, dan dokumen prose-sm (RichEditor berita) 40 bagian turun 5px dari Laravel. Tanpa optimize, CSS yang dikirim
// sama dengan yang diukur harness; Next tetap meminifikasinya dengan cssnano-simple.
const config = {
  plugins: {
    '@tailwindcss/postcss': { optimize: false }
  }
}

export default config
