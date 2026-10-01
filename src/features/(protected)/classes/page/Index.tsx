'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { CalendarX2, ChevronLeft, ChevronRight, RotateCcw, Users2 } from 'lucide-react'
import { toast } from 'sonner'
import { buildCalendarWeeks, currentMonthKey, DAY_LABELS, dayNumber, formatLongDate, parseMonthKey, shiftMonth } from '@/lib/calendar'
import { useCancelSession, useClassRoster, useRestoreSession } from '@/hooks/api/useBookings'
import { extractApiError } from '@/lib/apiError'

/** Yellow past 80%, red when there is no seat left. */
function fillTone(taken: number, capacity: number): string {
  if (taken >= capacity) return 'bg-rose-100 text-rose-700 ring-rose-200'
  if (taken / Math.max(1, capacity) >= 0.8) return 'bg-amber-100 text-amber-700 ring-amber-200'
  if (taken > 0) return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  return 'bg-slate-50 text-slate-500 ring-slate-200'
}

export default function ClassRoster() {
  const [facilityId, setFacilityId] = useState<string | undefined>()
  const [facilityUnitId, setFacilityUnitId] = useState<string | undefined>()
  const [month, setMonth] = useState(currentMonthKey())
  const [date, setDate] = useState<string | undefined>()
  const [cancelling, setCancelling] = useState<{ date: string; start: string } | null>(null)
  const [reason, setReason] = useState('')

  const { data, isLoading } = useClassRoster({ facilityId, facilityUnitId, month, date })
  const cancelSessionMutation = useCancelSession()
  const restoreSessionMutation = useRestoreSession()

  // Seed filter dari default server (fasilitas kelas pertama + unit-nya) sekali saat data tiba.
  useEffect(() => {
    if (!data) return
    if (facilityId === undefined && data.facility) setFacilityId(data.facility.id)
    if (facilityUnitId === undefined && data.unit) setFacilityUnitId(data.unit.id)
  }, [data, facilityId, facilityUnitId])

  const classes = data?.classes ?? []
  const facility = data?.facility ?? null
  const unit = data?.unit ?? null
  const monthLabel = data?.monthLabel
  const days = data?.days ?? {}
  const roster = data?.roster ?? []

  const { month: monthNo, year } = parseMonthKey(month)
  const weeks = buildCalendarWeeks(monthNo, year)
  const activeClass = classes.find((c) => c.id === facilityId)

  const cancelSession = async () => {
    if (!cancelling || !facilityId || !facilityUnitId) return

    try {
      await cancelSessionMutation.mutateAsync({
        facilityId,
        facilityUnitId,
        sessionDate: cancelling.date,
        startTime: cancelling.start,
        reason: reason || null
      })
      toast.success('Sesi dibatalkan.')
      setCancelling(null)
      setReason('')
    } catch (error) {
      toast.error(extractApiError(error).message)
    }
  }

  const restoreSession = async (sessionDate: string, start: string) => {
    if (!facilityUnitId) return

    try {
      await restoreSessionMutation.mutateAsync({ facilityUnitId, sessionDate, startTime: start })
      toast.success('Sesi dibuka kembali.')
    } catch (error) {
      toast.error(extractApiError(error).message)
    }
  }

  return (
    <main className="max-w-full flex-1 px-4 pt-2 pb-10 xl:px-8">
      {!isLoading && classes.length === 0 ? (
        <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center">
          <p className="font-clash text-lg font-semibold text-slate-900">Belum ada fasilitas bermode kelas.</p>
          <p className="mt-2 font-bdo text-sm text-slate-500">
            Buka Facilities, pilih fasilitas seperti Yoga, lalu ubah Tipe Reservasi menjadi Kelas.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Pickers */}
          <div className="flex flex-wrap items-center gap-3 rounded-[28px] border border-slate-200 bg-white p-4">
            <select
              value={facilityId ?? ''}
              onChange={(e) => {
                setFacilityId(e.target.value)
                setFacilityUnitId(undefined)
                setDate(undefined)
              }}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 font-bdo text-sm font-semibold text-slate-800 outline-hidden focus:border-[#F8B5A8]"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {(activeClass?.units.length ?? 0) > 1 && (
              <select
                value={facilityUnitId ?? ''}
                onChange={(e) => {
                  setFacilityUnitId(e.target.value)
                  setDate(undefined)
                }}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 font-bdo text-sm font-semibold text-slate-800 outline-hidden focus:border-[#F8B5A8]"
              >
                {activeClass?.units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} · kuota {u.capacity}
                  </option>
                ))}
              </select>
            )}

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setMonth(shiftMonth(month, -1))
                  setDate(undefined)
                }}
                aria-label="Bulan sebelumnya"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-600 transition hover:bg-slate-100"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="min-w-[150px] text-center font-clash text-sm font-semibold text-slate-900">{monthLabel ?? month}</span>
              <button
                type="button"
                onClick={() => {
                  setMonth(shiftMonth(month, 1))
                  setDate(undefined)
                }}
                aria-label="Bulan berikutnya"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-600 transition hover:bg-slate-100"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
            {/* Month grid */}
            <section className="rounded-[28px] border border-slate-200 bg-white p-4 sm:p-6">
              <div className="mb-3 grid grid-cols-7 gap-1.5">
                {DAY_LABELS.map((d) => (
                  <span key={d} className="text-center font-bdo text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    {d}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {weeks.flat().map((cell, i) => {
                  const day = cell ? days[cell] : undefined
                  const isSelected = cell !== null && cell === date

                  return (
                    <div
                      key={cell ?? `pad-${i}`}
                      className={`min-h-[76px] rounded-2xl border p-1.5 ${
                        cell === null ? 'border-transparent' : isSelected ? 'border-[#E35336] bg-[#FFF7F5]' : 'border-slate-200 bg-white'
                      }`}
                    >
                      {cell && (
                        <button
                          type="button"
                          onClick={() => setDate(cell)}
                          disabled={!day}
                          className="flex h-full w-full flex-col items-stretch gap-1 text-left disabled:cursor-default"
                        >
                          <span className={`font-bdo text-[11px] font-bold ${day ? 'text-slate-700' : 'text-slate-300'}`}>{dayNumber(cell)}</span>
                          {day?.sessions.map((s) => (
                            <span
                              key={s.startTime}
                              className={`rounded-lg px-1 py-0.5 text-center font-bdo text-[10px] font-bold ring-1 ${
                                s.cancelled ? 'bg-slate-100 text-slate-400 line-through ring-slate-200' : fillTone(s.taken, s.capacity)
                              }`}
                            >
                              {s.startTime} · {s.taken}/{s.capacity}
                            </span>
                          ))}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              <p className="mt-4 font-bdo text-[11px] font-medium text-slate-400">
                Angka pada tiap sel adalah peserta terdaftar dibanding kuota. Klik satu tanggal untuk melihat daftar pesertanya.
              </p>
            </section>

            {/* Day panel */}
            <aside className="rounded-[28px] border border-slate-200 bg-white p-5 sm:p-6">
              {!date || !days[date] ? (
                <div className="py-16 text-center">
                  <Users2 className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-3 font-bdo text-sm font-semibold text-slate-500">Pilih tanggal untuk melihat peserta.</p>
                </div>
              ) : (
                <>
                  <p className="font-clash text-base font-semibold text-slate-950">{formatLongDate(date)}</p>
                  <p className="mt-0.5 font-bdo text-xs font-medium text-slate-400">
                    {facility?.name}
                    {unit ? ` · ${unit.name}` : ''}
                  </p>

                  <div className="mt-4 flex flex-col gap-4">
                    {days[date].sessions.map((s) => {
                      const attendees = roster.filter((r) => r.startTime === s.startTime)

                      return (
                        <div key={s.startTime} className="rounded-2xl border border-slate-200 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bdo text-sm font-bold text-slate-800">
                              {s.startTime} – {s.endTime}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-0.5 font-bdo text-[11px] font-bold ring-1 ${
                                s.cancelled ? 'bg-slate-100 text-slate-500 ring-slate-200' : fillTone(s.taken, s.capacity)
                              }`}
                            >
                              {s.cancelled ? 'Dibatalkan' : `${s.taken}/${s.capacity}`}
                            </span>
                          </div>

                          {attendees.length === 0 ? (
                            <p className="mt-2 font-bdo text-xs text-slate-400">Belum ada peserta.</p>
                          ) : (
                            <ul className="mt-2 space-y-1.5">
                              {attendees.map((r) => (
                                <li key={r.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
                                  <span className="min-w-0">
                                    <span className="block truncate font-bdo text-xs font-bold text-slate-800">
                                      {r.name}
                                      {r.isPackage && <span className="ml-1.5 font-normal text-slate-400"> · paket</span>}
                                    </span>
                                    <span className="block truncate font-bdo text-[11px] text-slate-400">{r.phone ?? r.receipt ?? '-'}</span>
                                  </span>
                                  <span className="flex shrink-0 items-center gap-1.5">
                                    {r.status === 'cancelled' ? (
                                      <Chip tone="slate">Batal</Chip>
                                    ) : r.checkedInAt ? (
                                      <Chip tone="emerald">Hadir {r.checkedInAt}</Chip>
                                    ) : r.paymentStatus === 'PAID' ? (
                                      <Chip tone="emerald">Lunas</Chip>
                                    ) : (
                                      <Chip tone="amber">Belum bayar</Chip>
                                    )}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}

                          {s.cancelled ? (
                            <button
                              type="button"
                              onClick={() => restoreSession(date, s.startTime)}
                              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 font-bdo text-[11px] font-bold text-slate-600 transition hover:bg-slate-50"
                            >
                              <RotateCcw size={12} /> Buka kembali sesi ini
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setCancelling({ date, start: s.startTime })}
                              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-rose-200 px-3 py-1.5 font-bdo text-[11px] font-bold text-rose-600 transition hover:bg-rose-50"
                            >
                              <CalendarX2 size={12} /> Batalkan sesi ini
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </aside>
          </div>
        </div>
      )}

      {/* Cancel confirmation */}
      {cancelling && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-[24px] bg-white p-6">
            <p className="font-clash text-lg font-semibold text-slate-950">Batalkan sesi {cancelling.start}?</p>
            <p className="mt-2 font-bdo text-sm text-slate-500">
              {formatLongDate(cancelling.date)}. Semua peserta sesi ini akan ditandai batal dan slotnya tidak dibuka lagi untuk pendaftar baru. Refund
              atau kelas pengganti diurus manual.
            </p>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={160}
              placeholder="Alasan (opsional) — misal: instruktur berhalangan"
              className="mt-4 h-11 w-full rounded-2xl border border-slate-200 px-4 font-bdo text-sm text-slate-800 outline-hidden focus:border-[#F8B5A8]"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setCancelling(null)
                  setReason('')
                }}
                className="rounded-full border border-slate-200 px-5 py-2.5 font-bdo text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={cancelSession}
                className="rounded-full bg-rose-600 px-5 py-2.5 font-bdo text-sm font-bold text-white transition hover:bg-rose-500"
              >
                Batalkan Sesi
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function Chip({ tone, children }: { tone: 'emerald' | 'amber' | 'slate'; children: ReactNode }) {
  const tones = {
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    slate: 'bg-slate-200 text-slate-500'
  }
  return <span className={`rounded-full px-2 py-0.5 font-bdo text-[10px] font-bold ${tones[tone]}`}>{children}</span>
}
