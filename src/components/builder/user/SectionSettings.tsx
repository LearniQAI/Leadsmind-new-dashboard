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
// (paddingTop/Bottom/Left/Right/backgroundColor) is unchanged.
export const SectionSettings = () => {
  const { actions: { setProp }, props } = useNode((node) => ({
    props: node.data.props,
  }));
  const { viewMode } = useBuilder();
  const { setResponsiveValue } = useResponsiveSetProp();

  const { paddingTop, paddingBottom, paddingLeft, paddingRight, backgroundColor } = props;

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
          <span className="text-[10px] !text-dash-textMuted">Section fill color</span>
          <Button
             variant="ghost"
             size="sm"
             onClick={() => setProp((props: any) => props.backgroundColor = 'transparent')}
             className="h-6 text-[9px] font-bold !text-dash-textMuted hover:!text-dash-text px-2 py-0 bg-dash-surface rounded"
          >
            Transparent
          </Button>
        </div>

        <ColorPicker
          value={backgroundColor === 'transparent' ? '' : backgroundColor}
          onChange={(val) => setProp((props: any) => props.backgroundColor = val)}
        />
      </PropertyGroup>

      <PropertyGroup title="Vertical spacing">
        <SliderWithInput
          label="Top padding"
          value={getDisplayValue('paddingTop', paddingTop) || 0}
          onChange={(val) => setResponsiveValue('paddingTop', val)}
          min={0}
          max={256}
          step={8}
          numeric
        />
        <SliderWithInput
          label="Bottom padding"
          value={getDisplayValue('paddingBottom', paddingBottom) || 0}
          onChange={(val) => setResponsiveValue('paddingBottom', val)}
          min={0}
          max={256}
          step={8}
          numeric
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
