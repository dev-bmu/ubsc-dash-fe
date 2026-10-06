'use client'

import { ArrowUpRight, Save } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { SingleDropzone } from '@/components/admin/ImageDropzone'
import { SeoCharCount, SerpPreview } from '@/components/admin/SeoPreview'
import { SITE_URL } from '@/config/site'
import { useSeoPages, useUpdateSeoPage } from '@/hooks/api/useSeo'
import { extractApiError, fieldErrorMap } from '@/lib/apiError'
import type { AdminPageSeoDto } from '@/types/contracts/contracts'
import { SEO_LIMITS, SITE_NAME } from '@/types/contracts/seo'

// ===== SEO Halaman (PRD tambahan §7.7) =====
// Satu kartu per halaman statis landing (SEO_PAGES di shared/seo.ts). Isian kosong = default kode;
// API menyimpan '' sebagai null. Simpan per kartu — landing direvalidasi lewat tag 'seo'.

const INPUT_CLASS =
  'mt-1.5 w-full rounded-[16px] border border-slate-200 bg-white px-3.5 font-bdo text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#E35336] focus:ring-1 focus:ring-[#E35336] focus:outline-hidden'

export default function SeoPagesIndex() {
  const { data, isLoading, isError } = useSeoPages()

  return (
    <main className="max-w-full flex-1 px-4 pt-2 pb-10 xl:px-8">
      <h1 className="font-clash text-2xl font-semibold text-slate-950">SEO Halaman</h1>
      <p className="mt-1 max-w-3xl font-bdo text-sm text-slate-500">
        Judul, meta deskripsi, dan gambar share (OG) tiap halaman publik. Kosongkan untuk memakai teks bawaan. Gambar share ideal 1200×630 px; gambar
        share Beranda juga dipakai sebagai gambar share bawaan seluruh situs.
      </p>

      {isError && (
        <div className="mt-6 rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 font-bdo text-sm text-rose-600">
          Gagal memuat pengaturan SEO. Muat ulang halaman.
        </div>
      )}
      {isLoading && <div className="mt-6 font-bdo text-sm text-slate-400">Memuat...</div>}

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        {data?.map((page) => (
          <SeoPageCard key={page.key} page={page} />
        ))}
      </div>
    </main>
  )
}

function SeoPageCard({ page }: { page: AdminPageSeoDto }) {
  const [form, setForm] = useState({ title: page.title ?? '', description: page.description ?? '', noindex: page.noindex })
  const [ogImage, setOgImage] = useState<File | null>(null)
  const [removeOgImage, setRemoveOgImage] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const update = useUpdateSeoPage()

  const title = form.title.trim() || page.defaultTitle
  const description = form.description.trim() || page.defaultDescription

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const formData = new FormData()
    formData.set('title', form.title)
    formData.set('description', form.description)
    formData.set('noindex', form.noindex ? '1' : '0')
    if (ogImage) formData.append('ogImage', ogImage)
    else if (removeOgImage) formData.set('removeOgImage', '1')

    try {
      const saved = await update.mutateAsync({ key: page.key, formData })
      setForm({ title: saved.title ?? '', description: saved.description ?? '', noindex: saved.noindex })
      setOgImage(null)
      setRemoveOgImage(false)
      setErrors({})
      toast.success(`SEO ${page.label} disimpan.`)
    } catch (error) {
      const fields = fieldErrorMap(error)
      setErrors(fields)
      if (Object.keys(fields).length === 0) toast.error(extractApiError(error).message)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-clash text-base font-semibold text-slate-950">{page.label}</p>
          <a
            href={`${SITE_URL}${page.path}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 font-bdo text-xs font-semibold text-slate-400 hover:text-[#B93D2A]"
          >
            {page.path}
            <ArrowUpRight size={12} />
          </a>
        </div>
        <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-bdo text-[10px] font-bold text-slate-500">
          {page.updatedAt ? `Disimpan ${page.updatedAt}` : 'Memakai bawaan'}
        </span>
      </div>

      <label className="block">
        <span className="flex items-center justify-between gap-3">
          <span className="font-bdo text-xs font-bold text-slate-500">Judul</span>
          {/* Selain Beranda, landing menambahkan ' | UB Sport Center' — ikut dihitung. */}
          <SeoCharCount field="title" length={page.key === 'home' ? title.length : title.length + SITE_NAME.length + 3} />
        </span>
        <input
          type="text"
          value={form.title}
          maxLength={SEO_LIMITS.titleMax}
          placeholder={page.defaultTitle}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          className={`${INPUT_CLASS} h-11`}
        />
        {errors.title && <span className="mt-1 block font-bdo text-xs text-rose-500">{errors.title}</span>}
      </label>

      <label className="block">
        <span className="flex items-center justify-between gap-3">
          <span className="font-bdo text-xs font-bold text-slate-500">Meta deskripsi</span>
          <SeoCharCount field="description" length={description.length} />
        </span>
        <textarea
          rows={3}
          value={form.description}
          maxLength={SEO_LIMITS.descriptionMax}
          placeholder={page.defaultDescription}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          className={`${INPUT_CLASS} resize-none py-3 leading-relaxed`}
        />
        {errors.description && <span className="mt-1 block font-bdo text-xs text-rose-500">{errors.description}</span>}
      </label>

      <SerpPreview title={page.key === 'home' ? title : `${title} | ${SITE_NAME}`} path={page.path} description={description} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          {/* Remount saat URL tersimpan berubah: pratinjau lama dibuang, jadi hapus berikutnya cukup sekali klik. */}
          <SingleDropzone
            key={page.ogImage ?? 'none'}
            label="Gambar Share (OG)"
            currentUrl={page.ogImage}
            onFileSelect={(file) => {
              setOgImage(file)
              // Berkas baru membatalkan "hapus": bila pratinjaunya dibuang lagi, dropzone kembali menampilkan gambar lama.
              if (file) setRemoveOgImage(false)
            }}
            onRemoveExisting={() => setRemoveOgImage(true)}
          />
          {errors.ogImage && <span className="mt-1 block font-bdo text-xs text-rose-500">{errors.ogImage}</span>}
        </div>

        <div className="flex flex-col justify-between gap-4">
          <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <span>
              <span className="block font-clash text-sm font-semibold text-slate-900">Sembunyikan dari mesin pencari</span>
              <span className="block font-bdo text-[11px] text-slate-400">noindex — halaman tetap bisa dibuka</span>
            </span>
            <input
              type="checkbox"
              checked={form.noindex}
              onChange={(event) => setForm((prev) => ({ ...prev, noindex: event.target.checked }))}
              className="h-5 w-5 rounded border-slate-300 text-[#E35336] focus:ring-[#E35336]"
            />
          </label>

          <button
            type="submit"
            disabled={update.isPending}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[16px] bg-[linear-gradient(135deg,#F08C78_0%,#E35336_52%,#B93D2A_100%)] px-6 font-clash text-sm font-semibold text-white shadow-[0_18px_34px_-24px_rgba(227,83,54,.95)] transition hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
          >
            <Save size={14} />
            {update.isPending ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </form>
  )
}
