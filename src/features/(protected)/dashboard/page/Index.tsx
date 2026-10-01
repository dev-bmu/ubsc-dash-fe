'use client'

import '../dashboard.css'

import React, { useState, useEffect } from 'react'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DoorClosed,
  Flame,
  Gauge,
  LayoutGrid,
  Leaf,
  Megaphone,
  Pencil,
  Plus,
  SignalMedium,
  TrendingUp,
  Trash2,
  Users,
  Wallet,
  MoreHorizontal,
  Coins,
  Ticket,
  Star,
  UserCheck,
  BarChart3,
  FileText,
  X
} from 'lucide-react'
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useRouter } from 'next/navigation'
import { SortableListItem } from '@/components/admin/SortableListItem'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { extractApiError } from '@/lib/apiError'
import { useDashboard } from '@/hooks/api/useDashboard'
import { useCreateInfoBanner, useDeleteInfoBanner, useReorderInfoBanners, useUpdateGymTraffic, useUpdateInfoBanner } from '@/hooks/api/useNews'
import { useAuth } from '@/context/AuthContext'
import { createAccessChecker, PERMISSIONS } from '@/config/permissions'
import { routes } from '@/config/routes'
import type { DashboardDto, DashboardStatsDto, OccupancyFacilityDto, RecentActivityDto, InfoBannerDto } from '@/types/contracts/contracts'

// --- FALLBACK REACT BITS (preserved) ---
const SplitText = ({ text, className }: { text: string; className?: string; delay?: number }) => (
  <span className={cn('split-text-lite', className)}>{text}</span>
)
const ShinyTextBlack = ({ text, className = '' }: { text: string; speed?: number; className?: string }) => (
  <span className={`animate-shiny-black ${className}`}>{text}</span>
)
const ShinyText = ({ text, className = '' }: { text: string; speed?: number; className?: string }) => (
  <span className={`animate-shiny-text ${className}`}>{text}</span>
)

// ── Types (selaras bentuk DTO kontrak, menggantikan interface lokal + prop Inertia) ──
type DashboardStats = DashboardStatsDto
type OccupancyFacility = OccupancyFacilityDto
type RecentActivity = RecentActivityDto
type InfoBannerItem = InfoBannerDto

// Fallback aman dipakai selama data dashboard belum tiba (isLoading / !data).
const DASHBOARD_FALLBACK: DashboardDto = {
  gymVisitsToday: 0,
  stats: { pendingIdentities: 0, activeFacilities: 0, todaysBookings: 0, totalRevenue: 0, activeMemberships: 0 },
  revenueTrend: 0,
  dailyRevenue: [],
  daysInMonth: 0,
  currentDayInMonth: 0,
  currentMonthLabel: '',
  occupancyData: [],
  recentActivity: [],
  gymTraffic: 'Low Occupancy',
  infoBanners: []
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRevenue(amount: number): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })}JT`
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 0 })}rb`
  }
  return amount.toLocaleString('id-ID')
}

function formatRupiahFull(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

function getElapsedMonthRevenue(data: number[], currentDayInMonth?: number): number[] {
  if (!data.length) return []

  const today = Number.isFinite(currentDayInMonth) && currentDayInMonth ? currentDayInMonth : new Date().getDate()
  const elapsedDays = Math.min(data.length, Math.max(1, today))

  return data.slice(0, elapsedDays)
}

// ── Global Styles ─────────────────────────────────────────────────────────────

// DASHBOARD_STYLES dipindah ke ../dashboard.css (di-import di atas komponen).

// ── ShinyIcon ─────────────────────────────────────────────────────────────────

function ShinyIcon({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-xl',
        'bg-linear-to-br from-[#F08C78] via-[#E35336] to-[#B93D2A]',
        'text-white shadow-[0_14px_28px_-18px_rgba(227,83,54,0.95)]',
        '[&_svg]:text-white',
        'icon-glow',
        className
      )}
    >
      {children}
      <span className="pointer-events-none absolute top-[5px] right-[7px] left-[7px] h-[4px] rounded-full bg-white/35 blur-[1px]" />
    </div>
  )
}

function LiveDot({
  color = '#E35336',
  halo = 'rgba(227,83,54,0.26)',
  size = 'sm',
  className
}: {
  color?: string
  halo?: string
  size?: 'xs' | 'sm' | 'md'
  className?: string
}) {
  const sizeClass = size === 'md' ? 'h-2.5 w-2.5' : size === 'xs' ? 'h-1.5 w-1.5' : 'h-2 w-2'
  const normalized = color.toLowerCase()
  const toneClass =
    normalized === '#ffffff' || normalized === '#fff'
      ? 'dashboard-live-dot-white'
      : normalized === '#67e8f9'
        ? 'dashboard-live-dot-cyan'
        : normalized === '#10b981'
          ? 'dashboard-live-dot-emerald'
          : normalized === '#22c55e'
            ? 'dashboard-live-dot-green'
            : normalized === '#34d399'
              ? 'dashboard-live-dot-mint'
              : normalized === '#0ea5e9'
                ? 'dashboard-live-dot-sky'
                : normalized === '#eab308'
                  ? 'dashboard-live-dot-amber'
                  : normalized === '#f59e0b'
                    ? 'dashboard-live-dot-orange'
                    : normalized === '#ef4444'
                      ? 'dashboard-live-dot-red'
                      : normalized === '#15678d'
                        ? 'dashboard-live-dot-navy'
                        : normalized === '#cbd5e1'
                          ? 'dashboard-live-dot-slate'
                          : undefined

  return <span className={cn('dashboard-live-dot', toneClass, sizeClass, className)} />
}

// ── PremiumStatCard (preserved) ───────────────────────────────────────────────

function DashboardMatrixCard({
  icon,
  label,
  value,
  note,
  tone,
  delay
}: {
  icon: React.ReactNode
  label: string
  value: string
  note: string
  tone: 'booking' | 'emerald' | 'sky' | 'amber'
  delay: string
}) {
  const styles = {
    booking: {
      card: 'border-cyan-200/70 bg-[radial-gradient(circle_at_18%_8%,rgba(125,211,252,.42),transparent_32%),radial-gradient(circle_at_86%_92%,rgba(52,211,153,.30),transparent_34%),linear-gradient(135deg,#0B1B3A_0%,#0E3A5F_48%,#0F766E_100%)] text-white shadow-[0_22px_46px_-30px_rgba(8,145,178,.92)]',
      icon: 'border-cyan-100/30 bg-white/[.14] text-cyan-100',
      chip: 'border-cyan-100/35 text-cyan-50',
      bar: 'bg-[linear-gradient(180deg,#A7F3D0,#22D3EE_58%,#0EA5E9)]',
      note: 'text-cyan-50/82',
      dot: '#67E8F9',
      halo: 'rgba(103,232,249,.32)'
    },
    emerald: {
      card: 'border-emerald-100 bg-white text-slate-950 shadow-[0_18px_38px_-30px_rgba(16,185,129,.52)]',
      icon: 'border-emerald-100 bg-emerald-50 text-emerald-600',
      chip: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      bar: 'bg-[linear-gradient(180deg,#6ee7b7,#059669)]',
      note: 'text-slate-500',
      dot: '#10B981',
      halo: 'rgba(16,185,129,.28)'
    },
    sky: {
      card: 'border-sky-100 bg-white text-slate-950 shadow-[0_18px_38px_-30px_rgba(14,165,233,.52)]',
      icon: 'border-sky-100 bg-sky-50 text-sky-600',
      chip: 'border-sky-200 bg-sky-50 text-sky-700',
      bar: 'bg-[linear-gradient(180deg,#7dd3fc,#0284c7)]',
      note: 'text-slate-500',
      dot: '#0EA5E9',
      halo: 'rgba(14,165,233,.28)'
    },
    amber: {
      card: 'border-[#F8B5A8] bg-[linear-gradient(135deg,#ffffff_0%,#fff8f0_72%,#FFF1EE_100%)] text-slate-950 shadow-[0_18px_38px_-30px_rgba(227,83,54,.42)]',
      icon: 'border-[#FFD5CD] bg-[#FFF1EE] text-[#B93D2A]',
      chip: 'border-[#F8B5A8] bg-[#FFD5CD]/70 text-[#B93D2A]',
      bar: 'bg-[linear-gradient(180deg,#FFD5CD,#E35336)]',
      note: 'text-[#B93D2A]',
      dot: '#E35336',
      halo: 'rgba(227,83,54,.28)'
    }
  }[tone]
  const barClasses = [
    'dashboard-metric-bar-1',
    'dashboard-metric-bar-2',
    'dashboard-metric-bar-3',
    'dashboard-metric-bar-4',
    'dashboard-metric-bar-5',
    'dashboard-metric-bar-6',
    'dashboard-metric-bar-7',
    'dashboard-metric-bar-8',
    'dashboard-metric-bar-9'
  ]

  return (
    <article
      className={cn(
        'animate-fade-in-up relative min-h-[150px] overflow-hidden rounded-[20px] border p-3.5 transition-all duration-300 hover:-translate-y-1',
        styles.card,
        delay
      )}
    >
      {tone === 'booking' && (
        <>
          <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,.13)_0,rgba(255,255,255,.13)_1px,transparent_1px,transparent_23px)] opacity-40" />
          <div className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full border border-cyan-100/35" />
          <div className="pointer-events-none absolute -bottom-14 left-8 h-24 w-24 rounded-full bg-emerald-300/20 blur-2xl" />
        </>
      )}
      <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-linear-to-r from-transparent via-current to-transparent opacity-20" />
      <div className="relative z-10 flex h-full min-h-[124px] flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <span
            className={cn('flex h-9 w-9 items-center justify-center rounded-[13px] border shadow-[inset_0_1px_0_rgba(255,255,255,.34)]', styles.icon)}
          >
            {icon}
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-bdo text-[9px] font-bold tracking-wide uppercase',
              styles.chip
            )}
          >
            <LiveDot size="xs" color={styles.dot} halo={styles.halo} />
            Live
          </span>
        </div>

        <div className="mt-3">
          <p className="font-clash text-[1.15rem] leading-[1.05] font-bold tracking-tight wrap-break-word sm:text-[1.25rem]" title={value}>
            {value}
          </p>
          <p className="mt-2 font-bdo text-[12px] font-semibold opacity-85">{label}</p>
          <div className="dashboard-metric-bars mt-2.5 flex items-end gap-[3px] rounded-[12px] border bg-white/10 px-2 py-1.5">
            {barClasses.map((barClass, index) => (
              <span key={barClass} className={cn('flex-1 rounded-t-[3px]', styles.bar, barClass, index < 3 ? 'opacity-50' : 'opacity-90')} />
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className={cn('min-w-0 font-bdo text-[11px] leading-tight font-semibold wrap-break-word', styles.note)}>{note}</p>
            <LiveDot size="xs" color={styles.dot} halo={styles.halo} />
          </div>
        </div>
      </div>
    </article>
  )
}

function PremiumStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  decorIcon: DecorIcon,
  bgGradient,
  statusDot,
  statusText,
  delay
}: {
  title: string
  value: string
  subtitle: string
  icon: React.ElementType
  decorIcon: React.ElementType
  bgGradient: string
  statusDot: string
  statusText: string
  delay: string
}) {
  return (
    <div
      className={`relative h-[230px] transform cursor-pointer overflow-hidden rounded-[24px] shadow-lg transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl ${bgGradient} animate-fade-in-up ${delay}`}
    >
      <div className="water-caustics-effect pointer-events-none absolute inset-0"></div>
      <div className="animate-pulse-glow pointer-events-none absolute top-6 left-6 opacity-30">
        <DecorIcon className="h-10 w-10 text-white drop-shadow-md" />
      </div>
      <div className="absolute top-5 right-5 z-10 flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3.5 py-1.5 backdrop-blur-md transition-colors hover:bg-white/20">
        <LiveDot size="sm" color="#ffffff" halo="rgba(255,255,255,0.28)" className={statusDot} />
        <span className="font-bdo text-[11px] font-bold tracking-wide text-white uppercase">{statusText}</span>
      </div>
      <div className="absolute bottom-0 flex h-[65%] w-full flex-col justify-end rounded-t-[24px] border-t border-white/10 bg-[#12131c] p-6 shadow-[inset_0_-20px_40px_-15px_rgba(227,83,54,0.5)]">
        <div className="animate-float absolute -top-6 left-6 rounded-2xl border border-white/20 bg-white/10 p-3 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-xl">
          <Icon className="h-6 w-6 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
        </div>
        <h3 className="mb-4 w-4/5 font-clash text-base leading-tight font-medium text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
          <SplitText text={title} delay={200} />
        </h3>
        <div className="mb-3 flex items-end justify-between">
          <span className="font-clash text-3xl font-bold tracking-tight">
            <ShinyText text={value} speed={3} className="text-white" />
          </span>
          <span className="mb-1.5 font-bdo text-[11px] font-medium text-slate-400">{subtitle}</span>
        </div>
        <div className="flex w-full items-center gap-1.5 opacity-80">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className={`h-[3px] flex-1 rounded-full transition-all duration-700 delay-[${i * 50}ms] ${i < 10 ? 'bg-[#EA684F] shadow-[0_0_5px_rgba(234,104,79,0.8)]' : 'bg-white/10'}`}
            ></div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Smooth bezier helper (preserved, used in AnalyticsPanel) ─────────────────

function smoothBezierPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  const d: string[] = [`M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`]
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[Math.max(0, i - 2)]
    const p1 = pts[i - 1]
    const p2 = pts[i]
    const p3 = pts[Math.min(pts.length - 1, i + 1)]
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d.push(`C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`)
  }
  return d.join(' ')
}

// ════════════════════════════════════════════════════════════════════════════
//  INTERACTIVE REVENUE CHART — Complete Redesign
//  ✅ Windowed bar chart (10 days visible at a time)
//  ✅ Prev / Next navigation — slides half a window
//  ✅ Progress scrubber — click anywhere to jump
//  ✅ Jump-to-date input — type a day number + press Enter / Go
//  ✅ Tooltips always render ABOVE each bar — never clips, never overflows
//  ✅ Full x-axis day labels for every visible bar
//  ✅ Global avg reference line
//  ✅ Staggered bar entrance animation
// ════════════════════════════════════════════════════════════════════════════

function InteractiveRevenueChart({ data, monthLabel, currentDayInMonth }: { data: number[]; monthLabel: string; currentDayInMonth: number }) {
  const DETAIL_WINDOW_SIZE = 10

  const chartData = data && data.length > 0 ? data : Array(30).fill(0)
  const totalDays = chartData.length

  // Start at the most-recent window so you land on latest data
  const [winStart, setWinStart] = useState(() => Math.max(0, totalDays - DETAIL_WINDOW_SIZE))
  const [viewMode, setViewMode] = useState<'month' | 'detail'>('month')
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [jumpDay, setJumpDay] = useState('')
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setIsLoaded(true), 180)
    return () => clearTimeout(t)
  }, [])

  // Scale uses the whole month, but avg/active stats use elapsed days only.
  const elapsedData = getElapsedMonthRevenue(chartData, currentDayInMonth)
  const maxGlobal = Math.max(...chartData, 1000)
  const avgGlobal = elapsedData.length > 0 ? elapsedData.reduce((a, b) => a + b, 0) / elapsedData.length : 0
  const peakValue = Math.max(...elapsedData, 0)
  const peakIdx = peakValue > 0 ? chartData.indexOf(peakValue) : -1
  const activeDays = elapsedData.filter((v) => v > 0).length
  const fullMonth = viewMode === 'month'

  // Current visible window
  const effectiveWindowSize = fullMonth ? totalDays : Math.min(DETAIL_WINDOW_SIZE, totalDays)
  const chartStart = fullMonth ? 0 : winStart
  const winEnd = fullMonth ? totalDays : Math.min(winStart + effectiveWindowSize, totalDays)
  const windowData = chartData.slice(chartStart, winEnd)
  const canPrev = !fullMonth && winStart > 0
  const canNext = !fullMonth && winEnd < totalDays

  const slide = (dir: -1 | 1) => {
    setWinStart((s) => {
      const next = s + dir * Math.ceil(DETAIL_WINDOW_SIZE / 2)
      return Math.max(0, Math.min(totalDays - DETAIL_WINDOW_SIZE, next))
    })
    setActiveIdx(null)
    setHoverIdx(null)
  }

  const jumpTo = () => {
    const d = parseInt(jumpDay, 10)
    if (isNaN(d) || d < 1 || d > totalDays) return
    const idx = d - 1
    const newStart = Math.min(Math.max(0, idx - Math.floor(DETAIL_WINDOW_SIZE / 2)), Math.max(0, totalDays - DETAIL_WINDOW_SIZE))
    setWinStart(newStart)
    setViewMode('detail')
    setActiveIdx(idx)
    setHoverIdx(null)
    setJumpDay('')
  }

  // Build bar descriptors for the visible window
  const bars = windowData.map((val, localIdx) => {
    const gi = chartStart + localIdx
    const rawH = maxGlobal > 0 ? (val / maxGlobal) * 100 : 0
    const heightPct = val > 0 ? Math.max(rawH, 4) : 1.5
    const isPeak = gi === peakIdx
    const isAboveAvg = val > avgGlobal && !isPeak
    const isActive = gi === activeIdx
    const isHovered = gi === hoverIdx
    const day = gi + 1
    const tooltipAlign = fullMonth
      ? day <= 3
        ? 'left'
        : day >= 21
          ? 'right'
          : 'center'
      : localIdx <= 1
        ? 'left'
        : localIdx >= windowData.length - 2
          ? 'right'
          : 'center'

    return { val, gi, localIdx, heightPct, isPeak, isAboveAvg, isActive, isHovered, tooltipAlign, day }
  })

  // Scrubber thumb geometry
  const maxStart = Math.max(0, totalDays - DETAIL_WINDOW_SIZE)
  const thumbPct = totalDays > 0 ? (DETAIL_WINDOW_SIZE / totalDays) * 100 : 100
  const thumbLeft = maxStart > 0 ? (winStart / totalDays) * 100 : 0

  // Avg line as % of chart bar height.
  const avgLinePct = maxGlobal > 0 ? (avgGlobal / maxGlobal) * 100 : 0
  const avgLineBottom = `calc(${avgLinePct}% + 1px)`
  const chartDynamicStyles = `
            .dashboard-rev-avg-line { bottom: ${avgLineBottom}; }
            .dashboard-scrubber-thumb-dynamic { left: ${thumbLeft}%; width: ${thumbPct}%; }
            ${bars
              .map(
                (bar) => `
                .dashboard-rev-tooltip-${bar.gi} { bottom: ${bar.heightPct}%; }
                .dashboard-rev-peak-${bar.gi} { bottom: calc(${bar.heightPct}% + 4px); }
                .dashboard-rev-bar-${bar.gi} {
                    height: ${isLoaded ? `${bar.heightPct}%` : '0%'};
                    transition: height 0.65s cubic-bezier(0.16,1,0.3,1) ${bar.localIdx * 38}ms, filter 0.15s;
                }
                .dashboard-rev-day-${bar.gi} {
                    font-weight: ${bar.gi === peakIdx || bar.isActive ? 700 : 500};
                    color: ${bar.isActive ? '#B93D2A' : bar.gi === peakIdx ? '#E35336' : '#94a3b8'};
                    opacity: ${!fullMonth || bar.day === 1 || bar.day === totalDays || bar.day % 5 === 0 || bar.isActive || bar.isHovered || bar.gi === peakIdx ? 1 : 0};
                }
            `
              )
              .join('')}
        `

  return (
    <div className="dashboard-font-bdo flex w-full flex-col gap-3 select-none">
      <style dangerouslySetInnerHTML={{ __html: chartDynamicStyles }} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
          {(
            [
              { key: 'month', label: 'Bulan' },
              { key: 'detail', label: '10 Hari' }
            ] as const
          ).map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => {
                setViewMode(option.key)
                setActiveIdx(null)
                setHoverIdx(null)
              }}
              className={cn(
                'rounded-lg px-3 py-1.5 font-bdo text-[10px] font-bold tracking-wider uppercase transition-all',
                viewMode === option.key ? 'bg-white text-[#B93D2A] shadow-xs ring-1 ring-[#FFD5CD]' : 'text-slate-400 hover:text-slate-700'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <span className="font-bdo text-[10px] font-medium text-slate-400">
          {fullMonth ? `${totalDays} hari dalam satu tampilan` : `Tgl ${chartStart + 1}-${winEnd}`}
        </span>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            {
              label: 'Hari Puncak',
              value: peakIdx >= 0 ? `Tgl ${peakIdx + 1}` : '-',
              accent: 'text-[#E35336]',
              bg: 'bg-[#FFF1EE]  border-[#FFD5CD]'
            },
            { label: 'Rata-rata', value: formatRevenue(Math.round(avgGlobal)), accent: 'text-slate-800', bg: 'bg-slate-50   border-slate-100' },
            { label: 'Hari Aktif', value: `${activeDays} hari`, accent: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' }
          ] as const
        ).map((s) => (
          <div key={s.label} className={`rounded-xl border px-2.5 py-1.5 ${s.bg}`}>
            <p className="mb-0.5 font-bdo text-[9px] font-bold tracking-widest text-slate-400 uppercase">{s.label}</p>
            <p className={`font-clash text-sm font-bold ${s.accent}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Active day detail banner ── */}
      {activeIdx !== null && (
        <div className="animate-scale-in flex items-center justify-between gap-3 rounded-2xl border border-[#F8B5A8] bg-[#FFF1EE] px-3.5 py-2.5">
          <div>
            <p className="font-bdo text-[9px] font-bold tracking-widest text-[#E35336]/80 uppercase">Detail Hari</p>
            <p className="font-clash text-sm font-bold text-slate-900">{formatRupiahFull(chartData[activeIdx])}</p>
          </div>
          <div className="text-right">
            <p className="font-bdo text-[9px] tracking-wide text-slate-500 uppercase">
              {activeIdx + 1} {monthLabel}
            </p>
            <p
              className={cn(
                'mt-0.5 font-bdo text-[10px] font-bold',
                chartData[activeIdx] > avgGlobal ? 'text-emerald-600' : chartData[activeIdx] === 0 ? 'text-slate-400' : 'text-rose-500'
              )}
            >
              {chartData[activeIdx] > avgGlobal
                ? '↑ di atas rata-rata'
                : chartData[activeIdx] === 0
                  ? '— tidak ada transaksi'
                  : '↓ di bawah rata-rata'}
            </p>
          </div>
          <button
            onClick={() => setActiveIdx(null)}
            className="ml-auto shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-[#FFD5CD] hover:text-slate-700"
            aria-label="Tutup detail hari"
            title="Tutup detail hari"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Chart Body ── */}
      {/*
                    CRITICAL: overflow: visible on every ancestor of the tooltip
                    so bars near the top never clip the floating tooltip.
                */}
      <div className="dashboard-visible min-w-0 rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
        <div className="dashboard-visible-only flex min-w-0 gap-2">
          {/* Y-axis labels */}
          <div className="dashboard-y-axis flex shrink-0 flex-col justify-between pb-7 text-right">
            <span className="font-bdo text-[9px] font-medium text-slate-300">{formatRevenue(maxGlobal)}</span>
            <span className="font-bdo text-[9px] font-medium text-slate-300">{formatRevenue(Math.round(maxGlobal * 0.5))}</span>
            <span className="dashboard-zero-label font-bdo text-[9px] font-medium">0</span>
          </div>

          {/* Bar + x-axis wrapper */}
          <div className="dashboard-visible min-w-0 flex-1">
            {/* Fixed-height bar area — this is the coordinate space for avg line */}
            <div className="dashboard-chart-area">
              {/* Grid lines */}
              <div className="dashboard-grid-wrap pointer-events-none absolute inset-x-0">
                <div className="dashboard-grid-top absolute inset-x-0" />
                <div className="dashboard-grid-mid absolute inset-x-0" />
                <div className="dashboard-grid-base absolute inset-x-0" />
              </div>

              {/* Average reference line */}
              {avgGlobal > 0 && (
                <div className="dashboard-avg-line dashboard-rev-avg-line pointer-events-none absolute inset-x-0">
                  <span className="dashboard-avg-label absolute font-bdo text-[8px] font-bold whitespace-nowrap">
                    avg {formatRevenue(Math.round(avgGlobal))}
                  </span>
                </div>
              )}

              {/* Bar columns */}
              <div className={cn('dashboard-full-visible flex min-w-0 items-end', fullMonth ? 'gap-px' : 'gap-1.5')}>
                {bars.map((bar) => (
                  <div
                    key={bar.gi}
                    className="dashboard-full-visible-only relative flex min-w-0 flex-1 cursor-pointer flex-col items-stretch justify-end"
                    onClick={() => setActiveIdx(bar.isActive ? null : bar.gi)}
                    onMouseEnter={() => setHoverIdx(bar.gi)}
                    onMouseLeave={() => setHoverIdx(null)}
                  >
                    {/* ── Tooltip (both hover and active state) ─────────────────────── */}
                    {/*
                                                Position: bottom = bar's rendered height % (of the 160px column),
                                                so the tooltip sits exactly at the top of the bar.
                                                translateY(-10px) adds a small visual gap.
                                                translateX(-50%) centres it over the bar.
                                                overflow: visible on all parents guarantees it's never clipped.
                                            */}
                    <div
                      className={cn(
                        `dashboard-rev-tooltip-${bar.gi}`,
                        'pointer-events-none absolute z-30 w-max',
                        'transition-opacity duration-150',
                        bar.tooltipAlign === 'left'
                          ? 'dashboard-tooltip-left'
                          : bar.tooltipAlign === 'right'
                            ? 'dashboard-tooltip-right'
                            : 'dashboard-tooltip-center',
                        bar.isActive || bar.isHovered ? 'animate-scale-in opacity-100' : 'opacity-0'
                      )}
                    >
                      <div className="dashboard-tooltip-card overflow-hidden rounded-xl ring-2 ring-[#F08C78]">
                        <div className="dashboard-tooltip-head flex items-center gap-1.5 px-3 py-1.5">
                          <LiveDot size="xs" color="#ffffff" halo="rgba(255,255,255,0.3)" />
                          <p className="font-bdo text-[9px] font-bold tracking-widest whitespace-nowrap text-white uppercase">
                            {bar.day} {monthLabel}
                          </p>
                        </div>
                        <div className="px-3 py-2.5">
                          <p className="font-clash text-sm font-bold whitespace-nowrap text-slate-950">{formatRupiahFull(bar.val)}</p>
                          <p className="mt-0.5 font-bdo text-[9px] font-bold tracking-wider text-[#E35336] uppercase">Detail pendapatan</p>
                        </div>
                      </div>
                    </div>

                    {/* Peak crown indicator */}
                    {bar.isPeak && isLoaded && (
                      <div
                        className={cn(
                          `dashboard-rev-peak-${bar.gi}`,
                          'dashboard-peak-marker pointer-events-none absolute font-bdo text-[9px] font-bold text-[#E35336]'
                        )}
                      >
                        ▲
                      </div>
                    )}

                    {/* The actual bar */}
                    <div
                      className={cn(
                        `dashboard-rev-bar-${bar.gi}`,
                        'rev-bar w-full rounded-t-[5px]',
                        bar.isPeak ? 'dashboard-bar-peak' : bar.isAboveAvg ? 'dashboard-bar-above' : 'dashboard-bar-normal',
                        bar.isActive && 'dashboard-bar-active'
                      )}
                    />
                  </div>
                ))}
              </div>
            </div>
            {/* end 160px bar area */}

            {/* X-axis day labels */}
            <div className={cn('mt-2 flex min-w-0', fullMonth ? 'gap-px' : 'gap-1.5')}>
              {bars.map((bar) => {
                const showFullMonthLabel =
                  !fullMonth || bar.day === 1 || bar.day === totalDays || bar.day % 5 === 0 || bar.isActive || bar.isHovered || bar.gi === peakIdx

                return (
                  <div key={bar.gi} className="min-w-0 flex-1 text-center">
                    <span
                      className={cn(`dashboard-rev-day-${bar.gi}`, 'block truncate font-bdo', fullMonth ? 'text-[7px] sm:text-[8px]' : 'text-[9px]')}
                    >
                      {showFullMonthLabel ? bar.day : ''}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
          {/* end bar+x wrapper */}
        </div>
        {/* end y+chart flex */}

        {/* Legend pills */}
        <div className="mt-3 flex items-center gap-3 border-t border-slate-100/80 pt-3">
          {(
            [
              { tone: 'dashboard-legend-peak', label: 'Puncak' },
              { tone: 'dashboard-legend-above', label: 'Di atas avg' },
              { tone: 'dashboard-legend-normal', label: 'Normal' }
            ] as const
          ).map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className={cn('h-2.5 w-2.5 rounded-[3px]', l.tone)} />
              <span className="font-bdo text-[9px] text-slate-400">{l.label}</span>
            </div>
          ))}
        </div>
      </div>
      {/* end chart body card */}

      {/* ── Navigation Bar ── */}
      <div className={cn('flex items-center gap-2', fullMonth && 'opacity-60')}>
        {/* Prev button */}
        <button
          onClick={() => slide(-1)}
          disabled={!canPrev}
          className={`chart-nav-btn ${canPrev ? 'enabled' : 'disabled'}`}
          title="Periode sebelumnya"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Scrubber */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="dashboard-axis-row flex justify-between">
            <span className="font-bdo text-[9px] text-slate-400">Tgl {chartStart + 1}</span>
            <span className="dashboard-axis-month font-bdo text-[9px] font-bold">{monthLabel}</span>
            <span className="font-bdo text-[9px] text-slate-400">Tgl {winEnd}</span>
          </div>
          <div
            className="scrubber-track"
            onClick={(e) => {
              if (fullMonth) {
                setViewMode('detail')
              }
              const rect = e.currentTarget.getBoundingClientRect()
              const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
              setWinStart(Math.round(pct * maxStart))
              setActiveIdx(null)
              setHoverIdx(null)
            }}
          >
            <div className="dashboard-scrubber-thumb-dynamic scrubber-thumb" />
          </div>
        </div>

        {/* Next button */}
        <button
          onClick={() => slide(1)}
          disabled={!canNext}
          className={`chart-nav-btn ${canNext ? 'enabled' : 'disabled'}`}
          title="Periode berikutnya"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Jump-to-date */}
        <div className="flex shrink-0 items-center gap-1">
          <input
            type="number"
            min={1}
            max={totalDays}
            value={jumpDay}
            onChange={(e) => setJumpDay(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && jumpTo()}
            placeholder="Tgl"
            className="jump-input"
          />
          <button onClick={jumpTo} className="jump-go-btn">
            Go
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Premium Identity Queue ────────────────────────────────────────────────────

function PremiumIdentityQueue({ count, canManageIdentity }: { count: number; canManageIdentity: boolean }) {
  const router = useRouter()
  const safeCount = Math.max(0, count ?? 0)
  const urgencyPct = Math.min(safeCount * 10, 100)
  const urgencyLabel = safeCount > 5 ? 'Prioritas tinggi' : safeCount > 2 ? 'Perlu dipantau' : safeCount > 0 ? 'Terkendali' : 'Bersih'
  const urgencyTone =
    safeCount > 5
      ? 'dashboard-urgency-red'
      : safeCount > 2
        ? 'dashboard-urgency-orange'
        : safeCount > 0
          ? 'dashboard-urgency-green'
          : 'dashboard-urgency-slate'
  const queueStyles = `.dashboard-identity-queue-progress { width: ${urgencyPct}%; }`
  const queueMessage = safeCount > 0 ? `${safeCount} akun menunggu validasi identitas.` : 'Tidak ada akun yang menunggu validasi.'
  const actionLabel = 'Kelola Antrean'
  const handleOpenIdentityQueue = () => {
    if (!canManageIdentity) return
    router.push(routes.identity())
  }

  return (
    <div className="animate-fade-in-up relative flex flex-col gap-4 overflow-hidden rounded-[24px] border border-slate-200/80 bg-white p-5 transition-colors delay-400 hover:border-[#F8B5A8]">
      <style dangerouslySetInnerHTML={{ __html: queueStyles }} />
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-linear-to-r from-transparent via-[#F8B5A8]/80 to-transparent" />

      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <ShinyIcon className="h-10 w-10">
            <UserCheck className="h-4 w-4 text-white" />
          </ShinyIcon>
          <div className="min-w-0">
            <p className="font-bdo text-[10px] font-bold tracking-widest text-[#E35336] uppercase">Verifikasi</p>
            <h2 className="truncate font-clash text-base leading-tight font-semibold text-slate-900">Antrean Identitas</h2>
            <p className="mt-0.5 line-clamp-1 font-bdo text-[11px] font-medium text-slate-500">{queueMessage}</p>
          </div>
        </div>
        <div className="relative shrink-0">
          <div className={cn('absolute inset-0 rounded-2xl opacity-10 blur-lg', urgencyTone)} />
          <div className="relative flex h-14 w-14 flex-col items-center justify-center rounded-2xl border border-[#FFD5CD] bg-[#FFF1EE]/70">
            <span className="font-clash text-2xl leading-none font-bold text-slate-900">{safeCount}</span>
            <span className="mt-0.5 font-bdo text-[8px] font-bold text-slate-400 uppercase">akun</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', urgencyTone)} />
            <span className="truncate font-bdo text-[12px] font-semibold text-slate-700">{urgencyLabel}</span>
          </div>
          <span
            className={cn(
              'shrink-0 rounded-full border px-2.5 py-1 font-bdo text-[10px] font-bold',
              canManageIdentity ? 'border-emerald-100 bg-emerald-50 text-emerald-600' : 'border-slate-200 bg-white text-slate-500'
            )}
          >
            {canManageIdentity ? 'Akses aktif' : 'Read only'}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white">
          <div className={cn('dashboard-identity-queue-progress h-full rounded-full transition-all duration-700', urgencyTone)} />
        </div>
        <p className="mt-2 font-bdo text-[11px] leading-relaxed font-medium text-slate-500">
          {safeCount > 0
            ? 'Buka antrean untuk mengecek dokumen dan memberi keputusan verifikasi.'
            : 'Antrean kosong. Jumlah baru akan muncul saat ada pengajuan identitas.'}
        </p>
      </div>

      <button
        type="button"
        onClick={handleOpenIdentityQueue}
        disabled={!canManageIdentity}
        title={canManageIdentity ? actionLabel : 'Role ini belum memiliki akses verify-identity'}
        className={cn(
          'group flex w-full items-center justify-center gap-2 rounded-xl py-3 font-clash text-sm font-medium transition-all active:scale-[0.98]',
          canManageIdentity
            ? 'border border-[#F8B5A8] bg-[#FFF1EE] text-[#8F2E20] hover:bg-[#FFD5CD]'
            : 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400'
        )}
      >
        {canManageIdentity ? actionLabel : 'Akses dibatasi'}
        <ChevronRight
          className={cn('h-4 w-4 transition-transform', canManageIdentity ? 'text-[#B93D2A] group-hover:translate-x-1' : 'text-slate-400')}
        />
      </button>
    </div>
  )
}

// ── Activity Feed ─────────────────────────────────────────────────────────────

const ACTIVITY_ICON: Record<RecentActivity['type'], React.ReactNode> = {
  booking: <CalendarCheck2 className="h-4 w-4 text-[#EA684F]" />,
  membership: <Users className="h-4 w-4 text-purple-400" />,
  payment: <CreditCard className="h-4 w-4 text-emerald-400" />
}

const ACTIVITY_BAR: Record<RecentActivity['type'], string> = {
  booking: 'bg-[#E35336] shadow-[0_0_10px_rgba(227,83,54,0.6)]',
  membership: 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.6)]',
  payment: 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]'
}

const ACTIVITY_DOT: Record<RecentActivity['type'], string> = {
  booking: 'bg-[#E35336]',
  membership: 'bg-purple-500',
  payment: 'bg-emerald-500'
}

const ACTIVITY_CARD_TONE: Record<RecentActivity['type'], string> = {
  booking: 'border-[#FFD5CD] bg-[#FFF1EE]/45',
  membership: 'border-purple-100 bg-purple-50/45',
  payment: 'border-emerald-100 bg-emerald-50/45'
}

const ACTIVITY_TYPE_LABEL: Record<RecentActivity['type'], string> = {
  booking: 'Booking',
  membership: 'Membership',
  payment: 'Pembayaran'
}

const ACTIVITY_TYPE_COLOR: Record<RecentActivity['type'], string> = {
  booking: 'text-[#B93D2A] bg-[#FFF1EE] border-[#FFD5CD]',
  membership: 'text-purple-600 bg-purple-50 border-purple-100',
  payment: 'text-emerald-600 bg-emerald-50 border-emerald-100'
}

function ActivityFeed({ items }: { items: RecentActivity[] }) {
  if (items.length === 0) {
    return (
      <div className="animate-fade-in-up flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-[22px] border border-dashed border-slate-200 bg-slate-50/70 py-12 text-center">
        <div className="rounded-2xl border border-slate-100 bg-white p-5">
          <Activity className="h-8 w-8 text-slate-300" />
        </div>
        <div>
          <p className="font-clash text-sm font-semibold text-slate-700">Belum ada aktivitas</p>
          <p className="mt-1 font-bdo text-[11px] text-slate-400">Aktivitas terbaru akan muncul di sini.</p>
        </div>
      </div>
    )
  }

  const counts = items.reduce(
    (acc, item) => {
      acc[item.type] += 1
      return acc
    },
    { booking: 0, membership: 0, payment: 0 } as Record<RecentActivity['type'], number>
  )

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(counts) as RecentActivity['type'][]).map((type) => (
          <div key={type} className={cn('rounded-2xl border px-3 py-2.5', ACTIVITY_CARD_TONE[type])}>
            <div className="flex items-center justify-between gap-2">
              <span className={cn('h-2 w-2 rounded-full', ACTIVITY_DOT[type])} />
              <span className="font-clash text-sm font-semibold text-slate-900 tabular-nums">{counts[type]}</span>
            </div>
            <p className="mt-1 truncate font-bdo text-[9px] font-bold tracking-wide text-slate-500 uppercase">{ACTIVITY_TYPE_LABEL[type]}</p>
          </div>
        ))}
      </div>

      <div className="dashboard-touch-scroll custom-scrollbar max-h-[430px] overflow-y-auto overscroll-contain pr-1 sm:max-h-[500px] xl:max-h-[560px]">
        <div className="relative flex flex-col gap-3 pl-3">
          <span className="pointer-events-none absolute top-4 bottom-4 left-[7px] w-px bg-linear-to-b from-[#F8B5A8] via-slate-200 to-transparent" />
          {items.map((item, index) => {
            const isFirst = index === 0
            const animDelayClass = `dashboard-activity-delay-${Math.min(index + 1, 10)}`

            return (
              <div
                key={`${item.type}-${item.id}`}
                className={cn(
                  'animate-fade-in-up group relative rounded-[20px] border bg-white p-4 transition-all duration-300 hover:-translate-y-0.5',
                  animDelayClass,
                  isFirst ? 'border-[#F8B5A8] bg-linear-to-br from-[#FFF1EE]/70 to-white' : 'border-slate-100 hover:border-[#F8B5A8]'
                )}
              >
                <span className={cn('absolute top-5 left-[-11px] h-3.5 w-3.5 rounded-full border-2 border-white', ACTIVITY_DOT[item.type])} />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border', ACTIVITY_CARD_TONE[item.type])}>
                      {ACTIVITY_ICON[item.type]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-clash text-sm leading-tight font-semibold text-slate-900">{item.title}</h3>
                        {isFirst && (
                          <span className="rounded-full border border-[#F8B5A8] bg-[#FFF1EE] px-2 py-0.5 font-bdo text-[9px] font-bold tracking-wide text-[#B93D2A] uppercase">
                            Terbaru
                          </span>
                        )}
                        <span
                          className={cn(
                            'rounded-full border px-2 py-0.5 font-bdo text-[9px] font-bold tracking-wide uppercase',
                            ACTIVITY_TYPE_COLOR[item.type]
                          )}
                        >
                          {ACTIVITY_TYPE_LABEL[item.type]}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 font-bdo text-[11px] leading-relaxed text-slate-500">{item.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className="rounded-full border border-slate-100 bg-slate-50 px-2.5 py-1 font-bdo text-[10px] font-semibold whitespace-nowrap text-slate-400">
                      {item.time}
                    </span>
                    <MoreHorizontal className="h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-500" />
                  </div>
                </div>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      ACTIVITY_BAR[item.type].split(' ')[0],
                      isFirst ? 'dashboard-activity-progress-full' : 'dashboard-activity-progress-wide'
                    )}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── OccupancyCard ─────────────────────────────────────────────────────────────

function OccupancyCard({ facilities }: { facilities: OccupancyFacility[] }) {
  const overall = facilities.length > 0 ? Math.round(facilities.reduce((sum, f) => sum + f.pct, 0) / facilities.length) : 0

  const busiest = facilities.length > 0 ? [...facilities].sort((a, b) => b.pct - a.pct)[0] : null
  const quietest = facilities.length > 0 ? [...facilities].sort((a, b) => a.pct - b.pct)[0] : null
  const overallLabel = overall >= 75 ? 'Padat' : overall >= 45 ? 'Stabil' : 'Lapang'
  const overallTone =
    overall >= 75
      ? 'text-red-600 bg-red-50 border-red-100'
      : overall >= 45
        ? 'text-[#B93D2A] bg-[#FFF1EE] border-[#FFD5CD]'
        : 'text-emerald-600 bg-emerald-50 border-emerald-100'
  const occupancyStyles = `
            .dashboard-occupancy-overall { width: ${overall}%; }
            ${facilities
              .map(
                (f, i) => `
                .dashboard-facility-delay-${i} { animation-delay: ${(i + 4) * 70}ms; }
                .dashboard-facility-dot-${i} { background-color: ${f.color}; }
                .dashboard-facility-progress-${i} { width: ${f.pct}%; background: linear-gradient(90deg, ${f.color}aa, ${f.color}); }
            `
              )
              .join('')}
        `

  return (
    <div className="animate-fade-in-up relative flex flex-col overflow-hidden rounded-[26px] border border-slate-200/80 bg-white delay-300">
      <style dangerouslySetInnerHTML={{ __html: occupancyStyles }} />
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-linear-to-r from-transparent via-[#F8B5A8] to-transparent" />

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <ShinyIcon className="h-10 w-10">
            <Activity className="h-4 w-4 text-white" />
          </ShinyIcon>
          <div className="min-w-0">
            <p className="font-bdo text-[10px] font-bold tracking-widest text-slate-400 uppercase">Real-time</p>
            <h2 className="font-clash text-base leading-tight font-semibold text-slate-900">Okupansi Lapangan</h2>
            <p className="font-bdo text-[11px] font-medium text-slate-500">{facilities.length} lapangan · kelas dihitung terpisah</p>
          </div>
        </div>
        <span className={cn('rounded-xl border px-3 py-1.5 font-bdo text-[10px] font-bold tracking-wide uppercase', overallTone)}>
          {overallLabel}
        </span>
      </div>

      <div className="px-4 pt-3 pb-4 sm:px-5">
        <div className="relative overflow-hidden rounded-[22px] border border-[#F8B5A8]/70 bg-[radial-gradient(circle_at_86%_12%,rgba(255,255,255,0.30),transparent_30%),linear-gradient(135deg,#EA684F_0%,#E35336_54%,#F08C78_100%)] p-3.5 text-white">
          <div className="pointer-events-none absolute -top-16 -right-12 h-32 w-32 rounded-full border border-white/20" />
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-bdo text-[10px] font-bold tracking-widest text-white/70 uppercase">Rata-rata Hari Ini</p>
                <div className="mt-1 flex items-end gap-2">
                  <span className="font-clash text-[3rem] leading-none font-bold tracking-normal">{overall}%</span>
                  <span className="mb-2 rounded-full border border-white/25 bg-white/15 px-3 py-1 font-bdo text-[10px] font-bold tracking-wide uppercase">
                    {overallLabel}
                  </span>
                </div>
              </div>
              <div className="hidden rounded-2xl border border-white/20 bg-white/15 px-3 py-2 text-right sm:block">
                <p className="font-bdo text-[9px] font-bold tracking-widest text-white/70 uppercase">Lapangan</p>
                <p className="font-clash text-lg font-semibold">{facilities.length}</p>
              </div>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/25">
              <div className="dashboard-occupancy-overall h-full rounded-full bg-white transition-all duration-700" />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="min-w-0 rounded-2xl border p-2.5 backdrop-blur-sm">
                <p className="font-bdo text-[9px] font-bold tracking-widest text-white/65 uppercase">Terpadat</p>
                <p className="mt-1 truncate font-clash text-sm font-semibold">{busiest?.name ?? '-'}</p>
                <p className="mt-0.5 font-bdo text-[10px] font-semibold text-white/80">{busiest ? `${busiest.pct}% terisi` : '0%'}</p>
              </div>
              <div className="min-w-0 rounded-2xl border p-2.5 backdrop-blur-sm">
                <p className="font-bdo text-[9px] font-bold tracking-widest text-white/65 uppercase">Terlapang</p>
                <p className="mt-1 truncate font-clash text-sm font-semibold">{quietest?.name ?? '-'}</p>
                <p className="mt-0.5 font-bdo text-[10px] font-semibold text-white/80">{quietest ? `${quietest.pct}% terisi` : '0%'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-[20px] border border-slate-100 bg-slate-50/70 p-2.5">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="font-bdo text-[10px] font-bold tracking-widest text-slate-400 uppercase">Detail Lapangan</span>
            <span className="font-bdo text-[10px] font-bold text-[#B93D2A]">{facilities.length} item</span>
          </div>
          {facilities.length > 0 ? (
            <div className="dashboard-touch-scroll custom-scrollbar max-h-[136px] space-y-2 overflow-y-auto overscroll-contain pr-1 sm:max-h-[148px]">
              {facilities.map((f, i) => {
                const facilityLabel = f.pct >= 75 ? 'Padat' : f.pct >= 45 ? 'Normal' : 'Lapang'
                return (
                  <div
                    key={f.name}
                    className={cn(
                      `dashboard-facility-delay-${i}`,
                      'animate-fade-in-up rounded-2xl border border-slate-100 bg-white p-2.5 transition-all hover:-translate-y-0.5 hover:border-[#F8B5A8]'
                    )}
                  >
                    <div className="mb-1.5 flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className={cn(`dashboard-facility-dot-${i}`, 'h-2.5 w-2.5 shrink-0 rounded-full')} />
                        <div className="min-w-0">
                          <p className="truncate font-clash text-[13px] font-semibold text-slate-900">{f.name}</p>
                          <p className="font-bdo text-[9px] font-semibold tracking-wide text-slate-400 uppercase">{facilityLabel}</p>
                        </div>
                      </div>
                      <span className="rounded-full border border-slate-100 bg-slate-50 px-2.5 py-1 font-clash text-[11px] font-semibold text-slate-800">
                        {f.pct}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className={cn(`dashboard-facility-progress-${i}`, 'occ-bar-inner h-full rounded-full')} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="py-6 text-center font-bdo text-sm text-slate-400">Belum ada data fasilitas.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Analytics Panel ───────────────────────────────────────────────────────────

function AnalyticsPanel({
  dailyRevenue,
  occupancyData,
  stats,
  currentMonthLabel,
  currentDayInMonth,
  onClose
}: {
  dailyRevenue: number[]
  occupancyData: OccupancyFacility[]
  stats: DashboardStats
  currentMonthLabel: string
  currentDayInMonth: number
  onClose: () => void
}) {
  const safeData = dailyRevenue && dailyRevenue.length > 0 ? dailyRevenue : []
  const elapsedData = getElapsedMonthRevenue(safeData, currentDayInMonth)
  const maxRev = Math.max(...safeData, 1)
  const avgRev = elapsedData.length > 0 ? elapsedData.reduce((a, b) => a + b, 0) / elapsedData.length : 0
  const peakValue = Math.max(...elapsedData, 0)
  const peakIdx = peakValue > 0 ? safeData.indexOf(peakValue) : -1
  const peakDay = peakIdx + 1
  const activeDays = elapsedData.filter((d) => d > 0).length
  const overallOcc = occupancyData.length > 0 ? Math.round(occupancyData.reduce((s, f) => s + f.pct, 0) / occupancyData.length) : 0

  const [selectedBar, setSelectedBar] = useState<number | null>(null)

  const kpis = [
    {
      label: 'Hari Puncak',
      value: peakIdx >= 0 ? `${peakDay} ${currentMonthLabel}` : '-',
      sub: formatRupiahFull(peakValue),
      accent: 'text-[#B93D2A]',
      icon: '🏆',
      bg: 'bg-[#FFF1EE] border-[#F8B5A8]',
      iconBg: 'bg-[#FFD5CD]'
    },
    {
      label: 'Rata-rata Harian',
      value: formatRevenue(Math.round(avgRev)),
      sub: `per hari berjalan`,
      accent: 'text-slate-800',
      icon: '📊',
      bg: 'bg-slate-50 border-slate-200',
      iconBg: 'bg-slate-100'
    },
    {
      label: 'Hari Aktif',
      value: `${activeDays}`,
      sub: `dari ${elapsedData.length} hari berjalan`,
      accent: 'text-emerald-700',
      icon: '✅',
      bg: 'bg-emerald-50 border-emerald-200',
      iconBg: 'bg-emerald-100'
    },
    {
      label: 'Rerata Okupansi',
      value: `${overallOcc}%`,
      sub: `${occupancyData.length} lapangan`,
      accent: 'text-violet-700',
      icon: '🏟️',
      bg: 'bg-violet-50 border-violet-200',
      iconBg: 'bg-violet-100'
    }
  ]
  const analyticsStyles = `
            ${kpis.map((_, i) => `.dashboard-analytics-kpi-${i} { animation-delay: ${i * 70}ms; }`).join('')}
            ${safeData
              .map((val, i) => {
                const heightPct = maxRev > 0 ? (val / maxRev) * 92 : 2
                const isPeak = i === peakIdx
                const isAboveAvg = val > avgRev && !isPeak
                const isSelected = i === selectedBar
                return `
                    .dashboard-analytics-bar-${i} {
                        height: ${Math.max(heightPct, 2)}%;
                        background: ${isPeak ? 'linear-gradient(180deg, #E35336, #B93D2A)' : isAboveAvg ? 'linear-gradient(180deg, #F08C78, #EA684F)' : '#e2e8f0'};
                        box-shadow: ${isPeak ? '0 0 8px rgba(227,83,54,.4)' : 'none'};
                        outline: ${isSelected ? '2px solid rgba(227,83,54,.6)' : 'none'};
                    }
                `
              })
              .join('')}
            .dashboard-analytics-avg-line { bottom: calc(${Math.min((avgRev / maxRev) * 92, 92)}% + 12px); }
            ${occupancyData
              .map(
                (f, i) => `
                .dashboard-analytics-facility-${i} { animation-delay: ${i * 60 + 200}ms; }
                .dashboard-analytics-dot-${i} { background-color: ${f.color}; box-shadow: 0 0 6px ${f.color}70; }
                .dashboard-analytics-progress-${i} {
                    width: ${f.pct}%;
                    background: linear-gradient(90deg, ${f.color}aa, ${f.color});
                    animation-delay: ${i * 60 + 300}ms;
                }
            `
              )
              .join('')}
        `

  return (
    <div className="analytics-dark-enter card-glint relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
      <style dangerouslySetInnerHTML={{ __html: analyticsStyles }} />
      <div className="pointer-events-none absolute top-0 right-0 left-0 z-10 h-px bg-linear-to-r from-transparent via-[#F08C78]/60 to-transparent" />
      <div className="pointer-events-none absolute top-0 right-0 h-72 w-72 translate-x-1/3 -translate-y-1/2 rounded-full bg-[#FFF1EE]/60 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 -translate-x-1/3 translate-y-1/2 rounded-full bg-violet-50/40 blur-3xl" />

      <div className="relative z-10 flex items-center justify-between border-b border-slate-100 bg-linear-to-r from-[#FFF1EE]/60 via-white to-white px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-[#F08C78] via-[#E35336] to-[#B93D2A] text-white shadow-[0_14px_28px_-18px_rgba(227,83,54,0.95)]">
            <BarChart3 className="h-4 w-4 text-white" />
            <span className="pointer-events-none absolute top-[5px] right-[7px] left-[7px] h-[4px] rounded-full bg-white/35 blur-[1px]" />
          </div>
          <div>
            <p className="font-bdo text-[10px] font-bold tracking-widest text-[#E35336] uppercase">Analitik Mendalam</p>
            <p className="font-clash text-lg leading-tight font-semibold text-slate-900">Ringkasan {currentMonthLabel}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-xl border border-transparent p-2 text-slate-400 transition-colors hover:border-slate-200 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Tutup panel analitik"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="relative z-10 grid grid-cols-2 gap-3 border-b border-slate-100 p-6 sm:grid-cols-4">
        {kpis.map((kpi, i) => (
          <div
            key={kpi.label}
            className={cn(`dashboard-analytics-kpi-${i}`, 'animate-fade-in-up relative overflow-hidden rounded-2xl border p-4', kpi.bg)}
          >
            <div className="absolute top-3 right-3 text-base opacity-50">{kpi.icon}</div>
            <p className="mb-2 font-bdo text-[9px] font-bold tracking-widest text-slate-400 uppercase">{kpi.label}</p>
            <p className={cn('font-clash text-xl leading-tight font-bold', kpi.accent)}>{kpi.value}</p>
            <p className="mt-1.5 font-bdo text-[10px] text-slate-500">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {safeData.length > 0 && (
        <div className="relative z-10 border-b border-slate-100 px-6 py-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-bdo text-[9px] font-bold tracking-widest text-slate-400 uppercase">Distribusi Pendapatan Harian</p>
              <p className="mt-0.5 font-clash text-sm font-semibold text-slate-800">{currentMonthLabel}</p>
            </div>
            <div className="flex items-center gap-3 font-bdo text-[10px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-sm bg-[#E35336] shadow-[0_0_4px_rgba(227,83,54,0.4)]"></span>Puncak
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-sm bg-[#F8B5A8]"></span>Di atas rata-rata
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-sm bg-slate-200"></span>Rendah
              </span>
            </div>
          </div>

          {selectedBar !== null && (
            <div className="animate-scale-in mb-3 flex items-center justify-between rounded-2xl border border-[#F8B5A8] bg-[#FFF1EE] px-4 py-3">
              <div>
                <p className="font-bdo text-[9px] font-bold tracking-widest text-[#E35336]/80 uppercase">Detail Hari</p>
                <p className="font-clash text-base font-bold text-slate-900">{formatRupiahFull(safeData[selectedBar])}</p>
              </div>
              <div className="text-right">
                <p className="font-bdo text-[9px] tracking-wide text-slate-500 uppercase">
                  {selectedBar + 1} {currentMonthLabel}
                </p>
                <p
                  className={cn(
                    'mt-0.5 font-bdo text-[10px] font-bold',
                    safeData[selectedBar] > avgRev ? 'text-emerald-600' : safeData[selectedBar] === 0 ? 'text-slate-400' : 'text-rose-500'
                  )}
                >
                  {safeData[selectedBar] > avgRev
                    ? '↑ Di atas rata-rata'
                    : safeData[selectedBar] === 0
                      ? '— Tidak ada transaksi'
                      : '↓ Di bawah rata-rata'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBar(null)}
                className="ml-3 text-slate-400 transition-colors hover:text-slate-700"
                aria-label="Tutup detail hari analitik"
                title="Tutup detail hari analitik"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="relative rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
            <div className="flex h-36 w-full items-end gap-[2px] sm:gap-[3px]">
              {safeData.map((val, i) => {
                const heightPct = maxRev > 0 ? (val / maxRev) * 92 : 2
                const isPeak = i === peakIdx
                const isAboveAvg = val > avgRev && !isPeak
                const isSelected = i === selectedBar
                return (
                  <div
                    key={i}
                    className={cn(`dashboard-analytics-bar-${i}`, 'group relative flex-1 cursor-pointer rounded-t-[3px]')}
                    title={`${i + 1} ${currentMonthLabel}: ${formatRupiahFull(val)}`}
                    onClick={() => setSelectedBar(selectedBar === i ? null : i)}
                  >
                    {isPeak && (
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 font-bdo text-[9px] font-bold whitespace-nowrap text-[#E35336]">
                        ▲
                      </span>
                    )}
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                      <div className="rounded-lg border border-[#F8B5A8] bg-white px-2 py-1 shadow-md">
                        <p className="font-bdo text-[9px] font-bold text-[#E35336]">{i + 1}</p>
                        <p className="font-clash text-[10px] font-semibold text-slate-800">{formatRevenue(val)}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="dashboard-analytics-avg-line pointer-events-none absolute right-3 left-3 border-t border-dashed border-[#EA684F]/40">
              <span className="absolute -top-3.5 right-0 rounded bg-white px-1 font-bdo text-[8px] font-bold text-[#E35336]/70">avg</span>
            </div>
          </div>
          <div className="mt-2 flex justify-between font-bdo text-[9px] text-slate-400">
            <span>1</span>
            <span className="font-bold text-[#E35336]/70">{currentMonthLabel}</span>
            <span>{safeData.length}</span>
          </div>
        </div>
      )}

      {occupancyData.length > 0 && (
        <div className="relative z-10 px-6 pt-5 pb-6">
          <p className="mb-3 font-bdo text-[9px] font-bold tracking-widest text-slate-400 uppercase">Breakdown Fasilitas</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {occupancyData.map((f, i) => (
              <div
                key={f.name}
                className={cn(
                  `dashboard-analytics-facility-${i}`,
                  'animate-fade-in-up flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 transition-all duration-200 hover:bg-white hover:shadow-xs'
                )}
              >
                <div className={cn(`dashboard-analytics-dot-${i}`, 'h-3 w-3 shrink-0 rounded-full')} />
                <span className="min-w-0 flex-1 truncate font-bdo text-[12px] text-slate-600">{f.name}</span>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="h-[3px] w-16 overflow-hidden rounded-full bg-slate-200">
                    <div className={cn(`dashboard-analytics-progress-${i}`, 'progress-fill h-full rounded-full')} />
                  </div>
                  <span className="w-8 text-right font-clash text-[13px] font-semibold text-slate-700 tabular-nums">{f.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── ReportPrintTemplate ───────────────────────────────────────────────────────

interface ReportPrintTemplateProps {
  stats: DashboardStats
  revenueTrend: number
  dailyRevenue: number[]
  currentDayInMonth: number
  currentMonthLabel: string
  occupancyData: OccupancyFacility[]
}

function ReportPrintTemplate({ stats, revenueTrend, dailyRevenue, currentDayInMonth, currentMonthLabel, occupancyData }: ReportPrintTemplateProps) {
  const now = new Date()
  const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
  const reportNo = `LPR/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`
  const trendSign = revenueTrend >= 0 ? '+' : ''

  const safeRevenue = dailyRevenue ?? []
  const elapsedRevenue = getElapsedMonthRevenue(safeRevenue, currentDayInMonth)
  const activeDays = elapsedRevenue.filter((v) => v > 0).length
  const avgRevenue = elapsedRevenue.length > 0 ? Math.round(elapsedRevenue.reduce((a, b) => a + b, 0) / elapsedRevenue.length) : 0
  const peakRevenue = Math.max(...elapsedRevenue, 0)
  const peakDay = peakRevenue > 0 ? safeRevenue.indexOf(peakRevenue) + 1 : null

  const rp = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v)
  const num = (v: number) => new Intl.NumberFormat('id-ID').format(v)

  const rows: { kategori: string; detail: string; satuan: string; nilai: string }[] = [
    { kategori: 'Pendapatan', detail: 'Total Pendapatan Bulan Ini', satuan: currentMonthLabel, nilai: rp(stats.totalRevenue) },
    { kategori: 'Pendapatan', detail: 'Rata-rata Pendapatan Harian', satuan: `${elapsedRevenue.length} hari berjalan`, nilai: rp(avgRevenue) },
    {
      kategori: 'Pendapatan',
      detail: `Puncak Pendapatan Harian${peakDay ? ` (Tgl ${peakDay})` : ''}`,
      satuan: peakDay ? '1 hari' : '-',
      nilai: rp(peakRevenue)
    },
    { kategori: 'Trend', detail: 'Perubahan vs Bulan Lalu', satuan: 'MoM', nilai: `${trendSign}${revenueTrend}%` },
    { kategori: 'Operasional', detail: 'Booking Hari Ini', satuan: 'transaksi', nilai: num(stats.todaysBookings) },
    { kategori: 'Operasional', detail: 'Membership Aktif', satuan: 'anggota', nilai: num(stats.activeMemberships) },
    { kategori: 'Operasional', detail: 'Fasilitas Beroperasi', satuan: 'unit', nilai: num(stats.activeFacilities) },
    ...(occupancyData ?? []).map((f) => ({
      kategori: 'Okupansi',
      detail: f.name,
      satuan: 'tingkat pemakaian',
      nilai: `${f.pct}%`
    }))
  ]

  const MINIMUM_ROWS = 10
  const fillerCount = Math.max(0, MINIMUM_ROWS - rows.length)

  return (
    <div className="print-report-template">
      <div className="prt-a4-page">
        <div className="prt-header">
          <div className="prt-header-left">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo laporan cetak dari public/ (BES.png) */}
            <img src="/BES.png" alt="Brawijaya Edusport" className="prt-logo-img" />
          </div>
          <div className="prt-header-right">
            <div className="prt-company-name-main">BRAWIJAYA EDUSPORT</div>
            <div className="prt-company-name-sub">PT BRAWIJAYA MULTI USAHA</div>
            <div className="prt-company-address">
              Jln. Terusan Cibogo No.1 Kota Malang
              <br />
              NPWP 3295.65.312
            </div>
            <hr className="prt-header-divider" />
            <div className="prt-doc-title">Laporan Operasional</div>
          </div>
        </div>

        <div className="prt-meta-outer">
          <div className="prt-meta-left">
            <div className="prt-payment-note">
              Bank BRI — Rek. 0048-01-123456-50-9
              <br />
              a.n. PT Brawijaya Multi Usaha
            </div>
          </div>
          <div className="prt-meta-right">
            <table>
              <tbody>
                <tr>
                  <td className="meta-label-col">No. Laporan</td>
                  <td className="meta-value-col meta-value-bold">{reportNo}</td>
                </tr>
                <tr>
                  <td className="meta-label-col">Tanggal</td>
                  <td className="meta-value-col">{dateStr}</td>
                </tr>
                <tr>
                  <td className="meta-label-col">Periode</td>
                  <td className="meta-value-col">{currentMonthLabel}</td>
                </tr>
                <tr>
                  <td className="meta-label-col">Dibuat oleh</td>
                  <td className="meta-value-col">Admin Sistem</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <table className="prt-report-table">
          <thead>
            <tr>
              <th className="prt-col-no">No</th>
              <th className="prt-col-category">Kategori</th>
              <th className="prt-col-detail">Detail</th>
              <th className="prt-col-unit">Satuan</th>
              <th className="prt-col-value">Nilai</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td className="rt-center">{i + 1}</td>
                <td>{row.kategori}</td>
                <td>{row.detail}</td>
                <td className="rt-center">{row.satuan}</td>
                <td className="rt-right rt-bold">{row.nilai}</td>
              </tr>
            ))}
            {Array.from({ length: fillerCount }).map((_, i) => (
              <tr key={`filler-${i}`} className="rt-filler">
                <td className="rt-center">{rows.length + i + 1}</td>
                <td>—</td>
                <td>—</td>
                <td className="rt-center">—</td>
                <td className="rt-right">—</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="prt-bottom-row">
          <div className="prt-keterangan">
            <span className="prt-keterangan-label">Keterangan</span>
            <div></div>
          </div>
          <div className="prt-summary">
            <table>
              <tbody>
                <tr>
                  <td>Total Pendapatan</td>
                  <td>{rp(stats.totalRevenue)}</td>
                </tr>
                <tr>
                  <td>Booking Hari Ini</td>
                  <td>{num(stats.todaysBookings)} transaksi</td>
                </tr>
                <tr>
                  <td>Membership Aktif</td>
                  <td>{num(stats.activeMemberships)} orang</td>
                </tr>
                <tr className="sum-total">
                  <td>Trend Bulan Ini</td>
                  <td>
                    {trendSign}
                    {revenueTrend}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="prt-page-footer">
          <span>Halaman 1 dari 1</span>
          <span className="dashboard-print-date">Dicetak: {dateStr}</span>
        </div>
      </div>
    </div>
  )
}

// ── Gym Traffic Widget ────────────────────────────────────────────────────────

type GymTrafficLevel = 'Low Occupancy' | 'Medium Occupancy' | 'High Occupancy' | 'We Are Close'

const TRAFFIC_OPTIONS: {
  label: string
  value: GymTrafficLevel
  note: string
  summary: string
  Icon: React.ElementType
  dotColor: string
  dotHalo: string
  meter: string
  color: string
  active: string
  icon: string
  iconActive: string
}[] = [
  {
    label: 'Low',
    value: 'Low Occupancy',
    note: 'Area nyaman',
    summary: 'Publik melihat kondisi gym sedang ringan dan nyaman digunakan.',
    Icon: Leaf,
    dotColor: '#22c55e',
    dotHalo: 'rgba(34,197,94,0.28)',
    meter: '#22c55e',
    color: 'border-emerald-100 bg-white text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50/50',
    active: 'border-emerald-200 bg-linear-to-br from-emerald-50 via-white to-emerald-50 text-emerald-800',
    icon: 'bg-emerald-50 text-emerald-600',
    iconActive: 'bg-emerald-500 text-white'
  },
  {
    label: 'Medium',
    value: 'Medium Occupancy',
    note: 'Mulai ramai',
    summary: 'Admin memberi sinyal area mulai terisi dan perlu ekspektasi antre.',
    Icon: SignalMedium,
    dotColor: '#eab308',
    dotHalo: 'rgba(234,179,8,0.28)',
    meter: '#EA684F',
    color: 'border-[#FFD5CD] bg-white text-[#8F2E20] hover:border-[#F8B5A8] hover:bg-[#FFF1EE]/60',
    active: 'border-[#F8B5A8] bg-linear-to-br from-[#FFF1EE] via-white to-[#FFD5CD]/70 text-[#8F2E20]',
    icon: 'bg-[#FFF1EE] text-[#E35336]',
    iconActive: 'bg-[#E35336] text-white'
  },
  {
    label: 'High',
    value: 'High Occupancy',
    note: 'Padat',
    summary: 'Kondisi diprioritaskan sebagai peringatan bahwa gym sedang padat.',
    Icon: Flame,
    dotColor: '#ef4444',
    dotHalo: 'rgba(239,68,68,0.28)',
    meter: '#ef4444',
    color: 'border-red-100 bg-white text-red-700 hover:border-red-200 hover:bg-red-50/55',
    active: 'border-red-200 bg-linear-to-br from-red-50 via-white to-red-50 text-red-800',
    icon: 'bg-red-50 text-red-600',
    iconActive: 'bg-red-500 text-white'
  },
  {
    label: 'We Are Close',
    value: 'We Are Close',
    note: 'Tutup publik',
    summary: 'Status publik berubah jelas bahwa layanan gym sedang tidak dibuka.',
    Icon: DoorClosed,
    dotColor: '#15678D',
    dotHalo: 'rgba(21,103,141,0.26)',
    meter: '#15678D',
    color: 'border-sky-100 bg-white text-[#15678D] hover:border-sky-200 hover:bg-sky-50/55',
    active: 'border-sky-200 bg-linear-to-br from-sky-50 via-white to-sky-50 text-[#15678D]',
    icon: 'bg-sky-50 text-[#15678D]',
    iconActive: 'bg-[#15678D] text-white'
  }
]

function GymTrafficWidget({ current, visitsToday }: { current: string; visitsToday: number }) {
  const [saving, setSaving] = useState(false)
  const updateGymTraffic = useUpdateGymTraffic()

  const set = (value: GymTrafficLevel) => {
    if (value === current || saving) return
    setSaving(true)
    // Laravel membalas back() tanpa flash → tidak ada toast sukses; nilainya sendiri yang berubah di UI.
    updateGymTraffic
      .mutateAsync(value)
      .catch((error) => toast.error(extractApiError(error).message))
      .finally(() => setSaving(false))
  }

  const activeOption = TRAFFIC_OPTIONS.find((opt) => opt.value === current) ?? TRAFFIC_OPTIONS[0]
  const activeIndex = Math.max(
    0,
    TRAFFIC_OPTIONS.findIndex((opt) => opt.value === activeOption.value)
  )
  const meterPercent = ((activeIndex + 1) / TRAFFIC_OPTIONS.length) * 100
  const trafficStyles = `.dashboard-gym-traffic-meter { background: conic-gradient(${activeOption.meter} ${meterPercent}%, rgba(255,255,255,.28) 0); }`

  return (
    <div className="animate-scale-in group relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white transition-all duration-300 hover:-translate-y-0.5">
      <style dangerouslySetInnerHTML={{ __html: trafficStyles }} />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-[#F8B5A8] to-transparent" />
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <ShinyIcon className="h-10 w-10">
            <Gauge size={15} className="text-white" />
          </ShinyIcon>
          <div className="min-w-0">
            <p className="font-bdo text-[10px] font-bold tracking-widest text-slate-400 uppercase">Operasional</p>
            <p className="font-clash text-base leading-tight font-semibold text-slate-900">Gym Traffic</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-bdo text-[10px] font-bold tracking-wide text-slate-600 uppercase">
          <LiveDot size="xs" color={saving ? '#f59e0b' : '#22c55e'} halo={saving ? 'rgba(245,158,11,0.28)' : 'rgba(34,197,94,0.28)'} />
          {saving ? 'Syncing' : 'Live'}
        </span>
      </div>

      <div className="relative z-10 flex flex-col gap-4 px-5 pb-5">
        <div className="relative overflow-hidden rounded-[26px] border border-[#F8B5A8]/70 bg-[radial-gradient(circle_at_18%_12%,rgba(255,255,255,0.42),transparent_24%),linear-gradient(135deg,#EA684F_0%,#E35336_52%,#F08C78_100%)] p-4 text-white">
          <div className="pointer-events-none absolute -top-16 -right-14 h-48 w-48 rounded-full border border-white/20" />
          <div className="pointer-events-none absolute top-8 -right-6 h-28 w-28 rounded-full bg-white/10 blur-xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-12 h-44 w-44 rounded-full blur-2xl" />
          <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-linear-to-r from-transparent via-white/55 to-transparent" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/25 px-3 py-1 font-bdo text-[9px] font-bold tracking-widest text-white uppercase backdrop-blur-sm">
                <LiveDot size="xs" color={activeOption.dotColor} halo={activeOption.dotHalo} />
                Status Publik
              </div>
              <p className="mt-4 font-clash text-[1.75rem] leading-none font-semibold tracking-normal sm:text-[2rem]">{activeOption.label}</p>
              <p className="mt-2 max-w-[300px] font-bdo text-[12px] leading-relaxed">{activeOption.summary}</p>
              {/* Acuan dari meja check-in (tahap D); labelnya tetap dipilih staff. */}
              <p className="mt-2 font-bdo text-[11px] font-semibold text-white/90">Kunjungan gym tercatat hari ini: {visitsToday}</p>
            </div>
            <div className="dashboard-gym-traffic-meter relative flex h-[86px] w-[86px] shrink-0 items-center justify-center rounded-full p-[7px]">
              <div className="flex h-full w-full flex-col items-center justify-center rounded-full border border-[#FFD5CD]/70 bg-white text-center">
                <span className="font-bdo text-[8px] font-bold tracking-widest text-[#EA684F] uppercase">Mode</span>
                <span className="font-clash text-lg leading-none font-semibold text-slate-950">{activeIndex + 1}/4</span>
              </div>
            </div>
          </div>

          <div className="relative mt-5 grid grid-cols-4 gap-2">
            {TRAFFIC_OPTIONS.map((opt, index) => {
              const isActive = current === opt.value
              return (
                <div key={opt.value} className="flex flex-col gap-1.5">
                  <span className={cn('h-1.5 rounded-full transition-all duration-300', index <= activeIndex ? 'bg-white' : 'bg-white/24')} />
                  <span className={cn('truncate font-bdo text-[9px] font-bold tracking-wide uppercase', isActive ? 'text-white' : 'text-white/55')}>
                    {opt.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {TRAFFIC_OPTIONS.map((opt) => {
            const isActive = current === opt.value
            const OptionIcon = opt.Icon
            return (
              <button
                key={opt.value}
                type="button"
                disabled={saving}
                onClick={() => set(opt.value)}
                className={cn(
                  'relative min-h-[76px] overflow-hidden rounded-[20px] border px-4 py-3 text-left transition-all duration-200',
                  'shadow-[0_14px_28px_-26px_rgba(227,83,54,0.45)] hover:-translate-y-0.5 hover:shadow-[0_18px_32px_-27px_rgba(227,83,54,0.55)]',
                  'disabled:cursor-not-allowed disabled:opacity-60',
                  isActive ? opt.active : opt.color
                )}
              >
                <span className="pointer-events-none absolute inset-x-4 top-0 h-px bg-linear-to-r from-transparent via-white to-transparent" />
                <span className="flex h-full items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-all duration-200',
                        isActive ? opt.iconActive : opt.icon
                      )}
                    >
                      <OptionIcon className="h-[17px] w-[17px]" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-clash text-sm leading-tight font-semibold">{opt.label}</span>
                      <span className="mt-1.5 block font-bdo text-[10px] leading-tight text-slate-400">{opt.note}</span>
                    </span>
                  </span>
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border transition-colors',
                      isActive ? 'border-white bg-white/80' : 'border-slate-100 bg-slate-50'
                    )}
                  >
                    <LiveDot size="sm" color={opt.dotColor} halo={opt.dotHalo} />
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Banner Modal ──────────────────────────────────────────────────────────────

interface BannerModalState {
  open: boolean
  editing: InfoBannerItem | null
}

function DashBannerModal({ state, onClose }: { state: BannerModalState; onClose: () => void }) {
  const { editing } = state
  const [form, setForm] = useState({
    message: editing?.message ?? '',
    isActive: editing?.isActive ?? true,
    sortOrder: editing?.sortOrder ?? 0
  })
  const [processing, setProcessing] = useState(false)
  const createBanner = useCreateInfoBanner()
  const updateBanner = useUpdateInfoBanner()
  const data = form
  const setData = (key: keyof typeof form, value: string | number | boolean) => setForm((prev) => ({ ...prev, [key]: value }) as typeof form)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)
    const request = editing ? updateBanner.mutateAsync({ id: editing.id, payload: data }) : createBanner.mutateAsync(data)
    request
      .then(() => {
        toast.success(editing ? 'Banner updated.' : 'Banner created.')
        onClose()
      })
      .catch((error) => {
        toast.error(extractApiError(error).message)
        setProcessing(false)
      })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <ShinyIcon className="h-9 w-9">
              <Megaphone size={14} className="text-white" />
            </ShinyIcon>
            <div>
              <p className="font-bdo text-[10px] font-bold tracking-widest text-slate-400 uppercase">Info Banner</p>
              <p className="font-clash text-sm leading-tight font-semibold text-slate-800">{editing ? 'Edit Banner' : 'Tambah Banner'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Tutup modal info banner"
            title="Tutup modal info banner"
          >
            <X size={15} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5">
          <div className="flex flex-col gap-1.5">
            <label className="font-bdo text-[11px] font-bold tracking-widest text-slate-500 uppercase">Pesan</label>
            <textarea
              value={data.message}
              onChange={(e) => setData('message', e.target.value)}
              rows={3}
              maxLength={255}
              required
              placeholder="Contoh: UB Sport Center Buka Setiap Hari: 06.00 - 21.00 WIB"
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-bdo text-sm text-slate-800 placeholder-slate-400 transition-all duration-150 focus:border-[#F08C78] focus:bg-white focus:ring-2 focus:ring-[#FFD5CD] focus:outline-hidden"
            />
            <p className="text-right font-bdo text-[10px] text-slate-400 tabular-nums">{data.message.length}/255</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-bdo text-[11px] font-bold tracking-widest text-slate-500 uppercase">Urutan</label>
            <input
              type="number"
              min={0}
              value={data.sortOrder}
              onChange={(e) => setData('sortOrder', parseInt(e.target.value, 10) || 0)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-bdo text-sm text-slate-800 transition-all duration-150 focus:border-[#F08C78] focus:bg-white focus:ring-2 focus:ring-[#FFD5CD] focus:outline-hidden"
              aria-label="Urutan info banner"
              title="Urutan info banner"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition-colors hover:bg-slate-100/80">
            <input
              type="checkbox"
              checked={data.isActive}
              onChange={(e) => setData('isActive', e.target.checked)}
              className="h-4 w-4 accent-[#E35336]"
            />
            <span className="font-bdo text-sm text-slate-700">Tampilkan banner (aktif)</span>
          </label>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-100 px-4 py-2.5 font-clash text-sm font-semibold text-slate-600 ring-1 ring-slate-200/70 transition-all hover:-translate-y-px hover:bg-slate-200"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={processing || !data.message.trim()}
              className="relative rounded-xl bg-linear-to-br from-[#EA684F] to-[#E35336] px-5 py-2.5 font-clash text-sm font-semibold text-white shadow-[0_3px_10px_rgba(15,23,42,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all hover:-translate-y-px hover:shadow-[0_5px_16px_rgba(15,23,42,0.26)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="pointer-events-none absolute top-0 right-0 left-0 h-px rounded-t-xl bg-white/20" />
              {processing ? 'Menyimpan…' : editing ? 'Simpan Perubahan' : 'Tambah Banner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── InfoBanner Panel ──────────────────────────────────────────────────────────

function DashInfoBannerPanel({ banners, onAdd, onEdit }: { banners: InfoBannerItem[]; onAdd: () => void; onEdit: (b: InfoBannerItem) => void }) {
  const [items, setItems] = useState<InfoBannerItem[]>(banners)
  useEffect(() => setItems(banners), [banners])
  const activeCount = banners.filter((banner) => banner.isActive).length
  const reorderBanners = useReorderInfoBanners()
  const deleteBanner = useDeleteInfoBanner()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = items.findIndex((i) => i.id.toString() === active.id)
    const newIdx = items.findIndex((i) => i.id.toString() === over.id)
    const reordered = arrayMove(items, oldIdx, newIdx)
    setItems(reordered)
    // Laravel reorder membalas back() tanpa flash → tidak ada toast sukses, sama seperti panel CMS lain.
    reorderBanners.mutate(
      reordered.map((item) => item.id),
      { onError: (error) => toast.error(extractApiError(error).message) }
    )
  }

  const handleDelete = (b: InfoBannerItem) => {
    if (!confirm(`Hapus banner "${b.message.substring(0, 40)}…"?`)) return
    deleteBanner.mutate(b.id, {
      onSuccess: () => toast.success('Banner deleted.'),
      onError: (error) => toast.error(extractApiError(error).message)
    })
  }

  return (
    <div className="animate-scale-in card-glint relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white delay-100">
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-linear-to-r from-transparent via-[#F8B5A8] to-transparent" />
      <div className="pointer-events-none absolute -top-20 -left-16 h-56 w-56 rounded-full bg-[#FFF1EE] blur-3xl" />
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <ShinyIcon className="h-10 w-10">
            <Megaphone size={15} className="text-white" />
          </ShinyIcon>
          <div className="min-w-0">
            <p className="font-bdo text-[10px] font-bold tracking-widest text-slate-400 uppercase">Konten</p>
            <p className="font-clash text-base leading-tight font-semibold text-slate-900">Info Banner</p>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <span className="flex h-7 min-w-7 items-center justify-center rounded-xl bg-amber-50 px-2 font-bdo text-[11px] font-bold text-amber-600 ring-1 ring-amber-200/80">
              {banners.length}
            </span>
            <span className="rounded-xl border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 font-bdo text-[10px] font-bold tracking-wide text-emerald-700 uppercase">
              {activeCount} aktif
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="relative inline-flex items-center gap-1.5 rounded-2xl bg-linear-to-br from-[#EA684F] to-[#B93D2A] px-4 py-2.5 font-clash text-[12px] font-semibold text-white shadow-[0_14px_24px_-16px_rgba(227,83,54,0.9),inset_0_1px_0_rgba(255,255,255,0.22)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_30px_-18px_rgba(227,83,54,0.95)] active:scale-[0.98]"
        >
          <span className="pointer-events-none absolute top-0 right-3 left-3 h-px rounded-t-xl bg-white/35" />
          <Plus size={13} />
          Tambah
        </button>
      </div>
      <div className="relative z-10 border-t border-slate-100/80 px-5 pt-4 pb-5">
        {items.length === 0 ? (
          <div className="flex min-h-[230px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-300 shadow-xs ring-1 ring-slate-200/80">
              <Megaphone size={18} />
            </div>
            <div>
              <p className="font-clash text-sm font-semibold text-slate-700">Belum ada banner</p>
              <p className="mt-1 font-bdo text-[11px] text-slate-400">Tambahkan informasi publik pertama.</p>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              'dashboard-touch-scroll custom-scrollbar min-h-0 overflow-y-auto overscroll-contain pr-1',
              items.length > 3 && 'max-h-[326px]'
            )}
          >
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map((i) => i.id.toString())} strategy={verticalListSortingStrategy}>
                <div className="flex min-h-0 flex-col gap-2">
                  {items.map((b) => (
                    <SortableListItem key={b.id} id={b.id.toString()}>
                      <div className="group relative flex min-h-[96px] items-start justify-between gap-3 overflow-hidden rounded-2xl border border-slate-200/80 bg-linear-to-br from-slate-50 to-white px-4 py-3.5 shadow-[0_10px_26px_-24px_rgba(15,23,42,0.65)] transition-all hover:-translate-y-0.5 hover:border-[#F8B5A8] hover:shadow-[0_18px_34px_-28px_rgba(227,83,54,0.65)]">
                        <span className="pointer-events-none absolute inset-y-4 left-0 w-[3px] rounded-r-full bg-linear-to-b from-[#F08C78] via-[#E35336] to-transparent opacity-70" />
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 font-clash text-[14px] leading-snug font-medium text-slate-800">{b.message}</p>
                          <div className="mt-2.5 flex flex-wrap items-center gap-2">
                            {b.isActive ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-bdo text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200 ring-inset">
                                <LiveDot size="xs" color="#34d399" halo="rgba(52,211,153,0.28)" />
                                Aktif
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 font-bdo text-[10px] font-bold text-slate-500 ring-1 ring-slate-200 ring-inset">
                                <LiveDot size="xs" color="#cbd5e1" halo="rgba(148,163,184,0.22)" />
                                Nonaktif
                              </span>
                            )}
                            <span className="rounded-full bg-white px-2.5 py-1 font-bdo text-[10px] font-bold text-slate-400 tabular-nums ring-1 ring-slate-200/80">
                              #{b.sortOrder}
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onEdit(b)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-500 ring-1 ring-slate-200/80 transition-all hover:-translate-y-px hover:bg-amber-50 hover:text-amber-600 hover:ring-amber-200"
                            aria-label="Edit banner"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(b)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-400 ring-1 ring-rose-200/80 transition-all hover:-translate-y-px hover:bg-rose-100 hover:text-rose-600"
                            aria-label="Hapus banner"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </SortableListItem>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { data, isLoading } = useDashboard()
  const { user } = useAuth()
  const access = createAccessChecker(user?.role, user?.permissions)

  // LOADING: selama isLoading / !data, tetap render layout yang SAMA lewat fallback aman
  // (angka 0, array [], string '') supaya struktur tak pernah hilang — kedip kosong sesaat OK.
  const dash = isLoading || !data ? DASHBOARD_FALLBACK : data
  const stats = dash.stats
  const revenueTrend = dash.revenueTrend
  const dailyRevenue = dash.dailyRevenue
  const daysInMonth = dash.daysInMonth
  const currentDayInMonth = dash.currentDayInMonth
  const currentMonthLabel = dash.currentMonthLabel
  const occupancyData = dash.occupancyData
  const recentActivity = dash.recentActivity

  const firstName = user?.name?.split(' ')[0] ?? 'Admin'
  const trendPositive = revenueTrend >= 0
  const canManageIdentity = access.can([PERMISSIONS.IDENTITY_VERIFY])
  const revenueDayLimit = Math.min(daysInMonth ?? dailyRevenue?.length ?? 31, Math.max(1, currentDayInMonth ?? new Date().getDate()))

  // Mini sparkline for hero card (last 20 days)
  const sparkData = (dailyRevenue ?? []).slice(-20)
  const sparkMax = Math.max(...sparkData, 1)
  const sparkStyles = sparkData
    .map((val, i) => {
      const h = sparkMax > 0 ? Math.max((val / sparkMax) * 26, val > 0 ? 3 : 1.5) : 1.5
      const background = val > 0 ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.12)'
      return `.dashboard-spark-${i} { height: ${h}px; background: ${background}; transition: height .5s cubic-bezier(.16,1,.3,1) ${i * 20}ms; }`
    })
    .join('')

  const [showAnalytics, setShowAnalytics] = useState(false)
  const [bannerModal, setBannerModal] = useState<BannerModalState>({ open: false, editing: null })
  const openBannerCreate = () => setBannerModal({ open: true, editing: null })
  const openBannerEdit = (b: InfoBannerItem) => setBannerModal({ open: true, editing: b })
  const closeBannerModal = () => setBannerModal({ open: false, editing: null })

  return (
    <>
      <div className="px-4 pt-2 xl:px-8">
        <div className="dashboard-header-scale animate-fade-in-up flex flex-col gap-1 pt-4">
          <style dangerouslySetInnerHTML={{ __html: sparkStyles }} />
          <span className="font-bdo text-[11px] font-medium tracking-wide text-[#E35336]">Selamat Datang Kembali, {firstName}</span>
          <h1 className="font-clash text-3xl font-bold tracking-tight uppercase xl:text-4xl">
            <ShinyTextBlack text="UB Sport System" speed={5} />
          </h1>
        </div>
      </div>
      <main className="ubsc-page-dashboard max-w-full flex-1 px-4 pt-2 pb-10 xl:px-8">
        {bannerModal.open && <DashBannerModal state={bannerModal} onClose={closeBannerModal} />}

        <div className="dashboard-page-scale flex flex-col gap-6 overflow-x-hidden pt-6 pb-6">
          {/* ══════════════════════════════════════════════════════════════
                        ROW 1 — Three columns: Featured Card | Metrics Grid | Chart
                        Mobile: stacked · Tablet (md): 1-col then 2-col · Desktop (lg): 3-col
                    ══════════════════════════════════════════════════════════════ */}
          <section className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-2 2xl:grid-cols-[minmax(340px,1fr)_minmax(340px,1fr)_minmax(420px,1.05fr)]">
            {/* ── Col 1: Featured Revenue Card ── */}
            <div className="animate-fade-in-up group shimmer-once relative order-1 flex min-h-[380px] min-w-0 flex-col justify-between overflow-hidden rounded-[28px] bg-linear-to-br from-[#E35336] via-[#B93D2A] to-[#8F2E20] p-7 shadow-2xl shadow-[#F8B5A8]/40 transition-all delay-100 duration-500 hover:-translate-y-1 hover:shadow-[#F08C78]/50">
              {/* Decorative layers */}
              <div className="water-caustics-effect pointer-events-none absolute inset-0 opacity-50"></div>
              <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,.13)_0,rgba(255,255,255,.13)_1px,transparent_1px,transparent_24px)] opacity-45"></div>
              <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/5"></div>
              <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-[#EA684F]/20 blur-3xl"></div>
              <div className="pointer-events-none absolute top-0 right-0 left-0 h-px bg-linear-to-r from-transparent via-white/30 to-transparent"></div>

              {/* Header: label + icon */}
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="rounded-lg bg-white/20 p-1.5 backdrop-blur-md">
                      <Wallet className="h-4 w-4 text-white" />
                    </div>
                    <p className="font-bdo text-[11px] font-bold tracking-widest text-[#FFD5CD] uppercase">Total Pendapatan</p>
                  </div>
                  <h2 className="font-clash text-[2rem] leading-none font-bold tracking-tight text-white">
                    Rp <ShinyText text={formatRevenue(stats.totalRevenue)} speed={4} />
                  </h2>
                  <div className="mt-2.5">
                    <div
                      className={cn(
                        'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-bdo text-[11px] font-bold backdrop-blur-md',
                        trendPositive ? 'border border-white/20 bg-white/15 text-white' : 'border border-red-700/30 bg-red-900/30 text-red-200'
                      )}
                    >
                      {trendPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      {Math.abs(revenueTrend)}% bulan ini
                    </div>
                  </div>
                </div>
                <div className="animate-float shrink-0 rounded-2xl border border-white/25 bg-white/15 p-3.5 shadow-lg backdrop-blur-xl">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>

              {/* Wallet-style sub-stats */}
              <div className="relative z-10 my-5 flex flex-1 flex-col justify-center">
                <p className="mb-3 font-bdo text-[10px] font-bold tracking-widest text-[#F8B5A8]/80 uppercase">Ringkasan Operasional</p>
                <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl [&>:not([hidden])~:not([hidden])]:border-t [&>:not([hidden])~:not([hidden])]:border-white/10">
                  {[
                    { label: 'Booking Hari Ini', value: String(stats.todaysBookings), Icon: CalendarCheck2 },
                    { label: 'Fasilitas Aktif', value: String(stats.activeFacilities), Icon: LayoutGrid },
                    { label: 'Membership Aktif', value: String(stats.activeMemberships), Icon: Users }
                  ].map(({ label, value, Icon }) => (
                    <div key={label} className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-white/5">
                      <div className="flex items-center gap-2.5">
                        <div className="rounded-lg bg-white/15 p-1.5">
                          <Icon className="h-3.5 w-3.5 text-white" />
                        </div>
                        <span className="font-bdo text-[12px] font-medium text-[#FFD5CD]">{label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-clash text-sm font-bold text-white">{value}</span>
                        <span className="rounded-md bg-green-500/20 px-2 py-0.5 font-bdo text-[10px] font-bold text-green-300">Aktif</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mini sparkline strip — last 20 days revenue preview */}
              {sparkData.length > 0 && (
                <div className="relative z-10 mb-4">
                  <p className="mb-1.5 font-bdo text-[9px] tracking-widest text-[#F8B5A8]/60 uppercase">Tren 20 hari terakhir</p>
                  <div className="flex h-7 items-end gap-[2px]">
                    {sparkData.map((val, i) => {
                      return <div key={i} className={cn(`dashboard-spark-${i}`, 'flex-1 self-end rounded-sm')} />
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="relative z-10 grid grid-cols-2 gap-3">
                <button
                  onClick={() => window.print()}
                  className="btn-sheen flex items-center justify-center gap-2 rounded-xl bg-white py-3.5 font-clash text-sm font-semibold text-[#B93D2A] shadow-lg shadow-black/10 transition-all hover:bg-[#FFF1EE] active:scale-[0.97]"
                >
                  <FileText className="h-4 w-4" />
                  Laporan
                </button>
                <button
                  onClick={() => setShowAnalytics((prev) => !prev)}
                  className={cn(
                    'btn-sheen flex items-center justify-center gap-2 rounded-xl border py-3.5 font-clash text-sm font-semibold transition-all active:scale-[0.97]',
                    showAnalytics
                      ? 'border-white/40 bg-white/30 text-white backdrop-blur-md'
                      : 'border-white/30 bg-white/15 text-white backdrop-blur-md hover:bg-white/25'
                  )}
                >
                  <BarChart3 className="h-4 w-4" />
                  Analitik
                </button>
              </div>
            </div>

            {/* ── Col 2: 2×2 Metrics Grid ── */}
            <div className="order-3 grid min-w-0 grid-cols-1 content-stretch gap-3 sm:grid-cols-2 xl:order-2">
              <DashboardMatrixCard
                icon={<CalendarCheck2 size={18} />}
                label="Booking Hari Ini"
                value={String(stats.todaysBookings)}
                note={`${stats.todaysBookings} reservasi`}
                tone="booking"
                delay="delay-100"
              />

              <DashboardMatrixCard
                icon={<Users size={18} />}
                label="Membership Aktif"
                value={String(stats.activeMemberships)}
                note="member aktif"
                tone="emerald"
                delay="delay-150"
              />

              <DashboardMatrixCard
                icon={<LayoutGrid size={18} />}
                label="Fasilitas Aktif"
                value={String(stats.activeFacilities)}
                note="fasilitas online"
                tone="sky"
                delay="delay-200"
              />

              <DashboardMatrixCard
                icon={<UserCheck size={18} />}
                label="Antrean Identitas"
                value={String(stats.pendingIdentities)}
                note="menunggu review"
                tone="amber"
                delay="delay-250"
              />
            </div>

            {/* ── Col 3: Revenue Chart ─────────────────────────────────────────────
                            CRITICAL DESIGN NOTE:
                            overflow is NOT hidden here — it must remain visible so the chart's
                            bar tooltips can appear above bars without being clipped.
                            The card glint, gradient overlays, and decorative lines all stay
                            within their inset bounds and are unaffected by this change.
                        ────────────────────────────────────────────────────────────────────── */}
            <div className="dashboard-visible-only animate-fade-in-up group card-glint relative order-2 flex min-h-[360px] min-w-0 flex-col rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-xs delay-400 sm:min-h-[380px] sm:p-5 xl:order-3 xl:col-span-2 2xl:col-span-1">
              {/* Subtle hover overlay — inset so overflow:visible is fine */}
              <div className="pointer-events-none absolute inset-0 rounded-[24px] bg-linear-to-br from-[#FFF1EE]/30 via-transparent to-slate-50/20 opacity-0 transition-opacity duration-1000 group-hover:opacity-100"></div>
              <div className="pointer-events-none absolute top-0 right-5 left-5 z-10 h-px bg-linear-to-r from-transparent via-white/80 to-transparent" />

              {/* Chart Header */}
              <div className="relative z-10 mb-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <ShinyIcon className="h-10 w-10 shrink-0 transition-transform duration-300 group-hover:scale-105">
                      <TrendingUp className="h-4 w-4 text-white" />
                    </ShinyIcon>
                    <div className="min-w-0">
                      <h2 className="font-clash text-sm leading-tight font-semibold whitespace-nowrap text-slate-900">
                        <SplitText text="Grafik Pendapatan" delay={500} />
                      </h2>
                      <p className="mt-0.5 font-bdo text-[10px] font-medium whitespace-nowrap text-slate-400">Pendapatan bulan berjalan</p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'flex shrink-0 cursor-default items-center gap-1.5 rounded-xl px-2.5 py-1.5 font-bdo text-[10px] font-bold shadow-xs',
                      trendPositive ? 'border border-emerald-100 bg-emerald-50 text-emerald-700' : 'border border-rose-100 bg-rose-50 text-rose-600'
                    )}
                  >
                    {trendPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    <span className="whitespace-nowrap">{Math.abs(revenueTrend)}% vs bln lalu</span>
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div className="relative z-10 mb-3 h-px bg-linear-to-r from-transparent via-slate-100 to-transparent" />

              {/* Chart */}
              <div className="dashboard-visible-only relative z-10 flex-1">
                <InteractiveRevenueChart data={dailyRevenue} monthLabel={currentMonthLabel} currentDayInMonth={revenueDayLimit} />
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════════════════════
                        ANALYTICS PANEL
                    ══════════════════════════════════════════════════════════════ */}
          {showAnalytics && (
            <AnalyticsPanel
              dailyRevenue={dailyRevenue ?? []}
              occupancyData={occupancyData ?? []}
              stats={stats}
              currentMonthLabel={currentMonthLabel}
              currentDayInMonth={revenueDayLimit}
              onClose={() => setShowAnalytics(false)}
            />
          )}

          {/* ══════════════════════════════════════════════════════════════
                    ROW 2 — Two columns: Gym Traffic | Info Banner
                ══════════════════════════════════════════════════════════════ */}
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <GymTrafficWidget current={dash.gymTraffic} visitsToday={dash.gymVisitsToday} />
            <DashInfoBannerPanel banners={dash.infoBanners} onAdd={openBannerCreate} onEdit={openBannerEdit} />
          </section>

          {/* ══════════════════════════════════════════════════════════════
                    ROW 3 — Left: OccupancyCard + Identity Queue  |  Right: Activity Feed
                ══════════════════════════════════════════════════════════════ */}
          <section className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-[minmax(360px,0.95fr)_minmax(0,1.65fr)]">
            <div className="flex h-full flex-col gap-6">
              <OccupancyCard facilities={occupancyData ?? []} />
              <PremiumIdentityQueue count={stats.pendingIdentities} canManageIdentity={canManageIdentity} />
            </div>

            <div className="animate-fade-in-up relative flex h-full min-h-0 flex-col overflow-hidden rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-xs delay-500">
              <div className="pointer-events-none absolute inset-x-5 top-0 z-10 h-px bg-linear-to-r from-transparent via-[#F8B5A8] to-transparent" />

              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <ShinyIcon className="h-10 w-10">
                    <Activity className="h-4 w-4 text-white" />
                  </ShinyIcon>
                  <div>
                    <p className="font-bdo text-[10px] font-bold tracking-widest text-slate-400 uppercase">Sistem</p>
                    <h2 className="font-clash text-base font-semibold text-slate-900">
                      <SplitText text="Aktivitas Terbaru" delay={600} />
                    </h2>
                    <p className="mt-0.5 font-bdo text-[11px] font-medium text-slate-400">Ringkasan kegiatan sistem yang mudah discan</p>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 rounded-xl border border-[#FFD5CD] bg-[#FFF1EE] px-3 py-1.5 font-bdo text-[11px] font-bold tracking-wide text-[#B93D2A] uppercase">
                  <LiveDot size="xs" color="#E35336" halo="rgba(227,83,54,0.26)" />
                  {recentActivity?.length ?? 0} Aktivitas
                </span>
              </div>

              <div className="min-h-0">
                <ActivityFeed items={recentActivity ?? []} />
              </div>
            </div>
          </section>
        </div>

        {/* Print template — hidden on screen */}
        <ReportPrintTemplate
          stats={stats}
          revenueTrend={revenueTrend}
          dailyRevenue={dailyRevenue ?? []}
          currentDayInMonth={revenueDayLimit}
          currentMonthLabel={currentMonthLabel}
          occupancyData={occupancyData ?? []}
        />
      </main>
    </>
  )
}
