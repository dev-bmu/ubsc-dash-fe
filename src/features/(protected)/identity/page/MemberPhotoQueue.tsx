'use client'

import { CheckCircle, XCircle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useDecideMemberPhoto, useMemberPhotoIndex } from '@/hooks/api/useIdentity'
import { extractApiError } from '@/lib/apiError'
import { cn } from '@/lib/utils'
import type { MemberPhotoReviewDto, MemberPhotoStatus } from '@/types/contracts/contracts'

// ===== Antrean foto member (PRD tambahan 2026-09, tahap B) =====
// Foto wajah yang kelak dicocokkan FO di meja gym. Keputusan client: foto baru berlaku setelah
// disetujui. Keputusan dikirim bersama photoUrl yang sedang dilihat: bila pelanggan sudah mengganti
// fotonya, API menolak 409 dan antrean dimuat ulang (useDecideMemberPhoto).

type Filter = 'all' | MemberPhotoStatus

const STATUS_LABEL: Record<MemberPhotoStatus, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak'
}

const STATUS_STYLE: Record<MemberPhotoStatus, string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  rejected: 'border-rose-200 bg-rose-50 text-rose-600'
}

const FILTERS: Filter[] = ['pending', 'approved', 'rejected', 'all']

function PhotoCard({ user }: { user: MemberPhotoReviewDto }) {
  const decide = useDecideMemberPhoto()

  const submit = (status: 'approved' | 'rejected') =>
    decide
      .mutateAsync({ id: user.id, payload: { status, photoUrl: user.photoUrl } })
      .then(() => toast.success(`Foto ${user.name} ${status === 'approved' ? 'disetujui' : 'ditolak'}.`))
      .catch((error) => toast.error(extractApiError(error).message))

  return (
    <article className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_14px_32px_-28px_rgba(15,23,42,.35)]">
      <a href={user.photoUrl} target="_blank" rel="noreferrer" title="Buka foto ukuran penuh">
        {/* eslint-disable-next-line @next/next/no-img-element -- foto unggahan pelanggan dari /uploads, bukan aset statis */}
        <img src={user.photoUrl} alt={`Foto member ${user.name}`} className="aspect-square w-full bg-slate-100 object-cover" />
      </a>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-clash text-[15px] font-semibold text-slate-950">{user.name}</p>
            <p className="font-mono text-xs text-slate-600 tabular-nums">{user.customerNumber}</p>
            <p className="truncate font-bdo text-[11px] text-slate-400">
              {user.email}
              {user.phoneNumber ? ` · ${user.phoneNumber}` : ''}
            </p>
          </div>
          <span className={cn('shrink-0 rounded-lg border px-2 py-0.5 font-bdo text-[10px] font-bold uppercase', STATUS_STYLE[user.status])}>
            {STATUS_LABEL[user.status]}
          </span>
        </div>
        <p className="mt-2 font-bdo text-[11px] text-slate-400">Diunggah {user.updatedAt}</p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={decide.isPending || user.status === 'approved'}
            onClick={() => submit('approved')}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 font-bdo text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-40"
          >
            <CheckCircle size={14} />
            Setujui
          </button>
          <button
            type="button"
            disabled={decide.isPending || user.status === 'rejected'}
            onClick={() => submit('rejected')}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 font-bdo text-xs font-bold text-rose-600 transition hover:bg-rose-100 disabled:opacity-40"
          >
            <XCircle size={14} />
            Tolak
          </button>
        </div>
      </div>
    </article>
  )
}

export function MemberPhotoQueue() {
  const { data, isLoading } = useMemberPhotoIndex()
  const [filter, setFilter] = useState<Filter>('pending')
  const users = data?.users ?? []
  const shown = filter === 'all' ? users : users.filter((user) => user.status === filter)

  return (
    <section className="flex flex-col gap-4 pt-6 pb-20">
      <div>
        <h2 className="font-clash text-xl font-semibold text-slate-950">Foto Member</h2>
        <p className="mt-1 max-w-2xl font-bdo text-sm text-slate-500">
          Pastikan foto menampilkan wajah pemilik akun dengan jelas. Foto ini yang dicocokkan FO saat member masuk gym. Pelanggan yang mengganti
          fotonya kembali ke antrean.
        </p>
      </div>

      <div className="identity-scrollbar flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={cn(
              'inline-flex h-9 items-center rounded-2xl border px-3.5 font-bdo text-[12px] font-bold whitespace-nowrap transition-all',
              filter === value
                ? 'border-[#F8B5A8] bg-[#FFF7F5] text-[#B93D2A]'
                : 'border-slate-200 bg-white text-slate-500 hover:border-[#F8B5A8] hover:text-[#B93D2A]'
            )}
          >
            {value === 'all' ? 'Semua' : STATUS_LABEL[value]} ·{' '}
            {value === 'all' ? users.length : users.filter((user) => user.status === value).length}
          </button>
        ))}
      </div>

      {shown.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {shown.map((user) => (
            <PhotoCard key={`${user.id}:${user.photoUrl}`} user={user} />
          ))}
        </div>
      ) : (
        !isLoading && (
          <div className="rounded-[24px] border border-dashed border-slate-200 bg-white py-16 text-center font-bdo text-sm text-slate-400">
            {filter === 'pending' ? 'Tidak ada foto yang menunggu tinjauan.' : 'Tidak ada foto di filter ini.'}
          </div>
        )
      )}
    </section>
  )
}
