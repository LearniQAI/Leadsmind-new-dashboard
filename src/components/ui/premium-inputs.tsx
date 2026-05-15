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
          "flex h-12 w-full rounded-xl border border-white/10 bg-[#080f28]/95 backdrop-blur-[8px] px-4 py-2 text-sm text-white font-dm-sans placeholder:text-[#4a5a82] focus:outline-none focus:border-[#2563eb] transition-all duration-300 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]",
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
          "flex min-h-[120px] w-full rounded-xl border border-white/10 bg-[#080f28]/95 backdrop-blur-[8px] px-4 py-3 text-sm text-white font-dm-sans placeholder:text-[#4a5a82] focus:outline-none focus:border-[#2563eb] transition-all duration-300 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)] resize-none",
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
