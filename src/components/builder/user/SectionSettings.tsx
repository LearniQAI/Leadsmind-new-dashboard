"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '@/components/ui/label';
import { ColorPicker } from '../ColorPicker';
import { Button } from '@/components/ui/button';

import { useResponsiveSetProp } from '@/lib/builder/hooks';
import { useBuilder } from '../BuilderContext';
import { SliderWithInput, PropertyGroup } from '../inspector/primitives';

// Consistent Premium Settings Panels pass — Section already used SliderWithInput/ColorPicker
// (both automatically upgraded via the shared primitives change); horizontal padding's two
// raw <input type="number"> fields (no slider, inconsistent with the rest of this panel) are
// swapped to the same SliderWithInput used everywhere else, and every section now sits under
// a real PropertyGroup title for visual consistency with the Text panel. Real prop wiring
// (paddingTop/Bottom/Left/Right/backgroundColor) is unchanged. Top/bottom padding is edited in
// the universal Spacing section every block shares (inspector/SpacingControls, mounted by
// ElementProperties) — same props, one editor.
export const SectionSettings = () => {
  const { actions: { setProp }, props } = useNode((node) => ({
    props: node.data.props,
  }));
  const { viewMode } = useBuilder();
  const { setResponsiveValue } = useResponsiveSetProp();

  const { paddingLeft, paddingRight, backgroundColor } = props;

  // Helper to get current display value for a prop
  const getDisplayValue = (propName: string, baseValue: any) => {
    if (viewMode === 'mobile') return props[`${propName}_mobile`] ?? baseValue;
    if (viewMode === 'tablet') return props[`${propName}_tablet`] ?? baseValue;
    return baseValue;
  };

  return (
    <div className="space-y-6">
      <PropertyGroup title="Background">
        <div className="flex items-center justify-between -mt-1">
          <span className="text-[12px] font-medium text-slate-700">Section fill color</span>
          <Button
             variant="ghost"
             size="sm"
             onClick={() => setProp((props: any) => props.backgroundColor = 'transparent')}
             className="h-6 text-[9px] font-bold text-slate-500 hover:text-slate-700 px-2 py-0 bg-slate-100 hover:bg-slate-200 rounded-lg"
          >
            Transparent
          </Button>
        </div>

        <ColorPicker
          value={backgroundColor === 'transparent' ? '' : backgroundColor}
          onChange={(val) => setProp((props: any) => props.backgroundColor = val)}
        />
      </PropertyGroup>

      <PropertyGroup title="Horizontal padding">
        <SliderWithInput
          label="Left padding"
          value={getDisplayValue('paddingLeft', paddingLeft) || 0}
          onChange={(val) => setResponsiveValue('paddingLeft', val)}
          min={0}
          max={256}
          step={8}
          numeric
        />
        <SliderWithInput
          label="Right padding"
          value={getDisplayValue('paddingRight', paddingRight) || 0}
          onChange={(val) => setResponsiveValue('paddingRight', val)}
          min={0}
          max={256}
          step={8}
          numeric
        />
      </PropertyGroup>
    </div>
  );
};
