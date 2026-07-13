import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Canonical card shell — see src/lib/design/dashboardDesignTokens.ts `card`.
 * Flat by default, shadow only strengthens on hover/interactive, 16px radius.
 * This is the ONE card treatment for stat cards, list cards, table wrappers,
 * and panels. Do not introduce a second radius/shadow combination.
 */
export interface DashCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Set false for static panels that shouldn't lift on hover (e.g. inside a modal). */
  interactive?: boolean;
  padding?: "none" | "default";
}

export const DashCard = React.forwardRef<HTMLDivElement, DashCardProps>(
  ({ className, interactive = true, padding = "none", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-white border border-dash-border rounded-2xl shadow-sm",
        interactive && "hover:shadow-md transition-shadow duration-200 motion-reduce:transition-none",
        padding === "default" && "p-6",
        className
      )}
      {...props}
    />
  )
);
DashCard.displayName = "DashCard";

export const DashCardBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6", className)} {...props} />
);
DashCardBody.displayName = "DashCardBody";

export const DashCardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("px-6 py-4 border-t border-dash-border", className)} {...props} />
  )
);
DashCardFooter.displayName = "DashCardFooter";
