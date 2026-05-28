import * as React from 'react';
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Column } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronsUpDown, EyeOff } from 'lucide-react';
import { Button } from './button';
import { Checkbox } from './checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { cn } from '../../lib/utils';

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enablePagination?: boolean;
  pageSize?: number;
  enableColumnVisibility?: boolean;
  enableRowSelection?: boolean;
  manualPagination?: boolean;
  pageCount?: number;
  onPaginationChange?: (pageIndex: number, pageSize: number) => void;
  rowSelection?: Record<string, boolean>;
  onRowSelectionChange?: (selection: Record<string, boolean>) => void;
  getRowId?: (row: TData) => string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  enableSorting = true,
  enableFiltering = false,
  enablePagination = false,
  pageSize = 25,
  enableColumnVisibility = false,
  enableRowSelection = false,
  manualPagination = false,
  pageCount: controlledPageCount,
  onPaginationChange,
  rowSelection: controlledRowSelection,
  onRowSelectionChange,
  getRowId,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>(
    controlledRowSelection ?? {},
  );
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize });

  const tableContainerRef = React.useRef<HTMLDivElement>(null);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting: enableSorting ? sorting : undefined,
      columnFilters: enableFiltering ? columnFilters : undefined,
      columnVisibility,
      rowSelection: enableRowSelection ? rowSelection : undefined,
      pagination: enablePagination && manualPagination ? pagination : undefined,
    },
    enableRowSelection,
    onSortingChange: enableSorting
      ? (updater) => {
          const next = typeof updater === 'function' ? updater(sorting) : updater;
          setSorting(next);
        }
      : undefined,
    onColumnFiltersChange: enableFiltering
      ? (updater) => {
          const next = typeof updater === 'function' ? updater(columnFilters) : updater;
          setColumnFilters(next);
        }
      : undefined,
    onColumnVisibilityChange: enableColumnVisibility ? setColumnVisibility : undefined,
    onRowSelectionChange: enableRowSelection
      ? (updater) => {
          const next = typeof updater === 'function' ? updater(rowSelection) : updater;
          setRowSelection(next);
          onRowSelectionChange?.(next);
        }
      : undefined,
    onPaginationChange: enablePagination
      ? (updater) => {
          const next = typeof updater === 'function' ? updater(pagination) : updater;
          setPagination(next);
          onPaginationChange?.(next.pageIndex, next.pageSize);
        }
      : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: enableFiltering ? getFilteredRowModel() : undefined,
    getFacetedRowModel: enableFiltering ? getFacetedRowModel() : undefined,
    getFacetedUniqueValues: enableFiltering ? getFacetedUniqueValues() : undefined,
    getPaginationRowModel:
      enablePagination && !manualPagination ? getPaginationRowModel() : undefined,
    manualPagination,
    pageCount: controlledPageCount,
    getRowId,
  });

  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 28,
    overscan: 20,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  return (
    <div className="flex flex-col gap-2">
      {enableColumnVisibility && <DataTableViewOptions table={table} />}
      <div ref={tableContainerRef} className="overflow-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{
                      width: header.getSize() !== 150 ? header.getSize() : undefined,
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            ) : (
              <TableRow
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  position: 'relative',
                }}
              >
                <TableCell
                  colSpan={columns.length}
                  className="p-0"
                  style={{ position: 'relative' }}
                >
                  {virtualItems.map((virtualRow) => {
                    const row = rows[virtualRow.index];
                    return (
                      <div
                        key={row.id}
                        className="absolute left-0 top-0 flex w-full items-center border-b hover:bg-muted/30"
                        style={{
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <div
                            key={cell.id}
                            className="flex shrink-0 items-center overflow-hidden text-xs"
                            style={{
                              width:
                                cell.column.getSize() !== 150 ? cell.column.getSize() : undefined,
                            }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {enablePagination && <DataTablePagination table={table} />}
    </div>
  );
}

export interface DataTableColumnHeaderProps<
  TData,
  TValue,
> extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-6 px-1 text-xs"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'desc')}
      >
        <span>{title}</span>
        {column.getIsSorted() === 'desc' ? (
          <ArrowDown className="h-3 w-3" />
        ) : column.getIsSorted() === 'asc' ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ChevronsUpDown className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}

export interface DataTableRowCheckboxProps {
  checked: boolean | 'indeterminate';
  onCheckedChange: (value: boolean) => void;
  ariaLabel: string;
}

export function DataTableRowCheckbox({
  checked,
  onCheckedChange,
  ariaLabel,
}: DataTableRowCheckboxProps) {
  return <Checkbox checked={checked} onCheckedChange={onCheckedChange} aria-label={ariaLabel} />;
}

export interface DataTablePaginationProps<TData> {
  table: ReturnType<typeof useReactTable<TData>>;
}

export function DataTablePagination<TData>({ table }: DataTablePaginationProps<TData>) {
  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex-1 text-xs text-muted-foreground">
        {table.getFilteredSelectedRowModel().rows.length > 0
          ? `${table.getFilteredSelectedRowModel().rows.length} of ${table.getFilteredRowModel().rows.length} row(s) selected.`
          : `${table.getFilteredRowModel().rows.length} row(s)`}
      </div>
      <div className="flex items-center gap-4">
        {table.getPageCount() > 1 && (
          <div className="flex items-center gap-1 text-xs font-medium">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </div>
        )}
        <Select
          value={String(table.getState().pagination.pageSize)}
          onValueChange={(value) => table.setPageSize(Number(value))}
        >
          <SelectTrigger className="h-6 w-[70px] text-xs">
            <SelectValue placeholder={table.getState().pagination.pageSize} />
          </SelectTrigger>
          <SelectContent side="top">
            {[10, 25, 50, 100].map((size) => (
              <SelectItem key={size} value={String(size)} className="text-xs">
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to first page</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M8 2L4 6L8 10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M4 2L0 6L4 10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to previous page</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M8 2L4 6L8 10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to next page</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 2L8 6L4 10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to last page</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 2L8 6L4 10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8 2L12 6L8 10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}

export interface DataTableViewOptionsProps<TData> {
  table: ReturnType<typeof useReactTable<TData>>;
}

export function DataTableViewOptions<TData>({ table }: DataTableViewOptionsProps<TData>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto h-7 text-xs">
          <EyeOff className="mr-1 h-3 w-3" />
          View
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[150px]">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter((column) => typeof column.accessorFn !== 'undefined' && column.getCanHide())
          .map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              className="capitalize"
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(!!value)}
            >
              {column.id}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
