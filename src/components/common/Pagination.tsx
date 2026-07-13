'use client';

import React from 'react';
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  pageIndex: number; // 0-based
  pageSize: number;
  totalRows: number;
  pageCount: number;
  canPreviousPage: boolean;
  canNextPage: boolean;
  onPageChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  label?: string; // E.g., "leads", "invoices", "tasks"
}

const navButtonClass =
  "h-8 w-8 rounded-lg bg-dash-surface border border-dash-border hover:bg-dash-border/60 disabled:opacity-30 disabled:hover:bg-dash-surface text-dash-textMuted hover:text-dash-text flex items-center justify-center transition-colors motion-reduce:transition-none cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent";

export function Pagination({
  pageIndex,
  pageSize,
  totalRows,
  pageCount,
  canPreviousPage,
  canNextPage,
  onPageChange,
  onPageSizeChange,
  label = 'items',
}: PaginationProps) {
  // Calculate boundaries
  const startRow = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const endRow = Math.min((pageIndex + 1) * pageSize, totalRows);

  // Dynamic Numeric Page Range Helper
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (pageCount <= 5) {
      for (let i = 0; i < pageCount; i++) pages.push(i + 1);
    } else {
      if (pageIndex < 3) {
        pages.push(1, 2, 3, 4, '...', pageCount);
      } else if (pageIndex >= pageCount - 3) {
        pages.push(1, '...', pageCount - 3, pageCount - 2, pageCount - 1, pageCount);
      } else {
        pages.push(1, '...', pageIndex, pageIndex + 1, pageIndex + 2, '...', pageCount);
      }
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6 py-4 border-t border-dash-border text-[12px] !text-dash-textMuted select-none">
      {/* Left Side: Stats */}
      <div className="flex items-center gap-1 font-medium">
        Showing <span className="!text-dash-text font-semibold">{startRow}</span> to{' '}
        <span className="!text-dash-text font-semibold">{endRow}</span> of{' '}
        <span className="!text-dash-text font-semibold">{totalRows}</span> {label}
      </div>

      {/* Center: Numeric Page Buttons */}
      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <button onClick={() => onPageChange(0)} disabled={!canPreviousPage} className={navButtonClass}>
            <ChevronsLeft size={14} />
          </button>

          <button onClick={() => onPageChange(pageIndex - 1)} disabled={!canPreviousPage} className={navButtonClass}>
            <ChevronLeft size={14} />
          </button>

          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ell-${idx}`} className="h-8 w-8 flex items-center justify-center text-dash-textMuted font-semibold">
                  ...
                </span>
              );
            }
            const isCurrent = pageIndex === (p as number) - 1;
            return (
              <button
                key={`page-${p}`}
                onClick={() => onPageChange((p as number) - 1)}
                className={cn(
                  'h-8 w-8 rounded-lg text-[12px] font-semibold transition-colors motion-reduce:transition-none cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent',
                  isCurrent
                    ? 'bg-dash-accent text-white border border-dash-accent'
                    : 'bg-dash-surface border border-dash-border hover:bg-dash-border/60 text-dash-textMuted hover:text-dash-text'
                )}
              >
                {p}
              </button>
            );
          })}

          <button onClick={() => onPageChange(pageIndex + 1)} disabled={!canNextPage} className={navButtonClass}>
            <ChevronRight size={14} />
          </button>

          <button onClick={() => onPageChange(pageCount - 1)} disabled={!canNextPage} className={navButtonClass}>
            <ChevronsRight size={14} />
          </button>
        </div>
      )}

      {/* Right Side: Page Size Selector */}
      <div className="flex items-center gap-2">
        <span className="text-dash-textMuted">Show</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="bg-white border border-dash-border hover:border-dash-textMuted/40 rounded-lg px-2.5 py-1 !text-dash-text outline-none cursor-pointer transition-colors motion-reduce:transition-none text-[11.5px] focus-visible:ring-2 focus-visible:ring-dash-accent"
        >
          {[10, 25, 50, 100].map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span className="text-dash-textMuted">{label}</span>
      </div>
    </div>
  );
}
