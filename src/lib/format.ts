// ===== Format Rupiah & tanggal =====
// SATU implementasi untuk seluruh sistem (Rewrite.md R13: "semua format lewat format.ts
// yang disalin, satu implementasi"). Sumber kebenarannya ada di ubsc-api/shared/format.ts
// dan disalin ke src/types/contracts/format.ts oleh `npm run sync:contracts`.
//
// File ini sengaja hanya satu baris niat: JANGAN menulis implementasi lokal di sini.
// Implementasi kedua = timezone/locale melenceng antar repo, persis bug yang R13 cegah
// (booking jam 23:30 WIB mendarat di hari yang salah).
//
// PRASYARAT: `npm run sync:contracts` HARUS dijalankan lebih dulu. Sebelum itu folder
// src/types/contracts belum ada dan import di bawah belum bisa di-resolve — itu memang
// perilaku yang diinginkan: build gagal keras, bukan diam-diam memakai salinan usang.
//
// Aturan pakai: impor format APA PUN dari '@/lib/format', bukan langsung dari
// '@/types/contracts/format' — supaya ada satu titik ganti kalau lokasi salinan berubah.
export * from '@/types/contracts/format'
