"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ColorPicker } from '../ColorPicker';
import { IconPicker } from '../IconPicker';
import { LinkSelector } from '../LinkSelector';

export const ButtonSettings = () => {
  const { actions: { setProp }, text, size, variant, color, textColor, borderRadius, width, link, icon, iconPosition } = useNode((node) => ({
    ...node.data.props
  }));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="text-xs font-bold !text-dash-textMuted block">Button text</Label>
        <Input
          value={text}
          onChange={(e) => setProp((props: any) => props.text = e.target.value)}
          className="h-9 bg-white border-dash-border text-xs"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold !text-dash-textMuted block">Link destination</Label>
        <LinkSelector
          value={link}
          onChange={(val) => setProp((props: any) => props.link = val)}
        />
      </div>

      <div className="space-y-2 pt-2 border-t border-dash-border">
        <Label className="text-xs font-bold !text-dash-textMuted block">Size</Label>
        <div className="grid grid-cols-4 bg-dash-surface p-1 rounded-md border border-dash-border">
          {['sm', 'md', 'lg', 'xl'].map((s) => (
            <button
              key={s}
              onClick={() => setProp((props: any) => props.size = s)}
              className={`text-[10px] py-1.5 rounded font-bold uppercase transition-all motion-reduce:transition-none ${size === s ? 'bg-dash-accent text-white shadow' : '!text-dash-textMuted hover:!text-dash-text'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold !text-dash-textMuted block">Width</Label>
        <div className="grid grid-cols-2 bg-dash-surface p-1 rounded-md border border-dash-border">
          {['fit', 'full'].map((w) => (
            <button
              key={w}
              onClick={() => setProp((props: any) => props.width = w)}
              className={`text-[10px] py-1.5 rounded capitalize font-bold transition-all motion-reduce:transition-none ${width === w ? 'bg-dash-accent text-white shadow' : '!text-dash-textMuted hover:!text-dash-text'}`}
            >
              {w} content
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 pt-2 border-t border-dash-border">
        <Label className="text-xs font-bold !text-dash-textMuted block">Colors</Label>
        <ColorPicker label="Background" value={color} onChange={(val) => setProp((props: any) => props.color = val)} />
        <ColorPicker label="Text color" value={textColor} onChange={(val) => setProp((props: any) => props.textColor = val)} />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold !text-dash-textMuted block">Border radius ({borderRadius}px)</Label>
        <input
          type="range" min="0" max="50" step="2"
          value={borderRadius || 0}
          onChange={(e) => setProp((props: any) => props.borderRadius = Number(e.target.value))}
          className="w-full accent-dash-accent"
        />
      </div>

      <div className="space-y-3 pt-2 border-t border-dash-border">
        <Label className="text-xs font-bold !text-dash-textMuted block">Icon</Label>
        <IconPicker
          value={icon || ''}
          onChange={(val) => setProp((props: any) => props.icon = val)}
        />

        {icon && (
          <div className="grid grid-cols-2 bg-dash-surface p-1 rounded-md border border-dash-border">
            {['left', 'right'].map((pos) => (
              <button
                key={pos}
                onClick={() => setProp((props: any) => props.iconPosition = pos)}
                className={`text-[10px] py-1.5 rounded capitalize font-bold transition-colors motion-reduce:transition-none ${iconPosition === pos ? 'bg-dash-accent text-white shadow' : '!text-dash-textMuted hover:!text-dash-text'}`}
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
