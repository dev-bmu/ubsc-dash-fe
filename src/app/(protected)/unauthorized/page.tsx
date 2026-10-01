import { Forbidden } from '@/components/errors/Forbidden'

// Halaman 403 admin. Ada DI DALAM grup (protected) supaya tampil bersama chrome (Sidebar+Topbar),
// sama seperti Errors/Forbidden.tsx Laravel yang membungkus AdminLayout untuk staff. AuthGuard
// mengizinkannya (canAccessPathByRole('/unauthorized') = true, tanpa gate), jadi tidak memantul.
//
// Di Laravel kontennya jadi children AdminLayout → masuk <main>. Di sini <main> yang PERSIS itu
// dirender di halaman (shell AdminLayout kini rangka saja), meniru pembungkusan Laravel.
export default function UnauthorizedPage() {
  return (
    <main className="max-w-full flex-1 px-4 pt-2 pb-10 xl:px-8">
      <Forbidden />
    </main>
  )
}
