"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ColorPicker } from '../ColorPicker';
import { IconPicker } from '../IconPicker';
import { LinkSelector } from '../LinkSelector';
import { SliderWithInput } from '../inspector/primitives';

export const ButtonSettings = () => {
  const { actions: { setProp }, text, size, variant, color, textColor, borderRadius, width, link, icon, iconPosition } = useNode((node) => ({
    ...node.data.props
  }));

  return (
    <div>
      <div className="mb-7 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium text-slate-700 block">Button text</Label>
          <Input
            value={text}
            onChange={(e) => setProp((props: any) => props.text = e.target.value)}
            className="h-9 bg-white border-slate-200 rounded-xl text-slate-700 text-xs focus-visible:border-slate-300"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium text-slate-700 block">Link destination</Label>
          <LinkSelector
            value={link}
            onChange={(val) => setProp((props: any) => props.link = val)}
          />
        </div>
      </div>

      <div className="mb-7 pt-4 border-t border-slate-200 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium text-slate-700 block">Size</Label>
          <div className="grid grid-cols-4 gap-2">
            {['sm', 'md', 'lg', 'xl'].map((s) => (
              <button
                key={s}
                onClick={() => setProp((props: any) => props.size = s)}
                className={`text-[12px] py-1.5 rounded-xl font-medium uppercase border transition-all motion-reduce:transition-none ${size === s ? 'bg-slate-900 text-white border-transparent' : 'bg-slate-100 border-transparent text-slate-600 hover:bg-slate-200'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium text-slate-700 block">Width</Label>
          <div className="grid grid-cols-2 gap-2">
            {['fit', 'full'].map((w) => (
              <button
                key={w}
                onClick={() => setProp((props: any) => props.width = w)}
                className={`text-[12px] py-1.5 rounded-xl capitalize font-medium border transition-all motion-reduce:transition-none ${width === w ? 'bg-slate-900 text-white border-transparent' : 'bg-slate-100 border-transparent text-slate-600 hover:bg-slate-200'}`}
              >
                {w} content
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-7 pt-4 border-t border-slate-200 space-y-4">
        <Label className="text-[13px] font-bold text-slate-900 block">Colors</Label>
        <ColorPicker label="Background" value={color} onChange={(val) => setProp((props: any) => props.color = val)} />
        <ColorPicker label="Text color" value={textColor} onChange={(val) => setProp((props: any) => props.textColor = val)} />
      </div>

      <div className="mb-7 pt-4 border-t border-slate-200">
        <SliderWithInput
          label="Border radius"
          value={borderRadius || 0}
          onChange={(val) => setProp((props: any) => props.borderRadius = val)}
          min={0}
          max={50}
          step={2}
          numeric
        />
      </div>

      <div className="mb-7 last:mb-0 pt-4 border-t border-slate-200 space-y-3">
        <Label className="text-[13px] font-bold text-slate-900 block">Icon</Label>
        <IconPicker
          value={icon || ''}
          onChange={(val) => setProp((props: any) => props.icon = val)}
        />

        {icon && (
          <div className="grid grid-cols-2 gap-2">
            {['left', 'right'].map((pos) => (
              <button
                key={pos}
                onClick={() => setProp((props: any) => props.iconPosition = pos)}
                className={`text-[12px] py-1.5 rounded-xl capitalize font-medium border transition-colors motion-reduce:transition-none ${iconPosition === pos ? 'bg-slate-900 text-white border-transparent' : 'bg-slate-100 border-transparent text-slate-600 hover:bg-slate-200'}`}
              >
                {pos}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
