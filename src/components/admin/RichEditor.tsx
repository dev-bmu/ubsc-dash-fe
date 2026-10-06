'use client'

import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import type { Transaction } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import { EditorContent, type TiptapEditorHTMLElement, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo
} from 'lucide-react'
import { type ReactNode, useLayoutEffect, useRef } from 'react'
import { toast } from 'sonner'
import { SITE_URL } from '@/config/site'
import { extractApiError } from '@/lib/apiError'
import { cn } from '@/lib/utils'
import { uploadNewsContentImage } from '@/services/News'

interface RichEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  error?: string
}

interface ToolbarButtonProps {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: ReactNode
}

// Sama dengan SingleDropzone & validasi CMS_IMAGE di API.
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

type BlockType = 'p' | '2' | '3' | '4'

const imageFilesOf = (data: DataTransfer | null) => Array.from(data?.files ?? []).filter((file) => file.type.startsWith('image/'))

const baseName = (file: File) => file.name.replace(/\.[^.]+$/, '')

/**
 * Unggah gambar isi artikel lalu sisipkan sebagai node image. Server menolak `data:` (base64), jadi
 * SEMUA jalur (tombol, paste, drop) lewat sini. Alt ditanya SEBELUM unggah: batal = tidak ada berkas
 * yatim di server. `pos` null = di kursor; angka = titik jatuh (drop).
 */
async function insertImages(view: EditorView, files: File[], pos: number | null) {
  let at = pos
  // Titik jatuh dipetakan lewat SETIAP transaksi selama prompt/unggah (ketikan user, sisipan sebelumnya),
  // jadi gambar tidak mendarat di posisi dokumen yang sudah basi.
  const editor = (view.dom as TiptapEditorHTMLElement).editor
  const track = ({ transaction }: { transaction: Transaction }) => {
    if (at !== null) at = transaction.mapping.map(at)
  }
  editor?.on('transaction', track)
  try {
    for (const file of files) {
      if (!IMAGE_TYPES.includes(file.type)) {
        toast.error(`${file.name}: format harus JPG, PNG, atau WebP.`)
        continue
      }
      if (file.size > MAX_IMAGE_SIZE) {
        toast.error(`${file.name}: ukuran maksimal 5 MB.`)
        continue
      }
      const alt = window.prompt('Teks alternatif (alt) gambar — jelaskan isi gambar untuk mesin pencari dan pembaca layar:', baseName(file))
      if (alt === null) continue

      const toastId = toast.loading('Mengunggah gambar...')
      try {
        const { url } = await uploadNewsContentImage(file)
        if (view.isDestroyed) {
          toast.dismiss(toastId)
          return
        }
        const node = view.state.schema.nodes.image.create({ src: url, alt: alt.trim() || baseName(file) })
        const { tr } = view.state
        if (at === null) tr.replaceSelectionWith(node)
        else tr.insert(Math.min(at, tr.doc.content.size), node)
        view.dispatch(tr)
        toast.success('Gambar disisipkan.', { id: toastId })
      } catch (error) {
        toast.error(extractApiError(error).message, { id: toastId })
      }
    }
  } finally {
    editor?.off('transaction', track)
  }
}

function ToolbarBtn({ onClick, active, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-xl text-sm transition-colors',
        active ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100',
        disabled && 'cursor-not-allowed opacity-40'
      )}
    >
      {children}
    </button>
  )
}

const Divider = () => <div className="mx-1 h-5 w-px bg-gray-200" />

export function RichEditor({ value, onChange, placeholder = 'Mulai tulis isi artikel…', error }: RichEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
      // h1 sengaja tidak ada: judul artikel sudah menjadi <h1> di halaman publik.
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder }),
      // target/rel default Link ('_blank' + nofollow) dimatikan: hanya tautan eksternal yang dibuka di tab baru (setLink).
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { target: null, rel: null } })
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { 'aria-label': 'Isi artikel', 'aria-multiline': 'true', role: 'textbox' },
      handlePaste: (view, event) => {
        // Word/Excel/OneNote menyertakan PNG tangkapan seleksi di samping teksnya — teks yang menang.
        if (event.clipboardData?.getData('text/plain').trim()) return false
        const files = imageFilesOf(event.clipboardData)
        if (files.length === 0) return false
        void insertImages(view, files, null)
        return true
      },
      handleDrop: (view, event, _slice, moved) => {
        const files = moved ? [] : imageFilesOf(event.dataTransfer)
        if (files.length === 0) return false
        event.preventDefault()
        void insertImages(view, files, view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? null)
        return true
      }
    },
    // Wajib di App Router: TipTap merender editor saat SSR kalau ini true, sedangkan
    // ProseMirror baru menyusun DOM-nya di browser — hasilnya hydration mismatch.
    // Satu-satunya tambahan di luar sumber Laravel (Vite/CSR, jadi tidak perlu di sana).
    immediatelyRender: false
  })

  // `content` di atas hanya dibaca sekali saat editor dibuat, padahal form edit mengisi `value` setelah
  // data tiba — dulu editor terbuka kosong. Sinkronkan bila value berbeda dari isi editor. Ketikan sendiri
  // tidak memicu apa pun (onUpdate -> value === getHTML()). Layout effect, bukan effect: tidak ada celah
  // antara commit dan sinkronisasi tempat ketikan baru bisa tertimpa value yang basi.
  useLayoutEffect(() => {
    if (!editor || editor.isDestroyed || value === editor.getHTML()) return
    editor.chain().setMeta('addToHistory', false).setContent(value, false).run()
  }, [editor, value])

  if (!editor) return null

  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined
    const input = window.prompt('URL tautan (kosongkan untuk menghapus tautan):', prev ?? 'https://')
    if (input === null) return
    const raw = input.trim()
    if (raw === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    // "www.contoh.com" tanpa skema akan jadi path relatif — lengkapi https://.
    const href = /^([a-z][a-z0-9+.-]*:|\/|#)/i.test(raw) ? raw : `https://${raw}`
    const external = /^https?:\/\//i.test(href) && !href.startsWith(SITE_URL)
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink(external ? { href, target: '_blank', rel: 'noopener noreferrer' } : { href, target: null, rel: null })
      .run()
  }

  const blockType: BlockType = editor.isActive('heading', { level: 2 })
    ? '2'
    : editor.isActive('heading', { level: 3 })
      ? '3'
      : editor.isActive('heading', { level: 4 })
        ? '4'
        : 'p'

  const setBlockType = (next: BlockType) => {
    if (next === 'p') editor.chain().focus().setParagraph().run()
    else
      editor
        .chain()
        .focus()
        .setHeading({ level: Number(next) as 2 | 3 | 4 })
        .run()
  }

  const alignments = [
    { value: 'left', title: 'Rata kiri', icon: AlignLeft },
    { value: 'center', title: 'Rata tengah', icon: AlignCenter },
    { value: 'right', title: 'Rata kanan', icon: AlignRight },
    { value: 'justify', title: 'Rata kiri-kanan', icon: AlignJustify }
  ] as const

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-gray-200 bg-white transition-colors focus-within:border-gray-900',
        error && 'border-rose-400'
      )}
    >
      {/* Toolbar — di luar area gulir, jadi selalu terlihat saat naskah panjang digulir. */}
      <div role="toolbar" aria-label="Format teks" className="flex flex-wrap items-center gap-0.5 border-b border-gray-100 bg-gray-50 px-3 py-2">
        <select
          aria-label="Jenis blok"
          title="Jenis blok"
          value={blockType}
          onChange={(event) => setBlockType(event.target.value as BlockType)}
          className="mr-1 h-8 rounded-xl border border-gray-200 bg-white py-0 pr-8 pl-2.5 text-xs font-semibold text-gray-700 focus:border-gray-900 focus:ring-0"
        >
          <option value="p">Paragraf</option>
          <option value="2">Judul 2</option>
          <option value="3">Judul 3</option>
          <option value="4">Judul 4</option>
        </select>

        <ToolbarBtn title="Tebal" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}>
          <Bold size={14} />
        </ToolbarBtn>
        <ToolbarBtn title="Miring" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}>
          <Italic size={14} />
        </ToolbarBtn>
        <ToolbarBtn title="Garis bawah" onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')}>
          <UnderlineIcon size={14} />
        </ToolbarBtn>
        <ToolbarBtn title="Coret" onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')}>
          <Strikethrough size={14} />
        </ToolbarBtn>
        <ToolbarBtn title="Tautan" onClick={setLink} active={editor.isActive('link')}>
          <Link2 size={14} />
        </ToolbarBtn>

        <Divider />

        <ToolbarBtn title="Daftar berpoin" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}>
          <List size={14} />
        </ToolbarBtn>
        <ToolbarBtn title="Daftar bernomor" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}>
          <ListOrdered size={14} />
        </ToolbarBtn>
        <ToolbarBtn title="Kutipan" onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')}>
          <Quote size={14} />
        </ToolbarBtn>
        <ToolbarBtn title="Garis pemisah" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus size={14} />
        </ToolbarBtn>

        <Divider />

        {alignments.map(({ value: align, title, icon: Icon }) => (
          <ToolbarBtn
            key={align}
            title={title}
            onClick={() => editor.chain().focus().setTextAlign(align).run()}
            active={editor.isActive({ textAlign: align })}
          >
            <Icon size={14} />
          </ToolbarBtn>
        ))}

        <Divider />

        <ToolbarBtn
          title={editor.isActive('image') ? 'Ubah teks alt gambar' : 'Sisipkan gambar'}
          onClick={() => {
            // Gambar hasil tempel HTML bisa tanpa alt; ini satu-satunya cara mengisinya tanpa unggah ulang.
            if (editor.isActive('image')) {
              const alt = window.prompt('Teks alternatif (alt):', editor.getAttributes('image').alt ?? '')
              if (alt !== null) editor.chain().focus().updateAttributes('image', { alt: alt.trim() }).run()
              return
            }
            fileInputRef.current?.click()
          }}
        >
          <ImagePlus size={14} />
        </ToolbarBtn>
        <input
          ref={fileInputRef}
          type="file"
          accept={IMAGE_TYPES.join(',')}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) void insertImages(editor.view, [file], null)
          }}
        />

        <Divider />

        <ToolbarBtn title="Urungkan" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
          <Undo size={14} />
        </ToolbarBtn>
        <ToolbarBtn title="Ulangi" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
          <Redo size={14} />
        </ToolbarBtn>
      </div>

      {/* Editor canvas */}
      <EditorContent
        editor={editor}
        className={cn(
          'prose prose-sm max-h-[70vh] max-w-none overflow-y-auto px-4 py-4 focus:outline-none',
          'prose-headings:font-semibold prose-headings:text-slate-900 prose-h2:text-xl prose-h3:text-lg prose-h4:text-base',
          'prose-figcaption:text-center prose-img:my-4 prose-img:max-w-full prose-img:rounded-xl',
          '[&_.tiptap]:min-h-80 [&_.tiptap]:outline-none [&_.tiptap_img.ProseMirror-selectednode]:ring-2 [&_.tiptap_img.ProseMirror-selectednode]:ring-[#E35336]',
          '[&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:h-0 [&_.tiptap_p.is-editor-empty:first-child::before]:text-gray-400 [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]'
        )}
      />

      {error && <p className="border-t border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-500">{error}</p>}
    </div>
  )
}
