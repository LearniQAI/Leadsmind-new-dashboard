"use client";

// PART 2 — shared composite sections built from the Part 1 primitives, so Text / Heading /
// Paragraph (and later other elements) present an identical "Color" and "Size and position"
// section. Presentational only: values in, granular onChange out — the panel owns the
// prop names and the responsive get/set.

import React from 'react';
import { Label } from '@/components/ui/label';
import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';
import { ColorPicker } from '../ColorPicker';
import { SectionHeader, SpacingControl, type BoxSides } from './panelControls';
import { useLessonBuilder } from '../LessonBuilderContext';

/* Real font an element inherits when it sets no explicit family:
 * a lesson canvas inherits its course theme's body face; everything else
 * inherits the app default (tailwind fontFamily.body = 'DM Sans'). */
const THEME_BODY_FONT: Record<string, string> = {
  'font-emberBody': 'Public Sans',
  'font-signalBody': 'IBM Plex Sans',
  'font-groveBody': 'Source Sans 3',
};

export function usePageFontName(): string {
  const { theme } = useLessonBuilder();
  return (theme && THEME_BODY_FONT[theme.bodyFontClass]) || 'DM Sans';
}

/* ------------------------------------------------------------------ *
 * Color section — text colour + text background colour
 * ------------------------------------------------------------------ */

export const ColorSection = ({
  color,
  backgroundColor,
  onColor,
  onBackgroundColor,
  onReset,
}: {
  color: string;
  backgroundColor: string;
  onColor: (v: string) => void;
  onBackgroundColor: (v: string) => void;
  onReset: () => void;
}) => (
  <div className="space-y-3">
    <SectionHeader title="Color" onReset={onReset} />
    <ColorPicker swatch label="Text color" value={color === 'transparent' ? '' : color} onChange={onColor} />
    <ColorPicker
      swatch
      label="Text background color"
      value={backgroundColor === 'transparent' ? '' : backgroundColor}
      onChange={onBackgroundColor}
    />
  </div>
);

/* ------------------------------------------------------------------ *
 * Size and position section — padding, margin, alignment
 * ------------------------------------------------------------------ */

const ALIGNMENTS = [
  { value: 'left', icon: AlignLeft },
  { value: 'center', icon: AlignCenter },
  { value: 'right', icon: AlignRight },
  { value: 'justify', icon: AlignJustify },
] as const;

export const SizePositionSection = ({
  padding,
  margin,
  align,
  onPadding,
  onMargin,
  onAlign,
  onReset,
}: {
  padding: Partial<BoxSides>;
  margin: Partial<BoxSides>;
  align: string;
  onPadding: (v: BoxSides) => void;
  onMargin: (v: BoxSides) => void;
  onAlign: (v: string) => void;
  onReset: () => void;
}) => (
  <div className="space-y-3">
    <SectionHeader title="Size and position" onReset={onReset} />
    <SpacingControl label="Padding" value={padding} onChange={onPadding} />
    <SpacingControl label="Margin" value={margin} onChange={onMargin} />
    <div className="space-y-2">
      <Label className="text-[10px] font-bold !text-dash-textMuted block">Alignment</Label>
      <div className="flex bg-dash-surface p-1 rounded-lg border border-dash-border max-w-fit gap-1">
        {ALIGNMENTS.map(({ value, icon: Icon }) => (
          <button
            key={value}
            type="button"
            data-testid={`align-${value}`}
            onClick={() => onAlign(value)}
            title={`Align ${value}`}
            className={`p-1.5 rounded transition-all motion-reduce:transition-none ${
              align === value
                ? 'bg-dash-accent text-white shadow'
                : '!text-dash-textMuted hover:!text-dash-text hover:bg-white'
            }`}
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </div>
    </div>
  </div>
);

/* Shared helper: map the flat paddingTop/Right/Bottom/Left (BoxModelControl's prop
 * names, reused so existing elements + the published renderer keep working) to/from the
 * BoxSides shape the SpacingControl speaks. */
export const SIDE_KEYS = ['Top', 'Right', 'Bottom', 'Left'] as const;

export const readSides = (get: (name: string) => any, prefix: 'padding' | 'margin'): BoxSides => ({
  top: get(`${prefix}Top`) ?? '',
  right: get(`${prefix}Right`) ?? '',
  bottom: get(`${prefix}Bottom`) ?? '',
  left: get(`${prefix}Left`) ?? '',
});
