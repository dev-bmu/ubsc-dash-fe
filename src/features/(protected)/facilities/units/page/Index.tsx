'use client'

import '../units.css'

import { ArrowLeft, Banknote, CheckCircle2, Clock3, ImageIcon, Layers3, Pencil, Plus, Trash2, UploadCloud, X } from 'lucide-react'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { SingleDropzone } from '@/components/admin/ImageDropzone'
import { WeeklySlotEditor, WEEKDAYS, type SlotQuotas, type WeeklySlots } from '@/components/admin/WeeklySlotEditor'
import { cn } from '@/lib/utils'
import { routes } from '@/config/routes'
import { extractApiError, fieldErrorMap } from '@/lib/apiError'
import { useCreateUnit, useDeleteUnit, useFacilityUnits, useUpdateUnit } from '@/hooks/api/useFacilities'
import type { AdminFacilityUnitDto } from '@/types/contracts/contracts'

type UserCategory = 'warga_ub' | 'umum'

interface UnitPriceRow {
  id?: string
  userCategory: UserCategory
  label: string
  price: number | string
  durationMinutes: number | null
  scheduleType: string
  applicableDays?: string[] | null
  startsAt?: string | null
  endsAt?: string | null
  startsOn?: string | null
  endsOn?: string | null
  notes?: string | null
  sortOrder?: number
}

type UnitFormData = {
  name: string
  isActive: boolean
  capacity: number
  useCustomSchedule: boolean
  activeSlots: WeeklySlots | null
  slotQuotas: SlotQuotas | null
  useCustomPricing: boolean
  prices: UnitPriceRow[]
  unitImage: File | null
  removeUnitImage: boolean
}

type Weekday = (typeof WEEKDAYS)[number]

const PRICE_SEGMENTS: Array<{ value: UserCategory; label: string; helper: string }> = [
  { value: 'umum', label: 'Umum', helper: 'Harga pengunjung umum' },
  { value: 'warga_ub', label: 'Warga UB', helper: 'Harga sivitas/warga UB' }
]

const emptyDayTexts = (): Record<Weekday, string> => WEEKDAYS.reduce((acc, day) => ({ ...acc, [day]: '' }), {} as Record<Weekday, string>)

const toDayTexts = (slots: Record<string, string[]> | null | undefined): Record<Weekday, string> =>
  WEEKDAYS.reduce((acc, day) => ({ ...acc, [day]: slots?.[day]?.join(', ') ?? '' }), {} as Record<Weekday, string>)

const parseSlotText = (text: string): string[] =>
  text
    .split(',')
    .map((value) => value.trim())
    .filter((value) => /^\d{2}:\d{2}$/.test(value))

const toActiveSlots = (texts: Record<Weekday, string>): Record<string, string[]> =>
  WEEKDAYS.reduce((acc, day) => ({ ...acc, [day]: parseSlotText(texts[day]) }), {} as Record<string, string[]>)

const defaultUnitPrices = (): UnitPriceRow[] => [
  { userCategory: 'umum', label: 'Reguler', price: 0, durationMinutes: 60, scheduleType: 'regular', sortOrder: 0 },
  { userCategory: 'warga_ub', label: 'Reguler', price: 0, durationMinutes: 60, scheduleType: 'regular', sortOrder: 1 }
]

const makeInitialForm = (): UnitFormData => ({
  name: '',
  isActive: true,
  capacity: 1,
  useCustomSchedule: false,
  activeSlots: null,
  slotQuotas: null,
  useCustomPricing: false,
  prices: defaultUnitPrices(),
  unitImage: null,
  removeUnitImage: false
})

function ShinyIcon({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#F08C78_0%,#E35336_52%,#B93D2A_100%)] text-white shadow-[0_18px_30px_-22px_rgba(227,83,54,.95)]',
        className
      )}
    >
      {children}
      <span className="pointer-events-none absolute top-1.5 right-2 left-2 h-1 rounded-full bg-white/35 blur-[1px]" />
    </div>
  )
}

function MetricCard({ label, value, tone }: { label: string; value: number; tone: 'terracotta' | 'emerald' | 'slate' }) {
  const palette = {
    terracotta: 'border-[#F8B5A8] bg-[#FFF7F5] text-[#B93D2A]',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-700'
  }[tone]

  return (
    <div className={cn('rounded-[24px] border px-4 py-3', palette)}>
      <p className="font-bdo text-[10px] font-bold tracking-[0.16em] uppercase opacity-70">{label}</p>
      <p className="mt-1 font-clash text-3xl leading-none font-bold">{value}</p>
    </div>
  )
}

function UnitCard({
  unit,
  onEdit,
  onDelete
}: {
  unit: AdminFacilityUnitDto
  onEdit: (unit: AdminFacilityUnitDto) => void
  onDelete: (unit: AdminFacilityUnitDto) => void
}) {
  return (
    <article className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:border-[#F8B5A8] hover:shadow-[0_22px_42px_-34px_rgba(227,83,54,.55)]">
      <div className="relative aspect-16/10 overflow-hidden bg-[#FFF7F5]">
        {unit.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- foto unit berupa URL storage dinamis dari server, bukan aset statis Next
          <img src={unit.imageUrl} alt={unit.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_70%_20%,rgba(227,83,54,.12),transparent_30%),linear-gradient(135deg,#FFFFFF_0%,#FFF7F5_100%)] text-[#B93D2A]">
            <ShinyIcon className="h-12 w-12">
              <ImageIcon size={20} />
            </ShinyIcon>
            <p className="font-bdo text-xs font-semibold text-slate-500">Foto unit belum tersedia</p>
          </div>
        )}

        <div className="absolute top-3 left-3 rounded-2xl px-3 py-1.5 font-bdo text-[11px] font-bold text-slate-700 shadow-[0_12px_24px_-20px_rgba(15,23,42,.45)] backdrop-blur-sm">
          #{unit.id}
        </div>

        <div
          className={cn(
            'absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-bdo text-[11px] font-bold backdrop-blur-sm',
            unit.isActive ? 'border-emerald-200 text-emerald-700' : 'border-slate-200 text-slate-500'
          )}
        >
          <span className={cn('h-2 w-2 rounded-full', unit.isActive ? 'bg-emerald-400' : 'bg-slate-300')} />
          {unit.isActive ? 'Aktif' : 'Nonaktif'}
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div>
          <h2 className="font-clash text-lg leading-tight font-semibold text-slate-950">{unit.name}</h2>
          <p className="mt-1 font-bdo text-xs font-medium text-slate-400">Unit fisik untuk pilihan reservasi.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-bdo text-[10px] font-bold',
              unit.useCustomSchedule ? 'bg-[#FFF7F5] text-[#B93D2A] ring-1 ring-[#F8B5A8]/70' : 'bg-slate-50 text-slate-500 ring-1 ring-slate-200'
            )}
          >
            <Clock3 size={11} />
            {unit.useCustomSchedule ? 'Jam custom' : 'Jam default'}
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-bdo text-[10px] font-bold',
              unit.useCustomPricing ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-slate-50 text-slate-500 ring-1 ring-slate-200'
            )}
          >
            <Banknote size={11} />
            {unit.useCustomPricing ? 'Harga custom' : 'Harga default'}
          </span>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <button
            type="button"
            onClick={() => onEdit(unit)}
            className="flex h-10 items-center justify-center gap-2 rounded-2xl bg-slate-50 font-bdo text-xs font-bold text-slate-600 transition hover:bg-[#FFF7F5] hover:text-[#B93D2A]"
          >
            <Pencil size={14} />
            Edit Unit
          </button>
          <button
            type="button"
            onClick={() => onDelete(unit)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 transition hover:bg-rose-100"
            aria-label={`Hapus ${unit.name}`}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </article>
  )
}

export default function FacilityUnits() {
  const id = useParams().id as string
  const { data, isLoading } = useFacilityUnits(id)
  const facility = data?.facility ?? null
  const units = data?.units ?? []

  // In class mode a "unit" is a parallel group: Kelas A, Kelas B. Same table,
  // same form, different words and one extra field.
  const isClassMode = facility?.bookingMode === 'class'
  const [formOpen, setFormOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<AdminFacilityUnitDto | null>(null)
  const [dayTexts, setDayTexts] = useState<Record<Weekday, string>>(emptyDayTexts)
  const [form, setForm] = useState<UnitFormData>(makeInitialForm)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const createUnit = useCreateUnit(id)
  const updateUnit = useUpdateUnit(id)
  const deleteUnitMutation = useDeleteUnit(id)
  const processing = createUnit.isPending || updateUnit.isPending

  const activeCount = useMemo(() => units.filter((unit) => unit.isActive).length, [units])
  const inactiveCount = units.length - activeCount

  const setData = <K extends keyof UnitFormData>(key: K, value: UnitFormData[K]) => setForm((prev) => ({ ...prev, [key]: value }))

  const closeForm = () => {
    setFormOpen(false)
    setEditingUnit(null)
    setDayTexts(emptyDayTexts())
    setForm(makeInitialForm())
    setErrors({})
  }

  const openCreate = () => {
    setEditingUnit(null)
    setErrors({})
    setForm(makeInitialForm())
    setDayTexts(emptyDayTexts())
    setFormOpen(true)
  }

  const openEdit = (unit: AdminFacilityUnitDto) => {
    setEditingUnit(unit)
    setErrors({})
    setDayTexts(toDayTexts(unit.activeSlots))
    setForm({
      name: unit.name,
      isActive: unit.isActive,
      capacity: unit.capacity ?? 1,
      useCustomSchedule: unit.useCustomSchedule,
      activeSlots: unit.activeSlots,
      slotQuotas: unit.slotQuotas,
      useCustomPricing: unit.useCustomPricing,
      prices: unit.prices.length > 0 ? unit.prices : defaultUnitPrices(),
      unitImage: null,
      removeUnitImage: false
    })
    setFormOpen(true)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()

    // The editor writes straight into activeSlots now; rebuilding it from the
    // old text buffer here would discard everything typed as chips.
    const activeSlots = form.useCustomSchedule ? (form.activeSlots ?? {}) : null
    const slotQuotas = form.useCustomSchedule ? (form.slotQuotas ?? {}) : null
    const prices = form.useCustomPricing ? form.prices : []

    const formData = new FormData()
    formData.set('name', form.name)
    formData.set('capacity', String(form.capacity))
    formData.set('isActive', form.isActive ? 'true' : 'false')
    formData.set('useCustomSchedule', form.useCustomSchedule ? 'true' : 'false')
    formData.set('useCustomPricing', form.useCustomPricing ? 'true' : 'false')
    formData.set('activeSlots', JSON.stringify(activeSlots))
    formData.set('slotQuotas', JSON.stringify(slotQuotas))
    formData.set('prices', JSON.stringify(prices))
    if (form.unitImage) formData.set('unitImage', form.unitImage)
    if (form.removeUnitImage) formData.set('removeUnitImage', 'true')

    setErrors({})

    try {
      if (editingUnit) {
        await updateUnit.mutateAsync({ unitId: editingUnit.id, formData })
      } else {
        await createUnit.mutateAsync(formData)
      }
      toast.success(editingUnit ? 'Unit berhasil diperbarui.' : 'Unit berhasil dibuat.')
      closeForm()
    } catch (error) {
      const parsed = extractApiError(error)
      setErrors(fieldErrorMap(error))
      if (Object.keys(parsed.fields).length === 0) toast.error(parsed.message)
    }
  }

  const deleteUnit = async (unit: AdminFacilityUnitDto) => {
    if (!confirm(`Hapus unit "${unit.name}"?`)) {
      return
    }

    try {
      await deleteUnitMutation.mutateAsync(unit.id)
      toast.success('Unit berhasil dihapus.')
    } catch (error) {
      // The API blocks delete with 422 when the unit still has bookings.
      toast.error(extractApiError(error).message)
    }
  }

  const setPriceRow = (segment: UserCategory, field: 'price' | 'durationMinutes', value: string | number) => {
    const currentRows = form.prices.length > 0 ? form.prices : defaultUnitPrices()
    const nextRows = currentRows.map((row) => {
      if (row.userCategory !== segment || row.label !== 'Reguler') {
        return row
      }

      return {
        ...row,
        [field]: field === 'durationMinutes' ? Number(value) : value
      }
    })

    setData('prices', nextRows)
  }

  const regularPriceFor = (segment: UserCategory): UnitPriceRow =>
    (form.prices.length > 0 ? form.prices : defaultUnitPrices()).find((row) => row.userCategory === segment && row.label === 'Reguler') ??
    defaultUnitPrices().find((row) => row.userCategory === segment)!

  return (
    <>
      <div className="px-4 pt-2 xl:px-8">
        <div className="unit-fade-up flex flex-col gap-1 pt-4">
          <span className="font-bdo text-[11px] font-medium tracking-wide text-[#E35336]">Inventory Fasilitas</span>
          <h1 className="font-clash text-3xl font-bold tracking-tight uppercase xl:text-4xl">
            <span className="unit-shiny">Kelola Unit</span>
          </h1>
        </div>
      </div>
      <main className="ubsc-page-facility-units max-w-full flex-1 px-4 pt-2 pb-10 xl:px-8">
        <div className="flex flex-col gap-5 pt-4 pb-20">
          <section className="unit-fade-up overflow-hidden rounded-[32px] border border-[#F8B5A8]/70 bg-white">
            <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="relative overflow-hidden p-5 sm:p-7">
                <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[#E35336]/10 blur-3xl" />
                <div className="relative z-10">
                  <Link
                    href={routes.facilities()}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 font-bdo text-[12px] font-bold text-slate-600 transition hover:border-[#F8B5A8] hover:text-[#B93D2A]"
                  >
                    <ArrowLeft size={14} />
                    Kembali ke fasilitas
                  </Link>

                  <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl">
                      <div className="inline-flex items-center gap-2 rounded-full border border-[#F8B5A8] bg-[#FFF7F5] px-3 py-1.5 font-bdo text-[10px] font-bold tracking-[0.18em] text-[#B93D2A] uppercase">
                        <span className="unit-live-dot" />
                        Unit yang tampil hanya di alur booking
                      </div>
                      <h2 className="mt-4 font-clash text-3xl leading-tight font-semibold tracking-tight text-slate-950 sm:text-4xl sm:leading-10">
                        {facility?.name}
                      </h2>
                      <p className="mt-2 max-w-xl font-bdo text-sm leading-relaxed font-medium text-slate-500">
                        Buat unit fisik seperti Lapangan 1, Lapangan 2, atau ruang khusus. Halaman publik tetap menampilkan fasilitas utama, sedangkan
                        unit dipilih saat reservasi.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={openCreate}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#F08C78_0%,#E35336_52%,#B93D2A_100%)] px-5 font-clash text-sm font-semibold text-white shadow-[0_18px_30px_-22px_rgba(227,83,54,.95)] transition hover:-translate-y-0.5"
                    >
                      <Plus size={16} />
                      Tambah Unit
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#F8B5A8]/60 bg-[#FFF7F5]/70 p-5 sm:p-7 xl:border-t-0 xl:border-l">
                <div className="relative aspect-16/10 overflow-hidden rounded-[28px] bg-white">
                  {facility?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- foto fasilitas berupa URL storage dinamis dari server, bukan aset statis Next
                    <img src={facility.image} alt={facility.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[#B93D2A]">
                      <Layers3 size={38} />
                    </div>
                  )}
                  <div className="absolute inset-x-4 bottom-4 rounded-2xl p-4 shadow-[0_18px_34px_-26px_rgba(15,23,42,.45)] backdrop-blur-sm">
                    <p className="font-bdo text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase">Parent Facility</p>
                    <p className="mt-1 truncate font-clash text-base font-semibold text-slate-950">{facility?.category ?? 'Tanpa kategori'}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MetricCard label="Total Unit" value={units.length} tone="terracotta" />
            <MetricCard label="Aktif Booking" value={activeCount} tone="emerald" />
            <MetricCard label="Nonaktif" value={inactiveCount} tone="slate" />
          </section>

          <section className="unit-fade-up rounded-[32px] border border-slate-200 bg-white p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <ShinyIcon className="h-11 w-11">
                  <Layers3 size={18} />
                </ShinyIcon>
                <div>
                  <p className="font-clash text-base font-semibold text-slate-950">Daftar Unit</p>
                  <p className="font-bdo text-xs font-medium text-slate-400">Unit aktif akan tersedia untuk dipilih saat booking.</p>
                </div>
              </div>
            </div>

            {isLoading ? null : units.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-[#F8B5A8] bg-[#FFF7F5]/60 px-5 py-14 text-center">
                <ShinyIcon className="h-16 w-16">
                  <UploadCloud size={26} />
                </ShinyIcon>
                <h2 className="mt-5 font-clash text-xl font-semibold text-slate-950">Belum ada unit untuk fasilitas ini</h2>
                <p className="mt-2 max-w-md font-bdo text-sm leading-relaxed font-medium text-slate-500">
                  Tambahkan unit pertama agar user bisa memilih lapangan atau ruang tertentu saat reservasi.
                </p>
                <button
                  type="button"
                  onClick={openCreate}
                  className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white px-5 font-bdo text-sm font-bold text-[#B93D2A] ring-1 ring-[#F8B5A8] transition hover:bg-[#FFF7F5]"
                >
                  <Plus size={15} />
                  Tambah Unit Pertama
                </button>
              </div>
            ) : (
              <div className="unit-scrollbar grid max-h-[760px] grid-cols-1 gap-4 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
                {units.map((unit) => (
                  <UnitCard key={unit.id} unit={unit} onEdit={openEdit} onDelete={deleteUnit} />
                ))}
              </div>
            )}
          </section>

          {formOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-xs">
              <div className="w-full max-w-5xl overflow-hidden rounded-[32px] border border-[#F8B5A8]/70 bg-white shadow-[0_30px_80px_-44px_rgba(15,23,42,.55)]">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <ShinyIcon className="h-10 w-10">{editingUnit ? <Pencil size={16} /> : <Plus size={16} />}</ShinyIcon>
                    <div>
                      <p className="font-clash text-base font-semibold text-slate-950">{editingUnit ? 'Edit Unit' : 'Tambah Unit'}</p>
                      <p className="font-bdo text-xs font-medium text-slate-400">{facility?.name}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={closeForm}
                    className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-50 text-slate-500 transition hover:bg-slate-100"
                    aria-label="Tutup form unit"
                  >
                    <X size={17} />
                  </button>
                </div>

                <form onSubmit={submit} className="unit-scrollbar max-h-[calc(100vh-140px)] overflow-y-auto p-5">
                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="unit-name" className="mb-2 block font-bdo text-[11px] font-bold tracking-[0.16em] text-slate-500 uppercase">
                          {isClassMode ? 'Nama Grup Kelas' : 'Nama Unit'}
                        </label>
                        <input
                          id="unit-name"
                          type="text"
                          value={form.name}
                          onChange={(event) => setData('name', event.target.value)}
                          placeholder={isClassMode ? 'Contoh: Kelas A' : 'Contoh: Lapangan Tenis 1'}
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 font-bdo text-sm font-semibold text-slate-800 outline-hidden transition focus:border-[#F8B5A8] focus:ring-4 focus:ring-[#E35336]/10"
                          autoFocus
                        />
                        {errors.name && <p className="mt-1.5 font-bdo text-xs font-medium text-rose-500">{errors.name}</p>}
                      </div>

                      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <span>
                          <span className="block font-clash text-sm font-semibold text-slate-900">Tersedia untuk booking</span>
                          <span className="mt-0.5 block font-bdo text-xs font-medium text-slate-400">
                            Matikan jika unit sedang perawatan atau belum siap.
                          </span>
                        </span>
                        <input
                          type="checkbox"
                          checked={form.isActive}
                          onChange={(event) => setData('isActive', event.target.checked)}
                          className="h-5 w-5 rounded border-slate-300 text-[#E35336] focus:ring-[#E35336]/25"
                        />
                      </label>

                      {isClassMode && (
                        <div>
                          <label
                            htmlFor="unit-capacity"
                            className="mb-2 block font-bdo text-[11px] font-bold tracking-[0.16em] text-slate-500 uppercase"
                          >
                            Kuota Peserta
                          </label>
                          <input
                            id="unit-capacity"
                            type="number"
                            min={1}
                            max={9999}
                            value={form.capacity}
                            onChange={(event) => setData('capacity', parseInt(event.target.value) || 1)}
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 font-bdo text-sm font-semibold text-slate-800 outline-hidden transition focus:border-[#F8B5A8] focus:ring-4 focus:ring-[#E35336]/10"
                          />
                          <p className="mt-1.5 font-bdo text-xs font-medium text-slate-400">
                            Berapa orang yang muat di satu pertemuan grup ini. Grup lain punya kuotanya sendiri, jadi Kelas A penuh tidak menutup
                            Kelas B. Satu pertemuan bisa dikecualikan lewat kolom kuota di jadwal.
                          </p>
                          {errors.capacity && <p className="mt-1.5 font-bdo text-xs font-medium text-rose-500">{errors.capacity}</p>}
                        </div>
                      )}

                      <div className="rounded-2xl border border-[#F8B5A8]/70 bg-[#FFF7F5] px-4 py-3">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#E35336]" />
                          <p className="font-bdo text-xs leading-relaxed font-medium text-[#8E2D20]">
                            Unit aktif hanya muncul di halaman booking. Daftar fasilitas publik tetap menampilkan fasilitas utama.
                          </p>
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-start gap-3">
                            <ShinyIcon className="h-10 w-10 rounded-2xl">
                              <Clock3 size={16} />
                            </ShinyIcon>
                            <div>
                              <p className="font-clash text-sm font-semibold text-slate-950">{isClassMode ? 'Jadwal pertemuan' : 'Jam buka unit'}</p>
                              <p className="mt-0.5 font-bdo text-xs font-medium text-slate-400">
                                {isClassMode
                                  ? 'Hari dan jam pertemuan grup ini. Boleh berbeda dari grup lain.'
                                  : 'Ikuti jadwal fasilitas utama atau tentukan slot khusus unit ini.'}
                              </p>
                            </div>
                          </div>
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#F8B5A8]/70 bg-[#FFF7F5] px-3 py-2 font-bdo text-xs font-bold text-[#B93D2A]">
                            <input
                              type="checkbox"
                              checked={form.useCustomSchedule}
                              onChange={(event) => {
                                const enabled = event.target.checked
                                setData('useCustomSchedule', enabled)
                                setData('activeSlots', enabled ? toActiveSlots(dayTexts) : null)
                              }}
                              className="h-4 w-4 rounded border-[#F8B5A8] text-[#E35336] focus:ring-[#E35336]/25"
                            />
                            Custom jam
                          </label>
                        </div>

                        {form.useCustomSchedule ? (
                          <div className="mt-4">
                            <WeeklySlotEditor
                              value={form.activeSlots}
                              onChange={(next) => setData('activeSlots', next)}
                              variant={isClassMode ? 'chips' : 'text'}
                              {...(isClassMode
                                ? {
                                    quotas: form.slotQuotas ?? {},
                                    onQuotasChange: (next) => setData('slotQuotas', Object.keys(next).length > 0 ? next : null),
                                    defaultQuota: form.capacity
                                  }
                                : {})}
                            />
                          </div>
                        ) : (
                          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <p className="font-bdo text-xs font-semibold text-slate-500">Unit ini mengikuti jadwal buka fasilitas utama.</p>
                          </div>
                        )}
                      </div>

                      <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-start gap-3">
                            <ShinyIcon className="h-10 w-10 rounded-2xl">
                              <Banknote size={16} />
                            </ShinyIcon>
                            <div>
                              <p className="font-clash text-sm font-semibold text-slate-950">Harga unit</p>
                              <p className="mt-0.5 font-bdo text-xs font-medium text-slate-400">
                                Pakai harga fasilitas utama atau buat harga reguler khusus unit.
                              </p>
                            </div>
                          </div>
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 font-bdo text-xs font-bold text-emerald-700">
                            <input
                              type="checkbox"
                              checked={form.useCustomPricing}
                              onChange={(event) => {
                                const enabled = event.target.checked
                                setData('useCustomPricing', enabled)
                                if (enabled && form.prices.length === 0) {
                                  setData('prices', defaultUnitPrices())
                                }
                              }}
                              className="h-4 w-4 rounded border-emerald-200 text-emerald-500 focus:ring-emerald-500/25"
                            />
                            Custom harga
                          </label>
                        </div>

                        {form.useCustomPricing ? (
                          <div className="mt-4 grid gap-3 lg:grid-cols-2">
                            {PRICE_SEGMENTS.map((segment) => {
                              const row = regularPriceFor(segment.value)

                              return (
                                <div key={segment.value} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                  <p className="font-clash text-sm font-semibold text-slate-950">{segment.label}</p>
                                  <p className="mt-0.5 font-bdo text-[11px] font-medium text-slate-400">{segment.helper}</p>
                                  <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_120px]">
                                    <div className="relative">
                                      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 font-bdo text-xs font-bold text-[#B93D2A]">
                                        Rp
                                      </span>
                                      <input
                                        type="number"
                                        min="0"
                                        step="1000"
                                        value={row.price}
                                        onChange={(event) => setPriceRow(segment.value, 'price', event.target.value)}
                                        className="h-10 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 font-bdo text-xs font-semibold text-slate-700 outline-hidden transition focus:border-[#F8B5A8] focus:ring-4 focus:ring-[#E35336]/10"
                                        aria-label={`Harga ${segment.label}`}
                                      />
                                    </div>
                                    <select
                                      value={row.durationMinutes ?? 60}
                                      onChange={(event) => setPriceRow(segment.value, 'durationMinutes', Number(event.target.value))}
                                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 font-bdo text-xs font-semibold text-slate-700 outline-hidden transition focus:border-[#F8B5A8] focus:ring-4 focus:ring-[#E35336]/10"
                                      aria-label={`Durasi ${segment.label}`}
                                    >
                                      <option value={60}>60 menit</option>
                                      <option value={90}>90 menit</option>
                                      <option value={120}>120 menit</option>
                                    </select>
                                  </div>
                                </div>
                              )
                            })}
                            <p className="font-bdo text-[11px] font-medium text-slate-400 lg:col-span-2">
                              Harga ini dipakai untuk slot reguler unit. Jika custom harga dimatikan, sistem otomatis kembali memakai harga fasilitas
                              utama.
                            </p>
                          </div>
                        ) : (
                          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <p className="font-bdo text-xs font-semibold text-slate-500">Unit ini mengikuti harga fasilitas utama.</p>
                          </div>
                        )}
                        {errors.prices && <p className="mt-2 font-bdo text-xs font-medium text-rose-500">{errors.prices}</p>}
                      </div>
                    </div>

                    <SingleDropzone
                      label="Foto Unit"
                      currentUrl={editingUnit?.imageUrl ?? null}
                      onFileSelect={(file) => setData('unitImage', file)}
                      onRemoveExisting={() => setData('removeUnitImage', true)}
                    />
                  </div>

                  {errors.unitImage && <p className="mt-3 font-bdo text-xs font-medium text-rose-500">{errors.unitImage}</p>}

                  <div className="mt-5 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={closeForm}
                      className="h-11 rounded-2xl bg-slate-100 px-5 font-bdo text-sm font-bold text-slate-600 transition hover:bg-slate-200"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={processing || !form.name.trim()}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#F08C78_0%,#E35336_52%,#B93D2A_100%)] px-5 font-clash text-sm font-semibold text-white shadow-[0_18px_30px_-22px_rgba(227,83,54,.95)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                      {processing ? 'Menyimpan...' : editingUnit ? 'Simpan Unit' : 'Buat Unit'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
