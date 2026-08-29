"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronRight, ChevronUp, RotateCcw } from "lucide-react";

// Consistent Premium Settings Panels pass (Systeme-parity Master Prompt): these 3 primitives
// (PropertyGroup, SliderWithInput, PropertySelect) already backed the Text panel's real
// design (used by TypographyControl.tsx, already wired to Text/Container). Every consumer
// automatically inherits the upgrades below — this is the highest-leverage part of this pass,
// since it requires zero per-panel changes for anything already using them (Container/Text/
// Heading/Paragraph's typography controls), and every NEWLY-wired panel below reuses the
// exact same code, not a one-off restyle per component.

// Collapsible section wrapper for the properties panel — the same accordion
// markup that TypographyControl/BoxModelControl/etc previously each hand-rolled
// on their own, pulled out so future controls don't have to re-duplicate it.
export const PropertyGroup = ({
  title,
  children,
  defaultOpen = true,
  onReset,
  resetTitle = "Reset to default",
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  /** Optional small reset/refresh icon next to the title (Part: Consistent Premium Settings
   *  Panels, Step 1 PanelSectionTitle) — declarative now instead of every panel hand-rolling
   *  its own reset button div (TypographyControl's first draft did exactly that; folded in
   *  here so any panel can opt in with one prop). Omit to render a plain title with no icon. */
  onReset?: () => void;
  resetTitle?: string;
}) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between w-full">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 py-1.5 hover:bg-dash-surface transition-colors motion-reduce:transition-none group text-left flex-1 min-w-0"
        >
          <span className="text-xs font-bold !text-dash-textMuted group-hover:!text-dash-text transition-colors motion-reduce:transition-none">
            {title}
          </span>
          {isOpen ? (
            <ChevronDown className="w-4 h-4 !text-dash-textMuted group-hover:!text-dash-text transition-colors motion-reduce:transition-none" />
          ) : (
            <ChevronRight className="w-4 h-4 !text-dash-textMuted group-hover:!text-dash-text transition-colors motion-reduce:transition-none" />
          )}
        </button>
        {onReset && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onReset(); }}
            title={resetTitle}
            className="h-6 w-6 shrink-0 flex items-center justify-center rounded-md !text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface transition-colors motion-reduce:transition-none"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {isOpen && <div className="space-y-4 pt-1">{children}</div>}
    </div>
  );
};

const NUMERIC_PREFIX = /^-?\d+(\.\d+)?/;

// Splits a CSS-value-ish string like "16px", "1.5", "-0.7em" into its numeric
// portion and trailing unit, so the slider can operate on the number while
// preserving whatever unit was already stored in the node's props.
function splitValueUnit(raw: any, fallbackUnit: string): { num: number; unit: string } {
  const str = raw === undefined || raw === null || raw === '' ? '' : String(raw);
  const match = str.match(NUMERIC_PREFIX);
  if (!match) return { num: 0, unit: fallbackUnit };
  return { num: parseFloat(match[0]), unit: str.slice(match[0].length) || fallbackUnit };
}

// Label + range slider + numeric input with real chevron up/down steppers (Part: Consistent
// Premium Settings Panels, Step 1 SliderWithStepper) — the "Font size" / "Line height" /
// "Letter spacing" pattern from the reference, and reusable for ANY numeric setting anywhere
// in the app (a completion-threshold percentage, padding, etc.), not just typography. The
// stepper buttons replace relying on the browser's own native <input type=number> spinner
// (inconsistent across browsers, didn't match the reference's custom chevrons).
export const SliderWithInput = ({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit = 'px',
  numeric = false,
}: {
  label: string;
  value: any;
  /** Called with a unit-suffixed string ("48px") by default, or a plain number when numeric is set. */
  onChange: (value: string | number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  /** Set when the prop this control drives is stored as a plain number (e.g. Heading/Text's fontSize), not a unit-suffixed string. */
  numeric?: boolean;
}) => {
  const { num, unit: currentUnit } = numeric
    ? { num: Number(value) || 0, unit }
    : splitValueUnit(value, unit);

  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const emit = (nextNum: number) => onChange(numeric ? clamp(nextNum) : `${clamp(nextNum)}${currentUnit}`);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] font-bold !text-dash-textMuted block">{label}</Label>
        <span className="text-[10px] font-bold text-dash-accent bg-dash-accent/10 px-2 py-0.5 rounded-full">
          {num}{currentUnit}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={num}
          onChange={(e) => emit(Number(e.target.value))}
          className="flex-1 accent-dash-accent"
        />
        <div className="flex items-center h-8 w-[70px] bg-white border border-dash-border rounded-lg overflow-hidden focus-within:border-dash-accent transition-colors motion-reduce:transition-none shrink-0">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={num}
            onChange={(e) => emit(Number(e.target.value))}
            className="w-full h-full text-[11px] text-center !text-dash-text px-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <div className="flex flex-col border-l border-dash-border shrink-0 h-full">
            <button
              type="button"
              tabIndex={-1}
              onClick={() => emit(num + step)}
              className="flex-1 w-4 flex items-center justify-center !text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface transition-colors motion-reduce:transition-none"
            >
              <ChevronUp className="w-2.5 h-2.5" />
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => emit(num - step)}
              className="flex-1 w-4 flex items-center justify-center !text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface transition-colors motion-reduce:transition-none border-t border-dash-border"
            >
              <ChevronDown className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Alias matching the master prompt's own naming ("SliderWithStepper") — same real component,
// not a duplicate, so every existing SliderWithInput caller and every new caller share one
// implementation.
export const SliderWithStepper = SliderWithInput;

// Label + native select dropdown with a real custom chevron (Part: Consistent Premium
// Settings Panels, Step 1 StyledDropdown) — "appearance-none" + an overlaid ChevronDown icon
// so this reads consistently with FontFamilyPicker's custom dropdown instead of falling back
// to each browser's own inconsistent native arrow.
export const PropertySelect = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) => (
  <div className="space-y-2">
    <Label className="text-[10px] font-bold !text-dash-textMuted block">{label}</Label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 appearance-none text-xs bg-white border border-dash-border rounded-lg !text-dash-text pl-3 pr-8 focus:border-dash-accent outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-white text-dash-text">
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="w-3.5 h-3.5 !text-dash-textMuted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  </div>
);

// Alias matching the master prompt's own naming ("StyledDropdown").
export const StyledDropdown = PropertySelect;
