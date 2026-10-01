'use client'

import '../form.css'

import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  ChevronDown,
  Database,
  Image,
  Lock,
  MapPin,
  Plus,
  Save,
  Settings2,
  SlidersHorizontal,
  Trash2
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { MultiDropzone, SingleDropzone, type ExistingMedia } from '@/components/admin/ImageDropzone'
import { WeeklySlotEditor } from '@/components/admin/WeeklySlotEditor'
import { useCreateFacility, useDeleteGalleryImage, useFacilityForm, useUpdateFacility } from '@/hooks/api/useFacilities'
import { routes } from '@/config/routes'
import { cn } from '@/lib/utils'

// ── Metadata types ────────────────────────────────────────────────────────────

interface Period {
  label: string
  harga: string
}
interface DaftarHargaItem {
  label: string
  harga: string
}
interface DetailItem {
  key: string
  value: string
}
interface MetadataState {
  periods: Period[]
  daftarHarga: { left: DaftarHargaItem[]; right: DaftarHargaItem[] }
  additionalDetails: DetailItem[]
}

function emptyMeta(): MetadataState {
  return { periods: [], daftarHarga: { left: [], right: [] }, additionalDetails: [] }
}

function parseMeta(raw: Record<string, unknown> | null | undefined): MetadataState {
  if (!raw) return emptyMeta()
  const dh = raw.daftarHarga as { left?: DaftarHargaItem[]; right?: DaftarHargaItem[] } | undefined
  return {
    periods: (raw.periods as Period[]) ?? [],
    daftarHarga: { left: dh?.left ?? [], right: dh?.right ?? [] },
    additionalDetails: (raw.additionalDetails as DetailItem[]) ?? []
  }
}

function hasMetaContent(m: MetadataState): boolean {
  return m.periods.length > 0 || m.daftarHarga.left.length > 0 || m.daftarHarga.right.length > 0 || m.additionalDetails.length > 0
}

// ── Form state ────────────────────────────────────────────────────────────────
// Menggantikan useForm<FormData> Inertia (camelCase DTO). display_metadata TIDAK
// disimpan di state ini — di-serialize dari `metadata` saat submit (identik logika).

type FacilityFormState = {
  facilityCategoryId: string
  name: string
  slug: string
  description: string
  location: string
  venueType: string
  capacity: number
  bookingMode: 'court' | 'class'
  activeSlots: Record<string, string[]> | null
  slotQuotas: Record<string, Record<string, number>> | null
  sessionNote: string
  classCode: string
  accurateItemNo: string
  accurateItemNoWarga: string
  rating: number
  isActive: boolean
  sortOrder: number
  hero: File | null
  gallery: File[]
  removeHero: boolean
}

function createInitialState(): FacilityFormState {
  return {
    facilityCategoryId: '',
    name: '',
    slug: '',
    description: '',
    location: '',
    venueType: '',
    capacity: 1,
    bookingMode: 'court',
    activeSlots: null,
    slotQuotas: null,
    sessionNote: '',
    classCode: '',
    accurateItemNo: '',
    accurateItemNoWarga: '',
    rating: 5.0,
    isActive: true,
    sortOrder: 0,
    hero: null,
    gallery: [],
    removeHero: false
  }
}

/** Baca envelope 422 `{ code, message, fields }` → map field (camelCase) ke slot error di form. */
function extractFieldErrors(error: unknown): Record<string, string> {
  const fields = (error as { response?: { data?: { error?: { fields?: Record<string, string | string[]> } } } }).response?.data?.error?.fields
  if (!fields) return {}
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(fields)) {
    out[key] = Array.isArray(value) ? String(value[0] ?? '') : String(value)
  }
  return out
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

const LOCATIONS = ['Veteran', 'Dieng']
const VENUE_TYPES = ['Arena Tertutup', 'Arena Terbuka', 'Kelas & Kebugaran']
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const

// ── CreatableSelect Component ─────────────────────────────────────────────────

function CreatableSelect({
  id,
  name,
  value,
  onChange,
  options,
  placeholder,
  error,
  ariaLabel
}: {
  id: string
  name: string
  value: string
  onChange: (val: string) => void
  options: string[]
  placeholder: string
  error?: string
  ariaLabel: string
}) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState(value)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Sync input with external value changes (e.g. form reset)
  useEffect(() => {
    setInput(value)
  }, [value])

  // Close when clicking outside wrapper
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (!wrapperRef.current?.contains(t)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const filtered = input ? options.filter((opt) => opt.toLowerCase().includes(input.toLowerCase())) : options
  const isCustom = input.trim() !== '' && !options.includes(input.trim())

  const handleSelect = (val: string) => {
    onChange(val)
    setInput(val)
    setOpen(false)
  }
  const handleCustom = () => {
    if (input.trim()) {
      onChange(input.trim())
      setOpen(false)
    }
  }

  const dropdown = open ? (
    <div
      data-crselect-drop
      className="facility-scrollbar absolute top-[calc(100%+4px)] left-0 z-80 w-full overflow-hidden rounded-2xl border border-[#F8B5A8]/70 bg-white shadow-[0_24px_60px_-34px_rgba(127,36,25,0.35)]"
    >
      <div className="max-h-56 overflow-y-auto py-1">
        {filtered.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => handleSelect(opt)}
            className="w-full px-3.5 py-2.5 text-left font-bdo text-sm font-medium text-slate-600 transition-colors hover:bg-[#FFF7F5] hover:text-[#B93D2A]"
          >
            {opt}
          </button>
        ))}
        {isCustom && (
          <div className={filtered.length > 0 ? 'border-t border-[#F8B5A8]/50' : ''}>
            <button
              type="button"
              onClick={handleCustom}
              className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left font-bdo text-sm font-bold text-[#B93D2A] transition-colors hover:bg-[#FFF7F5]"
            >
              <Plus size={14} /> Tambahkan &quot;{input.trim()}&quot;
            </button>
          </div>
        )}
        {!filtered.length && !isCustom && <div className="px-3.5 py-3 font-bdo text-sm text-slate-400">Tidak ada opsi</div>}
      </div>
    </div>
  ) : null

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          id={id}
          name={name}
          type="text"
          value={input}
          aria-label={ariaLabel}
          onChange={(e) => {
            setInput(e.target.value)
            onChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleCustom()
            }
            if (e.key === 'Escape') setOpen(false)
          }}
          placeholder={placeholder}
          className="input-field w-full pr-10"
        />
        <ChevronDown size={16} className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[#B93D2A]/60" />
      </div>
      {dropdown}
      {error && <p className="mt-1.5 font-bdo text-[11px] text-rose-500">{error}</p>}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ShinyIcon({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`icon-glow relative flex shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#F08C78_0%,#E35336_52%,#B93D2A_100%)] text-white shadow-[0_16px_30px_-22px_rgba(227,83,54,.95)] ${className ?? ''}`}
    >
      {children}
      <span className="pointer-events-none absolute top-[4px] right-[7px] left-[7px] h-[5px] rounded-full bg-white/30 blur-[1px]" />
    </div>
  )
}

function SectionCard({
  icon,
  accentColor = 'terracotta',
  title,
  subtitle,
  children,
  className = '',
  animDelay = 'delay-100'
}: {
  icon: ReactNode
  accentColor?: 'amber' | 'violet' | 'sky' | 'emerald' | 'rose' | 'terracotta'
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
  animDelay?: string
}) {
  const accentStyles: Record<string, { ring: string; glow: string }> = {
    terracotta: { ring: 'border-[#F8B5A8]/70', glow: 'bg-[#E35336]/12' },
    amber: { ring: 'border-[#F8B5A8]/70', glow: 'bg-[#E35336]/12' },
    violet: { ring: 'border-[#F8B5A8]/70', glow: 'bg-[#E35336]/12' },
    sky: { ring: 'border-sky-100', glow: 'bg-sky-400/10' },
    emerald: { ring: 'border-emerald-100', glow: 'bg-emerald-400/10' },
    rose: { ring: 'border-rose-100', glow: 'bg-rose-400/10' }
  }
  const accent = accentStyles[accentColor] ?? accentStyles.terracotta

  return (
    <div
      className={`animate-fade-in-up ${animDelay} card-glint shimmer-once relative overflow-hidden rounded-[28px] border ${accent.ring} bg-white/95 shadow-[0_24px_56px_-46px_rgba(127,36,25,0.55)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#F08C78] hover:shadow-[0_30px_64px_-48px_rgba(227,83,54,0.48)] ${className}`}
    >
      <div className={`pointer-events-none absolute -top-14 -right-10 h-36 w-36 rounded-full ${accent.glow} blur-3xl`} />
      <div className="relative z-10 flex items-center gap-3 border-b border-[#F8B5A8]/35 bg-[linear-gradient(135deg,#FFFFFF_0%,#FFF9F7_100%)] px-5 py-4 sm:px-6 sm:py-5">
        <ShinyIcon className="h-9 w-9">{icon}</ShinyIcon>
        <div className="min-w-0">
          <p className="font-clash text-sm leading-tight font-semibold text-slate-800">{title}</p>
          {subtitle && <p className="mt-0.5 font-bdo text-[11px] text-slate-400">{subtitle}</p>}
        </div>
      </div>
      <div className="relative z-10 p-4 sm:p-6">{children}</div>
    </div>
  )
}

function ToggleSwitch({
  enabled,
  onChange,
  label,
  disabled = false,
  disabledHint
}: {
  enabled: boolean
  onChange: (v: boolean) => void
  label: string
  /** A locked switch says so with the cursor and a hint, instead of silently eating the click. */
  disabled?: boolean
  disabledHint?: string
}) {
  return (
    <label
      className={`relative inline-flex h-[28px] w-[52px] shrink-0 items-center ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
      title={disabled ? (disabledHint ?? label) : label}
    >
      <span className="sr-only">{label}</span>
      <input
        type="checkbox"
        checked={enabled}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
        aria-label={label}
      />
      <span
        aria-hidden="true"
        className={`relative inline-flex h-[28px] w-[52px] rounded-full p-[3px] transition-all duration-300 peer-focus-visible:ring-2 peer-focus-visible:ring-[#E35336]/35 ${
          enabled
            ? 'bg-[linear-gradient(135deg,#F08C78_0%,#E35336_52%,#B93D2A_100%)] shadow-[0_14px_24px_-18px_rgba(227,83,54,.9),inset_0_1px_0_rgba(255,255,255,0.3)]'
            : 'bg-slate-200 shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)]'
        }`}
      >
        <span
          className={`relative inline-block h-[22px] w-[22px] rounded-full bg-white transition-all duration-300 ${enabled ? 'thumb-glow translate-x-6 shadow-[0_1px_4px_rgba(0,0,0,0.2)]' : 'translate-x-0 shadow-[0_1px_3px_rgba(0,0,0,0.15)]'}`}
        >
          <span className="pointer-events-none absolute top-[3px] right-[3px] left-[3px] h-[5px] rounded-full bg-white/70 blur-[0.5px]" />
        </span>
      </span>
    </label>
  )
}

// ── MetadataBuilder ───────────────────────────────────────────────────────────

function SubSection({
  label,
  count,
  open,
  onToggle,
  children,
  hint
}: {
  label: string
  count: number
  open: boolean
  onToggle: () => void
  children: ReactNode
  hint?: string
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#F8B5A8]/55 bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between bg-[linear-gradient(135deg,#FFFFFF_0%,#FFF7F5_100%)] px-4 py-3.5 text-left transition-colors hover:bg-[#FFF7F5]"
      >
        <div className="flex items-center gap-2.5">
          <span className="font-clash text-xs font-semibold text-slate-800">{label}</span>
          {count > 0 && (
            <span className="rounded-full border border-[#F8B5A8]/70 bg-[#FFF7F5] px-2 py-0.5 font-bdo text-[10px] font-bold text-[#B93D2A]">
              {count}
            </span>
          )}
          {hint && <span className="hidden font-bdo text-[10px] text-slate-400 sm:inline">{hint}</span>}
        </div>
        <ChevronDown size={14} className={`text-[#B93D2A]/70 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="border-t border-[#F8B5A8]/45 p-4">{children}</div>}
    </div>
  )
}

function RowInput({ fields, onDelete }: { fields: ReactNode; onDelete: () => void; children?: never }) {
  return (
    <div className="flex items-center gap-2">
      <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">{fields}</div>
      <button
        type="button"
        onClick={onDelete}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-500 transition-colors hover:bg-rose-100"
        aria-label="Hapus baris"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

function AddRowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-[#F8B5A8] bg-[#FFF7F5]/55 py-2.5 font-bdo text-xs font-bold text-[#B93D2A] transition-colors hover:bg-[#FFE4DE]"
    >
      <Plus size={12} />
      {label}
    </button>
  )
}

function MetadataBuilder({ value, onChange }: { value: MetadataState; onChange: (next: MetadataState) => void }) {
  const [open, setOpen] = useState({ periods: true, daftarHarga: false, details: false })

  const setPeriods = (periods: Period[]) => onChange({ ...value, periods })
  const setDH = (daftarHarga: MetadataState['daftarHarga']) => onChange({ ...value, daftarHarga })
  const setDetails = (additionalDetails: DetailItem[]) => onChange({ ...value, additionalDetails })

  const fieldClass =
    'min-w-0 flex-1 rounded-xl border border-slate-200/80 bg-white px-3 py-2 font-bdo text-xs text-slate-800 placeholder:text-slate-300 focus:border-[#E35336]/60 focus:outline-hidden focus:ring-2 focus:ring-[#E35336]/10'

  return (
    <div className="flex flex-col gap-3">
      {/* ── Periode Waktu ── */}
      <SubSection
        label="Periode Waktu"
        count={value.periods.length}
        open={open.periods}
        onToggle={() => setOpen((s) => ({ ...s, periods: !s.periods }))}
        hint="(e.g. Pagi / Siang / Malam)"
      >
        <div className="flex flex-col gap-2">
          {value.periods.length === 0 && (
            <p className="rounded-2xl bg-slate-50 py-3 text-center font-bdo text-[11px] text-slate-400">Belum ada periode. Tambahkan di bawah.</p>
          )}
          {value.periods.map((p, i) => (
            <RowInput
              key={i}
              fields={
                <>
                  <input
                    type="text"
                    aria-label={`Label periode ${i + 1}`}
                    value={p.label}
                    onChange={(e) => {
                      const next = [...value.periods]
                      next[i] = { ...p, label: e.target.value }
                      setPeriods(next)
                    }}
                    placeholder="Label (e.g. Pagi)"
                    className={fieldClass}
                  />
                  <input
                    type="text"
                    aria-label={`Harga periode ${i + 1}`}
                    value={p.harga}
                    onChange={(e) => {
                      const next = [...value.periods]
                      next[i] = { ...p, harga: e.target.value }
                      setPeriods(next)
                    }}
                    placeholder="Harga (e.g. Rp 50.000/Jam)"
                    className={fieldClass}
                  />
                </>
              }
              onDelete={() => setPeriods(value.periods.filter((_, j) => j !== i))}
            />
          ))}
          <AddRowButton label="Tambah Periode" onClick={() => setPeriods([...value.periods, { label: '', harga: '' }])} />
        </div>
      </SubSection>

      {/* ── Daftar Harga (Kolom Kiri / Kanan) ── */}
      <SubSection
        label="Daftar Harga (Dual Column)"
        count={value.daftarHarga.left.length + value.daftarHarga.right.length}
        open={open.daftarHarga}
        onToggle={() => setOpen((s) => ({ ...s, daftarHarga: !s.daftarHarga }))}
        hint="(e.g. Yoga: warga_ub / umum)"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Left column */}
          <div>
            <p className="mb-2 font-clash text-[10px] font-bold tracking-wider text-slate-400 uppercase">Kolom Kiri</p>
            <div className="flex flex-col gap-2">
              {value.daftarHarga.left.map((item, i) => (
                <RowInput
                  key={i}
                  fields={
                    <>
                      <input
                        type="text"
                        aria-label={`Label harga kolom kiri ${i + 1}`}
                        value={item.label}
                        onChange={(e) => {
                          const next = [...value.daftarHarga.left]
                          next[i] = { ...item, label: e.target.value }
                          setDH({ ...value.daftarHarga, left: next })
                        }}
                        placeholder="Label"
                        className={fieldClass}
                      />
                      <input
                        type="text"
                        aria-label={`Harga kolom kiri ${i + 1}`}
                        value={item.harga}
                        onChange={(e) => {
                          const next = [...value.daftarHarga.left]
                          next[i] = { ...item, harga: e.target.value }
                          setDH({ ...value.daftarHarga, left: next })
                        }}
                        placeholder="Harga"
                        className={fieldClass}
                      />
                    </>
                  }
                  onDelete={() => setDH({ ...value.daftarHarga, left: value.daftarHarga.left.filter((_, j) => j !== i) })}
                />
              ))}
              <AddRowButton
                label="+ Kiri"
                onClick={() => setDH({ ...value.daftarHarga, left: [...value.daftarHarga.left, { label: '', harga: '' }] })}
              />
            </div>
          </div>

          {/* Right column */}
          <div>
            <p className="mb-2 font-clash text-[10px] font-bold tracking-wider text-slate-400 uppercase">Kolom Kanan</p>
            <div className="flex flex-col gap-2">
              {value.daftarHarga.right.map((item, i) => (
                <RowInput
                  key={i}
                  fields={
                    <>
                      <input
                        type="text"
                        aria-label={`Label harga kolom kanan ${i + 1}`}
                        value={item.label}
                        onChange={(e) => {
                          const next = [...value.daftarHarga.right]
                          next[i] = { ...item, label: e.target.value }
                          setDH({ ...value.daftarHarga, right: next })
                        }}
                        placeholder="Label"
                        className={fieldClass}
                      />
                      <input
                        type="text"
                        aria-label={`Harga kolom kanan ${i + 1}`}
                        value={item.harga}
                        onChange={(e) => {
                          const next = [...value.daftarHarga.right]
                          next[i] = { ...item, harga: e.target.value }
                          setDH({ ...value.daftarHarga, right: next })
                        }}
                        placeholder="Harga"
                        className={fieldClass}
                      />
                    </>
                  }
                  onDelete={() => setDH({ ...value.daftarHarga, right: value.daftarHarga.right.filter((_, j) => j !== i) })}
                />
              ))}
              <AddRowButton
                label="+ Kanan"
                onClick={() => setDH({ ...value.daftarHarga, right: [...value.daftarHarga.right, { label: '', harga: '' }] })}
              />
            </div>
          </div>
        </div>
      </SubSection>

      {/* ── Additional Details ── */}
      <SubSection
        label="Detail Tambahan"
        count={value.additionalDetails.length}
        open={open.details}
        onToggle={() => setOpen((s) => ({ ...s, details: !s.details }))}
        hint="(key-value pairs)"
      >
        <div className="flex flex-col gap-2">
          {value.additionalDetails.length === 0 && (
            <p className="rounded-2xl bg-slate-50 py-3 text-center font-bdo text-[11px] text-slate-400">Belum ada detail. Tambahkan di bawah.</p>
          )}
          {value.additionalDetails.map((d, i) => (
            <RowInput
              key={i}
              fields={
                <>
                  <input
                    type="text"
                    aria-label={`Nama detail tambahan ${i + 1}`}
                    value={d.key}
                    onChange={(e) => {
                      const next = [...value.additionalDetails]
                      next[i] = { ...d, key: e.target.value }
                      setDetails(next)
                    }}
                    placeholder="Key (e.g. Kapasitas)"
                    className={fieldClass}
                  />
                  <input
                    type="text"
                    aria-label={`Isi detail tambahan ${i + 1}`}
                    value={d.value}
                    onChange={(e) => {
                      const next = [...value.additionalDetails]
                      next[i] = { ...d, value: e.target.value }
                      setDetails(next)
                    }}
                    placeholder="Value (e.g. 20 orang)"
                    className={fieldClass}
                  />
                </>
              }
              onDelete={() => setDetails(value.additionalDetails.filter((_, j) => j !== i))}
            />
          ))}
          <AddRowButton label="Tambah Detail" onClick={() => setDetails([...value.additionalDetails, { key: '', value: '' }])} />
        </div>
      </SubSection>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FacilityForm() {
  const id = useParams().id as string | undefined
  const isEdit = id != null
  const router = useRouter()

  const { data: pageData } = useFacilityForm(id)
  const categories = pageData?.categories ?? []
  const customScheduleGroups = pageData?.customScheduleGroups ?? []
  const sessionNoteDefault = pageData?.sessionNoteDefault ?? '60 menit per sesi'
  const facility = pageData?.facility ?? null

  const createMutation = useCreateFacility()
  const updateMutation = useUpdateFacility(id ?? '')
  const deleteGallery = useDeleteGalleryImage()

  const [errors, setErrors] = useState<Record<string, string>>({})

  const [metadata, setMetadata] = useState<MetadataState>(emptyMeta())

  // A class is always on a weekly schedule, so the editor opens even when the
  // facility row itself has none yet — otherwise the toggle is locked off and
  // the schedule becomes uneditable.
  const [useWeeklySchedule, setUseWeeklySchedule] = useState(false)
  const [dayTexts, setDayTexts] = useState<Record<string, string>>(() =>
    WEEKDAYS.reduce((acc, day) => ({ ...acc, [day]: '' }), {} as Record<string, string>)
  )

  const [data, setDataState] = useState<FacilityFormState>(createInitialState)
  const setData = <K extends keyof FacilityFormState>(key: K, value: FacilityFormState[K]) => setDataState((prev) => ({ ...prev, [key]: value }))

  // Seed state dari data.facility saat tiba (edit). Sekali saja supaya refetch
  // tidak menimpa input yang sedang diisi.
  const seededRef = useRef(false)
  useEffect(() => {
    if (!pageData || seededRef.current) return
    seededRef.current = true
    const f = pageData.facility
    if (!f) return
    setDataState({
      facilityCategoryId: f.category?.id ?? '',
      name: f.name ?? '',
      slug: f.slug ?? '',
      description: f.description ?? '',
      location: f.location ?? '',
      venueType: f.venueType ?? '',
      capacity: f.capacity ?? 1,
      bookingMode: f.bookingMode === 'class' ? 'class' : 'court',
      activeSlots: f.activeSlots ?? null,
      slotQuotas: f.slotQuotas ?? null,
      sessionNote: f.sessionNote ?? '',
      classCode: f.classCode ?? '',
      accurateItemNo: f.accurateItemNo ?? '',
      accurateItemNoWarga: f.accurateItemNoWarga ?? '',
      rating: f.rating ?? 5.0,
      isActive: f.isActive ?? true,
      sortOrder: f.sortOrder ?? 0,
      hero: null,
      gallery: [],
      removeHero: false
    })
    setMetadata(parseMeta(f.displayMetadata as Record<string, unknown> | null | undefined))
    setUseWeeklySchedule(f.activeSlots != null || f.bookingMode === 'class')
    setDayTexts(WEEKDAYS.reduce((acc, day) => ({ ...acc, [day]: f.activeSlots?.[day]?.join(', ') ?? '' }), {} as Record<string, string>))
  }, [pageData])

  // Sync name → slug (create mode only)
  useEffect(() => {
    if (!isEdit && data.name) {
      setData('slug', slugify(data.name))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.name, isEdit])

  // A class never runs on the 06:00-22:00 fallback, so class mode keeps the
  // weekly editor open. Held here rather than in the mode buttons so a class
  // row saved without slots still lands on an editable schedule.
  useEffect(() => {
    if (data.bookingMode !== 'class') return
    if (!useWeeklySchedule) setUseWeeklySchedule(true)
    if (data.activeSlots == null) setData('activeSlots', {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.bookingMode])

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrors({})

    const formData = new FormData()
    formData.set('facilityCategoryId', String(data.facilityCategoryId))
    formData.set('name', data.name)
    formData.set('slug', data.slug)
    formData.set('description', data.description)
    formData.set('location', data.location)
    formData.set('venueType', data.venueType)
    formData.set('capacity', String(data.capacity))
    formData.set('bookingMode', data.bookingMode)
    formData.set('sessionNote', data.sessionNote)
    formData.set('classCode', data.classCode)
    formData.set('accurateItemNo', data.accurateItemNo)
    formData.set('accurateItemNoWarga', data.accurateItemNoWarga)
    formData.set('rating', String(data.rating))
    formData.set('isActive', data.isActive ? 'true' : 'false')
    formData.set('sortOrder', String(data.sortOrder))
    formData.set('removeHero', data.removeHero ? 'true' : 'false')
    formData.set('activeSlots', JSON.stringify(data.activeSlots))
    formData.set('slotQuotas', JSON.stringify(data.slotQuotas))
    formData.set('displayMetadata', hasMetaContent(metadata) ? JSON.stringify(metadata) : '')
    if (data.hero) formData.set('hero', data.hero)
    data.gallery.forEach((file) => formData.append('gallery', file))

    try {
      if (isEdit) {
        await updateMutation.mutateAsync(formData)
        toast.success('Perubahan fasilitas disimpan.')
      } else {
        await createMutation.mutateAsync(formData)
        toast.success('Fasilitas baru dibuat.')
      }
      router.push(routes.facilities())
    } catch (error) {
      const fields = extractFieldErrors(error)
      if (Object.keys(fields).length > 0) {
        setErrors(fields)
      } else {
        toast.error('Gagal menyimpan fasilitas. Periksa kembali isian Anda.')
      }
    }
  }

  const processing = createMutation.isPending || updateMutation.isPending
  const existingHeroUrl = facility?.hero?.url ?? null
  // gallery: DTO memakai MediaRefDto (id uuid string + orderColumn); ExistingMedia dropzone masih id:number.
  // Runtime id string lolos apa adanya (key/hapus), hanya bentuk tipe yang di-cast.
  const existingGallery = (facility?.gallery ?? []) as unknown as ExistingMedia[]
  const selectedCategory = categories.find((category) => category.id === data.facilityCategoryId)
  const metadataCount =
    metadata.periods.length + metadata.daftarHarga.left.length + metadata.daftarHarga.right.length + metadata.additionalDetails.length
  const scheduleLabel = useWeeklySchedule ? 'Jadwal khusus' : 'Jadwal otomatis'

  return (
    <>
      <div className="px-4 pt-2 xl:px-8">
        <div className="animate-fade-in-up flex flex-col gap-1 pt-4">
          <span className="font-bdo text-[12px] font-bold tracking-wide text-[#E35336]">{isEdit ? 'Edit Fasilitas' : 'Fasilitas Baru'}</span>
          <h1 className="font-clash text-3xl font-bold tracking-tight uppercase xl:text-4xl">
            <span className="facility-title-shine">{isEdit ? (facility?.name ?? '') : 'Buat Fasilitas'}</span>
          </h1>
        </div>
      </div>

      <main className="ubsc-page-facility-form max-w-full flex-1 px-4 pt-2 pb-10 xl:px-8">
        <form onSubmit={submit} className="relative flex flex-col gap-5 overflow-x-hidden pt-4 pb-24 sm:gap-6 sm:pt-6" encType="multipart/form-data">
          <section className="animate-fade-in-up relative overflow-hidden rounded-[28px] border border-[#F8B5A8]/70 bg-[linear-gradient(145deg,#FFFFFF_0%,#FFF7F5_46%,#FFFFFF_100%)] shadow-[0_22px_54px_-46px_rgba(127,36,25,0.5)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#F8B5A8_0%,#E35336_48%,#B93D2A_100%)]" />
            <div className="pointer-events-none absolute -top-20 -right-16 h-52 w-52 rounded-full blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-[#F08C78]/10 blur-3xl xl:hidden" />
            <div className="relative z-10 grid gap-0 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="p-4 sm:p-5 lg:p-6">
                <div className="flex flex-col gap-5">
                  <div className="max-w-2xl">
                    <div className="inline-flex items-center gap-2 rounded-2xl border border-[#F8B5A8]/70 px-3 py-1.5 font-bdo text-[11px] font-bold text-[#B93D2A] shadow-[0_16px_30px_-26px_rgba(227,83,54,.7)] xl:bg-[#FFF7F5] xl:shadow-none">
                      <Settings2 size={13} />
                      Editor fasilitas
                    </div>
                    <h2 className="mt-3 font-clash text-xl leading-tight font-semibold tracking-tight text-slate-950 sm:text-2xl sm:leading-8">
                      Susun data yang akan dilihat pengguna publik.
                    </h2>
                    <p className="mt-2 max-w-xl font-bdo text-sm leading-relaxed font-medium text-slate-500">
                      Ringkasan di bawah akan ikut berubah saat admin mengisi nama, kategori, jadwal, dan detail tampilan.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:max-w-3xl xl:max-w-4xl">
                    {[
                      { label: 'Kategori', value: selectedCategory?.name ?? 'Kosong' },
                      { label: 'Status', value: data.isActive ? 'Aktif' : 'Konsep' },
                      { label: 'Jadwal', value: scheduleLabel },
                      { label: 'Detail', value: `${metadataCount} item` }
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
                      <Building2 size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 font-clash text-sm font-semibold text-slate-950">{data.name || 'Nama fasilitas belum diisi'}</p>
                      <p className="mt-1 truncate font-bdo text-[11px] font-semibold text-slate-400">/{data.slug || 'tautan-fasilitas'}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <span className="rounded-full border border-[#F8B5A8]/70 bg-white px-2.5 py-1 font-bdo text-[10px] font-bold text-[#B93D2A]">
                          {selectedCategory?.name ?? 'Kategori belum dipilih'}
                        </span>
                        <span
                          className={cn(
                            'rounded-full border px-2.5 py-1 font-bdo text-[10px] font-bold',
                            data.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-500'
                          )}
                        >
                          {data.isActive ? 'Tampil di situs' : 'Disimpan sebagai konsep'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3 xl:gap-6">
            {/* ═══ LEFT — Main fields (spans 2 cols) ═══ */}
            <SectionCard
              icon={<Building2 size={15} />}
              accentColor="terracotta"
              title="Informasi Utama"
              subtitle="Data dasar dan deskripsi fasilitas"
              className="xl:col-span-2"
              animDelay="delay-100"
            >
              <div className="flex flex-col gap-5">
                {/* Category */}
                <div>
                  <label
                    htmlFor="facility_category_id"
                    className="mb-1.5 block font-bdo text-[11px] font-bold tracking-wider text-slate-500 uppercase"
                  >
                    Kategori
                  </label>
                  <select
                    id="facility_category_id"
                    name="facility_category_id"
                    value={data.facilityCategoryId}
                    onChange={(e) => setData('facilityCategoryId', e.target.value)}
                    className="input-field"
                  >
                    <option value="">Pilih kategori...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {errors.facilityCategoryId && <p className="mt-1.5 font-bdo text-[11px] text-rose-500">{errors.facilityCategoryId}</p>}
                </div>

                {/* Name */}
                <div>
                  <label htmlFor="facility_name" className="mb-1.5 block font-bdo text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                    Nama Fasilitas
                  </label>
                  <input
                    id="facility_name"
                    name="name"
                    type="text"
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    placeholder="Lapangan Bulutangkis Hall A"
                    className="input-field"
                  />
                  {errors.name && <p className="mt-1.5 font-bdo text-[11px] text-rose-500">{errors.name}</p>}
                </div>

                {/* Slug */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label htmlFor="facility_slug" className="font-bdo text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                      Tautan Halaman
                    </label>
                    <span className="rounded-full border border-[#F8B5A8]/70 bg-[#FFF7F5] px-2.5 py-1 font-bdo text-[10px] font-bold text-[#B93D2A]">
                      {isEdit ? 'Bisa diubah manual' : 'Dibuat otomatis dari nama'}
                    </span>
                  </div>
                  <input
                    id="facility_slug"
                    name="slug"
                    type="text"
                    value={data.slug}
                    onChange={(e) => setData('slug', e.target.value)}
                    placeholder="lapangan-bulutangkis-hall-a"
                    className="input-field mono"
                  />
                  {errors.slug && <p className="mt-1.5 font-bdo text-[11px] text-rose-500">{errors.slug}</p>}
                </div>

                <div className="section-divider" />

                {/* Description */}
                <div>
                  <label
                    htmlFor="facility_description"
                    className="mb-1.5 block font-bdo text-[11px] font-bold tracking-wider text-slate-500 uppercase"
                  >
                    Deskripsi
                  </label>
                  <textarea
                    id="facility_description"
                    name="description"
                    value={data.description}
                    onChange={(e) => setData('description', e.target.value)}
                    rows={5}
                    placeholder="Deskripsikan fasilitas ini..."
                    className="input-field resize-none leading-relaxed"
                  />
                  {errors.description && <p className="mt-1.5 font-bdo text-[11px] text-rose-500">{errors.description}</p>}
                </div>
              </div>
            </SectionCard>

            {/* ═══ RIGHT — Settings + Media ═══ */}
            <div className="flex flex-col gap-5">
              {/* Settings */}
              <SectionCard
                icon={<SlidersHorizontal size={15} />}
                accentColor="terracotta"
                title="Pengaturan"
                subtitle="Status dan urutan tampil"
                animDelay="delay-150"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#F8B5A8]/55 bg-[#FFF7F5]/60 px-4 py-3.5 transition-all hover:bg-white">
                    <div>
                      <p className="font-clash text-sm font-semibold text-slate-800">Tampilkan di Situs</p>
                      <p className="mt-0.5 font-bdo text-[11px] text-slate-400">
                        {data.isActive ? 'Fasilitas aktif & terlihat' : 'Tersembunyi dari publik'}
                      </p>
                    </div>
                    <ToggleSwitch enabled={data.isActive} onChange={(v) => setData('isActive', v)} label="Tampilkan fasilitas di situs" />
                  </div>

                  <div className="section-divider" />

                  <div>
                    <label htmlFor="sort_order" className="mb-1.5 block font-bdo text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                      Urutan Tampil
                    </label>
                    <input
                      id="sort_order"
                      name="sort_order"
                      type="number"
                      min={0}
                      value={data.sortOrder}
                      onChange={(e) => setData('sortOrder', Number(e.target.value))}
                      className="input-field mono"
                    />
                    <p className="mt-1.5 font-bdo text-[10px] font-medium text-slate-400">Angka lebih kecil tampil lebih dulu</p>
                  </div>

                  <div className="section-divider" />

                  <div>
                    <label className="mb-1.5 block font-bdo text-[11px] font-bold tracking-wider text-slate-500 uppercase">Tipe Reservasi</label>
                    <div className="flex gap-2">
                      {(
                        [
                          ['court', 'Lapangan', 'Disewa per jam, satu penyewa.'],
                          ['class', 'Kelas', 'Jadwal mingguan, banyak peserta.']
                        ] as const
                      ).map(([mode, label, hint]) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setData('bookingMode', mode)}
                          className={`flex-1 rounded-2xl border px-4 py-3 text-left transition ${
                            data.bookingMode === mode
                              ? 'border-[#F8B5A8] bg-[#FFF7F5] ring-1 ring-[#F8B5A8]'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <span className="block font-clash text-sm font-semibold text-slate-800">{label}</span>
                          <span className="mt-0.5 block font-bdo text-[10px] text-slate-400">{hint}</span>
                        </button>
                      ))}
                    </div>
                    {data.bookingMode === 'class' && (
                      <p className="mt-2 font-bdo text-[10px] font-medium text-slate-400">
                        Grup kelas paralel (Kelas A, B, ...) diatur di halaman Unit fasilitas ini. Satu grup Reguler dibuat otomatis kalau belum ada.
                      </p>
                    )}
                  </div>

                  <div className="section-divider" />

                  <div>
                    <label htmlFor="capacity" className="mb-1.5 block font-bdo text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                      {data.bookingMode === 'class' ? 'Kuota Peserta per Sesi' : 'Kapasitas Maksimal'}
                    </label>
                    <input
                      id="capacity"
                      name="capacity"
                      type="number"
                      min={1}
                      max={9999}
                      value={data.capacity}
                      onChange={(e) => setData('capacity', parseInt(e.target.value) || 1)}
                      className="input-field mono"
                    />
                    <p className="mt-1.5 font-bdo text-[10px] font-medium text-slate-400">
                      {data.bookingMode === 'class'
                        ? 'Kuota standar tiap pertemuan. Bisa ditimpa per hari/jam di jadwal di bawah.'
                        : '1 = lapangan eksklusif. Lebih dari 1 = kelas bersama (misal 35 untuk Yoga).'}
                    </p>
                    {errors.capacity && <p className="mt-1.5 font-bdo text-[11px] text-rose-500">{errors.capacity}</p>}
                  </div>

                  {data.bookingMode === 'class' && (
                    <>
                      <div className="section-divider" />

                      <div>
                        <label htmlFor="session_note" className="mb-1.5 block font-bdo text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                          Keterangan Durasi Sesi
                        </label>
                        <input
                          id="session_note"
                          name="session_note"
                          type="text"
                          maxLength={160}
                          value={data.sessionNote}
                          placeholder={sessionNoteDefault}
                          onChange={(e) => setData('sessionNote', e.target.value)}
                          className="input-field"
                        />
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <p className="font-bdo text-[10px] font-medium text-slate-400">
                            Tampil di halaman booking kelas. Kosongkan untuk memakai default:{' '}
                            <span className="font-bold text-slate-500">{sessionNoteDefault}</span>
                          </p>
                          {data.sessionNote !== sessionNoteDefault && (
                            <button
                              type="button"
                              onClick={() => setData('sessionNote', sessionNoteDefault)}
                              className="rounded-full bg-[#FFF7F5] px-2.5 py-0.5 font-bdo text-[10px] font-bold text-[#B93D2A] ring-1 ring-[#F8B5A8] transition hover:bg-[#E35336] hover:text-white"
                            >
                              Isi default
                            </button>
                          )}
                        </div>
                        {errors.sessionNote && <p className="mt-1.5 font-bdo text-[11px] text-rose-500">{errors.sessionNote}</p>}
                      </div>
                    </>
                  )}

                  <div className="section-divider" />

                  {/* Weekly Schedule Toggle */}
                  <div>
                    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#F8B5A8]/55 bg-[#FFF7F5]/60 px-4 py-3.5 transition-all hover:bg-white">
                      <div>
                        <p className="flex items-center gap-2 font-clash text-sm font-semibold text-slate-800">
                          Jadwal Berbasis Hari
                          {data.bookingMode === 'class' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF7F5] px-2 py-0.5 font-bdo text-[9px] font-bold tracking-wider text-[#B93D2A] uppercase ring-1 ring-[#F8B5A8]">
                              <Lock size={9} /> Terkunci
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 font-bdo text-[11px] text-slate-400">
                          {data.bookingMode === 'class'
                            ? 'Wajib untuk kelas - tentukan hari dan jam pertemuan'
                            : useWeeklySchedule
                              ? 'Aktif - slot per hari'
                              : 'Nonaktif - 06:00-22:00 otomatis'}
                        </p>
                      </div>
                      <ToggleSwitch
                        enabled={useWeeklySchedule}
                        label="Aktifkan jadwal berbasis hari"
                        disabled={data.bookingMode === 'class'}
                        disabledHint="Kelas selalu memakai jadwal berbasis hari. Ganti Tipe Reservasi ke Lapangan untuk mematikannya."
                        onChange={(v) => {
                          if (data.bookingMode === 'class') return
                          setUseWeeklySchedule(v)
                          setData(
                            'activeSlots',
                            v
                              ? WEEKDAYS.reduce(
                                  (acc, day) => {
                                    const parsed = dayTexts[day]
                                      .split(',')
                                      .map((s) => s.trim())
                                      .filter((s) => /^\d{2}:\d{2}$/.test(s))
                                    return { ...acc, [day]: parsed }
                                  },
                                  {} as Record<string, string[]>
                                )
                              : null
                          )
                        }}
                      />
                    </div>

                    {useWeeklySchedule && (
                      <div className="mt-3">
                        <WeeklySlotEditor
                          value={data.activeSlots}
                          onChange={(next) => setData('activeSlots', next)}
                          variant={data.bookingMode === 'class' ? 'chips' : 'text'}
                          {...(data.bookingMode === 'class'
                            ? {
                                quotas: data.slotQuotas ?? {},
                                onQuotasChange: (next) => setData('slotQuotas', Object.keys(next).length > 0 ? next : null),
                                defaultQuota: data.capacity
                              }
                            : {})}
                        />
                      </div>
                    )}

                    {data.bookingMode === 'class' && customScheduleGroups.length > 0 && (
                      <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                        <AlertTriangle size={15} className="mt-px shrink-0 text-amber-500" />
                        <p className="font-bdo text-[11px] leading-relaxed font-medium text-amber-800">
                          {customScheduleGroups.join(', ')} memakai <span className="font-bold">Custom jam</span>, jadi grup itu tidak ikut jadwal di
                          atas. Ubah jadwalnya lewat{' '}
                          {isEdit ? (
                            <Link href={routes.facilitiesUnits(id ?? '')} className="font-bold underline underline-offset-2">
                              Kelola unit
                            </Link>
                          ) : (
                            <span className="font-bold">Kelola unit</span>
                          )}
                          , atau matikan Custom jam di grup itu supaya ikut jadwal fasilitas.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </SectionCard>

              {/* Media */}
              <SectionCard
                icon={<Image size={15} />}
                accentColor="terracotta"
                title="Media"
                subtitle="Gambar utama dan galeri foto"
                animDelay="delay-200"
              >
                <div className="flex flex-col gap-6">
                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <p className="mb-3 font-bdo text-[11px] font-bold tracking-wider text-slate-500 uppercase">Gambar Utama</p>
                    <SingleDropzone
                      label="Gambar Utama"
                      currentUrl={existingHeroUrl}
                      onFileSelect={(file) => {
                        setData('hero', file)
                        setData('removeHero', false)
                      }}
                      onRemoveExisting={() => {
                        setData('hero', null)
                        setData('removeHero', true)
                      }}
                    />
                  </div>
                  <div className="section-divider" />
                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <p className="mb-3 font-bdo text-[11px] font-bold tracking-wider text-slate-500 uppercase">Galeri</p>
                    <MultiDropzone
                      label="Galeri"
                      existing={existingGallery}
                      onFilesChange={(files) => setData('gallery', files)}
                      onRemoveExisting={(mediaId) => {
                        if (!confirm('Hapus foto galeri ini? Tindakan ini tidak dapat dibatalkan.')) {
                          return
                        }
                        deleteGallery.mutateAsync(String(mediaId))
                      }}
                    />
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>

          {/* ═══ FULL-WIDTH ROW 2 — Display Info + Badge ═══ */}
          <SectionCard
            icon={<MapPin size={15} />}
            accentColor="terracotta"
            title="Info Tampil & Badge"
            subtitle="Lokasi, tipe venue, kode kelas, dan rating untuk komponen publik"
            animDelay="delay-250"
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {/* Location */}
              <div>
                <label htmlFor="facility_location" className="mb-1.5 block font-bdo text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  Lokasi
                </label>
                <CreatableSelect
                  id="facility_location"
                  name="location"
                  value={data.location}
                  onChange={(val) => setData('location', val)}
                  options={LOCATIONS}
                  placeholder="Pilih atau ketik lokasi..."
                  error={errors.location}
                  ariaLabel="Lokasi fasilitas"
                />
              </div>

              {/* Venue Type */}
              <div>
                <label htmlFor="facility_venue_type" className="mb-1.5 block font-bdo text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  Tipe Venue
                </label>
                <CreatableSelect
                  id="facility_venue_type"
                  name="venue_type"
                  value={data.venueType}
                  onChange={(val) => setData('venueType', val)}
                  options={VENUE_TYPES}
                  placeholder="Pilih atau ketik tipe..."
                  error={errors.venueType}
                  ariaLabel="Tipe venue fasilitas"
                />
              </div>

              {/* Class Code */}
              <div>
                <label htmlFor="facility_class_code" className="mb-1.5 block font-bdo text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  Kode Kelas
                </label>
                <input
                  id="facility_class_code"
                  name="class_code"
                  type="text"
                  value={data.classCode}
                  onChange={(e) => setData('classCode', e.target.value)}
                  placeholder="/Class 003/"
                  className="input-field mono"
                />
                <p className="mt-1.5 font-bdo text-[10px] text-slate-400">Opsional - untuk komponen kelas</p>
              </div>

              {/* Nomor item Accurate — kolom ITEM:ITEM NO export faktur */}
              <div>
                <label
                  htmlFor="facility_accurate_item"
                  className="mb-1.5 block font-bdo text-[11px] font-bold tracking-wider text-slate-500 uppercase"
                >
                  Nomor Item Accurate — Umum
                </label>
                <input
                  id="facility_accurate_item"
                  name="accurate_item_no"
                  type="text"
                  maxLength={30}
                  value={data.accurateItemNo}
                  onChange={(e) => setData('accurateItemNo', e.target.value)}
                  placeholder="Mis. FUTSAL-01"
                  className="input-field mono"
                />
                {errors.accurateItemNo && <p className="mt-1.5 font-bdo text-[11px] font-medium text-rose-500">{errors.accurateItemNo}</p>}
                <p className="mt-1.5 font-bdo text-[10px] text-slate-400">Sama persis dengan nomor barang/jasa di Accurate - dipakai export faktur</p>
              </div>

              <div>
                <label
                  htmlFor="facility_accurate_item_warga"
                  className="mb-1.5 block font-bdo text-[11px] font-bold tracking-wider text-slate-500 uppercase"
                >
                  Nomor Item Accurate — Warga UB
                </label>
                <input
                  id="facility_accurate_item_warga"
                  name="accurate_item_no_warga"
                  type="text"
                  maxLength={30}
                  value={data.accurateItemNoWarga}
                  onChange={(e) => setData('accurateItemNoWarga', e.target.value)}
                  placeholder="Mis. FUTSAL-01-W"
                  className="input-field mono"
                />
                {errors.accurateItemNoWarga && <p className="mt-1.5 font-bdo text-[11px] font-medium text-rose-500">{errors.accurateItemNoWarga}</p>}
                <p className="mt-1.5 font-bdo text-[10px] text-slate-400">Dipakai export faktur untuk booking bertarif Warga UB</p>
              </div>

              {/* Rating */}
              <div>
                <label htmlFor="rating" className="mb-1.5 block font-bdo text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  Rating (0-5)
                </label>
                <input
                  id="rating"
                  name="rating"
                  type="number"
                  min={0}
                  max={5}
                  step={0.1}
                  value={data.rating}
                  onChange={(e) => setData('rating', Number(e.target.value))}
                  className="input-field mono"
                />
                <p className="mt-1.5 font-bdo text-[10px] text-slate-400">Ditampilkan sebagai nilai rekomendasi fasilitas.</p>
              </div>
            </div>
          </SectionCard>

          {/* ═══ FULL-WIDTH ROW 3 — Display Metadata Builder ═══ */}
          <SectionCard
            icon={<Database size={15} />}
            accentColor="terracotta"
            title="Detail Tampilan Publik"
            subtitle="Harga per periode, daftar harga, dan detail tambahan untuk UI publik"
            animDelay="delay-300"
          >
            <MetadataBuilder value={metadata} onChange={setMetadata} />

            {hasMetaContent(metadata) && (
              <details className="mt-4">
                <summary className="cursor-pointer font-bdo text-[10px] font-bold tracking-wider text-[#B93D2A] uppercase select-none hover:text-[#E35336]">
                  Lihat rincian tersimpan
                </summary>
                <pre className="facility-scrollbar mt-2 overflow-x-auto rounded-2xl border border-[#F8B5A8]/55 bg-[#FFF7F5] p-3 font-mono text-[10px] text-slate-600">
                  {JSON.stringify(metadata, null, 2)}
                </pre>
              </details>
            )}
          </SectionCard>

          {/* ── Action bar ── */}
          <div className="animate-fade-in-up sticky bottom-4 z-30 flex flex-col-reverse items-stretch gap-3 rounded-[24px] border border-[#F8B5A8]/70 px-4 py-4 shadow-[0_24px_60px_-42px_rgba(127,36,25,0.45)] backdrop-blur-xl delay-400 sm:flex-row sm:items-center sm:px-5">
            <Link
              href={routes.facilities()}
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 font-clash text-sm font-semibold text-slate-600 transition-all hover:border-[#F8B5A8] hover:bg-[#FFF7F5] hover:text-[#B93D2A]"
            >
              <ArrowLeft size={14} />
              Batal
            </Link>

            <div className="section-divider mx-1 hidden h-8 w-px sm:block" />

            <p className="hidden flex-1 text-center font-bdo text-[11px] font-medium text-slate-400 sm:block sm:text-left">
              {isEdit ? 'Perubahan akan langsung diterapkan setelah disimpan.' : 'Fasilitas baru akan langsung tersedia untuk dikonfigurasi.'}
            </p>

            <button
              type="submit"
              disabled={processing}
              className="btn-sheen relative flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#F08C78_0%,#E35336_52%,#B93D2A_100%)] px-7 py-3 font-clash text-sm font-semibold text-white shadow-[0_18px_34px_-24px_rgba(227,83,54,.95),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_40px_-24px_rgba(227,83,54,1)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              <span className="pointer-events-none absolute top-0 right-0 left-0 h-px rounded-t-xl bg-white/20" />
              <Save size={14} />
              {processing ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Buat Fasilitas'}
            </button>
          </div>
        </form>
      </main>
    </>
  )
}
