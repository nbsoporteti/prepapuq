import React from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/shared/EmptyState.jsx';
import { cn } from '@/lib/utils';

/**
 * DataTable genérica wrap de @tanstack/react-table + shadcn Table.
 * Soporta: sort por columna, filtro global de texto, paginación local,
 * skeleton de carga, empty state custom. Server-side queda para v2.
 *
 * Props:
 *  - columns: array de column defs de tanstack
 *  - data: array
 *  - isLoading: bool
 *  - emptyTitle/emptyDescription/emptyIcon: para EmptyState
 *  - searchPlaceholder: texto del input de búsqueda
 *  - searchFn?: (row, query) => boolean — filtro custom; si se omite, busca
 *    en JSON.stringify(row) case-insensitive
 *  - initialPageSize: default 20
 *  - toolbar?: ReactNode que se monta a la derecha del search (botones bulk)
 *  - getRowClassName?: (row) => string
 */
const DataTable = ({
  columns,
  data = [],
  isLoading = false,
  emptyIcon,
  emptyTitle = 'Sin resultados',
  emptyDescription,
  searchPlaceholder = 'Buscar...',
  searchFn,
  initialPageSize = 20,
  toolbar,
  getRowClassName,
}) => {
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [sorting, setSorting] = React.useState([]);

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: initialPageSize } },
    globalFilterFn: searchFn
      ? (row, _columnId, query) => searchFn(row.original, query)
      : (row, _columnId, query) => {
          if (!query) return true;
          return JSON.stringify(row.original).toLowerCase().includes(String(query).toLowerCase());
        },
  });

  const rows = table.getRowModel().rows;
  const total = table.getFilteredRowModel().rows.length;
  const pageSize = table.getState().pagination.pageSize;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
          />
        </div>
        {toolbar && <div className="flex items-center gap-2 flex-wrap">{toolbar}</div>}
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="bg-muted/40 hover:bg-muted/40">
                {hg.headers.map((h) => (
                  <TableHead key={h.id} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                    {h.isPlaceholder
                      ? null
                      : h.column.getCanSort()
                      ? (
                        <button
                          type="button"
                          onClick={h.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          <ArrowUpDown className="h-3 w-3 opacity-60" />
                        </button>
                      )
                      : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={'sk-' + i}>
                    {columns.map((_c, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full max-w-[12rem]" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : rows.length === 0
              ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="p-0">
                    <EmptyState
                      icon={emptyIcon}
                      title={emptyTitle}
                      description={emptyDescription}
                      className="border-0 rounded-none shadow-none bg-transparent"
                    />
                  </TableCell>
                </TableRow>
              )
              : rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn('hover:bg-muted/30 transition-colors duration-fast', getRowClassName && getRowClassName(row.original))}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {total > pageSize && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Mostrando <strong className="text-foreground">{rows.length ? pageIndex * pageSize + 1 : 0}</strong>
            -
            <strong className="text-foreground">{Math.min(total, (pageIndex + 1) * pageSize)}</strong>
            {' '}de{' '}
            <strong className="text-foreground">{total}</strong>
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <span className="font-mono text-xs">
              {pageIndex + 1} / {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
