import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Formalized version of the local `SectionHeader` first proven in
 * HomeDashboardClient.tsx — icon + title on the left, an optional action
 * link on the right. One shape for every "list-style" card header across
 * the dashboard; do not re-derive this per page.
 */
export interface DashSectionHeaderProps {
  icon: React.ReactNode;
  iconColorClass?: string;
  title: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  /** Slightly tighter padding for secondary/supporting sections. */
  quiet?: boolean;
  className?: string;
}

export function DashSectionHeader({
  icon,
  iconColorClass = "text-dash-accent",
  title,
  actionLabel,
  actionHref,
  onAction,
  quiet = false,
  className,
}: DashSectionHeaderProps) {
  const action =
    actionLabel && (actionHref || onAction) ? (
      <span className="text-[12px] font-bold text-dash-accent hover:opacity-80 transition-opacity flex items-center gap-1">
        {actionLabel} <ArrowUpRight size={12} />
      </span>
    ) : null;

  return (
    <div
      className={cn(
        "flex items-center justify-between border-b border-dash-border",
        quiet ? "px-4 py-3" : "px-5 py-4",
        className
      )}
    >
      <h5 className="text-[13px] font-bold !text-dash-text flex items-center gap-2">
        <span className={iconColorClass}>{icon}</span> {title}
      </h5>
      {action &&
        (actionHref ? (
          <Link href={actionHref}>{action}</Link>
        ) : (
          <button type="button" onClick={onAction}>
            {action}
          </button>
        ))}
    </div>
  );
}
