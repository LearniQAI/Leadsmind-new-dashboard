"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useResponsiveSetProp } from '@/lib/builder/hooks';
import { useBuilder } from '../BuilderContext';
import { ColorPicker } from '../ColorPicker';
import { SliderWithInput, PropertySelect } from './primitives';
import { SectionHeader, FontInheritSelect } from './panelControls';
import { ColorSection, SizePositionSection, usePageFontName, readSides } from './panelSections';
import { getGoogleFont } from '@/lib/builder/googleFontsCatalog';
import { loadGoogleFontFamily } from '@/lib/builder/loadGoogleFont';
import type { BoxSides } from './panelControls';

// Text Element settings — rebuilt on the Part 1 primitives / Part 2 shared sections so Text,
// Heading and Paragraph share one visual language (SectionHeader + working per-section reset,
// the merged "inherit or override" font dropdown, the Color and Size-and-position sections).
// Text keeps its raw-value model (px font-size / line-height, Google-Fonts variant strings for
// weight) — no enum props to collide with, unlike Heading/Paragraph.
export const TypographyControl = ({
  withLayoutSections = false,
}: {
  /** Text panel opts in to the shared Color + Size-and-position sections. Container keeps
   *  its own BoxModelControl / BackgroundBorderControl, so it leaves this off to avoid
   *  duplicate spacing / background controls. */
  withLayoutSections?: boolean;
} = {}) => {
  const { actions: { setProp }, props } = useNode((node) => ({ props: node.data.props }));
  const { viewMode } = useBuilder();
  const { setResponsiveValue } = useResponsiveSetProp();
  const pageFontName = usePageFontName();

  const getDisplayValue = (propName: string, baseValue?: any) => {
    if (viewMode === 'mobile') return props[`${propName}_mobile`] ?? props[propName] ?? baseValue;
    if (viewMode === 'tablet') return props[`${propName}_tablet`] ?? props[propName] ?? baseValue;
    return props[propName] ?? baseValue;
  };

  const fontFamily = getDisplayValue('fontFamily');            // undefined => inheriting
  const fontSize = getDisplayValue('fontSize', '');
  const textAlign = getDisplayValue('textAlign', 'left');
  const lineHeight = getDisplayValue('lineHeight', '');
  const letterSpacing = getDisplayValue('letterSpacing', '');
  const color = getDisplayValue('color', '');
  const backgroundColor = getDisplayValue('backgroundColor', '');

  const fontEntry = fontFamily ? getGoogleFont(fontFamily) : undefined;
  const styleOptions = fontEntry
    ? fontEntry.variants.map((v) => ({ value: v.value, label: v.label }))
    : [
        { value: '400', label: 'Regular' },
        { value: '700', label: 'Bold' },
        { value: '400italic', label: 'Italic' },
      ];
  const currentFontStyle = getDisplayValue('fontWeight', styleOptions[0]?.value || '400');

  // Text stores raw values (px numbers / literal family names) with no enum mapping, so a
  // reset that simply clears the element's explicit props is correct — it falls straight
  // back to the component/theme default. (Heading/Paragraph restore their craft enum
  // defaults instead, since a missing enum prop would drop a required class.)
  const forEachViewport = (p: any, keys: string[]) =>
    keys.forEach((k) => { delete p[k]; delete p[`${k}_mobile`]; delete p[`${k}_tablet`]; });

  const handleTypographyReset = () =>
    setProp((p: any) => forEachViewport(p, ['fontFamily', 'fontSize', 'lineHeight', 'letterSpacing', 'fontWeight']));

  const handleColorReset = () =>
    setProp((p: any) => forEachViewport(p, ['color', 'backgroundColor']));

  const handleBoxReset = () =>
    setProp((p: any) => {
      ['Top', 'Right', 'Bottom', 'Left'].forEach((s) => forEachViewport(p, [`padding${s}`, `margin${s}`]));
      forEachViewport(p, ['textAlign']);
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
        <SectionHeader title="Typography" onReset={handleTypographyReset} />

        <div className="grid grid-cols-2 gap-2">
          <SliderWithInput
            label="Font size"
            value={fontSize}
            onChange={(val) => setResponsiveValue('fontSize', val)}
            min={8}
            max={120}
            unit="px"
          />
          <SliderWithInput
            label="Line height"
            value={lineHeight}
            onChange={(val) => setResponsiveValue('lineHeight', val)}
            min={0}
            max={100}
            unit="px"
          />
        </div>

        <FontInheritSelect
          value={fontFamily}
          pageFontName={pageFontName}
          onChange={(family) => {
            if (family) {
              loadGoogleFontFamily(family);
              setResponsiveValue('fontFamily', family);
              const entry = getGoogleFont(family);
              setResponsiveValue('fontWeight', entry?.variants[0]?.value || '400');
            } else {
              setResponsiveValue('fontFamily', undefined);
              setResponsiveValue('fontWeight', undefined);
            }
          }}
        />

        {fontFamily && (
          <PropertySelect
            label="Font style"
            value={currentFontStyle}
            options={styleOptions}
            onChange={(val) => setResponsiveValue('fontWeight', val)}
          />
        )}

        <SliderWithInput
          label="Letter spacing"
          value={letterSpacing}
          onChange={(val) => setResponsiveValue('letterSpacing', val)}
          min={-5}
          max={20}
          step={0.1}
          unit="px"
        />

        {/* Container keeps text colour + alignment inside Typography (it has no shared
            Color / Size-and-position sections — those would duplicate its own
            BackgroundBorderControl / BoxModelControl). */}
        {!withLayoutSections && (
          <>
            <ColorPicker
              label="Text color"
              value={color === 'transparent' ? '' : color}
              onChange={(v) => setResponsiveValue('color', v)}
            />
            <div className="space-y-2">
              <Label className="text-[10px] font-bold !text-dash-textMuted block">Alignment</Label>
              <div className="flex bg-dash-surface p-1 rounded-lg border border-dash-border max-w-fit gap-1">
                {([
                  ['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight], ['justify', AlignJustify],
                ] as const).map(([val, Icon]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setResponsiveValue('textAlign', val)}
                    title={`Align ${val}`}
                    className={`p-1.5 rounded transition-all motion-reduce:transition-none ${
                      textAlign === val ? 'bg-dash-accent text-white shadow' : '!text-dash-textMuted hover:!text-dash-text hover:bg-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {withLayoutSections && (
        <>
          <ColorSection
            color={color}
            backgroundColor={backgroundColor}
            onColor={(v) => setResponsiveValue('color', v)}
            onBackgroundColor={(v) => setResponsiveValue('backgroundColor', v)}
            onReset={handleColorReset}
          />

          <SizePositionSection
            padding={readSides(getDisplayValue, 'padding')}
            margin={readSides(getDisplayValue, 'margin')}
            align={textAlign}
            onPadding={writeSides('padding')}
            onMargin={writeSides('margin')}
            onAlign={(v) => setResponsiveValue('textAlign', v)}
            onReset={handleBoxReset}
          />
        </>
      )}
    </div>
  );
};
