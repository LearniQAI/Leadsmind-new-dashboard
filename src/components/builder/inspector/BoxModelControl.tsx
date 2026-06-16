"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '@/components/ui/label';
import { useResponsiveSetProp } from '@/lib/builder/hooks';
import { useBuilder } from '../BuilderContext';

export const BoxModelControl = () => {
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

  // Box model values
  const mt = getDisplayValue('marginTop', '');
  const mr = getDisplayValue('marginRight', '');
  const mb = getDisplayValue('marginBottom', '');
  const ml = getDisplayValue('marginLeft', '');

  const pt = getDisplayValue('paddingTop', '');
  const pr = getDisplayValue('paddingRight', '');
  const pb = getDisplayValue('paddingBottom', '');
  const pl = getDisplayValue('paddingLeft', '');

  const BoxInput = ({ value, onChange, placeholder }: { value: string, onChange: (val: string) => void, placeholder: string }) => (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-12 h-6 text-[10px] text-center bg-white/5 border border-white/10 rounded focus:border-primary focus:bg-white/10 text-white p-0.5 outline-none transition-all placeholder:text-white/20"
      placeholder={placeholder}
    />
  );

  return (
    <div className="space-y-3 pt-4 border-t border-white/5">
      <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">Spacing (Box Model)</Label>
      
      {/* Outer Margin Box */}
      <div className="relative border border-dashed border-white/10 rounded-xl bg-white/[0.02] p-4 flex flex-col items-center justify-center">
        <span className="absolute top-1 left-2 text-[8px] uppercase tracking-widest font-black text-white/20">Margin</span>
        
        {/* Margin Top */}
        <div className="mb-2">
          <BoxInput 
            value={mt} 
            onChange={(val) => setResponsiveValue('marginTop', val)} 
            placeholder="0px" 
          />
        </div>
        
        <div className="w-full flex items-center justify-between gap-2">
          {/* Margin Left */}
          <BoxInput 
            value={ml} 
            onChange={(val) => setResponsiveValue('marginLeft', val)} 
            placeholder="0px" 
          />

          {/* Inner Padding Box */}
          <div className="flex-1 relative border border-solid border-white/15 rounded-lg bg-white/5 p-4 flex flex-col items-center justify-center min-h-[100px] max-w-[190px]">
            <span className="absolute top-1 left-2 text-[8px] uppercase tracking-widest font-black text-white/30">Padding</span>

            {/* Padding Top */}
            <div className="mb-2">
              <BoxInput 
                value={pt} 
                onChange={(val) => setResponsiveValue('paddingTop', val)} 
                placeholder="0px" 
              />
            </div>

            <div className="w-full flex items-center justify-between gap-1">
              {/* Padding Left */}
              <BoxInput 
                value={pl} 
                onChange={(val) => setResponsiveValue('paddingLeft', val)} 
                placeholder="0px" 
              />
              
              {/* Center Content Indicator */}
              <div className="text-[9px] uppercase tracking-widest font-black text-white/40 select-none">
                Content
              </div>

              {/* Padding Right */}
              <BoxInput 
                value={pr} 
                onChange={(val) => setResponsiveValue('paddingRight', val)} 
                placeholder="0px" 
              />
            </div>

            {/* Padding Bottom */}
            <div className="mt-2">
              <BoxInput 
                value={pb} 
                onChange={(val) => setResponsiveValue('paddingBottom', val)} 
                placeholder="0px" 
              />
            </div>
          </div>

          {/* Margin Right */}
          <BoxInput 
            value={mr} 
            onChange={(val) => setResponsiveValue('marginRight', val)} 
            placeholder="0px" 
          />
        </div>

        {/* Margin Bottom */}
        <div className="mt-2">
          <BoxInput 
            value={mb} 
            onChange={(val) => setResponsiveValue('marginBottom', val)} 
            placeholder="0px" 
          />
        </div>
      </div>
    </div>
  );
};
