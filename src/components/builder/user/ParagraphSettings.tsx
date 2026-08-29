"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '@/components/ui/label';
import { ColorPicker } from '../ColorPicker';

import { useResponsiveSetProp } from '@/lib/builder/hooks';
import { useBuilder } from '../BuilderContext';
import { PropertyGroup, SliderWithInput } from '../inspector/primitives';
import { FontFamilyPicker } from '../inspector/FontFamilyPicker';
import { loadGoogleFontFamily } from '@/lib/builder/loadGoogleFont';

export const ParagraphSettings = () => {
  const { actions: { setProp }, props } = useNode((node) => ({
    props: node.data.props,
  }));
  const { viewMode } = useBuilder();
  const { setResponsiveValue } = useResponsiveSetProp();

  const { fontSize, textAlign, color, lineHeight, fontFamily, letterSpacing } = props;

  // Helper to get current display value for a prop
  const getDisplayValue = (propName: string, baseValue: any) => {
    if (viewMode === 'mobile') return props[`${propName}_mobile`] ?? baseValue;
    if (viewMode === 'tablet') return props[`${propName}_tablet`] ?? baseValue;
    return baseValue;
  };

  return (
    <PropertyGroup title="Typography">
      <SliderWithInput
        label="Font size"
        value={getDisplayValue('fontSize', fontSize) || 16}
        onChange={(val) => setResponsiveValue('fontSize', val)}
        min={10}
        max={72}
        numeric
      />

      <div className="space-y-2">
        <Label className="text-xs font-bold !text-dash-textMuted block">Line height</Label>
        <div className="flex bg-dash-surface p-1 rounded-md border border-dash-border">
          {['tight', 'normal', 'relaxed', 'loose'].map((lh) => (
            <button
              key={lh}
              onClick={() => setResponsiveValue('lineHeight', lh)}
              className={`flex-1 text-[9px] py-1.5 rounded capitalize transition-colors motion-reduce:transition-none ${getDisplayValue('lineHeight', lineHeight) === lh ? 'bg-primary text-white shadow font-bold' : '!text-dash-textMuted hover:!text-dash-text'}`}
            >
              {lh}
            </button>
          ))}
        </div>
      </div>

      {/* Part 2 (Text Element Typography Controls) — real per-element overrides added
          alongside the existing font-size/line-height-enum/color/align controls above. */}
      <FontFamilyPicker
        value={getDisplayValue('fontFamily', fontFamily) || 'Inter'}
        onChange={(family) => {
          loadGoogleFontFamily(family);
          setResponsiveValue('fontFamily', family);
        }}
      />

      <SliderWithInput
        label="Letter spacing"
        value={getDisplayValue('letterSpacing', letterSpacing) || 0}
        onChange={(val) => setResponsiveValue('letterSpacing', val)}
        min={-5}
        max={20}
        step={0.1}
        numeric
      />

      <div className="pt-2">
        <ColorPicker
          label="Text color"
          value={color || '#4b5563'}
          onChange={(val) => setProp((props: any) => props.color = val)}
        />
      </div>

      <div className="space-y-2 pt-4 border-t border-dash-border">
        <Label className="text-xs font-bold !text-dash-textMuted block">Text align</Label>
        <div className="flex bg-dash-surface p-1 rounded-md border border-dash-border">
          {['left', 'center', 'right', 'justify'].map((align) => (
            <button
              key={align}
              onClick={() => setResponsiveValue('textAlign', align)}
              className={`flex-1 text-[10px] py-1 rounded capitalize transition-colors motion-reduce:transition-none ${getDisplayValue('textAlign', textAlign) === align ? 'bg-primary text-white shadow font-bold' : '!text-dash-textMuted hover:!text-dash-text'}`}
            >
              {align}
            </button>
          ))}
        </div>
      </div>
    </PropertyGroup>
  );
};
