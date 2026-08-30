"use client";

import React from 'react';
import { Label } from '@/components/ui/label';
import { SEGMENT_WRAP, segmentBtn, MICRO_LABEL } from './panelTheme';

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

export const LineHeightButtons = ({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (value: LineHeightOption) => void;
}) => (
  <div className="space-y-2">
    <Label className={`${MICRO_LABEL} block`}>Line height</Label>
    <div className={SEGMENT_WRAP}>
      {LINE_HEIGHT_OPTIONS.map((lh) => (
        <button key={lh} type="button" onClick={() => onChange(lh)} className={segmentBtn(value === lh)}>
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
    <Label className={`${MICRO_LABEL} block`}>Font weight</Label>
    <div className={SEGMENT_WRAP}>
      {FONT_WEIGHT_OPTIONS.map((w) => (
        <button key={w} type="button" onClick={() => onChange(w)} className={segmentBtn(value === w)}>
          {w}
        </button>
      ))}
    </div>
  </div>
);
