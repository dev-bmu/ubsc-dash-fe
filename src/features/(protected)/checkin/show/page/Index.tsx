'use client'

import { AlertTriangle, BadgeCheck, CalendarDays, CheckCircle2, Clock, User } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { useCheckIn, useCheckInMutation } from '@/hooks/api/useBookings'
import { extractApiError } from '@/lib/apiError'

const rupiah = (n: number) => 'Rp ' + n.toLocaleString('id-ID')

/**
 * What staff see after scanning a customer's QR. One screen, one decision.
 * Everything that should make them pause — unpaid, cancelled, wrong day,
 * already checked in — is shouted before the button.
 */
export default function CheckInShow() {
  const token = useParams().token as string
  const { data: booking } = useCheckIn(token)
  const { mutateAsync, isPending } = useCheckInMutation(token)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const paid = booking?.paymentStatus === 'PAID'
  const cancelled = booking?.status === 'cancelled'
  const done = Boolean(booking?.checkedInAt)

  const warnings: string[] = []
  if (booking) {
    if (!paid)
      warnings.push(
        `Pembayaran ${booking.paymentStatus === 'UNPAID' ? 'BELUM LUNAS' : booking.paymentStatus}. Minta bukti bayar atau bayar di tempat sebelum masuk.`
      )
    if (cancelled) warnings.push('Booking ini sudah DIBATALKAN. Slotnya mungkin sudah dipakai orang lain.')
    if (!booking.isToday && !done) warnings.push(`Jadwalnya ${booking.date}, bukan hari ini.`)
  }

  const confirm = async () => {
    try {
      await mutateAsync()
      setFeedback({ type: 'success', message: 'Kehadiran tercatat.' })
    } catch (error) {
      // 409 (sudah check-in) & error lain: banner rose (padanan flash.error Laravel).
      setFeedback({ type: 'error', message: extractApiError(error).message })
    }
  }

  return (
    <main className="max-w-full flex-1 px-4 pt-2 pb-10 xl:px-8">
      <div className="mx-auto max-w-xl">
        {!booking ? (
          <p className="font-bdo text-sm text-slate-500">Memuat…</p>
        ) : (
          <>
            <p className="font-bdo text-[10px] font-bold tracking-wider text-slate-400 uppercase">Check-in · {booking.receiptNumber}</p>
            <h1 className="mt-1 font-clash text-2xl font-semibold text-slate-950">{booking.customer.name}</h1>
            <p className="font-bdo text-sm text-slate-500">
              {booking.customer.email}
              {booking.customer.phone ? ` · ${booking.customer.phone}` : ''}
              {booking.customer.identityStatus === 'verified' && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  <BadgeCheck className="h-3 w-3" /> Warga UB
                </span>
              )}
            </p>

            {feedback?.type === 'success' && (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 font-bdo text-sm text-emerald-800">
                {feedback.message}
              </div>
            )}
            {feedback?.type === 'error' && (
              <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 font-bdo text-sm text-rose-800">{feedback.message}</div>
            )}

            <div className="mt-6 rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="grid gap-4 sm:grid-cols-2">
                <Row icon={CalendarDays} label="Jadwal" value={`${booking.date}`} sub={booking.time} />
                <Row icon={User} label="Fasilitas" value={booking.facility} sub={booking.unit ?? undefined} />
                <Row
                  icon={paid ? CheckCircle2 : AlertTriangle}
                  label="Pembayaran"
                  value={paid ? 'LUNAS' : booking.paymentStatus}
                  sub={rupiah(booking.amount)}
                  tone={paid ? 'ok' : 'bad'}
                />
                <Row icon={Clock} label="Status booking" value={booking.status.toUpperCase()} tone={cancelled ? 'bad' : 'neutral'} />
              </div>
            </div>

            {warnings.length > 0 && !done && (
              <div className="mt-4 space-y-2">
                {warnings.map((w) => (
                  <div
                    key={w}
                    className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 font-bdo text-sm text-amber-900"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    {w}
                  </div>
                ))}
              </div>
            )}

            {done ? (
              <div className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                <div>
                  <p className="font-clash text-base font-semibold text-emerald-900">Sudah check-in</p>
                  <p className="font-bdo text-sm text-emerald-800">
                    {booking.checkedInAt}
                    {booking.checkedInBy ? ` · oleh ${booking.checkedInBy}` : ''}
                  </p>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={confirm}
                disabled={isPending || cancelled}
                className={`mt-6 w-full rounded-2xl px-6 py-4 font-clash text-base font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  paid ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-amber-500 hover:bg-amber-400'
                }`}
              >
                {isPending ? 'Menyimpan…' : paid ? 'Konfirmasi Kehadiran' : 'Tetap Izinkan Masuk (belum lunas)'}
              </button>
            )}
          </>
        )}
      </div>
    </main>
  )
}

function Row({
  icon: Icon,
  label,
  value,
  sub,
  tone = 'neutral'
}: {
  icon: typeof CalendarDays
  label: string
  value: string
  sub?: string
  tone?: 'ok' | 'bad' | 'neutral'
}) {
  const color = { ok: 'text-emerald-600', bad: 'text-rose-600', neutral: 'text-slate-900' }[tone]

  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="font-bdo text-[11px] font-semibold tracking-wider text-slate-400 uppercase">{label}</p>
        <p className={`font-clash text-base font-semibold ${color}`}>{value}</p>
        {sub && <p className="font-bdo text-sm text-slate-500">{sub}</p>}
      </div>
    </div>
  )
}
