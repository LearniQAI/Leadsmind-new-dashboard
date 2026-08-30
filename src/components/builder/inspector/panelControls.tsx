"use client";

// PART 1 — Shared Settings-Panel Primitives (Systeme-parity redesign).
//
// Six reusable controls that every Element/Block settings panel composes from, so the
// panels share one visual language and one implementation. Nothing here is element-specific;
// each control is fully controlled (value in, onChange out) and carries no Craft.js / node
// knowledge — the panels wire them to props.
//
//   1. BooleanSelect        - Off/On dropdown, replaces raw checkboxes
//   2. FontInheritSelect    - one dropdown: "Same font as the page {X}" default + Google Fonts
//   3. SpacingControl       - vertical/horizontal dual input + expand to per-side editor
//   4. CornerRadiusControl  - uniform / per-corner toggle + numeric input(s)
//   5. ColorSwatchField     - label + circular swatch trigger (diagonal line = unset)
//   6. SectionHeader        - bold section title + a real (required) reset button
//
// Existing primitives in ./primitives.tsx (PropertyGroup, SliderWithInput, PropertySelect)
// are reused, not duplicated.

import React, { useEffect, useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import {
  ChevronDown, Search, Check, RotateCcw, Maximize2,
  MoveVertical, MoveHorizontal, Square, SquareDashed,
} from 'lucide-react';
import { PropertySelect } from './primitives';
import { FIELD_CLS, CELL_CLS, MICRO_LABEL, segmentIconBtn } from './panelTheme';
import { GOOGLE_FONTS, searchGoogleFonts } from '@/lib/builder/googleFontsCatalog';
import { loadGoogleFontFamily } from '@/lib/builder/loadGoogleFont';

/* ------------------------------------------------------------------ *
 * 1. BooleanSelect — dropdown Off/On boolean
 * ------------------------------------------------------------------ */

export const BooleanSelect = ({
  label,
  value,
  onChange,
  offLabel = 'Off',
  onLabel = 'On',
}: {
  label: string;
  value: boolean | undefined;
  onChange: (value: boolean) => void;
  offLabel?: string;
  onLabel?: string;
}) => (
  <PropertySelect
    label={label}
    value={value ? 'on' : 'off'}
    options={[
      { value: 'off', label: offLabel },
      { value: 'on', label: onLabel },
    ]}
    onChange={(v) => onChange(v === 'on')}
  />
);

/* ------------------------------------------------------------------ *
 * 2. FontInheritSelect — merged "inherit or override" font dropdown
 *    value === undefined | '' | null  => inheriting the page font
 *    value === '<Family>'             => explicit Google Fonts override
 * ------------------------------------------------------------------ */

export const FontInheritSelect = ({
  value,
  pageFontName,
  onChange,
  label = 'Font type',
}: {
  value: string | undefined | null;
  /** The real resolved page / course-theme font this element would inherit. */
  pageFontName: string;
  /** family string for an explicit override, or null to go back to inheriting */
  onChange: (family: string | null) => void;
  label?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  const inheriting = value == null || value === '';
  const inheritLabel = `Same font as the page ${pageFontName}`;

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const results = searchGoogleFonts(query).slice(0, 30);
  useEffect(() => {
    if (!open) return;
    results.slice(0, 12).forEach((f) => loadGoogleFontFamily(f.family));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query]);

  const pick = (family: string | null) => {
    if (family) loadGoogleFontFamily(family);
    onChange(family);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="space-y-2" ref={rootRef}>
      <Label className={`${MICRO_LABEL} block`}>{label}</Label>
      <div className="relative">
        <button
          type="button"
          data-testid="fontinherit-trigger"
          onClick={() => setOpen((v) => !v)}
          className={`${FIELD_CLS} flex items-center justify-between gap-2 text-left ${open ? 'border-dash-accent ring-2 ring-dash-accent/15' : ''}`}
        >
          <span
            className="truncate"
            style={{ fontFamily: inheriting ? undefined : `'${value}', sans-serif` }}
          >
            {inheriting ? inheritLabel : value}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 !text-dash-textMuted shrink-0 transition-transform duration-150 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute left-0 right-0 mt-1.5 z-[1200] bg-white border border-dash-border rounded-xl shadow-[0_12px_32px_-8px_rgba(0,0,0,0.18)] ring-1 ring-black/5 overflow-hidden">
            <button
              type="button"
              data-testid="fontinherit-option-inherit"
              onClick={() => pick(null)}
              className={`w-full text-left px-3 py-2.5 text-xs border-b border-dash-border flex items-center justify-between hover:bg-dash-surface transition-colors motion-reduce:transition-none ${
                inheriting ? 'bg-dash-accent/10' : ''
              }`}
            >
              <span className="!text-dash-text">{inheritLabel}</span>
              {inheriting && <Check className="w-3.5 h-3.5 text-dash-accent shrink-0" />}
            </button>

            <div className="p-2 border-b border-dash-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 !text-dash-textMuted" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search Google Fonts..."
                  className="w-full h-8 pl-8 pr-2 text-xs bg-dash-surface border border-dash-border rounded-lg outline-none focus:border-dash-accent !text-dash-text"
                />
              </div>
            </div>

            <div className="max-h-52 overflow-y-auto py-1">
              {results.length === 0 ? (
                <div className="px-3 py-4 text-[11px] !text-dash-textMuted text-center">
                  No fonts match &quot;{query}&quot;
                </div>
              ) : (
                results.map((f) => (
                  <button
                    key={f.family}
                    type="button"
                    onClick={() => pick(f.family)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-dash-surface transition-colors motion-reduce:transition-none ${
                      f.family === value ? 'bg-dash-accent/10' : ''
                    }`}
                    style={{ fontFamily: `'${f.family}', sans-serif` }}
                  >
                    {f.family}
                    <span className="ml-2 text-[9px] !text-dash-textMuted font-sans capitalize">
                      {f.category}
                    </span>
                  </button>
                ))
              )}
              {results.length === 30 && (
                <div className="px-3 py-2 text-[10px] !text-dash-textMuted text-center border-t border-dash-border">
                  Showing top 30 of {GOOGLE_FONTS.length} — refine your search
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ *
 * 3. SpacingControl — Padding / Margin
 *    value: { top, right, bottom, left } as strings ('' = unset / 0)
 * ------------------------------------------------------------------ */

export type BoxSides = { top: string; right: string; bottom: string; left: string };

const NumCell = ({
  icon,
  value,
  onChange,
  testid,
  title,
}: {
  icon?: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  testid?: string;
  title?: string;
}) => (
  <div className={CELL_CLS} title={title}>
    {icon && <span className="!text-dash-textMuted shrink-0">{icon}</span>}
    <input
      type="number"
      data-testid={testid}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="0"
      className="w-full h-full text-[11px] !text-dash-text bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    />
  </div>
);

export const SpacingControl = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Partial<BoxSides>;
  onChange: (next: BoxSides) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const v: BoxSides = {
    top: value.top ?? '',
    right: value.right ?? '',
    bottom: value.bottom ?? '',
    left: value.left ?? '',
  };
  const symmetric = v.top === v.bottom && v.left === v.right;

  const setSide = (side: keyof BoxSides, val: string) => onChange({ ...v, [side]: val });
  const setVertical = (val: string) => onChange({ ...v, top: val, bottom: val });
  const setHorizontal = (val: string) => onChange({ ...v, left: val, right: val });

  return (
    <div className="space-y-2">
      <Label className={`${MICRO_LABEL} block`}>{label}</Label>
      {!expanded ? (
        <div className="flex items-center gap-2">
          <NumCell
            icon={<MoveVertical className="w-3.5 h-3.5" />}
            value={symmetric ? v.top : ''}
            onChange={setVertical}
            testid={`${label.toLowerCase()}-vertical`}
            title={`${label} top & bottom`}
          />
          <NumCell
            icon={<MoveHorizontal className="w-3.5 h-3.5" />}
            value={symmetric ? v.left : ''}
            onChange={setHorizontal}
            testid={`${label.toLowerCase()}-horizontal`}
            title={`${label} left & right`}
          />
          <button
            type="button"
            data-testid={`${label.toLowerCase()}-expand`}
            onClick={() => setExpanded(true)}
            title="Edit each side"
            className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg border border-dash-border !text-dash-textMuted hover:!text-dash-text hover:border-dash-accent/50 hover:bg-dash-accent/5 transition-all duration-150 motion-reduce:transition-none active:scale-[0.97] motion-reduce:active:scale-100"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-1.5">
            {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
              <div key={side} className="space-y-1">
                <span className="text-[8px] font-bold !text-dash-textMuted block text-center capitalize">
                  {side}
                </span>
                <NumCell
                  value={v[side]}
                  onChange={(val) => setSide(side, val)}
                  testid={`${label.toLowerCase()}-${side}`}
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            data-testid={`${label.toLowerCase()}-collapse`}
            onClick={() => setExpanded(false)}
            className="text-[10px] font-bold text-dash-accent hover:underline"
          >
            Use one value for each axis
          </button>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ *
 * 4. CornerRadiusControl
 * ------------------------------------------------------------------ */

export type Corners = { tl: string; tr: string; br: string; bl: string };

export const CornerRadiusControl = ({
  label = 'Corner radius',
  mode,
  onModeChange,
  uniform,
  corners,
  onUniformChange,
  onCornerChange,
}: {
  label?: string;
  mode: 'uniform' | 'individual';
  onModeChange: (mode: 'uniform' | 'individual') => void;
  uniform: string;
  corners: Partial<Corners>;
  onUniformChange: (v: string) => void;
  onCornerChange: (corner: keyof Corners, v: string) => void;
}) => {
  const c: Corners = {
    tl: corners.tl ?? '',
    tr: corners.tr ?? '',
    br: corners.br ?? '',
    bl: corners.bl ?? '',
  };
  const modeBtn = (on: boolean) =>
    `h-8 w-8 shrink-0 flex items-center justify-center rounded-lg border transition-all duration-150 motion-reduce:transition-none active:scale-[0.97] motion-reduce:active:scale-100 ${
      on
        ? 'border-dash-accent text-dash-accent bg-dash-accent/10 ring-2 ring-dash-accent/15'
        : 'border-dash-border !text-dash-textMuted hover:!text-dash-text hover:border-dash-border/80'
    }`;
  const numCls =
    'h-8 text-[11px] font-medium tabular-nums !text-dash-text bg-white border border-dash-border rounded-lg px-2 outline-none ' +
    'transition-all duration-150 motion-reduce:transition-none focus:border-dash-accent focus:ring-2 focus:ring-dash-accent/15 ' +
    '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';
  return (
    <div className="space-y-2">
      <Label className={`${MICRO_LABEL} block`}>{label}</Label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          data-testid="radius-mode-uniform"
          onClick={() => onModeChange('uniform')}
          title="Same radius on all corners"
          className={modeBtn(mode === 'uniform')}
        >
          <Square className="w-4 h-4" />
        </button>
        <button
          type="button"
          data-testid="radius-mode-individual"
          onClick={() => onModeChange('individual')}
          title="Set each corner"
          className={modeBtn(mode === 'individual')}
        >
          <SquareDashed className="w-4 h-4" />
        </button>

        {mode === 'uniform' && (
          <input
            type="number"
            data-testid="radius-uniform"
            value={uniform}
            onChange={(e) => onUniformChange(e.target.value)}
            placeholder="0"
            className={`flex-1 ${numCls}`}
          />
        )}
      </div>

      {mode === 'individual' && (
        <div className="grid grid-cols-4 gap-1.5">
          {([
            ['tl', 'TL'],
            ['tr', 'TR'],
            ['br', 'BR'],
            ['bl', 'BL'],
          ] as const).map(([key, lbl]) => (
            <div key={key} className="space-y-1">
              <span className="text-[8px] font-bold tracking-wide !text-dash-textMuted block text-center">{lbl}</span>
              <input
                type="number"
                data-testid={`radius-${key}`}
                value={c[key]}
                onChange={(e) => onCornerChange(key, e.target.value)}
                placeholder="0"
                className={`w-full text-center px-1.5 ${numCls}`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ *
 * 5. ColorSwatchField — label + circular swatch trigger (right aligned)
 *    Wraps the shared ColorPicker; unset state shows a diagonal line.
 * ------------------------------------------------------------------ */

export const SwatchTrigger = ({ value }: { value: string }) => {
  const unset = !value || value === 'transparent';
  return (
    <span
      data-testid="swatch-trigger"
      className="relative h-6 w-6 rounded-full border border-dash-border shadow-sm shrink-0 inline-block overflow-hidden bg-white"
      style={{ backgroundColor: unset ? '#ffffff' : value }}
    >
      {unset && (
        <svg viewBox="0 0 24 24" className="absolute inset-0 h-full w-full text-red-500">
          <line x1="3" y1="21" x2="21" y2="3" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )}
    </span>
  );
};

/* ------------------------------------------------------------------ *
 * 6. SectionHeader — bold title + REQUIRED working reset button
 * ------------------------------------------------------------------ */

export const SectionHeader = ({
  title,
  onReset,
  resetTitle = 'Reset this section to its defaults',
}: {
  title: string;
  onReset: () => void;
  resetTitle?: string;
}) => (
  <div className="flex items-center gap-3">
    <h3 className="text-[11px] font-bold uppercase tracking-[0.09em] !text-dash-text shrink-0">{title}</h3>
    <span className="h-px flex-1 bg-gradient-to-r from-dash-border/80 to-transparent" />
    <button
      type="button"
      data-testid={`section-reset-${title.toLowerCase().replace(/\s+/g, '-')}`}
      onClick={onReset}
      title={resetTitle}
      className="h-6 w-6 shrink-0 flex items-center justify-center rounded-md !text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface transition-colors motion-reduce:transition-none active:scale-95 motion-reduce:active:scale-100"
    >
      <RotateCcw className="w-3.5 h-3.5" />
    </button>
  </div>
);
