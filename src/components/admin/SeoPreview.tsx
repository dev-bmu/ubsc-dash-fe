import { SITE_URL } from '@/config/site'
import { cn } from '@/lib/utils'
import { SEO_LIMITS, SITE_NAME } from '@/types/contracts/seo'

// ===== Bagian UI SEO bersama: form artikel (news) dan halaman SEO Halaman (seo-pages) =====

// Ambang "hijau" meta deskripsi. Di bawahnya (>= SEO_LIMITS.descriptionMin) masih layak tapi kurang padat.
const DESCRIPTION_GOOD_MIN = 120

type SeoField = 'title' | 'description'
type Tone = 'empty' | 'good' | 'warn' | 'bad'

/** Potong di batas kata + '…', kira-kira seperti Google memotong judul/deskripsi hasil pencarian. */
export function truncateText(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max - 1)
  const space = cut.lastIndexOf(' ')
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`
}

/** Judul: hijau <= 60, kuning 61–70, merah > 70. Deskripsi: hijau 120–160, kuning 70–119 / > 160, merah < 70. */
export function seoLengthTone(field: SeoField, length: number): Tone {
  if (length === 0) return 'empty'
  if (field === 'title') return length <= SEO_LIMITS.titleIdeal ? 'good' : length <= SEO_LIMITS.titleIdeal + 10 ? 'warn' : 'bad'
  if (length < SEO_LIMITS.descriptionMin) return 'bad'
  return length >= DESCRIPTION_GOOD_MIN && length <= SEO_LIMITS.descriptionIdeal ? 'good' : 'warn'
}

const TONE_CLASS: Record<Tone, string> = {
  empty: 'border-slate-200 bg-slate-50 text-slate-400',
  good: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warn: 'border-amber-200 bg-amber-50 text-amber-700',
  bad: 'border-rose-200 bg-rose-50 text-rose-600'
}

export function SeoCharCount({ field, length }: { field: SeoField; length: number }) {
  const ideal = field === 'title' ? SEO_LIMITS.titleIdeal : SEO_LIMITS.descriptionIdeal
  return (
    <span className={cn('rounded-full border px-2.5 py-1 font-bdo text-[10px] font-bold', TONE_CLASS[seoLengthTone(field, length)])}>
      {length}/{ideal}
    </span>
  )
}

/** Pratinjau hasil Google. `path` relatif ('/berita/slug'), ditampilkan seperti breadcrumb Google. */
export function SerpPreview({ title, path, description }: { title: string; path: string; description: string }) {
  const crumbs = [SITE_URL.replace(/^https?:\/\//, ''), ...path.split('/').filter(Boolean)]

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 font-[Arial,sans-serif]">
      <p className="mb-2 font-bdo text-[9px] font-bold tracking-wider text-slate-400 uppercase">Pratinjau Google</p>
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-600">
          UB
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[13px] text-slate-800">{SITE_NAME}</p>
          <p className="truncate text-[12px] text-slate-500">{crumbs.join(' › ')}</p>
        </div>
      </div>
      <p className="mt-2 text-lg leading-snug text-[#1a0dab]">{truncateText(title, SEO_LIMITS.titleIdeal)}</p>
      <p className="mt-1 text-[13px] leading-5 text-slate-600">{truncateText(description, SEO_LIMITS.descriptionIdeal)}</p>
    </div>
  )
}
