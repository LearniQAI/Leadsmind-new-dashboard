"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ColorPicker } from '../ColorPicker';

import { useResponsiveSetProp } from '@/lib/builder/hooks';
import { useBuilder } from '../BuilderContext';

import { FlexboxControl } from '../inspector/FlexboxControl';
import { BoxModelControl } from '../inspector/BoxModelControl';
import { TypographyControl } from '../inspector/TypographyControl';
import { BackgroundBorderControl } from '../inspector/BackgroundBorderControl';
import { CustomClassControl } from '../inspector/CustomClassControl';
import { SliderWithInput } from '../inspector/primitives';

export const ContainerSettings = () => {
  const { actions: { setProp }, props } = useNode((node) => ({
    props: node.data.props,
  }));
  const { viewMode } = useBuilder();
  const { setResponsiveValue } = useResponsiveSetProp();

  const { layoutType, maxWidth, backgroundColor, padding } = props;

  // Helper to get current display value for a prop
  const getDisplayValue = (propName: string, baseValue: any) => {
    if (viewMode === 'mobile') return props[`${propName}_mobile`] ?? baseValue;
    if (viewMode === 'tablet') return props[`${propName}_tablet`] ?? baseValue;
    return baseValue;
  };

  return (
    <div className="space-y-4 px-3 py-3">
      {/* Container Type */}
      <div className="space-y-2">
        <Label className="text-xs font-bold !text-dash-textMuted block">Container type</Label>
        <div className="grid grid-cols-2 bg-dash-surface p-1 rounded-lg border border-dash-border">
          {['fixed', 'fluid'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setProp((props: any) => props.layoutType = type)}
              className={`text-[10px] py-1.5 rounded capitalize font-bold transition-all motion-reduce:transition-none ${
                layoutType === type
                  ? 'bg-dash-accent text-white shadow'
                  : '!text-dash-textMuted hover:!text-dash-text'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {layoutType === 'fixed' && (
        <div className="space-y-2">
          <Label className="text-xs font-bold !text-dash-textMuted block">Max width</Label>
          <Input
            value={getDisplayValue('maxWidth', maxWidth)}
            onChange={(e) => setResponsiveValue('maxWidth', e.target.value)}
            className="h-9 text-xs bg-white border-dash-border rounded-lg focus:border-dash-accent"
            placeholder="e.g. 1200px or 90%"
          />
        </div>
      )}

      <ColorPicker
        label="Background color"
        value={backgroundColor === 'transparent' ? '' : backgroundColor}
        onChange={(val) => setProp((props: any) => props.backgroundColor = val)}
      />

      <SliderWithInput
        label="Internal padding"
        value={getDisplayValue('padding', padding) || 0}
        onChange={(val) => setResponsiveValue('padding', val)}
        min={0}
        max={128}
        step={4}
        numeric
      />

      <Separator className="bg-dash-border my-2" />
      <FlexboxControl />

      <Separator className="bg-dash-border my-2" />
      <BoxModelControl />

      <Separator className="bg-dash-border my-2" />
      <TypographyControl />

      <Separator className="bg-dash-border my-2" />
      <BackgroundBorderControl />

      <Separator className="bg-dash-border my-2" />
      <CustomClassControl />
    </div>
  );
};

