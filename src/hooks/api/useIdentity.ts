'use client'

import { decideMemberPhoto, getIdentityDocumentBlob, getIdentityIndex, getMemberPhotoIndex, verifyIdentity } from '@/services/Identity'
import type { IdentityVerifyPayload, MemberPhotoDecisionPayload } from '@/types/contracts/contracts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

// ===== Hooks data admin Antrean Identitas (Fase 8E) =====
// Keputusan verifikasi mengubah kategori harga user (warga_ub/umum) → ikut invalidate dashboard.

const IDENTITY = ['admin', 'identity'] as const

/** `enabled` false untuk staf tanpa identity.verify: badge Sidebar tidak boleh memicu 403. */
export function useIdentityIndex(enabled = true) {
  return useQuery({ queryKey: IDENTITY, queryFn: getIdentityIndex, enabled })
}

export function useVerifyIdentity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: IdentityVerifyPayload }) => verifyIdentity(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: IDENTITY })
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    }
  })
}

const MEMBER_PHOTOS = [...IDENTITY, 'member-photos'] as const

export function useMemberPhotoIndex(enabled = true) {
  return useQuery({ queryKey: MEMBER_PHOTOS, queryFn: getMemberPhotoIndex, enabled })
}

/** onSettled, bukan onSuccess: 409 (foto sudah diganti pelanggan) juga harus memuat ulang antrean. */
export function useDecideMemberPhoto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: MemberPhotoDecisionPayload }) => decideMemberPhoto(id, payload),
    onSettled: () => qc.invalidateQueries({ queryKey: MEMBER_PHOTOS })
  })
}

/**
 * Pengganti `<img src={document_url}>` Laravel: berkas privat diambil dengan Bearer lalu dijadikan
 * object URL. `failed` dipetakan ke cabang error yang sudah ada di halaman ("Gagal memuat dokumen.").
 * Object URL di-revoke saat url berganti atau komponen dilepas.
 */
export function useIdentityDocument(documentUrl: string | null) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setObjectUrl(null)
    setFailed(false)
    if (!documentUrl) return

    let revoked = false
    let created: string | null = null

    getIdentityDocumentBlob(documentUrl)
      .then((blob) => {
        if (revoked) return
        created = URL.createObjectURL(blob)
        setObjectUrl(created)
      })
      .catch(() => {
        if (!revoked) setFailed(true)
      })

    return () => {
      revoked = true
      if (created) URL.revokeObjectURL(created)
    }
  }, [documentUrl])

  return { objectUrl, failed }
}
