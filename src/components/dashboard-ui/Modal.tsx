"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Dashboard-styled dialog — extends the existing Radix wrapper
 * (@/components/ui/dialog) rather than reimplementing it, restyled onto
 * dash-* tokens (rounded-2xl, dash-border, dash-text) instead of the
 * generic shadcn `bg-background`/`border` defaults.
 */
export const DashModal = DialogPrimitive.Root;
export const DashModalTrigger = DialogPrimitive.Trigger;
export const DashModalClose = DialogPrimitive.Close;

export const DashModalContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-[1001] bg-dash-text/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-[1002] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-2xl border border-dash-border bg-white p-6 shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none max-h-[90vh] overflow-y-auto",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-lg p-1 text-dash-textMuted opacity-70 transition-opacity hover:opacity-100 hover:bg-dash-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DashModalContent.displayName = "DashModalContent";

export function DashModalHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5 text-left", className)} {...props} />;
}

export function DashModalFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2", className)} {...props} />;
}

export const DashModalTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("text-lg font-bold !text-dash-text leading-tight", className)} {...props} />
));
DashModalTitle.displayName = "DashModalTitle";

export const DashModalDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm !text-dash-textMuted", className)} {...props} />
));
DashModalDescription.displayName = "DashModalDescription";
