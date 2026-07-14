"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '@/components/ui/label';
import { ColorPicker } from '../ColorPicker';

export const TextSettings = () => {
  const { actions: { setProp }, fontSize, textAlign, color } = useNode((node) => ({
    fontSize: node.data.props.fontSize,
    textAlign: node.data.props.textAlign,
    color: node.data.props.color,
  }));

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-bold !text-dash-textMuted block">Font size ({fontSize}px)</Label>
        <input
          type="range"
          min="10"
          max="100"
          value={fontSize || 16}
          onChange={(e) => setProp((props: any) => props.fontSize = Number(e.target.value))}
          className="w-full accent-primary"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold !text-dash-textMuted block">Text align</Label>
        <div className="flex bg-dash-surface p-1 rounded-md border border-dash-border">
          {['left', 'center', 'right', 'justify'].map((align) => (
            <button
              key={align}
              onClick={() => setProp((props: any) => props.textAlign = align)}
              className={`flex-1 text-[10px] py-1 rounded capitalize transition-colors motion-reduce:transition-none ${textAlign === align ? 'bg-primary text-white shadow font-bold' : '!text-dash-textMuted hover:!text-dash-text'}`}
            >
              {align}
            </button>
          ))}
        </div>
      </div>

      <ColorPicker
        label="Text color"
        value={color || '#000000'}
        onChange={(val) => setProp((props: any) => props.color = val)}
      />
    </div>
  );
};
