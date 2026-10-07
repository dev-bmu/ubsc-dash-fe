'use client'

import type { Table } from '@tanstack/react-table'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaginationProps<TData> {
  table: Table<TData>
}

export function Pagination<TData>({ table }: PaginationProps<TData>) {
  const { pageIndex, pageSize } = table.getState().pagination
  const pageCount = table.getPageCount()
  const totalRows = table.getFilteredRowModel().rows.length
  const from = pageIndex * pageSize + 1
  const to = Math.min((pageIndex + 1) * pageSize, totalRows)

  const btnBase = 'flex h-9 w-9 items-center justify-center rounded-2xl text-sm font-medium transition-colors'

  return (
    <div className="flex flex-col items-center justify-between gap-3 px-1 pt-4 md:flex-row">
      <p className="text-xs text-gray-500">
        Showing{' '}
        <span className="font-medium text-gray-900">
          {totalRows === 0 ? 0 : from}–{to}
        </span>{' '}
        of <span className="font-medium text-gray-900">{totalRows}</span> results
      </p>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className={cn(
            btnBase,
            'bg-white shadow-[0_2px_8px_rgb(0,0,0,0.06)]',
            !table.getCanPreviousPage() ? 'cursor-not-allowed opacity-40' : 'hover:bg-gray-50'
          )}
          aria-label="Previous page"
        >
          <ChevronLeft size={15} />
        </button>

        {Array.from({ length: pageCount }, (_, i) => i).map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => table.setPageIndex(page)}
            className={cn(
              btnBase,
              page === pageIndex
                ? 'bg-gray-900 text-white shadow-[0_2px_8px_rgb(0,0,0,0.15)]'
                : 'bg-white text-gray-700 shadow-[0_2px_8px_rgb(0,0,0,0.06)] hover:bg-gray-50'
            )}
          >
            {page + 1}
          </button>
        ))}

        <button
          type="button"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className={cn(
            btnBase,
            'bg-white shadow-[0_2px_8px_rgb(0,0,0,0.06)]',
            !table.getCanNextPage() ? 'cursor-not-allowed opacity-40' : 'hover:bg-gray-50'
          )}
          aria-label="Next page"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500" htmlFor="page-size">
          Per page
        </label>
        <select
          id="page-size"
          value={pageSize}
          onChange={(e) => table.setPageSize(Number(e.target.value))}
          className="h-8 rounded-xl border-0 bg-white py-0 pr-7 pl-2 text-xs shadow-[0_2px_8px_rgb(0,0,0,0.06)] focus:ring-1 focus:ring-gray-900"
        >
          {[10, 20, 50].map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

// ===== Varian server-side =====
// Pagination di atas membaca state TanStack Table (paginasi di klien). Yang ini untuk daftar yang
// dipaginasi API: angka diambil dari meta envelope, perpindahan halaman dilaporkan lewat callback.

/** 1 … 4 5 6 … 20 — halaman pertama, terakhir, dan tetangga halaman aktif; celah satu halaman ditampilkan apa adanya. */
function pageItems(page: number, lastPage: number): Array<number | 'gap'> {
  const pages = [...new Set([1, page - 1, page, page + 1, lastPage])].filter((p) => p >= 1 && p <= lastPage).sort((a, b) => a - b)
  return pages.flatMap((p, i): Array<number | 'gap'> => {
    const gap = i === 0 ? 1 : p - pages[i - 1]
    return gap === 1 ? [p] : gap === 2 ? [p - 1, p] : ['gap', p]
  })
}

interface ServerPaginationProps {
  page: number
  perPage: number
  total: number
  lastPage: number
  onPageChange: (page: number) => void
  onPerPageChange: (perPage: number) => void
  perPageOptions?: number[]
}

export function ServerPagination({
  page,
  perPage,
  total,
  lastPage,
  onPageChange,
  onPerPageChange,
  perPageOptions = [10, 20, 50, 100]
}: ServerPaginationProps) {
  const from = total === 0 ? 0 : (page - 1) * perPage + 1
  const to = Math.min(page * perPage, total)
  const btnBase = 'flex h-9 min-w-9 items-center justify-center rounded-2xl px-2 text-sm font-medium transition-colors'
  const navBtn = (disabled: boolean) =>
    cn(btnBase, 'bg-white shadow-[0_2px_8px_rgb(0,0,0,0.06)]', disabled ? 'cursor-not-allowed opacity-40' : 'hover:bg-gray-50')

  return (
    <div className="flex flex-col items-center justify-between gap-3 px-1 pt-4 md:flex-row">
      <p className="text-xs text-gray-500">
        Menampilkan{' '}
        <span className="font-medium text-gray-900">
          {from}–{to}
        </span>{' '}
        dari <span className="font-medium text-gray-900">{total}</span>
      </p>

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={navBtn(page <= 1)}
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft size={15} />
        </button>

        {pageItems(page, lastPage).map((item, i) =>
          item === 'gap' ? (
            <span key={`gap-${i}`} className="px-1 text-sm text-gray-400">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              aria-current={item === page ? 'page' : undefined}
              className={cn(
                btnBase,
                item === page
                  ? 'bg-gray-900 text-white shadow-[0_2px_8px_rgb(0,0,0,0.15)]'
                  : 'bg-white text-gray-700 shadow-[0_2px_8px_rgb(0,0,0,0.06)] hover:bg-gray-50'
              )}
            >
              {item}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= lastPage}
          className={navBtn(page >= lastPage)}
          aria-label="Halaman berikutnya"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      <label className="flex items-center gap-2 text-xs text-gray-500">
        Per halaman
        <select
          value={perPage}
          onChange={(e) => onPerPageChange(Number(e.target.value))}
          className="h-8 rounded-xl border-0 bg-white py-0 pr-7 pl-2 text-xs shadow-[0_2px_8px_rgb(0,0,0,0.06)] focus:ring-1 focus:ring-gray-900"
        >
          {perPageOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
