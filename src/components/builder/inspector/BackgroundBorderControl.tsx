"use client";

import React, { useState } from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ColorPicker } from '../ColorPicker';
import { useResponsiveSetProp } from '@/lib/builder/hooks';
import { useBuilder } from '../BuilderContext';

export const BackgroundBorderControl = () => {
  const { props } = useNode((node) => ({
    props: node.data.props,
  }));
  const { viewMode } = useBuilder();
  const { setResponsiveValue } = useResponsiveSetProp();

  const getDisplayValue = (propName: string, baseValue: any) => {
    if (viewMode === 'mobile') return props[`${propName}_mobile`] ?? baseValue;
    if (viewMode === 'tablet') return props[`${propName}_tablet`] ?? baseValue;
    return props[propName] ?? baseValue;
  };

  // Background Props
  const backgroundColor = getDisplayValue('backgroundColor', 'transparent');
  const backgroundGradient = getDisplayValue('backgroundGradient', false);
  const gradientColor1 = getDisplayValue('gradientColor1', '#2563eb');
  const gradientColor2 = getDisplayValue('gradientColor2', '#7c3aed');
  const gradientAngle = getDisplayValue('gradientAngle', '90');

  // Border Props
  const borderWidth = getDisplayValue('borderWidth', '');
  const borderStyle = getDisplayValue('borderStyle', 'none');
  const borderColor = getDisplayValue('borderColor', '');
  const borderRadius = getDisplayValue('borderRadius', '');
  const borderRadiusIndividual = getDisplayValue('borderRadiusIndividual', false);
  
  const btlr = getDisplayValue('borderTopLeftRadius', '');
  const btrr = getDisplayValue('borderTopRightRadius', '');
  const bbrr = getDisplayValue('borderBottomRightRadius', '');
  const bblr = getDisplayValue('borderBottomLeftRadius', '');

  // Shadow preset
  const boxShadow = getDisplayValue('boxShadow', 'none');

  const borderStyles = ['none', 'solid', 'dashed', 'dotted'];
  const shadows = ['none', 'sm', 'md', 'lg', 'xl'];

  return (
    <div className="space-y-4 pt-4 border-t border-white/5">
      <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">Background & Borders</Label>

      {/* Background Color */}
      {!backgroundGradient && (
        <ColorPicker 
          label="Background Color"
          value={backgroundColor === 'transparent' ? '' : backgroundColor}
          onChange={(val) => setResponsiveValue('backgroundColor', val)}
        />
      )}

      {/* Gradient Builder */}
      <div className="space-y-3 p-3 rounded-lg bg-white/5 border border-white/5">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Use Linear Gradient</Label>
          <input 
            type="checkbox" 
            checked={backgroundGradient}
            onChange={(e) => setResponsiveValue('backgroundGradient', e.target.checked)}
            className="accent-primary h-4 w-4 rounded border-white/10"
          />
        </div>

        {backgroundGradient && (
          <div className="space-y-3 pt-2 border-t border-white/5">
            <div className="grid grid-cols-2 gap-2">
              <ColorPicker 
                label="Stop 1"
                value={gradientColor1}
                onChange={(val) => setResponsiveValue('gradientColor1', val)}
              />
              <ColorPicker 
                label="Stop 2"
                value={gradientColor2}
                onChange={(val) => setResponsiveValue('gradientColor2', val)}
              />
            </div>
            
            <div className="space-y-1">
              <Label className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground block flex justify-between">
                <span>Angle</span>
                <span>{gradientAngle}°</span>
              </Label>
              <input 
                type="range" min="0" max="360" step="5"
                value={gradientAngle}
                onChange={(e) => setResponsiveValue('gradientAngle', e.target.value)}
                className="w-full accent-primary"
              />
            </div>
          </div>
        )}
      </div>

      {/* Border Width & Style */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground block">Border Width</Label>
          <Input 
            value={borderWidth}
            onChange={(e) => setResponsiveValue('borderWidth', e.target.value)}
            className="h-9 text-xs bg-white/5 border-white/10"
            placeholder="e.g. 1px or 2px"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground block">Border Style</Label>
          <select 
            value={borderStyle}
            onChange={(e) => setResponsiveValue('borderStyle', e.target.value)}
            className="w-full h-9 text-xs bg-white/5 border border-white/10 rounded-lg text-white px-2 focus:border-primary outline-none"
          >
            {borderStyles.map((s) => (
              <option key={s} value={s} className="bg-[#12121c] text-white capitalize">{s}</option>
            ))}
          </select>
        </div>
      </div>

      {borderStyle !== 'none' && (
        <ColorPicker 
          label="Border Color"
          value={borderColor}
          onChange={(val) => setResponsiveValue('borderColor', val)}
        />
      )}

      {/* Border Radius */}
      <div className="space-y-3 p-3 rounded-lg bg-white/5 border border-white/5">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Individual Corners</Label>
          <input 
            type="checkbox" 
            checked={borderRadiusIndividual}
            onChange={(e) => setResponsiveValue('borderRadiusIndividual', e.target.checked)}
            className="accent-primary h-4 w-4 rounded border-white/10"
          />
        </div>

        {!borderRadiusIndividual ? (
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground block">Border Radius</Label>
            <Input 
              value={borderRadius}
              onChange={(e) => setResponsiveValue('borderRadius', e.target.value)}
              className="h-9 text-xs bg-white/5 border-white/10"
              placeholder="e.g. 8px or 1rem"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
            <div className="space-y-1">
              <Label className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground block">Top-Left</Label>
              <Input 
                value={btlr}
                onChange={(e) => setResponsiveValue('borderTopLeftRadius', e.target.value)}
                className="h-8 text-xs bg-white/5 border-white/10"
                placeholder="0px"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground block">Top-Right</Label>
              <Input 
                value={btrr}
                onChange={(e) => setResponsiveValue('borderTopRightRadius', e.target.value)}
                className="h-8 text-xs bg-white/5 border-white/10"
                placeholder="0px"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground block">Bottom-Right</Label>
              <Input 
                value={bbrr}
                onChange={(e) => setResponsiveValue('borderBottomRightRadius', e.target.value)}
                className="h-8 text-xs bg-white/5 border-white/10"
                placeholder="0px"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground block">Bottom-Left</Label>
              <Input 
                value={bblr}
                onChange={(e) => setResponsiveValue('borderBottomLeftRadius', e.target.value)}
                className="h-8 text-xs bg-white/5 border-white/10"
                placeholder="0px"
              />
            </div>
          </div>
        )}
      </div>

      {/* Shadow Preset */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">Box Shadow</Label>
        <div className="grid grid-cols-5 bg-white/5 p-1 rounded-lg border border-white/10">
          {shadows.map((preset) => {
            const active = boxShadow === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => setResponsiveValue('boxShadow', preset)}
                className={`py-1 rounded text-[10px] font-bold transition-all capitalize ${
                  active 
                    ? 'bg-primary text-white shadow' 
                    : 'text-muted-foreground hover:text-white hover:bg-white/5'
                }`}
              >
                {preset}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
