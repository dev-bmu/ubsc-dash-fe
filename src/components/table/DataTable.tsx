'use client'

import { useMemo, useState } from 'react'
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronsUpDown, ChevronLeft, ChevronRight, Search, Inbox } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export interface FacetFilter {
  columnId: string
  label: string
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchPlaceholder?: string
  emptyText?: string
  facets?: FacetFilter[]
}

const ALL = '__ALL__'

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = 'Cari...',
  emptyText = 'Tidak ada data.',
  facets = []
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } }
  })

  // Nilai unik per kolom facet (dari seluruh data) untuk isi dropdown.
  const facetOptions = useMemo(() => {
    const rows = table.getCoreRowModel().rows
    return facets.map((f) => ({
      ...f,
      values: Array.from(new Set(rows.map((r) => r.getValue(f.columnId)).filter((v): v is string => typeof v === 'string' && v !== ''))).sort()
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, facets])

  const totalRows = table.getFilteredRowModel().rows.length
  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const from = totalRows === 0 ? 0 : pageIndex * pageSize + 1
  const to = Math.min((pageIndex + 1) * pageSize, totalRows)
  const colCount = table.getAllLeafColumns().length

  return (
    <Card className="gap-4 p-4 sm:p-5">
      {/* Toolbar: search kiri, filter dropdown kanan */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={globalFilter ?? ''} onChange={(e) => setGlobalFilter(e.target.value)} placeholder={searchPlaceholder} className="pl-9" />
        </div>

        {facetOptions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {facetOptions.map((f) => {
              const col = table.getColumn(f.columnId)
              const value = (col?.getFilterValue() as string) ?? ALL
              return (
                <Select key={f.columnId} value={value} onValueChange={(v) => col?.setFilterValue(v === ALL ? undefined : v)}>
                  <SelectTrigger className="h-9 w-full sm:w-[160px]">
                    <SelectValue placeholder={f.label} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Semua {f.label}</SelectItem>
                    {f.values.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            })}
          </div>
        )}
      </div>

      {/* Tabel (scroll horizontal di layar kecil) */}
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="bg-muted/50 hover:bg-muted/50">
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sorted = header.column.getIsSorted()
                  return (
                    <TableHead key={header.id} className="font-semibold whitespace-nowrap">
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === 'asc' ? (
                            <ArrowUp className="h-3.5 w-3.5" />
                          ) : sorted === 'desc' ? (
                            <ArrowDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="transition-colors">
                  {row.getVisibleCells().map((cell, i) => (
                    <TableCell key={cell.id} className={i === 0 ? 'font-medium' : 'text-muted-foreground'}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={colCount} className="h-32">
                  <div className="flex flex-col items-center justify-center gap-2 text-center">
                    <Inbox className="h-7 w-7 text-muted-foreground/60" />
                    <p className="text-sm text-muted-foreground">{emptyText}</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer pagination */}
      <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>
          {from}–{to} dari {totalRows}
        </span>
        <div className="flex items-center justify-between gap-4 sm:justify-end">
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">Baris per halaman</span>
            <Select value={String(pageSize)} onValueChange={(v) => table.setPageSize(Number(v))}>
              <SelectTrigger className="h-8 w-[72px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-1 tabular-nums">
              {pageIndex + 1} / {table.getPageCount() || 1}
            </span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
