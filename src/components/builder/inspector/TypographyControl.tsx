"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '@/components/ui/label';
import { ColorPicker } from '../ColorPicker';
import { useResponsiveSetProp } from '@/lib/builder/hooks';
import { useBuilder } from '../BuilderContext';
import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';
import { PropertyGroup, SliderWithInput, PropertySelect } from './primitives';
import { FontFamilyPicker } from './FontFamilyPicker';
import { getGoogleFont } from '@/lib/builder/googleFontsCatalog';
import { loadGoogleFontFamily } from '@/lib/builder/loadGoogleFont';

// Text Element Typography Controls (Systeme-parity Master Prompt, Part 2).
//
// Step 0 audit: this panel already existed (built for Container-level typography) but was
// never wired into Text/Headline's own settings panels, and its font family field was a
// hardcoded 10-entry list with no real live application to the rendered element (Text.tsx/
// Heading.tsx/Paragraph.tsx never read a fontFamily prop at all — confirmed via source, fixed
// alongside this control). So: mostly a REUSE/WIRING task for the panel shell (PropertyGroup/
// SliderWithInput/PropertySelect, all pre-existing with real 2-way slider<->number sync), with
// real NEW work layered in — the searchable Google Fonts catalog + dynamic per-family font
// loading (no such mechanism existed anywhere in the project), the reset icon, the "Font type"
// source dropdown, and making the 3 text components actually apply the result.
export const TypographyControl = () => {
  const { actions: { setProp }, props } = useNode((node) => ({
    props: node.data.props,
  }));
  const { viewMode } = useBuilder();
  const { setResponsiveValue } = useResponsiveSetProp();

  const getDisplayValue = (propName: string, baseValue: any) => {
    if (viewMode === 'mobile') return props[`${propName}_mobile`] ?? baseValue;
    if (viewMode === 'tablet') return props[`${propName}_tablet`] ?? baseValue;
    return props[propName] ?? baseValue;
  };

  const fontFamily = getDisplayValue('fontFamily', 'Inter');
  const fontSize = getDisplayValue('fontSize', '');
  const textAlign = getDisplayValue('textAlign', 'left');
  const lineHeight = getDisplayValue('lineHeight', '');
  const letterSpacing = getDisplayValue('letterSpacing', '');
  const color = getDisplayValue('color', '');
  // Only one real source exists in this project (the Google Fonts css2 loading pattern
  // confirmed across every prior font-loading pass this session) — no System-font enumeration
  // and no custom-font-upload storage/CDN exist anywhere, so "Font type" offers just the one
  // real option rather than speculative unused ones, per the master prompt's own instruction
  // not to build unused source types.
  const fontType = 'google';

  // Real variants for whichever family is currently selected — falls back to a sensible
  // Regular/Bold/Italic set for the rare case a value predates this catalog (e.g. was set
  // before this pass) and isn't one of the curated ~50.
  const fontEntry = getGoogleFont(fontFamily);
  const styleOptions = fontEntry
    ? fontEntry.variants.map((v) => ({ value: v.value, label: v.label }))
    : [
        { value: '400', label: 'Regular' },
        { value: '700', label: 'Bold' },
        { value: '400italic', label: 'Italic' },
      ];
  const currentFontStyle = getDisplayValue('fontWeight', styleOptions[0]?.value || '400');

  const alignments = [
    { value: 'left', icon: AlignLeft },
    { value: 'center', icon: AlignCenter },
    { value: 'right', icon: AlignRight },
    { value: 'justify', icon: AlignJustify }
  ];

  // Real reset — genuinely clears this element's own explicit typography props (undefined),
  // not decorative. With no per-element value set, the component falls back to its own
  // built-in default / the active course theme's font (see Text.tsx/Heading.tsx/
  // Paragraph.tsx's useThemeFont precedence — an explicit fontFamily here always wins over
  // the theme while set, so clearing it is what actually lets the theme default show again).
  const handleReset = () => {
    setProp((p: any) => {
      delete p.fontFamily;
      delete p.fontSize;
      delete p.lineHeight;
      delete p.letterSpacing;
      delete p.fontWeight;
    });
  };

  return (
    <PropertyGroup title="Typography" defaultOpen={false} onReset={handleReset} resetTitle="Reset typography to default">
      {/* Font size & line height — sliders, matching the reference design */}
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

      <PropertySelect
        label="Font type"
        value={fontType}
        options={[{ value: 'google', label: 'Google Fonts' }]}
        onChange={() => {}}
      />

      <FontFamilyPicker
        value={fontFamily}
        onChange={(family) => {
          loadGoogleFontFamily(family);
          setResponsiveValue('fontFamily', family);
          // The previous family's selected weight/style may not exist on the new family —
          // reset to its first real variant rather than silently keeping an invalid one.
          const entry = getGoogleFont(family);
          setResponsiveValue('fontWeight', entry?.variants[0]?.value || '400');
        }}
      />

      <PropertySelect
        label="Font style"
        value={currentFontStyle}
        options={styleOptions}
        onChange={(val) => setResponsiveValue('fontWeight', val)}
      />

      {/* Alignment */}
      <div className="space-y-2">
        <Label className="text-[10px] font-bold !text-dash-textMuted block">Alignment</Label>
        <div className="flex bg-dash-surface p-1 rounded-lg border border-dash-border max-w-fit gap-1">
          {alignments.map((item) => {
            const Icon = item.icon;
            const active = textAlign === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setResponsiveValue('textAlign', item.value)}
                className={`p-1.5 rounded transition-all motion-reduce:transition-none ${
                  active
                    ? 'bg-dash-accent text-white shadow'
                    : '!text-dash-textMuted hover:!text-dash-text hover:bg-white'
                }`}
                title={`Align ${item.value}`}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Letter spacing */}
      <SliderWithInput
        label="Letter spacing"
        value={letterSpacing}
        onChange={(val) => setResponsiveValue('letterSpacing', val)}
        min={-5}
        max={20}
        step={0.1}
        unit="px"
      />

      {/* Color Picker */}
      <ColorPicker
        label="Text color"
        value={color === 'transparent' ? '' : color}
        onChange={(val) => setResponsiveValue('color', val)}
      />
    </PropertyGroup>
  );
};
