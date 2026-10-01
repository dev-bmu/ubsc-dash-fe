'use client'

import '../sponsors.css'

import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable'
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  ImageIcon,
  Layers3,
  Pencil,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  UploadCloud
} from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'
import { SingleDropzone } from '@/components/admin/ImageDropzone'
import { SlideOver } from '@/components/admin/SlideOver'
import { SortableCard } from '@/components/admin/SortableCard'
import { useCreateSponsor, useDeleteSponsor, useReorderSponsors, useSponsorIndex, useUpdateSponsor } from '@/hooks/api/useCms'
import { extractApiError, fieldErrorMap } from '@/lib/apiError'
import { cn } from '@/lib/utils'
import type { AdminSponsorDto } from '@/types/contracts/contracts'

// Inertia useForm<FormData> diganti state lokal. Nama tipe 'FormData' sumber di-rename
// SponsorFormState agar tidak menutupi FormData global (dipakai untuk multipart).
type SponsorFormState = {
  name: string
  isActive: boolean
  sortOrder: number
  logo: File | null
}

type StatusFilter = 'all' | 'active' | 'inactive'

// SPONSOR_STYLES sumber dipindah ke ../sponsors.css (di-scope ke .ubsc-page-sponsors).

const inputBase =
  'h-11 w-full rounded-[16px] border border-[#F8B5A8]/60 px-3.5 font-bdo text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,.82)] outline-hidden transition focus:border-[#E35336]/70 focus:bg-white focus:ring-4 focus:ring-[#E35336]/10 placeholder:text-slate-400'
const labelBase = 'mb-1.5 block font-bdo text-[11px] font-bold uppercase tracking-wider text-slate-500'

function ShinyIcon({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'sponsor-icon-glow relative flex shrink-0 items-center justify-center rounded-[15px]',
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

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-bdo text-[10px] font-bold tracking-wide uppercase',
        active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', active ? 'bg-emerald-500' : 'bg-slate-300')} />
      {active ? 'Aktif' : 'Nonaktif'}
    </span>
  )
}

function SponsorForm({ item, onClose }: { item: AdminSponsorDto | null; onClose: () => void }) {
  const isEdit = item !== null
  const createMutation = useCreateSponsor()
  const updateMutation = useUpdateSponsor()
  const [data, setFormState] = useState<SponsorFormState>({
    name: item?.name ?? '',
    isActive: item?.isActive ?? true,
    sortOrder: item?.sortOrder ?? 0,
    logo: null
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const processing = createMutation.isPending || updateMutation.isPending

  const setData = <K extends keyof SponsorFormState>(key: K, value: SponsorFormState[K]) => setFormState((prev) => ({ ...prev, [key]: value }))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setErrors({})

    // Multipart: 'logo' HANYA di-append bila user memilih berkas baru (setara Laravel hasFile).
    // Key berkas kosong akan terbaca sebagai upload dan menimpa logo lama.
    const formData = new FormData()
    formData.set('name', data.name)
    formData.set('isActive', data.isActive ? 'true' : 'false')
    formData.set('sortOrder', String(data.sortOrder))
    if (data.logo) formData.append('logo', data.logo)

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: item.id, formData })
        toast.success('Sponsor updated.')
      } else {
        await createMutation.mutateAsync(formData)
        toast.success('Sponsor added.')
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
            <p className="font-clash text-base font-semibold text-slate-950">{isEdit ? 'Perbarui logo sponsor' : 'Sponsor baru'}</p>
            <p className="mt-1 font-bdo text-xs leading-5 font-medium text-slate-500">
              Gunakan logo beresolusi jelas, transparan bila memungkinkan, dan mudah terbaca di marquee publik.
            </p>
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="sponsor_name" className={labelBase}>
          Nama Sponsor
        </label>
        <input
          id="sponsor_name"
          type="text"
          value={data.name}
          onChange={(event) => setData('name', event.target.value)}
          placeholder="Contoh: Bank Mandiri"
          className={inputBase}
        />
        {errors.name && <p className="mt-1.5 font-bdo text-xs text-rose-500">{errors.name}</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_136px]">
        <div>
          <label htmlFor="sponsor_sort_order" className={labelBase}>
            Urutan
          </label>
          <input
            id="sponsor_sort_order"
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
            aria-label="Status aktif sponsor"
          />
        </label>
      </div>

      <div className="rounded-[20px] border border-slate-200 bg-white p-2.5">
        <SingleDropzone label="Logo Sponsor" currentUrl={item?.logoUrl ?? null} onFileSelect={(file) => setData('logo', file)} />
        {errors.logo && <p className="mt-1.5 font-bdo text-xs text-rose-500">{errors.logo}</p>}
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
          className="sponsor-btn-sheen relative flex h-11 flex-1 items-center justify-center gap-2 rounded-[16px] bg-[linear-gradient(135deg,#F08C78_0%,#E35336_52%,#B93D2A_100%)] px-6 font-clash text-sm font-semibold text-white shadow-[0_18px_34px_-24px_rgba(227,83,54,.95),inset_0_1px_0_rgba(255,255,255,.2)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          <Save size={14} />
          {processing ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Sponsor'}
        </button>
      </div>
    </form>
  )
}

function SponsorCard({
  item,
  index,
  onEdit,
  onDelete,
  handle
}: {
  item: AdminSponsorDto
  index: number
  onEdit: (item: AdminSponsorDto) => void
  onDelete: (item: AdminSponsorDto) => void
  handle: ReactNode
}) {
  return (
    <div className="group sponsor-card-glint relative grid h-full grid-cols-[104px_minmax(0,1fr)] overflow-hidden rounded-[20px] border border-[#FFD5CD]/75 bg-white shadow-[0_16px_38px_-32px_rgba(127,36,25,.48)] transition hover:border-[#F8B5A8] sm:flex sm:flex-col sm:rounded-[22px] sm:hover:-translate-y-0.5 sm:hover:shadow-[0_24px_52px_-38px_rgba(127,36,25,.62)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-linear-to-b from-[#FFF7F5] to-transparent" />
      <div className="relative flex min-h-[122px] w-full items-center justify-center overflow-hidden rounded-r-[22px] bg-[linear-gradient(135deg,#FFF7F5_0%,#FFFFFF_52%,#F8FAFC_100%)] p-3 ring-1 ring-[#FFD5CD]/45 sm:aspect-4/3 sm:min-h-0 sm:rounded-r-none sm:rounded-bl-[24px] sm:p-4">
        <div className="absolute top-2 left-2 z-10 sm:top-3 sm:left-3">{handle}</div>
        <span className="absolute bottom-2 left-2 z-10 rounded-full bg-slate-950/55 px-2 py-0.5 font-bdo text-[9px] font-bold text-white backdrop-blur-sm sm:top-3 sm:right-3 sm:bottom-auto sm:left-auto sm:px-2.5 sm:py-1 sm:text-[10px]">
          #{index + 1}
        </span>

        {item.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- logo dari storage (URL dinamis), bukan aset statis public
          <img src={item.logoUrl} alt={item.name} className="max-h-full max-w-full object-contain transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex flex-col items-center gap-1.5 px-2 text-center">
            <ImageIcon size={28} />
            <span className="font-bdo text-[9px] font-bold tracking-wide uppercase sm:text-[11px]">Belum ada logo</span>
          </div>
        )}
      </div>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col gap-3 p-3 sm:p-3.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="min-w-0">
            <p className="line-clamp-2 font-clash text-sm leading-tight font-semibold text-slate-950 sm:text-[15px]">{item.name}</p>
            <p className="mt-1 font-bdo text-[11px] font-semibold text-slate-400">Sort order {item.sortOrder || index + 1}</p>
          </div>
          <StatusPill active={item.isActive} />
        </div>

        <div className="mt-auto grid grid-cols-[minmax(0,1fr)_36px] gap-2 sm:grid-cols-[minmax(0,1fr)_38px]">
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-[15px] border border-slate-200 bg-slate-50 font-bdo text-xs font-bold text-slate-600 transition hover:border-[#F8B5A8] hover:bg-[#FFF7F5] hover:text-[#B93D2A]"
          >
            <Pencil size={13} />
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(item)}
            className="inline-flex h-9 items-center justify-center rounded-[15px] border border-rose-200 bg-rose-50 text-rose-500 transition hover:bg-rose-100"
            aria-label={`Hapus ${item.name}`}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

function SponsorHero({ items, active, onCreate }: { items: AdminSponsorDto[]; active: number; onCreate: () => void }) {
  const activeItems = items.filter((item) => item.isActive)
  const [currentIndex, setCurrentIndex] = useState(0)
  const currentSponsor = activeItems[currentIndex] ?? activeItems[0] ?? null

  useEffect(() => {
    if (activeItems.length === 0) {
      setCurrentIndex(0)
      return
    }

    setCurrentIndex((index) => Math.min(index, activeItems.length - 1))
  }, [activeItems.length])

  const goToPrevious = () => {
    if (activeItems.length <= 1) return
    setCurrentIndex((index) => (index - 1 + activeItems.length) % activeItems.length)
  }

  const goToNext = () => {
    if (activeItems.length <= 1) return
    setCurrentIndex((index) => (index + 1) % activeItems.length)
  }

  return (
    <>
      <section className="sponsor-enter sponsor-sheen relative overflow-hidden rounded-[24px] border border-[#F8B5A8]/70 bg-[linear-gradient(135deg,#E35336_0%,#B93D2A_58%,#7F2419_100%)] text-white shadow-[0_24px_58px_-48px_rgba(127,36,25,.68)] sm:hidden">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,.08)_0,rgba(255,255,255,.08)_1px,transparent_1px,transparent_18px)]" />
        <div className="pointer-events-none absolute -top-24 -right-20 h-52 w-52 rounded-full border" />

        <div className="relative z-10 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-3 py-1.5 font-bdo text-[10px] font-bold text-white">
                <Sparkles size={12} />
                Sponsor desk
              </span>
              <h2 className="mt-3 font-clash text-[1.34rem] leading-tight font-semibold text-white">
                Susun logo partner agar tampil rapi, kredibel, dan mudah dipercaya pengunjung.
              </h2>
              <p className="mt-1 max-w-[280px] font-bdo text-xs leading-5 font-medium">
                Kelola logo sponsor, urutan tampil, dan status publikasi dalam satu ruang kerja yang visual. Logo aktif akan masuk ke marquee publik
                sesuai prioritas.
              </p>
            </div>
            <span className="shrink-0 rounded-2xl border border-white/20 px-3 py-2 text-center backdrop-blur-sm">
              <span className="block font-clash text-lg leading-none font-bold text-white">{active}</span>
              <span className="mt-1 block font-bdo text-[9px] font-bold tracking-wide uppercase">Live</span>
            </span>
          </div>

          <div className="mt-3 overflow-hidden rounded-[22px] border bg-white shadow-[0_18px_36px_-28px_rgba(127,36,25,.5)]">
            <div className="relative min-h-[174px] overflow-hidden bg-[linear-gradient(135deg,#FFFFFF_0%,#FFF7F5_58%,#F8FAFC_100%)]">
              {currentSponsor?.logoUrl ? (
                <div className="flex min-h-[174px] items-center justify-center px-12 py-8">
                  {/* eslint-disable-next-line @next/next/no-img-element -- logo dari storage (URL dinamis), bukan aset statis public */}
                  <img src={currentSponsor.logoUrl} alt={currentSponsor.name} className="max-h-20 max-w-full object-contain" />
                </div>
              ) : currentSponsor ? (
                <div className="flex min-h-[174px] flex-col items-center justify-center gap-2 px-10 text-center">
                  <ImageIcon size={28} className="text-[#E35336]/55" />
                  <p className="font-clash text-sm font-semibold text-slate-950">Logo belum diunggah</p>
                </div>
              ) : (
                <div className="flex min-h-[174px] flex-col items-center justify-center gap-2 px-10 text-center">
                  <ImageIcon size={28} className="text-[#E35336]/55" />
                  <p className="font-clash text-sm font-semibold text-slate-950">Belum ada sponsor aktif</p>
                  <p className="font-bdo text-xs font-medium text-slate-500">Aktifkan sponsor untuk preview.</p>
                </div>
              )}

              <button
                type="button"
                onClick={goToPrevious}
                disabled={activeItems.length <= 1}
                className="absolute top-1/2 left-2 z-30 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-2xl border border-white/70 bg-white/90 text-[#B93D2A] shadow-xs disabled:opacity-35"
                aria-label="Sponsor sebelumnya"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={goToNext}
                disabled={activeItems.length <= 1}
                className="absolute top-1/2 right-2 z-30 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-2xl border border-white/70 bg-white/90 text-[#B93D2A] shadow-xs disabled:opacity-35"
                aria-label="Sponsor berikutnya"
              >
                <ChevronRight size={16} />
              </button>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-linear-to-t from-slate-950/70 via-slate-950/20 to-transparent px-3 pt-12 pb-3">
                <p className="font-bdo text-[9px] font-bold tracking-widest text-white/75 uppercase">
                  Logo {activeItems.length > 0 ? currentIndex + 1 : 0} dari {activeItems.length}
                </p>
                <p className="mt-0.5 truncate font-clash text-base font-semibold text-white">{currentSponsor?.name ?? 'Brand Wall'}</p>
              </div>
            </div>

            <div className="sponsor-scrollbar flex gap-2 overflow-x-auto bg-white px-3 py-2.5">
              {activeItems.length > 0 ? (
                activeItems.slice(0, 8).map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCurrentIndex(index)}
                    className={cn(
                      'flex h-10 min-w-[68px] items-center justify-center rounded-2xl border bg-white px-2 transition',
                      currentSponsor?.id === item.id ? 'border-[#E35336] ring-2 ring-[#E35336]/10' : 'border-slate-200'
                    )}
                  >
                    {item.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- logo dari storage (URL dinamis), bukan aset statis public
                      <img src={item.logoUrl} alt={item.name} className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span className="truncate font-bdo text-[10px] font-bold text-slate-400">{item.name}</span>
                    )}
                  </button>
                ))
              ) : (
                <span className="font-bdo text-xs font-semibold text-slate-400">Belum ada logo aktif.</span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onCreate}
            className="sponsor-btn-sheen mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#F08C78_0%,#E35336_52%,#B93D2A_100%)] px-4 font-clash text-sm font-semibold text-white shadow-[0_18px_34px_-24px_rgba(227,83,54,.95)]"
          >
            <Plus size={15} />
            Tambah Sponsor
          </button>
        </div>
      </section>

      <section className="sponsor-enter sponsor-sheen relative hidden overflow-hidden rounded-[26px] border border-[#F8B5A8]/70 bg-[linear-gradient(135deg,#E35336_0%,#B93D2A_58%,#7F2419_100%)] text-white shadow-[0_28px_68px_-54px_rgba(127,36,25,.72)] sm:block">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,.085)_0,rgba(255,255,255,.085)_1px,transparent_1px,transparent_22px)]" />
        <div className="pointer-events-none absolute -top-28 -right-20 h-72 w-72 rounded-full border" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full blur-3xl" />

        <div className="relative z-10 grid gap-0 xl:grid-cols-[minmax(0,1fr)_minmax(340px,410px)]">
          <div className="p-4 sm:p-5 lg:p-5">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-2xl border px-3 py-1.5 font-bdo text-[10px] font-bold text-white shadow-[0_16px_30px_-26px_rgba(15,23,42,.32)] backdrop-blur-sm">
                <Sparkles size={13} />
                Sponsor control desk
              </span>
              <h2 className="mt-3 max-w-4xl font-clash text-[1.72rem] leading-[1.03] font-semibold text-white sm:text-[2.35rem] lg:text-[2.75rem]">
                Susun logo partner agar tampil rapi, kredibel, dan mudah dipercaya pengunjung.
              </h2>
              <p className="mt-2 max-w-2xl font-bdo text-xs leading-5 font-medium sm:text-sm sm:leading-6">
                Kelola logo sponsor, urutan tampil, dan status publikasi dalam satu ruang kerja yang visual. Logo aktif akan masuk ke marquee publik
                sesuai prioritas.
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:mt-5 md:grid-cols-[minmax(0,1fr)_minmax(196px,.38fr)]">
              <div className="rounded-[20px] border p-3 shadow-xs backdrop-blur-sm sm:p-3.5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-bdo text-[10px] font-bold tracking-widest text-white/60 uppercase">Marquee publik</p>
                    <p className="mt-1 font-clash text-base font-semibold text-white sm:text-xl">
                      {active > 0 ? `${active} sponsor sedang tampil` : 'Belum ada sponsor aktif'}
                    </p>
                  </div>
                  <div className="inline-flex w-fit items-center gap-2 rounded-2xl border bg-white px-3 py-1.5 font-bdo text-[10px] font-bold text-[#B93D2A] sm:py-2 sm:text-[11px]">
                    <Eye size={14} />
                    Live preview
                  </div>
                </div>
                <div className="sponsor-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1 sm:mt-4">
                  {activeItems.length > 0 ? (
                    activeItems.slice(0, 8).map((item) => (
                      <span
                        key={item.id}
                        className="flex h-12 min-w-[82px] items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-xs sm:h-14 sm:min-w-[96px]"
                      >
                        {item.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- logo dari storage (URL dinamis), bukan aset statis public
                          <img src={item.logoUrl} alt={item.name} className="max-h-full max-w-full object-contain" />
                        ) : (
                          <span className="truncate font-bdo text-[11px] font-bold text-slate-400">{item.name}</span>
                        )}
                      </span>
                    ))
                  ) : (
                    <span className="flex h-12 w-full items-center justify-center rounded-2xl border border-dashed border-[#F8B5A8] bg-[#FFF7F5] px-3 text-center font-bdo text-xs font-semibold text-[#B93D2A] sm:h-14 sm:text-sm">
                      Tambahkan sponsor aktif untuk melihat preview.
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={onCreate}
                className="sponsor-btn-sheen flex min-h-[112px] flex-col justify-between rounded-[20px] border bg-white p-3.5 text-left text-[#B93D2A] shadow-[0_18px_34px_-24px_rgba(15,23,42,.35)] transition hover:-translate-y-1 sm:min-h-[138px]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-[15px] bg-[#FFF1EE] ring-1 ring-[#FFD5CD]">
                  <Plus size={18} />
                </span>
                <span>
                  <span className="block font-clash text-base font-semibold text-slate-950 sm:text-lg">Tambah Sponsor</span>
                  <span className="mt-1 block font-bdo text-xs font-semibold text-slate-500">Upload logo, aktifkan, lalu posisikan urutannya.</span>
                </span>
              </button>
            </div>
          </div>

          <div className="border-t bg-white/10 p-3.5 backdrop-blur-sm sm:p-4 xl:border-t-0 xl:border-l">
            <div className="sponsor-card-glint flex h-full min-h-[250px] flex-col overflow-hidden rounded-[22px] border border-white/70 bg-white p-3.5 text-slate-950 shadow-[0_26px_58px_-42px_rgba(15,23,42,.45)] sm:min-h-[318px] xl:min-h-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <ShinyIcon className="h-10 w-10 sm:h-11 sm:w-11">
                    <Sparkles size={17} />
                  </ShinyIcon>
                  <div>
                    <p className="font-bdo text-[10px] font-bold tracking-widest text-[#B93D2A] uppercase">Brand Wall</p>
                    <h3 className="font-clash text-base font-semibold text-slate-950 sm:text-lg">Tampilan Logo</h3>
                  </div>
                </div>
                <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-bdo text-[9px] font-bold text-emerald-700 uppercase sm:px-3 sm:py-1.5 sm:text-[10px]">
                  {active} live
                </span>
              </div>

              <div className="relative mt-3 flex-1 overflow-hidden rounded-[20px] bg-[#FFF7F4] ring-1 ring-[#FFE0D8] sm:mt-4 sm:rounded-[24px]">
                {currentSponsor ? (
                  <div className="group h-full min-h-[160px] w-full text-left sm:min-h-[240px] xl:min-h-0">
                    {currentSponsor.logoUrl ? (
                      <div className="flex h-full min-h-[160px] items-center justify-center bg-[linear-gradient(135deg,#FFFFFF_0%,#FFF7F5_58%,#F8FAFC_100%)] p-6 sm:min-h-[240px] sm:p-8 xl:min-h-0">
                        {/* eslint-disable-next-line @next/next/no-img-element -- logo dari storage (URL dinamis), bukan aset statis public */}
                        <img
                          src={currentSponsor.logoUrl}
                          alt={currentSponsor.name}
                          className="max-h-20 max-w-full object-contain transition duration-700 group-hover:scale-105 sm:max-h-32"
                        />
                      </div>
                    ) : (
                      <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 px-5 text-center sm:min-h-[240px] sm:gap-3 sm:px-6 xl:min-h-0">
                        <span className="flex h-12 w-12 items-center justify-center rounded-[20px] border border-[#FFD5CD] bg-white text-[#E35336] shadow-xs sm:h-14 sm:w-14 sm:rounded-[22px]">
                          <ImageIcon size={22} />
                        </span>
                        <span className="font-clash text-sm font-semibold text-slate-950 sm:text-base">Logo belum diunggah</span>
                        <span className="max-w-xs font-bdo text-xs leading-5 font-medium text-slate-500 sm:text-sm">
                          Tambahkan logo agar brand wall terlihat penuh.
                        </span>
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-linear-to-t from-slate-950/70 to-transparent p-3 pt-12 sm:p-4 sm:pt-16">
                      <div className="flex items-end justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bdo text-[9px] font-bold tracking-widest text-white/75 uppercase sm:text-[10px]">
                            Sponsor {activeItems.length > 0 ? currentIndex + 1 : 0} dari {activeItems.length}
                          </p>
                          <p className="mt-0.5 line-clamp-1 font-clash text-base font-semibold text-white sm:mt-1 sm:text-lg">
                            {currentSponsor.name}
                          </p>
                        </div>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/40 bg-white/20 text-white backdrop-blur-sm sm:h-10 sm:w-10">
                          <Eye size={15} />
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full min-h-[170px] flex-col items-center justify-center gap-2 px-5 text-center sm:min-h-[240px] sm:gap-3 sm:px-6">
                    <ImageIcon size={30} className="text-[#E35336]/55" />
                    <p className="font-clash text-sm font-semibold text-slate-950 sm:text-base">Belum ada logo aktif</p>
                    <p className="max-w-xs font-bdo text-xs leading-5 font-medium text-slate-500 sm:text-sm">
                      Aktifkan sponsor untuk membangun carousel Brand Wall.
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={goToPrevious}
                  disabled={activeItems.length <= 1}
                  className="absolute top-1/2 left-2 z-30 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-2xl border border-white/60 bg-white/90 text-[#B93D2A] shadow-xs backdrop-blur-sm transition hover:bg-[#FFF1EE] disabled:cursor-not-allowed disabled:opacity-35 sm:left-3 sm:h-10 sm:w-10"
                  aria-label="Sponsor sebelumnya"
                >
                  <ChevronLeft size={17} />
                </button>
                <button
                  type="button"
                  onClick={goToNext}
                  disabled={activeItems.length <= 1}
                  className="absolute top-1/2 right-2 z-30 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-2xl border border-white/60 bg-white/90 text-[#B93D2A] shadow-xs backdrop-blur-sm transition hover:bg-[#FFF1EE] disabled:cursor-not-allowed disabled:opacity-35 sm:right-3 sm:h-10 sm:w-10"
                  aria-label="Sponsor berikutnya"
                >
                  <ChevronRight size={17} />
                </button>
              </div>

              <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:mt-3">
                <div className="flex min-w-0 items-center justify-center rounded-2xl border border-[#FFD5CD] bg-[#FFF1EE] px-3 py-2 font-bdo text-[11px] font-bold text-[#B93D2A]">
                  {activeItems.length > 0 ? `Logo ${currentIndex + 1} dari ${activeItems.length}` : 'Belum ada logo'}
                </div>
                <button
                  type="button"
                  onClick={onCreate}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-[#E35336] px-4 font-clash text-xs font-semibold text-white transition hover:bg-[#B93D2A]"
                >
                  <Plus size={13} />
                  Tambah
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

function SponsorsIndex() {
  const { data, isLoading } = useSponsorIndex()
  const initialItems = useMemo(() => data?.items ?? [], [data])
  const deleteMutation = useDeleteSponsor()
  const reorderMutation = useReorderSponsors()
  const [items, setItems] = useState<AdminSponsorDto[]>(initialItems)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [slideOver, setSlideOver] = useState<{ open: boolean; item: AdminSponsorDto | null }>({
    open: false,
    item: null
  })

  useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  const openNew = () => setSlideOver({ open: true, item: null })
  const openEdit = (item: AdminSponsorDto) => setSlideOver({ open: true, item })
  const close = () => setSlideOver({ open: false, item: null })

  const handleDelete = async (item: AdminSponsorDto) => {
    if (!confirm(`Hapus "${item.name}"?`)) return

    try {
      await deleteMutation.mutateAsync(item.id)
      toast.success('Sponsor deleted.')
    } catch (error) {
      toast.error(extractApiError(error).message)
    }
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((item) => item.id.toString() === active.id)
    const newIndex = items.findIndex((item) => item.id.toString() === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    const reordered = arrayMove(items, oldIndex, newIndex)
    setItems(reordered)
    reorderMutation.mutate(reordered.map((item) => item.id))
  }

  const stats = useMemo(() => {
    const active = items.filter((item) => item.isActive).length
    const inactive = items.length - active
    const withLogo = items.filter((item) => Boolean(item.logoUrl)).length

    return { active, inactive, withLogo }
  }, [items])

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase()

    return items.filter((item) => {
      const matchesQuery = !needle || item.name.toLowerCase().includes(needle)
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && item.isActive) || (statusFilter === 'inactive' && !item.isActive)

      return matchesQuery && matchesStatus
    })
  }, [items, query, statusFilter])

  return (
    <>
      <div className="px-4 pt-2 xl:px-8">
        <div className="sponsor-enter flex flex-col gap-1 pt-3">
          <span className="font-bdo text-[11px] font-medium tracking-wide text-[#E35336]">Manajemen Konten</span>
          <h1 className="font-clash text-2xl font-bold tracking-tight uppercase xl:text-3xl">
            <span className="sponsor-title-shine">Logo Sponsor</span>
          </h1>
        </div>
      </div>

      <main className="ubsc-page-sponsors max-w-full flex-1 px-4 pt-2 pb-10 xl:px-8">
        <div className="flex flex-col gap-4 overflow-x-hidden pt-4 pb-16">
          <SponsorHero items={items} active={stats.active} onCreate={openNew} />

          <section className="sponsor-enter sponsor-card-glint relative overflow-hidden rounded-[22px] border border-[#FFE0D8] bg-white p-3.5 shadow-[0_22px_52px_-44px_rgba(127,36,25,.5)] delay-100 sm:p-4">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-b from-[#FFF7F5] to-transparent" />
            <div className="relative z-10 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-3">
                <ShinyIcon className="h-10 w-10">
                  <Layers3 size={17} />
                </ShinyIcon>
                <div>
                  <p className="font-bdo text-[10px] font-bold tracking-widest text-slate-400 uppercase">Workspace</p>
                  <h2 className="font-clash text-base leading-tight font-semibold text-slate-950">Kurasi Sponsor</h2>
                  <p className="mt-0.5 font-bdo text-[11px] font-medium text-slate-400 sm:text-xs">
                    Cari, filter, tambah, lalu seret kartu sesuai prioritas tampil.
                  </p>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_148px_auto] xl:min-w-[660px]">
                <label className="flex h-10 min-w-0 items-center gap-2 rounded-[16px] border border-[#F8B5A8]/60 bg-[#FFF7F5] px-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,.8)] sm:h-11">
                  <Search size={15} className="shrink-0 text-[#B93D2A]" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Cari nama sponsor..."
                    className="min-w-0 flex-1 border-0 bg-transparent p-0 font-bdo text-sm font-semibold text-slate-700 outline-hidden placeholder:text-slate-400 focus:ring-0"
                  />
                </label>

                <label className="flex h-10 items-center gap-2 rounded-[16px] border border-slate-200 bg-slate-50 px-3 shadow-[inset_0_1px_0_rgba(255,255,255,.72)] sm:h-11">
                  <span className="sr-only">Filter status sponsor</span>
                  <Filter size={14} className="shrink-0 text-slate-400" />
                  <select
                    aria-label="Filter status sponsor"
                    title="Filter status sponsor"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                    className="min-w-0 border-0 bg-transparent p-0 font-bdo text-sm font-bold text-slate-600 outline-hidden focus:ring-0"
                  >
                    <option value="all">Semua</option>
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </label>

                <button
                  type="button"
                  onClick={openNew}
                  className="sponsor-btn-sheen inline-flex h-10 items-center justify-center gap-2 rounded-[16px] bg-[linear-gradient(135deg,#F08C78_0%,#E35336_52%,#B93D2A_100%)] px-5 font-clash text-sm font-semibold text-white shadow-[0_18px_34px_-24px_rgba(227,83,54,.95)] transition hover:-translate-y-0.5 sm:h-11"
                >
                  <Plus size={15} />
                  Sponsor
                </button>
              </div>
            </div>

            <div className="relative z-10 mt-4 hidden gap-2 sm:grid sm:grid-cols-3">
              {[
                { icon: <Layers3 size={14} />, label: 'Seret kartu', note: 'Atur prioritas tampil' },
                { icon: <Pencil size={14} />, label: 'Edit cepat', note: 'Form tetap di halaman' },
                { icon: <Eye size={14} />, label: 'Status publik', note: 'Aktif atau sembunyi' }
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
          </section>

          <section className="sponsor-scrollbar sponsor-enter flex gap-2 overflow-x-auto rounded-[20px] border border-[#FFE0D8] bg-[#FFF7F5]/70 p-2 shadow-[0_16px_34px_-30px_rgba(127,36,25,.4)] delay-200 sm:grid sm:grid-cols-4 sm:overflow-visible">
            {[
              { label: 'Total Sponsor', value: items.length, tone: 'border-[#FFD5CD] bg-[#FFF7F5] text-[#B93D2A]' },
              { label: 'Aktif', value: stats.active, tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
              { label: 'Logo Siap', value: stats.withLogo, tone: 'border-sky-200 bg-sky-50 text-sky-700' },
              { label: 'Nonaktif', value: stats.inactive, tone: 'border-slate-200 bg-white text-slate-600' }
            ].map((item) => (
              <div
                key={item.label}
                className={cn(
                  'flex min-h-[54px] min-w-[150px] items-center justify-between gap-3 rounded-[16px] border px-3 py-2 shadow-xs sm:min-w-0',
                  item.tone
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate font-bdo text-[9px] font-bold tracking-wide uppercase opacity-70 sm:text-[10px]">{item.label}</span>
                  <span className="mt-1 block font-bdo text-[10px] font-semibold text-slate-400 sm:text-[11px]">
                    {item.label === 'Aktif'
                      ? 'Live marquee'
                      : item.label === 'Logo Siap'
                        ? 'Sudah upload'
                        : item.label === 'Nonaktif'
                          ? 'Disembunyikan'
                          : 'Semua partner'}
                  </span>
                </span>
                <span className="shrink-0 font-clash text-lg font-bold text-slate-950 sm:text-xl">{item.value}</span>
              </div>
            ))}
          </section>

          {filteredItems.length === 0 && !isLoading ? (
            <section className="sponsor-enter flex flex-col items-center justify-center gap-4 rounded-[28px] border border-dashed border-[#FFD5CD] bg-[#FFF7F5] px-6 py-16 text-center delay-200">
              <ShinyIcon className="h-14 w-14">
                <Building2 size={22} />
              </ShinyIcon>
              <div>
                <p className="font-clash text-lg font-semibold text-slate-950">
                  {items.length === 0 ? 'Belum ada sponsor' : 'Sponsor tidak ditemukan'}
                </p>
                <p className="mt-1 font-bdo text-sm text-slate-500">
                  {items.length === 0 ? 'Tambahkan logo sponsor pertama untuk mengisi marquee publik.' : 'Coba ubah kata kunci atau filter status.'}
                </p>
              </div>
              <button
                type="button"
                onClick={openNew}
                className="sponsor-btn-sheen inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#E35336] px-5 font-clash text-sm font-semibold text-white shadow-[0_18px_34px_-24px_rgba(227,83,54,.95)] transition hover:-translate-y-0.5"
              >
                <Plus size={15} />
                Tambah Sponsor
              </button>
            </section>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={filteredItems.map((item) => item.id.toString())} strategy={rectSortingStrategy}>
                <section className="sponsor-scrollbar sponsor-touch-scroll sponsor-enter grid max-h-[58vh] grid-cols-1 gap-3 overflow-y-auto pr-1 delay-300 sm:max-h-[640px] sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:max-h-[calc(100vh-330px)] 2xl:grid-cols-4">
                  {filteredItems.map((item) => (
                    <SortableCard key={item.id} id={item.id.toString()}>
                      {(handle) => (
                        <SponsorCard
                          item={item}
                          index={items.findIndex((source) => source.id === item.id)}
                          onEdit={openEdit}
                          onDelete={handleDelete}
                          handle={handle}
                        />
                      )}
                    </SortableCard>
                  ))}
                </section>
              </SortableContext>
            </DndContext>
          )}

          <section className="sponsor-enter flex flex-wrap items-center gap-3 rounded-[24px] border border-slate-200 bg-white px-4 py-3 delay-300">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 ring-1 ring-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              <span className="font-bdo text-[11px] font-semibold text-slate-500">Aktif tampil di marquee publik</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-50 ring-1 ring-slate-200">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
              </span>
              <span className="font-bdo text-[11px] font-semibold text-slate-500">Nonaktif disembunyikan sementara</span>
            </div>
          </section>
        </div>

        <SlideOver
          isOpen={slideOver.open}
          onClose={close}
          title={<span className="font-clash text-xl font-bold">{slideOver.item ? 'Edit Sponsor' : 'Tambah Sponsor'}</span>}
          description={
            <span className="font-bdo text-sm text-slate-500">
              {slideOver.item ? 'Perbarui detail dan logo sponsor.' : 'Tambahkan sponsor baru ke marquee publik.'}
            </span>
          }
        >
          {slideOver.open && <SponsorForm key={slideOver.item?.id ?? 'new'} item={slideOver.item} onClose={close} />}
        </SlideOver>
      </main>
    </>
  )
}

export default SponsorsIndex
