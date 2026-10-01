'use client'

import { CalendarDays, CheckCircle2, Clock, Search, User } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { routes } from '@/config/routes'
import { useCheckInIndex } from '@/hooks/api/useBookings'
import type { DeskBookingDto } from '@/types/contracts/contracts'

const rupiah = (n: number) => 'Rp ' + n.toLocaleString('id-ID')

/**
 * The front desk's home screen: everyone booked for today, in the order they
 * are likely to walk up.
 *
 * The QR was previously the only way in, which meant a flat phone or a QR that
 * would not scan left staff with nothing to open. Searching by name, phone or
 * receipt lands on exactly the same confirmation screen the scan does, so there
 * is one screen to learn and one place the decision is recorded.
 */
export default function CheckInIndex() {
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')

  // Debounced so typing does not fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300)
    return () => clearTimeout(t)
  }, [q])

  const { data } = useCheckInIndex(debouncedQ)
  const bookings = data?.bookings ?? []
  const search = data?.search ?? ''
  const today = data?.today ?? ''

  const waiting = bookings.filter((b) => !b.checkedInAt)
  const arrived = bookings.filter((b) => b.checkedInAt)

  return (
    <>
      <div className="px-4 pt-2 xl:px-8">
        <div className="flex flex-col gap-1 pt-4">
          <span className="font-bdo text-[12px] font-bold tracking-wide text-[#E35336]">Front Office</span>
          <h1 className="font-clash text-3xl font-bold tracking-tight uppercase xl:text-4xl">Check-in</h1>
          <p className="font-bdo text-sm text-slate-500">{today}</p>
        </div>
      </div>

      <main className="max-w-full flex-1 px-4 pt-2 pb-10 xl:px-8">
        <div className="mx-auto w-full max-w-4xl px-4 pb-16 sm:px-6">
          <div className="rounded-2xl border border-[#F8B5A8]/60 bg-[#FFF7F5] px-4 py-3">
            <p className="font-bdo text-xs leading-relaxed font-medium text-[#8E2D20]">
              Pelanggan datang? Pindai QR di tiketnya, atau cari namanya di bawah lalu buka. Dua-duanya berakhir di layar konfirmasi yang sama.
            </p>
          </div>

          <div className="relative mt-4">
            <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama, nomor HP, atau nomor resi…"
              autoFocus
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white pr-4 pl-11 font-bdo text-sm text-slate-800 outline-hidden transition focus:border-[#F8B5A8] focus:ring-4 focus:ring-[#E35336]/10"
            />
          </div>

          {bookings.length === 0 && (
            <p className="mt-8 rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center font-bdo text-sm text-slate-500">
              {search ? `Tidak ada reservasi hari ini yang cocok dengan "${search}".` : 'Belum ada reservasi untuk hari ini.'}
            </p>
          )}

          {waiting.length > 0 && (
            <Section title="Belum check-in" count={waiting.length}>
              {waiting.map((b) => (
                <DeskRow key={b.id} booking={b} />
              ))}
            </Section>
          )}

          {arrived.length > 0 && (
            <Section title="Sudah hadir" count={arrived.length}>
              {arrived.map((b) => (
                <DeskRow key={b.id} booking={b} />
              ))}
            </Section>
          )}
        </div>
      </main>
    </>
  )
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <p className="mb-2 font-bdo text-[11px] font-bold tracking-wider text-slate-400 uppercase">
        {title} · {count}
      </p>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  )
}

function DeskRow({ booking }: { booking: DeskBookingDto }) {
  const paid = booking.paymentStatus === 'PAID'
  const done = Boolean(booking.checkedInAt)

  // Token = last path segment of the check-in URL. No ticket, no check-in screen
  // to open — say so rather than render a link that goes nowhere.
  const token = booking.checkInUrl ? (booking.checkInUrl.split('/').filter(Boolean).pop() ?? '') : null

  const className = `flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition ${
    booking.checkInUrl ? 'hover:border-[#F8B5A8] hover:bg-[#FFF7F5]' : 'opacity-60'
  }`

  const content = (
    <>
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          done ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
        }`}
      >
        {done ? <CheckCircle2 size={17} /> : <User size={17} />}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-clash text-sm font-semibold text-slate-900">{booking.customer.name}</p>
        <p className="truncate font-bdo text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Clock size={10} /> {booking.time}
          </span>
          {' · '}
          {booking.facility}
          {booking.unit ? ` · ${booking.unit}` : ''}
        </p>
        <p className="truncate font-mono text-[10px] text-slate-400">
          {booking.receiptNumber}
          {booking.customer.phone ? ` · ${booking.customer.phone}` : ''}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <span
          className={`rounded-full px-2.5 py-0.5 font-bdo text-[10px] font-bold tracking-wide uppercase ${
            paid ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
          }`}
        >
          {paid ? 'Lunas' : 'Belum lunas'}
        </span>
        <span className="font-bdo text-[11px] font-semibold text-slate-600">{rupiah(booking.amount)}</span>
        {done && (
          <span className="inline-flex items-center gap-1 font-bdo text-[10px] text-emerald-600">
            <CalendarDays size={9} /> {booking.checkedInAt}
          </span>
        )}
        {!booking.checkInUrl && <span className="font-bdo text-[10px] font-semibold text-slate-400">Tanpa tiket QR</span>}
      </div>
    </>
  )

  if (token === null) {
    return (
      <div title="Booking ini belum punya tiket QR — hubungi admin sistem." className={className}>
        {content}
      </div>
    )
  }

  return (
    <Link href={routes.checkinToken(token)} className={className}>
      {content}
    </Link>
  )
}
