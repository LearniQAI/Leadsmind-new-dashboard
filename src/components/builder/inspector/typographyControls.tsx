"use client";

import React from 'react';
import { Label } from '@/components/ui/label';

// Shared segmented typography controls used by BOTH the Heading and Paragraph
// settings panels. Previously each panel hand-rolled this markup: Paragraph had a
// tight/normal/relaxed/loose line-height group, Heading had a raw-px line-height
// slider that never actually reached the rendered text (the heading's inner tag
// forces its own `leading-*` class, which always wins over an inherited px value).
// One implementation now, one value domain, applied on the text element itself.

export const LINE_HEIGHT_OPTIONS = ['tight', 'normal', 'relaxed', 'loose'] as const;
export type LineHeightOption = (typeof LINE_HEIGHT_OPTIONS)[number];

export const FONT_WEIGHT_OPTIONS = ['normal', 'medium', 'semibold', 'bold', 'black'] as const;
export type FontWeightOption = (typeof FONT_WEIGHT_OPTIONS)[number];

const segmentBtn = (active: boolean) =>
  `flex-1 text-[9px] py-1.5 rounded capitalize transition-colors motion-reduce:transition-none ${
    active ? 'bg-primary text-white shadow font-bold' : '!text-dash-textMuted hover:!text-dash-text'
  }`;

export const LineHeightButtons = ({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (value: LineHeightOption) => void;
}) => (
  <div className="space-y-2">
    <Label className="text-xs font-bold !text-dash-textMuted block">Line height</Label>
    <div className="flex bg-dash-surface p-1 rounded-md border border-dash-border">
      {LINE_HEIGHT_OPTIONS.map((lh) => (
        <button key={lh} onClick={() => onChange(lh)} className={segmentBtn(value === lh)}>
          {lh}
        </button>
      ))}
    </div>
  </div>
);

export const FontWeightButtons = ({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (value: FontWeightOption) => void;
}) => (
  <div className="space-y-2">
    <Label className="text-xs font-bold !text-dash-textMuted block">Font weight</Label>
    <div className="flex bg-dash-surface p-1 rounded-md border border-dash-border">
      {FONT_WEIGHT_OPTIONS.map((w) => (
        <button key={w} onClick={() => onChange(w)} className={segmentBtn(value === w)}>
          {w}
        </button>
      ))}
    </div>
  </div>
);
