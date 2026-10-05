'use client'

import { Banknote, Check, ExternalLink, QrCode, Settings2, Trash2, Upload, X } from 'lucide-react'
import { type FormEvent, type MouseEvent, useState } from 'react'
import { toast } from 'sonner'
import {
  useApprovePayment,
  usePaymentsIndex,
  useRejectPayment,
  useRemoveQris,
  useUpdatePaymentSettings,
  useUploadQris
} from '@/hooks/api/usePayments'
import { extractApiError, fieldErrorMap } from '@/lib/apiError'
import { openPaymentProof } from '@/services/Payments'
import type { AdminPaymentRowDto, PaymentQueueTab, PaymentSettingsDto } from '@/types/contracts/contracts'

type PaymentRow = AdminPaymentRowDto

const rupiah = (n: number) => 'Rp ' + n.toLocaleString('id-ID')

const TABS: { key: PaymentQueueTab; label: string }[] = [
  { key: 'awaiting', label: 'Menunggu Verifikasi' },
  { key: 'rejected', label: 'Ditolak' },
  { key: 'paid', label: 'Lunas' }
]

const EMPTY_SETTINGS: PaymentSettingsDto = {
  bank: { bank: '', accountNumber: '', accountHolder: '' },
  qris: null,
  holdMinutes: 120,
  adminFee: 500,
  uniqueCodeMax: 500
}

export default function PaymentsIndex() {
  // Pengganti router.get(route('admin.payments.index'), { tab }) Inertia: tab jadi state lokal.
  const [tab, setTab] = useState<PaymentQueueTab>('awaiting')
  const { data, isLoading } = usePaymentsIndex(tab)

  const transactions = data?.transactions ?? []
  const counts = data?.counts ?? { awaiting: 0, rejected: 0 }
  const settings: PaymentSettingsDto = data
    ? { bank: data.bank, qris: data.qris, holdMinutes: data.holdMinutes, adminFee: data.adminFee, uniqueCodeMax: data.uniqueCodeMax }
    : EMPTY_SETTINGS

  const [rejecting, setRejecting] = useState<PaymentRow | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  return (
    <main className="max-w-full flex-1 px-4 pt-2 pb-10 xl:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-clash text-2xl font-semibold text-slate-950">Verifikasi Pembayaran</h1>
          <p className="mt-1 font-bdo text-sm text-slate-500">
            Cocokkan nominal transfer dengan mutasi rekening. Nominal = harga + biaya admin + kode unik, berbeda untuk tiap transfer yang masih
            terbuka.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowSettings((v) => !v)}
          className="inline-flex h-11 items-center gap-2 rounded-[16px] border border-slate-200 bg-white px-4 font-clash text-sm font-semibold text-slate-600 transition hover:border-[#F8B5A8] hover:bg-[#FFF7F5] hover:text-[#B93D2A]"
        >
          <Settings2 className="h-4 w-4" />
          Pengaturan Pembayaran
        </button>
      </div>

      {/* key: form diinisialisasi sekali (seperti useForm); remount saat data pertama tiba agar tak terisi kosong. */}
      {showSettings && <SettingsPanel key={data ? 'ready' : 'loading'} settings={settings} />}

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const count = t.key === 'awaiting' ? counts.awaiting : t.key === 'rejected' ? counts.rejected : null

          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex h-10 items-center rounded-2xl px-4 font-clash text-sm font-semibold transition ${
                tab === t.key
                  ? 'bg-gray-900 text-white shadow-[inset_0_1px_0_rgb(255,255,255,0.08)]'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {t.label}
              {count ? (
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 font-bdo text-[11px] font-bold ${
                    tab === t.key ? 'bg-white/20 text-white' : 'bg-[#E35336] text-white'
                  }`}
                >
                  {count}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {transactions.length === 0 ? (
        !isLoading && (
          <div className="mt-6 rounded-[24px] border border-dashed border-slate-200 bg-white py-20 text-center font-bdo text-sm text-slate-400">
            Tidak ada transaksi di tab ini.
          </div>
        )
      ) : (
        <div className="mt-6 space-y-4">
          {transactions.map((t) => (
            <PaymentCard key={t.id} row={t} onReject={() => setRejecting(t)} />
          ))}
        </div>
      )}

      {rejecting && <RejectDialog row={rejecting} onClose={() => setRejecting(null)} />}
    </main>
  )
}

function PaymentCard({ row, onReject }: { row: PaymentRow; onReject: () => void }) {
  const [busy, setBusy] = useState(false)
  const approvePayment = useApprovePayment()

  const approve = async () => {
    setBusy(true)
    try {
      const result = await approvePayment.mutateAsync(row.id)
      toast.success(
        'Pembayaran ' +
          result.receiptNumber +
          ' dikonfirmasi.' +
          (result.mailQueued ? ' Email konfirmasi terkirim ke pelanggan.' : ' Email konfirmasi GAGAL terkirim — beri tahu pelanggan secara manual.')
      )
    } catch (error) {
      toast.error(extractApiError(error).message)
    } finally {
      setBusy(false)
    }
  }

  // Laravel: <a href={proof_url} target=_blank> (cookie sesi). Admin Next pakai Bearer → ambil blob lewat axios.
  const openProof = async (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    if (!row.proofUrl) return
    try {
      await openPaymentProof(row.proofUrl)
    } catch (error) {
      toast.error(extractApiError(error).message)
    }
  }

  // Tiga digit terakhir (biaya admin + kode unik) yang dicari staff di mutasi rekening.
  const head = String(row.total).slice(0, -3)
  const tail = String(row.total).slice(-3)

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-bdo text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            {row.receiptNumber} · {row.type === 'booking' ? 'Booking' : 'Membership'}
          </p>
          <p className="mt-1 font-clash text-lg font-semibold text-slate-950">{row.customer.name}</p>
          <p className="font-bdo text-sm text-slate-500">
            {row.customer.email}
            {row.customer.phone ? ` · ${row.customer.phone}` : ''}
          </p>

          <div className="mt-3 font-bdo text-sm text-slate-600">
            {row.type === 'booking' ? (
              <>
                <span className="font-semibold text-slate-900">{row.subject.facility}</span>
                {row.subject.unit ? ` · ${row.subject.unit}` : ''}
                <br />
                {row.subject.date} · {row.subject.time}
              </>
            ) : (
              row.subject.plan
            )}
          </div>
        </div>

        <div className="rounded-[20px] border border-[#F8B5A8]/70 bg-[linear-gradient(145deg,#FFFFFF_0%,#FFF7F5_100%)] px-4 py-3 text-right">
          <p className="font-bdo text-[10px] font-bold tracking-wider text-slate-400 uppercase">Cari nominal ini</p>
          <p className="mt-1 font-clash text-2xl font-bold text-slate-950 tabular-nums">
            Rp {Number(head).toLocaleString('id-ID')}
            <span className="text-[#E35336]">.{tail}</span>
          </p>
          <p className="mt-0.5 font-bdo text-[11px] text-slate-500">
            {rupiah(row.amount)}
            {row.adminFee > 0 ? ` + admin ${rupiah(row.adminFee)}` : ''} + kode {row.uniqueCode}
          </p>
        </div>
      </div>

      {row.rejectionReason && (
        <p className="mt-4 rounded-[15px] border border-rose-200 bg-rose-50 px-3 py-2 font-bdo text-sm text-rose-600">
          Alasan penolakan: {row.rejectionReason}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
        {row.proofUrl ? (
          <a
            href={row.proofUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={openProof}
            className="inline-flex h-10 items-center gap-2 rounded-[15px] border border-slate-200 bg-slate-50 px-4 font-bdo text-xs font-bold text-slate-600 transition hover:border-[#F8B5A8] hover:bg-[#FFF7F5] hover:text-[#B93D2A]"
          >
            <ExternalLink className="h-4 w-4" />
            Lihat Bukti
          </a>
        ) : (
          <span className="font-bdo text-sm text-slate-400">Belum ada bukti</span>
        )}

        <span className="font-bdo text-xs text-slate-400">
          {row.proofUploadedAt ? `Diunggah ${row.proofUploadedAt}` : ''}
          {row.paidAt ? `Lunas ${row.paidAt}` : ''}
          {row.verifiedBy ? ` · oleh ${row.verifiedBy}` : ''}
        </span>

        {row.paymentStatus === 'UNPAID' && (
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={onReject}
              disabled={busy}
              className="inline-flex h-10 items-center gap-1.5 rounded-[15px] border border-rose-200 bg-rose-50 px-4 font-clash text-sm font-semibold text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              Tolak
            </button>
            <button
              type="button"
              onClick={approve}
              disabled={busy}
              className="inline-flex h-10 items-center gap-1.5 rounded-[15px] bg-emerald-600 px-5 font-clash text-sm font-semibold text-white shadow-[0_14px_28px_-20px_rgba(5,150,105,.9)] transition hover:bg-emerald-500 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              Setujui
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function RejectDialog({ row, onClose }: { row: PaymentRow; onClose: () => void }) {
  const [data, setData] = useState({ reason: '' })
  // Seperti useForm Inertia: error lama bertahan selama request, diganti/dihapus saat respons tiba.
  const [errors, setErrors] = useState<Record<string, string>>({})
  const rejectPayment = useRejectPayment()
  const processing = rejectPayment.isPending

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      const result = await rejectPayment.mutateAsync({ id: row.id, reason: data.reason })
      setErrors({})
      toast.success(
        'Bukti ditolak dan slot dilepas.' +
          (result.mailQueued
            ? ' Email pemberitahuan terkirim ke pelanggan.'
            : ' Email pemberitahuan GAGAL terkirim — beri tahu pelanggan secara manual.')
      )
      onClose()
    } catch (error) {
      const parsed = extractApiError(error)
      setErrors(fieldErrorMap(error))
      if (Object.keys(parsed.fields).length === 0) toast.error(parsed.message)
    }
  }

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-xs">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_24px_58px_-30px_rgba(15,23,42,.35)]"
      >
        <h2 className="font-clash text-lg font-semibold text-slate-950">Tolak bukti {row.receiptNumber}</h2>
        <p className="mt-1 font-bdo text-sm text-slate-500">Alasan ini ditampilkan ke pengguna agar mereka tahu apa yang harus diperbaiki.</p>

        <textarea
          value={data.reason}
          onChange={(e) => setData({ reason: e.target.value })}
          rows={3}
          autoFocus
          placeholder="Contoh: Nominal transfer tidak sesuai, kurang kode unik."
          className="mt-4 w-full rounded-[16px] border border-slate-200 bg-white p-3 font-bdo text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#E35336] focus:ring-1 focus:ring-[#E35336] focus:outline-hidden"
        />
        {errors.reason && <p className="mt-1.5 font-bdo text-xs text-rose-500">{errors.reason}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-[16px] border border-slate-200 bg-white px-5 font-clash text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={processing}
            className="h-11 rounded-[16px] bg-rose-600 px-5 font-clash text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-50"
          >
            Tolak Bukti
          </button>
        </div>
      </form>
    </div>
  )
}

function SettingsPanel({ settings }: { settings: PaymentSettingsDto }) {
  const [data, setFormData] = useState({
    bankName: settings.bank.bank,
    accountNumber: settings.bank.accountNumber,
    accountHolder: settings.bank.accountHolder,
    qrisMerchantName: settings.qris?.merchantName ?? '',
    holdMinutes: settings.holdMinutes,
    adminFee: settings.adminFee,
    uniqueCodeMax: settings.uniqueCodeMax
  })
  const setData = <K extends keyof typeof data>(key: K, value: (typeof data)[K]) => setFormData((prev) => ({ ...prev, [key]: value }))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const updateSettings = useUpdatePaymentSettings()
  const processing = updateSettings.isPending

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await updateSettings.mutateAsync({
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        accountHolder: data.accountHolder,
        qrisMerchantName: data.qrisMerchantName,
        holdMinutes: Number(data.holdMinutes),
        adminFee: Number(data.adminFee),
        uniqueCodeMax: Number(data.uniqueCodeMax)
      })
      setErrors({})
      toast.success('Pengaturan pembayaran disimpan.')
    } catch (error) {
      const parsed = extractApiError(error)
      setErrors(fieldErrorMap(error))
      if (Object.keys(parsed.fields).length === 0) toast.error(parsed.message)
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <QrisPanel qris={settings.qris} />
      <div className="mt-4 max-w-md">
        <Field
          label="Nama merchant QRIS"
          value={data.qrisMerchantName}
          onChange={(v) => setData('qrisMerchantName', v)}
          error={errors.qrisMerchantName}
          placeholder="UB SPORT CENTER"
          hint="Ditampilkan di bawah gambar QRIS di halaman bayar dan invoice."
        />
      </div>

      <p className="mt-6 flex items-center gap-2 border-t border-slate-100 pt-5 font-clash text-sm font-semibold text-slate-950">
        <Banknote className="h-4 w-4 text-[#E35336]" />
        Rekening bank (cadangan)
      </p>
      <p className="mt-1 font-bdo text-xs text-slate-500">Hanya ditampilkan ke pelanggan bila QRIS belum diunggah. Boleh dikosongkan.</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Nama Bank" value={data.bankName} onChange={(v) => setData('bankName', v)} error={errors.bankName} placeholder="BCA" />
        <Field
          label="Nomor Rekening"
          value={data.accountNumber}
          onChange={(v) => setData('accountNumber', v)}
          error={errors.accountNumber}
          placeholder="1234567890"
        />
        <Field
          label="Atas Nama"
          value={data.accountHolder}
          onChange={(v) => setData('accountHolder', v)}
          error={errors.accountHolder}
          placeholder="UB Sport Center"
        />
        <Field
          label="Batas waktu transfer (menit)"
          value={String(data.holdMinutes)}
          onChange={(v) => setData('holdMinutes', Number(v) || 0)}
          error={errors.holdMinutes}
          placeholder="120"
          type="number"
          hint="Slot dilepas otomatis jika belum ada bukti transfer dalam rentang ini."
        />
        <Field
          label="Biaya admin per transaksi (Rp)"
          value={String(data.adminFee)}
          onChange={(v) => setData('adminFee', Number(v) || 0)}
          error={errors.adminFee}
          placeholder="500"
          type="number"
          hint="Ditambahkan sekali ke setiap transaksi, termasuk walk-in dan membership. 0 = tanpa biaya admin. Transfer yang sudah terbuka tidak berubah."
        />
        <Field
          label="Kode unik maksimal"
          value={String(data.uniqueCodeMax)}
          onChange={(v) => setData('uniqueCodeMax', Number(v) || 0)}
          error={errors.uniqueCodeMax}
          placeholder="500"
          type="number"
          hint="Kode 1 sampai angka ini. Juga batas transfer terbuka bersamaan untuk harga yang sama."
        />
      </div>

      <button
        type="submit"
        disabled={processing}
        className="mt-5 h-11 rounded-[16px] bg-[linear-gradient(135deg,#F08C78_0%,#E35336_52%,#B93D2A_100%)] px-6 font-clash text-sm font-semibold text-white shadow-[0_18px_34px_-24px_rgba(227,83,54,.95)] transition hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
      >
        Simpan
      </button>
    </form>
  )
}

/**
 * Gambar QRIS statis merchant (keputusan client 2026-10-01). Pelanggan memindainya lalu mengetik
 * nominal persis; tersimpan langsung saat dipilih, terpisah dari tombol Simpan form.
 */
function QrisPanel({ qris }: { qris: PaymentSettingsDto['qris'] }) {
  const upload = useUploadQris()
  const remove = useRemoveQris()
  const busy = upload.isPending || remove.isPending

  const onFile = async (file: File | undefined) => {
    if (!file) return
    try {
      await upload.mutateAsync(file)
      toast.success('Gambar QRIS disimpan. Halaman bayar pelanggan kini memakai QRIS.')
    } catch (error) {
      toast.error(extractApiError(error).message)
    }
  }

  const onRemove = async () => {
    if (!window.confirm('Hapus QRIS? Halaman bayar pelanggan akan kembali menampilkan rekening bank.')) return
    try {
      await remove.mutateAsync()
      toast.success('QRIS dihapus.')
    } catch (error) {
      toast.error(extractApiError(error).message)
    }
  }

  return (
    <div>
      <p className="flex items-center gap-2 font-clash text-sm font-semibold text-slate-950">
        <QrCode className="h-4 w-4 text-[#E35336]" />
        QRIS pembayaran
      </p>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-44 w-44 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border border-slate-200 bg-white">
          {qris ? (
            // eslint-disable-next-line @next/next/no-img-element -- pratinjau QRIS dari /uploads, tampil apa adanya
            <img src={qris.imageUrl} alt="QRIS" className="h-full w-full object-contain p-2" />
          ) : (
            <span className="px-4 text-center font-bdo text-xs text-slate-400">Belum ada QRIS — pelanggan melihat rekening bank</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label
            className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[14px] border border-[#FFD5CD] bg-white px-4 font-bdo text-xs font-bold text-[#B93D2A] transition hover:bg-[#FFF1EE] ${busy ? 'pointer-events-none opacity-60' : ''}`}
          >
            <Upload className="h-4 w-4" />
            {upload.isPending ? 'Mengunggah...' : qris ? 'Ganti gambar QRIS' : 'Unggah gambar QRIS'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => {
                void onFile(event.target.files?.[0])
                event.target.value = ''
              }}
            />
          </label>
          {qris && (
            <button
              type="button"
              onClick={onRemove}
              disabled={busy}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[14px] border border-rose-200 bg-rose-50 px-4 font-bdo text-xs font-bold text-rose-600 transition hover:bg-rose-100 disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              Hapus QRIS
            </button>
          )}
          <p className="max-w-xs font-bdo text-[11px] leading-relaxed text-slate-400">
            Gambar QRIS statis dari bank/penyedia QRIS (JPG, PNG, WEBP, maks 5 MB). Pelanggan memindai lalu mengetik nominal persis (harga + biaya
            admin + kode unik).
          </p>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  error,
  placeholder,
  type = 'text',
  hint
}: {
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  placeholder?: string
  type?: string
  hint?: string
}) {
  return (
    <label className="block">
      <span className="font-bdo text-xs font-bold text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 h-11 w-full rounded-[16px] border border-slate-200 bg-white px-3.5 font-bdo text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#E35336] focus:ring-1 focus:ring-[#E35336] focus:outline-hidden"
      />
      {hint && <span className="mt-1 block font-bdo text-[11px] text-slate-400">{hint}</span>}
      {error && <span className="mt-1 block font-bdo text-xs text-rose-500">{error}</span>}
    </label>
  )
}
