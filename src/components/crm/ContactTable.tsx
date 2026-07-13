'use client';

import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  getSortedRowModel,
  SortingState,
  getPaginationRowModel,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Contact } from '@/types/crm';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { useRouter } from 'next/navigation';
import { Pagination } from '@/components/common/Pagination';
import { ContactRowSkeleton } from './skeletons/ContactRowSkeleton';

interface ContactTableProps {
  contacts: Contact[];
  onSelectContact: (id: string) => void;
  selectedIds: Set<string>;
  onToggleAll: (checked: boolean) => void;
  onToggleOne: (id: string, checked: boolean) => void;
  isLoading?: boolean;
}

const columnHelper = createColumnHelper<Contact>();

export function ContactTable({
  contacts,
  onSelectContact,
  selectedIds,
  onToggleAll,
  onToggleOne,
  isLoading = false
}: ContactTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const router = useRouter();

  const isAllSelected = contacts.length > 0 && selectedIds.size === contacts.length;

  const columns = useMemo(() => [
    columnHelper.display({
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={isAllSelected}
          onCheckedChange={(value) => onToggleAll(!!value)}
          className="border-dash-border data-[state=checked]:bg-dash-accent data-[state=checked]:border-dash-accent"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedIds.has(row.original.id)}
          onCheckedChange={(value) => onToggleOne(row.original.id, !!value)}
          className="border-dash-border data-[state=checked]:bg-dash-accent data-[state=checked]:border-dash-accent"
          onClick={(e) => e.stopPropagation()}
        />
      ),
    }),
    columnHelper.accessor('first_name', {
      header: 'Lead name',
      cell: (info) => {
        const first = info.row.original.first_name?.[0] || '?';
        const last = info.row.original.last_name?.[0] || '';
        return (
        <div className="flex items-center gap-2.5 cursor-pointer group">
          <div className="w-7 h-7 rounded-lg bg-dash-surface border border-dash-border flex items-center justify-center text-[11px] font-bold !text-dash-text uppercase">
            {first}{last}
          </div>
          <span className="text-[13px] font-semibold !text-dash-text group-hover:text-dash-accent transition-colors motion-reduce:transition-none">
            {info.row.original.first_name || 'Unknown'} {info.row.original.last_name || ''}
          </span>
        </div>
      )},
    }),
    columnHelper.accessor('email', {
      header: 'Email address',
      cell: (info) => (
        <span className="text-[13px] !text-dash-textMuted">
          {info.getValue() || '—'}
        </span>
      ),
    }),
    columnHelper.accessor('phone', {
      header: 'Phone number',
      cell: (info) => (
        <span className="text-[13px] !text-dash-textMuted">
          {info.getValue() || '—'}
        </span>
      ),
    }),
    columnHelper.accessor('tags', {
      header: 'Tags',
      cell: (info) => (
        <div className="flex flex-wrap gap-1">
          {info.getValue()?.slice(0, 2).map(tag => (
            <span key={tag} className="px-1.5 py-0.5 rounded bg-dash-accent/10 text-dash-accent text-[11px] font-semibold">
              {tag}
            </span>
          ))}
          {(info.getValue()?.length || 0) > 2 && (
            <span className="text-[11px] !text-dash-textMuted font-semibold">+{info.getValue().length - 2}</span>
          )}
        </div>
      ),
    }),
    columnHelper.accessor('last_activity_at', {
      header: 'Last activity',
      cell: (info) => (
        <span className="text-[12px] !text-dash-textMuted">
          {info.getValue() ? new Date(info.getValue()!).toLocaleDateString() : 'Never'}
        </span>
      ),
    }),
  ], [selectedIds, isAllSelected, onToggleAll, onToggleOne]);

  const table = useReactTable({
    data: contacts,
    columns,
    state: { 
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="w-full flex flex-col h-full justify-between">
      <div className="w-full overflow-x-auto common-scrollbar flex-grow">
        <table className="w-full text-left border-collapse">
          <thead className="bg-dash-surface">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="border-b border-dash-border">
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className={cn(
                      "px-4 py-3 text-[11px] font-bold !text-dash-textMuted uppercase tracking-wide transition-colors motion-reduce:transition-none select-none",
                      header.column.getCanSort() && "cursor-pointer hover:!text-dash-text"
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-2">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <div className="flex flex-col leading-[1] text-dash-textMuted">
                          <ChevronUp
                            size={10}
                            className={header.column.getIsSorted() === 'asc' ? 'text-dash-accent' : ''}
                          />
                          <ChevronDown
                            size={10}
                            className={header.column.getIsSorted() === 'desc' ? 'text-dash-accent' : ''}
                          />
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-dash-border">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <ContactRowSkeleton key={`skeleton-${idx}`} />
              ))
            ) : (
              table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  onClick={() => router.push(`/contacts/${row.original.id}`)}
                  className={cn(
                    "group transition-colors motion-reduce:transition-none hover:bg-dash-surface/60 cursor-pointer border-b border-dash-border",
                    selectedIds.has(row.original.id) && "bg-dash-accent/5"
                  )}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-3 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Reusable Pagination Footer */}
      <Pagination
        pageIndex={pagination.pageIndex}
        pageSize={pagination.pageSize}
        totalRows={contacts.length}
        pageCount={table.getPageCount()}
        canPreviousPage={table.getCanPreviousPage()}
        canNextPage={table.getCanNextPage()}
        onPageChange={table.setPageIndex}
        onPageSizeChange={table.setPageSize}
        label="leads"
      />
    </div>
  );
}
