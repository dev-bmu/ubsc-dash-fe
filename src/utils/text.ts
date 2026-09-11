/**
 * Memformat tanggal menjadi format "DD MMMM YYYY" dalam bahasa Indonesia.
 * @param dateInput - Tanggal dalam bentuk string, Date, null, atau undefined.
 * @returns Tanggal yang diformat atau '-' jika input tidak valid.
 * @example formatDateID('2025-09-28') // "28 September 2025"
 */
export function formatDateID(dateInput?: string | Date | null): string {
  // Jika input kosong atau null, kembalikan fallback
  if (!dateInput) return '-'

  try {
    const date = new Date(dateInput)

    // Cek apakah tanggal yang dihasilkan valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date input provided:', dateInput)
      return '-'
    }

    // Gunakan Intl.DateTimeFormat untuk format lokalisasi
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date)
  } catch (error) {
    console.error('Failed to format date:', dateInput, error)
    return '-' // Kembalikan fallback jika terjadi error
  }
}
