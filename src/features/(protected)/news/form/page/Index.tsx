'use client'

import '../form.css'

import { Archive, ArrowLeft, BadgeCheck, BookOpen, CheckCircle2, Clock3, Eye, FileText, Image, Newspaper, Save, Settings2, Tag } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { SingleDropzone } from '@/components/admin/ImageDropzone'
import { RichEditor } from '@/components/admin/RichEditor'
import { createAccessChecker, PERMISSIONS } from '@/config/permissions'
import { routes } from '@/config/routes'
import { useAuth } from '@/context/AuthContext'
import { useCreateNews, useNewsCreateForm, useNewsEditForm, useUpdateNews } from '@/hooks/api/useNews'
import { extractApiError, fieldErrorMap } from '@/lib/apiError'
import { cn } from '@/lib/utils'
import type { NewsStatus } from '@/types/contracts/contracts'

// Menggantikan useForm<FormData> Inertia (camelCase DTO). thumbnail hanya dikirim bila user
// memilih berkas baru — padanan `$request->hasFile('thumbnail')` di Laravel.
type NewsFormState = {
  newsCategoryId: string
  title: string
  slug: string
  excerpt: string
  content: string
  status: NewsStatus
  publishedAt: string
  thumbnail: File | null
}

const STATUS_META: Record<
  NewsStatus,
  {
    label: string
    helper: string
    icon: typeof FileText
    dot: string
    badge: string
    selected: string
  }
> = {
  draft: {
    label: 'Draft',
    helper: 'Belum tampil publik',
    icon: Clock3,
    dot: 'bg-slate-400',
    badge: 'border-slate-200 bg-slate-100 text-slate-600',
    selected: 'border-slate-300 bg-slate-100 text-slate-800'
  },
  published: {
    label: 'Terbit',
    helper: 'Siap dibaca publik',
    icon: BadgeCheck,
    dot: 'bg-emerald-500',
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    selected: 'border-emerald-200 bg-emerald-50 text-emerald-700'
  },
  archived: {
    label: 'Arsip',
    helper: 'Tidak ditampilkan',
    icon: Archive,
    dot: 'bg-[#E35336]',
    badge: 'border-[#FFD5CD] bg-[#FFF1EE] text-[#B93D2A]',
    selected: 'border-[#F8B5A8] bg-[#FFF1EE] text-[#B93D2A]'
  }
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function toDatetimeLocal(value?: string | null): string {
  if (!value) return ''
  return value.replace(' ', 'T').slice(0, 16)
}

function getReadingMinutes(content: string): number {
  const words = stripHtml(content).split(' ').filter(Boolean).length
  return words > 0 ? Math.max(1, Math.ceil(words / 180)) : 0
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1.5 font-bdo text-[11px] font-medium text-rose-500">{message}</p>
}

function ShinyIcon({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'icon-glow relative flex shrink-0 items-center justify-center rounded-2xl',
        'bg-[linear-gradient(135deg,#F08C78_0%,#E35336_52%,#B93D2A_100%)]',
        'text-white shadow-[0_16px_30px_-22px_rgba(227,83,54,.95)]',
        className
      )}
    >
      {children}
      <span className="pointer-events-none absolute top-[4px] right-[7px] left-[7px] h-[5px] rounded-full bg-white/30 blur-[1px]" />
    </div>
  )
}

function SectionCard({
  icon,
  title,
  subtitle,
  children,
  className,
  animDelay = 'delay-100'
}: {
  icon: ReactNode
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
  animDelay?: string
}) {
  return (
    <section
      className={cn(
        'animate-fade-in-up card-glint shimmer-once relative overflow-hidden rounded-[28px]',
        'border border-[#F8B5A8]/70 bg-white/95 backdrop-blur-sm',
        'shadow-[0_24px_56px_-46px_rgba(127,36,25,.55)] transition-all duration-300',
        'hover:-translate-y-0.5 hover:border-[#F08C78] hover:shadow-[0_30px_64px_-48px_rgba(227,83,54,.48)]',
        animDelay,
        className
      )}
    >
      <div className="relative z-10 flex items-center gap-3 border-b border-[#F8B5A8]/35 bg-[linear-gradient(135deg,#FFFFFF_0%,#FFF9F7_100%)] px-5 py-4 sm:px-6 sm:py-5">
        <ShinyIcon className="h-9 w-9">{icon}</ShinyIcon>
        <div className="min-w-0">
          <p className="font-clash text-sm leading-tight font-semibold text-slate-800">{title}</p>
          {subtitle && <p className="mt-0.5 font-bdo text-[11px] text-slate-400">{subtitle}</p>}
        </div>
      </div>
      <div className="relative z-10 p-4 sm:p-6">{children}</div>
    </section>
  )
}

function StatusOption({ status, active, disabled, onSelect }: { status: NewsStatus; active: boolean; disabled?: boolean; onSelect: () => void }) {
  const meta = STATUS_META[status]
  const Icon = meta.icon

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'group flex min-h-[76px] items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all',
        active
          ? cn(meta.selected, 'shadow-[0_16px_30px_-26px_rgba(227,83,54,.72)]')
          : 'border-slate-200 bg-white text-slate-600 hover:border-[#F8B5A8] hover:bg-[#FFF7F5]',
        disabled && 'cursor-not-allowed opacity-50 hover:border-slate-200 hover:bg-white'
      )}
    >
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border',
          active ? 'border-white/70 bg-white/72' : 'border-slate-200 bg-slate-50'
        )}
      >
        <Icon size={16} />
      </span>
      <span className="min-w-0">
        <span className="block font-clash text-sm leading-tight font-semibold">{meta.label}</span>
        <span className="mt-1 block font-bdo text-[11px] font-medium text-slate-400">{meta.helper}</span>
      </span>
    </button>
  )
}

export default function NewsForm() {
  // Satu komponen untuk /news/create DAN /news/[id]/edit — mode dibaca dari param route,
  // pengganti prop Inertia `article`/`categories`.
  const id = useParams<{ id?: string }>()?.id
  const isEdit = id != null
  const router = useRouter()

  const { user } = useAuth()
  const access = createAccessChecker(user?.role, user?.permissions)
  // Laravel: role Administrator ATAU permission 'publish-news' (= news.publish di kontrak);
  // createAccessChecker sudah mem-bypass Administrator.
  const canPublish = access.can([PERMISSIONS.NEWS_PUBLISH])

  // Kedua hook dipanggil tanpa syarat (rules-of-hooks); masing-masing mati di mode yang bukan miliknya.
  const createForm = useNewsCreateForm(!isEdit)
  const editForm = useNewsEditForm(id ?? '')
  const pageData = isEdit ? editForm.data : createForm.data
  const article = pageData?.article ?? null
  const categories = pageData?.categories ?? []

  const createMutation = useCreateNews()
  const updateMutation = useUpdateNews()

  const [errors, setErrors] = useState<Record<string, string>>({})

  const [data, setDataState] = useState<NewsFormState>({
    newsCategoryId: '',
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    status: 'draft',
    publishedAt: '',
    thumbnail: null
  })
  const setData = <K extends keyof NewsFormState>(key: K, value: NewsFormState[K]) => setDataState((prev) => ({ ...prev, [key]: value }))

  // Seed state dari artikel saat tiba (edit). Sekali saja supaya refetch tidak menimpa isian.
  const seededRef = useRef(false)
  useEffect(() => {
    if (!article || seededRef.current) return
    seededRef.current = true
    setDataState({
      newsCategoryId: article.category?.id ?? '',
      title: article.title ?? '',
      slug: article.slug ?? '',
      excerpt: article.excerpt ?? '',
      content: article.content ?? '',
      status: article.status ?? 'draft',
      publishedAt: toDatetimeLocal(article.publishedAt),
      thumbnail: null
    })
  }, [article])

  useEffect(() => {
    if (!isEdit && data.title) {
      setData('slug', slugify(data.title))
    }
  }, [data.title, isEdit])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrors({})

    const formData = new FormData()
    formData.set('newsCategoryId', data.newsCategoryId)
    formData.set('title', data.title)
    formData.set('slug', data.slug)
    formData.set('excerpt', data.excerpt)
    formData.set('content', data.content)
    formData.set('status', data.status)
    formData.set('publishedAt', data.publishedAt)
    // Hanya saat user memilih berkas baru — key kosong akan terbaca sebagai upload dan menimpa media lama.
    if (data.thumbnail) formData.append('thumbnail', data.thumbnail)

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: id ?? '', formData })
        toast.success('Article updated.')
      } else {
        await createMutation.mutateAsync(formData)
        toast.success('Article saved.')
      }
      router.push(routes.news())
    } catch (error) {
      const fields = fieldErrorMap(error)
      if (Object.keys(fields).length > 0) {
        setErrors(fields)
      } else {
        toast.error(extractApiError(error).message)
      }
    }
  }

  const processing = createMutation.isPending || updateMutation.isPending
  const currentStatus = STATUS_META[data.status] ?? STATUS_META.draft
  const selectedCategory = categories.find((category) => category.id === data.newsCategoryId)
  const contentText = stripHtml(data.content)
  const contentLength = contentText.length
  const excerptLength = data.excerpt.trim().length
  const readingMinutes = getReadingMinutes(data.content)
  const headline = data.title.trim() || 'Judul artikel belum diisi'
  const slugPreview = data.slug.trim() || 'tautan-artikel'

  return (
    <>
      <div className="px-4 pt-2 xl:px-8">
        <div className="animate-fade-in-up flex flex-col gap-1 pt-4">
          <span className="font-bdo text-[12px] font-bold tracking-wide text-[#E35336]">{isEdit ? 'Edit Artikel' : 'Artikel Baru'}</span>
          <h1 className="font-clash text-3xl font-bold tracking-tight uppercase xl:text-4xl">
            <span className="news-form-title-shine">{isEdit ? (article?.title ?? '') : 'Tulis Artikel'}</span>
          </h1>
        </div>
      </div>

      <main className="ubsc-page-news-form max-w-full flex-1 px-4 pt-2 pb-10 xl:px-8">
        <form onSubmit={submit} className="relative flex flex-col gap-5 overflow-x-hidden pt-4 pb-24 sm:gap-6 sm:pt-6" encType="multipart/form-data">
          <section className="animate-fade-in-up relative overflow-hidden rounded-[28px] border border-[#F8B5A8]/70 bg-[linear-gradient(145deg,#FFFFFF_0%,#FFF7F5_48%,#FFFFFF_100%)] shadow-[0_22px_54px_-46px_rgba(127,36,25,.5)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#F8B5A8_0%,#E35336_48%,#B93D2A_100%)]" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[repeating-linear-gradient(90deg,rgba(227,83,54,.055)_0,rgba(227,83,54,.055)_1px,transparent_1px,transparent_22px)]" />

            <div className="relative z-10 grid gap-0 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="p-4 sm:p-5 lg:p-6">
                <div className="flex flex-col gap-5">
                  <div className="max-w-2xl">
                    <div className="inline-flex items-center gap-2 rounded-2xl border border-[#F8B5A8]/70 px-3 py-1.5 font-bdo text-[11px] font-bold text-[#B93D2A] shadow-[0_16px_30px_-26px_rgba(227,83,54,.7)] xl:bg-[#FFF7F5] xl:shadow-none">
                      <Newspaper size={13} />
                      Editorial article
                    </div>
                    <h2 className="mt-3 font-clash text-xl leading-tight font-semibold tracking-tight text-slate-950 sm:text-2xl sm:leading-8">
                      Susun berita yang siap dibaca, dipindai, dan diterbitkan.
                    </h2>
                    <p className="mt-2 max-w-xl font-bdo text-sm leading-relaxed font-medium text-slate-500">
                      Preview di kanan mengikuti judul, kategori, status, dan estimasi baca yang sedang disiapkan.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:max-w-3xl xl:max-w-4xl">
                    {[
                      { label: 'Kategori', value: selectedCategory?.name ?? 'Kosong' },
                      { label: 'Status', value: currentStatus.label },
                      { label: 'Ringkasan', value: `${excerptLength}/500` },
                      { label: 'Baca', value: readingMinutes > 0 ? `${readingMinutes} menit` : 'Belum ada' }
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-2xl border border-white/80 px-3.5 py-3 shadow-[0_14px_28px_-24px_rgba(127,36,25,.55)] ring-1 ring-[#F8B5A8]/35 backdrop-blur-xs xl:border-slate-200 xl:bg-slate-50/70 xl:shadow-none xl:ring-0"
                      >
                        <p className="font-bdo text-[9px] font-bold tracking-wider text-slate-400 uppercase">{item.label}</p>
                        <p className="mt-1 truncate font-bdo text-[11px] font-bold text-slate-800">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-[#F8B5A8]/55 bg-white/70 p-4 backdrop-blur-sm sm:p-5 lg:flex lg:items-center lg:border-t-0 lg:border-l xl:bg-[linear-gradient(135deg,#FFF7F5_0%,#FFFFFF_74%)]">
                <div className="w-full rounded-[22px] border border-[#F8B5A8]/55 p-3 shadow-[0_18px_38px_-32px_rgba(127,36,25,.55)] lg:p-4 xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#F08C78_0%,#E35336_52%,#B93D2A_100%)] text-white shadow-[0_18px_30px_-22px_rgba(227,83,54,.95)]">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 font-clash text-sm leading-tight font-semibold text-slate-950">{headline}</p>
                      <p className="mt-1 truncate font-bdo text-[11px] font-semibold text-slate-400">/{slugPreview}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <span className="rounded-full border border-[#F8B5A8]/70 bg-white px-2.5 py-1 font-bdo text-[10px] font-bold text-[#B93D2A]">
                          {selectedCategory?.name ?? 'Tanpa kategori'}
                        </span>
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-bdo text-[10px] font-bold',
                            currentStatus.badge
                          )}
                        >
                          <span className={cn('h-1.5 w-1.5 rounded-full', currentStatus.dot)} />
                          {currentStatus.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3 xl:gap-6">
            <div className="flex flex-col gap-5 xl:col-span-2">
              <SectionCard
                icon={<FileText size={15} />}
                title="Identitas Artikel"
                subtitle="Judul, tautan, dan ringkasan pembuka"
                animDelay="delay-100"
              >
                <div className="flex flex-col gap-5">
                  <div>
                    <label htmlFor="news_title" className="mb-1.5 block font-bdo text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                      Judul Artikel
                    </label>
                    <input
                      id="news_title"
                      name="title"
                      type="text"
                      value={data.title}
                      onChange={(event) => setData('title', event.target.value)}
                      placeholder="Dalam Pengembangan: Fitur artikel dan berita segera hadir"
                      className="news-input-field title"
                    />
                    <FieldError message={errors.title} />
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <label htmlFor="news_slug" className="font-bdo text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                        Tautan Artikel
                      </label>
                      <span className="rounded-full border border-[#F8B5A8]/70 bg-[#FFF7F5] px-2.5 py-1 font-bdo text-[10px] font-bold text-[#B93D2A]">
                        {isEdit ? 'Bisa diubah manual' : 'Dibuat otomatis dari judul'}
                      </span>
                    </div>
                    <input
                      id="news_slug"
                      name="slug"
                      type="text"
                      value={data.slug}
                      onChange={(event) => setData('slug', event.target.value)}
                      placeholder="tautan-artikel"
                      className="news-input-field mono"
                    />
                    <FieldError message={errors.slug} />
                  </div>

                  <div className="news-section-divider" />

                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <label htmlFor="news_excerpt" className="font-bdo text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                        Ringkasan
                      </label>
                      <span
                        className={cn(
                          'rounded-full border px-2.5 py-1 font-bdo text-[10px] font-bold',
                          excerptLength > 500 ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-slate-200 bg-slate-50 text-slate-400'
                        )}
                      >
                        {excerptLength}/500
                      </span>
                    </div>
                    <textarea
                      id="news_excerpt"
                      name="excerpt"
                      value={data.excerpt}
                      onChange={(event) => setData('excerpt', event.target.value)}
                      rows={4}
                      placeholder="Tulis ringkasan yang padat dan mudah dipahami..."
                      className="news-input-field resize-none leading-relaxed"
                    />
                    <FieldError message={errors.excerpt} />
                  </div>
                </div>
              </SectionCard>

              <SectionCard icon={<BookOpen size={15} />} title="Konten Artikel" subtitle="Naskah utama yang akan diterbitkan" animDelay="delay-150">
                <div className="news-editor-frame">
                  <RichEditor
                    value={data.content}
                    onChange={(html) => setData('content', html)}
                    placeholder="Mulai tulis isi artikel..."
                    error={errors.content}
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {[
                    { label: 'Karakter', value: contentLength },
                    { label: 'Estimasi', value: readingMinutes > 0 ? `${readingMinutes} menit` : '0 menit' },
                    { label: 'Status', value: currentStatus.label }
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-3.5 py-3">
                      <p className="font-bdo text-[9px] font-bold tracking-wider text-slate-400 uppercase">{item.label}</p>
                      <p className="mt-1 font-clash text-sm font-semibold text-slate-800">{item.value}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>

            <div className="flex flex-col gap-5">
              <SectionCard icon={<Settings2 size={15} />} title="Penerbitan" subtitle="Status, kategori, dan waktu tayang" animDelay="delay-200">
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="mb-2 block font-bdo text-[11px] font-bold tracking-wider text-slate-500 uppercase">Status</label>
                    <div className="grid gap-2">
                      {(Object.keys(STATUS_META) as NewsStatus[]).map((status) => (
                        <StatusOption
                          key={status}
                          status={status}
                          active={data.status === status}
                          disabled={status === 'published' && !canPublish}
                          onSelect={() => setData('status', status)}
                        />
                      ))}
                    </div>
                    <FieldError message={errors.status} />

                    {!canPublish && (
                      <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 font-bdo text-[11px] font-semibold text-amber-700">
                        Butuh izin publish-news untuk memilih status Terbit.
                      </p>
                    )}
                  </div>

                  <div className="news-section-divider" />

                  <div>
                    <label htmlFor="news_category" className="mb-1.5 block font-bdo text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                      Kategori
                    </label>
                    <select
                      id="news_category"
                      name="newsCategoryId"
                      value={data.newsCategoryId}
                      onChange={(event) => setData('newsCategoryId', event.target.value)}
                      className="news-input-field"
                    >
                      <option value="">Tanpa kategori</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <FieldError message={errors.newsCategoryId} />
                  </div>

                  {data.status === 'published' && (
                    <>
                      <div className="news-section-divider" />
                      <div className="animate-scale-in">
                        <label htmlFor="published_at" className="mb-1.5 block font-bdo text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                          Waktu Terbit
                        </label>
                        <input
                          id="published_at"
                          name="publishedAt"
                          type="datetime-local"
                          value={data.publishedAt}
                          onChange={(event) => setData('publishedAt', event.target.value)}
                          className="news-input-field"
                        />
                        <p className="mt-1.5 font-bdo text-[10px] font-medium text-slate-400">Kosongkan untuk memakai waktu saat disimpan.</p>
                        <FieldError message={errors.publishedAt} />
                      </div>
                    </>
                  )}
                </div>
              </SectionCard>

              <SectionCard icon={<Image size={15} />} title="Thumbnail" subtitle="Gambar utama kartu artikel" animDelay="delay-250">
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <SingleDropzone
                    label="Gambar Artikel"
                    currentUrl={article?.thumbnail ?? null}
                    onFileSelect={(file) => setData('thumbnail', file)}
                  />
                </div>
                <FieldError message={errors.thumbnail} />
              </SectionCard>

              <SectionCard icon={<Eye size={15} />} title="Preview Ringkas" subtitle="Tampilan cepat sebelum simpan" animDelay="delay-300">
                <div className="overflow-hidden rounded-[22px] border border-[#F8B5A8]/60 bg-[linear-gradient(180deg,#FFFFFF_0%,#FFF7F5_130%)]">
                  <div className="border-b border-[#F8B5A8]/45 p-4">
                    <div className="mb-3 flex flex-wrap gap-2">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-bdo text-[10px] font-bold',
                          currentStatus.badge
                        )}
                      >
                        <span className={cn('h-1.5 w-1.5 rounded-full', currentStatus.dot)} />
                        {currentStatus.label}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 font-bdo text-[10px] font-bold text-slate-500">
                        <Tag size={11} />
                        {selectedCategory?.name ?? 'Tanpa kategori'}
                      </span>
                    </div>
                    <h3 className="line-clamp-3 font-clash text-lg leading-tight font-semibold text-slate-950">{headline}</h3>
                    <p className="mt-2 line-clamp-3 font-bdo text-sm leading-6 font-medium text-slate-500">
                      {data.excerpt.trim() || 'Ringkasan artikel akan tampil di sini.'}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-0 [&>:not([hidden])~:not([hidden])]:border-l [&>:not([hidden])~:not([hidden])]:border-[#F8B5A8]/40">
                    {[
                      { label: 'Slug', value: slugPreview },
                      { label: 'Baca', value: readingMinutes > 0 ? `${readingMinutes}m` : '0m' },
                      { label: 'Mode', value: isEdit ? 'Edit' : 'Baru' }
                    ].map((item) => (
                      <div key={item.label} className="min-w-0 px-3 py-3 text-center">
                        <p className="font-bdo text-[9px] font-bold tracking-wider text-slate-400 uppercase">{item.label}</p>
                        <p className="mt-1 truncate font-bdo text-[10px] font-bold text-slate-700">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>

          <div className="animate-fade-in-up sticky bottom-4 z-30 flex flex-col-reverse items-stretch gap-3 rounded-[24px] border border-[#F8B5A8]/70 px-4 py-4 shadow-[0_24px_60px_-42px_rgba(127,36,25,.45)] backdrop-blur-xl delay-350 sm:flex-row sm:items-center sm:px-5">
            <Link
              href={routes.news()}
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 font-clash text-sm font-semibold text-slate-600 transition-all hover:border-[#F8B5A8] hover:bg-[#FFF7F5] hover:text-[#B93D2A]"
            >
              <ArrowLeft size={14} />
              Batal
            </Link>

            <div className="hidden h-8 w-px bg-[linear-gradient(180deg,transparent,rgb(248_181_168/.7),transparent)] sm:block" />

            <p className="hidden flex-1 font-bdo text-[11px] font-medium text-slate-400 sm:block">
              {isEdit
                ? 'Perubahan artikel akan diterapkan setelah disimpan.'
                : 'Artikel baru dapat disimpan sebagai draft atau langsung diterbitkan sesuai izin akun.'}
            </p>

            <button
              type="submit"
              disabled={processing}
              className="btn-sheen relative flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#F08C78_0%,#E35336_52%,#B93D2A_100%)] px-7 py-3 font-clash text-sm font-semibold text-white shadow-[0_18px_34px_-24px_rgba(227,83,54,.95),inset_0_1px_0_rgba(255,255,255,.2)] transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_40px_-24px_rgba(227,83,54,1)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              <span className="pointer-events-none absolute top-0 right-0 left-0 h-px rounded-t-xl bg-white/20" />
              {processing ? <Clock3 size={14} /> : data.status === 'published' ? <CheckCircle2 size={14} /> : <Save size={14} />}
              {processing ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Buat Artikel'}
            </button>
          </div>
        </form>
      </main>
    </>
  )
}
