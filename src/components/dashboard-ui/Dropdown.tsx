"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * Dashboard-styled dropdown menu — extends the existing Radix wrapper
 * (@/components/ui/dropdown-menu) rather than duplicating it. Root/Trigger
 * need no restyle and should be imported directly from that file; this only
 * restyles Content/Item onto dash-* tokens.
 */
export const DashDropdownContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-[10rem] overflow-hidden rounded-xl border border-dash-border bg-white p-1.5 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none",
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DashDropdownContent.displayName = "DashDropdownContent";

export const DashDropdownItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & { destructive?: boolean }
>(({ className, destructive, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium outline-none transition-colors motion-reduce:transition-none focus:bg-dash-surface data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      destructive ? "!text-red focus:bg-red/10" : "!text-dash-text",
      className
    )}
    {...props}
  />
));
DashDropdownItem.displayName = "DashDropdownItem";

export const DashDropdownSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator ref={ref} className={cn("-mx-1.5 my-1 h-px bg-dash-border", className)} {...props} />
));
DashDropdownSeparator.displayName = "DashDropdownSeparator";

export const DashDropdown = DropdownMenuPrimitive.Root;
export const DashDropdownTrigger = DropdownMenuPrimitive.Trigger;
