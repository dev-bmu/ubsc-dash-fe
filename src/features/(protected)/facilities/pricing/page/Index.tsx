'use client'

import '../pricing.css'

import {
  ArrowLeft,
  BadgePercent,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Coins,
  Edit3,
  Info,
  Layers3,
  Plus,
  Save,
  Sparkles,
  Tag,
  Trash2,
  Users
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { SlideOver } from '@/components/admin/SlideOver'
import { routes } from '@/config/routes'
import { useFacilityPricing, useSyncPricing } from '@/hooks/api/useFacilities'
import { cn } from '@/lib/utils'
import type { FacilityPriceRowDto } from '@/types/contracts/contracts'

type ActiveTab = 'warga_ub' | 'umum'
type DurasiOption = '60' | '90' | '120'
type ScheduleType = 'always' | 'weekly' | 'date_range'

interface RegulerState {
  durasi: DurasiOption
  harga: string
}

interface SpecialPriceItem {
  id: string
  nama: string
  harga: string
  durasi: DurasiOption
  scheduleType: ScheduleType
  applicableDays: string[]
  startsAt: string
  endsAt: string
  startsOn: string
  endsOn: string
  notes: string
}

interface SpecialFormState {
  nama: string
  harga: string
  durasi: DurasiOption
  scheduleType: ScheduleType
  applicableDays: string[]
  startsAt: string
  endsAt: string
  startsOn: string
  endsOn: string
  notes: string
}

const SEGMENTS: Record<
  ActiveTab,
  {
    label: string
    shortLabel: string
    description: string
    icon: typeof Users
  }
> = {
  warga_ub: {
    label: 'Warga UB',
    shortLabel: 'UB',
    description: 'Tarif khusus untuk sivitas dan warga UB.',
    icon: Users
  },
  umum: {
    label: 'Umum',
    shortLabel: 'Umum',
    description: 'Tarif publik untuk pengunjung umum.',
    icon: BadgePercent
  }
}

const DURATIONS: { value: DurasiOption; label: string }[] = [
  { value: '60', label: '60 menit' },
  { value: '90', label: '90 menit' },
  { value: '120', label: '120 menit' }
]

const DAYS = [
  { value: 'Monday', label: 'Senin' },
  { value: 'Tuesday', label: 'Selasa' },
  { value: 'Wednesday', label: 'Rabu' },
  { value: 'Thursday', label: 'Kamis' },
  { value: 'Friday', label: 'Jumat' },
  { value: 'Saturday', label: 'Sabtu' },
  { value: 'Sunday', label: 'Minggu' }
] as const

const SCHEDULE_OPTIONS: { value: ScheduleType; label: string; description: string }[] = [
  { value: 'always', label: 'Setiap waktu', description: 'Selalu menggantikan harga reguler.' },
  { value: 'weekly', label: 'Hari & jam', description: 'Aktif pada hari dan jam tertentu.' },
  { value: 'date_range', label: 'Tanggal khusus', description: 'Aktif pada rentang tanggal tertentu.' }
]

const NOTE_PRESETS = ['Berlaku pagi hari', 'Berlaku sore hari', 'Akhir pekan', 'Hari kerja', 'Event khusus']

function formatPrice(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`
}

function parseMoney(value: string): number {
  return Number(value || 0)
}

function emptySpecialForm(): SpecialFormState {
  return {
    nama: '',
    harga: '',
    durasi: '60',
    scheduleType: 'weekly',
    applicableDays: [],
    startsAt: '06:00',
    endsAt: '15:00',
    startsOn: '',
    endsOn: '',
    notes: ''
  }
}

function describeRule(item: Pick<SpecialPriceItem, 'scheduleType' | 'applicableDays' | 'startsAt' | 'endsAt' | 'startsOn' | 'endsOn'>): string {
  const time = item.startsAt && item.endsAt ? ` pukul ${item.startsAt}-${item.endsAt}` : ''

  if (item.scheduleType === 'always') {
    return `Setiap waktu${time}`
  }

  if (item.scheduleType === 'weekly') {
    const days =
      item.applicableDays.length > 0
        ? item.applicableDays.map((day) => DAYS.find((option) => option.value === day)?.label ?? day).join(', ')
        : 'hari belum dipilih'

    return `${days}${time}`
  }

  const start = item.startsOn || 'tanggal mulai'
  const end = item.endsOn || 'tanggal selesai'

  return `${start} sampai ${end}${time}`
}

function isDuration(value: number | string | null | undefined): value is DurasiOption {
  return value === '60' || value === '90' || value === '120' || value === 60 || value === 90 || value === 120
}

function toDuration(value: number | string | null | undefined): DurasiOption {
  const normalized = String(value ?? 60)
  return isDuration(normalized) ? normalized : '60'
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="font-bdo text-[11px] font-bold tracking-wider text-slate-500 uppercase">{children}</label>
}

function IconTile({ icon, className }: { icon: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'price-icon-live flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#F08C78_0%,#E35336_52%,#B93D2A_100%)] text-white',
        'shadow-[0_18px_32px_-24px_rgba(227,83,54,.95)]',
        className
      )}
    >
      {icon}
    </div>
  )
}

function MoneyInput({ value, onChange, placeholder = '0' }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-bdo text-sm font-bold text-[#B93D2A]">Rp</span>
      <input
        type="number"
        min="0"
        step="1000"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 pl-11 font-bdo text-sm font-semibold text-slate-900 outline-hidden transition-all placeholder:text-slate-300 focus:border-[#E35336]/65 focus:ring-4 focus:ring-[#E35336]/10"
      />
    </div>
  )
}

function DurationSelect({ value, onChange }: { value: DurasiOption; onChange: (value: DurasiOption) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as DurasiOption)}
      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 font-bdo text-sm font-semibold text-slate-900 outline-hidden transition-all focus:border-[#E35336]/65 focus:ring-4 focus:ring-[#E35336]/10"
    >
      {DURATIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

function SegmentButton({
  segment,
  active,
  regularPrice,
  specialCount,
  onClick
}: {
  segment: ActiveTab
  active: boolean
  regularPrice: string
  specialCount: number
  onClick: () => void
}) {
  const meta = SEGMENTS[segment]
  const Icon = meta.icon

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-[24px] border p-4 text-left transition-all',
        active
          ? 'border-[#F8B5A8] bg-[linear-gradient(145deg,#FFFFFF_0%,#FFF7F5_100%)] shadow-[0_24px_44px_-36px_rgba(227,83,54,.85)]'
          : 'border-slate-200 bg-white hover:border-[#F8B5A8]/80 hover:bg-[#FFF7F5]/45'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-2xl transition-all',
              active
                ? 'bg-[linear-gradient(135deg,#F08C78_0%,#E35336_55%,#B93D2A_100%)] text-white'
                : 'bg-slate-100 text-slate-400 group-hover:bg-[#FFF7F5] group-hover:text-[#E35336]'
            )}
          >
            <Icon size={17} />
          </div>
          <div>
            <p className="font-clash text-sm font-semibold text-slate-950">{meta.label}</p>
            <p className="mt-0.5 font-bdo text-[11px] font-medium text-slate-400">{specialCount} harga khusus</p>
          </div>
        </div>
        {active && <CheckCircle2 size={18} className="text-[#E35336]" />}
      </div>

      <div className="mt-4 rounded-2xl border border-white px-3 py-3 ring-1 ring-[#F8B5A8]/35">
        <p className="font-bdo text-[10px] font-bold tracking-wider text-slate-400 uppercase">Harga reguler</p>
        <p className="mt-1 font-clash text-lg font-semibold text-slate-950">{regularPrice ? formatPrice(parseMoney(regularPrice)) : 'Belum diisi'}</p>
      </div>
    </button>
  )
}

function SummaryStat({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-[22px] border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-bdo text-[10px] font-bold tracking-wider text-slate-400 uppercase">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FFF7F5] text-[#E35336]">{icon}</span>
      </div>
      <p className="mt-3 truncate font-clash text-lg font-semibold text-slate-950">{value}</p>
    </div>
  )
}

export default function FacilityPricing() {
  const id = useParams().id as string
  const { data } = useFacilityPricing(id)
  const { mutateAsync: syncPricing, isPending: saving } = useSyncPricing(id)

  const facility = data?.facility ?? { id, name: '', bookingMode: 'court' }

  // The month price is its own row, not a discount off the session price: the
  // owner sets what a month costs and the two numbers move independently.
  const isClassMode = facility.bookingMode === 'class'

  const [activeTab, setActiveTab] = useState<ActiveTab>('warga_ub')
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const [showSlideOver, setShowSlideOver] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [specialForm, setSpecialForm] = useState<SpecialFormState>(emptySpecialForm)

  const [packageState, setPackageState] = useState<Record<ActiveTab, string>>({ warga_ub: '', umum: '' })
  const [regulerState, setRegulerState] = useState<Record<ActiveTab, RegulerState>>({
    warga_ub: { durasi: '60', harga: '' },
    umum: { durasi: '60', harga: '' }
  })
  const [specialItems, setSpecialItems] = useState<Record<ActiveTab, SpecialPriceItem[]>>({ warga_ub: [], umum: [] })

  // Seed editor lokal dari data.prices begitu query tiba (dan tiap kali data ter-refetch, mis. setelah
  // sync sukses meng-invalidate query pricing) — setara reinitialisasi props Inertia pada versi Laravel.
  useEffect(() => {
    if (!data) return

    const prices = data.prices

    const findReguler = (segment: ActiveTab) => {
      const segmentPrices = prices
        .filter((price) => price.userCategory === segment && price.priceType !== 'monthly_package')
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

      return (
        segmentPrices.find((price) => price.label === 'Reguler') ??
        segmentPrices.find((price) => (price.scheduleType ?? 'regular') === 'regular') ??
        segmentPrices[0]
      )
    }

    const findPackage = (segment: ActiveTab) => prices.find((price) => price.userCategory === segment && price.priceType === 'monthly_package')

    const mapSpecial = (segment: ActiveTab): SpecialPriceItem[] =>
      prices
        .filter((price) => {
          const regular = findReguler(segment)

          return price.userCategory === segment && price.priceType !== 'monthly_package' && price.label !== 'Reguler' && price.id !== regular?.id
        })
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((price, index) => ({
          id: price.id ?? String(Date.now() + index),
          nama: price.label,
          harga: String(price.price),
          durasi: toDuration(price.durationMinutes),
          scheduleType:
            price.scheduleType === 'always' || price.scheduleType === 'weekly' || price.scheduleType === 'date_range' ? price.scheduleType : 'always',
          applicableDays: price.applicableDays ?? [],
          startsAt: price.startsAt ?? '',
          endsAt: price.endsAt ?? '',
          startsOn: price.startsOn ?? '',
          endsOn: price.endsOn ?? '',
          notes: price.notes ?? ''
        }))

    setRegulerState({
      warga_ub: {
        durasi: toDuration(findReguler('warga_ub')?.durationMinutes),
        harga: findReguler('warga_ub')?.price !== undefined ? String(findReguler('warga_ub')?.price) : ''
      },
      umum: {
        durasi: toDuration(findReguler('umum')?.durationMinutes),
        harga: findReguler('umum')?.price !== undefined ? String(findReguler('umum')?.price) : ''
      }
    })

    setPackageState({
      warga_ub: findPackage('warga_ub')?.price !== undefined ? String(findPackage('warga_ub')?.price) : '',
      umum: findPackage('umum')?.price !== undefined ? String(findPackage('umum')?.price) : ''
    })

    setSpecialItems({
      warga_ub: mapSpecial('warga_ub'),
      umum: mapSpecial('umum')
    })
  }, [data])

  const reguler = regulerState[activeTab]
  const activeSpecials = specialItems[activeTab]
  const activeMeta = SEGMENTS[activeTab]

  const allPrices = useMemo(() => {
    const regularValues = (Object.keys(regulerState) as ActiveTab[])
      .map((segment) => parseMoney(regulerState[segment].harga))
      .filter((value) => value > 0)
    const specialValues = (Object.keys(specialItems) as ActiveTab[])
      .flatMap((segment) => specialItems[segment].map((item) => parseMoney(item.harga)))
      .filter((value) => value > 0)

    return [...regularValues, ...specialValues]
  }, [regulerState, specialItems])

  const lowestPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0
  const averagePrice = allPrices.length > 0 ? Math.round(allPrices.reduce((sum, price) => sum + price, 0) / allPrices.length) : 0
  const totalSpecials = specialItems.warga_ub.length + specialItems.umum.length
  const totalConfigured = allPrices.length

  const setReguler = (updates: Partial<RegulerState>) => {
    setRegulerState((previous) => ({
      ...previous,
      [activeTab]: { ...previous[activeTab], ...updates }
    }))
    setValidationMessage(null)
  }

  const openCreateSpecial = () => {
    setEditingId(null)
    setSpecialForm({
      ...emptySpecialForm(),
      durasi: regulerState[activeTab].durasi
    })
    setValidationMessage(null)
    setShowSlideOver(true)
  }

  const openEditSpecial = (item: SpecialPriceItem) => {
    setEditingId(item.id)
    setSpecialForm({
      nama: item.nama,
      harga: item.harga,
      durasi: regulerState[activeTab].durasi,
      scheduleType: item.scheduleType,
      applicableDays: item.applicableDays,
      startsAt: item.startsAt,
      endsAt: item.endsAt,
      startsOn: item.startsOn,
      endsOn: item.endsOn,
      notes: item.notes
    })
    setValidationMessage(null)
    setShowSlideOver(true)
  }

  const closeSpecialForm = () => {
    setShowSlideOver(false)
    setEditingId(null)
    setSpecialForm(emptySpecialForm())
    setValidationMessage(null)
  }

  const saveSpecial = () => {
    const nama = specialForm.nama.trim()
    const harga = parseMoney(specialForm.harga)

    if (!nama) {
      setValidationMessage('Nama harga khusus wajib diisi.')
      return
    }

    if (specialForm.harga === '' || Number.isNaN(harga) || harga < 0) {
      setValidationMessage('Harga khusus wajib diisi dengan angka yang valid.')
      return
    }

    if (specialForm.scheduleType === 'weekly' && specialForm.applicableDays.length === 0) {
      setValidationMessage('Pilih minimal satu hari untuk harga khusus ini.')
      return
    }

    if (specialForm.scheduleType === 'date_range' && (!specialForm.startsOn || !specialForm.endsOn)) {
      setValidationMessage('Tanggal mulai dan tanggal selesai wajib diisi.')
      return
    }

    if (specialForm.startsOn && specialForm.endsOn && specialForm.endsOn < specialForm.startsOn) {
      setValidationMessage('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.')
      return
    }

    if ((specialForm.startsAt && !specialForm.endsAt) || (!specialForm.startsAt && specialForm.endsAt)) {
      setValidationMessage('Jam mulai dan jam selesai harus diisi lengkap.')
      return
    }

    const regularDuration = regulerState[activeTab].durasi
    const nextItem: SpecialPriceItem = {
      id: editingId ?? String(Date.now()),
      nama,
      harga: String(harga),
      durasi: regularDuration,
      scheduleType: specialForm.scheduleType,
      applicableDays: specialForm.scheduleType === 'weekly' ? specialForm.applicableDays : [],
      startsAt: specialForm.startsAt,
      endsAt: specialForm.endsAt,
      startsOn: specialForm.scheduleType === 'date_range' ? specialForm.startsOn : '',
      endsOn: specialForm.scheduleType === 'date_range' ? specialForm.endsOn : '',
      notes: specialForm.notes.trim()
    }

    setSpecialItems((previous) => ({
      ...previous,
      [activeTab]:
        editingId === null ? [...previous[activeTab], nextItem] : previous[activeTab].map((item) => (item.id === editingId ? nextItem : item))
    }))
    setValidationMessage(null)
    closeSpecialForm()
  }

  const deleteSpecial = (deleteId: string) => {
    if (!confirm('Hapus harga khusus ini?')) {
      return
    }

    setSpecialItems((previous) => ({
      ...previous,
      [activeTab]: previous[activeTab].filter((item) => item.id !== deleteId)
    }))
  }

  const buildPricesPayload = (): FacilityPriceRowDto[] => [
    {
      userCategory: 'warga_ub',
      label: 'Reguler',
      price: parseMoney(regulerState.warga_ub.harga),
      durationMinutes: parseInt(regulerState.warga_ub.durasi),
      scheduleType: 'regular',
      applicableDays: null,
      startsAt: null,
      endsAt: null,
      startsOn: null,
      endsOn: null,
      notes: null,
      sortOrder: 0
    },
    {
      userCategory: 'umum',
      label: 'Reguler',
      price: parseMoney(regulerState.umum.harga),
      durationMinutes: parseInt(regulerState.umum.durasi),
      scheduleType: 'regular',
      applicableDays: null,
      startsAt: null,
      endsAt: null,
      startsOn: null,
      endsOn: null,
      notes: null,
      sortOrder: 1
    },
    ...(['warga_ub', 'umum'] as ActiveTab[])
      .filter((segment) => parseMoney(packageState[segment]) > 0)
      .map((segment, index): FacilityPriceRowDto => ({
        userCategory: segment,
        label: 'Paket Bulanan',
        price: parseMoney(packageState[segment]),
        durationMinutes: parseInt(regulerState[segment].durasi),
        scheduleType: 'regular',
        priceType: 'monthly_package',
        applicableDays: null,
        startsAt: null,
        endsAt: null,
        startsOn: null,
        endsOn: null,
        notes: null,
        sortOrder: index + 2
      })),
    ...specialItems.warga_ub.map((item, index): FacilityPriceRowDto => ({
      userCategory: 'warga_ub',
      label: item.nama,
      price: parseMoney(item.harga),
      durationMinutes: parseInt(regulerState.warga_ub.durasi),
      scheduleType: item.scheduleType,
      applicableDays: item.scheduleType === 'weekly' ? item.applicableDays : null,
      startsAt: item.startsAt || null,
      endsAt: item.endsAt || null,
      startsOn: item.scheduleType === 'date_range' ? item.startsOn || null : null,
      endsOn: item.scheduleType === 'date_range' ? item.endsOn || null : null,
      notes: item.notes || null,
      sortOrder: index + 10
    })),
    ...specialItems.umum.map((item, index): FacilityPriceRowDto => ({
      userCategory: 'umum',
      label: item.nama,
      price: parseMoney(item.harga),
      durationMinutes: parseInt(regulerState.umum.durasi),
      scheduleType: item.scheduleType,
      applicableDays: item.scheduleType === 'weekly' ? item.applicableDays : null,
      startsAt: item.startsAt || null,
      endsAt: item.endsAt || null,
      startsOn: item.scheduleType === 'date_range' ? item.startsOn || null : null,
      endsOn: item.scheduleType === 'date_range' ? item.endsOn || null : null,
      notes: item.notes || null,
      sortOrder: index + 10
    }))
  ]

  const submitPrices = async () => {
    const requiredSegments: ActiveTab[] = ['warga_ub', 'umum']
    const missingSegment = requiredSegments.find((segment) => regulerState[segment].harga === '')

    if (missingSegment) {
      setValidationMessage(`Harga reguler ${SEGMENTS[missingSegment].label} wajib diisi sebelum disimpan.`)
      return
    }

    const invalidRegular = requiredSegments.find((segment) => {
      const value = parseMoney(regulerState[segment].harga)
      return Number.isNaN(value) || value < 0
    })

    if (invalidRegular) {
      setValidationMessage(`Harga reguler ${SEGMENTS[invalidRegular].label} tidak valid.`)
      return
    }

    setValidationMessage(null)

    try {
      await syncPricing(buildPricesPayload())
      toast.success('Harga fasilitas berhasil disimpan.')
    } catch (error) {
      // Envelope error ubsc-api: { error: { code, message, fields } }. 422 → tampilkan pesan field pertama.
      const envelope = (error as { response?: { data?: { error?: { message?: string; fields?: Record<string, string[] | string> } } } })?.response
        ?.data?.error
      const fieldMessage = envelope?.fields ? Object.values(envelope.fields).flat()[0] : undefined
      const message = fieldMessage ?? envelope?.message ?? 'Gagal menyimpan harga. Silakan periksa kembali.'
      setValidationMessage(message)
      toast.error(message)
    }
  }

  return (
    <>
      <div className="px-4 pt-2 xl:px-8">
        <div className="price-enter flex flex-col gap-1 pt-4">
          <span className="font-bdo text-[12px] font-bold tracking-wide text-[#E35336]">Fasilitas - Pricing Studio</span>
          <h1 className="font-clash text-3xl font-bold tracking-tight uppercase xl:text-4xl">
            <span className="price-title-shine">Pengaturan Harga</span>
          </h1>
        </div>
      </div>

      <main className="ubsc-page-facility-pricing max-w-full flex-1 px-4 pt-2 pb-10 xl:px-8">
        <div className="relative flex flex-col gap-5 overflow-x-hidden pt-4 pb-24 sm:gap-6 sm:pt-6">
          <section className="price-enter relative overflow-hidden rounded-[30px] border border-[#F8B5A8]/75 bg-[linear-gradient(145deg,#FFFFFF_0%,#FFF7F5_48%,#FFFFFF_100%)] shadow-[0_24px_58px_-48px_rgba(127,36,25,.62)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#F8B5A8_0%,#E35336_48%,#B93D2A_100%)]" />
            <div className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full blur-3xl" />
            <div className="relative z-10 grid gap-0 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="p-5 sm:p-6 xl:p-7">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-2xl">
                    <div className="inline-flex items-center gap-2 rounded-2xl border border-[#F8B5A8]/70 bg-white/80 px-3 py-1.5 font-bdo text-[11px] font-bold text-[#B93D2A]">
                      <Sparkles size={13} />
                      Price control
                    </div>
                    <h2 className="mt-4 font-clash text-2xl leading-tight font-semibold tracking-tight text-slate-950 sm:text-3xl sm:leading-9">
                      Atur tarif fasilitas dengan cepat, jelas, dan minim salah input.
                    </h2>
                    <p className="mt-2 max-w-xl font-bdo text-sm leading-relaxed font-medium text-slate-500">
                      Kelola harga reguler untuk Warga UB dan Umum, lalu tambahkan harga khusus sebagai opsi tarif tambahan bila diperlukan.
                    </p>
                  </div>

                  <Link
                    href={routes.facilities()}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#F8B5A8]/70 bg-white px-4 py-2.5 font-clash text-sm font-semibold text-[#B93D2A] transition-all hover:bg-[#FFF7F5]"
                  >
                    <ArrowLeft size={14} />
                    Kembali
                  </Link>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {(Object.keys(SEGMENTS) as ActiveTab[]).map((segment) => (
                    <SegmentButton
                      key={segment}
                      segment={segment}
                      active={activeTab === segment}
                      regularPrice={regulerState[segment].harga}
                      specialCount={specialItems[segment].length}
                      onClick={() => setActiveTab(segment)}
                    />
                  ))}
                </div>
              </div>

              <aside className="border-t border-[#F8B5A8]/55 p-5 backdrop-blur-sm xl:border-t-0 xl:border-l xl:p-6">
                <div className="flex items-start gap-3">
                  <IconTile icon={<Coins size={19} />} />
                  <div className="min-w-0 flex-1">
                    <p className="font-bdo text-[10px] font-bold tracking-wider text-slate-400 uppercase">Fasilitas aktif</p>
                    <p className="mt-1 truncate font-clash text-lg font-semibold text-slate-950">{facility.name}</p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <SummaryStat
                    label="Harga terendah"
                    value={lowestPrice > 0 ? formatPrice(lowestPrice) : 'Belum ada'}
                    icon={<Banknote size={15} />}
                  />
                  <SummaryStat label="Rata-rata" value={averagePrice > 0 ? formatPrice(averagePrice) : 'Belum ada'} icon={<Layers3 size={15} />} />
                  <SummaryStat label="Total item" value={`${totalConfigured} harga`} icon={<Tag size={15} />} />
                  <SummaryStat label="Khusus" value={`${totalSpecials} item`} icon={<CalendarDays size={15} />} />
                </div>
              </aside>
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px] xl:gap-6">
            <section className="price-enter rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_22px_50px_-44px_rgba(15,23,42,.42)] sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <IconTile icon={<Banknote size={18} />} className="h-11 w-11" />
                  <div>
                    <p className="font-clash text-lg font-semibold text-slate-950">Harga Reguler {activeMeta.label}</p>
                    <p className="mt-1 max-w-xl font-bdo text-sm leading-relaxed font-medium text-slate-500">{activeMeta.description}</p>
                  </div>
                </div>
                <span className="inline-flex w-fit items-center rounded-full border border-[#F8B5A8]/70 bg-[#FFF7F5] px-3 py-1 font-bdo text-[11px] font-bold text-[#B93D2A]">
                  Segment {activeMeta.shortLabel}
                </span>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel>Harga sewa</FieldLabel>
                  <MoneyInput value={reguler.harga} onChange={(harga) => setReguler({ harga })} />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Durasi per sesi</FieldLabel>
                  <DurationSelect value={reguler.durasi} onChange={(durasi) => setReguler({ durasi })} />
                </div>
              </div>

              {isClassMode && (
                <div className="mt-6 rounded-[24px] border border-emerald-200 bg-emerald-50/60 p-4">
                  <p className="font-clash text-sm font-semibold text-slate-900">Paket Bulanan {activeMeta.shortLabel}</p>
                  <p className="mt-1 font-bdo text-xs leading-relaxed font-medium text-slate-500">
                    Satu harga untuk seluruh pertemuan dalam sebulan. Kosongkan kalau kelas ini hanya dijual per sesi.
                  </p>
                  <div className="mt-3 max-w-xs">
                    <MoneyInput
                      value={packageState[activeTab]}
                      onChange={(harga) => setPackageState((previous) => ({ ...previous, [activeTab]: harga }))}
                    />
                  </div>
                  <p className="mt-2 font-bdo text-[11px] font-medium text-emerald-700">
                    Paket hanya ditawarkan selama belum ada pertemuan yang lewat di bulan itu. Setelah pertemuan pertama, customer melihat harga per
                    sesi.
                  </p>
                </div>
              )}

              <div className="mt-6 rounded-[24px] border border-[#F8B5A8]/55 bg-[linear-gradient(135deg,#FFF7F5_0%,#FFFFFF_82%)] p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-bdo text-[10px] font-bold tracking-wider text-slate-400 uppercase">Preview harga</p>
                    <p className="mt-1 font-clash text-3xl font-semibold text-slate-950">
                      {reguler.harga ? formatPrice(parseMoney(reguler.harga)) : 'Rp 0'}
                    </p>
                    <p className="mt-1 font-bdo text-xs font-medium text-slate-500">
                      Berlaku untuk {activeMeta.label} per {reguler.durasi} menit.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-[#F8B5A8]/50">
                    <p className="font-bdo text-[10px] font-bold tracking-wider text-slate-400 uppercase">Estimasi / jam</p>
                    <p className="mt-1 font-clash text-lg font-semibold text-[#B93D2A]">
                      {reguler.harga ? formatPrice(Math.round((parseMoney(reguler.harga) / parseInt(reguler.durasi)) * 60)) : 'Rp 0'}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <aside className="price-enter rounded-[28px] border border-[#F8B5A8]/70 bg-[linear-gradient(145deg,#FFFFFF_0%,#FFF7F5_100%)] p-5 shadow-[0_22px_50px_-44px_rgba(127,36,25,.55)] sm:p-6">
              <div className="flex items-start gap-3">
                <IconTile icon={<Info size={18} />} className="h-11 w-11" />
                <div>
                  <p className="font-clash text-base font-semibold text-slate-950">Alur aman</p>
                  <p className="mt-1 font-bdo text-sm leading-relaxed font-medium text-slate-500">
                    Tidak ada harga contoh yang disimpan otomatis. Semua item di halaman ini berasal dari data admin atau input baru.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {[
                  'Isi harga reguler Warga UB dan Umum.',
                  'Tambahkan harga khusus bila ada variasi tarif.',
                  'Simpan setelah semua angka sudah benar.'
                ].map((text) => (
                  <div key={text} className="flex items-center gap-3 rounded-2xl px-3.5 py-3 ring-1 ring-[#F8B5A8]/35">
                    <CheckCircle2 size={16} className="shrink-0 text-[#E35336]" />
                    <p className="font-bdo text-xs font-semibold text-slate-600">{text}</p>
                  </div>
                ))}
              </div>
            </aside>
          </div>

          <section className="price-enter rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_22px_50px_-44px_rgba(15,23,42,.42)] sm:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-3">
                <IconTile icon={<Clock3 size={18} />} className="h-11 w-11" />
                <div>
                  <p className="font-clash text-lg font-semibold text-slate-950">Harga Khusus {activeMeta.label}</p>
                  <p className="mt-1 max-w-2xl font-bdo text-sm leading-relaxed font-medium text-slate-500">
                    Gunakan untuk variasi tarif seperti pagi, sore, akhir pekan, event, atau aturan harga lain yang perlu tampil terpisah.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={openCreateSpecial}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#F08C78_0%,#E35336_52%,#B93D2A_100%)] px-5 py-3 font-clash text-sm font-semibold text-white shadow-[0_18px_34px_-24px_rgba(227,83,54,.95)] transition-all hover:-translate-y-0.5"
              >
                <Plus size={15} />
                Tambah Harga
              </button>
            </div>

            {activeSpecials.length === 0 ? (
              <div className="mt-6 flex flex-col items-center justify-center rounded-[24px] border border-dashed border-[#F8B5A8]/80 bg-[#FFF7F5]/55 px-5 py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#E35336] ring-1 ring-[#F8B5A8]/60">
                  <Tag size={22} />
                </div>
                <p className="mt-4 font-clash text-base font-semibold text-slate-950">Belum ada harga khusus</p>
                <p className="mt-1 max-w-md font-bdo text-sm font-medium text-slate-500">
                  Harga reguler tetap digunakan. Tambahkan harga khusus hanya jika memang ada variasi tarif.
                </p>
              </div>
            ) : (
              <div className="price-scrollbar mt-6 max-h-[520px] overflow-y-auto pr-1">
                <div className="grid gap-3 lg:grid-cols-2">
                  {activeSpecials.map((item, index) => (
                    <article
                      key={item.id}
                      className="group rounded-[24px] border border-slate-200 bg-[linear-gradient(145deg,#FFFFFF_0%,#F8FAFC_100%)] p-4 transition-all hover:border-[#F8B5A8] hover:bg-[#FFF7F5]/55"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FFF7F5] text-[#E35336] ring-1 ring-[#F8B5A8]/55">
                            <span className="font-clash text-xs font-semibold">{String(index + 1).padStart(2, '0')}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-clash text-sm font-semibold text-slate-950">{item.nama}</p>
                            <p className="mt-1 font-bdo text-xs font-semibold text-[#B93D2A]">
                              {formatPrice(parseMoney(item.harga))} / {regulerState[activeTab].durasi} menit
                            </p>
                            <p className="mt-1 font-bdo text-[11px] font-semibold text-slate-500">{describeRule(item)}</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditSpecial(item)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-white hover:text-[#B93D2A]"
                            aria-label="Edit harga khusus"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteSpecial(item.id)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-500"
                            aria-label="Hapus harga khusus"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {item.notes && (
                        <div className="mt-4 rounded-2xl bg-white px-3 py-2.5 ring-1 ring-slate-200">
                          <p className="font-bdo text-[11px] leading-relaxed font-medium text-slate-500">{item.notes}</p>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            )}
          </section>

          <div className="price-enter sticky bottom-4 z-30 flex flex-col gap-3 rounded-[24px] border border-[#F8B5A8]/70 px-4 py-4 shadow-[0_24px_60px_-42px_rgba(127,36,25,.48)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="min-w-0">
              <p className="font-clash text-sm font-semibold text-slate-950">Simpan konfigurasi harga</p>
              <p className={cn('mt-0.5 font-bdo text-xs font-medium', validationMessage ? 'text-rose-500' : 'text-slate-400')}>
                {validationMessage ?? 'Perubahan akan mengganti daftar harga fasilitas ini setelah disimpan.'}
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
              <Link
                href={routes.facilities()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 font-clash text-sm font-semibold text-slate-600 transition-all hover:border-[#F8B5A8] hover:bg-[#FFF7F5] hover:text-[#B93D2A]"
              >
                <ArrowLeft size={14} />
                Batal
              </Link>
              <button
                type="button"
                disabled={saving}
                onClick={() => void submitPrices()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#F08C78_0%,#E35336_52%,#B93D2A_100%)] px-6 py-3 font-clash text-sm font-semibold text-white shadow-[0_18px_34px_-24px_rgba(227,83,54,.95)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                <Save size={15} />
                {saving ? 'Menyimpan...' : 'Simpan Harga'}
              </button>
            </div>
          </div>
        </div>

        <SlideOver
          isOpen={showSlideOver}
          onClose={closeSpecialForm}
          title={editingId === null ? 'Tambah Harga Khusus' : 'Edit Harga Khusus'}
          description={`Segmen aktif: ${activeMeta.label}`}
        >
          {showSlideOver && (
            <div className="flex flex-col gap-5">
              <div className="rounded-[24px] border border-[#F8B5A8]/70 bg-[#FFF7F5] p-4">
                <div className="flex items-center gap-3">
                  <IconTile icon={<Tag size={17} />} className="h-10 w-10" />
                  <div>
                    <p className="font-clash text-sm font-semibold text-slate-950">{activeMeta.label}</p>
                    <p className="font-bdo text-xs font-medium text-slate-500">Harga ini akan masuk ke daftar tarif segmen tersebut.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <FieldLabel>Nama harga</FieldLabel>
                <input
                  type="text"
                  value={specialForm.nama}
                  placeholder="Contoh: Tarif sore"
                  onChange={(event) => setSpecialForm((previous) => ({ ...previous, nama: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 font-bdo text-sm font-semibold text-slate-900 outline-hidden transition-all placeholder:text-slate-300 focus:border-[#E35336]/65 focus:ring-4 focus:ring-[#E35336]/10"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel>Harga sewa</FieldLabel>
                  <MoneyInput value={specialForm.harga} onChange={(harga) => setSpecialForm((previous) => ({ ...previous, harga }))} />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Durasi slot</FieldLabel>
                  <div className="rounded-2xl border border-[#F8B5A8]/70 bg-[#FFF7F5] px-4 py-3.5">
                    <p className="font-clash text-sm font-semibold text-slate-950">{reguler.durasi} menit</p>
                    <p className="mt-0.5 font-bdo text-[11px] font-semibold text-[#B93D2A]">Mengikuti durasi reguler {activeMeta.label}.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <FieldLabel>Aturan berlaku</FieldLabel>
                <div className="grid gap-2">
                  {SCHEDULE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setSpecialForm((previous) => ({
                          ...previous,
                          scheduleType: option.value
                        }))
                      }
                      className={cn(
                        'rounded-2xl border px-4 py-3 text-left transition-all',
                        specialForm.scheduleType === option.value
                          ? 'border-[#F8B5A8] bg-[#FFF7F5] ring-2 ring-[#E35336]/10'
                          : 'border-slate-200 bg-white hover:border-[#F8B5A8]/70'
                      )}
                    >
                      <p className="font-clash text-sm font-semibold text-slate-950">{option.label}</p>
                      <p className="mt-0.5 font-bdo text-xs font-medium text-slate-500">{option.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {specialForm.scheduleType === 'weekly' && (
                <div className="space-y-3">
                  <FieldLabel>Hari berlaku</FieldLabel>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {DAYS.map((day) => {
                      const active = specialForm.applicableDays.includes(day.value)

                      return (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() =>
                            setSpecialForm((previous) => ({
                              ...previous,
                              applicableDays: active
                                ? previous.applicableDays.filter((item) => item !== day.value)
                                : [...previous.applicableDays, day.value]
                            }))
                          }
                          className={cn(
                            'rounded-2xl border px-3 py-2.5 font-bdo text-xs font-bold transition-all',
                            active
                              ? 'border-[#F8B5A8] bg-[#FFF7F5] text-[#B93D2A]'
                              : 'border-slate-200 bg-white text-slate-500 hover:border-[#F8B5A8]/70'
                          )}
                        >
                          {day.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {specialForm.scheduleType === 'date_range' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <FieldLabel>Tanggal mulai</FieldLabel>
                    <input
                      type="date"
                      value={specialForm.startsOn}
                      onChange={(event) => setSpecialForm((previous) => ({ ...previous, startsOn: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 font-bdo text-sm font-semibold text-slate-900 outline-hidden transition-all focus:border-[#E35336]/65 focus:ring-4 focus:ring-[#E35336]/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel>Tanggal selesai</FieldLabel>
                    <input
                      type="date"
                      min={specialForm.startsOn || undefined}
                      value={specialForm.endsOn}
                      onChange={(event) => setSpecialForm((previous) => ({ ...previous, endsOn: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 font-bdo text-sm font-semibold text-slate-900 outline-hidden transition-all focus:border-[#E35336]/65 focus:ring-4 focus:ring-[#E35336]/10"
                    />
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel>Jam mulai</FieldLabel>
                  <input
                    type="time"
                    value={specialForm.startsAt}
                    onChange={(event) => setSpecialForm((previous) => ({ ...previous, startsAt: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 font-bdo text-sm font-semibold text-slate-900 outline-hidden transition-all focus:border-[#E35336]/65 focus:ring-4 focus:ring-[#E35336]/10"
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Jam selesai</FieldLabel>
                  <input
                    type="time"
                    value={specialForm.endsAt}
                    onChange={(event) => setSpecialForm((previous) => ({ ...previous, endsAt: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 font-bdo text-sm font-semibold text-slate-900 outline-hidden transition-all focus:border-[#E35336]/65 focus:ring-4 focus:ring-[#E35336]/10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <FieldLabel>Catatan berlaku</FieldLabel>
                <textarea
                  rows={4}
                  maxLength={500}
                  value={specialForm.notes}
                  placeholder="Contoh: Berlaku Senin-Jumat pukul 06:00-15:00"
                  onChange={(event) => setSpecialForm((previous) => ({ ...previous, notes: event.target.value }))}
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3.5 font-bdo text-sm leading-relaxed font-medium text-slate-900 outline-hidden transition-all placeholder:text-slate-300 focus:border-[#E35336]/65 focus:ring-4 focus:ring-[#E35336]/10"
                />
                <div className="flex flex-wrap gap-2">
                  {NOTE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() =>
                        setSpecialForm((previous) => ({
                          ...previous,
                          notes: previous.notes ? `${previous.notes}, ${preset}` : preset
                        }))
                      }
                      className="rounded-full border border-[#F8B5A8]/70 bg-[#FFF7F5] px-3 py-1.5 font-bdo text-[11px] font-bold text-[#B93D2A] transition-all hover:bg-white"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <p className="font-bdo text-[10px] font-bold tracking-wider text-slate-400 uppercase">Preview</p>
                <p className="mt-1 font-clash text-2xl font-semibold text-slate-950">
                  {specialForm.harga ? formatPrice(parseMoney(specialForm.harga)) : 'Rp 0'}
                </p>
                <p className="mt-1 font-bdo text-xs font-medium text-slate-500">
                  {specialForm.nama || 'Nama harga belum diisi'} / {reguler.durasi} menit
                </p>
                <p className="mt-2 font-bdo text-[11px] font-semibold text-[#B93D2A]">
                  {describeRule({
                    scheduleType: specialForm.scheduleType,
                    applicableDays: specialForm.applicableDays,
                    startsAt: specialForm.startsAt,
                    endsAt: specialForm.endsAt,
                    startsOn: specialForm.startsOn,
                    endsOn: specialForm.endsOn
                  })}
                </p>
              </div>

              {validationMessage && (
                <p className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 font-bdo text-xs font-semibold text-rose-600">
                  {validationMessage}
                </p>
              )}

              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row">
                <button
                  type="button"
                  onClick={closeSpecialForm}
                  className="flex-1 rounded-2xl border border-slate-200 bg-white px-5 py-3 font-clash text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={saveSpecial}
                  className="flex-1 rounded-2xl bg-[linear-gradient(135deg,#F08C78_0%,#E35336_52%,#B93D2A_100%)] px-5 py-3 font-clash text-sm font-semibold text-white shadow-[0_18px_34px_-24px_rgba(227,83,54,.95)] transition-all hover:-translate-y-0.5"
                >
                  {editingId === null ? 'Tambah Harga' : 'Simpan Edit'}
                </button>
              </div>
            </div>
          )}
        </SlideOver>
      </main>
    </>
  )
}
