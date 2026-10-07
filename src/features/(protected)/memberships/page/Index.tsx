'use client'

import '../memberships.css'

import { type ColumnDef, createColumnHelper } from '@tanstack/react-table'
import {
  ArrowRight,
  BadgeCheck,
  CalendarRange,
  Camera,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock3,
  Eye,
  History,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  Star,
  Wallet,
  XCircle
} from 'lucide-react'
import { type Dispatch, type FormEvent, type ReactNode, type SetStateAction, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import { DataTable } from '@/components/admin/DataTable'
import { SlideOver } from '@/components/admin/SlideOver'
import { canAccessPathByRole } from '@/config/permissions'
import { routes } from '@/config/routes'
import { useAuth } from '@/context/AuthContext'
import {
  useCancelMembership,
  useCaptureMemberPhoto,
  useCreateCustomerAccount,
  useCreateMembership,
  useCustomerSearch,
  useMarkMembershipPaid,
  useMembershipsIndex,
  useRenewMembership,
  useUpdateMembershipStatus
} from '@/hooks/api/useMemberships'
import { extractApiError, fieldErrorMap } from '@/lib/apiError'
import { openInvoice } from '@/services/Payments'
import { cn } from '@/lib/utils'
import type {
  AdminMembershipDto,
  CustomerHitDto,
  MembershipPlanOptionDto,
  MembershipStatus,
  MembershipTransactionDto,
  PaymentStatus,
  UserCategory
} from '@/types/contracts/contracts'

// ===== Admin Memberships (Fase 8C) — port 1:1 dari Laravel Pages/Admin/Memberships/Index.tsx =====
// Data: useMembershipsIndex() (pengganti props Inertia). Mutasi: hooks @/hooks/api/useMemberships.
// Sumber tidak merender banner flash → umpan balik lewat toast (sonner); SlideOver ditutup saat sukses.

const inputBase =
  'h-10 w-full rounded-[15px] border border-slate-200 bg-white px-4 font-bdo text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#F8B5A8] focus:ring-4 focus:ring-[#E35336]/10'

const labelBase = 'mb-1.5 block font-bdo text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500'

const MEMBERSHIP_STATUS_LABEL: Record<MembershipStatus, string> = {
  active: 'Aktif',
  expired: 'Expired',
  cancelled: 'Dibatalkan',
  pending_payment: 'Menunggu Pembayaran'
}

const MEMBERSHIP_STATUS_STYLE: Record<MembershipStatus, string> = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  expired: 'border-[#F8B5A8] bg-[#FFF7F5] text-[#B93D2A]',
  cancelled: 'border-slate-200 bg-slate-50 text-slate-500',
  pending_payment: 'border-amber-200 bg-amber-50 text-amber-700'
}

const PAYMENT_STATUS_LABEL: Partial<Record<PaymentStatus, string>> = {
  PAID: 'Lunas',
  UNPAID: 'Belum dibayar',
  EXPIRED: 'Expired',
  FAILED: 'Gagal'
}

const PAYMENT_STATUS_STYLE: Partial<Record<PaymentStatus, string>> = {
  PAID: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  UNPAID: 'border-amber-200 bg-amber-50 text-amber-700',
  EXPIRED: 'border-amber-200 bg-amber-50 text-amber-700',
  FAILED: 'border-rose-200 bg-rose-50 text-rose-600'
}

const MEMBERSHIP_CATEGORY_LEGEND = [
  {
    value: 'warga_ub',
    label: 'Warga UB',
    dot: 'bg-sky-500',
    style: 'border-sky-200 bg-sky-50 text-sky-700'
  },
  {
    value: 'umum',
    label: 'Umum',
    dot: 'bg-emerald-500',
    style: 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }
] as const

function todayStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function formatPrice(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`
}

/** Harga + biaya admin + kode unik; harga saja bila keduanya kosong (membership lama / gratis). */
function amountBreakdown(t: MembershipTransactionDto): string {
  if (t.total === t.amount) return formatPrice(t.amount)
  return `${formatPrice(t.total)} (${formatPrice(t.amount)} + admin ${formatPrice(t.adminFee)} + kode ${t.uniqueCode ?? 0})`
}

/**
 * Membership meja depan menunggu pembayaran sampai FO menekan Tandai Lunas (catatan client 2026-09-28);
 * nominal 0 langsung aktif. Detailnya langsung dibuka supaya invoice dan totalnya terlihat di layar FO.
 */
function createdToast(message: string, membership: AdminMembershipDto): string {
  const total = membership.transaction?.total ?? 0
  return membership.status === 'pending_payment' ? `${message} Menunggu pembayaran ${formatPrice(total)}.` : message
}

function TransferNote() {
  return (
    <p className="mt-2 font-bdo text-[11px] font-medium text-slate-400">
      Pelanggan mentransfer nominal ini + biaya admin + kode unik — nominal pastinya ada di invoice setelah disimpan. Membership aktif setelah Tandai
      Lunas.
    </p>
  )
}

function InvoiceButton({ transactionId, label, className }: { transactionId: string; label: string; className?: string }) {
  const [opening, setOpening] = useState(false)
  const open = async () => {
    setOpening(true)
    try {
      await openInvoice(transactionId)
    } catch (error) {
      toast.error(extractApiError(error).message)
    } finally {
      setOpening(false)
    }
  }
  return (
    <button
      type="button"
      onClick={open}
      disabled={opening}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[16px] border border-slate-200 bg-white px-4 py-2.5 font-clash text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60',
        className
      )}
    >
      <Printer size={16} />
      {opening ? 'Membuka...' : label}
    </button>
  )
}

/** Tagihan membership meja depan: total yang ditransfer, invoice, dan Tandai Lunas setelah mutasi cocok. */
function PendingPaymentPanel({ membership, onPaid }: { membership: AdminMembershipDto; onPaid: (updated: AdminMembershipDto) => void }) {
  const markPaid = useMarkMembershipPaid()
  const t = membership.transaction
  if (!t) return null

  const handleMarkPaid = async () => {
    if (!window.confirm(`Pastikan transfer ${formatPrice(t.total)} sudah masuk mutasi rekening. Tandai lunas dan aktifkan membership?`)) return
    try {
      const updated = await markPaid.mutateAsync(membership.id)
      toast.success('Pembayaran dicatat. Membership aktif dan kartu member dikirim ke email pelanggan.')
      onPaid(updated)
    } catch (error) {
      toast.error(extractApiError(error).message)
    }
  }

  return (
    <section className="rounded-[20px] border border-amber-200 bg-amber-50 p-4">
      <p className="font-bdo text-[10px] font-bold tracking-[0.16em] text-amber-700 uppercase">Menunggu pembayaran · {t.receiptNumber}</p>
      <p className="mt-2 font-clash text-2xl font-bold text-slate-950">{formatPrice(t.total)}</p>
      <p className="mt-1 font-bdo text-xs font-semibold text-slate-600">
        {formatPrice(t.amount)} + admin {formatPrice(t.adminFee)} + kode unik {t.uniqueCode ?? 0}. Pelanggan mentransfer TEPAT nominal ini — 3 digit
        terakhirnya yang mencocokkan mutasi.
      </p>
      <p className="mt-2 font-bdo text-xs font-medium text-slate-500">
        {membership.userId
          ? 'Invoice juga dikirim ke email pelanggan dan ada di menu Membership Gym / Riwayat Pembayaran-nya. Bukti yang diunggah pelanggan masuk ke Verifikasi Pembayaran.'
          : 'Pelanggan tanpa akun: tunjukkan atau cetak invoice ini.'}
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <InvoiceButton transactionId={t.id} label="Tampilkan / cetak invoice" />
        <button
          type="button"
          onClick={handleMarkPaid}
          disabled={markPaid.isPending}
          className="inline-flex items-center justify-center gap-2 rounded-[16px] bg-emerald-600 px-4 py-2.5 font-clash text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
        >
          <BadgeCheck size={16} />
          {markPaid.isPending ? 'Menyimpan...' : 'Tandai Lunas'}
        </button>
      </div>
    </section>
  )
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)

  return new Date(year, (month ?? 1) - 1, day ?? 1).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function formatDateDisplay(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)

  return new Date(year, (month ?? 1) - 1, day ?? 1).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

function shiftDate(dateStr: string, delta: number): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, (month ?? 1) - 1, day ?? 1)
  date.setDate(date.getDate() + delta)

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function isMembershipActiveOnDate(membership: AdminMembershipDto, dateStr: string): boolean {
  return membership.status === 'active' && membership.startDate <= dateStr && membership.endDate >= dateStr
}

function daysBetween(dateA: string, dateB: string): number {
  const [yearA, monthA, dayA] = dateA.split('-').map(Number)
  const [yearB, monthB, dayB] = dateB.split('-').map(Number)
  const a = new Date(yearA, (monthA ?? 1) - 1, dayA ?? 1)
  const b = new Date(yearB, (monthB ?? 1) - 1, dayB ?? 1)

  return Math.ceil((b.getTime() - a.getTime()) / 86_400_000)
}

function addMonthsToDateStr(dateStr: string, months: number): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, (month ?? 1) - 1, day ?? 1)
  date.setMonth(date.getMonth() + months)

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function daysUntil(dateStr: string): number {
  const today = new Date(todayStr())
  const target = new Date(dateStr)

  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000)
}

function StatusBadge({ status }: { status: MembershipStatus }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-bdo text-[11px] font-bold', MEMBERSHIP_STATUS_STYLE[status])}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {MEMBERSHIP_STATUS_LABEL[status]}
    </span>
  )
}

function PaymentBadge({ tx }: { tx: MembershipTransactionDto | null }) {
  if (!tx) {
    return (
      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-bdo text-[11px] font-bold text-slate-400">
        Tanpa transaksi
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-bdo text-[11px] font-bold',
        PAYMENT_STATUS_STYLE[tx.paymentStatus] ?? 'border-slate-200 bg-slate-50 text-slate-500'
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {PAYMENT_STATUS_LABEL[tx.paymentStatus] ?? 'Tercatat'}
    </span>
  )
}

// Tidak dirender oleh halaman di sumber Laravel juga (komponen yatim) — dipertahankan 1:1.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function MembershipCommandHero({
  memberships,
  filteredCount,
  plans,
  onCreate
}: {
  memberships: AdminMembershipDto[]
  filteredCount: number
  plans: MembershipPlanOptionDto[]
  onCreate: () => void
}) {
  const active = memberships.filter((membership) => membership.status === 'active').length
  const expired = memberships.filter((membership) => membership.status === 'expired').length
  const cancelled = memberships.filter((membership) => membership.status === 'cancelled').length
  const expiringSoon = memberships.filter((membership) => membership.status === 'active' && daysUntil(membership.endDate) <= 14).length
  const paidAmount = memberships.reduce(
    (sum, membership) => sum + (membership.transaction?.paymentStatus === 'PAID' ? membership.transaction.total : 0),
    0
  )
  const activeShare = memberships.length > 0 ? Math.round((active / memberships.length) * 100) : 0
  const planCount = plans.length

  return (
    <section className="membership-enter membership-card-glint membership-sheen relative overflow-hidden rounded-[26px] border border-[#FFE0D8] bg-[linear-gradient(135deg,#E35336_0%,#C6422E_48%,#8F2E20_100%)] p-4 text-white shadow-2xl shadow-[#F8B5A8]/35 sm:p-5">
      <div className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full border" />
      <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-[#FFD5CD]/20 blur-3xl" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,.06)_0,rgba(255,255,255,.06)_1px,transparent_1px,transparent_18px)]" />

      <div className="relative z-10 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,.52fr)]">
        <div className="flex min-w-0 flex-col justify-between gap-5">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-bdo text-[10px] font-bold tracking-wide text-white uppercase backdrop-blur-sm">
              <span className="membership-live-dot h-1.5 w-1.5 bg-white text-white" />
              Membership control
            </span>
            <h2 className="mt-4 max-w-4xl font-clash text-[2rem] leading-[.95] font-bold tracking-tight sm:text-[2.55rem] xl:text-[3rem]">
              Kelola masa aktif member dengan alur cepat dan presisi.
            </h2>
            <p className="mt-3 max-w-2xl font-bdo text-sm leading-6 font-semibold">
              Pantau anggota aktif, cek masa berlaku, buka detail pembayaran, dan perpanjang membership tanpa meninggalkan tabel.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-4">
            <HeroMetric label="Aktif" value={active} note={`${activeShare}% live`} />
            <HeroMetric label="Segera habis" value={expiringSoon} note="<= 14 hari" />
            <HeroMetric label="Paket" value={planCount} note="tersedia" />
            <HeroMetric label="Revenue paid" value={formatPrice(paidAmount)} note={`${filteredCount} tampil`} compact />
          </div>
        </div>

        <div className="rounded-[24px] border bg-white p-3 text-slate-950 shadow-[0_24px_50px_-36px_rgba(15,23,42,.55)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-bdo text-[10px] font-bold tracking-[0.16em] text-[#B93D2A] uppercase">Status overview</p>
              <h3 className="mt-1 font-clash text-xl leading-tight font-semibold">Member Lifecycle</h3>
            </div>
            <button
              type="button"
              onClick={onCreate}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[15px] bg-[#E35336] px-3 font-clash text-xs font-semibold text-white shadow-[0_14px_24px_-18px_rgba(227,83,54,.95)] transition hover:-translate-y-0.5 hover:bg-[#B93D2A]"
            >
              <Plus size={14} />
              Tambah
            </button>
          </div>

          <div className="mt-4 space-y-2.5">
            <LifecycleRow label="Aktif" value={active} total={memberships.length} color="#10B981" />
            <LifecycleRow label="Expired" value={expired} total={memberships.length} color="#E35336" />
            <LifecycleRow label="Batal" value={cancelled} total={memberships.length} color="#64748B" />
          </div>
        </div>
      </div>
    </section>
  )
}

function HeroMetric({ label, value, note, compact = false }: { label: string; value: string | number; note: string; compact?: boolean }) {
  return (
    <div className="rounded-[18px] border p-3 backdrop-blur-sm">
      <p className="font-bdo text-[9px] font-bold tracking-widest text-[#FFD5CD] uppercase">{label}</p>
      <p className={cn('mt-1 truncate font-clash font-bold text-white', compact ? 'text-lg' : 'text-2xl')}>{value}</p>
      <p className="mt-0.5 font-bdo text-[10px] font-semibold">{note}</p>
    </div>
  )
}

function LifecycleRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const width = total > 0 ? Math.max(4, Math.round((value / total) * 100)) : 0

  return (
    <div className="rounded-[16px] border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-bdo text-[11px] font-bold text-slate-600">{label}</p>
        <p className="font-clash text-sm font-bold text-slate-950">{value}</p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-100">
        <div className="h-full rounded-full" style={{ width: `${width}%`, background: `linear-gradient(90deg, ${color}, #F08C78)` }} />
      </div>
    </div>
  )
}

function MembershipBookingStyleControls({
  memberships,
  filteredCount,
  dateStr,
  setDateStr,
  onCreate
}: {
  memberships: AdminMembershipDto[]
  filteredCount: number
  dateStr: string
  setDateStr: Dispatch<SetStateAction<string>>
  onCreate: () => void
}) {
  const datePickerRef = useRef<HTMLInputElement>(null)
  const activeOnDate = memberships.filter((membership) => isMembershipActiveOnDate(membership, dateStr)).length
  const expiringSoon = memberships.filter((membership) => {
    if (!isMembershipActiveOnDate(membership, dateStr)) return false
    const days = daysBetween(dateStr, membership.endDate)
    return days >= 0 && days <= 14
  }).length
  const expired = memberships.filter((membership) => membership.status === 'expired').length
  return (
    <div className="flex flex-col gap-4">
      <section className="membership-enter membership-card-glint overflow-hidden rounded-[26px] border border-[#FFE0D8] bg-[linear-gradient(135deg,#ffffff_0%,#FFF8F6_62%,#FFF1EE_100%)] p-3 shadow-[0_20px_46px_-38px_rgba(185,61,42,.34)] sm:p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,#F08C78_0%,#E35336_54%,#B93D2A_100%)] text-white shadow-[0_16px_26px_-20px_rgba(227,83,54,.95)]">
                <BadgeCheck size={18} />
              </div>
              <div className="min-w-0">
                <p className="font-bdo text-[10px] font-bold tracking-[0.16em] text-[#B93D2A] uppercase">Ringkasan Membership</p>
                <h2 className="font-clash text-base leading-tight font-semibold text-slate-950 sm:text-lg sm:leading-7">
                  Status anggota pada tanggal terpilih
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onCreate}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[16px] bg-[linear-gradient(135deg,#F08C78_0%,#E35336_54%,#B93D2A_100%)] px-5 font-clash text-sm font-semibold text-white shadow-[0_18px_30px_-24px_rgba(227,83,54,.95)] transition hover:-translate-y-0.5 sm:min-w-[190px]"
            >
              <Plus size={17} />
              Tambah Membership
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <MembershipMetric icon={<CheckCircle2 size={16} />} value={activeOnDate} label="Aktif" note="berlaku di tanggal ini" tone="emerald" />
            <MembershipMetric icon={<Clock3 size={16} />} value={expiringSoon} label="Segera habis" note="maksimal 14 hari lagi" tone="amber" />
            <MembershipMetric icon={<XCircle size={16} />} value={expired} label="Expired" note="masa aktif berakhir" tone="rose" />
            <MembershipMetric icon={<BadgeCheck size={16} />} value={filteredCount} label="Ditampilkan" note="anggota sesuai tanggal" tone="sky" />
          </div>
        </div>
      </section>

      <section className="membership-enter membership-card-glint rounded-[26px] border border-[#FFE0D8] bg-white p-3 shadow-[0_20px_46px_-40px_rgba(185,61,42,.32)] sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-col gap-2">
            <p className="px-1 font-bdo text-[10px] font-bold tracking-[0.16em] text-[#B93D2A] uppercase">Tanggal acuan</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex w-full items-center gap-1.5 rounded-[18px] border border-[#F8B5A8] bg-[linear-gradient(135deg,#F08C78_0%,#E35336_54%,#B93D2A_100%)] p-1.5 shadow-[0_16px_28px_-22px_rgba(227,83,54,.95)] sm:w-auto">
                <button
                  type="button"
                  onClick={() => setDateStr((date) => shiftDate(date, -1))}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] text-white shadow-xs ring-1 ring-white/25 transition hover:-translate-y-0.5 hover:ring-white/45"
                  aria-label="Hari sebelumnya"
                >
                  <ChevronLeft size={17} />
                </button>
                <button
                  type="button"
                  className="group flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-[14px] bg-white px-3 text-center shadow-xs ring-1 ring-white/60 transition hover:-translate-y-0.5 hover:bg-[#FFF7F5] sm:min-w-[230px] sm:px-4"
                  onClick={() => datePickerRef.current?.showPicker?.()}
                >
                  <CalendarRange size={16} className="shrink-0 text-[#E35336] transition-transform group-hover:scale-110" />
                  <span className="truncate font-clash text-sm font-semibold text-[#7A2F23]">{formatDateDisplay(dateStr)}</span>
                </button>
                <input
                  ref={datePickerRef}
                  type="date"
                  value={dateStr}
                  onChange={(event) => {
                    if (event.target.value) setDateStr(event.target.value)
                  }}
                  className="sr-only"
                  aria-label="Pilih tanggal acuan membership"
                />
                <button
                  type="button"
                  onClick={() => setDateStr((date) => shiftDate(date, 1))}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] text-white shadow-xs ring-1 ring-white/25 transition hover:-translate-y-0.5 hover:ring-white/45"
                  aria-label="Hari berikutnya"
                >
                  <ChevronRight size={17} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setDateStr(todayStr())}
                className="w-full rounded-[14px] border border-[#F8B5A8] bg-[linear-gradient(135deg,#F08C78_0%,#E35336_54%,#B93D2A_100%)] px-4 py-2.5 font-bdo text-[13px] font-bold tracking-wide text-white uppercase shadow-[0_16px_28px_-22px_rgba(227,83,54,.95)] transition hover:-translate-y-0.5 hover:brightness-105 sm:w-auto"
              >
                Hari ini
              </button>
            </div>
          </div>

          <div className="ml-auto flex w-full flex-col gap-2 rounded-[18px] border border-slate-200 bg-slate-50 p-2 sm:w-auto">
            <span className="px-1 font-bdo text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase">Tipe</span>
            <div className="grid grid-cols-2 gap-1.5">
              {MEMBERSHIP_CATEGORY_LEGEND.map((item) => (
                <span
                  key={item.value}
                  className={cn(
                    'inline-flex min-h-10 items-center gap-2 rounded-[14px] border px-3 py-2 font-bdo text-[11px] font-bold shadow-xs transition hover:-translate-y-0.5',
                    item.style
                  )}
                >
                  <span className={cn('h-2.5 w-2.5 rounded-full shadow-xs ring-2 ring-white', item.dot)} />
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function MembershipMetric({
  icon,
  value,
  label,
  note,
  tone
}: {
  icon: ReactNode
  value: number
  label: string
  note: string
  tone: 'emerald' | 'amber' | 'rose' | 'sky'
}) {
  const styles = {
    emerald: 'border-emerald-200 bg-[linear-gradient(135deg,#ffffff_0%,#ECFDF5_100%)] text-emerald-700',
    amber: 'border-amber-200 bg-[linear-gradient(135deg,#ffffff_0%,#FFFBEB_100%)] text-amber-700',
    rose: 'border-rose-200 bg-[linear-gradient(135deg,#ffffff_0%,#FFF1F2_100%)] text-rose-600',
    sky: 'border-sky-200 bg-[linear-gradient(135deg,#ffffff_0%,#F0F9FF_100%)] text-sky-700'
  }[tone]

  return (
    <article
      className={cn('flex min-w-0 items-center gap-3 rounded-[18px] border p-3 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md', styles)}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white shadow-xs ring-1">{icon}</span>
      <span className="min-w-0">
        <span className="block font-clash text-2xl leading-none font-bold text-slate-950">{value}</span>
        <span className="mt-1 block truncate font-bdo text-[10px] font-bold tracking-wide text-current uppercase">{label}</span>
        <span className="mt-0.5 hidden truncate font-bdo text-[10px] font-semibold text-slate-400 sm:block">{note}</span>
      </span>
    </article>
  )
}

function IconTile({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-[15px] bg-[linear-gradient(135deg,#F08C78_0%,#E35336_52%,#B93D2A_100%)] text-white shadow-[0_14px_26px_-22px_rgba(227,83,54,.95)]',
        className
      )}
    >
      {children}
      <span className="pointer-events-none absolute top-1.5 right-2 left-2 h-1 rounded-full bg-white/35 blur-[1px]" />
    </div>
  )
}

function CreateMembershipForm({
  plans,
  onClose,
  onCreated
}: {
  plans: MembershipPlanOptionDto[]
  onClose: () => void
  onCreated: (created: AdminMembershipDto) => void
}) {
  const createMembership = useCreateMembership()
  const [data, setData] = useState({
    userId: '' as string,
    customerName: '',
    membershipPlanId: '',
    startDate: todayStr(),
    endDate: '',
    amount: '',
    priceCategory: 'umum' as UserCategory
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [mode, setMode] = useState<'account' | 'walkin'>('account')
  const processing = createMembership.isPending

  const selectedPlan = plans.find((plan) => String(plan.id) === data.membershipPlanId)
  // Sama dengan server (membershipPriceFor): tarif Warga UB hanya untuk akun berkategori warga_ub.
  const wargaRate = mode === 'account' && data.priceCategory === 'warga_ub' && selectedPlan?.wargaPrice != null

  const handlePlanChange = (planId: string) => {
    setData((prev) => ({ ...prev, membershipPlanId: planId }))
    const plan = plans.find((item) => String(item.id) === planId)

    if (plan && data.startDate) {
      setData((prev) => ({ ...prev, endDate: addMonthsToDateStr(data.startDate, plan.durationMonths) }))
    }
  }

  const handleStartDateChange = (dateStr: string) => {
    setData((prev) => ({ ...prev, startDate: dateStr }))

    if (selectedPlan && dateStr) {
      setData((prev) => ({ ...prev, endDate: addMonthsToDateStr(dateStr, selectedPlan.durationMonths) }))
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setErrors({})
    try {
      // Walk-in: userId null + customerName diketik. Akun: userId terpilih (customerName = nama akun, seperti Laravel).
      const created = await createMembership.mutateAsync({
        userId: mode === 'account' && data.userId !== '' ? data.userId : null,
        customerName: data.customerName !== '' ? data.customerName : null,
        membershipPlanId: data.membershipPlanId !== '' ? data.membershipPlanId : null,
        startDate: data.startDate,
        endDate: data.endDate !== '' ? data.endDate : null,
        amount: data.amount !== '' ? Number(data.amount) : null
      })
      toast.success(createdToast('Membership dibuat.', created))
      onCreated(created)
    } catch (error) {
      const parsed = extractApiError(error)
      setErrors(fieldErrorMap(error))
      if (Object.keys(parsed.fields).length === 0) toast.error(parsed.message)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <section className="membership-card-glint rounded-[22px] border border-[#F8B5A8]/70 bg-[#FFF7F5] p-3.5">
        <div className="flex items-center gap-3">
          <IconTile className="h-9 w-9">
            <BadgeCheck size={16} />
          </IconTile>
          <div>
            <p className="font-clash text-sm font-semibold text-slate-950">Membership baru</p>
            <p className="font-bdo text-xs font-medium text-slate-500">Pilih paket, tanggal mulai, lalu sistem bantu isi tanggal selesai.</p>
          </div>
        </div>
      </section>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className={labelBase}>Member</span>
          <div className="inline-flex rounded-xl bg-slate-100 p-0.5">
            {(
              [
                ['account', 'Akun customer'],
                ['walkin', 'Tanpa akun']
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setMode(key)
                  setData((prev) => ({ ...prev, userId: '', customerName: '' }))
                }}
                className={cn(
                  'rounded-[10px] px-3 py-1.5 font-bdo text-xs font-semibold transition',
                  mode === key ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {mode === 'account' ? (
          <CustomerPicker
            value={data.userId}
            onPick={(customer) =>
              setData((prev) => ({
                ...prev,
                userId: customer ? String(customer.id) : '',
                customerName: customer?.name ?? '',
                priceCategory: customer?.priceCategory ?? 'umum'
              }))
            }
          />
        ) : (
          <input
            id="customer_name"
            type="text"
            value={data.customerName}
            onChange={(event) => setData((prev) => ({ ...prev, customerName: event.target.value }))}
            placeholder="Nama lengkap member (tanpa akun)"
            className={inputBase}
          />
        )}
        <p className="mt-1.5 font-bdo text-[11px] text-slate-400">
          {mode === 'account'
            ? 'Membership tampil otomatis di dashboard customer tersebut.'
            : 'Hanya tercatat di daftar ini — tanpa nomor member, foto, dan kartu. Buat akun cepat bila pelanggan punya email.'}
        </p>
        {(errors.userId || errors.customerName) && (
          <p className="mt-1.5 font-bdo text-xs font-medium text-rose-500">{errors.userId ?? errors.customerName}</p>
        )}
        {/* Tambahan atas permintaan user (tidak ada di Laravel): error lifecycle `membership` (periode bentrok)
            dulu tidak dirender sehingga form diam saja. */}
        {errors.membership && <p className="mt-1.5 font-bdo text-xs font-medium text-rose-500">{errors.membership}</p>}
      </div>

      <div>
        <label htmlFor="membership_plan_id" className={labelBase}>
          Paket membership
        </label>
        <select
          id="membership_plan_id"
          value={data.membershipPlanId}
          onChange={(event) => handlePlanChange(event.target.value)}
          className={inputBase}
        >
          <option value="">Tanpa paket, isi manual</option>
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name} - {formatPrice(plan.price)}
              {plan.wargaPrice !== null ? ` · Warga UB ${formatPrice(plan.wargaPrice)}` : ''}
            </option>
          ))}
        </select>
        {errors.membershipPlanId && <p className="mt-1.5 font-bdo text-xs font-medium text-rose-500">{errors.membershipPlanId}</p>}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="start_date" className={labelBase}>
            Tanggal mulai
          </label>
          <input
            id="start_date"
            type="date"
            value={data.startDate}
            onChange={(event) => handleStartDateChange(event.target.value)}
            className={inputBase}
          />
          {errors.startDate && <p className="mt-1.5 font-bdo text-xs font-medium text-rose-500">{errors.startDate}</p>}
        </div>
        <div>
          <label htmlFor="end_date" className={labelBase}>
            Tanggal selesai
          </label>
          <input
            id="end_date"
            type="date"
            value={data.endDate}
            min={data.startDate || todayStr()}
            onChange={(event) => setData((prev) => ({ ...prev, endDate: event.target.value }))}
            readOnly={!!selectedPlan}
            className={cn(inputBase, selectedPlan && 'cursor-not-allowed bg-slate-50 text-slate-500')}
          />
          {selectedPlan && (
            <p className="mt-1.5 font-bdo text-[11px] font-semibold text-[#B93D2A]">
              Otomatis {selectedPlan.durationMonths} bulan dari tanggal mulai.
            </p>
          )}
          {errors.endDate && <p className="mt-1.5 font-bdo text-xs font-medium text-rose-500">{errors.endDate}</p>}
        </div>
      </div>

      {selectedPlan ? (
        <section className="rounded-[20px] border border-[#F8B5A8]/70 bg-white p-3.5 shadow-xs">
          <p className="font-bdo text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase">Nominal paket</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div>
              <p className="font-clash text-lg font-bold text-slate-950">
                {formatPrice(wargaRate && selectedPlan.wargaPrice != null ? selectedPlan.wargaPrice : selectedPlan.price)}
              </p>
              <p className="font-bdo text-xs font-medium text-slate-500">
                {selectedPlan.name}
                {wargaRate ? ' · tarif Warga UB' : ''}
              </p>
            </div>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-bdo text-[11px] font-bold text-emerald-700">
              Otomatis
            </span>
          </div>
        </section>
      ) : (
        <div>
          <label htmlFor="amount" className={labelBase}>
            Nominal manual
          </label>
          <input
            id="amount"
            type="number"
            value={data.amount}
            min="0"
            step="1000"
            placeholder="0"
            onChange={(event) => setData((prev) => ({ ...prev, amount: event.target.value }))}
            className={inputBase}
          />
          {errors.amount && <p className="mt-1.5 font-bdo text-xs font-medium text-rose-500">{errors.amount}</p>}
        </div>
      )}
      <TransferNote />

      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-[15px] bg-slate-100 px-5 py-2.5 font-clash text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={processing}
          className="inline-flex flex-[1.5] items-center justify-center gap-2 rounded-[15px] bg-[linear-gradient(135deg,#F08C78_0%,#E35336_52%,#B93D2A_100%)] px-5 py-2.5 font-clash text-sm font-semibold text-white shadow-[0_18px_30px_-22px_rgba(227,83,54,.95)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {processing ? 'Menyimpan...' : 'Buat membership'}
          <ArrowRight size={15} />
        </button>
      </div>
    </form>
  )
}

function RenewMembershipForm({
  membership,
  plans,
  onClose,
  onRenewed
}: {
  membership: AdminMembershipDto
  plans: MembershipPlanOptionDto[]
  onClose: () => void
  onRenewed: (renewed: AdminMembershipDto) => void
}) {
  const renewMembership = useRenewMembership()
  const fallbackPlanId = membership.membershipPlanId ?? plans[0]?.id ?? ''
  const [data, setData] = useState({
    membershipPlanId: String(fallbackPlanId),
    amount: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const processing = renewMembership.isPending

  const selectedPlan = plans.find((plan) => String(plan.id) === data.membershipPlanId)
  const nextStartDate = (() => {
    const [year, month, day] = membership.endDate.split('-').map(Number)
    const date = new Date(year, (month ?? 1) - 1, (day ?? 1) + 1)

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  })()
  const nextEndDate = selectedPlan ? addMonthsToDateStr(nextStartDate, selectedPlan.durationMonths) : null

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setErrors({})
    try {
      const renewed = await renewMembership.mutateAsync({
        id: membership.id,
        payload: {
          membershipPlanId: data.membershipPlanId !== '' ? data.membershipPlanId : null,
          amount: data.amount !== '' ? Number(data.amount) : null
        }
      })
      toast.success(createdToast('Membership diperpanjang tanpa menghapus sisa masa aktif.', renewed))
      onRenewed(renewed)
    } catch (error) {
      const parsed = extractApiError(error)
      setErrors(fieldErrorMap(error))
      if (Object.keys(parsed.fields).length === 0) toast.error(parsed.message)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <section className="membership-card-glint rounded-[22px] border border-[#F8B5A8]/70 bg-[#FFF7F5] p-3.5">
        <div className="flex items-center gap-3">
          <IconTile className="h-9 w-9">
            <RefreshCw size={16} />
          </IconTile>
          <div>
            <p className="font-clash text-sm font-semibold text-slate-950">Perpanjang membership</p>
            <p className="font-bdo text-xs font-medium text-slate-500">
              Masa aktif baru dimulai setelah periode lama selesai, jadi sisa hari member tidak hilang.
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DetailLine icon={<CalendarRange size={15} />} label="Mulai baru" value={formatDate(nextStartDate)} />
        <DetailLine icon={<Clock3 size={15} />} label="Sampai" value={nextEndDate ? formatDate(nextEndDate) : 'Pilih paket'} />
      </div>

      <div>
        <label htmlFor="renew_membership_plan_id" className={labelBase}>
          Paket perpanjangan
        </label>
        <select
          id="renew_membership_plan_id"
          value={data.membershipPlanId}
          onChange={(event) => setData((prev) => ({ ...prev, membershipPlanId: event.target.value }))}
          className={inputBase}
          required
        >
          {plans.length === 0 && <option value="">Belum ada paket</option>}
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name} - {formatPrice(plan.price)}
              {plan.wargaPrice !== null ? ` · Warga UB ${formatPrice(plan.wargaPrice)}` : ''}
            </option>
          ))}
        </select>
        {errors.membershipPlanId && <p className="mt-1.5 font-bdo text-xs font-medium text-rose-500">{errors.membershipPlanId}</p>}
        {errors.amount && <p className="mt-1.5 font-bdo text-xs font-medium text-rose-500">{errors.amount}</p>}
        {/* Tambahan (tidak ada di Laravel): error lifecycle `membership`, mis. membership batal tak bisa diperpanjang. */}
        {errors.membership && <p className="mt-1.5 font-bdo text-xs font-medium text-rose-500">{errors.membership}</p>}
      </div>

      {selectedPlan && (
        <section className="rounded-[20px] border border-[#F8B5A8]/70 bg-white p-3.5 shadow-xs">
          <p className="font-bdo text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase">Nominal paket</p>
          <p className="mt-2 font-clash text-lg font-bold text-slate-950">{formatPrice(selectedPlan.price)}</p>
          <p className="font-bdo text-xs font-medium text-slate-500">{selectedPlan.durationMonths} bulan masa aktif</p>
          <TransferNote />
        </section>
      )}

      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-[15px] bg-slate-100 px-5 py-2.5 font-clash text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={processing || plans.length === 0}
          className="inline-flex flex-[1.5] items-center justify-center gap-2 rounded-[15px] bg-[linear-gradient(135deg,#F08C78_0%,#E35336_52%,#B93D2A_100%)] px-5 py-2.5 font-clash text-sm font-semibold text-white shadow-[0_18px_30px_-22px_rgba(227,83,54,.95)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {processing ? 'Menyimpan...' : 'Perpanjang'}
          <ArrowRight size={15} />
        </button>
      </div>
    </form>
  )
}

function DetailLine({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[16px] px-3 py-2.5 ring-1 ring-[#F8B5A8]/45">
      <span className="mt-0.5 text-[#E35336]">{icon}</span>
      <span className="min-w-0">
        <span className="block font-bdo text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">{label}</span>
        <span className="mt-0.5 block font-bdo text-[13px] font-semibold text-slate-800">{value}</span>
      </span>
    </div>
  )
}

function actionLabel(action: string): string {
  const labels: Record<string, string> = {
    created: 'Dibuat',
    renewed: 'Diperpanjang',
    status_changed: 'Status diubah',
    cancelled: 'Dibatalkan',
    payment_confirmed: 'Pembayaran lunas',
    activated: 'Aktif — transfer disetujui',
    payment_expired: 'Transfer kedaluwarsa',
    payment_rejected: 'Transfer ditolak'
  }

  return labels[action] ?? action
}

function MembershipDetail({
  membership,
  plans,
  onClose,
  onShow
}: {
  membership: AdminMembershipDto
  plans: MembershipPlanOptionDto[]
  onClose: () => void
  /** Ganti isi panel ke membership lain (hasil perpanjangan) atau versi terbarunya (setelah Tandai Lunas). */
  onShow: (membership: AdminMembershipDto) => void
}) {
  const remainingDays = daysUntil(membership.endDate)
  const [showRenew, setShowRenew] = useState(false)
  const updateStatus = useUpdateMembershipStatus()
  const cancelMembership = useCancelMembership()

  const handleUpdateStatus = async (status: MembershipStatus) => {
    try {
      await updateStatus.mutateAsync({ id: membership.id, status })
      toast.success('Status membership berhasil diperbarui.')
      onClose()
    } catch (error) {
      toast.error(extractApiError(error).message)
    }
  }

  const handleCancel = async () => {
    if (!window.confirm(`Batalkan membership #${membership.id}?`)) return
    try {
      await cancelMembership.mutateAsync(membership.id)
      toast.success('Membership berhasil dibatalkan.')
      onClose()
    } catch (error) {
      toast.error(extractApiError(error).message)
    }
  }

  if (showRenew) {
    return (
      <RenewMembershipForm
        membership={membership}
        plans={plans}
        onClose={() => {
          setShowRenew(false)
          onClose()
        }}
        onRenewed={(renewed) => {
          setShowRenew(false)
          onShow(renewed)
        }}
      />
    )
  }

  return (
    <div className="membership-scrollbar flex max-h-[calc(100vh-150px)] flex-col gap-4 overflow-y-auto pr-1">
      <section className="membership-card-glint overflow-hidden rounded-[24px] border border-[#F8B5A8]/70 bg-[linear-gradient(135deg,#FFF7F5_0%,#ffffff_100%)] shadow-xs">
        <div className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-bdo text-[10px] font-bold tracking-[0.18em] text-[#B93D2A] uppercase">
                Membership #{String(membership.id).padStart(5, '0')}
              </p>
              <h2 className="mt-2 truncate font-clash text-xl leading-tight font-semibold text-slate-950">{membership.customerName}</h2>
              <p className="mt-1 font-bdo text-xs font-semibold text-slate-500">
                {membership.customerNumber ? `${membership.customerNumber} · ` : ''}
                {membership.customerPhone ?? 'Tanpa nomor telepon'}
              </p>
            </div>
            <StatusBadge status={membership.status} />
          </div>

          <div className="mt-4 grid gap-2">
            <DetailLine icon={<Star size={15} />} label="Paket" value={membership.planName ?? 'Manual'} />
            <DetailLine
              icon={<CalendarRange size={15} />}
              label="Periode"
              value={`${formatDate(membership.startDate)} - ${formatDate(membership.endDate)}`}
            />
            <DetailLine
              icon={<Clock3 size={15} />}
              label="Sisa waktu"
              value={
                membership.status === 'active'
                  ? remainingDays > 0
                    ? `${remainingDays} hari lagi`
                    : 'Berakhir hari ini'
                  : MEMBERSHIP_STATUS_LABEL[membership.status]
              }
            />
          </div>
        </div>
      </section>

      {membership.renewedFromLabel && (
        <section className="rounded-[20px] border border-slate-200 bg-white p-3.5 shadow-xs">
          <p className="font-bdo text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase">Perpanjangan dari</p>
          <p className="mt-2 font-bdo text-sm font-semibold text-slate-700">{membership.renewedFromLabel}</p>
        </section>
      )}

      {membership.status === 'pending_payment' && <PendingPaymentPanel membership={membership} onPaid={onShow} />}

      {membership.userId && <MemberPhotoPanel membership={membership} />}

      <section className="rounded-[20px] border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <p className="font-bdo text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase">Pembayaran</p>
          <PaymentBadge tx={membership.transaction} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-full bg-slate-50 px-3 py-1 font-clash text-sm font-semibold text-slate-900 ring-1 ring-slate-200">
            {membership.transaction ? formatPrice(membership.transaction.total) : 'Belum ada nominal'}
          </span>
          {membership.transaction?.paidAt && (
            <span className="font-bdo text-xs font-medium text-slate-500">Dibayar pada {membership.transaction.paidAt}</span>
          )}
        </div>
      </section>

      <section className="rounded-[20px] border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="flex items-center gap-2">
          <ReceiptText size={15} className="text-[#E35336]" />
          <p className="font-bdo text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase">Invoice / receipt</p>
        </div>
        <div className="mt-3 grid gap-2">
          {/* xendit_invoice_id tidak ada di MembershipTransactionDto → receiptNumber ?? 'TRX-' + id */}
          <DetailLine
            icon={<ReceiptText size={15} />}
            label="Invoice ID"
            value={membership.transaction?.receiptNumber ?? (membership.transaction ? `TRX-${membership.transaction.id}` : '-')}
          />
          <DetailLine icon={<Wallet size={15} />} label="Nominal" value={membership.transaction ? amountBreakdown(membership.transaction) : '-'} />
          <DetailLine icon={<Star size={15} />} label="Paket dibeli" value={membership.planName ?? 'Manual'} />
          {membership.transaction && (
            <InvoiceButton
              transactionId={membership.transaction.id}
              label={membership.transaction.paymentStatus === 'PAID' ? 'Cetak kuitansi' : 'Cetak invoice'}
            />
          )}
        </div>
      </section>

      <section className="rounded-[20px] border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="flex items-center gap-2">
          <History size={15} className="text-[#E35336]" />
          <p className="font-bdo text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase">Riwayat membership</p>
        </div>
        <div className="mt-3 grid gap-2">
          {(membership.histories ?? []).length === 0 ? (
            <p className="rounded-[16px] bg-slate-50 px-3 py-3 font-bdo text-xs font-semibold text-slate-400">
              Riwayat baru akan tercatat mulai dari perubahan berikutnya.
            </p>
          ) : (
            (membership.histories ?? []).map((history) => (
              <div key={history.id} className="rounded-[16px] border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-clash text-sm font-semibold text-slate-900">{actionLabel(history.action)}</p>
                    <p className="mt-0.5 font-bdo text-[11px] font-semibold text-slate-500">
                      {history.planName} - {formatDate(history.startDate)} sampai {formatDate(history.endDate)}
                    </p>
                    {history.renewedFromLabel && (
                      <p className="mt-1 font-bdo text-[11px] font-semibold text-[#B93D2A]">Dari {history.renewedFromLabel}</p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-2.5 py-1 font-bdo text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">
                    {history.receiptNumber ?? '-'}
                  </span>
                </div>
                <p className="mt-2 font-bdo text-[11px] font-medium text-slate-400">
                  Oleh {history.actorName ?? history.actorType} - {history.createdAt ?? '-'}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="grid gap-2">
        {membership.status !== 'cancelled' && membership.status !== 'pending_payment' && (
          <button
            type="button"
            onClick={() => setShowRenew(true)}
            className="inline-flex items-center justify-center gap-2 rounded-[16px] bg-[linear-gradient(135deg,#F08C78_0%,#E35336_52%,#B93D2A_100%)] px-4 py-2.5 font-clash text-sm font-semibold text-white transition hover:-translate-y-0.5"
          >
            <RefreshCw size={16} />
            Perpanjang membership
          </button>
        )}
        {membership.status === 'active' && (
          <button
            type="button"
            onClick={() => handleUpdateStatus('expired')}
            className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-[#F8B5A8]/80 bg-[#FFF7F5] px-4 py-2.5 font-clash text-sm font-semibold text-[#B93D2A] transition hover:bg-white"
          >
            <XCircle size={16} />
            Tandai expired
          </button>
        )}
        {membership.status !== 'cancelled' && (
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-2.5 font-clash text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
          >
            <XCircle size={16} />
            Batalkan membership
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="rounded-[16px] bg-slate-100 px-4 py-2.5 font-clash text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
        >
          Tutup
        </button>
      </section>
    </div>
  )
}

const listHelper = createColumnHelper<AdminMembershipDto>()

function ListView({ memberships, onSelect }: { memberships: AdminMembershipDto[]; onSelect: (membership: AdminMembershipDto) => void }) {
  const columns = [
    listHelper.accessor('id', {
      header: 'ID',
      cell: (info) => (
        <span className="rounded-full bg-slate-100 px-3 py-1 font-bdo text-xs font-bold text-slate-500">
          #{String(info.getValue()).padStart(5, '0')}
        </span>
      )
    }),
    listHelper.accessor('customerName', {
      header: 'Member',
      enableSorting: true,
      cell: ({ row }) => {
        const membership = row.original

        return (
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-[#FFF7F5] font-clash text-sm font-bold text-[#B93D2A] ring-1 ring-[#F8B5A8]/70">
              {membership.customerName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate font-clash text-sm font-semibold text-slate-900">{membership.customerName}</p>
              <p className="mt-0.5 truncate font-bdo text-[11px] font-medium text-slate-400">{membership.customerPhone ?? 'Tanpa nomor'}</p>
            </div>
          </div>
        )
      }
    }),
    listHelper.display({
      id: 'period',
      header: 'Periode',
      cell: ({ row }) => {
        const membership = row.original

        return (
          <div>
            <p className="font-bdo text-xs font-bold text-slate-700">{formatDate(membership.startDate)}</p>
            <p className="mt-0.5 font-bdo text-[11px] font-medium text-slate-400">s/d {formatDate(membership.endDate)}</p>
          </div>
        )
      }
    }),
    listHelper.accessor('planName', {
      header: 'Paket',
      cell: (info) => {
        const value = info.getValue()

        return value ? (
          <span className="inline-flex max-w-[180px] items-center gap-1.5 rounded-full border border-[#F8B5A8]/70 bg-[#FFF7F5] px-3 py-1 font-bdo text-[11px] font-bold text-[#B93D2A]">
            <Star size={12} />
            <span className="truncate">{value}</span>
          </span>
        ) : (
          <span className="font-bdo text-xs font-semibold text-slate-400">Manual</span>
        )
      }
    }),
    listHelper.accessor('status', {
      header: 'Status',
      cell: (info) => <StatusBadge status={info.getValue()} />
    }),
    listHelper.display({
      id: 'payment',
      header: 'Bayar',
      cell: ({ row }) => <PaymentBadge tx={row.original.transaction} />
    }),
    listHelper.display({
      id: 'amount',
      header: 'Nominal',
      cell: ({ row }) => (
        <span className="font-clash text-sm font-semibold text-slate-900">
          {row.original.transaction ? formatPrice(row.original.transaction.total) : '-'}
        </span>
      )
    }),
    listHelper.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => onSelect(row.original)}
          className="flex h-9 w-9 items-center justify-center rounded-[14px] border border-slate-200 bg-white text-slate-500 transition hover:border-[#F8B5A8] hover:bg-[#FFF7F5] hover:text-[#B93D2A]"
          aria-label={`Lihat membership ${row.original.id}`}
        >
          <Eye size={16} />
        </button>
      )
    })
  ]

  return (
    <section className="membership-enter membership-card-glint overflow-hidden rounded-[24px] border border-[#FFE0D8] bg-white p-2 shadow-[0_20px_46px_-38px_rgba(185,61,42,.5)]">
      <DataTable
        columns={columns as ColumnDef<AdminMembershipDto, unknown>[]}
        data={memberships}
        searchColumn="customerName"
        searchPlaceholder="Cari nama member..."
        emptyMessage="Belum ada membership."
      />
    </section>
  )
}

export default function MembershipsIndex() {
  const { data } = useMembershipsIndex()
  // Kerangka aman saat loading (tanpa early-return): daftar kosong sampai data tiba.
  const memberships = useMemo(() => data?.memberships ?? [], [data])
  const plans = useMemo(() => data?.plans ?? [], [data])
  const [selected, setSelected] = useState<AdminMembershipDto | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [dateStr, setDateStr] = useState(todayStr())

  const filteredMemberships = useMemo(() => memberships.filter((membership) => isMembershipActiveOnDate(membership, dateStr)), [dateStr, memberships])

  return (
    <>
      <div className="px-4 pt-2 xl:px-8">
        <div className="membership-enter flex flex-col gap-0.5 pt-3">
          <span className="font-bdo text-[10px] font-medium tracking-wide text-[#E35336]">Manajemen Keanggotaan</span>
          <h1 className="font-clash text-2xl font-bold tracking-tight uppercase xl:text-3xl">
            <span className="membership-title-shine">Memberships</span>
          </h1>
        </div>
      </div>

      <main className="ubsc-page-memberships max-w-full flex-1 px-4 pt-2 pb-10 xl:px-8">
        <div className="flex flex-col gap-4 overflow-x-hidden pt-3 pb-16">
          <MembershipBookingStyleControls
            memberships={memberships}
            filteredCount={filteredMemberships.length}
            dateStr={dateStr}
            setDateStr={setDateStr}
            onCreate={() => setShowCreate(true)}
          />

          <ListView memberships={filteredMemberships} onSelect={setSelected} />
        </div>

        <SlideOver
          isOpen={selected !== null}
          onClose={() => setSelected(null)}
          title={<span className="font-clash text-xl font-bold">Detail Membership</span>}
          description={
            selected ? (
              <span className="font-bdo text-sm font-semibold text-[#B93D2A]">
                {selected.customerName} - {formatDate(selected.startDate)} sampai {formatDate(selected.endDate)}
              </span>
            ) : undefined
          }
        >
          {selected && (
            <MembershipDetail key={selected.id} membership={selected} plans={plans} onClose={() => setSelected(null)} onShow={setSelected} />
          )}
        </SlideOver>

        <SlideOver
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
          title={<span className="font-clash text-xl font-bold">Tambah Membership</span>}
          description={<span className="font-bdo text-sm text-slate-500">Daftarkan anggota baru dengan alur cepat.</span>}
        >
          {showCreate && (
            <CreateMembershipForm
              plans={plans}
              onClose={() => setShowCreate(false)}
              onCreated={(created) => {
                setShowCreate(false)
                setSelected(created)
              }}
            />
          )}
        </SlideOver>
      </main>
    </>
  )
}

/**
 * Typeahead over customer accounts. Debounced; staff are excluded
 * server-side so a desk login can never become a member by accident.
 *
 * Laravel: axios GET route('admin.customers.search') setelah debounce 220ms (min 2 karakter).
 * Di sini: q lokal → debounce 220ms → useCustomerSearch(debouncedQ) (hook enabled hanya bila ≥ 2 karakter).
 */
function CustomerPicker({ value, onPick }: { value: string; onPick: (customer: CustomerHitDto | null) => void }) {
  const [query, setQuery] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [hits, setHits] = useState<CustomerHitDto[]>([])
  const [picked, setPicked] = useState<CustomerHitDto | null>(null)
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!value) setPicked(null)
  }, [value])

  useEffect(() => {
    if (picked || query.trim().length < 2) {
      setHits([])
      setDebouncedQ('')
      return
    }
    const handle = window.setTimeout(() => setDebouncedQ(query.trim()), 220)
    return () => window.clearTimeout(handle)
  }, [query, picked])

  const search = useCustomerSearch(debouncedQ)

  // Setara `.then((r) => { setHits(r.data); setOpen(true) }).catch(() => setHits([]))` di Laravel.
  useEffect(() => {
    if (debouncedQ.length < 2) return
    if (search.isError) {
      setHits([])
      return
    }
    if (search.data) {
      setHits(search.data)
      setOpen(true)
    }
  }, [debouncedQ, search.data, search.isError])

  if (picked) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-[14px] border border-emerald-200 bg-emerald-50 px-3.5 py-2.5">
        <div className="min-w-0">
          <p className="truncate font-clash text-sm font-semibold text-slate-950">{picked.name}</p>
          <p className="truncate font-bdo text-xs text-slate-500">
            {picked.customerNumber} · {picked.email}
            {picked.phone ? ` · ${picked.phone}` : ''}
            {picked.identityStatus === 'verified' ? ' · Warga UB' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setPicked(null)
            setQuery('')
            onPick(null)
          }}
          className="shrink-0 font-bdo text-xs font-semibold text-slate-500 hover:text-rose-600"
        >
          Ganti
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => hits.length && setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        placeholder="Cari nama, email, nomor HP, atau nomor member"
        className={inputBase}
        autoComplete="off"
      />
      {open && hits.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-[14px] border border-slate-200 bg-white py-1 shadow-xl">
          {hits.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setPicked(h)
                  setOpen(false)
                  onPick(h)
                }}
                className="flex w-full flex-col items-start px-3.5 py-2 text-left hover:bg-slate-50"
              >
                <span className="font-clash text-sm font-semibold text-slate-950">{h.name}</span>
                <span className="font-bdo text-xs text-slate-500">
                  {h.customerNumber} · {h.email}
                  {h.phone ? ` · ${h.phone}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && hits.length === 0 && query.trim().length >= 2 && !creating && (
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <p className="font-bdo text-xs text-slate-400">Tidak ada akun customer yang cocok.</p>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setCreating(true)}
            className="shrink-0 font-bdo text-xs font-semibold text-[#B93D2A] hover:underline"
          >
            Buat akun baru
          </button>
        </div>
      )}
      {creating && (
        <QuickAccountForm
          initialQuery={query}
          onCancel={() => setCreating(false)}
          onCreated={(customer) => {
            setCreating(false)
            setPicked(customer)
            onPick(customer)
          }}
        />
      )}
    </div>
  )
}

/**
 * Akun minimal walk-in: nama + email (+ HP). Tanpa password — pelanggan mengambil alih lewat "Lupa
 * password". Bukan <form>: ia berada di dalam form membership, dan form bersarang tidak sah.
 */
function QuickAccountForm({
  initialQuery,
  onCancel,
  onCreated
}: {
  initialQuery: string
  onCancel: () => void
  onCreated: (customer: CustomerHitDto) => void
}) {
  const q = initialQuery.trim()
  const looksLikePhone = /^[\d+\s-]+$/.test(q)
  const [data, setData] = useState({
    name: q.includes('@') || looksLikePhone ? '' : q,
    email: q.includes('@') ? q : '',
    phoneNumber: looksLikePhone ? q : ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const create = useCreateCustomerAccount()

  const submit = async () => {
    setErrors({})
    try {
      const customer = await create.mutateAsync({
        name: data.name,
        email: data.email,
        phoneNumber: data.phoneNumber.trim() === '' ? null : data.phoneNumber
      })
      toast.success(`Akun ${customer.name} dibuat (${customer.customerNumber}). Pelanggan bisa mengatur password lewat "Lupa password".`)
      onCreated(customer)
    } catch (error) {
      const parsed = extractApiError(error)
      setErrors(fieldErrorMap(error))
      if (Object.keys(parsed.fields).length === 0) toast.error(parsed.message)
    }
  }

  // Enter di sini tidak boleh mengirim form membership di luarnya.
  const onEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    void submit()
  }

  const field = (key: keyof typeof data, placeholder: string, type = 'text') => (
    <div>
      <input
        type={type}
        value={data[key]}
        onChange={(event) => setData((prev) => ({ ...prev, [key]: event.target.value }))}
        onKeyDown={onEnter}
        placeholder={placeholder}
        className={inputBase}
      />
      {errors[key] && <p className="mt-1 font-bdo text-xs font-medium text-rose-500">{errors[key]}</p>}
    </div>
  )

  return (
    <div className="mt-2 space-y-2 rounded-[14px] border border-slate-200 bg-slate-50 p-3">
      <p className="font-bdo text-xs font-semibold text-slate-600">Akun baru untuk walk-in</p>
      {field('name', 'Nama lengkap')}
      {field('email', 'Email', 'email')}
      {field('phoneNumber', 'Nomor HP (opsional)', 'tel')}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="rounded-xl px-3 py-1.5 font-bdo text-xs font-semibold text-slate-500 hover:bg-slate-100">
          Batal
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={create.isPending}
          className="rounded-xl bg-slate-900 px-3 py-1.5 font-bdo text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {create.isPending ? 'Membuat...' : 'Buat akun'}
        </button>
      </div>
    </div>
  )
}

/**
 * Foto wajah member (tahap C). Staff bisa memotret di meja — di tablet/HP input ini membuka kamera —
 * dan fotonya langsung disetujui. Status lokal karena objek membership di SlideOver tidak ikut refetch.
 */
function MemberPhotoPanel({ membership }: { membership: AdminMembershipDto }) {
  const [photo, setPhoto] = useState({ url: membership.memberPhotoUrl, status: membership.memberPhotoStatus })
  const capture = useCaptureMemberPhoto()
  const { user } = useAuth()
  const canReview = canAccessPathByRole(routes.identity(), user?.role, user?.permissions)
  const statusLabel = { pending: 'Menunggu tinjauan', approved: 'Disetujui', rejected: 'Ditolak' } as const

  const upload = async (file: File | undefined) => {
    if (!file || !membership.userId) return
    try {
      const saved = await capture.mutateAsync({ userId: membership.userId, file })
      setPhoto({ url: saved.memberPhotoUrl, status: saved.memberPhotoStatus })
      toast.success('Foto member disimpan dan langsung disetujui.')
    } catch (error) {
      toast.error(extractApiError(error).message)
    }
  }

  return (
    <section className="rounded-[20px] border border-slate-200 bg-white p-3.5 shadow-xs">
      <p className="font-bdo text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase">Foto member</p>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
          {photo.url ? (
            // eslint-disable-next-line @next/next/no-img-element -- foto unggahan dari /uploads, bukan aset statis
            <img src={photo.url} alt={`Foto ${membership.customerName}`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Camera size={20} className="text-slate-300" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bdo text-xs font-semibold text-slate-600">{photo.status ? statusLabel[photo.status] : 'Belum ada foto'}</p>
          {photo.status === 'pending' && canReview && (
            <Link
              href={routes.identityMemberPhotos()}
              className="mt-1 inline-flex items-center gap-1 font-bdo text-xs font-semibold text-[#B93D2A] hover:underline"
            >
              Tinjau di Verifikasi ID & Foto
              <ArrowRight size={12} />
            </Link>
          )}
          <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-bdo text-xs font-semibold text-slate-600 transition hover:border-[#F8B5A8] hover:text-[#B93D2A]">
            <Camera size={14} />
            {capture.isPending ? 'Menyimpan...' : photo.url ? 'Ambil ulang foto' : 'Ambil foto'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="user"
              className="hidden"
              disabled={capture.isPending}
              onChange={(event) => {
                void upload(event.target.files?.[0])
                event.target.value = ''
              }}
            />
          </label>
        </div>
      </div>
    </section>
  )
}
