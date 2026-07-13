import * as React from "react";
import { cn } from "@/lib/utils";
import { DashCard } from "./Card";
import { DashEmptyState, type DashEmptyStateProps } from "./EmptyState";

/**
 * One table shell for every list view (Contacts, Invoices, Employees,
 * Products, etc.) — header row style, row hover, pagination footer, empty
 * state. Wraps the plain <table> elements already in @/components/ui/table
 * would duplicate that primitive's job; this instead composes bare table
 * tags directly since the dashboard's styling needs (sticky header tint,
 * dash-token row hover, built-in empty/pagination slots) diverge enough from
 * the generic shadcn table to warrant its own shell rather than overriding
 * every class at each call site.
 */
export const DashTableContainer = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <DashCard ref={ref} interactive={false} className={cn("overflow-x-auto", className)} {...props}>
      {children}
    </DashCard>
  )
);
DashTableContainer.displayName = "DashTableContainer";

export function DashTable({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn("w-full text-sm border-collapse", className)} {...props} />;
}

export function DashTableHead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-dash-surface", className)} {...props} />;
}

export function DashTableHeadCell({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-dash-textMuted border-b border-dash-border",
        className
      )}
      {...props}
    />
  );
}

export function DashTableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-dash-border", className)} {...props} />;
}

export function DashTableRow({
  className,
  clickable = false,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement> & { clickable?: boolean }) {
  return (
    <tr
      className={cn(
        "transition-colors duration-150 motion-reduce:transition-none hover:bg-dash-surface/60",
        clickable && "cursor-pointer",
        className
      )}
      {...props}
    />
  );
}

export function DashTableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3 text-dash-text align-middle", className)} {...props} />;
}

/** Drop-in empty state that spans every column of the table it's used in. */
export function DashTableEmptyState({ colSpan, ...emptyStateProps }: DashEmptyStateProps & { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan}>
        <DashEmptyState {...emptyStateProps} />
      </td>
    </tr>
  );
}

export interface DashTablePaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  totalLabel?: string;
  className?: string;
}

export function DashTablePagination({ page, pageCount, onPageChange, totalLabel, className }: DashTablePaginationProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-3 border-t border-dash-border text-[12px] text-dash-textMuted",
        className
      )}
    >
      <span>{totalLabel ?? `Page ${page} of ${pageCount}`}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="h-8 px-3 rounded-lg border border-dash-border font-semibold text-dash-text hover:bg-dash-surface disabled:opacity-40 disabled:pointer-events-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent"
        >
          Prev
        </button>
        <button
          type="button"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          className="h-8 px-3 rounded-lg border border-dash-border font-semibold text-dash-text hover:bg-dash-surface disabled:opacity-40 disabled:pointer-events-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent"
        >
          Next
        </button>
      </div>
    </div>
  );
}
