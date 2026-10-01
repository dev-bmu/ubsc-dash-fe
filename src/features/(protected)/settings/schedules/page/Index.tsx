'use client'

import '../schedules.css'

import { AlertTriangle, CalendarDays, CheckCircle2, LockKeyhole, RotateCcw, Save, ShieldCheck, UnlockKeyhole, X } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { useSchedules, useToggleSchedule, useUpdateScheduleClosedDates } from '@/hooks/api/useSettings'
import { extractApiError } from '@/lib/apiError'
import { buildCalendarWeeks, DAY_LABELS, dayNumber, formatShortDate, monthKey, padTwo } from '@/lib/calendar'
import { cn } from '@/lib/utils'
import type { AdminScheduleMonthDto } from '@/types/contracts/contracts'

// ===== Admin Schedule Control (Fase 8G) — port 1:1 dari Laravel Pages/Admin/Settings/Schedules/Index.tsx =====
// Data: useSchedules() (pengganti props Inertia). Mutasi: useToggleSchedule() + useUpdateScheduleClosedDates()
// (pengganti router.post). Sumber tidak merender banner flash → umpan balik lewat toast (sonner) memakai
// pesan flash Laravel. SCHEDULE_STYLES sumber dipindah ke ../schedules.css (di-scope ke .ubsc-page-settings-schedules).
// Helper kalender (DAY_LABELS/padTwo/buildCalendarWeeks/dayNumber/formatDateShort) memakai @/lib/calendar yang
// memang diangkat dari berkas ini pada Fase 8B — perilaku identik.

type ScheduleRow = AdminScheduleMonthDto
type SaveCallbacks = { onFinish: () => void; onError: () => void }

function rowKey(row: ScheduleRow): string {
  return monthKey(row.month, row.year)
}

function getDaysInMonth(row: ScheduleRow): number {
  return new Date(row.year, row.month, 0).getDate()
}

function ShinyIcon({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl',
        'bg-[linear-gradient(135deg,#F08C78_0%,#E35336_52%,#B93D2A_100%)] text-white',
        'shadow-[0_18px_34px_-24px_rgba(227,83,54,.98),inset_0_1px_0_rgba(255,255,255,.22)]',
        className
      )}
    >
      {children}
      <span className="pointer-events-none absolute top-1 right-2 left-2 h-1 rounded-full bg-white/35 blur-[1px]" />
    </div>
  )
}

function StatusPill({ isOpen }: { isOpen: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-bdo text-[10px] font-bold tracking-wide uppercase',
        isOpen ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-500'
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', isOpen ? 'bg-emerald-500' : 'bg-slate-400')} />
      {isOpen ? 'Reservasi dibuka' : 'Bulan terkunci'}
    </span>
  )
}

function HeroMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-[18px] border p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.16)] backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-[14px] text-white ring-1 ring-white/20">{icon}</span>
        <span className="font-clash text-xl leading-none font-semibold text-white">{value}</span>
      </div>
      <p className="mt-2 font-bdo text-[10px] font-bold tracking-wide uppercase">{label}</p>
    </div>
  )
}

function HeroStep({ index, text }: { index: string; text: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-[16px] border bg-white/10 px-3 py-2 backdrop-blur-sm">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white font-clash text-[11px] font-semibold text-[#B93D2A]">
        {index}
      </span>
      <p className="font-bdo text-[11px] leading-4 font-bold">{text}</p>
    </div>
  )
}

function ElegantMetricCard({
  icon,
  label,
  value,
  helper,
  tone
}: {
  icon: ReactNode
  label: string
  value: string | number
  helper: string
  tone: 'emerald' | 'terracotta'
}) {
  const isEmerald = tone === 'emerald'

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[20px] border bg-white p-3 shadow-[0_16px_34px_-30px_rgba(15,23,42,.42)]',
        isEmerald ? 'border-emerald-200' : 'border-[#FFD5CD]'
      )}
    >
      <div className={cn('pointer-events-none absolute inset-0', isEmerald ? 'bg-emerald-50/70' : 'bg-[#FFF1EE]/78')} />
      <div className={cn('pointer-events-none absolute inset-x-0 bottom-0 h-1', isEmerald ? 'bg-emerald-300/70' : 'bg-[#F08C78]/70')} />
      <div
        className={cn(
          'pointer-events-none absolute -top-12 -right-10 h-28 w-28 rounded-full blur-2xl',
          isEmerald ? 'bg-emerald-200/45' : 'bg-[#F08C78]/22'
        )}
      />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <span
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-[15px]',
            isEmerald ? 'bg-emerald-100 text-emerald-700' : 'bg-[#FFF1EE] text-[#B93D2A]'
          )}
        >
          {icon}
        </span>
        <span className="font-clash text-2xl leading-none font-semibold text-slate-950">{value}</span>
      </div>
      <p className="relative z-10 mt-3 font-bdo text-[10px] font-bold tracking-widest text-slate-400 uppercase">{label}</p>
      <p className="relative z-10 mt-1 font-bdo text-[11px] leading-4 font-semibold text-slate-500">{helper}</p>
    </div>
  )
}

function MonthActionButton({
  isOpen,
  onClick,
  disabled,
  compact = false
}: {
  isOpen: boolean
  onClick: () => void
  disabled?: boolean
  compact?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex w-full items-center justify-center gap-2 rounded-2xl border font-clash font-semibold transition focus:outline-hidden focus-visible:ring-4 focus-visible:ring-[#E35336]/15 disabled:cursor-not-allowed disabled:opacity-55',
        compact ? 'h-9 px-3 text-[11px]' : 'h-11 px-4 text-xs',
        isOpen
          ? 'border-[#FFD5CD] bg-white text-[#B93D2A] shadow-[0_12px_24px_-22px_rgba(185,61,42,.65)] hover:border-[#F8B5A8] hover:bg-[#FFF1EE]'
          : 'border-transparent bg-[linear-gradient(135deg,#F08C78_0%,#E35336_52%,#B93D2A_100%)] text-white shadow-[0_16px_30px_-22px_rgba(227,83,54,.95)] hover:-translate-y-0.5'
      )}
    >
      {isOpen ? <LockKeyhole size={14} /> : <UnlockKeyhole size={14} />}
      {isOpen ? 'Tutup bulan' : 'Buka bulan'}
    </button>
  )
}

function ScheduleHero({ schedules }: { schedules: ScheduleRow[] }) {
  const openCount = schedules.filter((row) => row.isOpen).length
  const lockedCount = schedules.length - openCount
  const closedDays = schedules.reduce((sum, row) => sum + row.closedDates.length, 0)

  return (
    <section
      className="schedule-enter schedule-card-glint relative overflow-hidden rounded-[26px] border border-[#F8B5A8]/60 p-4 text-white shadow-[0_22px_44px_-34px_rgba(227,83,54,.95)] sm:p-5"
      style={{
        background:
          'radial-gradient(circle at 92% 4%, rgba(255,255,255,.32), transparent 30%), radial-gradient(circle at 10% 95%, rgba(248,181,168,.28), transparent 34%), linear-gradient(135deg, #E35336 0%, #B93D2A 54%, #7F2419 100%)'
      }}
    >
      <div className="pointer-events-none absolute -top-20 -right-16 h-64 w-64 rounded-full border" />
      <div className="pointer-events-none absolute top-16 right-10 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-24 left-8 h-56 w-56 rounded-full bg-[#F8B5A8]/20 blur-3xl" />

      <div className="relative z-10 grid min-h-[270px] gap-5 xl:grid-cols-[minmax(0,1fr)_350px] xl:items-stretch">
        <div className="flex min-w-0 flex-col justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3 py-1.5 font-bdo text-[10px] font-bold tracking-widest text-white/90 uppercase backdrop-blur-sm">
              <span className="schedule-live-dot h-1.5 w-1.5 bg-white text-white" />
              Schedule command room
            </div>
            <h2 className="mt-4 max-w-5xl font-clash text-[1.85rem] leading-[0.98] font-semibold tracking-tight sm:text-[2.7rem] xl:text-[3.35rem]">
              Buka dan tutup jadwal reservasi dengan alur yang aman.
            </h2>
            <p className="mt-3 max-w-2xl font-bdo text-[13px] leading-relaxed font-medium sm:text-sm sm:leading-5">
              Admin bisa memilih bulan, mengubah status buka atau tutup, menandai tanggal libur, dan menyimpan perubahan tanpa berpindah halaman.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <HeroMetric icon={<UnlockKeyhole size={15} />} label="Bulan terbuka" value={openCount} />
            <HeroMetric icon={<LockKeyhole size={15} />} label="Bulan terkunci" value={lockedCount} />
            <HeroMetric icon={<CalendarDays size={15} />} label="Tanggal tutup" value={closedDays} />
          </div>
        </div>

        <div className="rounded-[22px] border p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.18)] backdrop-blur-sm">
          <p className="font-bdo text-[10px] font-bold tracking-[0.18em] uppercase">Cara pakai paling cepat</p>
          <div className="mt-3 grid gap-2">
            <HeroStep index="1" text="Pilih bulan dari kartu." />
            <HeroStep index="2" text="Tekan tombol buka atau tutup bulan." />
            <HeroStep index="3" text="Klik tanggal untuk tutup atau buka hari." />
            <HeroStep index="4" text="Simpan hanya jika jadwal sudah benar." />
          </div>
          <div className="mt-3 rounded-[18px] border bg-white/10 p-3">
            <p className="font-bdo text-[11px] leading-5 font-semibold">
              Perubahan tanggal tidak permanen sebelum tombol simpan ditekan, jadi operator bisa cek ulang dengan tenang.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function MonthTabs({
  schedules,
  selectedKey,
  onSelect,
  onToggle,
  togglingKey
}: {
  schedules: ScheduleRow[]
  selectedKey: string
  onSelect: (key: string) => void
  onToggle: (row: ScheduleRow) => void
  togglingKey: string | null
}) {
  return (
    <section className="schedule-enter schedule-card-glint overflow-hidden rounded-[24px] border border-[#FFE0D8] bg-[linear-gradient(135deg,#FFFFFF_0%,#FFF8F5_100%)] p-2.5 shadow-[0_16px_36px_-34px_rgba(185,61,42,.48)]">
      <div className="mb-2.5 flex flex-col gap-1 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-bdo text-[10px] font-bold tracking-widest text-[#B93D2A]/70 uppercase">Pilih bulan dan status</p>
          <h2 className="font-clash text-lg font-semibold text-slate-950">Kontrol cepat bulan reservasi</h2>
        </div>
        <p className="font-bdo text-xs font-semibold text-slate-400">Tombol aksi di setiap kartu bisa langsung dibalik.</p>
      </div>
      <div className="schedule-scrollbar schedule-touch-scroll flex gap-2 overflow-x-auto pb-2">
        {schedules.map((row, index) => {
          const key = rowKey(row)
          const active = key === selectedKey
          return (
            <article
              key={key}
              className={cn(
                'schedule-snap-item grid min-w-[74vw] gap-2.5 rounded-[20px] border p-2.5 text-left transition sm:min-w-[218px] md:min-w-[218px]',
                active
                  ? 'border-[#E35336] bg-white shadow-[0_18px_38px_-28px_rgba(227,83,54,.72)]'
                  : 'border-[#FFE0D8] bg-white/78 hover:border-[#F8B5A8] hover:bg-white'
              )}
            >
              <button type="button" onClick={() => onSelect(key)} className="block w-full text-left">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-clash text-base font-semibold text-slate-950">{row.label}</p>
                    <p className="mt-0.5 font-bdo text-[10px] font-bold tracking-wide text-slate-400 uppercase">
                      {index === 0 ? 'Bulan ini' : `${padTwo(row.month)} / ${row.year}`}
                    </p>
                  </div>
                  <span className={cn('h-2.5 w-2.5 rounded-full', row.isOpen ? 'bg-emerald-500' : 'bg-slate-300')} />
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-1 font-bdo text-[10px] font-bold uppercase',
                      row.isOpen ? 'bg-emerald-50 text-emerald-700' : 'bg-white text-slate-500'
                    )}
                  >
                    {row.isOpen ? 'Open' : 'Lock'}
                  </span>
                  <span className="font-bdo text-[11px] font-bold text-[#B93D2A]">{row.closedDates.length} tanggal tutup</span>
                </div>
              </button>
              <MonthActionButton
                isOpen={row.isOpen}
                compact
                disabled={togglingKey === key}
                onClick={() => {
                  onSelect(key)
                  onToggle(row)
                }}
              />
            </article>
          )
        })}
      </div>
    </section>
  )
}

function CalendarGrid({
  row,
  localClosedDates,
  onToggleLocal,
  disabled
}: {
  row: ScheduleRow
  localClosedDates: string[]
  onToggleLocal: (date: string) => void
  disabled: boolean
}) {
  const weeks = buildCalendarWeeks(row.month, row.year)
  const closedSet = new Set(localClosedDates)

  return (
    <div className="rounded-[24px] border border-[#FFE0D8] bg-[linear-gradient(180deg,#FFFFFF_0%,#FFF8F5_125%)] p-2.5 shadow-inner sm:p-3">
      <div className="mb-2 grid grid-cols-7 gap-1">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="flex h-8 items-center justify-center rounded-[14px] bg-white font-bdo text-[9px] font-bold tracking-wide text-slate-400 uppercase ring-1 ring-[#FFE0D8]"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid gap-1">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-1">
            {week.map((dateStr, dayIndex) => {
              if (!dateStr) {
                return <div key={`${weekIndex}-${dayIndex}`} className="aspect-square rounded-[18px]" />
              }

              const closed = closedSet.has(dateStr)
              const locked = !row.isOpen

              return (
                <button
                  key={dateStr}
                  type="button"
                  disabled={disabled || locked}
                  onClick={() => onToggleLocal(dateStr)}
                  className={cn(
                    'group relative flex aspect-square min-h-[38px] flex-col items-center justify-center overflow-hidden rounded-[15px] border font-clash text-[13px] font-semibold transition sm:min-h-[50px] xl:min-h-[58px]',
                    locked
                      ? 'cursor-not-allowed border-slate-200 bg-slate-200 text-slate-400'
                      : closed
                        ? 'border-[#F8B5A8] bg-[linear-gradient(135deg,#FFF1EE,#FFE0D8)] text-[#B93D2A] shadow-[inset_0_1px_0_rgba(255,255,255,.8)] hover:bg-rose-100'
                        : 'border-emerald-100 bg-white text-slate-900 shadow-sm hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700',
                    disabled && 'opacity-60'
                  )}
                  title={locked ? 'Buka bulan terlebih dahulu' : closed ? 'Klik untuk membuka tanggal ini' : 'Klik untuk menutup tanggal ini'}
                >
                  <span>{dayNumber(dateStr)}</span>
                  <span
                    className={cn(
                      'mt-0.5 hidden font-bdo text-[9px] font-bold uppercase sm:block',
                      closed ? 'text-[#B93D2A]/70' : 'text-slate-300 group-hover:text-emerald-600'
                    )}
                  >
                    {locked ? 'Lock' : closed ? 'Tutup' : 'Buka'}
                  </span>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function ActionDock({
  row,
  localClosedDates,
  hasChanges,
  saving,
  toggling,
  onToggleMonth,
  onReset,
  onOpenAll,
  onSave
}: {
  row: ScheduleRow
  localClosedDates: string[]
  hasChanges: boolean
  saving: boolean
  toggling: boolean
  onToggleMonth: () => void
  onReset: () => void
  onOpenAll: () => void
  onSave: () => void
}) {
  const openDays = Math.max(0, getDaysInMonth(row) - localClosedDates.length)

  return (
    <aside className="schedule-card-glint h-fit overflow-hidden rounded-[26px] border border-[#FFE0D8] bg-white shadow-[0_20px_42px_-38px_rgba(185,61,42,.58)]">
      <div className="relative overflow-hidden bg-[linear-gradient(135deg,#FFF1EE_0%,#FFFFFF_52%,#FFE0D8_130%)] p-3.5 text-slate-950">
        <div className="pointer-events-none absolute -top-12 -right-10 h-28 w-28 rounded-full blur-2xl" />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-[linear-gradient(180deg,#F08C78,#E35336,#B93D2A)]" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-bdo text-[10px] font-bold tracking-[0.18em] text-[#B93D2A]/70 uppercase">Status bulan</p>
            <h3 className="mt-1 font-clash text-xl font-semibold">{row.label}</h3>
          </div>
          <StatusPill isOpen={row.isOpen} />
        </div>
        <p className="mt-2 font-bdo text-xs leading-5 font-semibold text-slate-500">
          {row.isOpen ? 'Booking publik aktif untuk bulan ini.' : 'Bulan ini masih dikunci dari reservasi publik.'}
        </p>
      </div>

      <div className="space-y-2.5 p-3">
        <MonthActionButton isOpen={row.isOpen} onClick={onToggleMonth} disabled={toggling} />

        <div className="grid grid-cols-2 gap-2">
          <ElegantMetricCard
            icon={<CheckCircle2 size={16} />}
            label="Tanggal buka"
            value={openDays}
            helper="Masih bisa dipilih publik"
            tone="emerald"
          />
          <ElegantMetricCard
            icon={<X size={16} />}
            label="Tanggal tutup"
            value={localClosedDates.length}
            helper="Libur atau maintenance"
            tone="terracotta"
          />
        </div>

        {!row.isOpen && (
          <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-start gap-3">
              <LockKeyhole size={18} className="mt-0.5 shrink-0 text-slate-400" />
              <p className="font-bdo text-xs leading-5 font-semibold text-slate-500">
                Aktifkan bulan ini dulu. Setelah aktif, klik tanggal untuk menandai hari tutup.
              </p>
            </div>
          </div>
        )}

        <div className="rounded-[24px] border border-[#FFE0D8] bg-[#FFF8F5] p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="font-bdo text-[10px] font-bold tracking-widest text-slate-400 uppercase">Tanggal ditutup</p>
            {hasChanges && (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 font-bdo text-[9px] font-bold text-amber-700 uppercase">Belum simpan</span>
            )}
          </div>
          <div className="schedule-scrollbar mt-3 max-h-[168px] overflow-y-auto pr-1">
            {localClosedDates.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-[#FFD5CD] bg-white p-4 text-center">
                <p className="font-clash text-sm font-semibold text-slate-900">Belum ada tanggal tutup</p>
                <p className="mt-1 font-bdo text-xs font-semibold text-slate-400">Klik tanggal di kalender untuk menutup hari.</p>
              </div>
            ) : (
              <div className="grid gap-2">
                {localClosedDates.map((date) => (
                  <div key={date} className="flex items-center justify-between gap-3 rounded-[18px] border border-[#FFD5CD] bg-white px-3 py-2">
                    <span className="font-bdo text-xs font-bold text-slate-700">{formatShortDate(date)}</span>
                    <span className="rounded-full bg-[#FFF1EE] px-2 py-0.5 font-bdo text-[9px] font-bold text-[#B93D2A] uppercase">Tutup</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
          <button
            type="button"
            onClick={onOpenAll}
            disabled={!row.isOpen || localClosedDates.length === 0 || saving}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 font-clash text-xs font-semibold text-slate-600 transition hover:border-[#F8B5A8] hover:text-[#B93D2A] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ShieldCheck size={14} />
            Buka semua tanggal
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={!hasChanges || saving}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 font-clash text-xs font-semibold text-slate-600 transition hover:border-[#F8B5A8] hover:text-[#B93D2A] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <RotateCcw size={14} />
            Batalkan edit
          </button>
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={!hasChanges || saving || !row.isOpen}
          className={cn(
            'inline-flex h-11 w-full items-center justify-center gap-2 rounded-[18px] px-5 font-clash text-xs font-semibold transition',
            hasChanges && row.isOpen
              ? 'bg-[linear-gradient(135deg,#F08C78_0%,#E35336_52%,#B93D2A_100%)] text-white shadow-[0_18px_34px_-24px_rgba(227,83,54,.95)] hover:-translate-y-0.5'
              : 'cursor-not-allowed bg-slate-100 text-slate-400'
          )}
        >
          <Save size={15} />
          {saving ? 'Menyimpan...' : 'Simpan perubahan'}
        </button>
      </div>
    </aside>
  )
}

function ScheduleStudio({
  row,
  onToggle,
  onSaveDates,
  toggling
}: {
  row: ScheduleRow
  onToggle: (row: ScheduleRow) => void
  onSaveDates: (row: ScheduleRow, newClosed: string[], cbs: SaveCallbacks) => void
  toggling: boolean
}) {
  const [localClosedDates, setLocalClosedDates] = useState<string[]>(row.closedDates)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLocalClosedDates(row.closedDates)
  }, [row.month, row.year, row.closedDates])

  const hasChanges = useMemo(() => {
    return JSON.stringify([...localClosedDates].sort()) !== JSON.stringify([...row.closedDates].sort())
  }, [localClosedDates, row.closedDates])

  const toggleLocalDate = (date: string) => {
    if (!row.isOpen) return
    setLocalClosedDates((current) => (current.includes(date) ? current.filter((item) => item !== date) : [...current, date].sort()))
  }

  const save = () => {
    setSaving(true)
    onSaveDates(row, localClosedDates, {
      onFinish: () => setSaving(false),
      onError: () => {
        setSaving(false)
        setLocalClosedDates(row.closedDates)
      }
    })
  }

  return (
    <section className="schedule-enter grid gap-3 xl:grid-cols-[minmax(0,1fr)_310px]">
      <div className="schedule-card-glint overflow-hidden rounded-[26px] border border-[#FFE0D8] bg-white shadow-[0_20px_42px_-38px_rgba(185,61,42,.58)]">
        <div className="border-b border-[#FFE0D8] bg-[radial-gradient(circle_at_95%_10%,rgba(240,140,120,.18),transparent_28%),linear-gradient(135deg,#FFFFFF_0%,#FFF1EE_100%)] p-3.5 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <ShinyIcon className="h-10 w-10">
                <CalendarDays size={17} />
              </ShinyIcon>
              <div className="min-w-0">
                <p className="font-bdo text-[10px] font-bold tracking-widest text-slate-400 uppercase">Kalender kontrol</p>
                <h2 className="truncate font-clash text-xl font-semibold text-slate-950 sm:text-2xl">{row.label}</h2>
              </div>
            </div>
            <StatusPill isOpen={row.isOpen} />
          </div>
        </div>

        <div className="bg-[linear-gradient(180deg,#FFFFFF_0%,#FFFBFA_100%)] p-3 sm:p-4">
          <CalendarGrid row={row} localClosedDates={localClosedDates} onToggleLocal={toggleLocalDate} disabled={saving} />

          <div className="mt-3 grid gap-3 rounded-[20px] border border-[#FFE0D8] bg-[#FFF8F5] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 font-bdo text-[11px] font-bold text-slate-500">
                <span className="h-2.5 w-2.5 rounded-full bg-white ring-1 ring-emerald-200" />
                Bisa dibooking
              </span>
              <span className="inline-flex items-center gap-1.5 font-bdo text-[11px] font-bold text-slate-500">
                <span className="h-2.5 w-2.5 rounded-full bg-[#FFE0D8] ring-1 ring-[#F8B5A8]" />
                Ditutup
              </span>
              <span className="inline-flex items-center gap-1.5 font-bdo text-[11px] font-bold text-slate-500">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-200 ring-1 ring-slate-300" />
                Bulan terkunci
              </span>
            </div>
            <p className="font-bdo text-xs font-semibold text-slate-400">
              {row.isOpen ? 'Klik tanggal untuk mengubah status.' : 'Buka bulan dulu untuk mengedit tanggal.'}
            </p>
          </div>
        </div>
      </div>

      <ActionDock
        row={row}
        localClosedDates={localClosedDates}
        hasChanges={hasChanges}
        saving={saving}
        toggling={toggling}
        onToggleMonth={() => onToggle(row)}
        onReset={() => setLocalClosedDates(row.closedDates)}
        onOpenAll={() => setLocalClosedDates([])}
        onSave={save}
      />
    </section>
  )
}

function Guardrails({ schedules }: { schedules: ScheduleRow[] }) {
  const manyClosed = schedules.filter((row) => row.isOpen && row.closedDates.length > 8).length
  const locked = schedules.filter((row) => !row.isOpen).length

  return (
    <section className="schedule-enter grid gap-2.5 lg:grid-cols-3">
      {[
        {
          icon: <ShieldCheck size={16} />,
          label: 'Alur paling aman',
          text: 'Pilih bulan, buka status, klik tanggal, lalu simpan. Tidak ada perubahan permanen sebelum disimpan.',
          tone: 'border-emerald-200 bg-emerald-50 text-emerald-700'
        },
        {
          icon: <AlertTriangle size={16} />,
          label: 'Tanggal tutup padat',
          text: manyClosed > 0 ? `${manyClosed} bulan punya lebih dari 8 tanggal tutup.` : 'Tidak ada bulan aktif dengan tanggal tutup berlebihan.',
          tone: 'border-amber-200 bg-amber-50 text-amber-700'
        },
        {
          icon: <LockKeyhole size={16} />,
          label: 'Bulan terkunci',
          text: locked > 0 ? `${locked} bulan masih tidak menerima reservasi publik.` : 'Semua bulan pada rentang ini sudah menerima reservasi.',
          tone: 'border-slate-200 bg-slate-50 text-slate-600'
        }
      ].map((item) => (
        <article
          key={item.label}
          className="schedule-card-glint rounded-[22px] border border-[#FFE0D8] bg-white p-3.5 shadow-[0_16px_36px_-34px_rgba(185,61,42,.48)]"
        >
          <div className="flex items-center gap-2.5">
            <span className={cn('flex h-9 w-9 items-center justify-center rounded-[15px] border', item.tone)}>{item.icon}</span>
            <h3 className="font-clash text-base font-semibold text-slate-950">{item.label}</h3>
          </div>
          <p className="mt-2.5 font-bdo text-xs leading-5 font-semibold text-slate-500">{item.text}</p>
        </article>
      ))}
    </section>
  )
}

export default function SchedulesIndex() {
  const { data } = useSchedules()
  const serverSchedules = useMemo<ScheduleRow[]>(() => data?.schedules ?? [], [data])

  const [schedules, setSchedules] = useState<ScheduleRow[]>(serverSchedules)
  const [selectedKey, setSelectedKey] = useState(() => (serverSchedules[0] ? rowKey(serverSchedules[0]) : ''))
  const [togglingKey, setTogglingKey] = useState<string | null>(null)

  const toggleMutation = useToggleSchedule()
  const closedDatesMutation = useUpdateScheduleClosedDates()

  useEffect(() => {
    setSchedules(serverSchedules)
  }, [serverSchedules])

  useEffect(() => {
    if (serverSchedules.length > 0 && !serverSchedules.some((row) => rowKey(row) === selectedKey)) {
      setSelectedKey(rowKey(serverSchedules[0]))
    }
  }, [serverSchedules, selectedKey])

  const selectedRow = useMemo(() => {
    return schedules.find((row) => rowKey(row) === selectedKey) ?? schedules[0] ?? null
  }, [schedules, selectedKey])

  const handleToggle = (row: ScheduleRow) => {
    const key = rowKey(row)
    const nextOpen = !row.isOpen
    setSchedules((current) => current.map((item) => (rowKey(item) === key ? { ...item, isOpen: nextOpen } : item)))
    setTogglingKey(key)

    toggleMutation.mutate(
      { month: row.month, year: row.year },
      {
        onSuccess: () => toast.success(`Jadwal ${row.label} berhasil ${nextOpen ? 'dibuka' : 'ditutup'}.`),
        onError: (error) => {
          setSchedules((current) => current.map((item) => (rowKey(item) === key ? { ...item, isOpen: row.isOpen } : item)))
          toast.error(extractApiError(error).message)
        },
        onSettled: () => setTogglingKey(null)
      }
    )
  }

  const handleSaveDates = (row: ScheduleRow, newClosedDates: string[], callbacks: SaveCallbacks) => {
    const key = rowKey(row)
    const previousDates = row.closedDates
    setSchedules((current) => current.map((item) => (rowKey(item) === key ? { ...item, closedDates: newClosedDates } : item)))

    closedDatesMutation.mutate(
      { month: row.month, year: row.year, closedDates: newClosedDates },
      {
        onSuccess: () => toast.success('Tanggal tutup berhasil disimpan.'),
        onError: (error) => {
          setSchedules((current) => current.map((item) => (rowKey(item) === key ? { ...item, closedDates: previousDates } : item)))
          toast.error(extractApiError(error).message)
          callbacks.onError()
        },
        onSettled: () => callbacks.onFinish()
      }
    )
  }

  return (
    <>
      <div className="px-4 pt-2 xl:px-8">
        <div className="schedule-enter flex flex-col gap-1 pt-3">
          <span className="font-bdo text-[11px] font-medium tracking-wide text-[#E35336]">Pengaturan Sistem</span>
          <h1 className="font-clash text-2xl font-bold tracking-tight uppercase xl:text-3xl">
            <span className="schedule-title-shine">Kontrol Jadwal</span>
          </h1>
        </div>
      </div>

      <main className="ubsc-page-settings-schedules max-w-full flex-1 px-4 pt-2 pb-10 xl:px-8">
        <div className="flex flex-col gap-4 overflow-x-hidden pt-4 pb-16">
          <ScheduleHero schedules={schedules} />

          <MonthTabs
            schedules={schedules}
            selectedKey={selectedRow ? rowKey(selectedRow) : selectedKey}
            onSelect={setSelectedKey}
            onToggle={handleToggle}
            togglingKey={togglingKey}
          />

          {selectedRow && (
            <ScheduleStudio
              key={rowKey(selectedRow)}
              row={selectedRow}
              onToggle={handleToggle}
              onSaveDates={handleSaveDates}
              toggling={togglingKey === rowKey(selectedRow)}
            />
          )}

          <Guardrails schedules={schedules} />
        </div>
      </main>
    </>
  )
}
