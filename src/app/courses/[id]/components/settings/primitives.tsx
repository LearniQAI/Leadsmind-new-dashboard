"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2, ChevronDown } from "lucide-react";

/**
 * Refined-SaaS primitive set for the Course Settings area (Linear / Stripe register).
 *
 * The whole settings surface is composed from these so every section reads as one
 * system: hairline cards on a light canvas, generous vertical rhythm, small
 * uppercase micro-labels, a single sky accent reserved for focus + primary intent,
 * and a Stripe-style label-left field layout on wide viewports.
 *
 * Accent: Tailwind `sky-*` (matches the sky-500 buttons/tabs rolled across the
 * courses area) — deliberately NOT `dash-accent`, which is the app-wide royal blue.
 */

export const CARD_SHADOW =
  "shadow-[0_1px_2px_rgba(15,23,42,0.04),0_1px_3px_rgba(15,23,42,0.03)]";

/* ------------------------------------------------------------------ *
 * Panel scaffold
 * ------------------------------------------------------------------ */

export function SettingsPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-dash-border bg-white",
        CARD_SHADOW,
        className
      )}
    >
      {children}
    </section>
  );
}

export function SettingsHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-dash-border px-6 py-6 md:px-8 md:py-7">
      <div className="min-w-0 space-y-1.5">
        {eyebrow && (
          <div className="text-[12px] font-bold uppercase tracking-[0.16em] text-sky-600">
            {eyebrow}
          </div>
        )}
        {/* Premium heading treatment: the app's own real display face (Space Grotesk,
            tailwind.config `font-display` — the same token course titles use elsewhere,
            e.g. CoursesClient.tsx's course-name cells), not a new font. Sized to read as
            a real page title against the field labels below it, not a card sub-heading. */}
        <h2 className="font-display text-[26px] font-bold leading-tight tracking-tight text-dash-text md:text-[28px]">
          {title}
        </h2>
        {description && (
          <p className="text-[13px] leading-relaxed text-dash-textMuted">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SettingsBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-6 py-7 md:px-8 md:py-8", className)}>{children}</div>
  );
}

export function SettingsFooter({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-dash-border bg-dash-surface/60 px-6 py-4 md:px-7">
      <div className="text-[12px] text-dash-textMuted">{hint}</div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Field layout  (label-left on md+, stacked on mobile)
 * ------------------------------------------------------------------ */

export function FieldGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("divide-y divide-dash-border", className)}>{children}</div>
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  required,
  children,
  className,
  align = "center",
}: {
  label: string;
  hint?: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  align?: "center" | "start";
}) {
  return (
    <div
      className={cn(
        // Most fields now carry a label + control only (no hint line) — py-5 was tuned
        // for a 2-line label column; py-[18px] keeps the same divided-row rhythm without
        // reading as gappy now that the column is usually a single line.
        "grid gap-x-12 gap-y-1.5 py-[18px] first:pt-0 last:pb-0 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)]",
        align === "start" ? "md:items-start" : "md:items-center",
        className
      )}
    >
      <div className="space-y-1 md:pt-1.5">
        <label
          htmlFor={htmlFor}
          className="block text-[13px] font-semibold text-dash-text"
        >
          {label}
          {required && <span className="ml-0.5 text-sky-600">*</span>}
        </label>
        {hint && (
          <p className="text-[12px] leading-relaxed text-dash-textMuted">{hint}</p>
        )}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-[11px] font-semibold uppercase tracking-[0.1em] text-dash-textMuted",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Controls
 * ------------------------------------------------------------------ */

const controlBase =
  "w-full rounded-lg border border-dash-border bg-white text-[13px] text-dash-text placeholder:text-dash-textMuted transition-colors outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/12 disabled:cursor-not-allowed disabled:opacity-60";

export const TextInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(({ className, invalid, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      controlBase,
      "h-10 px-3",
      invalid && "border-red focus:border-red focus:ring-red/12",
      className
    )}
    {...props}
  />
));
TextInput.displayName = "TextInput";

export const TextArea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(({ className, invalid, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      controlBase,
      "min-h-[92px] px-3 py-2.5 leading-relaxed",
      invalid && "border-red focus:border-red focus:ring-red/12",
      className
    )}
    {...props}
  />
));
TextArea.displayName = "TextArea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <div className={cn("relative", className)}>
    <select
      ref={ref}
      className={cn(controlBase, "h-10 appearance-none px-3 pr-9")}
      {...props}
    >
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-dash-textMuted" />
  </div>
));
Select.displayName = "Select";

export function InputAffix({
  affix,
  side = "left",
  children,
}: {
  affix: React.ReactNode;
  side?: "left" | "right";
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <span
        className={cn(
          "pointer-events-none absolute top-1/2 -translate-y-1/2 text-[13px] text-dash-textMuted",
          side === "left" ? "left-3" : "right-3"
        )}
      >
        {affix}
      </span>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Toggle
 * ------------------------------------------------------------------ */

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex items-start justify-between gap-4 rounded-xl border border-dash-border bg-white px-4 py-3.5 transition-colors",
        !disabled && "cursor-pointer hover:border-slate-300"
      )}
    >
      <span className="space-y-0.5">
        <span className="block text-[13px] font-medium text-dash-text">{label}</span>
        {description && (
          <span className="block text-[12px] leading-relaxed text-dash-textMuted">
            {description}
          </span>
        )}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-[22px] w-[38px] shrink-0 rounded-full transition-colors outline-none focus-visible:ring-4 focus-visible:ring-sky-500/20",
          checked ? "bg-sky-500" : "bg-slate-200"
        )}
      >
        <span
          className={cn(
            "absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-[2px]"
          )}
        />
      </button>
    </label>
  );
}

/* ------------------------------------------------------------------ *
 * Option card (radio-style selectable tile)
 * ------------------------------------------------------------------ */

export function OptionCard({
  selected,
  onClick,
  title,
  description,
  icon,
  disabled,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "group relative flex h-full flex-col gap-1.5 rounded-xl border p-4 text-left transition-all outline-none focus-visible:ring-4 focus-visible:ring-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50",
        selected
          ? "border-sky-500 bg-sky-50/60 ring-1 ring-inset ring-sky-500/30"
          : "border-dash-border bg-white hover:border-slate-300 hover:bg-dash-surface/50",
        className
      )}
    >
      <span className="flex items-center gap-2">
        {icon && (
          <span
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-md border [&_svg]:size-3.5",
              selected
                ? "border-sky-200 bg-white text-sky-600"
                : "border-dash-border bg-dash-surface text-dash-textMuted"
            )}
          >
            {icon}
          </span>
        )}
        <span
          className={cn(
            "text-[13px] font-semibold",
            selected ? "text-sky-700" : "text-dash-text"
          )}
        >
          {title}
        </span>
        <span
          className={cn(
            "ml-auto h-3.5 w-3.5 rounded-full border-2 transition-colors",
            selected ? "border-sky-500 bg-sky-500" : "border-slate-300 bg-white"
          )}
        />
      </span>
      {description && (
        <span className="text-[12px] leading-relaxed text-dash-textMuted">
          {description}
        </span>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Buttons
 * ------------------------------------------------------------------ */

const btnBase =
  "inline-flex items-center justify-center gap-1.5 rounded-lg text-[13px] font-semibold transition-colors outline-none focus-visible:ring-4 focus-visible:ring-sky-500/25 disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:size-4";

export function PrimaryButton({
  className,
  loading,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      className={cn(btnBase, "h-10 bg-sky-500 px-4 text-white hover:bg-sky-600", className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 className="animate-spin motion-reduce:animate-none" />}
      {children}
    </button>
  );
}

export function GhostButton({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        btnBase,
        "h-10 border border-dash-border bg-white px-4 text-dash-text hover:bg-dash-surface",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Stat card (analytics)
 * ------------------------------------------------------------------ */

const STAT_TONES: Record<string, string> = {
  sky: "border-sky-100 bg-sky-50 text-sky-600",
  emerald: "border-emerald-100 bg-emerald-50 text-emerald-600",
  violet: "border-violet-100 bg-violet-50 text-violet-600",
  amber: "border-amber-100 bg-amber-50 text-amber-600",
};

export function StatCard({
  label,
  value,
  sub,
  icon,
  tone = "sky",
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: keyof typeof STAT_TONES;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dash-border bg-white p-5",
        CARD_SHADOW
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-dash-textMuted">
          {label}
        </div>
        {icon && (
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg border [&_svg]:size-4",
              STAT_TONES[tone]
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="mt-3 text-[26px] font-semibold leading-none tracking-tight text-dash-text">
        {value}
      </div>
      {sub && <div className="mt-2 text-[12px] text-dash-textMuted">{sub}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Misc
 * ------------------------------------------------------------------ */

export function StatusPill({
  tone,
  children,
}: {
  tone: "green" | "red" | "amber" | "slate";
  children: React.ReactNode;
}) {
  const map = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    red: "bg-rose-50 text-rose-700 ring-rose-600/20",
    amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
    slate: "bg-slate-100 text-slate-600 ring-slate-500/20",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ring-1 ring-inset [&_svg]:size-3",
        map[tone]
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-dash-border bg-dash-surface/40 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-dash-border bg-white text-dash-textMuted [&_svg]:size-5">
        {icon}
      </div>
      <h4 className="mt-4 text-[14px] font-semibold text-dash-text">{title}</h4>
      {description && (
        <p className="mt-1 max-w-sm text-[12px] leading-relaxed text-dash-textMuted">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Avatar({ name, email }: { name?: string | null; email?: string | null }) {
  const src = (name || email || "?").trim();
  const initials =
    src
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "?";
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-50 text-[12px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-500/15">
      {initials}
    </span>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dash-border bg-white py-20">
      <Loader2 className="size-6 animate-spin text-sky-500 motion-reduce:animate-none" />
      <span className="text-[12px] font-medium text-dash-textMuted">{label}</span>
    </div>
  );
}
