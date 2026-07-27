"use client";

import React from 'react';
import { Label } from '@/components/ui/label';
import { ChevronDown, ChevronRight } from 'lucide-react';

// Collapsible section wrapper for the properties panel — the same accordion
// markup that TypographyControl/BoxModelControl/etc previously each hand-rolled
// on their own, pulled out so future controls don't have to re-duplicate it.
export const PropertyGroup = ({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-1.5 hover:bg-dash-surface transition-colors motion-reduce:transition-none group text-left"
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

// Label + range slider + numeric input, the "Font size" / "Line height" /
// "Letter spacing" pattern from the reference design. Value is stored and
// emitted as a plain string (e.g. "48px") so it stays compatible with however
// the owning control already persists the prop — this only changes what's
// rendered, not the prop's shape.
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

  const emit = (nextNum: number) => onChange(numeric ? nextNum : `${nextNum}${currentUnit}`);

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
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={num}
          onChange={(e) => emit(Number(e.target.value))}
          className="w-16 h-8 text-[11px] text-center bg-white border border-dash-border rounded-lg !text-dash-text px-1 outline-none focus:border-dash-accent transition-colors motion-reduce:transition-none"
        />
      </div>
    </div>
  );
};

// Label + native select dropdown — the "Font type" / "Font style" pattern.
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
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-9 text-xs bg-white border border-dash-border rounded-lg !text-dash-text px-2 focus:border-dash-accent outline-none"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-white text-dash-text">
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);
