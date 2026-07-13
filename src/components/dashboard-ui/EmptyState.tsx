import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { DashButton } from "./Button";

/**
 * Formalized version of the local `EmptyState` first proven in
 * HomeDashboardClient.tsx — icon-in-tinted-circle, headline, muted
 * supporting line, optional CTA. Replaces src/components/common/EmptyState.tsx
 * (dark-theme/Font-Awesome leftover from the old admin template) as the one
 * empty state for every list, table, and panel in the dashboard.
 */
export interface DashEmptyStateProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  compact?: boolean;
  className?: string;
}

export function DashEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  compact = false,
  className,
}: DashEmptyStateProps) {
  const cta =
    actionLabel && (actionHref || onAction) ? (
      actionHref ? (
        <DashButton asChild size="sm" className="mt-2">
          <Link href={actionHref}>{actionLabel}</Link>
        </DashButton>
      ) : (
        <DashButton size="sm" onClick={onAction} className="mt-2">
          {actionLabel}
        </DashButton>
      )
    ) : null;

  return (
    <div className={cn("flex flex-col items-center text-center gap-1", compact ? "py-6" : "py-10", className)}>
      <div
        className={cn(
          "rounded-2xl bg-dash-surface flex items-center justify-center mb-3",
          compact ? "w-11 h-11" : "w-14 h-14"
        )}
      >
        <Icon className="text-dash-textMuted" size={compact ? 18 : 22} strokeWidth={2} />
      </div>
      <h6 className="!text-dash-text font-bold text-[13px]">{title}</h6>
      {description && <p className="!text-dash-textMuted text-[12px] max-w-[280px]">{description}</p>}
      {cta}
    </div>
  );
}
