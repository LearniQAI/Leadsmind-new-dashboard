"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '@/components/ui/label';

import { useResponsiveSetProp } from '@/lib/builder/hooks';
import { useBuilder } from '../BuilderContext';
import { SliderWithInput } from '../inspector/primitives';
import { SectionHeader, FontInheritSelect, type BoxSides } from '../inspector/panelControls';
import { ColorSection, SizePositionSection, usePageFontName, readSides } from '../inspector/panelSections';
import { FontWeightButtons, LineHeightButtons } from '../inspector/typographyControls';
import { SEGMENT_WRAP, segmentBtn, MICRO_LABEL } from '../inspector/panelTheme';
import { loadGoogleFontFamily } from '@/lib/builder/loadGoogleFont';

export const HeadingSettings = () => {
  const { actions: { setProp }, props } = useNode((node) => ({ props: node.data.props }));
  const { viewMode } = useBuilder();
  const { setResponsiveValue } = useResponsiveSetProp();
  const pageFontName = usePageFontName();

  const { level, fontWeight, textAlign, color, fontSize, fontFamily, lineHeight, letterSpacing } = props;
  const backgroundColor = props.backgroundColor;

  const getDisplayValue = (propName: string, baseValue?: any) => {
    if (viewMode === 'mobile') return props[`${propName}_mobile`] ?? props[propName] ?? baseValue;
    if (viewMode === 'tablet') return props[`${propName}_tablet`] ?? props[propName] ?? baseValue;
    return props[propName] ?? baseValue;
  };

  const forEachViewport = (p: any, keys: string[]) =>
    keys.forEach((k) => { delete p[k]; delete p[`${k}_mobile`]; delete p[`${k}_tablet`]; });

  // Reset = back to Heading.craft.props defaults; no-default props are deleted.
  const resetTypography = () => setProp((p: any) => {
    forEachViewport(p, ['fontSize', 'fontFamily', 'letterSpacing']);
    p.fontWeight = 'bold';
    p.lineHeight = 'tight';
    delete p.fontWeight_mobile; delete p.fontWeight_tablet;
    delete p.lineHeight_mobile; delete p.lineHeight_tablet;
  });
  const resetColor = () => setProp((p: any) => {
    forEachViewport(p, ['backgroundColor']);
    p.color = '#111827';
    delete p.color_mobile; delete p.color_tablet;
  });
  const resetBox = () => setProp((p: any) => {
    ['Top', 'Right', 'Bottom', 'Left'].forEach((s) => forEachViewport(p, [`padding${s}`, `margin${s}`]));
    p.textAlign = 'left';
    delete p.textAlign_mobile; delete p.textAlign_tablet;
  });

  const writeSides = (prefix: 'padding' | 'margin') => (v: BoxSides) => {
    setResponsiveValue(`${prefix}Top`, v.top);
    setResponsiveValue(`${prefix}Right`, v.right);
    setResponsiveValue(`${prefix}Bottom`, v.bottom);
    setResponsiveValue(`${prefix}Left`, v.left);
  };

  return (
    <div className="space-y-6">
      {/* Heading level — element-specific, stays at the top */}
      <div className="space-y-2">
        <Label className={`${MICRO_LABEL} block`}>Heading level</Label>
        <div className={`${SEGMENT_WRAP} grid grid-cols-6`}>
          {['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setProp((p: any) => (p.level = l))}
              className={`${segmentBtn(level === l)} uppercase`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Typography */}
      <div className="space-y-3">
        <SectionHeader title="Typography" onReset={resetTypography} />

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
          <button
            type="button"
            onClick={() => setResponsiveValue('fontSize', undefined)}
            className="h-8 px-2.5 text-[10px] font-bold uppercase tracking-wide !text-dash-textMuted hover:!text-dash-text hover:border-dash-accent/50 hover:bg-dash-accent/5 rounded-lg border border-dash-border transition-all duration-150 motion-reduce:transition-none active:scale-[0.97] motion-reduce:active:scale-100 shrink-0"
            title="Reset to the heading level's default size"
          >
            Auto
          </button>
        </div>

        <FontWeightButtons
          value={getDisplayValue('fontWeight', fontWeight)}
          onChange={(w) => setResponsiveValue('fontWeight', w)}
        />

        <FontInheritSelect
          value={getDisplayValue('fontFamily')}
          pageFontName={pageFontName}
          onChange={(family) => {
            if (family) {
              loadGoogleFontFamily(family);
              setResponsiveValue('fontFamily', family);
            } else {
              setResponsiveValue('fontFamily', undefined);
            }
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
      </div>

      <ColorSection
        color={getDisplayValue('color', color) || '#111827'}
        backgroundColor={getDisplayValue('backgroundColor', backgroundColor) || ''}
        onColor={(v) => setResponsiveValue('color', v)}
        onBackgroundColor={(v) => setResponsiveValue('backgroundColor', v)}
        onReset={resetColor}
      />

      <SizePositionSection
        padding={readSides(getDisplayValue, 'padding')}
        margin={readSides(getDisplayValue, 'margin')}
        align={getDisplayValue('textAlign', textAlign) || 'left'}
        onPadding={writeSides('padding')}
        onMargin={writeSides('margin')}
        onAlign={(v) => setResponsiveValue('textAlign', v)}
        onReset={resetBox}
      />
    </div>
  );
};
