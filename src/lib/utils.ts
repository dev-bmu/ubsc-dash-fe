import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// ===== Utilitas class =====

/** Gabungkan class Tailwind dengan pemenang konflik yang benar. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// formatCurrency / formatDateID / formatDate yang dulu ada di sini SUDAH DIPINDAH.
// Rumahnya sekarang '@/lib/format', yang me-re-export satu implementasi tunggal dari
// src/types/contracts/format (salinan ubsc-api/shared) — lihat R13 di Rewrite.md.
// Tidak ada alias deprecated yang ditinggalkan karena tidak ada satu pun pemanggil:
// seluruh repo hanya mengimpor cn() dari file ini.
//
// truncateText juga dihapus dari sini — duplikat mati; yang hidup ada di '@/utils/truncateText'.
