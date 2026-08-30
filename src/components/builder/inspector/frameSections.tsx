"use client";

// Part 3 / 4 — the shared "Shadow" and "Border" settings sections, used by BOTH the generic
// Video element and the Image element (one implementation, not two look-alikes).

import React from 'react';
import { ColorPicker } from '../ColorPicker';
import { SliderWithInput, PropertySelect } from './primitives';
import { SectionHeader, CornerRadiusControl, type Corners } from './panelControls';

export const SHADOW_OPTIONS = [
  { value: 'none', label: 'No shadow' },
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
  { value: 'xl', label: 'Extra large' },
];

export const BORDER_STYLE_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
];

export const ShadowSection = ({
  value,
  onChange,
  onReset,
}: {
  value: string | undefined;
  onChange: (v: string) => void;
  onReset: () => void;
}) => (
  <div className="space-y-3">
    <SectionHeader title="Shadow" onReset={onReset} />
    <PropertySelect label="Shadow" value={value || 'none'} options={SHADOW_OPTIONS} onChange={onChange} />
  </div>
);

export const BorderSection = ({
  radiusMode,
  onRadiusModeChange,
  uniformRadius,
  corners,
  onUniformRadius,
  onCorner,
  style,
  width,
  color,
  onStyle,
  onWidth,
  onColor,
  onReset,
}: {
  radiusMode: 'uniform' | 'individual';
  onRadiusModeChange: (m: 'uniform' | 'individual') => void;
  uniformRadius: string;
  corners: Partial<Corners>;
  onUniformRadius: (v: string) => void;
  onCorner: (c: keyof Corners, v: string) => void;
  style: string | undefined;
  width: string | number | undefined;
  color: string | undefined;
  onStyle: (v: string) => void;
  onWidth: (v: number | string) => void;
  onColor: (v: string) => void;
  onReset: () => void;
}) => (
  <div className="space-y-3">
    <SectionHeader title="Border" onReset={onReset} />
    <CornerRadiusControl
      mode={radiusMode}
      onModeChange={onRadiusModeChange}
      uniform={uniformRadius}
      corners={corners}
      onUniformChange={onUniformRadius}
      onCornerChange={onCorner}
    />
    <PropertySelect label="Style" value={style || 'none'} options={BORDER_STYLE_OPTIONS} onChange={onStyle} />
    {style && style !== 'none' && (
      <>
        <SliderWithInput label="Border width" value={width ?? 1} onChange={onWidth} min={0} max={20} numeric />
        <ColorPicker swatch label="Border color" value={color === 'transparent' ? '' : color || ''} onChange={onColor} />
      </>
    )}
  </div>
);
