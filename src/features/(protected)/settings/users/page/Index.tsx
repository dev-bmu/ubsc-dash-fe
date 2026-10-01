'use client'

import '../users.css'

import { CheckCircle2, Copy, Crown, Edit3, Plus, Search, Shield, ShieldCheck, Sparkles, Trash2, UsersRound, X } from 'lucide-react'
import { type ChangeEvent, type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { SlideOver } from '@/components/admin/SlideOver'
import { useAuth } from '@/context/AuthContext'
import { useCreateStaffUser, useDeleteStaffUser, useStaffUsers, useUpdateStaffUser } from '@/hooks/api/useSettings'
import { extractApiError, fieldErrorMap } from '@/lib/apiError'
import { cn } from '@/lib/utils'
import type { AdminStaffUserDto, StaffUserPayload } from '@/types/contracts/contracts'

// ===== Admin Settings / Pengguna Internal (Fase 8G) — port 1:1 dari Laravel Pages/Admin/Settings/Users/Index.tsx =====
// Data: useStaffUsers() (pengganti props Inertia users/roles/can_manage_users). Mutasi: hooks @/hooks/api/useSettings.
// Sumber tidak merender banner flash → umpan balik lewat toast (sonner); modal kredensial tetap muncul setelah create.
// USER_STYLES injeksi <style> sumber dipindah ke ../users.css (di-scope ke .ubsc-page-settings-users).

interface StaffForm {
  name: string
  email: string
  password: string
  role: string
}

const ROLE_ORDER = ['Manager', 'Administrator', 'Finance', 'Staff Central', 'Staff Front Office']

const ROLE_META: Record<string, { tone: string; icon: typeof Shield; note: string }> = {
  Manager: {
    tone: 'border-[#F8B5A8] bg-[#FFF1EE] text-[#B93D2A]',
    icon: Crown,
    note: 'Koordinasi operasional'
  },
  Administrator: {
    tone: 'border-[#F8B5A8]/80 bg-[linear-gradient(135deg,#7A2F23_0%,#B93D2A_50%,#E35336_100%)] text-white shadow-[0_14px_30px_-22px_rgba(185,61,42,.9)]',
    icon: ShieldCheck,
    note: 'Kuasa penuh sistem'
  },
  Finance: {
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    icon: ShieldCheck,
    note: 'Kontrol transaksi'
  },
  'Staff Central': {
    tone: 'border-sky-200 bg-sky-50 text-sky-700',
    icon: Sparkles,
    note: 'Operasional pusat'
  },
  'Staff Front Office': {
    tone: 'border-amber-200 bg-amber-50 text-amber-700',
    icon: UsersRound,
    note: 'Layanan pelanggan'
  }
}

const inputBase =
  'h-11 w-full rounded-2xl border border-slate-200 bg-white px-3.5 font-bdo text-[13px] font-semibold text-slate-800 outline-hidden transition focus:border-[#F8B5A8] focus:ring-4 focus:ring-[#E35336]/10'

function initials(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'U'
  )
}

function roleMeta(role: string) {
  return (
    ROLE_META[role] ?? {
      tone: 'border-slate-200 bg-slate-50 text-slate-600',
      icon: Shield,
      note: 'Akses internal'
    }
  )
}

function roleRank(role: string): number {
  const index = ROLE_ORDER.indexOf(role)
  return index === -1 ? ROLE_ORDER.length : index
}

function isAdministrator(role: string): boolean {
  return role === 'Administrator'
}

function ShinyIcon({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl',
        'bg-[linear-gradient(135deg,#F08C78_0%,#E35336_52%,#B93D2A_100%)] text-white',
        'shadow-[0_18px_34px_-24px_rgba(227,83,54,.98),inset_0_1px_0_rgba(255,255,255,.22)]',
        className
      )}
    >
      {children}
      <span className="pointer-events-none absolute top-1 right-2 left-2 h-1 rounded-full bg-white/35 blur-[1px]" />
    </span>
  )
}

function UserAvatar({ user, size = 'md' }: { user: AdminStaffUserDto; size?: 'sm' | 'md' | 'lg' }) {
  const [failed, setFailed] = useState(false)
  const avatarUrl = user.avatarUrl ?? (user.avatar ? `/storage/${user.avatar}` : null)
  const sizeClass = size === 'lg' ? 'h-12 w-12 rounded-[18px]' : size === 'sm' ? 'h-8 w-8 rounded-xl' : 'h-10 w-10 rounded-2xl'

  return (
    <span
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden border border-white bg-[#FFF1EE] font-clash font-semibold text-white',
        'shadow-[0_14px_28px_-22px_rgba(227,83,54,.88),inset_0_1px_0_rgba(255,255,255,.7)]',
        sizeClass
      )}
    >
      {avatarUrl && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatar staf dari /storage milik Laravel, bukan aset Next
        <img src={avatarUrl} alt={user.name} className="h-full w-full object-cover" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#F8B5A8,#E35336)] text-sm">
          {initials(user.name)}
        </span>
      )}
    </span>
  )
}

function RoleBadge({ role }: { role: string }) {
  const meta = roleMeta(role)
  const Icon = meta.icon
  const authority = isAdministrator(role)

  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-bdo text-[10px] font-bold', meta.tone)}>
      <Icon size={12} />
      {role}
      {authority && <span className="ml-1 rounded-full px-1.5 py-0.5 text-[9px] tracking-wide uppercase ring-1 ring-white/20">Full</span>}
    </span>
  )
}

function DirectoryToolbar({
  query,
  setQuery,
  roleFilter,
  setRoleFilter,
  roleCounts,
  canManage,
  onCreate
}: {
  query: string
  setQuery: (value: string) => void
  roleFilter: string
  setRoleFilter: (value: string) => void
  roleCounts: Array<{ role: string; count: number }>
  canManage: boolean
  onCreate: () => void
}) {
  const total = roleCounts.reduce((sum, row) => sum + row.count, 0)

  return (
    <section className="user-enter user-card-glint overflow-hidden rounded-[24px] border border-[#FFE0D8] bg-white shadow-[0_16px_38px_-34px_rgba(185,61,42,.5)]">
      <div className="user-grid-surface grid gap-3 border-b border-[#FFE0D8] p-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="grid min-w-0 grid-cols-[42px_minmax(0,1fr)] gap-3 sm:grid-cols-[48px_minmax(0,1fr)] sm:items-center">
          <ShinyIcon className="h-10 w-10 rounded-[15px] sm:h-11 sm:w-11">
            <UsersRound size={17} />
          </ShinyIcon>
          <div className="min-w-0">
            <p className="font-bdo text-[9px] font-bold tracking-widest text-[#B93D2A]/70 uppercase">Internal user control</p>
            <h2 className="font-clash text-xl leading-tight font-semibold text-slate-950 sm:text-2xl sm:leading-8">Staff Directory</h2>
            <p className="mt-0.5 max-w-2xl truncate font-bdo text-[11px] font-semibold text-slate-400">
              {total} akun internal. Cari, filter, lalu kelola staff langsung dari tabel.
            </p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_164px_auto] xl:min-w-[570px]">
          <label className="flex h-10 min-w-0 items-center gap-2 rounded-[15px] border border-slate-200 bg-white/95 px-3 shadow-xs backdrop-blur-sm">
            <Search size={14} className="shrink-0 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama, email, role..."
              className="min-w-0 flex-1 border-0 bg-transparent p-0 font-bdo text-[13px] font-semibold text-slate-700 outline-hidden placeholder:text-slate-400 focus:ring-0"
            />
          </label>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            aria-label="Filter berdasarkan role staff"
            title="Filter berdasarkan role staff"
            className="h-10 rounded-[15px] border border-slate-200 bg-white/95 px-3 font-bdo text-[13px] font-bold text-slate-600 outline-hidden transition focus:border-[#F8B5A8] focus:ring-4 focus:ring-[#E35336]/10"
          >
            <option value="all">Semua role</option>
            {roleCounts.map((row) => (
              <option key={row.role} value={row.role}>
                {row.role}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onCreate}
            disabled={!canManage}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[15px] bg-[linear-gradient(135deg,#F08C78_0%,#E35336_52%,#B93D2A_100%)] px-4 font-clash text-xs font-semibold text-white shadow-[0_16px_30px_-22px_rgba(227,83,54,.95)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:bg-none disabled:text-slate-400 disabled:shadow-none disabled:hover:translate-y-0"
          >
            <Plus size={14} />
            Staff
          </button>
        </div>
      </div>

      <div className="user-scrollbar flex gap-2 overflow-x-auto bg-white px-3 py-2.5">
        <button
          type="button"
          onClick={() => setRoleFilter('all')}
          className={cn(
            'inline-flex h-9 min-w-fit items-center gap-2 rounded-[15px] border px-3 text-left transition',
            roleFilter === 'all'
              ? 'border-[#F8B5A8] bg-[#FFF1EE] text-[#B93D2A] shadow-[0_12px_24px_-20px_rgba(227,83,54,.75)]'
              : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-[#F8B5A8] hover:bg-white'
          )}
        >
          <UsersRound size={14} />
          <span className="font-bdo text-[10px] font-bold">Semua</span>
          <span className="font-clash text-[13px] font-semibold">{total}</span>
        </button>

        {roleCounts.map((row) => {
          const meta = roleMeta(row.role)
          const Icon = meta.icon
          const active = roleFilter === row.role

          return (
            <button
              type="button"
              key={row.role}
              onClick={() => setRoleFilter(row.role)}
              className={cn(
                'inline-flex h-9 min-w-fit items-center gap-2 rounded-[15px] border px-3 text-left transition',
                active ? meta.tone : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-[#F8B5A8] hover:bg-white'
              )}
            >
              <Icon size={14} />
              <span className="font-bdo text-[10px] font-bold">{row.role}</span>
              <span className="font-clash text-[13px] font-semibold">{row.count}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function StaffCard({
  user,
  canManage,
  isDeleting,
  onEdit,
  onDelete
}: {
  user: AdminStaffUserDto
  canManage: boolean
  isDeleting: boolean
  onEdit: (user: AdminStaffUserDto) => void
  onDelete: (user: AdminStaffUserDto) => void
}) {
  const meta = roleMeta(user.role)
  const authority = isAdministrator(user.role)

  return (
    <article
      className={cn(
        'rounded-[22px] border bg-white p-3.5 shadow-[0_14px_32px_-30px_rgba(185,61,42,.55)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-38px_rgba(185,61,42,.65)]',
        authority ? 'border-[#F8B5A8] bg-[linear-gradient(180deg,#FFFFFF_0%,#FFF7F5_120%)]' : 'border-[#FFE0D8] hover:border-[#F8B5A8]'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar user={user} size="lg" />
          <div className="min-w-0">
            <p className="flex min-w-0 items-center gap-2 truncate font-clash text-base leading-tight font-semibold text-slate-950">
              <span className="truncate">{user.name}</span>
              {authority && <Crown className="h-4 w-4 shrink-0 text-[#B93D2A]" />}
            </p>
            <p className="mt-1 truncate font-bdo text-xs font-semibold text-slate-400">{user.email}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <IconButton
            label={authority ? 'Administrator dikunci' : `Edit ${user.name}`}
            disabled={!canManage || authority}
            onClick={() => onEdit(user)}
          >
            <Edit3 size={14} />
          </IconButton>
          <IconButton
            label={authority ? 'Administrator tidak dapat dihapus' : `Hapus ${user.name}`}
            danger
            disabled={!canManage || isDeleting || authority}
            onClick={() => onDelete(user)}
          >
            <Trash2 size={14} />
          </IconButton>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className={cn('rounded-[16px] border px-3 py-2', meta.tone)}>
          <p className="font-bdo text-[9px] font-bold tracking-widest uppercase opacity-70">Role</p>
          <p className="mt-0.5 font-clash text-sm font-semibold">{user.role}</p>
        </div>
        <span
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-[16px] border px-3 py-2 font-bdo text-[10px] font-bold',
            authority ? 'border-[#F8B5A8] bg-[#FFF1EE] text-[#B93D2A]' : 'border-slate-200 bg-slate-50 text-slate-500'
          )}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', authority ? 'bg-[#E35336]' : 'bg-emerald-500')} />
          {authority ? 'Kuasa penuh' : 'Internal'}
        </span>
      </div>
    </article>
  )
}

function StaffTable({
  users,
  canManage,
  deletingId,
  isLoading,
  onEdit,
  onDelete
}: {
  users: AdminStaffUserDto[]
  canManage: boolean
  deletingId: string | null
  isLoading: boolean
  onEdit: (user: AdminStaffUserDto) => void
  onDelete: (user: AdminStaffUserDto) => void
}) {
  return (
    <section className="user-card-glint overflow-hidden rounded-[24px] border border-[#FFE0D8] bg-white shadow-[0_18px_42px_-38px_rgba(185,61,42,.48)]">
      <div className="user-scrollbar max-h-[620px] overflow-auto">
        <table className="w-full min-w-[820px]">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-[#FFE0D8] bg-[#FFF9F7] text-left">
              {['Staff', 'Email', 'Role', 'Status', 'Aksi'].map((header) => (
                <th key={header} className="px-3.5 py-2.5 font-bdo text-[9px] font-bold tracking-[0.16em] text-slate-400 uppercase">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length === 0
              ? // Baris kosong sumber hanya dirender setelah query selesai, supaya tidak berkedip saat memuat.
                !isLoading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center font-bdo text-sm font-semibold text-slate-400">
                      Tidak ada staff yang cocok dengan filter.
                    </td>
                  </tr>
                )
              : users.map((user) => {
                  const authority = isAdministrator(user.role)

                  return (
                    <tr key={user.id} className={cn('border-b border-slate-100 transition hover:bg-[#FFF7F5]', authority && 'bg-[#FFF9F7]')}>
                      <td className="px-3.5 py-3">
                        <div className="flex items-center gap-3">
                          <UserAvatar user={user} size="sm" />
                          <div className="min-w-0">
                            <p className="flex min-w-0 items-center gap-2 font-clash text-[13px] font-semibold text-slate-950">
                              <span className="truncate">{user.name}</span>
                              {authority && (
                                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#7A2F23,#E35336)] text-white shadow-[0_10px_18px_-14px_rgba(185,61,42,.85)]">
                                  <Crown size={10} />
                                </span>
                              )}
                            </p>
                            {authority && (
                              <p className="mt-0.5 font-bdo text-[9px] font-bold tracking-wide text-[#B93D2A] uppercase">Pemegang kuasa penuh</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3.5 py-3 font-bdo text-[13px] font-semibold text-slate-500">{user.email}</td>
                      <td className="px-3.5 py-3">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="px-3.5 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-2 rounded-full border px-2.5 py-1 font-bdo text-[10px] font-bold',
                            authority ? 'border-[#F8B5A8] bg-[#FFF1EE] text-[#B93D2A]' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          )}
                        >
                          <span className={cn('h-1.5 w-1.5 rounded-full', authority ? 'bg-[#E35336]' : 'bg-emerald-500')} />
                          {authority ? 'Kuasa penuh' : 'Internal'}
                        </span>
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="flex items-center gap-2">
                          <IconButton
                            label={authority ? 'Administrator dikunci' : `Edit ${user.name}`}
                            disabled={!canManage || authority}
                            onClick={() => onEdit(user)}
                          >
                            <Edit3 size={14} />
                          </IconButton>
                          <IconButton
                            label={authority ? 'Administrator tidak dapat dihapus' : `Hapus ${user.name}`}
                            danger
                            disabled={!canManage || deletingId === user.id || authority}
                            onClick={() => onDelete(user)}
                          >
                            <Trash2 size={14} />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  )
                })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function IconButton({
  children,
  label,
  danger = false,
  disabled,
  onClick
}: {
  children: ReactNode
  label: string
  danger?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-[13px] border transition disabled:cursor-not-allowed disabled:opacity-45',
        danger
          ? 'border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100'
          : 'border-slate-200 bg-white text-slate-500 hover:border-[#F8B5A8] hover:bg-[#FFF7F5] hover:text-[#B93D2A]'
      )}
    >
      {children}
    </button>
  )
}

function CredentialModal({ creds, onClose }: { creds: { email: string; password: string }; onClose: () => void }) {
  const [copied, setCopied] = useState<'email' | 'password' | null>(null)

  const copy = (field: 'email' | 'password') => {
    navigator.clipboard.writeText(creds[field]).then(() => {
      setCopied(field)
      window.setTimeout(() => setCopied(null), 1600)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#7A2F23]/20 px-3 py-4 backdrop-blur-xs sm:items-center">
      <div className="user-card-glint w-full max-w-md overflow-hidden rounded-[24px] border border-white/70 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#FFE0D8] bg-[#FFF9F7] p-4">
          <div className="flex items-center gap-3">
            <ShinyIcon className="h-10 w-10">
              <CheckCircle2 size={18} />
            </ShinyIcon>
            <div>
              <p className="font-bdo text-[10px] font-bold tracking-widest text-[#B93D2A]/70 uppercase">Akun dibuat</p>
              <h3 className="font-clash text-lg font-semibold text-slate-950">Kredensial Staff</h3>
            </div>
          </div>
          <IconButton label="Tutup" onClick={onClose}>
            <X size={15} />
          </IconButton>
        </div>
        <div className="space-y-3 p-4">
          {(['email', 'password'] as const).map((field) => (
            <div key={field} className="rounded-[18px] border border-slate-200 bg-slate-50 p-3.5">
              <p className="font-bdo text-[10px] font-bold tracking-widest text-slate-400 uppercase">{field === 'email' ? 'Email' : 'Password'}</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="min-w-0 font-mono text-sm font-semibold break-all text-slate-800">{creds[field]}</span>
                <button
                  type="button"
                  onClick={() => copy(field)}
                  className="inline-flex h-8 shrink-0 items-center gap-2 rounded-[13px] border border-[#FFD5CD] bg-white px-3 font-bdo text-[10px] font-bold text-[#B93D2A] transition hover:bg-[#FFF1EE]"
                >
                  <Copy size={12} />
                  {copied === field ? 'Tersalin' : 'Salin'}
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#F08C78_0%,#E35336_52%,#B93D2A_100%)] font-clash text-sm font-semibold text-white shadow-[0_18px_34px_-24px_rgba(227,83,54,.95)] transition hover:-translate-y-0.5"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  )
}

export default function UsersIndex() {
  const { user: authUser } = useAuth()
  const { data, isLoading, refetch } = useStaffUsers()
  const users = useMemo(() => data?.users ?? [], [data])
  const roles = useMemo(() => data?.roles ?? [], [data])
  const canManage = (data?.canManageUsers ?? false) || authUser?.role === 'Administrator'
  const emptyForm: StaffForm = { name: '', email: '', password: '', role: roles[0] ?? '' }

  const createStaffUser = useCreateStaffUser()
  const updateStaffUser = useUpdateStaffUser()
  const deleteStaffUser = useDeleteStaffUser()

  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [showSlideOver, setShowSlideOver] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminStaffUserDto | null>(null)
  const [form, setForm] = useState<StaffForm>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof StaffForm, string>>>({})
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const saving = createStaffUser.isPending || updateStaffUser.isPending

  const filterRoles = useMemo(() => {
    const available = new Set([...roles, ...users.map((user) => user.role)].filter(Boolean))
    const ordered = ROLE_ORDER.filter((role) => available.has(role))
    const leftovers = Array.from(available)
      .filter((role) => !ROLE_ORDER.includes(role))
      .sort()
    return [...ordered, ...leftovers]
  }, [roles, users])

  const roleCounts = useMemo(
    () =>
      filterRoles.map((role) => ({
        role,
        count: users.filter((user) => user.role === role).length
      })),
    [filterRoles, users]
  )

  const orderedUsers = useMemo(
    () =>
      [...users].sort((a, b) => {
        const rank = roleRank(a.role) - roleRank(b.role)
        if (rank !== 0) return rank
        return a.name.localeCompare(b.name, 'id-ID')
      }),
    [users]
  )

  const filteredUsers = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return orderedUsers.filter((user) => {
      const matchRole = roleFilter === 'all' || user.role === roleFilter
      const matchSearch = !needle || [user.name, user.email, user.role].join(' ').toLowerCase().includes(needle)
      return matchRole && matchSearch
    })
  }, [orderedUsers, query, roleFilter])

  // Auto-refresh daftar staff milik sumber (router.reload({ only: ['users'] })) → refetch query.
  useEffect(() => {
    if (showSlideOver || saving || deletingId !== null || createdCreds) return

    const reloadUsers = () => {
      if (document.visibilityState !== 'visible') return
      void refetch()
    }

    const interval = window.setInterval(reloadUsers, 20000)
    window.addEventListener('focus', reloadUsers)
    document.addEventListener('visibilitychange', reloadUsers)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', reloadUsers)
      document.removeEventListener('visibilitychange', reloadUsers)
    }
  }, [createdCreds, deletingId, refetch, saving, showSlideOver])

  const updateForm = (key: keyof StaffForm) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((current) => ({ ...current, [key]: event.target.value }))
  }

  const openCreate = () => {
    if (!canManage) return
    setEditingUser(null)
    setForm(emptyForm)
    setErrors({})
    setShowSlideOver(true)
  }

  const openEdit = (user: AdminStaffUserDto) => {
    if (!canManage) return
    if (isAdministrator(user.role)) return
    setEditingUser(user)
    setForm({ name: user.name, email: user.email, password: '', role: user.role })
    setErrors({})
    setShowSlideOver(true)
  }

  const closeSlideOver = () => {
    setShowSlideOver(false)
    setErrors({})
  }

  const submit = async (event?: FormEvent) => {
    event?.preventDefault()
    if (!canManage) return

    const captured = { email: form.email, password: form.password }
    // Password WAJIB saat create, opsional saat update: kosong dikirim sebagai null (bukan ''),
    // artinya password lama dipertahankan.
    const payload: StaffUserPayload = {
      name: form.name,
      email: form.email,
      password: form.password.trim() === '' ? null : form.password,
      role: form.role
    }
    const wasEditing = editingUser

    try {
      if (wasEditing) {
        await updateStaffUser.mutateAsync({ id: wasEditing.id, payload })
      } else {
        await createStaffUser.mutateAsync(payload)
      }

      closeSlideOver()
      if (!wasEditing) setCreatedCreds(captured)
      toast.success(`Akun ${form.name} berhasil ${wasEditing ? 'diperbarui' : 'dibuat'}.`)
    } catch (error) {
      const fields = fieldErrorMap(error)
      if (Object.keys(fields).length > 0) {
        setErrors(fields as Partial<Record<keyof StaffForm, string>>)
        return
      }
      // Penjagaan server tanpa field (mis. "Akun Administrator tidak dapat diubah dari halaman staff.").
      toast.error(extractApiError(error).message)
    }
  }

  const handleDelete = async (user: AdminStaffUserDto) => {
    if (!canManage) return
    if (isAdministrator(user.role)) return
    if (!confirm(`Hapus akun "${user.name}"? Tindakan ini tidak dapat dibatalkan.`)) return

    setDeletingId(user.id)
    try {
      await deleteStaffUser.mutateAsync(user.id)
      toast.success(`Akun ${user.name} berhasil dihapus.`)
    } catch (error) {
      // Mis. "Tidak dapat menghapus akun sendiri." — pesan polos tanpa field.
      toast.error(extractApiError(error).message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <div className="px-4 pt-2 xl:px-8">
        <div className="user-enter flex flex-col gap-1 pt-3">
          <span className="font-bdo text-[10px] font-medium tracking-wide text-[#E35336]">Pengaturan Sistem</span>
          <h1 className="font-clash text-2xl font-bold tracking-tight uppercase xl:text-3xl">
            <span className="user-title-shine">Pengguna Internal</span>
          </h1>
        </div>
      </div>

      <main className="ubsc-page-settings-users max-w-full flex-1 px-4 pt-2 pb-10 xl:px-8">
        <div className="flex flex-col gap-3.5 overflow-x-hidden pt-4 pb-20 text-[0.94rem]">
          <DirectoryToolbar
            query={query}
            setQuery={setQuery}
            roleFilter={roleFilter}
            setRoleFilter={setRoleFilter}
            roleCounts={roleCounts}
            canManage={canManage}
            onCreate={openCreate}
          />

          {!canManage && (
            <div className="user-enter rounded-[22px] border border-amber-200 bg-amber-50 p-4 font-bdo text-sm leading-6 font-semibold text-amber-800">
              Mode lihat saja. Perubahan akun internal hanya bisa dilakukan oleh Administrator.
            </div>
          )}

          <section className="user-enter grid gap-2.5 lg:hidden">
            {filteredUsers.length === 0
              ? // Kartu kosong sumber hanya dirender setelah query selesai, supaya tidak berkedip saat memuat.
                !isLoading && (
                  <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 p-7 text-center font-bdo text-sm font-semibold text-slate-400">
                    Tidak ada staff yang cocok dengan filter.
                  </div>
                )
              : filteredUsers.map((user) => (
                  <StaffCard
                    key={user.id}
                    user={user}
                    canManage={canManage}
                    isDeleting={deletingId === user.id}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                  />
                ))}
          </section>

          <div className="user-enter hidden lg:block">
            <StaffTable
              users={filteredUsers}
              canManage={canManage}
              deletingId={deletingId}
              isLoading={isLoading}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          </div>
        </div>

        <SlideOver
          isOpen={showSlideOver}
          onClose={closeSlideOver}
          title={<span className="font-clash text-xl font-bold">{editingUser ? 'Edit Staff' : 'Tambah Staff'}</span>}
          description={
            <span className="font-bdo text-sm text-slate-500">
              {editingUser ? `Perbarui data akun ${editingUser.name}` : 'Buat akun baru untuk tim internal.'}
            </span>
          }
        >
          {showSlideOver && (
            <form onSubmit={submit} className="flex flex-col gap-4">
              <label>
                <span className="mb-1.5 block font-bdo text-[11px] font-bold tracking-wide text-slate-500 uppercase">Nama Lengkap</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={updateForm('name')}
                  placeholder="Nama staff"
                  autoFocus
                  className={cn(inputBase, errors.name && 'border-rose-300 ring-4 ring-rose-100')}
                />
                {errors.name && <p className="mt-1 font-bdo text-[11px] font-semibold text-rose-500">{errors.name}</p>}
              </label>

              <label>
                <span className="mb-1.5 block font-bdo text-[11px] font-bold tracking-wide text-slate-500 uppercase">Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={updateForm('email')}
                  placeholder="staff@ubsc.id"
                  className={cn(inputBase, errors.email && 'border-rose-300 ring-4 ring-rose-100')}
                />
                {errors.email && <p className="mt-1 font-bdo text-[11px] font-semibold text-rose-500">{errors.email}</p>}
              </label>

              <label>
                <span className="mb-1.5 block font-bdo text-[11px] font-bold tracking-wide text-slate-500 uppercase">
                  Password
                  {editingUser && <span className="ml-1 tracking-normal text-slate-400 normal-case">(kosongkan jika tidak diubah)</span>}
                </span>
                <input
                  type="password"
                  value={form.password}
                  onChange={updateForm('password')}
                  placeholder={editingUser ? 'Tidak diubah' : 'Min. 8 karakter'}
                  className={cn(inputBase, errors.password && 'border-rose-300 ring-4 ring-rose-100')}
                />
                {errors.password && <p className="mt-1 font-bdo text-[11px] font-semibold text-rose-500">{errors.password}</p>}
              </label>

              <label>
                <span className="mb-1.5 block font-bdo text-[11px] font-bold tracking-wide text-slate-500 uppercase">Role</span>
                <select
                  value={form.role}
                  onChange={updateForm('role')}
                  className={cn(inputBase, 'cursor-pointer', errors.role && 'border-rose-300 ring-4 ring-rose-100')}
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                {errors.role && <p className="mt-1 font-bdo text-[11px] font-semibold text-rose-500">{errors.role}</p>}
              </label>

              <div className="grid gap-2 pt-1 sm:grid-cols-[1fr_auto]">
                <button
                  type="submit"
                  disabled={saving || !form.name.trim() || !form.email.trim()}
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#F08C78_0%,#E35336_52%,#B93D2A_100%)] px-5 font-clash text-sm font-semibold text-white shadow-[0_18px_34px_-24px_rgba(227,83,54,.95)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:bg-none disabled:text-slate-400 disabled:shadow-none disabled:hover:translate-y-0"
                >
                  {saving ? 'Menyimpan...' : editingUser ? 'Simpan Perubahan' : 'Buat Akun'}
                </button>
                <button
                  type="button"
                  onClick={closeSlideOver}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 font-clash text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Batal
                </button>
              </div>
            </form>
          )}
        </SlideOver>

        {createdCreds && <CredentialModal creds={createdCreds} onClose={() => setCreatedCreds(null)} />}
      </main>
    </>
  )
}
