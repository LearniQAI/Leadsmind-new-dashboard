"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { ColorPicker } from '../ColorPicker';
import { Label } from '@/components/ui/label';

import { useResponsiveSetProp } from '@/lib/builder/hooks';
import { useBuilder } from '../BuilderContext';
import { PropertyGroup, SliderWithInput } from '../inspector/primitives';
import { FontFamilyPicker } from '../inspector/FontFamilyPicker';
import { FontWeightButtons, LineHeightButtons } from '../inspector/typographyControls';
import { loadGoogleFontFamily } from '@/lib/builder/loadGoogleFont';

export const HeadingSettings = () => {
  const { actions: { setProp }, props } = useNode((node) => ({
    props: node.data.props,
  }));
  const { viewMode } = useBuilder();
  const { setResponsiveValue } = useResponsiveSetProp();

  const { level, fontWeight, textAlign, color, fontSize, fontFamily, lineHeight, letterSpacing } = props;

  // Helper to get current display value for a prop
  const getDisplayValue = (propName: string, baseValue: any) => {
    if (viewMode === 'mobile') return props[`${propName}_mobile`] ?? baseValue;
    if (viewMode === 'tablet') return props[`${propName}_tablet`] ?? baseValue;
    return baseValue;
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-bold !text-dash-textMuted block">Heading level</Label>
        <div className="grid grid-cols-3 bg-dash-surface p-1 rounded-md border border-dash-border">
          {['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((l) => (
            <button
              key={l}
              onClick={() => setProp((props: any) => props.level = l)}
              className={`text-[10px] py-1 rounded uppercase font-bold transition-colors motion-reduce:transition-none ${level === l ? 'bg-primary text-white shadow' : '!text-dash-textMuted hover:!text-dash-text'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <PropertyGroup title="Typography">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <SliderWithInput
              label="Font size override"
              value={getDisplayValue('fontSize', fontSize) || 8}
              onChange={(val) => setResponsiveValue('fontSize', val)}
              min={8}
              max={160}
              numeric
            />
          </div>
          {/* The slider always writes an explicit size; this is the only way back to the
              heading level's built-in auto size once you've touched the slider. */}
          <button
            type="button"
            onClick={() => setResponsiveValue('fontSize', undefined)}
            className="h-8 px-2 text-[10px] font-bold !text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface rounded-lg border border-dash-border transition-colors motion-reduce:transition-none shrink-0"
            title="Reset to the heading level's default size"
          >
            Auto
          </button>
        </div>

        <FontWeightButtons
          value={getDisplayValue('fontWeight', fontWeight)}
          onChange={(w) => setResponsiveValue('fontWeight', w)}
        />

        {/* Part 2 (Text Element Typography Controls) — an explicit fontFamily here beats the
            course theme's useThemeFont class via ordinary CSS specificity (inline style
            outranks a class), not extra override logic. */}
        <FontFamilyPicker
          value={fontFamily || 'Inter'}
          onChange={(family) => {
            loadGoogleFontFamily(family);
            setResponsiveValue('fontFamily', family);
          }}
        />

        <LineHeightButtons
          value={getDisplayValue('lineHeight', lineHeight)}
          onChange={(v) => setResponsiveValue('lineHeight', v)}
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

        <ColorPicker
          label="Text color"
          value={color || '#111827'}
          onChange={(val) => setProp((props: any) => props.color = val)}
        />

        <div className="space-y-2">
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
    </div>
  );
};
