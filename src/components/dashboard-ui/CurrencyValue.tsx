import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Single source of truth for rendering currency figures. Before this
 * existed, every page built its own "R " + value.toLocaleString()/toFixed()
 * string ad hoc (50+ call sites, three different formatting conventions
 * found across the app) — and none of them actually fixed the recurring
 * "R 0.00 reads as R O.OO" report, despite several attempts across
 * Pipelines, Affiliates, Dashboard, and Invoices.
 *
 * Two mechanisms have now been tried and confirmed NOT to work here, for two
 * different reasons — both left documented so a future pass doesn't retry
 * either:
 *
 * 1. `font-feature-settings: '"zero" 1'` / `font-variant-numeric:
 *    slashed-zero` — confirmed inert by downloading and inspecting the
 *    actual live DM Sans font file this app loads (Google Fonts v17): its
 *    GSUB table has 9 features (calt, ccmp, dnom, frac, liga, locl, numr)
 *    and no `zero` feature at all. The browser silently ignores a feature
 *    request the font doesn't implement — this fix never once did anything,
 *    on any of its five prior applications.
 * 2. A Unicode combining long solidus overlay (U+0338) appended after each
 *    "0" — confirmed live in a real browser to render as a separate,
 *    badly-kerned stray "/" next to the zero rather than a slash drawn
 *    through it ("R 108 862,0̸5"), because DM Sans has no defined anchor
 *    point for positioning a combining mark over its zero glyph, so the
 *    renderer falls back to default (wrong) placement. This looked correct
 *    in isolated character-code inspection but was visibly broken on screen
 *    — an actual regression, not a fix.
 *
 * Fix that actually works: render the numeral portion in a monospace font
 * stack instead of DM Sans. Monospace fonts are designed with an
 * unambiguous, properly-proportioned zero glyph as a basic requirement of
 * the format (many use a dot or slash baked directly into the glyph outline
 * itself, not a composited hack) — this is a font-level guarantee, not a
 * feature request that can silently no-op, and it costs no extra network
 * fetch since every stack below is a locally-installed OS font. This is
 * scoped to just the numeral run inside currency/count displays, not a
 * body-text typeface swap — DM Sans remains the type system's body font
 * everywhere else, per the existing type-system pass.
 *
 * New/updated money displays should use this instead of a one-off
 * `R {value.toLocaleString(...)}` string.
 */
export interface CurrencyValueProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number | string | null | undefined;
  currency?: "ZAR" | "USD";
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

const CURRENCY_SYMBOLS: Record<string, string> = { ZAR: "R", USD: "$" };

// Locally-installed OS monospace stack — zero network cost, and every one
// of these renders zero and capital-O as unambiguously distinct glyphs by
// design. Also used directly by NumeralText below for non-currency counts
// (Active Deals / Weighted Won, etc.) that had the same ineffective fix.
export const NUMERAL_SAFE_STYLE: React.CSSProperties = {
  fontFamily:
    'ui-monospace, "SF Mono", "Cascadia Mono", "Segoe UI Mono", "Roboto Mono", Consolas, "Liberation Mono", monospace',
  fontVariantNumeric: "tabular-nums",
};

/** Wraps a plain numeral (not a currency figure) in the same font-level
 *  zero/O fix as CurrencyValue, for count displays like "Active Deals". */
export const NumeralText = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, style, children, ...props }, ref) => (
    <span ref={ref} className={cn(className)} style={{ ...NUMERAL_SAFE_STYLE, ...style }} {...props}>
      {children}
    </span>
  )
);
NumeralText.displayName = "NumeralText";

export const CurrencyValue = React.forwardRef<HTMLSpanElement, CurrencyValueProps>(
  (
    {
      value,
      currency = "ZAR",
      minimumFractionDigits = 2,
      maximumFractionDigits = 2,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const numeric = Number(value) || 0;
    const formatted = numeric.toLocaleString("en-ZA", { minimumFractionDigits, maximumFractionDigits });
    const symbol = CURRENCY_SYMBOLS[currency] ?? currency;

    return (
      <span ref={ref} className={cn(className)} style={style} {...props}>
        {symbol}{" "}
        <span style={NUMERAL_SAFE_STYLE}>{formatted}</span>
      </span>
    );
  }
);
CurrencyValue.displayName = "CurrencyValue";
