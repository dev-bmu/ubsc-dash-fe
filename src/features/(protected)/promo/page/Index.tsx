'use client'

import '../promo.css'

import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable'
import {
  Activity,
  Archive,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  GripVertical,
  ImageIcon,
  Layers3,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Trash2,
  UploadCloud
} from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'
import { SortableCard } from '@/components/admin/SortableCard'
import { SingleDropzone } from '@/components/admin/ImageDropzone'
import { SlideOver } from '@/components/admin/SlideOver'
import { useCreatePromo, useDeletePromo, usePromoIndex, useReorderPromo, useUpdatePromo } from '@/hooks/api/useCms'
import { extractApiError, fieldErrorMap } from '@/lib/apiError'
import { cn } from '@/lib/utils'
import type { AdminPromoDto } from '@/types/contracts/contracts'

// ===== Admin Carousel Promo (Fase 8F) — port 1:1 dari Laravel Pages/Admin/Promo/Index.tsx =====
// Data: usePromoIndex() (pengganti props Inertia). Mutasi: useCreatePromo/useUpdatePromo/
// useReorderPromo/useDeletePromo (pengganti useForm + router.post/delete).
// Sumber tidak merender banner flash → umpan balik lewat toast (sonner) dengan pesan flash Laravel.
// CSS injeksi ./Index.css sumber dipindah ke ../promo.css (di-scope ke .ubsc-page-promo).

type PromoFormState = {
  title: string
  isActive: boolean
  sortOrder: number
  slide: File | null
}

const inputBase =
  'h-11 w-full rounded-[16px] border border-[#F8B5A8]/60 px-3.5 font-bdo text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,.82)] outline-hidden transition focus:border-[#E35336]/70 focus:bg-white focus:ring-4 focus:ring-[#E35336]/10 placeholder:text-slate-400'
const labelBase = 'mb-1.5 block font-bdo text-[11px] font-bold uppercase tracking-wider text-slate-500'

function ShinyIcon({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'promo-icon-glow relative flex shrink-0 items-center justify-center rounded-[15px]',
        'bg-[linear-gradient(135deg,#F08C78_0%,#E35336_52%,#B93D2A_100%)] text-white',
        'shadow-[0_18px_34px_-24px_rgba(227,83,54,.95),inset_0_1px_0_rgba(255,255,255,.2)]',
        className
      )}
    >
      {children}
      <span className="pointer-events-none absolute top-1 right-2 left-2 h-1 rounded-full bg-white/30 blur-[1px]" />
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  note,
  tone = 'terracotta'
}: {
  icon: ReactNode
  label: string
  value: string | number
  note: string
  tone?: 'terracotta' | 'emerald' | 'slate' | 'sky'
}) {
  const tones = {
    terracotta: {
      card: 'text-white',
      icon: 'border-white/20 text-white',
      label: 'text-white/64',
      note: 'text-white/58',
      value: 'text-white'
    },
    emerald: {
      card: 'border-emerald-200/50 text-emerald-50',
      icon: 'border-emerald-100/30 text-emerald-50',
      label: 'text-emerald-50/70',
      note: 'text-white/56',
      value: 'text-white'
    },
    slate: {
      card: 'bg-white/10 text-white',
      icon: 'border-white/20 text-white',
      label: 'text-white/62',
      note: 'text-white/52',
      value: 'text-white'
    },
    sky: {
      card: 'border-sky-200/50 text-sky-50',
      icon: 'border-sky-100/30 text-sky-50',
      label: 'text-sky-50/72',
      note: 'text-white/56',
      value: 'text-white'
    }
  }
  const style = tones[tone]

  return (
    <div
      className={cn(
        'promo-card-glint relative min-h-[74px] overflow-hidden rounded-[18px] border p-3',
        'shadow-[0_16px_34px_-30px_rgba(15,23,42,.32)] backdrop-blur-sm transition hover:-translate-y-0.5',
        style.card
      )}
    >
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,.08)_0,rgba(255,255,255,.08)_1px,transparent_1px,transparent_12px)]" />
      <div className="relative z-10 flex h-full items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] border shadow-xs', style.icon)}>{icon}</span>
          <div className="min-w-0">
            <p className={cn('truncate font-bdo text-[10px] font-bold tracking-wide uppercase', style.label)}>{label}</p>
            <p className={cn('mt-0.5 truncate font-bdo text-[10px] font-semibold', style.note)}>{note}</p>
          </div>
        </div>
        <p className={cn('shrink-0 font-clash text-xl leading-none font-bold', style.value)}>{value}</p>
      </div>
    </div>
  )
}

function PromoForm({ item, onClose }: { item: AdminPromoDto | null; onClose: () => void }) {
  const isEdit = item !== null
  const [data, setDataState] = useState<PromoFormState>({
    title: item?.title ?? '',
    isActive: item?.isActive ?? true,
    sortOrder: item?.sortOrder ?? 0,
    slide: null
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const createMutation = useCreatePromo()
  const updateMutation = useUpdatePromo()
  const processing = createMutation.isPending || updateMutation.isPending

  const setData = <K extends keyof PromoFormState>(key: K, value: PromoFormState[K]) => setDataState((prev) => ({ ...prev, [key]: value }))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setErrors({})

    // Multipart seperti Inertia forceFormData; `slide` HANYA dikirim bila user memilih berkas
    // baru (padanan $request->hasFile('slide') di Laravel) agar media lama tidak tertimpa.
    const formData = new FormData()
    formData.set('title', data.title)
    formData.set('isActive', data.isActive ? 'true' : 'false')
    formData.set('sortOrder', String(data.sortOrder))
    if (data.slide) formData.set('slide', data.slide)

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: item!.id, formData })
        toast.success('Slide updated.')
      } else {
        await createMutation.mutateAsync(formData)
        toast.success('Slide created.')
      }
      onClose()
    } catch (error) {
      const fields = fieldErrorMap(error)
      if (Object.keys(fields).length > 0) {
        setErrors(fields)
      } else {
        toast.error(extractApiError(error).message)
      }
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-[20px] border border-[#F8B5A8]/65 bg-[linear-gradient(145deg,#FFFFFF_0%,#FFF7F5_100%)] p-3.5">
        <div className="flex items-start gap-3">
          <ShinyIcon className="h-10 w-10">
            <UploadCloud size={17} />
          </ShinyIcon>
          <div className="min-w-0">
            <p className="font-clash text-base font-semibold text-slate-950">{isEdit ? 'Perbarui slide promo' : 'Slide promo baru'}</p>
            <p className="mt-1 font-bdo text-xs leading-5 font-medium text-slate-500">
              Gunakan visual yang jelas, terang, dan langsung memperlihatkan promo utama.
            </p>
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="promo_title" className={labelBase}>
          Judul Slide
        </label>
        <input
          id="promo_title"
          type="text"
          value={data.title}
          onChange={(event) => setData('title', event.target.value)}
          placeholder="Contoh: Diskon Membership 20%"
          className={inputBase}
        />
        {errors.title && <p className="mt-1.5 font-bdo text-xs text-rose-500">{errors.title}</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_136px]">
        <div>
          <label htmlFor="promo_sort_order" className={labelBase}>
            Urutan
          </label>
          <input
            id="promo_sort_order"
            type="number"
            min={0}
            value={data.sortOrder}
            onChange={(event) => setData('sortOrder', Number(event.target.value))}
            className={cn(inputBase, 'font-mono')}
          />
        </div>

        <label className="flex h-11 items-center justify-between gap-3 self-end rounded-[16px] border border-[#F8B5A8]/60 bg-[#FFF7F5] px-3.5">
          <span>
            <span className="block font-clash text-sm font-semibold text-slate-900">Aktif</span>
            <span className="block font-bdo text-[11px] font-medium text-slate-400">{data.isActive ? 'Tampil publik' : 'Disembunyikan'}</span>
          </span>
          <input
            type="checkbox"
            checked={data.isActive}
            onChange={(event) => setData('isActive', event.target.checked)}
            className="h-5 w-5 rounded border-slate-300 text-[#E35336] focus:ring-[#E35336]"
            aria-label="Status aktif slide promo"
          />
        </label>
      </div>

      <div className="rounded-[20px] border border-slate-200 bg-white p-2.5">
        <SingleDropzone label="Gambar Slide" currentUrl={item?.slideUrl ?? null} onFileSelect={(file) => setData('slide', file)} />
        {errors.slide && <p className="mt-1.5 font-bdo text-xs text-rose-500">{errors.slide}</p>}
      </div>

      <div className="grid gap-2 rounded-[18px] border border-slate-200 bg-slate-50/75 p-2.5 sm:grid-cols-3">
        {[
          { label: 'Mode', value: isEdit ? 'Edit' : 'Baru' },
          { label: 'Status', value: data.isActive ? 'Aktif' : 'Nonaktif' },
          { label: 'Urutan', value: data.sortOrder || 'Auto' }
        ].map((meta) => (
          <div key={meta.label} className="rounded-[15px] bg-white px-3 py-2 ring-1 ring-slate-200/70">
            <p className="font-bdo text-[9px] font-bold tracking-wider text-slate-400 uppercase">{meta.label}</p>
            <p className="mt-1 truncate font-bdo text-[11px] font-bold text-slate-700">{meta.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col-reverse items-stretch gap-3 pt-1 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={onClose}
          className="h-11 rounded-[16px] border border-slate-200 bg-white px-5 font-clash text-sm font-semibold text-slate-600 transition hover:border-[#F8B5A8] hover:bg-[#FFF7F5] hover:text-[#B93D2A]"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={processing}
          className="promo-btn-sheen relative flex h-11 flex-1 items-center justify-center gap-2 rounded-[16px] bg-[linear-gradient(135deg,#F08C78_0%,#E35336_52%,#B93D2A_100%)] px-6 font-clash text-sm font-semibold text-white shadow-[0_18px_34px_-24px_rgba(227,83,54,.95),inset_0_1px_0_rgba(255,255,255,.2)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          <Save size={14} />
          {processing ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Slide'}
        </button>
      </div>
    </form>
  )
}

function SlideCard({
  item,
  index,
  onEdit,
  onDelete,
  handle
}: {
  item: AdminPromoDto
  index: number
  onEdit: (item: AdminPromoDto) => void
  onDelete: (item: AdminPromoDto) => void
  handle: ReactNode
}) {
  return (
    <div className="promo-card-glint group relative grid h-full grid-cols-[118px_minmax(0,1fr)] overflow-hidden rounded-[20px] border border-[#FFE0D8] bg-white shadow-[0_16px_40px_-34px_rgba(127,36,25,.55)] transition duration-300 hover:border-[#F8B5A8] sm:flex sm:min-h-[292px] sm:flex-col sm:rounded-[22px] sm:hover:-translate-y-0.5 sm:hover:shadow-[0_28px_58px_-44px_rgba(127,36,25,.68)]">
      <div className="relative m-2.5 min-h-[134px] overflow-hidden rounded-[18px] bg-[#FFF7F5] ring-1 ring-[#FFE0D8] sm:m-3 sm:aspect-video sm:min-h-0 sm:rounded-[20px]">
        {item.slideUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- media slide dari server (URL dinamis), bukan aset statis public
          <img
            src={item.slideUrl}
            alt={item.title || `Slide promo ${index + 1}`}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#FFF1EE,#F8FAFC)] text-[#E35336]/35">
            <ImageIcon size={42} />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-linear-to-t to-transparent" />
        <div className="absolute top-2 left-2 flex items-center gap-1.5 sm:top-3 sm:left-3 sm:gap-2">
          <div className="rounded-[14px] border border-white/60 bg-white/85 p-1 shadow-xs backdrop-blur-sm sm:p-1.5">{handle}</div>
          <span className="rounded-full border border-white/60 bg-white/85 px-2 py-0.5 font-bdo text-[9px] font-bold text-slate-700 shadow-xs backdrop-blur-sm sm:px-2.5 sm:py-1 sm:text-[10px]">
            #{index + 1}
          </span>
        </div>
        <div className="absolute bottom-2 left-2 sm:top-3 sm:right-3 sm:bottom-auto sm:left-auto">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-bdo text-[9px] font-bold tracking-wide uppercase shadow-xs backdrop-blur-sm sm:px-2.5 sm:py-1 sm:text-[10px]',
              item.isActive ? 'border-emerald-200 bg-emerald-50/90 text-emerald-700' : 'border-slate-200 bg-white/90 text-slate-500'
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', item.isActive ? 'bg-emerald-500' : 'bg-slate-300')} />
            {item.isActive ? 'Aktif' : 'Nonaktif'}
          </span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col px-2.5 pt-2.5 pb-2.5 sm:px-3.5 sm:pt-0 sm:pb-3.5">
        <div className="flex-1">
          <p className="font-bdo text-[10px] font-bold tracking-widest text-[#B93D2A] uppercase">Slide Promo</p>
          <h3 className="mt-1.5 line-clamp-2 font-clash text-sm leading-tight font-semibold text-slate-950 sm:text-lg sm:leading-7">
            {item.title || 'Tanpa judul'}
          </h3>
          <p className="mt-1.5 line-clamp-2 font-bdo text-xs leading-5 font-medium text-slate-500 sm:text-sm">
            {item.isActive ? 'Slide ini sedang tampil pada carousel publik.' : 'Slide tersimpan, tetapi tidak tampil untuk pengunjung.'}
          </p>
        </div>

        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_36px_36px] items-center gap-2 border-t border-[#FFE0D8] pt-3 sm:grid-cols-[minmax(0,1fr)_38px_38px]">
          <div className="min-w-0">
            <p className="font-bdo text-[10px] font-bold tracking-wide text-slate-400 uppercase">Urutan database</p>
            <p className="font-clash text-sm font-semibold text-slate-800">#{item.sortOrder || index + 1}</p>
          </div>
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="flex h-9 w-9 items-center justify-center rounded-[15px] border border-slate-200 bg-white text-slate-600 transition hover:border-[#F8B5A8] hover:bg-[#FFF7F5] hover:text-[#B93D2A] sm:h-[38px] sm:w-[38px]"
            aria-label={`Edit ${item.title || `slide ${index + 1}`}`}
          >
            <Pencil size={15} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(item)}
            className="flex h-9 w-9 items-center justify-center rounded-[15px] border border-rose-200 bg-rose-50 text-rose-500 transition hover:bg-rose-100 sm:h-[38px] sm:w-[38px]"
            aria-label={`Hapus ${item.title || `slide ${index + 1}`}`}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PromoIndex() {
  const { data: pageData, isLoading } = usePromoIndex()
  const initialItems = useMemo(() => pageData?.items ?? [], [pageData])
  const [items, setItems] = useState<AdminPromoDto[]>([])
  const [currentPromoIndex, setCurrentPromoIndex] = useState(0)
  const [slideOver, setSlideOver] = useState<{ open: boolean; item: AdminPromoDto | null }>({
    open: false,
    item: null
  })
  const reorderMutation = useReorderPromo()
  const deleteMutation = useDeletePromo()

  useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  useEffect(() => {
    if (currentPromoIndex < items.length) return
    setCurrentPromoIndex(Math.max(0, items.length - 1))
  }, [currentPromoIndex, items.length])

  const openNew = () => setSlideOver({ open: true, item: null })
  const openEdit = (item: AdminPromoDto) => setSlideOver({ open: true, item })
  const close = () => setSlideOver({ open: false, item: null })

  const handleDelete = (item: AdminPromoDto) => {
    if (!confirm(`Hapus slide "${item.title || `#${item.id}`}"?`)) return
    deleteMutation.mutate(item.id, {
      onSuccess: () => toast.success('Slide deleted.'),
      onError: (error) => toast.error(extractApiError(error).message)
    })
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((item) => item.id.toString() === active.id)
    const newIndex = items.findIndex((item) => item.id.toString() === over.id)
    const reordered = arrayMove(items, oldIndex, newIndex)
    setItems(reordered)
    reorderMutation.mutate(
      reordered.map((item) => item.id),
      { onError: (error) => toast.error(extractApiError(error).message) }
    )
  }

  const active = items.filter((item) => item.isActive).length
  const inactive = items.length - active
  const hasImages = items.filter((item) => Boolean(item.slideUrl)).length
  const activePercent = items.length > 0 ? Math.round((active / items.length) * 100) : 0
  const firstActive = useMemo(() => items.find((item) => item.isActive) ?? null, [items])
  const currentPromo = items[currentPromoIndex] ?? null
  const goToPreviousPromo = () => {
    if (items.length <= 1) return
    setCurrentPromoIndex((index) => (index - 1 + items.length) % items.length)
  }
  const goToNextPromo = () => {
    if (items.length <= 1) return
    setCurrentPromoIndex((index) => (index + 1) % items.length)
  }

  return (
    <>
      <div className="px-4 pt-2 xl:px-8">
        <div className="promo-enter flex flex-col gap-1 pt-3">
          <span className="font-bdo text-[11px] font-bold tracking-wide text-[#E35336]">Manajemen Konten</span>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="promo-title-shine font-clash text-2xl font-bold tracking-tight uppercase xl:text-3xl">Carousel Promo</h1>
              <p className="mt-1 font-bdo text-sm font-medium text-slate-400">
                Atur visual promo utama, urutan tampil, dan status publik dalam satu ruang kerja.
              </p>
            </div>
            <button
              type="button"
              onClick={openNew}
              className="promo-btn-sheen inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#F8B5A8_0%,#E35336_52%,#B93D2A_100%)] px-5 font-clash text-sm font-semibold text-white shadow-[0_18px_34px_-24px_rgba(227,83,54,.95)] transition hover:-translate-y-0.5 sm:w-auto"
            >
              <Plus size={15} />
              Tambah Slide
            </button>
          </div>
        </div>
      </div>

      <main className="ubsc-page-promo max-w-full flex-1 px-4 pt-2 pb-10 xl:px-8">
        <div className="flex flex-col gap-4 overflow-x-hidden pt-4 pb-16">
          <section className="promo-enter promo-sheen relative overflow-hidden rounded-[26px] border border-[#F8B5A8]/70 bg-[linear-gradient(135deg,#E35336_0%,#B93D2A_58%,#7F2419_100%)] text-white shadow-[0_28px_68px_-54px_rgba(127,36,25,.72)]">
            <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,.085)_0,rgba(255,255,255,.085)_1px,transparent_1px,transparent_22px)]" />
            <div className="pointer-events-none absolute -top-28 -right-20 h-72 w-72 rounded-full border" />
            <div className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full blur-3xl" />

            <div className="relative z-10 grid items-stretch gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(350px,420px)]">
              <div className="flex p-4 sm:p-5">
                <div className="flex min-h-[360px] w-full flex-col justify-between gap-5 sm:min-h-[420px] lg:min-h-0">
                  <div className="max-w-3xl">
                    <span className="inline-flex items-center gap-2 rounded-2xl border px-3 py-1.5 font-bdo text-[10px] font-bold text-white shadow-[0_16px_30px_-26px_rgba(15,23,42,.32)] backdrop-blur-sm">
                      <Sparkles size={13} />
                      Promo control desk
                    </span>
                    <h2 className="mt-3 max-w-4xl font-clash text-[1.72rem] leading-[1.03] font-semibold text-white sm:text-[2.35rem] lg:text-[2.75rem]">
                      Susun carousel yang langsung menjual saat halaman dibuka.
                    </h2>
                    <p className="mt-2 max-w-2xl font-bdo text-xs leading-5 font-medium sm:text-sm sm:leading-6">
                      Slide aktif akan tampil di halaman publik. Seret kartu untuk mengatur prioritas, lalu edit detail tanpa meninggalkan halaman.
                    </p>
                  </div>

                  <div className="mt-auto grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard icon={<Layers3 size={17} />} label="Total Slide" value={items.length} note="Semua konten carousel" />
                    <StatCard icon={<Eye size={17} />} label="Aktif" value={active} note={`${activePercent}% tampil publik`} tone="emerald" />
                    <StatCard icon={<EyeOff size={17} />} label="Nonaktif" value={inactive} note="Disimpan sebagai draft" tone="slate" />
                    <StatCard icon={<ImageIcon size={17} />} label="Bergambar" value={hasImages} note="Slide punya visual" tone="sky" />
                  </div>
                </div>
              </div>

              <div className="border-t bg-white/10 p-3.5 backdrop-blur-sm sm:p-4 lg:border-t-0 lg:border-l">
                <div className="promo-card-glint flex h-full min-h-[286px] flex-col overflow-hidden rounded-[22px] border border-white/70 bg-white p-3.5 text-slate-950 shadow-[0_26px_58px_-42px_rgba(15,23,42,.45)] sm:min-h-[318px] lg:min-h-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bdo text-[10px] font-bold tracking-widest text-[#B93D2A] uppercase">Live Slide Command</p>
                      <h3 className="mt-1 line-clamp-2 font-clash text-lg leading-tight font-semibold text-slate-950">
                        {currentPromo?.title || firstActive?.title || 'Tambahkan slide promo'}
                      </h3>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded-full border px-3 py-1.5 font-bdo text-[10px] font-bold uppercase',
                        currentPromo?.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'
                      )}
                    >
                      {currentPromo?.isActive ? 'Live' : 'Draft'}
                    </span>
                  </div>

                  <div className="relative mt-3 flex-1 overflow-hidden rounded-[20px] bg-[#FFF7F4] ring-1 ring-[#FFE0D8] sm:rounded-[22px]">
                    <button
                      type="button"
                      onClick={() => (currentPromo ? openEdit(currentPromo) : openNew())}
                      className="group h-full min-h-[184px] w-full text-left sm:min-h-[214px] lg:min-h-0"
                    >
                      {currentPromo?.slideUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- media slide dari server (URL dinamis), bukan aset statis public
                        <img
                          src={currentPromo.slideUrl}
                          alt={currentPromo.title || `Promo ${currentPromoIndex + 1}`}
                          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full min-h-[184px] flex-col items-center justify-center gap-3 px-6 text-center sm:min-h-[214px] lg:min-h-0">
                          <span className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-[#FFD5CD] bg-white text-[#E35336] shadow-xs">
                            <ImageIcon size={24} />
                          </span>
                          <span className="font-clash text-base font-semibold text-slate-950">Belum ada visual promo</span>
                          <span className="max-w-xs font-bdo text-sm leading-5 font-medium text-slate-500">
                            Tambahkan gambar agar carousel siap ditampilkan.
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-slate-950/70 to-transparent p-3 pt-14 sm:p-4 sm:pt-16">
                        <div className="flex items-end justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-bdo text-[10px] font-bold tracking-widest text-white/75 uppercase">
                              Slide {items.length > 0 ? currentPromoIndex + 1 : 0} dari {items.length}
                            </p>
                            <p className="mt-1 line-clamp-1 font-clash text-base font-semibold text-white sm:text-lg">
                              {currentPromo?.title || 'Belum ada slide'}
                            </p>
                          </div>
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/40 bg-white/20 text-white backdrop-blur-sm">
                            <Pencil size={15} />
                          </span>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={goToPreviousPromo}
                      disabled={items.length <= 1}
                      className="absolute top-1/2 left-2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-2xl border border-white/60 bg-white/90 text-[#B93D2A] shadow-xs backdrop-blur-sm transition hover:bg-[#FFF1EE] disabled:cursor-not-allowed disabled:opacity-35 sm:left-3 sm:h-10 sm:w-10"
                      aria-label="Promo sebelumnya"
                    >
                      <ChevronLeft size={17} />
                    </button>
                    <button
                      type="button"
                      onClick={goToNextPromo}
                      disabled={items.length <= 1}
                      className="absolute top-1/2 right-2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-2xl border border-white/60 bg-white/90 text-[#B93D2A] shadow-xs backdrop-blur-sm transition hover:bg-[#FFF1EE] disabled:cursor-not-allowed disabled:opacity-35 sm:right-3 sm:h-10 sm:w-10"
                      aria-label="Promo berikutnya"
                    >
                      <ChevronRight size={17} />
                    </button>
                  </div>

                  <div className="promo-list-scroll mt-2 flex gap-2 overflow-x-auto pb-1">
                    {items.length > 0 ? (
                      items.slice(0, 10).map((item, index) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setCurrentPromoIndex(index)}
                          className={cn(
                            'relative flex aspect-video h-11 min-w-[78px] items-center justify-center overflow-hidden rounded-[14px] border bg-slate-100 transition sm:h-12 sm:min-w-[86px]',
                            currentPromo?.id === item.id
                              ? 'border-[#E35336] shadow-[0_0_0_2px_rgba(227,83,54,.14)]'
                              : 'border-slate-200 hover:border-[#F8B5A8]'
                          )}
                          aria-label={`Pilih slide promo ${index + 1}`}
                        >
                          {item.slideUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element -- media slide dari server (URL dinamis), bukan aset statis public
                            <img src={item.slideUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                          ) : (
                            <span className="relative z-10 px-2 text-center font-bdo text-[10px] leading-tight font-bold text-slate-400">
                              {item.title || `Slide ${index + 1}`}
                            </span>
                          )}
                          {currentPromo?.id === item.id && (
                            <span className="pointer-events-none absolute inset-0 rounded-[13px] ring-2 ring-[#E35336] ring-inset" />
                          )}
                        </button>
                      ))
                    ) : (
                      <span className="flex h-10 w-full items-center justify-center rounded-[15px] border border-dashed border-[#F8B5A8] bg-[#FFF7F5] px-3 font-bdo text-xs font-semibold text-[#B93D2A]">
                        Belum ada slide untuk dipreview.
                      </span>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                    <div className="flex min-w-0 items-center justify-center rounded-2xl border border-[#FFD5CD] bg-[#FFF1EE] px-3 py-2 font-bdo text-[11px] font-bold text-[#B93D2A]">
                      {items.length > 0 ? `Slide ${currentPromoIndex + 1} dari ${items.length}` : 'Belum ada slide'}
                    </div>
                    <button
                      type="button"
                      onClick={() => (currentPromo ? openEdit(currentPromo) : openNew())}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-[#E35336] px-4 font-clash text-xs font-semibold text-white transition hover:bg-[#B93D2A]"
                    >
                      <Pencil size={13} />
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="promo-enter promo-card-glint relative overflow-hidden rounded-[22px] border border-[#FFE0D8] bg-white p-3.5 shadow-[0_22px_52px_-44px_rgba(127,36,25,.5)] delay-100 sm:p-4">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-b from-[#FFF7F5] to-transparent" />
            <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <ShinyIcon className="h-10 w-10">
                  <Activity size={18} />
                </ShinyIcon>
                <div>
                  <p className="font-bdo text-[10px] font-bold tracking-widest text-slate-400 uppercase">Workflow</p>
                  <h2 className="font-clash text-base font-semibold text-slate-950">Daftar Slide Promo</h2>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  { icon: <GripVertical size={14} />, label: 'Seret kartu', note: 'Atur prioritas' },
                  { icon: <Pencil size={14} />, label: 'Edit cepat', note: 'Slide-over' },
                  { icon: <Archive size={14} />, label: 'Nonaktifkan', note: 'Simpan draft' }
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50/75 px-3 py-2">
                    <div className="flex items-center gap-2 font-bdo text-[11px] font-bold text-slate-700">
                      {item.icon}
                      {item.label}
                    </div>
                    <p className="mt-0.5 font-bdo text-[10px] font-medium text-slate-400">{item.note}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative z-10 mt-4">
              {items.length === 0 ? (
                isLoading ? null : (
                  <div className="flex min-h-[260px] flex-col items-center justify-center gap-4 rounded-[22px] border border-dashed border-[#F8B5A8] bg-[#FFF7F5]/65 p-8 text-center">
                    <ShinyIcon className="h-14 w-14">
                      <ImageIcon size={22} />
                    </ShinyIcon>
                    <div>
                      <p className="font-clash text-lg font-semibold text-slate-950">Belum ada slide promo</p>
                      <p className="mt-1 max-w-sm font-bdo text-sm leading-6 font-medium text-slate-500">
                        Tambahkan slide pertama untuk mulai mengisi carousel promo publik.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={openNew}
                      className="promo-btn-sheen inline-flex items-center gap-2 rounded-2xl bg-[#E35336] px-5 py-3 font-clash text-sm font-semibold text-white shadow-[0_18px_34px_-24px_rgba(227,83,54,.95)]"
                    >
                      <Plus size={15} />
                      Tambah Slide
                    </button>
                  </div>
                )
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={items.map((item) => item.id.toString())} strategy={rectSortingStrategy}>
                    <div className="promo-list-scroll promo-touch-scroll grid max-h-[58vh] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:max-h-[620px] md:grid-cols-2 xl:max-h-[calc(100vh-348px)] 2xl:grid-cols-3">
                      {items.map((item, index) => (
                        <SortableCard key={item.id} id={item.id.toString()}>
                          {(handle) => <SlideCard item={item} index={index} onEdit={openEdit} onDelete={handleDelete} handle={handle} />}
                        </SortableCard>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </section>
        </div>

        <SlideOver
          isOpen={slideOver.open}
          onClose={close}
          title={<span className="font-clash text-xl">{slideOver.item ? 'Edit Slide Promo' : 'Slide Promo Baru'}</span>}
          description={
            <span className="font-bdo text-sm text-slate-500">
              {slideOver.item ? 'Perbarui judul, status, urutan, dan gambar slide.' : 'Tambahkan visual promo baru untuk carousel publik.'}
            </span>
          }
        >
          {slideOver.open && <PromoForm key={slideOver.item?.id ?? 'new'} item={slideOver.item} onClose={close} />}
        </SlideOver>
      </main>
    </>
  )
}
