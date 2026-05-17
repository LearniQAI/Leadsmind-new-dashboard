'use client';

import React from 'react';
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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-white/5 bg-[#080f28]/30 text-[12px] font-dm-sans text-[#94a3c8] select-none">
      {/* Left Side: Stats */}
      <div className="flex items-center gap-1 font-medium text-[#4a5a82]">
        Showing <span className="text-[#eef2ff] font-semibold">{startRow}</span> to{' '}
        <span className="text-[#eef2ff] font-semibold">{endRow}</span> of{' '}
        <span className="text-[#eef2ff] font-semibold">{totalRows}</span> {label}
      </div>

      {/* Center: Numeric Page Buttons */}
      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(0)}
            disabled={!canPreviousPage}
            className="h-8 w-8 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-[#94a3c8] hover:text-[#eef2ff] flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <i className="fa-solid fa-angles-left text-[10px]"></i>
          </button>

          <button
            onClick={() => onPageChange(pageIndex - 1)}
            disabled={!canPreviousPage}
            className="h-8 w-8 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-[#94a3c8] hover:text-[#eef2ff] flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <i className="fa-solid fa-chevron-left text-[10px]"></i>
          </button>

          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ell-${idx}`} className="h-8 w-8 flex items-center justify-center text-[#4a5a82] font-semibold">
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
                  'h-8 w-8 rounded-lg text-[12px] font-semibold transition-all cursor-pointer flex items-center justify-center',
                  isCurrent
                    ? 'bg-[#2563eb] text-white shadow-lg shadow-[#2563eb]/20 border border-[#2563eb]'
                    : 'bg-white/5 border border-white/5 hover:bg-white/10 text-[#94a3c8] hover:text-[#eef2ff]'
                )}
              >
                {p}
              </button>
            );
          })}

          <button
            onClick={() => onPageChange(pageIndex + 1)}
            disabled={!canNextPage}
            className="h-8 w-8 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-[#94a3c8] hover:text-[#eef2ff] flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <i className="fa-solid fa-chevron-right text-[10px]"></i>
          </button>

          <button
            onClick={() => onPageChange(pageCount - 1)}
            disabled={!canNextPage}
            className="h-8 w-8 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-[#94a3c8] hover:text-[#eef2ff] flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <i className="fa-solid fa-angles-right text-[10px]"></i>
          </button>
        </div>
      )}

      {/* Right Side: Page Size Selector */}
      <div className="flex items-center gap-2">
        <span className="text-[#4a5a82]">Show</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="bg-[#0c1535] border border-white/5 hover:border-white/10 rounded-lg px-2.5 py-1 text-[#eef2ff] outline-none font-dm-sans cursor-pointer transition-all text-[11.5px]"
        >
          {[10, 25, 50, 100].map((size) => (
            <option key={size} value={size} className="bg-[#080f28]">
              {size}
            </option>
          ))}
        </select>
        <span className="text-[#4a5a82]">{label}</span>
      </div>
    </div>
  );
}
