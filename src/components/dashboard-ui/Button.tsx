import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Canonical dashboard button — replaces the per-module ad hoc button
 * stylings. Variants/sizes derive from src/lib/design/dashboardDesignTokens.ts
 * `button`. This is intentionally a separate component from
 * @/components/ui/button (the generic shadcn base used across 140+ files
 * app-wide) rather than a rewrite of it — migrating that shared primitive is
 * a larger, separate exercise. New/updated dashboard module code should
 * import DashButton.
 */
const dashButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-bold transition-all duration-200 motion-reduce:transition-none disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        primary:
          "bg-dash-accent text-white shadow-[0_4px_16px_rgba(19,89,255,0.3)] hover:shadow-[0_8px_24px_rgba(19,89,255,0.4)] hover:-translate-y-0.5 motion-reduce:hover:translate-y-0",
        secondary: "bg-dash-surface text-dash-text border border-dash-border hover:bg-dash-border/60",
        ghost: "bg-transparent text-dash-text border border-dash-text/15 hover:bg-dash-text/5",
        destructive: "bg-danger text-white hover:bg-danger/90",
      },
      size: {
        sm: "h-9 px-4 text-[13px] rounded-lg",
        default: "h-11 px-5 text-sm rounded-xl",
        lg: "h-14 px-8 text-base rounded-[14px]",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  }
);

export interface DashButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof dashButtonVariants> {
  asChild?: boolean;
}

export const DashButton = React.forwardRef<HTMLButtonElement, DashButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp ref={ref} className={cn(dashButtonVariants({ variant, size, className }))} {...props} />;
  }
);
DashButton.displayName = "DashButton";

export { dashButtonVariants };
