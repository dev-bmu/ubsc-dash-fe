'use client'

import '../bookings.css'

import { type ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Eye, LayoutGrid, List, Plus } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { DataTable } from '@/components/admin/DataTable'
import { SlideOver } from '@/components/admin/SlideOver'
import { createAccessChecker, PERMISSIONS } from '@/config/permissions'
import { routes } from '@/config/routes'
import { useAuth } from '@/context/AuthContext'
import { useBookingsIndex, useCancelBooking, useCreateBooking, useUpdateBookingStatus } from '@/hooks/api/useBookings'
import { useApprovePayment } from '@/hooks/api/usePayments'
import { extractApiError, fieldErrorMap } from '@/lib/apiError'
import { cn } from '@/lib/utils'
import { openPaymentProof } from '@/services/Payments'
import type { AdminBookingDto, BookingStatus, BookingTransactionDto, FacilityOptionDto, PaymentStatus } from '@/types/contracts/contracts'

// ── Calendar constants ─────────────────────────────────────────────────────────

const SLOT_HEIGHT = 58 // px per HOUR
const START_HOUR = 6
const END_HOUR = 24
const TOTAL_HOURS = END_HOUR - START_HOUR

// ── Helpers ──────────────────────────────────────────────────────────────────

function padTwo(n: number): string {
  return String(n).padStart(2, '0')
}

function parseTimeHM(timeStr: string): { h: number; m: number } {
  const parts = timeStr.split(':').map(Number)
  return { h: parts[0] ?? 0, m: parts[1] ?? 0 }
}

function getDurationMinutes(startTime: string, endTime: string): number {
  const { h: sh, m: sm } = parseTimeHM(startTime)
  const { h: eh, m: em } = parseTimeHM(endTime)
  return eh * 60 + em - (sh * 60 + sm)
}

function getPillTopFromTime(startTime: string): number {
  const { h, m } = parseTimeHM(startTime)
  return (h - START_HOUR + m / 60) * SLOT_HEIGHT
}

function getPillHeight(durationMinutes: number): number {
  return (durationMinutes / 60) * SLOT_HEIGHT
}

function formatPrice(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (m === 0) return `${h} jam`
  if (h === 0) return `${m} menit`
  return `${h} jam ${m} menit`
}

function formatDateDisplay(dateStr: string): string {
  const [y, mo, d] = dateStr.split('-').map(Number)
  return new Date(y, (mo ?? 1) - 1, d).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

function shiftDate(dateStr: string, delta: number): string {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const result = new Date(y, (mo ?? 1) - 1, (d ?? 1) + delta)
  return `${result.getFullYear()}-${padTwo(result.getMonth() + 1)}-${padTwo(result.getDate())}`
}

function todayStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${padTwo(now.getMonth() + 1)}-${padTwo(now.getDate())}`
}

// ── Status maps (Visual Refined) ──────────────────────────────────────────────

const STATUS_STYLE: Record<BookingStatus, string> = {
  pending: 'bg-[#FFF4F1] text-[#B93D2A] border border-[#F8B5A8]',
  confirmed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  completed: 'bg-blue-50 text-blue-700 border border-blue-200',
  cancelled: 'bg-slate-50 text-slate-500 border border-slate-200'
}

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'Pending',
  confirmed: 'Konfirmasi',
  completed: 'Selesai',
  cancelled: 'Dibatalkan'
}

const STATUS_DOT: Record<BookingStatus, string> = {
  pending: 'bg-[#E35336] shadow-[0_0_8px_rgba(227,83,54,0.55)]',
  confirmed: 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]',
  completed: 'bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.8)]',
  cancelled: 'bg-slate-300'
}

const PAYMENT_STATUS_STYLE: Record<PaymentStatus, string> = {
  UNPAID: 'bg-[#FFF4F1] text-[#B93D2A] border border-[#F8B5A8]',
  PAID: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  EXPIRED: 'bg-rose-50 text-rose-600 border border-rose-200',
  FAILED: 'bg-red-50 text-red-600 border border-red-200'
}

const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  UNPAID: 'Belum Bayar',
  PAID: 'Lunas',
  EXPIRED: 'Expired',
  FAILED: 'Gagal'
}

// Pill color - semantic by booking origin + status
function getPillStyle(b: AdminBookingDto): string {
  let base: string
  if (b.userId !== null) {
    base =
      b.userCategory === 'warga_ub'
        ? 'bg-sky-50 text-sky-800 border-sky-200 border-l-sky-500 hover:bg-sky-100'
        : 'bg-emerald-50 text-emerald-800 border-emerald-200 border-l-emerald-500 hover:bg-emerald-100'
  } else if (b.isFree) {
    base = 'bg-slate-50 text-slate-700 border-slate-200 border-l-slate-400 hover:bg-slate-100'
  } else {
    base = 'bg-[#FFF4F1] text-[#8E2D20] border-[#F8B5A8] border-l-[#E35336] hover:bg-[#FFE9E3]'
  }
  const pending = b.status === 'pending' ? 'border-dashed opacity-85' : ''
  return `${base} ${pending}`.trim()
}

// ── Badges ─────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={cn('inline-flex rounded-md px-2.5 py-1 font-bdo text-[10px] font-bold tracking-widest uppercase', STATUS_STYLE[status])}>
      {STATUS_LABEL[status]}
    </span>
  )
}

function PaymentBadge({ tx }: { tx: BookingTransactionDto | null }) {
  if (!tx) return null
  return (
    <span
      className={cn(
        'inline-flex rounded-md px-2.5 py-1 font-bdo text-[10px] font-bold tracking-widest uppercase',
        PAYMENT_STATUS_STYLE[tx.paymentStatus]
      )}
    >
      {PAYMENT_STATUS_LABEL[tx.paymentStatus]}
    </span>
  )
}

// ── Base Forms Styling ─────────────────────────────────────────────────────────

const inputBase =
  'w-full rounded-[14px] border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-[13px] font-bdo font-semibold text-slate-900 placeholder:text-slate-400 outline-hidden transition-all focus:bg-white focus:border-[#E35336] focus:ring-4 focus:ring-[#E35336]/10'
const labelBase = 'font-bdo text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-1.5 block'

// ── Create Booking Form ────────────────────────────────────────────────────────

function CreateBookingForm({ facilities, onClose }: { facilities: FacilityOptionDto[]; onClose: () => void }) {
  const createBooking = useCreateBooking()
  const [data, setData] = useState({
    customerName: '',
    facilityId: '',
    facilityUnitId: '',
    bookingDate: todayStr(),
    startTime: '08:00',
    endTime: '10:00',
    pax: 1,
    isFree: false,
    notes: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setErrors({})
    try {
      const created = await createBooking.mutateAsync({
        customerName: data.customerName,
        facilityId: data.facilityId,
        facilityUnitId: data.facilityUnitId ? data.facilityUnitId : null,
        bookingDate: data.bookingDate,
        startTime: data.startTime,
        endTime: data.endTime,
        pax: data.pax,
        isFree: data.isFree,
        notes: data.notes
      })
      toast.success(
        created.total > 0
          ? `Booking dibuat. Minta tamu transfer tepat ${formatPrice(created.total)}, lalu Tandai Lunas di detail booking.`
          : 'Booking berhasil dibuat.'
      )
      onClose()
    } catch (error) {
      const parsed = extractApiError(error)
      setErrors(fieldErrorMap(error))
      if (Object.keys(parsed.fields).length === 0) toast.error(parsed.message)
    }
  }

  const processing = createBooking.isPending
  const selectedFacility = facilities.find((facility) => String(facility.id) === String(data.facilityId))
  const facilityUnits = selectedFacility?.units ?? []

  return (
    <form onSubmit={submit} className="animate-fade-in-up flex flex-col gap-4">
      <section className="rounded-[20px] border border-[#F8B5A8]/70 bg-[linear-gradient(135deg,#FFF7F5_0%,#FFFFFF_72%)] p-3.5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#F08C78_0%,#E35336_52%,#B93D2A_100%)] text-white shadow-[0_16px_30px_-22px_rgba(227,83,54,.9)]">
            <Plus size={18} />
          </div>
          <div>
            <p className="font-clash text-base font-semibold text-slate-950">Booking manual</p>
            <p className="mt-1 font-bdo text-sm leading-relaxed font-medium text-slate-500">
              Isi data inti, pilih unit jika tersedia, lalu simpan dengan validasi jadwal yang sama.
            </p>
          </div>
        </div>
      </section>
      <div>
        <label htmlFor="booking_customer_name" className={labelBase}>
          Nama Pelanggan
        </label>
        <input
          id="booking_customer_name"
          type="text"
          value={data.customerName}
          onChange={(e) => setData((prev) => ({ ...prev, customerName: e.target.value }))}
          placeholder="Nama lengkap pelanggan..."
          className={inputBase}
          required
        />
        {errors.customerName && <p className="mt-1.5 font-bdo text-[11px] text-rose-500">{errors.customerName}</p>}
      </div>

      <div>
        <label htmlFor="booking_facility_id" className={labelBase}>
          Fasilitas
        </label>
        <select
          id="booking_facility_id"
          value={data.facilityId}
          onChange={(e) => setData((prev) => ({ ...prev, facilityId: e.target.value, facilityUnitId: '' }))}
          className={inputBase}
        >
          <option value="">Pilih fasilitas...</option>
          {facilities.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        {errors.facilityId && <p className="mt-1.5 font-bdo text-[11px] text-rose-500">{errors.facilityId}</p>}
      </div>

      {facilityUnits.length > 0 && (
        <div>
          <p className={labelBase}>Unit fasilitas</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {facilityUnits.map((unit) => {
              const active = String(data.facilityUnitId) === String(unit.id)
              return (
                <button
                  key={unit.id}
                  type="button"
                  onClick={() => setData((prev) => ({ ...prev, facilityUnitId: String(unit.id) }))}
                  className={cn(
                    'rounded-[14px] border px-3.5 py-2.5 text-left transition-all',
                    active
                      ? 'border-[#E35336] bg-[#FFF7F5] text-[#B93D2A] shadow-[0_14px_28px_-24px_rgba(227,83,54,.9)]'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-[#F8B5A8] hover:bg-[#FFF7F5]/60'
                  )}
                >
                  <span className="block truncate font-clash text-sm font-semibold">{unit.name}</span>
                  <span className="mt-1 block font-bdo text-[11px] font-semibold opacity-65">{active ? 'Unit dipilih' : 'Pilih unit ini'}</span>
                </button>
              )
            })}
          </div>
          {errors.facilityUnitId && <p className="mt-1.5 font-bdo text-[11px] text-rose-500">{errors.facilityUnitId}</p>}
        </div>
      )}

      <div>
        <label htmlFor="booking_date" className={labelBase}>
          Tanggal
        </label>
        <input
          id="booking_date"
          type="date"
          value={data.bookingDate}
          min={todayStr()}
          onChange={(e) => setData((prev) => ({ ...prev, bookingDate: e.target.value }))}
          className={inputBase}
        />
        {errors.bookingDate && <p className="mt-1.5 font-bdo text-[11px] text-rose-500">{errors.bookingDate}</p>}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="booking_start_time" className={labelBase}>
            Jam Mulai
          </label>
          <input
            id="booking_start_time"
            type="time"
            value={data.startTime}
            step="1800"
            onChange={(e) => setData((prev) => ({ ...prev, startTime: e.target.value }))}
            className={inputBase}
          />
          {errors.startTime && <p className="mt-1.5 font-bdo text-[11px] text-rose-500">{errors.startTime}</p>}
        </div>
        <div>
          <label htmlFor="booking_end_time" className={labelBase}>
            Jam Selesai
          </label>
          <input
            id="booking_end_time"
            type="time"
            value={data.endTime}
            step="1800"
            onChange={(e) => setData((prev) => ({ ...prev, endTime: e.target.value }))}
            className={inputBase}
          />
          {errors.endTime && <p className="mt-1.5 font-bdo text-[11px] text-rose-500">{errors.endTime}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="booking_pax" className={labelBase}>
          Jumlah Peserta
        </label>
        <input
          id="booking_pax"
          type="number"
          min={1}
          value={data.pax}
          onChange={(e) => setData((prev) => ({ ...prev, pax: parseInt(e.target.value) || 1 }))}
          className={inputBase}
        />
        {errors.pax && <p className="mt-1.5 font-bdo text-[11px] text-rose-500">{errors.pax}</p>}
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-[14px] border border-slate-200 bg-slate-50 px-3.5 py-3 transition-all hover:border-[#F8B5A8] hover:bg-white">
        <input
          type="checkbox"
          checked={data.isFree}
          onChange={(e) => setData((prev) => ({ ...prev, isFree: e.target.checked }))}
          className="h-5 w-5 rounded border-slate-300 text-[#E35336] focus:ring-[#E35336]/25"
        />
        <div>
          <p className="font-clash text-sm font-semibold text-slate-800">Booking Gratis / Tamu Spesial (Rp 0)</p>
          <p className="mt-0.5 font-bdo text-[11px] text-slate-400">Lewati pembayaran, status langsung Confirmed & PAID</p>
        </div>
      </label>

      <div>
        <label htmlFor="booking_notes" className={labelBase}>
          Catatan (opsional)
        </label>
        <textarea
          id="booking_notes"
          value={data.notes}
          onChange={(e) => setData((prev) => ({ ...prev, notes: e.target.value }))}
          rows={3}
          placeholder="Informasi tambahan..."
          className={cn(inputBase, 'resize-none')}
        />
      </div>

      <div className="flex flex-col-reverse gap-2.5 border-t border-slate-100 pt-3.5 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-[14px] bg-slate-100 px-4 py-2.5 font-clash text-[13px] font-semibold text-slate-600 transition-colors hover:bg-slate-200"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={processing}
          className="flex flex-2 items-center justify-center gap-2 rounded-[14px] bg-[linear-gradient(135deg,#F08C78_0%,#E35336_52%,#B93D2A_100%)] py-2.5 font-clash text-[13px] font-semibold text-white shadow-[0_18px_30px_-24px_rgba(227,83,54,.95)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {processing ? 'Menyimpan...' : 'Buat Booking'}
        </button>
      </div>
    </form>
  )
}

// ── Booking Detail Panel ───────────────────────────────────────────────────────

function BookingDetail({ booking, onClose }: { booking: AdminBookingDto; onClose: () => void }) {
  const { user } = useAuth()
  const access = createAccessChecker(user?.role, user?.permissions)
  const canManageBookings = access.can([PERMISSIONS.BOOKINGS_MANAGE])
  const canManagePayments = access.can([PERMISSIONS.PAYMENTS_MANAGE])

  const updateStatus = useUpdateBookingStatus()
  const cancelMutation = useCancelBooking()
  const approvePayment = useApprovePayment()

  const handleUpdateStatus = async (status: BookingStatus) => {
    try {
      await updateStatus.mutateAsync({ id: booking.id, status })
      toast.success(status === 'confirmed' ? 'Booking dikonfirmasi.' : 'Booking ditandai selesai.')
      onClose()
    } catch (error) {
      toast.error(extractApiError(error).message)
    }
  }

  const handleCancel = async () => {
    if (!confirm(`Batalkan booking #${booking.id}?`)) return
    try {
      await cancelMutation.mutateAsync(booking.id)
      toast.success('Booking dibatalkan.')
      onClose()
    } catch (error) {
      toast.error(extractApiError(error).message)
    }
  }

  const [copied, setCopied] = useState(false)
  const handleCopyInvoice = () => {
    if (!booking.transaction?.checkoutUrl) return
    navigator.clipboard.writeText(booking.transaction.checkoutUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const tx = booking.transaction
  const isPaid = tx?.paymentStatus === 'PAID'
  const awaitingProof = tx?.verificationStatus === 'awaiting'
  const proofRejected = tx?.verificationStatus === 'rejected'
  const cancelled = booking.status === 'cancelled'
  // Walk-in (tanpa akun) tidak bisa mengunggah bukti, jadi staff yang mencatat transfernya di sini.
  // Transfer web tetap lewat antrean verifikasi.
  const walkInUnpaid = booking.userId === null && tx?.paymentStatus === 'UNPAID' && !cancelled

  const handleMarkPaid = async () => {
    if (!tx || !confirm(`Tandai lunas? Pastikan transfer ${formatPrice(tx.total)} sudah masuk ke rekening.`)) return
    try {
      const result = await approvePayment.mutateAsync(tx.id)
      toast.success(`Pembayaran ${result.receiptNumber} dicatat lunas.`)
      onClose()
    } catch (error) {
      toast.error(extractApiError(error).message)
    }
  }
  const arrived = Boolean(booking.checkedInAt)
  // Paid, confirmed, session over, nobody ever scanned in.
  const noShow = isPaid && !arrived && booking.hasEnded && booking.status === 'confirmed'

  const duration = getDurationMinutes(booking.startTime, booking.endTime)

  return (
    <div className="animate-fade-in-up flex flex-col gap-4">
      {/* ID + Booking Status */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <span className="font-bdo text-xs font-bold tracking-widest text-slate-400 uppercase">ID: #{String(booking.id).padStart(5, '0')}</span>
        <StatusBadge status={booking.status} />
      </div>

      {/* Customer Card */}
      <section className="rounded-[18px] border border-slate-100 bg-slate-50/50 p-4 transition-colors hover:border-[#F8B5A8]/60">
        <div className="mb-3 flex items-center gap-3">
          <div className="rounded-lg bg-[#12131c] p-2 shadow-xs">
            <Eye className="h-4 w-4 text-[#E35336]" />
          </div>
          <p className="font-bdo text-[11px] font-bold tracking-wider text-slate-500 uppercase">Customer</p>
        </div>
        <div className="pl-1">
          <p className="font-clash text-lg font-medium text-slate-900">{booking.customerName}</p>
          {booking.customerPhone && <p className="mt-0.5 font-bdo text-sm text-slate-500">{booking.customerPhone}</p>}
          <span
            className={cn(
              'mt-3 inline-flex rounded-md px-2.5 py-1 font-bdo text-[10px] font-bold tracking-widest uppercase',
              booking.userCategory === 'warga_ub'
                ? 'border border-blue-200 bg-blue-50 text-blue-700'
                : 'border border-slate-200 bg-slate-100 text-slate-600'
            )}
          >
            {booking.userCategory === 'warga_ub' ? 'Warga UB' : 'Umum'}
          </span>
        </div>
      </section>

      {/* Booking Details Card */}
      <section className="rounded-[18px] border border-slate-100 bg-slate-50/50 p-4 transition-colors hover:border-[#F8B5A8]/60">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg bg-[#FFF4F1] p-2 shadow-xs">
            <LayoutGrid className="h-4 w-4 text-[#E35336]" />
          </div>
          <p className="font-bdo text-[11px] font-bold tracking-wider text-slate-500 uppercase">Detail Reservasi</p>
        </div>
        <dl className="flex flex-col gap-3 pl-1 font-bdo text-sm">
          <div className="flex items-center justify-between border-b border-slate-200/50 pb-2">
            <dt className="text-slate-500">Fasilitas</dt>
            <dd className="font-semibold text-slate-900">{booking.facilityName}</dd>
          </div>
          <div className="flex items-center justify-between border-b border-slate-200/50 pb-2">
            <dt className="text-slate-500">Tanggal</dt>
            <dd className="font-medium text-slate-900">{formatDateDisplay(booking.bookingDate)}</dd>
          </div>
          <div className="flex items-center justify-between border-b border-slate-200/50 pb-2">
            <dt className="text-slate-500">Waktu</dt>
            <dd className="font-medium text-slate-900">
              {booking.startTime} - {booking.endTime}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-slate-500">Durasi</dt>
            <dd className="font-medium text-slate-900">{formatDuration(duration)}</dd>
          </div>
          {booking.notes && (
            <div className="mt-1 flex items-start justify-between gap-4 border-t border-slate-200/50 pt-2">
              <dt className="shrink-0 text-slate-500">Catatan</dt>
              <dd className="text-right text-slate-700 italic">&quot;{booking.notes}&quot;</dd>
            </div>
          )}
        </dl>
      </section>

      {/* Payment Card */}
      <section className="rounded-[18px] border border-slate-100 bg-slate-50/50 p-4 transition-colors hover:border-[#F8B5A8]/60">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2 shadow-xs">
              <List className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="font-bdo text-[11px] font-bold tracking-wider text-slate-500 uppercase">Pembayaran</p>
          </div>
          <PaymentBadge tx={booking.transaction} />
        </div>
        <dl className="flex flex-col gap-2 pl-1 font-bdo text-sm">
          <div className="flex items-center justify-between border-b border-slate-200/50 pb-2">
            <dt className="text-slate-500">Subtotal</dt>
            <dd className="font-clash text-lg font-semibold text-slate-900">{formatPrice(booking.subtotalPrice)}</dd>
          </div>
          {tx && tx.total !== tx.amount && (
            <div className="flex items-center justify-between gap-3 border-b border-slate-200/50 pb-2">
              <dt className="text-slate-500">Total Transfer</dt>
              <dd className="text-right">
                <p className="font-clash text-lg font-semibold text-slate-900">{formatPrice(tx.total)}</p>
                <p className="font-bdo text-[11px] text-slate-400">
                  {formatPrice(tx.amount)} + admin {formatPrice(tx.adminFee)} + kode {tx.uniqueCode ?? 0}
                </p>
              </dd>
            </div>
          )}
          {tx?.receiptNumber && (
            <div className="flex items-center justify-between pt-1">
              <dt className="text-slate-500">No. Resi</dt>
              <dd className="font-mono text-[13px] text-slate-700">{tx.receiptNumber}</dd>
            </div>
          )}
          {tx?.paidAt && (
            <div className="flex items-center justify-between pt-1">
              <dt className="text-slate-500">Waktu Bayar</dt>
              <dd className="font-medium text-slate-700">{tx.paidAt}</dd>
            </div>
          )}
        </dl>

        {awaitingProof && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
            <p className="font-bdo text-xs font-semibold text-amber-800">
              Bukti transfer sudah diunggah{tx?.proofUploadedAt ? ` ${tx.proofUploadedAt}` : ''} — menunggu verifikasi.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {tx?.proofUrl && (
                <a
                  href={tx.proofUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => {
                    // Bukti butuh Bearer (Laravel: cookie sesi) → buka sebagai blob, bukan link langsung.
                    event.preventDefault()
                    if (tx.proofUrl) openPaymentProof(tx.proofUrl).catch((error) => toast.error(extractApiError(error).message))
                  }}
                  className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 font-bdo text-[11px] font-bold text-amber-800 transition hover:bg-amber-100"
                >
                  Lihat bukti
                </a>
              )}
              {canManagePayments && (
                <Link
                  href={routes.payments()}
                  className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 font-bdo text-[11px] font-bold text-amber-800 transition hover:bg-amber-100"
                >
                  Buka antrian verifikasi
                </Link>
              )}
            </div>
          </div>
        )}

        {walkInUnpaid && (canManageBookings || canManagePayments) && (
          <button
            type="button"
            onClick={handleMarkPaid}
            disabled={approvePayment.isPending}
            className="mt-3 flex w-full items-center justify-center rounded-xl bg-emerald-600 py-2.5 font-clash text-sm font-semibold text-white shadow-[0_14px_28px_-20px_rgba(5,150,105,.9)] transition hover:bg-emerald-500 disabled:opacity-50"
          >
            Tandai Lunas
          </button>
        )}

        {proofRejected && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5">
            <p className="font-bdo text-xs font-semibold text-rose-700">
              Bukti transfer ditolak{tx?.rejectionReason ? `: ${tx.rejectionReason}` : '.'}
            </p>
          </div>
        )}
        {booking.transaction?.checkoutUrl && (
          <button
            type="button"
            onClick={handleCopyInvoice}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 font-bdo text-xs font-bold text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
            </svg>
            {copied ? 'Tersalin!' : 'Salin Link Invoice'}
          </button>
        )}
      </section>

      {/* Actions */}
      <div className="mt-2 flex flex-col gap-3 border-t border-slate-100 pt-4">
        {/* Attendance first: this is what the desk is looking for when a
            customer walks up. It opens the very same screen the QR does,
            so the scanned and the manual path stay identical. */}
        {arrived ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <div>
              <p className="font-clash text-sm font-semibold text-emerald-800">
                {booking.hasEnded ? 'Hadir · sesi selesai' : 'Hadir · sedang dipakai'}
              </p>
              <p className="font-bdo text-[11px] text-emerald-700">
                {booking.checkedInAt}
                {booking.checkedInBy ? ` · oleh ${booking.checkedInBy}` : ''}
              </p>
            </div>
          </div>
        ) : noShow ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="font-clash text-sm font-semibold text-slate-600">Tidak hadir</p>
            <p className="font-bdo text-[11px] text-slate-500">Sudah dibayar tetapi tidak pernah check-in sampai sesi berakhir.</p>
          </div>
        ) : isPaid && !cancelled && booking.checkInUrl ? (
          <a
            href={booking.checkInUrl}
            className="flex items-center justify-center rounded-xl bg-[#12131c] py-3.5 font-clash text-sm font-medium text-white transition-all hover:scale-[0.98] hover:bg-slate-900"
          >
            Check-in Sekarang
          </a>
        ) : null}

        {booking.status === 'pending' && canManageBookings && (
          <button
            type="button"
            onClick={() => handleUpdateStatus('confirmed')}
            className="flex items-center justify-center rounded-xl bg-[#12131c] py-3.5 font-clash text-sm font-medium text-white shadow-[inset_0_-8px_15px_-5px_rgba(249,115,22,0.4)] transition-all hover:scale-[0.98] hover:bg-slate-900"
          >
            Konfirmasi Booking
          </button>
        )}
        {/* Offered once the session is genuinely over, or once the
            customer has arrived — not the instant a booking is confirmed,
            which invited staff to close a session that had not run. */}
        {/* Walk-in yang belum lunas tidak ditawari selesai: menyelesaikannya menggagalkan transaksinya. */}
        {booking.status === 'confirmed' && (arrived || booking.hasEnded) && !walkInUnpaid && canManageBookings && (
          <button
            type="button"
            onClick={() => handleUpdateStatus('completed')}
            className="flex items-center justify-center rounded-xl bg-blue-500 py-3.5 font-clash text-sm font-medium text-white shadow-[inset_0_-8px_15px_-5px_rgba(59,130,246,0.4)] transition-all hover:scale-[0.98] hover:bg-blue-600"
          >
            Tandai Selesai
          </button>
        )}
        {booking.status !== 'cancelled' && booking.status !== 'completed' && canManageBookings && (
          <button
            type="button"
            onClick={handleCancel}
            className="flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 py-3.5 font-clash text-sm font-medium text-rose-600 transition-colors hover:bg-rose-100"
          >
            Batalkan Booking
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl py-3 font-bdo text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100"
        >
          Tutup Panel
        </button>
      </div>
    </div>
  )
}

// ── Grid View (Visual Refined) ─────────────────────────────────────────────────

function GridView({
  bookings,
  facilities,
  onSelect
}: {
  bookings: AdminBookingDto[]
  facilities: FacilityOptionDto[]
  onSelect: (b: AdminBookingDto) => void
}) {
  const [dateStr, setDateStr] = useState(todayStr())
  const datePickerRef = useRef<HTMLInputElement>(null)

  const dayBookings = bookings.filter((b) => b.bookingDate === dateStr && b.status !== 'cancelled')

  return (
    <div className="animate-fade-in-up flex flex-col gap-4 delay-200">
      {/* Date navigation & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-slate-200 bg-white p-3 shadow-[0_16px_38px_-34px_rgba(15,23,42,.35)]">
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <div className="flex items-center gap-1 rounded-[14px] border border-slate-100 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setDateStr((d) => shiftDate(d, -1))}
              className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-white text-slate-600 shadow-xs ring-1 ring-slate-100 transition-all hover:bg-slate-100 hover:text-[#B93D2A] hover:ring-[#F8B5A8]"
              aria-label="Hari sebelumnya"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className="group flex h-9 min-w-[210px] items-center justify-center gap-2 rounded-[10px] bg-white px-3 text-center shadow-xs ring-1 ring-slate-100 transition-all hover:bg-slate-100 hover:ring-[#F8B5A8] max-sm:min-w-0 max-sm:flex-1"
              onClick={() => (datePickerRef.current as (HTMLInputElement & { showPicker?: () => void }) | null)?.showPicker?.()}
            >
              <CalendarDays size={15} className="text-[#E35336] transition-transform group-hover:scale-110" />
              <span className="truncate font-clash text-[13px] font-medium text-slate-900">{formatDateDisplay(dateStr)}</span>
            </button>
            <input
              ref={datePickerRef}
              type="date"
              value={dateStr}
              onChange={(e) => {
                if (e.target.value) setDateStr(e.target.value)
              }}
              className="sr-only"
              aria-label="Pilih tanggal"
            />
            <button
              type="button"
              onClick={() => setDateStr((d) => shiftDate(d, 1))}
              className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-white text-slate-600 shadow-xs ring-1 ring-slate-100 transition-all hover:bg-slate-100 hover:text-[#B93D2A] hover:ring-[#F8B5A8]"
              aria-label="Hari berikutnya"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setDateStr(todayStr())}
            className="rounded-[10px] border border-slate-200 bg-white px-3.5 py-2 font-bdo text-xs font-bold tracking-wide text-slate-600 uppercase transition-colors hover:border-[#F8B5A8] hover:bg-[#FFF7F5] hover:text-[#B93D2A]"
          >
            Hari ini
          </button>
        </div>

        {/* Legend */}
        <div className="ml-auto flex w-full items-center gap-1.5 rounded-[14px] border border-slate-100 bg-slate-50 p-1 sm:w-auto">
          <span className="hidden px-2 font-bdo text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase md:inline">Tipe</span>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {[
              { label: 'Warga UB', color: 'bg-sky-500' },
              { label: 'Umum', color: 'bg-emerald-500' },
              { label: 'Admin (berbayar)', color: 'bg-[#E35336]' },
              { label: 'Admin (gratis)', color: 'bg-slate-400' }
            ].map((item) => (
              <span
                key={item.label}
                className="inline-flex items-center gap-1.5 rounded-[10px] bg-white px-2.5 py-1.5 font-bdo text-[10px] font-bold text-slate-600 shadow-xs ring-1 ring-slate-100 transition hover:bg-slate-100 hover:text-slate-800"
              >
                <span className={cn('h-2 w-2 rounded-full', item.color)} />
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div
        className="custom-scrollbar overflow-auto rounded-[20px] border border-slate-200 bg-white shadow-[0_18px_42px_-38px_rgba(15,23,42,.4)]"
        style={{ maxHeight: 'calc(100vh - 300px)' }}
      >
        <div className="flex" style={{ minWidth: `${56 + facilities.length * 138}px` }}>
          {/* Time column */}
          <div className="w-14 shrink-0 border-r border-slate-200 bg-slate-50">
            <div className="sticky top-0 z-30 h-12 border-b border-slate-200 bg-slate-50 backdrop-blur-md" />
            {Array.from({ length: TOTAL_HOURS }, (_, i) => {
              const h = START_HOUR + i
              return (
                <div
                  key={h}
                  style={{ height: SLOT_HEIGHT }}
                  className="relative flex items-start justify-end border-b border-slate-200 pt-1.5 pr-2.5"
                >
                  <span className="font-bdo text-[10px] font-bold text-slate-400">{padTwo(h)}:00</span>
                  <div className="absolute right-0 bottom-1/2 left-0 border-b border-dashed border-slate-100" />
                </div>
              )
            })}
            <div className="relative flex h-8 items-start justify-end bg-slate-50 pt-1.5 pr-2.5">
              <span className="font-bdo text-[10px] font-bold text-[#B93D2A]">24:00</span>
            </div>
          </div>

          {/* Facility columns */}
          {facilities.map((facility) => {
            const facilityBookings = dayBookings.filter((b) => b.facilityId === facility.id)
            return (
              <div key={facility.id} className="flex flex-1 flex-col" style={{ minWidth: 138 }}>
                <div className="sticky top-0 z-20 flex h-12 items-center justify-center border-b border-slate-200 bg-white/90 px-2 shadow-[0_4px_10px_-10px_rgba(0,0,0,0.1)] backdrop-blur-md">
                  <span className="text-center font-clash text-xs font-medium text-slate-800">{facility.name}</span>
                </div>
                <div className="relative flex-1 border-r border-slate-100 last:border-r-0">
                  {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                    <div key={i} style={{ height: SLOT_HEIGHT }} className="relative border-b border-slate-200">
                      <div className="absolute right-0 bottom-1/2 left-0 border-b border-dashed border-slate-100" />
                    </div>
                  ))}
                  <div className="h-8 bg-white" />
                  {facilityBookings.map((booking) => {
                    const top = getPillTopFromTime(booking.startTime)
                    const duration = getDurationMinutes(booking.startTime, booking.endTime)
                    const height = getPillHeight(duration)

                    return (
                      <button
                        key={booking.id}
                        type="button"
                        onClick={() => onSelect(booking)}
                        style={{
                          position: 'absolute',
                          top: top + 2,
                          height: height - 4,
                          left: 4,
                          right: 4,
                          zIndex: 10
                        }}
                        className={cn(
                          'group flex flex-col items-start overflow-hidden rounded-[10px] border border-l-4 px-2 py-1.5 text-left shadow-[0_12px_26px_-24px_rgba(15,23,42,.45)] transition-all hover:z-20 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_-24px_rgba(15,23,42,.35)]',
                          getPillStyle(booking)
                        )}
                      >
                        <span
                          className={cn('absolute top-1.5 right-1.5 h-2 w-2 rounded-full shadow-xs ring-2 ring-white', STATUS_DOT[booking.status])}
                        />
                        <p className="w-full truncate pr-3 font-clash text-xs leading-tight font-medium">{booking.customerName}</p>
                        {height >= 72 && (
                          <p className="mt-1 truncate font-bdo text-[10px] font-semibold opacity-70">
                            {booking.startTime}-{booking.endTime}
                          </p>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── List View (Visual Refined) ─────────────────────────────────────────────────

const listHelper = createColumnHelper<AdminBookingDto>()

function ListView({ bookings, onSelect }: { bookings: AdminBookingDto[]; onSelect: (b: AdminBookingDto) => void }) {
  const columns = [
    listHelper.accessor('id', {
      header: 'Booking ID',
      cell: (info) => (
        <span className="rounded-md bg-slate-100 px-2 py-1 font-bdo text-xs font-bold text-slate-500">
          #{String(info.getValue()).padStart(5, '0')}
        </span>
      )
    }),
    listHelper.accessor('customerName', {
      header: 'Customer',
      enableSorting: true,
      cell: (info) => {
        const b = info.row.original
        return (
          <div className="flex flex-col">
            <p className="font-clash text-sm font-medium text-slate-900">{b.customerName}</p>
            <p className="font-bdo text-[11px] font-medium text-slate-400">{b.customerPhone ?? '-'}</p>
          </div>
        )
      }
    }),
    listHelper.accessor('facilityName', {
      header: 'Fasilitas',
      enableSorting: true,
      cell: (info) => (
        <span className="inline-flex flex-col rounded-xl border border-[#F8B5A8] bg-[#FFF4F1] px-3 py-2 font-bdo text-[11px] font-bold text-[#B93D2A]">
          {info.getValue()}
          {info.row.original.facilityUnitName && <span className="mt-0.5 text-[10px] text-[#8E2D20]/70">{info.row.original.facilityUnitName}</span>}
        </span>
      )
    }),
    listHelper.display({
      id: 'datetime',
      header: 'Tanggal & Waktu',
      cell: ({ row }) => {
        const b = row.original
        const duration = getDurationMinutes(b.startTime, b.endTime)
        return (
          <div className="flex flex-col">
            <p className="font-bdo text-[13px] font-bold text-slate-700">{b.bookingDate}</p>
            <p className="font-bdo text-[11px] font-medium text-slate-500">
              {b.startTime}-{b.endTime} · {formatDuration(duration)}
            </p>
          </div>
        )
      }
    }),
    listHelper.accessor('subtotalPrice', {
      header: 'Total',
      enableSorting: true,
      cell: (info) => <span className="font-clash text-[15px] font-medium text-slate-900">{formatPrice(info.getValue())}</span>
    }),
    listHelper.accessor('status', {
      header: 'Booking',
      cell: (info) => <StatusBadge status={info.getValue()} />
    }),
    listHelper.display({
      id: 'payment',
      header: 'Bayar',
      cell: ({ row }) => <PaymentBadge tx={row.original.transaction} />
    }),
    listHelper.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => onSelect(row.original)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400 transition-all hover:border-[#E35336] hover:bg-[#E35336] hover:text-white hover:shadow-md"
          title="Lihat detail"
        >
          <Eye size={16} />
        </button>
      )
    })
  ]

  return (
    <div className="animate-fade-in-up overflow-hidden rounded-[24px] border border-slate-200 bg-white p-2 shadow-[0_18px_42px_-38px_rgba(15,23,42,.4)] delay-200">
      <DataTable
        columns={columns as ColumnDef<AdminBookingDto, unknown>[]}
        data={bookings}
        searchColumn="customerName"
        searchPlaceholder="Cari nama pelanggan..."
        emptyMessage="Belum ada booking."
      />
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

type ViewMode = 'grid' | 'list'
type ModeFilter = 'court' | 'class' | 'all'

export default function BookingsIndex() {
  const { data, isLoading } = useBookingsIndex()
  const bookings = data?.bookings ?? []
  const facilities = data?.facilities ?? []

  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  // Defaults to Lapangan. A class books one row PER PARTICIPANT, so a single
  // 20-seat session buried the courts under 20 rows — and the pill grid, which
  // is laid out one column per facility, is unreadable for them. Classes stay
  // reachable because the Roster has no per-participant payment actions yet.
  const [mode, setMode] = useState<ModeFilter>('court')
  const [selected, setSelected] = useState<AdminBookingDto | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const visibleBookings = useMemo(() => (mode === 'all' ? bookings : bookings.filter((b) => (b.bookingMode ?? 'court') === mode)), [bookings, mode])

  const visibleFacilities = useMemo(
    () => (mode === 'all' ? facilities : facilities.filter((f) => (f.bookingMode ?? 'court') === mode)),
    [facilities, mode]
  )

  const todayBookings = useMemo(() => visibleBookings.filter((b) => b.bookingDate === todayStr()), [visibleBookings])

  // Counts follow the filter — otherwise "Pending hari ini" keeps counting
  // class participants that are not on screen.
  const pendingCount = todayBookings.filter((b) => b.status === 'pending').length
  const confirmedCount = todayBookings.filter((b) => b.status === 'confirmed').length
  const cancelledCount = todayBookings.filter((b) => b.status === 'cancelled').length
  const completedCount = todayBookings.filter((b) => b.effectiveStatus === 'completed').length

  return (
    <>
      <div className="px-4 pt-2 xl:px-8">
        <div className="animate-fade-in-up flex flex-col gap-0.5 pt-3">
          <span className="font-bdo text-[10px] font-medium tracking-wide text-[#E35336]">Manajemen Reservasi</span>
          <h1 className="font-clash text-2xl font-bold tracking-tight uppercase xl:text-3xl">
            <span className="booking-title-shine">Pemesanan</span>
          </h1>
        </div>
      </div>
      <main className="ubsc-page-bookings max-w-full flex-1 px-4 pt-2 pb-10 xl:px-8">
        <div className="flex flex-col gap-4 overflow-x-hidden pt-3 pb-16">
          {/* ── Toolbar Row ── */}
          <div className="animate-fade-in-up flex flex-col justify-between gap-3 rounded-[20px] border border-slate-200 bg-white p-2.5 shadow-[0_18px_40px_-36px_rgba(15,23,42,.45)] delay-100 md:flex-row md:items-center">
            {/* Stats Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-[10px] border border-[#F8B5A8] bg-[#FFF4F1] px-3 py-1 shadow-xs">
                <Clock3 size={13} className="text-[#E35336]" />
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#E35336]"></span>
                <span className="font-bdo text-[10px] font-bold tracking-wider text-[#B93D2A] uppercase">{pendingCount} Pending hari ini</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-[10px] border border-emerald-100 bg-emerald-50 px-3 py-1 shadow-xs">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"></span>
                <span className="font-bdo text-[10px] font-bold tracking-wider text-emerald-600 uppercase">{confirmedCount} Konfirmasi hari ini</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-[10px] border border-blue-100 bg-blue-50 px-3 py-1 shadow-xs">
                <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                <span className="font-bdo text-[10px] font-bold tracking-wider text-blue-600 uppercase">{completedCount} Selesai</span>
              </div>
              {cancelledCount > 0 && (
                <div className="flex items-center gap-1.5 rounded-[10px] border border-slate-200 bg-slate-100 px-3 py-1 shadow-xs">
                  <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                  <span className="font-bdo text-[10px] font-bold tracking-wider text-slate-600 uppercase">{cancelledCount} Dibatalkan</span>
                </div>
              )}
              <span className="ml-1 rounded-[10px] border border-slate-200 bg-white px-2.5 py-1 font-bdo text-[10px] font-bold text-slate-400">
                HARI INI: {todayBookings.length}
              </span>
            </div>

            <div className="flex w-full flex-wrap items-center justify-between gap-2.5 md:w-auto md:justify-end">
              {/* Court / class filter */}
              <div className="flex items-center rounded-[14px] border border-slate-200 bg-white p-1 shadow-xs">
                {(
                  [
                    ['court', 'Lapangan'],
                    ['class', 'Kelas'],
                    ['all', 'Semua']
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMode(value)}
                    className={cn(
                      'rounded-[10px] px-3 py-1.5 font-clash text-xs font-medium transition-all',
                      mode === value ? 'bg-[#FFF4F1] text-[#B93D2A] shadow-inner' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* View toggle */}
              <div className="flex items-center rounded-[14px] border border-slate-200 bg-white p-1 shadow-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 font-clash text-xs font-medium transition-all',
                    viewMode === 'grid' ? 'bg-[#FFF4F1] text-[#B93D2A] shadow-inner' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  )}
                >
                  <LayoutGrid size={15} className={viewMode === 'grid' ? 'text-[#E35336]' : ''} />
                  Grid
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 font-clash text-xs font-medium transition-all',
                    viewMode === 'list' ? 'bg-[#FFF4F1] text-[#B93D2A] shadow-inner' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  )}
                >
                  <List size={15} className={viewMode === 'list' ? 'text-[#E35336]' : ''} />
                  List
                </button>
              </div>

              {/* Add booking */}
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 rounded-[10px] bg-[linear-gradient(135deg,#F08C78_0%,#E35336_52%,#B93D2A_100%)] px-4 py-2.5 font-clash text-[13px] font-semibold text-white shadow-[0_18px_30px_-24px_rgba(227,83,54,.95)] transition-all hover:-translate-y-0.5 active:scale-100"
              >
                <Plus size={16} className="text-white" />
                Tambah Booking
              </button>
            </div>
          </div>

          {/* View content */}
          {mode === 'class' && (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-[#F8B5A8]/60 bg-[#FFF7F5] px-4 py-2.5">
              <p className="font-bdo text-xs font-medium text-[#8E2D20]">
                Kelas dipesan per peserta, jadi satu sesi muncul sebagai banyak baris. Untuk melihat per pertemuan, buka Roster Kelas.
              </p>
              <Link
                href={routes.classes()}
                className="rounded-lg border border-[#F8B5A8] bg-white px-2.5 py-1 font-bdo text-[11px] font-bold text-[#B93D2A] transition hover:bg-[#FFEFEA]"
              >
                Buka Roster Kelas
              </Link>
            </div>
          )}

          {isLoading ? null : viewMode === 'grid' ? (
            <GridView bookings={visibleBookings} facilities={visibleFacilities} onSelect={setSelected} />
          ) : (
            <ListView bookings={visibleBookings} onSelect={setSelected} />
          )}
        </div>

        {/* Detail SlideOver */}
        <SlideOver
          isOpen={selected !== null}
          onClose={() => setSelected(null)}
          title={<span className="font-clash text-xl">Detail Booking</span>}
          description={
            selected && (
              <span className="font-bdo text-sm font-medium text-[#B93D2A]">
                {selected.facilityName} · {selected.startTime}-{selected.endTime}
              </span>
            )
          }
        >
          {selected && <BookingDetail key={selected.id} booking={selected} onClose={() => setSelected(null)} />}
        </SlideOver>

        {/* Create SlideOver */}
        <SlideOver
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
          title={<span className="font-clash text-xl font-bold">Tambah Booking</span>}
          description={<span className="font-bdo text-sm text-slate-500">Buat reservasi baru secara manual ke sistem.</span>}
        >
          {showCreate && <CreateBookingForm facilities={facilities} onClose={() => setShowCreate(false)} />}
        </SlideOver>
      </main>
    </>
  )
}
