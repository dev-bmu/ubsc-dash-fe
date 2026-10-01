/**
 * Month-grid arithmetic, Monday first.
 *
 * Lifted out of Pages/Admin/Settings/Schedules/Index.tsx so the staff calendar
 * and the customer class calendar cannot drift into two different opinions
 * about where a week starts. Pure arithmetic — the project has no date
 * library and does not need one for this.
 */

export const DAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'] as const

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const

export type Weekday = (typeof WEEKDAYS)[number]

export const WEEKDAY_ID: Record<Weekday, string> = {
  Monday: 'Senin',
  Tuesday: 'Selasa',
  Wednesday: 'Rabu',
  Thursday: 'Kamis',
  Friday: 'Jumat',
  Saturday: 'Sabtu',
  Sunday: 'Minggu'
}

export function padTwo(value: number): string {
  return String(value).padStart(2, '0')
}

/**
 * Weeks of a month as `YYYY-MM-DD` strings, `null` for padding cells.
 * `month` is 1-12.
 */
export function buildCalendarWeeks(month: number, year: number): (string | null)[][] {
  const firstDow = new Date(year, month - 1, 1).getDay()
  const startOffset = (firstDow + 6) % 7 // JS weeks start Sunday; ours start Monday.
  const daysInMonth = new Date(year, month, 0).getDate()

  const cells: (string | null)[] = Array(startOffset).fill(null)
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(`${year}-${padTwo(month)}-${padTwo(day)}`)
  }
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks: (string | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  return weeks
}

export function dayNumber(dateStr: string): number {
  return Number(dateStr.slice(8, 10))
}

/** "2026-10" → {month: 10, year: 2026} */
export function parseMonthKey(key: string): { month: number; year: number } {
  const [year, month] = key.split('-').map(Number)
  return { month, year }
}

export function monthKey(month: number, year: number): string {
  return `${year}-${padTwo(month)}`
}

export function shiftMonth(key: string, delta: number): string {
  const { month, year } = parseMonthKey(key)
  const date = new Date(year, month - 1 + delta, 1)
  return monthKey(date.getMonth() + 1, date.getFullYear())
}

export function currentMonthKey(): string {
  const now = new Date()
  return monthKey(now.getMonth() + 1, now.getFullYear())
}

export function todayStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${padTwo(now.getMonth() + 1)}-${padTwo(now.getDate())}`
}

const LONG_DATE = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric'
})

const SHORT_DATE = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' })

/** "Senin, 6 Oktober 2026" */
export function formatLongDate(dateStr: string): string {
  return LONG_DATE.format(new Date(`${dateStr}T12:00:00`))
}

/** "6 Okt" */
export function formatShortDate(dateStr: string): string {
  return SHORT_DATE.format(new Date(`${dateStr}T12:00:00`))
}

export const rupiah = (value: number): string => 'Rp ' + value.toLocaleString('id-ID')
