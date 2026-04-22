'use client'

import {
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useState } from 'react'
import {
  IconArrowsSort,
  IconSortAscending,
  IconSortDescending,
  IconSearch,
} from '@tabler/icons-react'
import { motion, AnimatePresence } from 'motion/react'

import { cn } from '@/lib/utils'

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  onRowClick?: (row: TData) => void
  emptyMessage?: string
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Search...',
  onRowClick,
  emptyMessage = 'No results.',
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: { sorting, columnFilters },
  })

  return (
    <div className="overflow-hidden rounded-3xl bg-card shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] ring-1 ring-border/50">
      {searchKey ? (
        <div className="border-b border-border/40 bg-muted/10 px-6 py-5">
          <div className="relative max-w-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <IconSearch className="h-4 w-4 text-muted-foreground" />
            </div>
            <input
              placeholder={searchPlaceholder}
              value={
                (table.getColumn(searchKey)?.getFilterValue() as string) ?? ''
              }
              onChange={(e) =>
                table.getColumn(searchKey)?.setFilterValue(e.target.value)
              }
              className="h-10 w-full rounded-xl border border-border/60 bg-background/50 pr-4 pl-10 text-sm shadow-sm transition-[border-color,box-shadow,background-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] outline-none placeholder:text-muted-foreground hover:bg-background focus-visible:border-primary/50 focus-visible:bg-background focus-visible:ring-4 focus-visible:ring-primary/10"
            />
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border/40 bg-muted/20 text-left text-xs tracking-wider text-muted-foreground uppercase">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      'px-6 py-4 font-semibold',
                      header.column.getCanSort() &&
                        'cursor-pointer transition-colors duration-200 select-none hover:text-foreground'
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-2">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      {header.column.getCanSort() ? (
                        <span className="inline-flex size-4 items-center justify-center rounded-md bg-transparent transition-colors hover:bg-muted/50">
                          {header.column.getIsSorted() === 'asc' ? (
                            <IconSortAscending className="size-3.5 text-primary" />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <IconSortDescending className="size-3.5 text-primary" />
                          ) : (
                            <IconArrowsSort className="size-3.5 opacity-30 group-hover:opacity-100" />
                          )}
                        </span>
                      ) : null}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border/40">
            <AnimatePresence mode="popLayout">
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row, index) => (
                  <motion.tr
                    key={row.id}
                    layout="position"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{
                      delay: Math.min(index * 0.04, 0.4),
                      duration: 0.4,
                      ease: [0.23, 1, 0.32, 1],
                    }}
                    className={cn(
                      'group transition-colors duration-200',
                      onRowClick && 'cursor-pointer hover:bg-muted/20'
                    )}
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-6 py-5 text-foreground/90 transition-colors group-hover:text-foreground"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </motion.tr>
                ))
              ) : (
                <motion.tr
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <td
                    colSpan={columns.length}
                    className="px-6 py-16 text-center text-sm text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="rounded-full bg-muted/30 p-3">
                        <IconSearch className="h-6 w-6 opacity-40" />
                      </div>
                      <p>{emptyMessage}</p>
                    </div>
                  </td>
                </motion.tr>
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export type { ColumnDef } from '@tanstack/react-table'
