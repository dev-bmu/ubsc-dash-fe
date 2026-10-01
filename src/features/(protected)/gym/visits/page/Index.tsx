'use client'

import { Download } from 'lucide-react'
import { useState } from 'react'
import { useGymVisitReport } from '@/hooks/api/useGym'
import { cn } from '@/lib/utils'
import type { GymVisitReportDto, GymVisitRowDto } from '@/types/contracts/contracts'

// ===== Analitik kunjungan gym (PRD tambahan 2026-09, tahap D) =====
// Jawaban langsung atas "rame jam berapa": kedatangan per jam, pola hari x jam, dan log. Tanpa check-out
// (keputusan client), jadi yang terukur adalah kedatangan, bukan jumlah orang di dalam.

const DAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const pad = (n: number) => String(n).padStart(2, '0')

/** Tanggal hari ini menurut Asia/Jakarta, 'YYYY-MM-DD'. */
function jakartaToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())
}

function shiftDays(date: string, delta: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

const formatDate = (value: string) =>
  new Date(`${value}T00:00:00Z`).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })

function downloadCsv(rows: GymVisitRowDto[], range: GymVisitReportDto['range']) {
  const headers = ['Tanggal', 'Jam', 'Nomor Member', 'Nama', 'Paket', 'Dicatat oleh', 'Sumber', 'Masuk ulang', 'Alasan']
  const escapeCell = (value: string | number | boolean | null) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const body = rows.map((row) =>
    [
      row.visitDate,
      row.time,
      row.customerNumber,
      row.memberName,
      row.planName,
      row.checkedInBy,
      row.source,
      row.isOverride ? 'ya' : '',
      row.overrideReason
    ]
      .map(escapeCell)
      .join(',')
  )
  const blob = new Blob([[headers.map(escapeCell).join(','), ...body].join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `UBSC-Kunjungan-Gym-${range.from}_${range.to}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <p className="font-bdo text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase">{label}</p>
      <p className="mt-1 font-clash text-2xl font-semibold text-slate-950 tabular-nums">{value}</p>
      {note && <p className="font-bdo text-xs text-slate-500">{note}</p>}
    </div>
  )
}

export default function GymVisitsPage() {
  const today = jakartaToday()
  const [range, setRange] = useState({ from: today, to: today })
  const { data } = useGymVisitReport(range.from, range.to)

  const presets = [
    { label: 'Hari ini', from: today, to: today },
    { label: '7 hari', from: shiftDays(today, -6), to: today },
    { label: '30 hari', from: shiftDays(today, -29), to: today }
  ]
  const hourlyMax = Math.max(1, ...(data?.hourly ?? [0]))
  const heatMax = Math.max(1, ...(data?.heatmap.flat() ?? [0]))
  const peak = data?.summary.peakHour ?? null

  return (
    <>
      <div className="px-4 pt-2 xl:px-8">
        <div className="flex flex-col gap-0.5 pt-3">
          <span className="font-bdo text-[10px] font-medium tracking-wide text-[#E35336]">Gym</span>
          <h1 className="font-clash text-2xl font-bold tracking-tight uppercase xl:text-3xl">Kunjungan</h1>
        </div>
      </div>

      <main className="max-w-full flex-1 px-4 pt-4 pb-10 xl:px-8">
        <div className="flex flex-col gap-5">
          <section className="flex flex-wrap items-end gap-3 rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <label className="flex flex-col gap-1 font-bdo text-xs font-bold text-slate-500">
              Dari
              <input
                type="date"
                value={range.from}
                max={range.to}
                onChange={(event) => event.target.value && setRange((prev) => ({ ...prev, from: event.target.value }))}
                className="h-10 rounded-xl border border-slate-200 px-3 font-semibold text-slate-800"
              />
            </label>
            <label className="flex flex-col gap-1 font-bdo text-xs font-bold text-slate-500">
              Sampai
              <input
                type="date"
                value={range.to}
                min={range.from}
                onChange={(event) => event.target.value && setRange((prev) => ({ ...prev, to: event.target.value }))}
                className="h-10 rounded-xl border border-slate-200 px-3 font-semibold text-slate-800"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setRange({ from: preset.from, to: preset.to })}
                  className={cn(
                    'h-10 rounded-xl border px-3.5 font-bdo text-xs font-bold transition',
                    range.from === preset.from && range.to === preset.to
                      ? 'border-[#F8B5A8] bg-[#FFF7F5] text-[#B93D2A]'
                      : 'border-slate-200 bg-white text-slate-500 hover:text-[#B93D2A]'
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={!data || data.visits.length === 0}
              onClick={() => data && downloadCsv(data.visits, data.range)}
              className="ml-auto inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 font-bdo text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-40"
            >
              <Download className="h-4 w-4" />
              Ekspor CSV
            </button>
          </section>

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Tile label="Kunjungan" value={String(data?.summary.totalVisits ?? 0)} />
            <Tile label="Member unik" value={String(data?.summary.uniqueMembers ?? 0)} />
            <Tile label="Rata-rata / hari" value={(data?.summary.averagePerDay ?? 0).toLocaleString('id-ID')} />
            <Tile
              label="Jam tersibuk"
              value={peak === null ? '-' : `${pad(peak)}.00`}
              note={peak === null ? undefined : `sampai ${pad(peak + 1)}.00 WIB`}
            />
            <Tile label="Masuk ulang" value={String(data?.summary.overrides ?? 0)} note="dengan alasan" />
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <p className="font-clash text-base font-semibold text-slate-950">Kedatangan per jam</p>
            <p className="font-bdo text-xs text-slate-500">Jumlah member yang masuk pada tiap jam (WIB) sepanjang rentang.</p>
            <div className="mt-4 flex h-44 items-end gap-1">
              {(data?.hourly ?? Array<number>(24).fill(0)).map((value, hour) => (
                <div
                  key={hour}
                  className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
                  title={`${pad(hour)}.00 — ${value} kunjungan`}
                >
                  {value > 0 && <span className="font-bdo text-[10px] font-bold text-slate-500">{value}</span>}
                  <div
                    className={cn('w-full rounded-t-md', hour === peak ? 'bg-[#E35336]' : 'bg-[#F8B5A8]')}
                    style={{ height: `${(value / hourlyMax) * 100}%`, minHeight: value > 0 ? 4 : 1 }}
                  />
                  <span className="font-bdo text-[9px] text-slate-400">{hour % 3 === 0 ? pad(hour) : ''}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <p className="font-clash text-base font-semibold text-slate-950">Pola mingguan</p>
            <p className="font-bdo text-xs text-slate-500">Hari × jam — makin gelap makin ramai. Paling berguna untuk rentang 30 hari.</p>
            <div className="mt-4 overflow-x-auto">
              <table className="border-separate border-spacing-0.5">
                <thead>
                  <tr>
                    <th />
                    {Array.from({ length: 24 }, (_, hour) => (
                      <th key={hour} className="w-6 font-bdo text-[9px] font-normal text-slate-400">
                        {hour % 3 === 0 ? pad(hour) : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data?.heatmap ?? Array.from({ length: 7 }, () => Array<number>(24).fill(0))).map((row, day) => (
                    <tr key={day}>
                      <th className="pr-2 text-right font-bdo text-[11px] font-semibold text-slate-500">{DAY_LABELS[day]}</th>
                      {row.map((value, hour) => (
                        <td
                          key={hour}
                          title={`${DAY_LABELS[day]} ${pad(hour)}.00 — ${value} kunjungan`}
                          className="h-6 w-6 rounded"
                          style={{ backgroundColor: value > 0 ? `rgba(227, 83, 54, ${0.15 + (value / heatMax) * 0.85})` : '#f1f5f9' }}
                        />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <p className="font-clash text-base font-semibold text-slate-950">Log kunjungan</p>
              <span className="font-bdo text-xs text-slate-400">
                {data && data.visits.length >= 500 ? '500 terbaru' : `${data?.visits.length ?? 0} baris`}
              </span>
            </div>
            <div className="max-h-[480px] overflow-auto">
              <table className="w-full min-w-[760px]">
                <thead className="sticky top-0 bg-slate-50 text-left">
                  <tr>
                    {['Waktu', 'Member', 'Paket', 'Dicatat oleh', 'Sumber', 'Catatan'].map((header) => (
                      <th key={header} className="px-4 py-2.5 font-bdo text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data?.visits ?? []).map((visit) => (
                    <tr key={visit.id} className="border-t border-slate-100 font-bdo text-sm">
                      <td className="px-4 py-2.5 whitespace-nowrap text-slate-700">
                        {formatDate(visit.visitDate)} · {visit.time}
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="font-semibold text-slate-900">{visit.memberName}</p>
                        <p className="font-mono text-[11px] text-slate-400">{visit.customerNumber}</p>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">{visit.planName}</td>
                      <td className="px-4 py-2.5 text-slate-700">{visit.checkedInBy}</td>
                      <td className="px-4 py-2.5 text-slate-500">{visit.source === 'scan' ? 'Scan' : 'Ketik'}</td>
                      <td className="px-4 py-2.5 text-amber-700">{visit.isOverride ? `Masuk ulang: ${visit.overrideReason ?? ''}` : ''}</td>
                    </tr>
                  ))}
                  {data && data.visits.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center font-bdo text-sm text-slate-400">
                        Belum ada kunjungan di rentang ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}
