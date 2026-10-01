'use client'

import '../plans.css'

import {
  Activity,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Crown,
  Gem,
  Layers3,
  Pencil,
  Plus,
  ReceiptText,
  Sparkles,
  Timer,
  Trash2,
  Users,
  X
} from 'lucide-react'
import { type FormEvent, type ReactNode, useMemo, useState } from 'react'
import { SlideOver } from '@/components/admin/SlideOver'
import { useCreatePlan, useDeletePlan, useMembershipPlans, useUpdatePlan } from '@/hooks/api/useMemberships'
import { extractApiError, fieldErrorMap } from '@/lib/apiError'
import { cn } from '@/lib/utils'
import type { MembershipPlanPayload } from '@/services/Memberships'
import type { AdminMembershipPlanDto } from '@/types/contracts/contracts'

type PlanFormData = {
  name: string
  description: string
  publicBadge: string
  savingsLabel: string
  ctaLabel: string
  cardImageUrl: string
  price: string
  wargaPrice: string
  accurateItemNo: string
  accurateItemNoWarga: string
  durationMonths: number
  features: string[]
  isActive: boolean
  sortOrder: string
}

// Pengganti flash.success / errors.plan Inertia: diisi dari hasil mutation.
type Feedback = { type: 'success' | 'error'; message: string } | null

const inputBase =
  'h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 font-bdo text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#F8B5A8] focus:ring-4 focus:ring-[#E35336]/10'

const labelBase = 'mb-2 block font-bdo text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500'

function formatIDR(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`
}

function durationLabel(months: number): string {
  if (months === 12) return '1 Tahun'
  if (months === 1) return '1 Bulan'
  return `${months} Bulan`
}

function monthlyEstimate(plan: AdminMembershipPlanDto): number {
  return Math.round(plan.price / Math.max(plan.durationMonths, 1))
}

/** String opsional kosong → null (padanan ConvertEmptyStringsToNull Laravel). */
function emptyToNull(value: string): string | null {
  return value.trim() === '' ? null : value
}

function buildPayload(data: PlanFormData): MembershipPlanPayload {
  return {
    name: data.name,
    description: emptyToNull(data.description),
    publicBadge: emptyToNull(data.publicBadge),
    savingsLabel: emptyToNull(data.savingsLabel),
    ctaLabel: emptyToNull(data.ctaLabel),
    cardImageUrl: emptyToNull(data.cardImageUrl),
    price: Number(data.price),
    wargaPrice: data.wargaPrice.trim() === '' ? null : Number(data.wargaPrice),
    accurateItemNo: emptyToNull(data.accurateItemNo),
    accurateItemNoWarga: emptyToNull(data.accurateItemNoWarga),
    durationMonths: data.durationMonths,
    features: data.features,
    isActive: data.isActive,
    sortOrder: Number(data.sortOrder)
  }
}

function IconTile({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#F08C78_0%,#E35336_52%,#B93D2A_100%)] text-white shadow-[0_18px_30px_-22px_rgba(227,83,54,.95)]',
        className
      )}
    >
      {children}
      <span className="pointer-events-none absolute top-1.5 right-2 left-2 h-1 rounded-full bg-white/35 blur-[1px]" />
    </span>
  )
}

function MetricChip({
  icon,
  label,
  value,
  tone = 'terracotta'
}: {
  icon: ReactNode
  label: string
  value: string | number
  tone?: 'terracotta' | 'emerald' | 'slate'
}) {
  const toneClass = {
    terracotta: 'border-[#F8B5A8] bg-[#FFF7F5] text-[#B93D2A]',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    slate: 'border-slate-200 bg-white text-slate-500'
  }[tone]

  return (
    <div className={cn('flex min-w-0 items-center gap-2 rounded-2xl border px-3 py-2', toneClass)}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/80 ring-1 ring-white/80">{icon}</span>
      <span className="min-w-0">
        <span className="block font-bdo text-[10px] font-bold tracking-[0.14em] uppercase opacity-70">{label}</span>
        <span className="block truncate font-clash text-sm font-semibold">{value}</span>
      </span>
    </div>
  )
}

function ToggleSwitch({ enabled, onChange }: { enabled: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 rounded-full p-1 transition focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#E35336]/40 focus-visible:ring-offset-2',
        enabled ? 'bg-[#E35336]' : 'bg-slate-200'
      )}
    >
      <span className={cn('h-5 w-5 rounded-full bg-white shadow-xs transition', enabled ? 'translate-x-5' : 'translate-x-0')} />
    </button>
  )
}

function PlanForm({
  item,
  onClose,
  onFeedback
}: {
  item: AdminMembershipPlanDto | null
  onClose: () => void
  onFeedback: (feedback: Feedback) => void
}) {
  const isEdit = item !== null
  const [featureInput, setFeatureInput] = useState('')
  const [data, setDataState] = useState<PlanFormData>({
    name: item?.name ?? '',
    description: item?.description ?? '',
    publicBadge: item?.publicBadge ?? '',
    savingsLabel: item?.savingsLabel ?? '',
    ctaLabel: item?.ctaLabel ?? '',
    cardImageUrl: item?.cardImageUrl ?? '',
    price: item ? String(item.price) : '',
    wargaPrice: item?.wargaPrice != null ? String(item.wargaPrice) : '',
    accurateItemNo: item?.accurateItemNo ?? '',
    accurateItemNoWarga: item?.accurateItemNoWarga ?? '',
    durationMonths: item?.durationMonths ?? 1,
    features: item?.features ?? [],
    isActive: item?.isActive ?? true,
    sortOrder: item ? String(item.sortOrder) : '0'
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const createPlan = useCreatePlan()
  const updatePlan = useUpdatePlan()
  const processing = createPlan.isPending || updatePlan.isPending

  const setData = <K extends keyof PlanFormData>(key: K, value: PlanFormData[K]) => {
    setDataState((current) => ({ ...current, [key]: value }))
  }

  const addFeature = () => {
    const next = featureInput.trim()
    if (!next) return
    if (data.features.some((feature) => feature.toLowerCase() === next.toLowerCase())) {
      setFeatureInput('')
      return
    }

    setData('features', [...data.features, next])
    setFeatureInput('')
  }

  const removeFeature = (index: number) => {
    setData(
      'features',
      data.features.filter((_, itemIndex) => itemIndex !== index)
    )
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()

    const payload = buildPayload(data)
    setErrors({})

    try {
      if (isEdit) {
        await updatePlan.mutateAsync({ id: item.id, payload })
        onFeedback({ type: 'success', message: 'Paket berhasil diperbarui.' })
      } else {
        await createPlan.mutateAsync(payload)
        onFeedback({ type: 'success', message: 'Paket membership berhasil dibuat.' })
      }
      onClose()
    } catch (error) {
      const fields = fieldErrorMap(error)
      setErrors(fields)
      // Error non-field (mis. 403/500) → banner rose halaman, padanan errors.plan.
      if (Object.keys(fields).length === 0) onFeedback({ type: 'error', message: extractApiError(error).message })
    }
  }

  const previewPrice = Number(data.price) || 0

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <section className="overflow-hidden rounded-[26px] border border-[#F8B5A8]/70 bg-[#FFF7F5]">
        <div className="relative p-4">
          <div className="pointer-events-none absolute -top-12 -right-10 h-28 w-28 rounded-full bg-[#E35336]/15 blur-2xl" />
          <div className="relative z-10 flex items-center gap-3">
            <IconTile className="h-11 w-11">
              <Crown size={17} />
            </IconTile>
            <div className="min-w-0">
              <p className="font-clash text-base font-semibold text-slate-950">{data.name || 'Paket membership'}</p>
              <p className="font-bdo text-xs font-semibold text-[#B93D2A]">
                {previewPrice > 0 ? formatIDR(previewPrice) : 'Nominal belum diisi'} / {durationLabel(data.durationMonths)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div>
        <label htmlFor="plan_name" className={labelBase}>
          Nama paket
        </label>
        <input
          id="plan_name"
          type="text"
          value={data.name}
          onChange={(event) => setData('name', event.target.value)}
          placeholder="Contoh: Gym Basic"
          className={inputBase}
          required
        />
        {errors.name && <p className="mt-1.5 font-bdo text-xs font-medium text-rose-500">{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="plan_description" className={labelBase}>
          Deskripsi singkat
        </label>
        <textarea
          id="plan_description"
          rows={3}
          value={data.description}
          onChange={(event) => setData('description', event.target.value)}
          placeholder="Tulis penjelasan singkat yang mudah dipahami pengguna."
          className={cn(inputBase, 'h-auto resize-none py-3 leading-relaxed')}
        />
        {errors.description && <p className="mt-1.5 font-bdo text-xs font-medium text-rose-500">{errors.description}</p>}
      </div>

      <section className="rounded-[24px] border border-slate-200 bg-white p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#F8B5A8]/70 bg-[#FFF7F5] text-[#E35336]">
            <Sparkles size={16} />
          </span>
          <div>
            <p className="font-clash text-base leading-tight font-semibold text-slate-950">Tampilan card publik</p>
            <p className="mt-1 font-bdo text-xs leading-relaxed font-medium text-slate-500">
              Field opsional untuk carousel membership di homepage. Jika kosong, website memakai fallback rapi dari data paket utama.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="plan_public_badge" className={labelBase}>
              Badge kanan
            </label>
            <input
              id="plan_public_badge"
              type="text"
              value={data.publicBadge}
              onChange={(event) => setData('publicBadge', event.target.value)}
              placeholder="Contoh: Business & Team"
              className={inputBase}
            />
            {errors.publicBadge && <p className="mt-1.5 font-bdo text-xs font-medium text-rose-500">{errors.publicBadge}</p>}
          </div>
          <div>
            <label htmlFor="plan_savings_label" className={labelBase}>
              Label promo
            </label>
            <input
              id="plan_savings_label"
              type="text"
              value={data.savingsLabel}
              onChange={(event) => setData('savingsLabel', event.target.value)}
              placeholder="Contoh: Hemat 20%"
              className={inputBase}
            />
            {errors.savingsLabel && <p className="mt-1.5 font-bdo text-xs font-medium text-rose-500">{errors.savingsLabel}</p>}
          </div>
          <div>
            <label htmlFor="plan_cta_label" className={labelBase}>
              Label CTA
            </label>
            <input
              id="plan_cta_label"
              type="text"
              value={data.ctaLabel}
              onChange={(event) => setData('ctaLabel', event.target.value)}
              placeholder="Contoh: Membership"
              className={inputBase}
            />
            {errors.ctaLabel && <p className="mt-1.5 font-bdo text-xs font-medium text-rose-500">{errors.ctaLabel}</p>}
          </div>
          <div>
            <label htmlFor="plan_card_image_url" className={labelBase}>
              URL gambar card
            </label>
            <input
              id="plan_card_image_url"
              type="text"
              value={data.cardImageUrl}
              onChange={(event) => setData('cardImageUrl', event.target.value)}
              placeholder="/assets/images/ub-sport-center-gym-footer.avif"
              className={inputBase}
            />
            {errors.cardImageUrl && <p className="mt-1.5 font-bdo text-xs font-medium text-rose-500">{errors.cardImageUrl}</p>}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="plan_price" className={labelBase}>
            Harga
          </label>
          <input
            id="plan_price"
            type="number"
            min="0"
            step="1000"
            value={data.price}
            onChange={(event) => setData('price', event.target.value)}
            placeholder="150000"
            className={inputBase}
            required
          />
          {errors.price && <p className="mt-1.5 font-bdo text-xs font-medium text-rose-500">{errors.price}</p>}
        </div>
        <div>
          <label htmlFor="plan_warga_price" className={labelBase}>
            Harga Warga UB
          </label>
          <input
            id="plan_warga_price"
            type="number"
            min="0"
            step="1000"
            value={data.wargaPrice}
            onChange={(event) => setData('wargaPrice', event.target.value)}
            placeholder="Kosongkan bila sama"
            className={inputBase}
          />
          <p className="mt-1.5 font-bdo text-[11px] text-slate-400">Berlaku untuk Warga UB yang identitasnya sudah terverifikasi.</p>
          {errors.wargaPrice && <p className="mt-1.5 font-bdo text-xs font-medium text-rose-500">{errors.wargaPrice}</p>}
        </div>
        <div>
          <label htmlFor="plan_accurate_item" className={labelBase}>
            Nomor Item Accurate — Umum
          </label>
          <input
            id="plan_accurate_item"
            value={data.accurateItemNo}
            onChange={(event) => setData('accurateItemNo', event.target.value)}
            maxLength={30}
            placeholder="Mis. GYM-1B"
            className={inputBase}
          />
          <p className="mt-1.5 font-bdo text-[11px] text-slate-400">Sama persis dengan nomor barang/jasa di Accurate — dipakai export faktur.</p>
          {errors.accurateItemNo && <p className="mt-1.5 font-bdo text-xs font-medium text-rose-500">{errors.accurateItemNo}</p>}
        </div>
        <div>
          <label htmlFor="plan_accurate_item_warga" className={labelBase}>
            Nomor Item Accurate — Warga UB
          </label>
          <input
            id="plan_accurate_item_warga"
            value={data.accurateItemNoWarga}
            onChange={(event) => setData('accurateItemNoWarga', event.target.value)}
            maxLength={30}
            placeholder="Mis. 1006"
            className={inputBase}
          />
          <p className="mt-1.5 font-bdo text-[11px] text-slate-400">Dipakai export faktur bila pembeli membayar harga Warga UB.</p>
          {errors.accurateItemNoWarga && <p className="mt-1.5 font-bdo text-xs font-medium text-rose-500">{errors.accurateItemNoWarga}</p>}
        </div>
        <div>
          <label htmlFor="plan_duration" className={labelBase}>
            Durasi
          </label>
          <select
            id="plan_duration"
            value={data.durationMonths}
            onChange={(event) => setData('durationMonths', Number(event.target.value))}
            className={inputBase}
          >
            <option value={1}>1 Bulan</option>
            <option value={3}>3 Bulan</option>
            <option value={6}>6 Bulan</option>
            <option value={12}>12 Bulan / 1 Tahun</option>
          </select>
          {errors.durationMonths && <p className="mt-1.5 font-bdo text-xs font-medium text-rose-500">{errors.durationMonths}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="plan_sort" className={labelBase}>
          Urutan tampil
        </label>
        <input
          id="plan_sort"
          type="number"
          value={data.sortOrder}
          onChange={(event) => setData('sortOrder', event.target.value)}
          className={inputBase}
        />
        <p className="mt-1.5 font-bdo text-[11px] font-medium text-slate-400">Angka kecil tampil lebih awal di halaman publik.</p>
        {errors.sortOrder && <p className="mt-1.5 font-bdo text-xs font-medium text-rose-500">{errors.sortOrder}</p>}
      </div>

      <section className="rounded-[24px] border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#F8B5A8]/70 bg-[#FFF7F5] text-[#E35336]">
              <Sparkles size={16} />
            </span>
            <div className="min-w-0">
              <p className="font-clash text-base leading-tight font-semibold text-slate-950">Fitur paket</p>
              <p className="mt-1 font-bdo text-xs leading-relaxed font-medium text-slate-500">
                Tambahkan benefit utama yang akan dilihat calon member.
              </p>
            </div>
          </div>
          <span className="inline-flex h-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-3 font-bdo text-[11px] font-bold text-slate-500">
            {data.features.length} item
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={featureInput}
            onChange={(event) => setFeatureInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                addFeature()
              }
            }}
            placeholder="Contoh: Akses gym setiap hari"
            className={inputBase}
            aria-label="Tambah fitur paket"
          />
          <button
            type="button"
            onClick={addFeature}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#F8B5A8]/70 bg-[#FFF7F5] px-4 font-bdo text-xs font-bold text-[#B93D2A] transition hover:bg-white"
          >
            <Plus size={14} />
            Tambah
          </button>
        </div>

        {data.features.length > 0 ? (
          <div className="plan-scrollbar mt-3 flex max-h-36 flex-wrap gap-2 overflow-y-auto pr-1">
            {data.features.map((feature, index) => (
              <span
                key={`${feature}-${index}`}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1 pr-1.5 pl-3 font-bdo text-xs font-bold text-slate-600"
              >
                <CheckCircle2 size={12} className="text-emerald-500" />
                {feature}
                <button
                  type="button"
                  onClick={() => removeFeature(index)}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition hover:bg-white hover:text-rose-500"
                  aria-label={`Hapus fitur ${feature}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 font-bdo text-xs font-medium text-slate-400">
            Belum ada fitur. Paket tetap bisa disimpan, tetapi benefit akan terlihat lebih jelas jika diisi.
          </p>
        )}
        {errors.features && <p className="mt-1.5 font-bdo text-xs font-medium text-rose-500">{errors.features}</p>}
      </section>

      <section className="flex items-center justify-between gap-4 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <p className="font-clash text-sm font-semibold text-slate-950">Tampilkan paket</p>
          <p className="mt-0.5 font-bdo text-xs font-medium text-slate-400">
            {data.isActive ? 'Paket tersedia untuk dibeli.' : 'Paket disembunyikan sementara.'}
          </p>
        </div>
        <ToggleSwitch enabled={data.isActive} onChange={(value) => setData('isActive', value)} />
      </section>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-2xl bg-slate-100 px-5 py-3 font-clash text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={processing}
          className="inline-flex flex-[1.5] items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#F08C78_0%,#E35336_52%,#B93D2A_100%)] px-5 py-3 font-clash text-sm font-semibold text-white shadow-[0_18px_30px_-22px_rgba(227,83,54,.95)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {processing ? 'Menyimpan...' : isEdit ? 'Simpan perubahan' : 'Buat paket'}
          <ArrowRight size={15} />
        </button>
      </div>
    </form>
  )
}

function PlanCard({
  plan,
  index,
  onEdit,
  onDelete
}: {
  plan: AdminMembershipPlanDto
  index: number
  onEdit: (plan: AdminMembershipPlanDto) => void
  onDelete: (plan: AdminMembershipPlanDto) => void
}) {
  const saving = plan.durationMonths > 1 ? Math.max(0, monthlyEstimate(plan) * plan.durationMonths - plan.price) : 0
  const topFeatures = plan.features.slice(0, 4)

  return (
    <article
      className={cn(
        'plan-enter group relative flex min-h-[360px] flex-col overflow-hidden rounded-[30px] border bg-white transition duration-300',
        'border-slate-200 shadow-[0_22px_54px_-48px_rgba(15,23,42,.55)] hover:-translate-y-1 hover:border-[#F8B5A8] hover:shadow-[0_28px_64px_-46px_rgba(227,83,54,.38)]',
        !plan.isActive && 'opacity-75'
      )}
      style={{ animationDelay: `${Math.min(index * 70, 420)}ms` }}
    >
      <div className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,#F8B5A8_0%,#E35336_52%,#B93D2A_100%)]" />
      <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-[#E35336]/10 blur-3xl transition" />
      <div className="pointer-events-none absolute bottom-12 -left-16 h-32 w-32 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="relative z-10 flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <IconTile className="h-12 w-12">
              {plan.durationMonths >= 12 ? <Crown size={18} /> : plan.durationMonths >= 6 ? <Gem size={18} /> : <BadgeCheck size={18} />}
            </IconTile>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate font-clash text-xl leading-tight font-bold text-slate-950">{plan.name}</h2>
                <span
                  className={cn(
                    'rounded-full border px-2.5 py-1 font-bdo text-[10px] font-bold tracking-[0.14em] uppercase',
                    plan.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-400'
                  )}
                >
                  {plan.isActive ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 font-bdo text-sm leading-relaxed font-medium text-slate-500">
                {plan.description || 'Belum ada deskripsi singkat untuk paket ini.'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-[26px] border border-[#F8B5A8]/70 bg-[#FFF7F5] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-bdo text-[10px] font-bold tracking-[0.16em] text-[#B93D2A]/70 uppercase">Harga paket</p>
              <p className="mt-1 font-clash text-3xl leading-none font-bold text-slate-950">{formatIDR(plan.price)}</p>
              {plan.wargaPrice !== null && (
                <p className="mt-1.5 font-bdo text-xs font-semibold text-[#B93D2A]">Warga UB {formatIDR(plan.wargaPrice)}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-bdo text-xs font-bold text-[#B93D2A] ring-1 ring-[#F8B5A8]/70">
                <Timer size={13} />
                {durationLabel(plan.durationMonths)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-bdo text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                <ReceiptText size={13} />
                {formatIDR(monthlyEstimate(plan))}/bln
              </span>
            </div>
          </div>
          {saving > 0 && (
            <p className="mt-3 rounded-2xl bg-white/70 px-3 py-2 font-bdo text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
              Paket panjang memberi nilai lebih dibanding pembayaran bulanan.
            </p>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
            <p className="font-bdo text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">Anggota aktif</p>
            <p className="mt-1 font-clash text-xl font-bold text-slate-950">{plan.activeMembersCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
            <p className="font-bdo text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">Urutan</p>
            <p className="mt-1 font-clash text-xl font-bold text-slate-950">#{plan.sortOrder}</p>
          </div>
        </div>

        <div className="mt-5 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="font-bdo text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase">Benefit</p>
            <span className="font-bdo text-[11px] font-bold text-slate-400">{plan.features.length} fitur</span>
          </div>
          {topFeatures.length > 0 ? (
            <ul className="mt-3 grid gap-2">
              {topFeatures.map((feature, featureIndex) => (
                <li
                  key={`${feature}-${featureIndex}`}
                  className="flex items-start gap-2 font-bdo text-sm leading-relaxed font-semibold text-slate-700"
                >
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[#E35336]" />
                  <span className="line-clamp-2">{feature}</span>
                </li>
              ))}
              {plan.features.length > topFeatures.length && (
                <li className="font-bdo text-xs font-bold text-[#B93D2A]">+{plan.features.length - topFeatures.length} fitur lainnya</li>
              )}
            </ul>
          ) : (
            <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 font-bdo text-sm font-medium text-slate-400">Benefit belum diisi.</p>
          )}
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-[1fr_1fr_auto] gap-2 border-t border-slate-100 bg-slate-50/70 p-3">
        <button
          type="button"
          onClick={() => onEdit(plan)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white font-bdo text-xs font-bold text-slate-600 ring-1 ring-slate-200 transition hover:text-[#B93D2A] hover:ring-[#F8B5A8]"
        >
          <Pencil size={14} />
          Edit
        </button>
        <button
          type="button"
          onClick={() => onEdit(plan)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#F8B5A8]/70 bg-[#FFF7F5] font-bdo text-xs font-bold text-[#B93D2A] transition hover:bg-white"
        >
          <Sparkles size={14} />
          Detail
        </button>
        <button
          type="button"
          onClick={() => onDelete(plan)}
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-rose-500 ring-1 ring-rose-100 transition hover:bg-rose-50 hover:text-rose-600"
          aria-label={`Hapus paket ${plan.name}`}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </article>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <section className="plan-enter relative overflow-hidden rounded-[32px] border border-[#F8B5A8]/70 bg-white p-8 text-center sm:p-12">
      <div className="pointer-events-none absolute -top-16 -right-16 h-52 w-52 rounded-full bg-[#E35336]/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 -left-16 h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="relative z-10 mx-auto flex max-w-md flex-col items-center">
        <IconTile className="h-16 w-16 rounded-[24px]">
          <Layers3 size={24} />
        </IconTile>
        <h2 className="mt-5 font-clash text-2xl font-bold text-slate-950">Belum ada paket membership</h2>
        <p className="mt-2 font-bdo text-sm leading-relaxed font-medium text-slate-500">
          Buat paket pertama agar pengguna bisa memilih membership dengan informasi harga, durasi, dan benefit yang jelas.
        </p>
        <button
          type="button"
          onClick={onCreate}
          className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#F08C78_0%,#E35336_52%,#B93D2A_100%)] px-5 font-clash text-sm font-semibold text-white shadow-[0_18px_30px_-22px_rgba(227,83,54,.95)] transition hover:-translate-y-0.5"
        >
          <Plus size={17} />
          Tambah Paket Pertama
        </button>
      </div>
    </section>
  )
}

export default function MembershipPlansIndex() {
  const { data, isLoading } = useMembershipPlans()
  const plans = useMemo(() => data?.plans ?? [], [data])
  const deletePlanMutation = useDeletePlan()
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [slideOver, setSlideOver] = useState<{ open: boolean; item: AdminMembershipPlanDto | null }>({
    open: false,
    item: null
  })

  const summary = useMemo(() => {
    const active = plans.filter((plan) => plan.isActive)
    const members = plans.reduce((total, plan) => total + plan.activeMembersCount, 0)
    const cheapest = plans.length > 0 ? Math.min(...plans.map((plan) => plan.price)) : 0

    return {
      total: plans.length,
      active: active.length,
      members,
      cheapest
    }
  }, [plans])

  const openCreate = () => setSlideOver({ open: true, item: null })
  const openEdit = (item: AdminMembershipPlanDto) => setSlideOver({ open: true, item })
  const closeSlideOver = () => setSlideOver({ open: false, item: null })

  const deletePlan = async (plan: AdminMembershipPlanDto) => {
    if (!window.confirm(`Hapus paket "${plan.name}"?`)) return

    try {
      await deletePlanMutation.mutateAsync(plan.id)
      setFeedback({ type: 'success', message: 'Paket berhasil dihapus.' })
    } catch (error) {
      // 422: "Paket tidak dapat dihapus karena masih memiliki N anggota aktif." (field `plan`).
      setFeedback({ type: 'error', message: fieldErrorMap(error).plan ?? extractApiError(error).message })
    }
  }

  return (
    <>
      <div className="px-4 pt-2 xl:px-8">
        <div className="plan-enter flex flex-col gap-1 pt-4">
          <span className="font-bdo text-[11px] font-medium tracking-wide text-[#E35336]">Manajemen Keanggotaan</span>
          <h1 className="font-clash text-3xl font-bold tracking-tight uppercase xl:text-4xl">
            <span className="plan-title-shine">Paket Membership</span>
          </h1>
        </div>
      </div>

      <main className="ubsc-page-membership-plans max-w-full flex-1 px-4 pt-2 pb-10 xl:px-8">
        <div className="flex flex-col gap-4 overflow-x-hidden pt-4 pb-20">
          {feedback?.type === 'success' && (
            <section className="plan-enter flex items-center gap-3 rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-600 ring-1 ring-emerald-100">
                <CheckCircle2 size={17} />
              </span>
              <p className="font-bdo text-sm font-semibold text-emerald-700">{feedback.message}</p>
            </section>
          )}

          {feedback?.type === 'error' && (
            <section className="plan-enter flex items-center gap-3 rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-rose-600 ring-1 ring-rose-100">
                <X size={17} />
              </span>
              <p className="font-bdo text-sm font-semibold text-rose-700">{feedback.message}</p>
            </section>
          )}

          <section className="plan-enter relative overflow-hidden rounded-[32px] border border-[#F8B5A8]/70 bg-white">
            <div className="plan-orbit pointer-events-none absolute -top-20 -right-16 h-64 w-64 rounded-full bg-[#E35336]/10 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 -left-20 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />
            <div className="relative z-10 flex flex-col gap-5 p-5 sm:p-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#F8B5A8] bg-[#FFF7F5] px-3 py-1.5 font-bdo text-[10px] font-bold tracking-[0.18em] text-[#B93D2A] uppercase">
                  <span className="plan-live-dot" />
                  Paket publik
                </div>
                <h2 className="mt-4 font-clash text-2xl leading-tight font-semibold text-slate-950 sm:text-3xl sm:leading-9">
                  Susun paket gym yang jelas, rapi, dan mudah dibandingkan pengguna.
                </h2>
                <p className="mt-2 font-bdo text-sm leading-relaxed font-medium text-slate-500">
                  Atur harga, durasi, status tampil, urutan, dan benefit paket dari satu tempat yang ringkas.
                </p>
              </div>

              <button
                type="button"
                onClick={openCreate}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#F08C78_0%,#E35336_52%,#B93D2A_100%)] px-5 font-clash text-sm font-semibold text-white shadow-[0_18px_30px_-22px_rgba(227,83,54,.95)] transition hover:-translate-y-0.5"
              >
                <Plus size={17} />
                Tambah Paket
              </button>
            </div>
          </section>

          <section className="plan-enter grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricChip icon={<Layers3 size={15} />} label="Total Paket" value={summary.total} />
            <MetricChip icon={<Activity size={15} />} label="Paket Aktif" value={summary.active} tone="emerald" />
            <MetricChip icon={<Users size={15} />} label="Member Aktif" value={summary.members} tone="slate" />
            <MetricChip icon={<ReceiptText size={15} />} label="Harga Mulai" value={summary.cheapest > 0 ? formatIDR(summary.cheapest) : '-'} />
          </section>

          {plans.length === 0 ? (
            // Laravel selalu punya data saat render; EmptyState ditahan selama query pertama agar tak berkedip.
            isLoading ? null : (
              <EmptyState onCreate={openCreate} />
            )
          ) : (
            <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {plans.map((plan, index) => (
                <PlanCard key={plan.id} plan={plan} index={index} onEdit={openEdit} onDelete={deletePlan} />
              ))}
            </section>
          )}
        </div>

        <SlideOver
          isOpen={slideOver.open}
          onClose={closeSlideOver}
          title={<span className="font-clash text-xl font-bold">{slideOver.item ? 'Edit Paket' : 'Tambah Paket'}</span>}
          description={
            slideOver.item ? (
              <span className="font-bdo text-sm font-semibold text-[#B93D2A]">{slideOver.item.name}</span>
            ) : (
              <span className="font-bdo text-sm text-slate-500">Buat paket baru yang siap tampil di website.</span>
            )
          }
        >
          {slideOver.open && <PlanForm key={slideOver.item?.id ?? 'new'} item={slideOver.item} onClose={closeSlideOver} onFeedback={setFeedback} />}
        </SlideOver>
      </main>
    </>
  )
}
