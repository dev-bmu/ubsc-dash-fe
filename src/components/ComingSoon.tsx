import { Hammer } from 'lucide-react'

// ===== Placeholder halaman Fase 8 =====
// Sementara: setiap route admin yang sudah ditautkan chrome (Sidebar/Topbar) TAPI halaman aslinya
// baru dibangun di Fase 8 memakai ini. typedRoutes mewajibkan setiap href punya halaman nyata
// (src/config/routes.ts melarang melonggarkan tipe), jadi placeholder ini yang membuat <Link>
// chrome type-check tanpa 404. Fase 8 mengganti tiap stub dengan port halaman aslinya dari Laravel.
export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-[#E35336] shadow-sm">
        <Hammer size={24} />
      </span>
      <div className="space-y-1">
        <h1 className="font-clash text-2xl font-semibold text-slate-900">{title}</h1>
        <p className="font-bdo text-sm text-slate-500">Halaman ini dibuat pada Fase 8.</p>
      </div>
    </div>
  )
}
