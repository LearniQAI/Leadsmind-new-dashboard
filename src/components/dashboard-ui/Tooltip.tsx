"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

/**
 * Dashboard-styled tooltip — extends the existing Radix wrapper
 * (@/components/ui/tooltip). Root/Trigger/Provider need no restyle and
 * should be imported directly from that file; this only restyles Content.
 * A dark chip is intentional here (not a "dark theme leftover") — floating
 * tooltips read as dark chips in most light UIs, landing included via its
 * dark surfaces elsewhere; this does not reintroduce the marketing gradient.
 */
export const DashTooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 overflow-hidden rounded-lg bg-dash-text px-2.5 py-1.5 text-xs font-medium text-white shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
DashTooltipContent.displayName = "DashTooltipContent";
