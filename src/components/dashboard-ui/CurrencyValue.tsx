import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Single source of truth for rendering currency figures. Before this
 * existed, every page built its own "R " + value.toLocaleString()/toFixed()
 * string ad hoc (50+ call sites, three different formatting conventions
 * found across the app) — and none of them addressed the recurring "R 0.00
 * reads as R O.OO" report: DM Sans's zero glyph is a plain oval that's
 * visually close to a capital O at bold weight/small size. This bakes the
 * fix in once: `font-variant-numeric` plus the lower-level
 * `font-feature-settings` request the font's slashed-zero glyph where
 * supported, kept on DM Sans (not swapped to a different typeface) so
 * currency values stay on the body font per the established type system.
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
      <span
        ref={ref}
        className={cn(className)}
        style={{ fontVariantNumeric: "slashed-zero tabular-nums", fontFeatureSettings: '"zero" 1', ...style }}
        {...props}
      >
        {symbol} {formatted}
      </span>
    );
  }
);
CurrencyValue.displayName = "CurrencyValue";
