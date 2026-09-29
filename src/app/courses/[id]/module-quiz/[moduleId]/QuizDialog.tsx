"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// A light, self-contained modal for the module-quiz screens.
//
// The shared <DialogContent> paints its surface with `bg-background`, which is transparent in this
// design system — the page (and the dark overlay) showed straight through and the title vanished.
// This one sets every colour explicitly (white surface, dash text tokens) and uses a soft overlay.

type Tone = "sky" | "rose";

const TONES: Record<Tone, string> = {
  sky: "bg-sky-50 text-sky-600 ring-sky-500/15",
  rose: "bg-rose-50 text-rose-600 ring-rose-500/15",
};

interface QuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon: React.ReactNode;
  tone?: Tone;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer: React.ReactNode;
}

export default function QuizDialog({ open, onOpenChange, icon, tone = "sky", title, description, children, footer }: QuizDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[1001] bg-slate-900/40 backdrop-blur-[3px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 motion-reduce:animate-none" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-[1002] w-[calc(100vw-32px)] max-w-[480px] -translate-x-1/2 -translate-y-1/2 overflow-hidden",
            "rounded-2xl border border-dash-border bg-white !text-dash-text",
            "shadow-[0_24px_64px_-16px_rgba(15,23,42,0.30),0_4px_12px_-2px_rgba(15,23,42,0.08)] outline-none",
            "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 motion-reduce:animate-none"
          )}
        >
          <div className="flex items-start gap-4 px-6 pb-2 pt-6">
            <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset [&_svg]:size-5", TONES[tone])}>
              {icon}
            </span>
            <div className="min-w-0 flex-1 space-y-1.5 pr-8">
              <DialogPrimitive.Title className="font-display text-[18px] font-semibold leading-snug tracking-[-0.01em] !text-dash-text">
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mb-0 text-[13px] leading-relaxed !text-dash-textMuted">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
          </div>

          {children ? <div className="px-6 pb-6 pt-3">{children}</div> : <div className="pb-4" />}

          <div className="flex items-center justify-end gap-2 border-t border-dash-border bg-dash-surface/60 px-6 py-4">{footer}</div>

          <DialogPrimitive.Close
            aria-label="Close"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-dash-textMuted transition-colors hover:bg-dash-surface hover:text-dash-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
          >
            <X size={16} />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
