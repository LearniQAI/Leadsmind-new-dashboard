"use client";

import React from 'react';
import { useNode } from '@craftjs/core';

import { useResponsiveSetProp } from '@/lib/builder/hooks';
import { useBuilder } from '../BuilderContext';
import { SliderWithInput } from '../inspector/primitives';
import { SectionHeader, FontInheritSelect, type BoxSides } from '../inspector/panelControls';
import { ColorSection, SizePositionSection, usePageFontName, readSides } from '../inspector/panelSections';
import { FontWeightButtons, LineHeightButtons } from '../inspector/typographyControls';
import { loadGoogleFontFamily } from '@/lib/builder/loadGoogleFont';

export const ParagraphSettings = () => {
  const { actions: { setProp }, props } = useNode((node) => ({ props: node.data.props }));
  const { viewMode } = useBuilder();
  const { setResponsiveValue } = useResponsiveSetProp();
  const pageFontName = usePageFontName();

  const { fontSize, fontWeight, textAlign, color, lineHeight, letterSpacing } = props;
  const backgroundColor = props.backgroundColor;

  const getDisplayValue = (propName: string, baseValue?: any) => {
    if (viewMode === 'mobile') return props[`${propName}_mobile`] ?? props[propName] ?? baseValue;
    if (viewMode === 'tablet') return props[`${propName}_tablet`] ?? props[propName] ?? baseValue;
    return props[propName] ?? baseValue;
  };

  const forEachViewport = (p: any, keys: string[]) =>
    keys.forEach((k) => { delete p[k]; delete p[`${k}_mobile`]; delete p[`${k}_tablet`]; });

  // Reset = back to Paragraph.craft.props defaults; no-default props are deleted.
  const resetTypography = () => setProp((p: any) => {
    forEachViewport(p, ['fontFamily', 'letterSpacing']);
    p.fontSize = 16;
    p.fontWeight = 'normal';
    p.lineHeight = 'relaxed';
    ['fontSize', 'fontWeight', 'lineHeight'].forEach((k) => { delete p[`${k}_mobile`]; delete p[`${k}_tablet`]; });
  });
  const resetColor = () => setProp((p: any) => {
    forEachViewport(p, ['backgroundColor']);
    p.color = '#4b5563';
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
      {/* Typography */}
      <div className="space-y-3">
        <SectionHeader title="Typography" onReset={resetTypography} />

        <SliderWithInput
          label="Font size"
          value={getDisplayValue('fontSize', fontSize) || 16}
          onChange={(val) => setResponsiveValue('fontSize', val)}
          min={10}
          max={72}
          numeric
        />

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
        color={getDisplayValue('color', color) || '#4b5563'}
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
