import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Consistent input/label/error-state styling for every create/edit form.
 * DashFormField is the wrapper (label + control + error); DashInput /
 * DashTextarea are the styled controls. For <select>, wrap
 * @/components/ui/select's trigger with the same className shape used below
 * rather than duplicating Radix Select here.
 */
export interface DashFormFieldProps {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export function DashFormField({ label, htmlFor, required, error, hint, children, className }: DashFormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-[13px] font-semibold !text-dash-text">
          {label} {required && <span className="text-red">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-[12px] text-red">{error}</p>
      ) : hint ? (
        <p className="text-[12px] !text-dash-textMuted">{hint}</p>
      ) : null}
    </div>
  );
}

const controlBase =
  "w-full h-11 rounded-xl border bg-white px-3.5 text-sm !text-dash-text placeholder:text-dash-textMuted transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent disabled:cursor-not-allowed disabled:opacity-50";

export const DashInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(controlBase, invalid ? "border-red" : "border-dash-border", className)}
      {...props}
    />
  )
);
DashInput.displayName = "DashInput";

export const DashTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(({ className, invalid, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(controlBase, "h-auto min-h-[96px] py-2.5", invalid ? "border-red" : "border-dash-border", className)}
    {...props}
  />
));
DashTextarea.displayName = "DashTextarea";
