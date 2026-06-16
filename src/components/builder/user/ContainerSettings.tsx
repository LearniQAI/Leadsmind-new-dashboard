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
        <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">Container Type</Label>
        <div className="grid grid-cols-2 bg-white/5 p-1 rounded-lg border border-white/10">
          {['fixed', 'fluid'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setProp((props: any) => props.layoutType = type)}
              className={`text-[10px] py-1.5 rounded capitalize font-bold transition-all ${
                layoutType === type 
                  ? 'bg-primary text-white shadow' 
                  : 'text-muted-foreground hover:text-white'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {layoutType === 'fixed' && (
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">Max Width</Label>
          <Input 
            value={getDisplayValue('maxWidth', maxWidth)}
            onChange={(e) => setResponsiveValue('maxWidth', e.target.value)}
            className="h-9 text-xs bg-white/5 border-white/10 rounded-lg focus:border-primary"
            placeholder="e.g. 1200px or 90%"
          />
        </div>
      )}

      <ColorPicker 
        label="Background Color"
        value={backgroundColor === 'transparent' ? '' : backgroundColor}
        onChange={(val) => setProp((props: any) => props.backgroundColor = val)}
      />

      {/* Internal Padding with badge */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">Internal Padding</Label>
          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            {getDisplayValue('padding', padding)}px
          </span>
        </div>
        <input 
          type="range" min="0" max="128" step="4"
          value={getDisplayValue('padding', padding) || 0}
          onChange={(e) => setResponsiveValue('padding', Number(e.target.value))}
          className="w-full accent-primary mt-1"
        />
      </div>

      <Separator className="bg-white/5 my-2" />
      <FlexboxControl />
      
      <Separator className="bg-white/5 my-2" />
      <BoxModelControl />
      
      <Separator className="bg-white/5 my-2" />
      <TypographyControl />
      
      <Separator className="bg-white/5 my-2" />
      <BackgroundBorderControl />
      
      <Separator className="bg-white/5 my-2" />
      <CustomClassControl />
    </div>
  );
};

