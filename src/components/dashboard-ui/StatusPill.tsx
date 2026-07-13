import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * One status-indicator implementation for the whole dashboard. Sentence case
 * only — no ALL-CAPS — matching the DeltaPill convention already proven on
 * the home page (bg-<color>/10 text-<color>). Replaces per-module ad hoc
 * status badges with drifting colors/casing.
 */
const statusPillVariants = cva("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", {
  variants: {
    variant: {
      neutral: "bg-dash-surface text-dash-textMuted",
      accent: "bg-dash-accent/10 text-dash-accent",
      success: "bg-green/10 text-green",
      warning: "bg-amber/10 text-amber",
      danger: "bg-red/10 text-red",
      info: "bg-info/10 text-info",
    },
  },
  defaultVariants: { variant: "neutral" },
});

export interface DashStatusPillProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusPillVariants> {
  /** Renders a small leading dot instead of/alongside custom content. */
  dot?: boolean;
}

export function DashStatusPill({ className, variant, dot = false, children, ...props }: DashStatusPillProps) {
  return (
    <span className={cn(statusPillVariants({ variant }), className)} {...props}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />}
      {children}
    </span>
  );
}

export { statusPillVariants };
