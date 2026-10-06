'use client'

import '../news.css'

import Link from 'next/link'
import {
  Archive,
  ArrowUpRight,
  BadgeCheck,
  Bookmark,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
  Edit3,
  Eye,
  FileText,
  Filter,
  Layers3,
  Megaphone,
  Newspaper,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Tag,
  Trash2,
  X
} from 'lucide-react'
import { type ButtonHTMLAttributes, type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { routes } from '@/config/routes'
import { articleUrl } from '@/config/site'
import {
  useCreateInfoBanner,
  useCreateNewsCategory,
  useDeleteInfoBanner,
  useDeleteNews,
  useDeleteNewsCategory,
  useNewsIndex,
  useReorderInfoBanners,
  useUpdateInfoBanner,
  useUpdateNewsCategory
} from '@/hooks/api/useNews'
import { extractApiError, fieldErrorMap } from '@/lib/apiError'
import { cn } from '@/lib/utils'
import type { AdminNewsCategoryDto, AdminNewsDto, InfoBannerDto, NewsStatus } from '@/types/contracts/contracts'

// ===== Admin News (Fase 8F) — port 1:1 dari Laravel Pages/Admin/News/Index.tsx =====
// Data: useNewsIndex() (pengganti props Inertia news/categories/info_banners). Mutasi: hooks @/hooks/api/useNews.
// Sumber tidak merender banner flash inline → umpan balik memakai toast (sonner) dengan teks flash Laravel.
// CSS sumber (Index.css) dipindah ke ../news.css dan di-scope ke .ubsc-page-news (penanda ada di <main>).

type StatusFilter = NewsStatus | 'all'
type BannerModalState = {
  open: boolean
  editing: InfoBannerDto | null
}
type NewsAuthor = AdminNewsDto['author']

const STATUS_META: Record<
  NewsStatus,
  {
    label: string
    tone: string
    dot: string
    icon: typeof FileText
  }
> = {
  published: {
    label: 'Terbit',
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-500',
    icon: BadgeCheck
  },
  draft: {
    label: 'Draft',
    tone: 'border-slate-200 bg-slate-100 text-slate-600',
    dot: 'bg-slate-400',
    icon: Clock3
  },
  archived: {
    label: 'Arsip',
    tone: 'border-[#FFD5CD] bg-[#FFF1EE] text-[#B93D2A]',
    dot: 'bg-[#E35336]',
    icon: Archive
  }
}

const FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'Semua' },
  { value: 'published', label: 'Terbit' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Arsip' }
]

const ARTICLE_PAGE_SIZE = 6

function statusLabel(status: NewsStatus): string {
  return STATUS_META[status]?.label ?? status
}

function getInitials(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'NA'
  )
}

function getPercent(part: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((part / total) * 100)
}

function getWidthClass(percent: number): string {
  const rounded = Math.max(0, Math.min(100, Math.round(percent / 5) * 5))
  return `news-w-${rounded}`
}

// Logika sumber dipertahankan apa adanya; DTO sudah menyediakan avatarUrl siap pakai, sedangkan
// nilai `avatar` relatif akan menunjuk /storage/... (tidak ada di Next) → fallback inisial via onError.
function resolveAvatarUrl(author: NewsAuthor): string | null {
  if (author.avatar) {
    if (author.avatar.startsWith('http') || author.avatar.startsWith('/')) {
      return author.avatar
    }

    return `/storage/${author.avatar}`
  }

  return author.avatarUrl ?? null
}

function ShinyTextBlack({ text, speed = 4, className = '' }: { text: string; speed?: number; className?: string }) {
  return <span className={cn('animate-shiny-black', `shiny-speed-${speed}`, className)}>{text}</span>
}

function ShinyText({ text, speed = 3, className = '' }: { text: string; speed?: number; className?: string }) {
  return <span className={cn('animate-shiny-text', `shiny-speed-${speed}`, className)}>{text}</span>
}

function ShinyIcon({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-[15px]',
        'border border-white/20 bg-linear-to-br from-[#E35336] to-[#8f2c21]',
        'text-white shadow-[0_18px_32px_-24px_rgba(227,83,54,.82),inset_0_1px_0_rgba(255,255,255,.22)]',
        className
      )}
    >
      {children}
      <span className="pointer-events-none absolute top-1 right-2 left-2 h-1 rounded-full bg-white/25 blur-[1px]" />
    </div>
  )
}

function StatusBadge({ status }: { status: NewsStatus }) {
  const meta = STATUS_META[status]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1',
        'font-bdo text-[10px] font-bold tracking-wide uppercase',
        meta.tone
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  )
}

function ActionButton({ children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-[34px] w-[34px] items-center justify-center rounded-xl border text-sm',
        'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

function NewsRowActions({ article }: { article: AdminNewsDto }) {
  const deleteNews = useDeleteNews()

  const handleDelete = async () => {
    if (!confirm(`Hapus artikel "${article.title}"?`)) return

    try {
      await deleteNews.mutateAsync(article.id)
      toast.success('Article deleted.')
    } catch (error) {
      toast.error(extractApiError(error).message)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href={routes.newsEdit(article.id)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-950 hover:shadow-xs"
        aria-label={`Edit ${article.title}`}
      >
        <Pencil size={14} />
      </Link>
      <ActionButton
        disabled={deleteNews.isPending}
        onClick={handleDelete}
        className="border-rose-200 bg-rose-50 text-rose-500 hover:border-rose-300 hover:bg-rose-100"
        aria-label={`Hapus ${article.title}`}
      >
        <Trash2 size={14} />
      </ActionButton>
    </div>
  )
}

function AuthorAvatar({ author, size = 'md' }: { author: NewsAuthor; size?: 'sm' | 'md' | 'lg' }) {
  const [failed, setFailed] = useState(false)
  const avatarUrl = resolveAvatarUrl(author)
  const sizeClass = size === 'lg' ? 'h-12 w-12' : size === 'sm' ? 'h-8 w-8' : 'h-10 w-10'
  const textClass = size === 'lg' ? 'text-sm' : 'text-[11px]'

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-2xl border border-white bg-[#FFF1EE]',
        'shadow-[0_12px_24px_-18px_rgba(227,83,54,.88),inset_0_1px_0_rgba(255,255,255,.7)]',
        sizeClass
      )}
    >
      {avatarUrl && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatar penulis dari URL media dinamis (bukan aset statis Next), butuh onError fallback inisial
        <img src={avatarUrl} alt={author.name} onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        <div
          className={cn(
            'flex h-full w-full items-center justify-center bg-linear-to-br from-[#F8B5A8] to-[#E35336] font-clash font-semibold text-white',
            textClass
          )}
        >
          {getInitials(author.name)}
        </div>
      )}
    </div>
  )
}

function NewsHero({
  total,
  published,
  draft,
  archived,
  featured
}: {
  total: number
  published: number
  draft: number
  archived: number
  featured: AdminNewsDto | null
}) {
  const statusBars = [
    {
      label: 'Terbit',
      value: published,
      percent: getPercent(published, total),
      icon: BadgeCheck,
      tone: 'text-emerald-700',
      iconBox: 'border-emerald-200 bg-emerald-50 text-emerald-600',
      rail: 'bg-emerald-100',
      fill: 'from-emerald-300 via-emerald-400 to-emerald-600',
      chip: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      edge: 'from-emerald-400 to-emerald-600'
    },
    {
      label: 'Draft',
      value: draft,
      percent: getPercent(draft, total),
      icon: Clock3,
      tone: 'text-slate-700',
      iconBox: 'border-slate-200 bg-slate-50 text-slate-600',
      rail: 'bg-slate-100',
      fill: 'from-slate-300 via-slate-400 to-slate-600',
      chip: 'border-slate-200 bg-slate-50 text-slate-600',
      edge: 'from-slate-300 to-slate-600'
    },
    {
      label: 'Arsip',
      value: archived,
      percent: getPercent(archived, total),
      icon: Archive,
      tone: 'text-[#B93D2A]',
      iconBox: 'border-[#FFD5CD] bg-[#FFF1EE] text-[#B93D2A]',
      rail: 'bg-[#FFF1EE]',
      fill: 'from-[#F8B5A8] via-[#E35336] to-[#B93D2A]',
      chip: 'border-[#FFD5CD] bg-[#FFF1EE] text-[#B93D2A]',
      edge: 'from-[#F8B5A8] to-[#B93D2A]'
    }
  ]
  const publishedPercent = getPercent(published, total)

  return (
    <section className="news-enter news-sheen relative overflow-hidden rounded-[24px] bg-linear-to-br from-[#E35336] via-[#B93D2A] to-[#8F2E20] p-3.5 text-white shadow-2xl shadow-[#F8B5A8]/40 sm:p-4">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-[#FFD5CD]/20 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-[repeating-linear-gradient(135deg,rgba(255,255,255,.075)_0,rgba(255,255,255,.075)_1px,transparent_1px,transparent_18px)]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,.075)_0,rgba(255,255,255,.075)_1px,transparent_1px,transparent_20px)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/45 to-transparent" />

      <div className="relative z-10 grid gap-3 xl:grid-cols-[minmax(0,1.18fr)_minmax(310px,.78fr)]">
        <div className="flex min-w-0 flex-col justify-between gap-3">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3 py-1.5 font-bdo text-[10px] font-bold tracking-wide text-white uppercase shadow-xs backdrop-blur-sm">
                <span className="news-live-dot h-1.5 w-1.5 rounded-full bg-white text-white" />
                Editorial CMS
              </span>
              <span className="inline-flex rounded-full border border-white/20 bg-white px-3 py-1.5 font-bdo text-[10px] font-bold tracking-wide text-[#B93D2A] uppercase shadow-xs">
                {total} artikel
              </span>
            </div>

            <div className="max-w-3xl">
              <p className="font-bdo text-[11px] font-bold tracking-[0.2em] text-[#FFD5CD] uppercase">News & Article Control</p>
              <h1 className="mt-2 font-clash text-[1.86rem] leading-[.92] font-bold tracking-tight uppercase sm:text-[2.35rem] lg:text-[2.85rem]">
                <ShinyText text="Editorial Desk" speed={4} />
              </h1>
              <p className="mt-2.5 max-w-2xl font-bdo text-xs leading-5 font-medium text-white/75 sm:text-sm">
                Kelola berita, artikel, kategori, penulis, dan info banner dengan ruang kerja yang lebih padat, terang, dan cepat dipahami.
              </p>
            </div>
          </div>

          <div className="grid max-w-3xl gap-2.5 md:grid-cols-[minmax(0,1fr)_198px]">
            <div className="rounded-[18px] border border-white/15 p-2.5 backdrop-blur-xl">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="font-bdo text-[10px] font-bold tracking-widest text-[#FFD5CD] uppercase">Publikasi aktif</p>
                <span className="rounded-full bg-white px-2.5 py-1 font-bdo text-[10px] font-bold text-[#B93D2A]">{publishedPercent}% live</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
                <div className={cn('h-full rounded-full bg-white', getWidthClass(publishedPercent))} />
              </div>
              <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
                {statusBars.map((item) => {
                  const Icon = item.icon

                  return (
                    <div
                      key={item.label}
                      className="group relative overflow-hidden rounded-[18px] border border-white/70 bg-white p-2.5 text-slate-950 shadow-[0_18px_34px_-30px_rgba(15,23,42,.55)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_42px_-32px_rgba(15,23,42,.65)]"
                    >
                      <div className={cn('pointer-events-none absolute inset-x-4 top-0 h-[3px] rounded-b-full bg-linear-to-r', item.edge)} />
                      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-[repeating-linear-gradient(90deg,rgba(15,23,42,.035)_0,rgba(15,23,42,.035)_1px,transparent_1px,transparent_10px)] opacity-70" />

                      <div className="relative z-10 flex items-start justify-between gap-2">
                        <div className={cn('flex h-8 w-8 items-center justify-center rounded-[14px] border shadow-xs', item.iconBox)}>
                          <Icon size={15} />
                        </div>
                        <span className={cn('rounded-full border px-2 py-1 font-bdo text-[10px] font-bold tabular-nums', item.chip)}>
                          {item.percent}%
                        </span>
                      </div>

                      <div className="relative z-10 mt-3">
                        <p className={cn('font-clash text-[1.55rem] leading-none font-bold tabular-nums', item.tone)}>{item.value}</p>
                        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={cn(
                              'h-full rounded-full bg-linear-to-r transition-[width] duration-700',
                              item.fill,
                              getWidthClass(Math.max(6, item.percent))
                            )}
                          />
                        </div>
                        <div className="mt-2.5 flex items-center justify-between gap-2">
                          <p className="font-bdo text-[10px] font-bold tracking-wide text-slate-500 uppercase">{item.label}</p>
                          <p className="font-bdo text-[10px] font-semibold text-slate-400">
                            {item.value}/{total}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <Link
              href={routes.newsCreate()}
              className="group flex min-h-[104px] flex-col justify-between rounded-[18px] border border-white/15 bg-white p-3 text-[#B93D2A] shadow-[0_18px_38px_-28px_rgba(15,23,42,.42)] transition hover:-translate-y-1"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-[15px] bg-[#FFF1EE] ring-1 ring-[#FFD5CD]">
                <Plus size={16} />
              </span>
              <span>
                <span className="block font-clash text-base font-semibold text-slate-950">Tulis artikel baru</span>
                <span className="mt-1 block font-bdo text-xs font-semibold text-slate-500">Masuk ke editor publikasi.</span>
              </span>
            </Link>
          </div>
        </div>

        <div className="news-card-glint grid overflow-hidden rounded-[22px] border border-white/20 bg-white p-2.5 text-slate-950 shadow-[0_26px_52px_-36px_rgba(15,23,42,.55)] sm:grid-cols-[minmax(156px,.42fr)_minmax(0,1fr)] sm:gap-3 xl:block">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#FFD5CD] px-3 py-1.5 font-bdo text-[10px] font-bold tracking-wide text-[#B93D2A] uppercase shadow-xs backdrop-blur-sm">
                <Sparkles size={12} />
                Spotlight
              </span>
              {featured && <StatusBadge status={featured.status} />}
            </div>

            <div className="relative h-[112px] overflow-hidden rounded-[16px] bg-[linear-gradient(135deg,#FFF1EE,#F0F9FF)] ring-1 ring-slate-200/80 sm:h-full sm:min-h-[136px] xl:h-[118px] xl:min-h-0">
              {featured?.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element -- thumbnail artikel dari URL media dinamis (bukan aset statis Next)
                <img src={featured.thumbnail} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-[linear-gradient(135deg,#FFF1EE,#F0F9FF),repeating-linear-gradient(90deg,rgba(227,83,54,.08)_0,rgba(227,83,54,.08)_1px,transparent_1px,transparent_18px)]" />
              )}
              <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-white/20 via-transparent to-transparent" />
            </div>
          </div>

          <div className="flex min-w-0 flex-col justify-between gap-2 pt-2.5 sm:pt-1 xl:pt-2.5">
            <div>
              <p className="font-bdo text-[10px] font-bold tracking-wide text-slate-400 uppercase">Artikel terbaru</p>
              {featured && (
                <div className="mt-2 flex items-center gap-2 rounded-[16px] border border-slate-100 bg-slate-50 p-1.5">
                  <AuthorAvatar author={featured.author} size="sm" />
                  <div className="min-w-0">
                    <p className="font-bdo text-[10px] font-bold tracking-wide text-slate-400 uppercase">Penulis</p>
                    <p className="min-w-0 truncate font-clash text-sm font-semibold text-slate-900">{featured.author.name}</p>
                  </div>
                </div>
              )}
              <h2 className="mt-2 line-clamp-2 font-clash text-base leading-[1.08] font-bold text-slate-950 sm:text-lg sm:leading-7 xl:text-[1.05rem]">
                {featured?.title ?? 'Belum ada artikel'}
              </h2>
              <p className="mt-2 line-clamp-2 font-bdo text-xs leading-5 text-slate-500 sm:text-sm">
                {featured?.excerpt ?? 'Artikel pertama akan muncul di sini setelah dibuat.'}
              </p>
            </div>

            {featured && (
              <Link
                href={routes.newsEdit(featured.id)}
                className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#FFD5CD] bg-[#FFF1EE] px-3 py-2 font-clash text-xs font-semibold text-[#B93D2A] transition hover:border-[#F8B5A8] hover:bg-[#FFE5DE]"
              >
                <Edit3 size={13} />
                Edit artikel
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function MetricCard({
  title,
  value,
  note,
  icon: Icon,
  accent,
  delay
}: {
  title: string
  value: string | number
  note: string
  icon: typeof FileText
  accent: string
  delay: string
}) {
  return (
    <div
      className={cn(
        'news-scale news-card-glint relative min-h-[118px] overflow-hidden rounded-[20px] border bg-white p-3.5 shadow-xs',
        'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_44px_-32px_rgba(15,23,42,.42)]',
        accent,
        delay
      )}
    >
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-linear-to-r from-transparent via-white/80 to-transparent" />
      <div className="pointer-events-none absolute -top-12 -right-10 h-24 w-24 rounded-full bg-current opacity-[0.06] blur-2xl" />
      <div className="relative z-10 flex h-full flex-col justify-between gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[15px] border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,.85)]">
            <Icon className="h-4 w-4" />
          </div>
          <ArrowUpRight className="h-4 w-4 opacity-35" />
        </div>
        <div>
          <p className="font-clash text-[1.65rem] leading-none font-bold tracking-tight text-slate-950">{value}</p>
          <p className="mt-1.5 font-bdo text-[11px] font-semibold text-slate-600">{title}</p>
          <p className="mt-1 font-bdo text-[11px] font-medium text-slate-400">{note}</p>
        </div>
      </div>
    </div>
  )
}

function EditorialMetrics({
  total,
  published,
  draft,
  archived,
  activeBanners
}: {
  total: number
  published: number
  draft: number
  archived: number
  activeBanners: number
}) {
  return (
    <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        title="Total Artikel"
        value={total}
        note={`${published} sudah terbit`}
        icon={Newspaper}
        accent="border-[#FFD5CD] bg-[#FFF7F4] text-[#B93D2A]"
        delay="delay-50"
      />
      <MetricCard
        title="Draft Editorial"
        value={draft}
        note={`${getPercent(draft, total)}% dari semua artikel`}
        icon={Clock3}
        accent="border-slate-200 bg-slate-50 text-slate-700"
        delay="delay-100"
      />
      <MetricCard
        title="Artikel Arsip"
        value={archived}
        note="Konten tidak tampil publik"
        icon={Archive}
        accent="border-[#FFD5CD] bg-[#FFF1EE] text-[#B93D2A]"
        delay="delay-150"
      />
      <MetricCard
        title="Banner Aktif"
        value={activeBanners}
        note="Info berjalan di halaman publik"
        icon={Megaphone}
        accent="border-sky-200 bg-sky-50 text-sky-700"
        delay="delay-200"
      />
    </section>
  )
}

function CategoryManager({ categories, isLoading }: { categories: AdminNewsCategoryDto[]; isLoading: boolean }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [createName, setCreateName] = useState('')
  const createCategory = useCreateNewsCategory()
  const updateCategory = useUpdateNewsCategory()
  const removeCategory = useDeleteNewsCategory()
  const maxCount = Math.max(...categories.map((category) => category.newsCount ?? 0), 1)

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault()

    try {
      await createCategory.mutateAsync({ name: createName })
      setCreateName('')
      toast.success('Category created.')
    } catch (error) {
      toast.error(fieldErrorMap(error).name ?? extractApiError(error).message)
    }
  }

  const startEdit = (category: AdminNewsCategoryDto) => {
    setEditingId(category.id)
    setEditingName(category.name)
  }

  const submitEdit = async (event: FormEvent) => {
    event.preventDefault()
    if (!editingId) return

    try {
      await updateCategory.mutateAsync({ id: editingId, payload: { name: editingName } })
      setEditingId(null)
      setEditingName('')
      toast.success('Category updated.')
    } catch (error) {
      toast.error(fieldErrorMap(error).name ?? extractApiError(error).message)
    }
  }

  const deleteCategory = async (category: AdminNewsCategoryDto) => {
    if (!confirm(`Hapus kategori "${category.name}"? Artikel di dalamnya akan menjadi tanpa kategori.`)) return

    try {
      await removeCategory.mutateAsync(category.id)
      toast.success('Category deleted.')
    } catch (error) {
      toast.error(extractApiError(error).message)
    }
  }

  return (
    <section className="news-enter news-card-glint relative overflow-hidden rounded-[22px] border border-[#FFE0D8] bg-white p-3.5 shadow-[0_18px_42px_-36px_rgba(185,61,42,.48)] delay-150 sm:p-4">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-linear-to-b from-[#FFF7F4] to-transparent" />
      <div className="pointer-events-none absolute inset-y-6 left-0 w-[3px] rounded-r-full bg-linear-to-b from-[#F8B5A8] via-[#E35336] to-transparent" />
      <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <ShinyIcon className="h-10 w-10">
            <Layers3 className="h-[18px] w-[18px]" />
          </ShinyIcon>
          <div>
            <p className="font-bdo text-[10px] font-bold tracking-widest text-slate-400 uppercase">Klasifikasi</p>
            <h2 className="font-clash text-lg leading-tight font-semibold text-slate-950">Kategori Berita</h2>
          </div>
        </div>

        <form onSubmit={submitCreate} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:min-w-[300px]">
          <input
            value={createName}
            onChange={(event) => setCreateName(event.target.value)}
            placeholder="Kategori baru"
            aria-label="Nama kategori baru"
            title="Nama kategori baru"
            className="news-input h-10 min-w-0 rounded-[16px] px-3.5 font-bdo text-sm placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={createCategory.isPending || !createName.trim()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[16px] bg-[#E35336] px-4 font-clash text-sm font-semibold text-white shadow-[0_14px_26px_-20px_rgba(227,83,54,.85)] transition hover:bg-[#B93D2A] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Tambah</span>
          </button>
        </form>
      </div>

      <div className="news-scrollbar relative z-10 mt-4 grid max-h-[318px] gap-2.5 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
        {categories.length === 0 ? (
          isLoading ? null : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center font-bdo text-sm text-slate-400 md:col-span-2 xl:col-span-3">
              Belum ada kategori.
            </div>
          )
        ) : (
          categories.map((category) => {
            const count = category.newsCount ?? 0
            const width = Math.max(8, (count / maxCount) * 100)

            return (
              <div
                key={category.id}
                className="rounded-[17px] border border-slate-200/80 bg-slate-50/70 p-3 transition hover:-translate-y-0.5 hover:border-[#F8B5A8] hover:bg-white hover:shadow-[0_16px_32px_-28px_rgba(185,61,42,.54)]"
              >
                {editingId === category.id ? (
                  <form onSubmit={submitEdit} className="flex items-center gap-2">
                    <input
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      aria-label={`Edit kategori ${category.name}`}
                      title={`Edit kategori ${category.name}`}
                      className="news-input h-10 min-w-0 flex-1 rounded-xl px-3 font-bdo text-sm"
                      autoFocus
                    />
                    <ActionButton
                      type="submit"
                      className="border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                      aria-label="Simpan kategori"
                    >
                      <CheckCircle2 size={14} />
                    </ActionButton>
                    <ActionButton
                      onClick={() => setEditingId(null)}
                      className="border-slate-200 bg-white text-slate-500 hover:bg-slate-100"
                      aria-label="Batal edit kategori"
                    >
                      <X size={14} />
                    </ActionButton>
                  </form>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="line-clamp-1 font-clash text-sm font-semibold text-slate-900">{category.name}</p>
                        <p className="mt-1 font-bdo text-[11px] text-slate-400">{count} artikel</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ActionButton
                          onClick={() => startEdit(category)}
                          className="h-8 w-8 border-slate-200 bg-white text-slate-500 hover:text-slate-950"
                          aria-label={`Edit kategori ${category.name}`}
                        >
                          <Pencil size={13} />
                        </ActionButton>
                        <ActionButton
                          onClick={() => deleteCategory(category)}
                          className="h-8 w-8 border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100"
                          aria-label={`Hapus kategori ${category.name}`}
                        >
                          <Trash2 size={13} />
                        </ActionButton>
                      </div>
                    </div>
                    <div className="mt-4 h-2 rounded-full bg-white ring-1 ring-slate-200/70">
                      <div className={cn('h-full rounded-full bg-linear-to-r from-[#E35336] to-[#F8B5A8]', getWidthClass(width))} />
                    </div>
                  </>
                )}
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}

function BannerModal({ state, onClose }: { state: BannerModalState; onClose: () => void }) {
  const [data, setData] = useState({ message: '', isActive: true, sortOrder: 0 })
  const createBanner = useCreateInfoBanner()
  const updateBanner = useUpdateInfoBanner()
  const processing = createBanner.isPending || updateBanner.isPending

  useEffect(() => {
    if (!state.open) return

    setData({
      message: state.editing?.message ?? '',
      isActive: state.editing?.isActive ?? true,
      sortOrder: state.editing?.sortOrder ?? 0
    })
  }, [state.open, state.editing])

  if (!state.open) return null

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const payload = { message: data.message, isActive: data.isActive, sortOrder: data.sortOrder }

    try {
      if (state.editing) {
        await updateBanner.mutateAsync({ id: state.editing.id, payload })
        toast.success('Banner updated.')
      } else {
        await createBanner.mutateAsync(payload)
        toast.success('Banner created.')
      }

      setData({ message: '', isActive: true, sortOrder: 0 })
      onClose()
    } catch (error) {
      toast.error(fieldErrorMap(error).message ?? extractApiError(error).message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#7A2F23]/20 px-3 py-4 backdrop-blur-xs sm:items-center">
      <form onSubmit={submit} className="news-card-glint w-full max-w-lg overflow-hidden rounded-[24px] border border-white/60 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <ShinyIcon className="h-10 w-10">
              <Megaphone className="h-4 w-4" />
            </ShinyIcon>
            <div>
              <p className="font-bdo text-[10px] font-bold tracking-widest text-slate-400 uppercase">Info Banner</p>
              <h3 className="font-clash text-base font-semibold text-slate-950">{state.editing ? 'Edit Banner' : 'Banner Baru'}</h3>
            </div>
          </div>
          <ActionButton onClick={onClose} className="border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100" aria-label="Tutup modal banner">
            <X size={15} />
          </ActionButton>
        </div>

        <div className="space-y-4 p-5">
          <label className="block">
            <span className="mb-1.5 block font-bdo text-[11px] font-bold tracking-wide text-slate-500 uppercase">Pesan Banner</span>
            <textarea
              value={data.message}
              onChange={(event) => setData((current) => ({ ...current, message: event.target.value }))}
              rows={4}
              className="news-input w-full resize-none rounded-2xl px-4 py-3 font-bdo text-sm leading-6"
              placeholder="Tulis pesan singkat untuk pengunjung..."
              aria-label="Pesan info banner"
              title="Pesan info banner"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
            <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span>
                <span className="block font-clash text-sm font-semibold text-slate-900">Status Aktif</span>
                <span className="block font-bdo text-[11px] text-slate-400">Tampil di publik</span>
              </span>
              <input
                type="checkbox"
                checked={data.isActive}
                onChange={(event) => setData((current) => ({ ...current, isActive: event.target.checked }))}
                className="h-5 w-5 rounded border-slate-300 text-[#E35336] focus:ring-[#E35336]"
                aria-label="Status aktif info banner"
                title="Status aktif info banner"
              />
            </label>
            <label>
              <span className="mb-1.5 block font-bdo text-[11px] font-bold tracking-wide text-slate-500 uppercase">Urutan</span>
              <input
                type="number"
                min={0}
                value={data.sortOrder}
                onChange={(event) => setData((current) => ({ ...current, sortOrder: Number(event.target.value) }))}
                className="news-input h-12 w-full rounded-2xl px-4 font-bdo text-sm"
                aria-label="Urutan info banner"
                title="Urutan info banner"
              />
            </label>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 font-clash text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={processing || !data.message.trim()}
            className="news-sheen inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#E35336] px-5 font-clash text-sm font-semibold text-white shadow-[0_14px_26px_-20px_rgba(227,83,54,.9)] transition hover:bg-[#B93D2A] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle2 size={15} />
            {processing ? 'Menyimpan...' : 'Simpan Banner'}
          </button>
        </div>
      </form>
    </div>
  )
}

function BannerPanel({
  banners,
  isLoading,
  onCreate,
  onEdit
}: {
  banners: InfoBannerDto[]
  isLoading: boolean
  onCreate: () => void
  onEdit: (banner: InfoBannerDto) => void
}) {
  const reorderBanners = useReorderInfoBanners()
  const updateBanner = useUpdateInfoBanner()
  const removeBanner = useDeleteInfoBanner()

  const moveBanner = async (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= banners.length) return

    const reordered = [...banners]
    const [item] = reordered.splice(index, 1)
    reordered.splice(target, 0, item)

    try {
      await reorderBanners.mutateAsync(reordered.map((banner) => banner.id))
    } catch (error) {
      toast.error(extractApiError(error).message)
    }
  }

  const toggleBanner = async (banner: InfoBannerDto) => {
    try {
      await updateBanner.mutateAsync({
        id: banner.id,
        payload: {
          message: banner.message,
          isActive: !banner.isActive,
          sortOrder: banner.sortOrder
        }
      })
      toast.success('Banner updated.')
    } catch (error) {
      toast.error(extractApiError(error).message)
    }
  }

  const deleteBanner = async (banner: InfoBannerDto) => {
    if (!confirm('Hapus info banner ini?')) return

    try {
      await removeBanner.mutateAsync(banner.id)
      toast.success('Banner deleted.')
    } catch (error) {
      toast.error(extractApiError(error).message)
    }
  }

  return (
    <section className="news-enter news-card-glint relative overflow-hidden rounded-[22px] border border-[#FFE0D8] bg-white p-3.5 shadow-[0_18px_42px_-36px_rgba(185,61,42,.48)] delay-200 sm:p-4">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-linear-to-b from-[#FFF7F4] to-transparent" />
      <div className="pointer-events-none absolute inset-y-6 left-0 w-[3px] rounded-r-full bg-linear-to-b from-[#F8B5A8] via-[#E35336] to-transparent" />
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <ShinyIcon className="h-10 w-10">
            <Megaphone className="h-[18px] w-[18px]" />
          </ShinyIcon>
          <div>
            <p className="font-bdo text-[10px] font-bold tracking-widest text-slate-400 uppercase">Publikasi Cepat</p>
            <h2 className="font-clash text-lg leading-tight font-semibold text-slate-950">Info Banner</h2>
          </div>
        </div>

        <button
          type="button"
          onClick={onCreate}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-[16px] border border-[#FFD5CD] bg-[#FFF1EE] px-4 font-clash text-sm font-semibold text-[#B93D2A] transition hover:-translate-y-0.5 hover:border-[#F8B5A8] hover:bg-[#FFE5DE]"
        >
          <Plus size={14} />
          Banner
        </button>
      </div>

      <div className="news-scrollbar relative z-10 mt-4 max-h-[318px] space-y-2.5 overflow-y-auto pr-1">
        {banners.length === 0 ? (
          isLoading ? null : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center font-bdo text-sm text-slate-400">
              Belum ada info banner.
            </div>
          )
        ) : (
          banners.map((banner, index) => (
            <div
              key={banner.id}
              className="grid gap-3 rounded-[17px] border border-slate-200/80 bg-slate-50/70 p-3 transition hover:border-[#F8B5A8] hover:bg-white hover:shadow-[0_16px_32px_-28px_rgba(185,61,42,.5)] sm:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-bdo text-[10px] font-bold tracking-wide uppercase',
                      banner.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'
                    )}
                  >
                    <span className={cn('h-1.5 w-1.5 rounded-full', banner.isActive ? 'bg-emerald-500' : 'bg-slate-300')} />
                    {banner.isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-1 font-bdo text-[10px] font-bold text-slate-400 ring-1 ring-slate-200">
                    #{index + 1}
                  </span>
                </div>
                <p className="line-clamp-2 font-bdo text-sm leading-6 font-medium text-slate-700">{banner.message}</p>
              </div>

              <div className="flex items-center gap-1.5 sm:justify-end">
                <ActionButton
                  disabled={index === 0}
                  onClick={() => moveBanner(index, -1)}
                  className="border-slate-200 bg-white text-slate-500 hover:text-slate-950"
                  aria-label="Naikkan urutan banner"
                >
                  <ChevronUp size={14} />
                </ActionButton>
                <ActionButton
                  disabled={index === banners.length - 1}
                  onClick={() => moveBanner(index, 1)}
                  className="border-slate-200 bg-white text-slate-500 hover:text-slate-950"
                  aria-label="Turunkan urutan banner"
                >
                  <ChevronDown size={14} />
                </ActionButton>
                <ActionButton
                  onClick={() => toggleBanner(banner)}
                  className={cn(
                    banner.isActive
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                      : 'border-[#FFD5CD] bg-[#FFF1EE] text-[#B93D2A] hover:bg-[#FFE5DE]'
                  )}
                  aria-label={banner.isActive ? 'Nonaktifkan banner' : 'Aktifkan banner'}
                >
                  <Eye size={14} />
                </ActionButton>
                <ActionButton
                  onClick={() => onEdit(banner)}
                  className="border-slate-200 bg-white text-slate-500 hover:text-slate-950"
                  aria-label="Edit info banner"
                >
                  <Pencil size={14} />
                </ActionButton>
                <ActionButton
                  onClick={() => deleteBanner(banner)}
                  className="border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100"
                  aria-label="Hapus info banner"
                >
                  <Trash2 size={14} />
                </ActionButton>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

// Indikator ringan: noindex menang; selain itu cukup cek meta deskripsi manual (judul selalu ada).
function SeoBadge({ article }: { article: AdminNewsDto }) {
  const [label, tone] = article.noindex
    ? ['noindex', 'border-slate-200 bg-slate-100 text-slate-500']
    : article.metaDescription
      ? ['SEO ok', 'border-emerald-200 bg-emerald-50 text-emerald-700']
      : ['SEO perlu dicek', 'border-amber-200 bg-amber-50 text-amber-700']

  return <span className={cn('rounded-full border px-2 py-0.5 font-bdo text-[9px] font-bold tracking-wide uppercase', tone)}>{label}</span>
}

function ArticleCard({ article }: { article: AdminNewsDto }) {
  const categoryName = article.category?.name ?? 'Tanpa kategori'

  return (
    <article className="group news-card-glint relative overflow-hidden rounded-[22px] border border-[#FFE0D8] bg-[linear-gradient(180deg,#FFFFFF_0%,#FFF7F4_130%)] shadow-[0_14px_36px_-32px_rgba(185,61,42,.5)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#F8B5A8] hover:shadow-[0_28px_60px_-38px_rgba(185,61,42,.68)] sm:grid sm:grid-cols-[172px_minmax(0,1fr)] lg:block">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-linear-to-b from-[#FFF7F4] to-transparent" />
      <div className="pointer-events-none absolute top-0 right-0 h-28 w-28 bg-[repeating-linear-gradient(90deg,rgba(227,83,54,.06)_0,rgba(227,83,54,.06)_1px,transparent_1px,transparent_14px)]" />

      <div className="relative m-2.5 h-[142px] overflow-hidden rounded-[18px] bg-[#FFF7F4] ring-1 ring-[#FFE0D8] sm:h-[calc(100%-1.25rem)] sm:min-h-[184px] lg:aspect-video lg:h-auto lg:min-h-0">
        {article.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element -- thumbnail artikel dari URL media dinamis (bukan aset statis Next)
          <img src={article.thumbnail} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#FFF1EE,#F0F9FF),repeating-linear-gradient(90deg,rgba(227,83,54,.08)_0,rgba(227,83,54,.08)_1px,transparent_1px,transparent_18px)] text-[#E35336]/35">
            <Newspaper className="h-12 w-12" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-linear-to-t to-transparent" />
        <div className="absolute top-3 left-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-2">
          <StatusBadge status={article.status} />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/70 px-2.5 py-1 font-bdo text-[10px] font-bold tracking-wide text-slate-600 uppercase shadow-xs backdrop-blur-sm">
            <Tag size={11} />
            <span className="max-w-[140px] truncate">{categoryName}</span>
          </span>
        </div>
        <div className="absolute right-3 bottom-3 left-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bdo text-[10px] font-bold tracking-wide uppercase">Updated</p>
            <p className="truncate font-bdo text-xs font-semibold text-white">{article.updatedAt}</p>
          </div>
          <div className="rounded-2xl border border-white/50 p-1 backdrop-blur-sm">
            <AuthorAvatar author={article.author} size="sm" />
          </div>
        </div>
      </div>

      <div className="relative z-10 flex min-w-0 flex-col px-3.5 pt-1 pb-3.5 sm:py-3 sm:pr-3.5 lg:px-4 lg:pt-1.5 lg:pb-4">
        <div className="mb-2.5 flex items-center gap-2.5 rounded-[16px] border border-[#FFE0D8] p-2 shadow-xs">
          <AuthorAvatar author={article.author} size="md" />
          <div className="min-w-0">
            <p className="font-bdo text-[10px] font-bold tracking-wide text-slate-400 uppercase">Dipublikasikan oleh</p>
            <p className="truncate font-clash text-sm font-semibold text-slate-900">{article.author.name}</p>
            <p className="mt-0.5 truncate font-bdo text-[11px] font-semibold text-[#B93D2A]">
              {article.publishedAt ? 'Penulis publikasi' : 'Penulis editorial'}
            </p>
          </div>
        </div>

        <h3 className="line-clamp-2 font-clash text-[1.05rem] leading-[1.08] font-bold text-slate-950 sm:text-[1.16rem] lg:text-[1.05rem] xl:text-[1.16rem]">
          {article.title}
        </h3>
        <p className="mt-2 line-clamp-2 font-bdo text-xs leading-5 font-medium text-slate-500 sm:text-sm">{article.excerpt || article.slug}</p>

        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-[#FFE0D8] pt-3">
          <div className="min-w-0">
            <p className="truncate font-bdo text-[11px] font-bold tracking-wide text-[#B93D2A] uppercase">
              /{article.section}/{article.slug}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <SeoBadge article={article} />
              {article.status === 'published' && (
                <a
                  href={articleUrl(article.section, article.slug)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 font-bdo text-[10px] font-bold tracking-wide text-slate-500 uppercase hover:text-[#B93D2A]"
                  aria-label={`Lihat ${article.title} di situs`}
                >
                  Lihat
                  <ArrowUpRight size={11} />
                </a>
              )}
            </div>
          </div>
          <NewsRowActions article={article} />
        </div>
      </div>
    </article>
  )
}

function ArticleCollection({
  articles,
  categories,
  isLoading
}: {
  articles: AdminNewsDto[]
  categories: AdminNewsCategoryDto[]
  isLoading: boolean
}) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [category, setCategory] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)

  const filteredArticles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return articles.filter((article) => {
      const matchesStatus = status === 'all' || article.status === status
      const articleCategory = article.category?.id ? String(article.category.id) : 'uncat'
      const matchesCategory = category === 'all' || category === articleCategory
      const haystack = [
        article.title,
        article.slug,
        article.excerpt ?? '',
        article.category?.name ?? '',
        article.author.name,
        statusLabel(article.status)
      ]
        .join(' ')
        .toLowerCase()
      const matchesQuery = normalizedQuery.length === 0 || haystack.includes(normalizedQuery)

      return matchesStatus && matchesCategory && matchesQuery
    })
  }, [articles, category, query, status])

  useEffect(() => {
    setCurrentPage(1)
  }, [category, query, status])

  const pageCount = Math.max(1, Math.ceil(filteredArticles.length / ARTICLE_PAGE_SIZE))
  const safePage = Math.min(currentPage, pageCount)
  const pageStart = (safePage - 1) * ARTICLE_PAGE_SIZE
  const paginatedArticles = filteredArticles.slice(pageStart, pageStart + ARTICLE_PAGE_SIZE)
  const pageEnd = Math.min(pageStart + paginatedArticles.length, filteredArticles.length)

  return (
    <section className="news-enter news-card-glint relative overflow-hidden rounded-[22px] border border-[#FFE0D8] bg-white p-3 shadow-[0_20px_46px_-38px_rgba(185,61,42,.48)] delay-250 sm:p-4">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-b from-[#FFF7F4] to-transparent" />
      <div className="relative z-10 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <ShinyIcon className="h-10 w-10">
            <Newspaper className="h-[18px] w-[18px]" />
          </ShinyIcon>
          <div>
            <p className="font-bdo text-[10px] font-bold tracking-widest text-slate-400 uppercase">Arsip Editorial</p>
            <h2 className="font-clash text-base leading-tight font-semibold text-slate-950">Daftar Artikel</h2>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_auto_auto] xl:min-w-[660px]">
          <label className="news-input flex h-10 min-w-0 items-center gap-2 rounded-[16px] px-3.5">
            <Search size={15} className="shrink-0 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari artikel, slug, penulis..."
              aria-label="Cari artikel"
              title="Cari artikel"
              className="min-w-0 flex-1 border-0 bg-transparent p-0 font-bdo text-sm text-slate-700 outline-hidden placeholder:text-slate-400 focus:ring-0"
            />
          </label>

          <label className="news-input flex h-10 items-center gap-2 rounded-[16px] px-3 sm:col-span-1">
            <Filter size={14} className="shrink-0 text-slate-400" />
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as StatusFilter)}
              aria-label="Filter status artikel"
              title="Filter status artikel"
              className="min-w-0 border-0 bg-transparent p-0 font-bdo text-sm text-slate-700 outline-hidden focus:ring-0"
            >
              {FILTERS.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </label>

          <label className="news-input flex h-10 items-center gap-2 rounded-[16px] px-3 sm:col-span-2 lg:col-span-1">
            <Bookmark size={14} className="shrink-0 text-slate-400" />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              aria-label="Filter kategori artikel"
              title="Filter kategori artikel"
              className="min-w-0 border-0 bg-transparent p-0 font-bdo text-sm text-slate-700 outline-hidden focus:ring-0"
            >
              <option value="all">Semua kategori</option>
              <option value="uncat">Tanpa kategori</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="relative z-10 mt-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setStatus(filter.value)}
            className={cn(
              'rounded-full border px-2.5 py-1.5 font-bdo text-[10px] font-bold tracking-wide uppercase transition',
              status === filter.value
                ? 'border-[#E35336] bg-[#FFF1EE] text-[#B93D2A]'
                : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:bg-white'
            )}
          >
            {filter.label}
          </button>
        ))}
        <span className="ml-auto rounded-full bg-slate-100 px-3 py-1.5 font-bdo text-[11px] font-bold text-slate-500">
          {filteredArticles.length} hasil
        </span>
      </div>

      <div className="relative z-10 mt-4 grid gap-2.5 lg:grid-cols-2 2xl:grid-cols-3">
        {filteredArticles.length === 0 ? (
          isLoading ? null : (
            <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 p-8 text-center lg:col-span-2 2xl:col-span-3">
              <FileText className="mx-auto h-9 w-9 text-slate-300" />
              <p className="mt-3 font-clash text-base font-semibold text-slate-800">Artikel tidak ditemukan</p>
              <p className="mt-1 font-bdo text-sm text-slate-400">Coba ubah kata kunci atau filter.</p>
            </div>
          )
        ) : (
          paginatedArticles.map((article) => <ArticleCard key={article.id} article={article} />)
        )}
      </div>

      {filteredArticles.length > 0 && (
        <div className="relative z-10 mt-4 flex flex-col gap-3 rounded-[18px] border border-[#FFE0D8] bg-[#FFF7F4]/75 p-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-bdo text-xs font-semibold text-slate-500">
            Menampilkan {pageStart + 1}-{pageEnd} dari {filteredArticles.length} artikel
          </p>
          <div className="grid grid-cols-[36px_minmax(0,1fr)_36px] items-center gap-2 sm:flex">
            <ActionButton
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              className="border-slate-200 bg-white text-slate-500 hover:text-[#B93D2A]"
              aria-label="Halaman artikel sebelumnya"
            >
              <ChevronLeft size={15} />
            </ActionButton>
            <div className="flex h-9 min-w-[92px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3 font-bdo text-xs font-bold text-slate-600">
              {safePage} / {pageCount}
            </div>
            <ActionButton
              disabled={safePage >= pageCount}
              onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
              className="border-slate-200 bg-white text-slate-500 hover:text-[#B93D2A]"
              aria-label="Halaman artikel berikutnya"
            >
              <ChevronRight size={15} />
            </ActionButton>
          </div>
        </div>
      )}
    </section>
  )
}

export default function NewsIndex() {
  const { data, isLoading } = useNewsIndex()
  const news = useMemo(() => data?.news ?? [], [data])
  const categories = useMemo(() => data?.categories ?? [], [data])
  const infoBanners = useMemo(() => data?.infoBanners ?? [], [data])
  const [bannerModal, setBannerModal] = useState<BannerModalState>({ open: false, editing: null })

  const published = news.filter((article) => article.status === 'published').length
  const draft = news.filter((article) => article.status === 'draft').length
  const archived = news.filter((article) => article.status === 'archived').length
  const activeBanners = infoBanners.filter((banner) => banner.isActive).length
  const featured = news[0] ?? null

  return (
    <>
      <div className="px-4 pt-2 xl:px-8">
        <div className="news-enter flex flex-col gap-1 pt-3">
          <span className="font-bdo text-[11px] font-medium tracking-wide text-[#E35336]">Content Management</span>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            <div>
              <h1 className="font-clash text-2xl font-bold tracking-tight text-slate-900 uppercase xl:text-3xl">
                <ShinyTextBlack text="News & Articles" speed={5} />
              </h1>
              <p className="mt-1 font-bdo text-xs text-slate-400 sm:text-sm">Editorial hub untuk artikel, kategori, penulis, dan banner informasi.</p>
            </div>
            <Link
              href={routes.newsCreate()}
              className="news-sheen inline-flex h-10 w-full items-center justify-center gap-2 rounded-[16px] bg-[#E35336] px-5 font-clash text-sm font-semibold text-white shadow-[0_14px_28px_-20px_rgba(227,83,54,.85)] transition hover:-translate-y-0.5 hover:bg-[#B93D2A] sm:w-auto"
            >
              <Plus size={15} />
              Artikel Baru
            </Link>
          </div>
        </div>
      </div>

      <main className="ubsc-page-news max-w-full flex-1 px-4 pt-2 pb-10 xl:px-8">
        <BannerModal state={bannerModal} onClose={() => setBannerModal({ open: false, editing: null })} />

        <div className="flex flex-col gap-4 overflow-x-hidden pt-4 pb-16">
          <NewsHero total={news.length} published={published} draft={draft} archived={archived} featured={featured} />

          <EditorialMetrics total={news.length} published={published} draft={draft} archived={archived} activeBanners={activeBanners} />

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,.95fr)]">
            <CategoryManager categories={categories} isLoading={isLoading} />
            <BannerPanel
              banners={infoBanners}
              isLoading={isLoading}
              onCreate={() => setBannerModal({ open: true, editing: null })}
              onEdit={(banner) => setBannerModal({ open: true, editing: banner })}
            />
          </div>

          <ArticleCollection articles={news} categories={categories} isLoading={isLoading} />
        </div>
      </main>
    </>
  )
}
