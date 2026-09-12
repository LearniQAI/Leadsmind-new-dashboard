'use client';

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const PremiumInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-xl border border-dash-border bg-white px-4 py-2 text-sm text-dash-text font-dm-sans placeholder:text-dash-textMuted focus:outline-none focus:border-dash-accent transition-all duration-300",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
PremiumInput.displayName = "PremiumInput";

const PremiumTextarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[120px] w-full rounded-xl border border-dash-border bg-white px-4 py-3 text-sm text-dash-text font-dm-sans placeholder:text-dash-textMuted focus:outline-none focus:border-dash-accent transition-all duration-300 resize-none",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
PremiumTextarea.displayName = "PremiumTextarea";

export { PremiumInput, PremiumTextarea };
