'use client';

import React, { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  getSortedRowModel,
  SortingState,
} from '@tanstack/react-table';
import { Contact } from '@/types/crm';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

import { useRouter } from 'next/navigation';

interface ContactTableProps {
  contacts: Contact[];
  onSelectContact: (id: string) => void;
  selectedIds: Set<string>;
  onToggleAll: (checked: boolean) => void;
  onToggleOne: (id: string, checked: boolean) => void;
}

const columnHelper = createColumnHelper<Contact>();

export function ContactTable({
  contacts,
  onSelectContact,
  selectedIds,
  onToggleAll,
  onToggleOne
}: ContactTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const router = useRouter();

  const isAllSelected = contacts.length > 0 && selectedIds.size === contacts.length;

  const columns = useMemo(() => [
    columnHelper.display({
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={isAllSelected}
          onCheckedChange={(value) => onToggleAll(!!value)}
          className="border-white/20 data-[state=checked]:bg-[#2563eb] data-[state=checked]:border-[#2563eb]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedIds.has(row.original.id)}
          onCheckedChange={(value) => onToggleOne(row.original.id, !!value)}
          className="border-white/20 data-[state=checked]:bg-[#2563eb] data-[state=checked]:border-[#2563eb]"
          onClick={(e) => e.stopPropagation()}
        />
      ),
    }),
    columnHelper.accessor('first_name', {
      header: 'Lead Name',
      cell: (info) => (
        <div 
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[11px] font-bold text-[#eef2ff] font-space-grotesk">
            {info.row.original.first_name[0]}{info.row.original.last_name[0]}
          </div>
          <span className="text-[13px] font-semibold text-[#eef2ff] group-hover:text-[#3b82f6] transition-colors font-dm-sans">
            {info.getValue()} {info.row.original.last_name}
          </span>
        </div>
      ),
    }),
    columnHelper.accessor('email', {
      header: 'Email Address',
      cell: (info) => (
        <span className="text-[13px] text-[#94a3c8] font-dm-sans">
          {info.getValue() || '—'}
        </span>
      ),
    }),
    columnHelper.accessor('phone', {
      header: 'Phone Number',
      cell: (info) => (
        <span className="text-[13px] text-[#4a5a82] font-dm-sans">
          {info.getValue() || '—'}
        </span>
      ),
    }),
    columnHelper.accessor('tags', {
      header: 'Tags',
      cell: (info) => (
        <div className="flex flex-wrap gap-1">
          {info.getValue()?.slice(0, 2).map(tag => (
            <span key={tag} className="px-1.5 py-0.5 rounded bg-[#2563eb]/10 text-[#3b82f6] text-[9px] font-bold uppercase tracking-tight">
              {tag}
            </span>
          ))}
          {(info.getValue()?.length || 0) > 2 && (
            <span className="text-[9px] text-[#4a5a82] font-bold">+{info.getValue().length - 2}</span>
          )}
        </div>
      ),
    }),
    columnHelper.accessor('last_activity_at', {
      header: 'Last Activity',
      cell: (info) => (
        <span className="text-[12px] text-[#4a5a82] font-dm-sans">
          {info.getValue() ? new Date(info.getValue()!).toLocaleDateString() : 'Never'}
        </span>
      ),
    }),
  ], [selectedIds, isAllSelected, onToggleAll, onToggleOne]);

  const table = useReactTable({
    data: contacts,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="w-full overflow-x-auto common-scrollbar">
      <table className="w-full text-left border-collapse">
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id} className="border-b border-white/5">
              {headerGroup.headers.map(header => (
                <th 
                  key={header.id} 
                  className={cn(
                    "px-4 py-3 text-[10px] font-bold text-[#4a5a82] uppercase tracking-[1.5px] font-dm-sans transition-colors select-none",
                    header.column.getCanSort() && "cursor-pointer hover:text-[#eef2ff]"
                  )}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="flex items-center gap-2">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getCanSort() && (
                      <div className="flex flex-col text-[8px] leading-[1] text-[#4a5a82]">
                        <i className={cn(
                          "fa-solid fa-caret-up mb-[1px]",
                          header.column.getIsSorted() === 'asc' && "text-[#3b82f6]"
                        )}></i>
                        <i className={cn(
                          "fa-solid fa-caret-down",
                          header.column.getIsSorted() === 'desc' && "text-[#3b82f6]"
                        )}></i>
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-white/[0.03]">
          {table.getRowModel().rows.map(row => (
            <tr 
              key={row.id} 
              onClick={(e) => {
                // Ensure we only navigate if clicking the row background or cells (not checkboxes)
                router.push(`/contacts/${row.original.id}`);
              }}
              className={cn(
                "group transition-all hover:bg-white/[0.02] cursor-pointer border-b border-white/[0.03]",
                selectedIds.has(row.original.id) && "bg-[#2563eb]/5"
              )}
            >
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-4 py-3 align-middle">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
