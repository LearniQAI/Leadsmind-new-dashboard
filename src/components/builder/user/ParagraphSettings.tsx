"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { List, ListOrdered, Pilcrow } from 'lucide-react';

import { useResponsiveSetProp } from '@/lib/builder/hooks';
import { useBuilder } from '../BuilderContext';
import { SliderWithInput } from '../inspector/primitives';
import { SectionHeader, FontInheritSelect, type BoxSides } from '../inspector/panelControls';
import { ColorSection, SizePositionSection, usePageFontName, readSides } from '../inspector/panelSections';
import { FontWeightButtons, LineHeightButtons } from '../inspector/typographyControls';
import { SEGMENT_WRAP, segmentBtn, MICRO_LABEL } from '../inspector/panelTheme';
import { loadGoogleFontFamily } from '@/lib/builder/loadGoogleFont';
import { getParagraphListStyle, setParagraphListStyle, type ParagraphListStyle } from '@/lib/builder/paragraphListStyle';
import { Label } from '@/components/ui/label';

// Whole-block List style (None / Bullets / Numbers). Same segmented-button pattern as
// FontWeightButtons/LineHeightButtons above, but operates on the stored `text` HTML directly
// (setParagraphListStyle) rather than a plain prop — the panel doesn't need a live editor
// instance: InlineTextEditor's own sync effect already reconciles an externally-changed `text`
// prop into the TipTap document, exactly as it does for undo/redo.
const LIST_STYLE_OPTIONS: { value: ParagraphListStyle; label: string; icon: typeof List }[] = [
  { value: 'none', label: 'None', icon: Pilcrow },
  { value: 'bullet', label: 'Bullets', icon: List },
  { value: 'number', label: 'Numbers', icon: ListOrdered },
];

const ListStyleButtons = ({ text, onChange }: { text: string; onChange: (next: string) => void }) => {
  const current = getParagraphListStyle(text || '');
  return (
    <div className="space-y-2">
      <Label className={`${MICRO_LABEL} block`}>List style</Label>
      <div className={SEGMENT_WRAP}>
        {LIST_STYLE_OPTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => onChange(setParagraphListStyle(text || '', value))}
            aria-pressed={current === value}
            className={`${segmentBtn(current === value)} inline-flex items-center justify-center gap-1.5`}
          >
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>
    </div>
  );
};

export const ParagraphSettings = () => {
  const { actions: { setProp }, props } = useNode((node) => ({ props: node.data.props }));
  const { viewMode } = useBuilder();
  const { setResponsiveValue } = useResponsiveSetProp();
  const pageFontName = usePageFontName();

  const { fontSize, fontWeight, textAlign, color, lineHeight, letterSpacing, text, listItemSpacing } = props;
  const backgroundColor = props.backgroundColor;
  const listStyle = getParagraphListStyle(text || '');

  const resetList = () => setProp((p: any) => {
    p.text = setParagraphListStyle(p.text || '', 'none');
    delete p.listItemSpacing;
  });

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
    // Left/right only — top/bottom belong to the universal Spacing section (its own reset).
      ['Right', 'Left'].forEach((s) => forEachViewport(p, [`padding${s}`, `margin${s}`]));
    p.textAlign = 'left';
    delete p.textAlign_mobile; delete p.textAlign_tablet;
  });

  const writeSides = (prefix: 'padding' | 'margin') => (v: BoxSides) => {
    setResponsiveValue(`${prefix}Right`, v.right);
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

      {/* List — None applies no markup change; Bullets/Numbers rewrite the stored text into a
          <ul>/<ol>, same as typing it would via the selection toolbar. Item spacing only matters
          once a list style is chosen, so it's shown alongside it rather than always-on. */}
      <div className="space-y-3">
        <SectionHeader title="List" onReset={resetList} resetTitle="Clear the list, back to plain paragraphs" />
        <ListStyleButtons text={text || ''} onChange={(next) => setProp((p: any) => { p.text = next; })} />
        {listStyle !== 'none' && (
          <SliderWithInput
            label="Space between items"
            value={typeof listItemSpacing === 'number' ? listItemSpacing : 8}
            onChange={(val) => setProp((p: any) => { p.listItemSpacing = val; })}
            min={0}
            max={32}
            numeric
          />
        )}
      </div>

      <ColorSection
        color={getDisplayValue('color', color) || '#4b5563'}
        backgroundColor={getDisplayValue('backgroundColor', backgroundColor) || ''}
        onColor={(v) => setResponsiveValue('color', v)}
        onBackgroundColor={(v) => setResponsiveValue('backgroundColor', v)}
        onReset={resetColor}
      />
      {/* Bullet/number colour deliberately has no control of its own: CSS list markers
          (::marker) inherit `color` by default, so they already follow Text color above. */}

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
