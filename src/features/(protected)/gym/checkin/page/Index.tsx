'use client'

import { AlertTriangle, Camera, CheckCircle2, Clock3, ScanLine, ShieldCheck, XCircle } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { toast } from 'sonner'
import { routes } from '@/config/routes'
import { useGymDesk, useRecordGymVisit } from '@/hooks/api/useGym'
import { useDecideMemberPhoto } from '@/hooks/api/useIdentity'
import { useCaptureMemberPhoto } from '@/hooks/api/useMemberships'
import { extractApiError } from '@/lib/apiError'
import { cn } from '@/lib/utils'
import { lookupGymMember } from '@/services/Gym'
import type { GymCheckInLookupDto, GymCheckInVerdict } from '@/types/contracts/contracts'

// ===== Meja check-in gym (PRD tambahan 2026-09, tahap D) =====
// Scanner USB adalah "keyboard": ia mengetik isi kodenya ke input yang sedang fokus lalu menekan Enter.
// Karena itu scan dan ketik manual adalah jalur yang sama — input ini selalu dikembalikan fokusnya.
// Dua langkah: Enter = tampilkan (foto + vonis), tombol = catat. Gunanya foto adalah dibandingkan FO
// dengan orang di depannya; scan yang langsung mencatat membuat foto itu tidak ada gunanya.

const VERDICT: Record<GymCheckInVerdict, { tone: 'green' | 'yellow' | 'red'; title: string; detail: string }> = {
  ok: { tone: 'green', title: 'Boleh masuk', detail: 'Cocokkan wajah dengan foto, lalu catat kehadiran.' },
  already_checked_in: { tone: 'yellow', title: 'Sudah check-in hari ini', detail: 'Masuk ulang hanya dengan alasan yang dicatat.' },
  photo_not_approved: { tone: 'yellow', title: 'Foto belum disetujui', detail: 'Cocokkan wajah lalu setujui fotonya, atau ambil foto baru.' },
  no_active_membership: { tone: 'red', title: 'Membership tidak berlaku', detail: 'Tawarkan perpanjangan atau pendaftaran di menu Memberships.' },
  not_found: { tone: 'red', title: 'Nomor tidak ditemukan', detail: 'Periksa kembali nomor di kartu member.' }
}

const TONE_STYLE = {
  green: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  yellow: 'border-amber-300 bg-amber-50 text-amber-800',
  red: 'border-rose-300 bg-rose-50 text-rose-700'
} as const

const formatDate = (value: string) =>
  new Date(`${value}T00:00:00Z`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

/**
 * Kode dari scanner datang serentak (beberapa milidetik per karakter); ketikan manusia jauh lebih
 * lambat. Hanya untuk kolom `source` di analitik — salah tebak tidak mengubah apa pun selain label.
 */
// ponytail: heuristik waktu ketik; ganti dengan prefix/suffix yang diprogram di scanner bila perlu pasti.
const SCAN_WINDOW_MS = 300

export default function GymCheckInPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const typing = useRef({ start: 0, count: 0 })
  const [code, setCode] = useState('')
  const [lookup, setLookup] = useState<GymCheckInLookupDto | null>(null)
  const [lookupCode, setLookupCode] = useState('')
  const [source, setSource] = useState<'scan' | 'manual'>('manual')
  const [reason, setReason] = useState('')
  const [recordedAt, setRecordedAt] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const desk = useGymDesk()
  const record = useRecordGymVisit()
  const decidePhoto = useDecideMemberPhoto()
  const capturePhoto = useCaptureMemberPhoto()

  const refocus = () => {
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const runLookup = async (value: string) => {
    setBusy(true)
    try {
      setLookup(await lookupGymMember(value))
      setLookupCode(value)
      setReason('')
      setRecordedAt(null)
    } catch (error) {
      toast.error(extractApiError(error).message)
    } finally {
      setBusy(false)
      refocus()
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      const value = code.trim()
      if (!value) return
      const burst = typing.current.count >= 4 && performance.now() - typing.current.start < SCAN_WINDOW_MS
      setSource(burst ? 'scan' : 'manual')
      typing.current = { start: 0, count: 0 }
      setCode('')
      void runLookup(value)
      return
    }
    if (event.key.length === 1) {
      if (typing.current.count === 0) typing.current.start = performance.now()
      typing.current.count++
    }
  }

  const submit = async (overrideReason?: string) => {
    if (!lookup?.member) return
    try {
      const fresh = await record.mutateAsync({ code: lookupCode, source, overrideReason: overrideReason ?? null })
      const latest = fresh.visitsToday[fresh.visitsToday.length - 1]
      setLookup(fresh)
      setRecordedAt(latest?.time ?? null)
      setReason('')
      toast.success(`${fresh.member?.name ?? 'Member'} tercatat masuk ${latest?.time ?? ''}`.trim())
    } catch (error) {
      toast.error(extractApiError(error).message)
      void runLookup(lookupCode)
    } finally {
      refocus()
    }
  }

  const approvePhoto = async () => {
    const member = lookup?.member
    if (!member?.photoUrl) return
    try {
      await decidePhoto.mutateAsync({ id: member.userId, payload: { status: 'approved', photoUrl: member.photoUrl } })
      toast.success('Foto disetujui.')
      await runLookup(lookupCode)
    } catch (error) {
      toast.error(extractApiError(error).message)
    }
  }

  const takePhoto = async (file: File | undefined) => {
    const member = lookup?.member
    if (!file || !member) return
    try {
      await capturePhoto.mutateAsync({ userId: member.userId, file })
      toast.success('Foto disimpan dan langsung disetujui.')
      await runLookup(lookupCode)
    } catch (error) {
      toast.error(extractApiError(error).message)
    }
  }

  const verdict = lookup ? VERDICT[lookup.verdict] : null
  const member = lookup?.member ?? null
  const membership = lookup?.membership ?? null

  return (
    <>
      <div className="px-4 pt-2 xl:px-8">
        <div className="flex flex-col gap-0.5 pt-3">
          <span className="font-bdo text-[10px] font-medium tracking-wide text-[#E35336]">Meja Gym</span>
          <h1 className="font-clash text-2xl font-bold tracking-tight uppercase xl:text-3xl">Check-in Gym</h1>
        </div>
      </div>

      <main className="max-w-full flex-1 px-4 pt-4 pb-10 xl:px-8">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="flex flex-col gap-4">
            <label className="block rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <span className="flex items-center gap-2 font-bdo text-xs font-bold tracking-wider text-slate-500 uppercase">
                <ScanLine className="h-4 w-4 text-[#E35336]" />
                Pindai kartu atau ketik nomor member, lalu Enter
              </span>
              <input
                ref={inputRef}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                onKeyDown={onKeyDown}
                onBlur={() => {
                  // Scanner butuh input yang fokus. Dicek SETELAH fokus pindah: klik di area kosong
                  // mengembalikannya, klik ke kolom alasan atau tombol tidak direbut.
                  window.setTimeout(() => {
                    if (document.activeElement === document.body) inputRef.current?.focus()
                  }, 0)
                }}
                placeholder="UB-XXXX-XXXX"
                autoComplete="off"
                disabled={busy}
                className="mt-3 h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-mono text-2xl font-semibold tracking-widest text-slate-900 uppercase outline-hidden focus:border-[#E35336] focus:bg-white focus:ring-4 focus:ring-[#E35336]/10"
              />
            </label>

            {lookup && verdict && (
              <article className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <div className={cn('flex items-start gap-3 border-b px-5 py-4', TONE_STYLE[recordedAt ? 'green' : verdict.tone])}>
                  {recordedAt ? (
                    <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" />
                  ) : verdict.tone === 'green' ? (
                    <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0" />
                  ) : verdict.tone === 'yellow' ? (
                    <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0" />
                  ) : (
                    <XCircle className="mt-0.5 h-6 w-6 shrink-0" />
                  )}
                  <div>
                    <p className="font-clash text-xl font-semibold">{recordedAt ? `Tercatat masuk ${recordedAt}` : verdict.title}</p>
                    <p className="font-bdo text-sm">{recordedAt ? 'Silakan pindai member berikutnya.' : verdict.detail}</p>
                  </div>
                </div>

                {member && (
                  <div className="grid gap-5 p-5 sm:grid-cols-[220px_minmax(0,1fr)]">
                    <div className="aspect-square w-full overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
                      {member.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- foto member dari /uploads, dibandingkan langsung dengan orangnya
                        <img src={member.photoUrl} alt={`Foto ${member.name}`} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
                          <Camera className="h-8 w-8" />
                          <span className="font-bdo text-xs">Belum ada foto</span>
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="font-clash text-2xl font-semibold text-slate-950">{member.name}</p>
                      <p className="font-mono text-sm font-semibold text-slate-500">{member.customerNumber}</p>
                      <dl className="mt-4 grid gap-2 font-bdo text-sm">
                        <div className="flex justify-between gap-3 border-b border-slate-100 pb-2">
                          <dt className="text-slate-500">Paket</dt>
                          <dd className="font-semibold text-slate-900">{membership?.planName ?? '-'}</dd>
                        </div>
                        <div className="flex justify-between gap-3 border-b border-slate-100 pb-2">
                          <dt className="text-slate-500">Berlaku s.d.</dt>
                          <dd className="font-semibold text-slate-900">{membership ? formatDate(membership.endDate) : '-'}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-slate-500">Hari ini</dt>
                          <dd className="font-semibold text-slate-900">
                            {lookup.visitsToday.length === 0 ? 'Belum masuk' : lookup.visitsToday.map((visit) => visit.time).join(', ')}
                          </dd>
                        </div>
                      </dl>

                      {!recordedAt && (
                        <div className="mt-5 flex flex-col gap-3">
                          {lookup.verdict === 'ok' && (
                            <button
                              type="button"
                              onClick={() => void submit()}
                              disabled={record.isPending}
                              className="h-12 rounded-2xl bg-emerald-600 font-clash text-base font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                            >
                              Catat Kehadiran
                            </button>
                          )}

                          {lookup.verdict === 'already_checked_in' && (
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <input
                                value={reason}
                                onChange={(event) => setReason(event.target.value)}
                                maxLength={120}
                                placeholder="Alasan masuk ulang (wajib)"
                                className="h-11 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 font-bdo text-sm outline-hidden focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                              />
                              <button
                                type="button"
                                onClick={() => void submit(reason.trim())}
                                disabled={record.isPending || reason.trim() === ''}
                                className="h-11 rounded-2xl bg-amber-500 px-5 font-clash text-sm font-semibold text-white transition hover:bg-amber-400 disabled:opacity-50"
                              >
                                Izinkan &amp; Catat
                              </button>
                            </div>
                          )}

                          {lookup.verdict === 'photo_not_approved' && (
                            <div className="flex flex-wrap gap-2">
                              {member.photoUrl && member.photoStatus === 'pending' && (
                                <button
                                  type="button"
                                  onClick={() => void approvePhoto()}
                                  disabled={decidePhoto.isPending}
                                  className="h-11 rounded-2xl bg-emerald-600 px-5 font-clash text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                                >
                                  Wajah cocok — Setujui Foto
                                </button>
                              )}
                              <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 font-clash text-sm font-semibold text-slate-700 transition hover:border-[#F8B5A8] hover:text-[#B93D2A]">
                                <Camera className="h-4 w-4" />
                                {capturePhoto.isPending ? 'Menyimpan...' : 'Ambil Foto Baru'}
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp"
                                  capture="user"
                                  className="hidden"
                                  disabled={capturePhoto.isPending}
                                  onChange={(event) => {
                                    void takePhoto(event.target.files?.[0])
                                    event.target.value = ''
                                  }}
                                />
                              </label>
                            </div>
                          )}

                          {lookup.verdict === 'no_active_membership' && (
                            <Link
                              href={routes.memberships()}
                              className="inline-flex h-11 w-fit items-center rounded-2xl border border-slate-200 bg-white px-5 font-clash text-sm font-semibold text-slate-700 transition hover:border-[#F8B5A8] hover:text-[#B93D2A]"
                            >
                              Buka Memberships
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </article>
            )}
          </section>

          <aside className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <p className="font-clash text-base font-semibold text-slate-950">Kunjungan hari ini</p>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-bdo text-xs font-bold text-slate-600">
                {desk.data?.visits.length ?? 0}
              </span>
            </div>
            <ul className="mt-4 flex max-h-[70vh] flex-col gap-2 overflow-y-auto">
              {(desk.data?.visits ?? []).map((visit) => (
                <li key={visit.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 px-3.5 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate font-bdo text-sm font-semibold text-slate-900">{visit.memberName}</p>
                    <span className="flex shrink-0 items-center gap-1 font-bdo text-xs font-semibold text-slate-500">
                      <Clock3 className="h-3.5 w-3.5" />
                      {visit.time}
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-slate-400">
                    {visit.customerNumber} · {visit.checkedInBy}
                  </p>
                  {visit.isOverride && (
                    <p className="mt-1 rounded-lg bg-amber-50 px-2 py-1 font-bdo text-[11px] text-amber-700">Masuk ulang: {visit.overrideReason}</p>
                  )}
                </li>
              ))}
              {desk.data && desk.data.visits.length === 0 && (
                <li className="rounded-2xl border border-dashed border-slate-200 py-8 text-center font-bdo text-sm text-slate-400">
                  Belum ada kunjungan.
                </li>
              )}
            </ul>
          </aside>
        </div>
      </main>
    </>
  )
}
