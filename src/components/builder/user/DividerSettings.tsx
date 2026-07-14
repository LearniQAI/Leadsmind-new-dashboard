"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ColorPicker } from '../ColorPicker';

export const DividerSettings = () => {
  const { actions: { setProp }, weight, color, width, alignment, paddingTop, paddingBottom } = useNode((node) => ({
    weight: node.data.props.weight,
    color: node.data.props.color,
    width: node.data.props.width,
    alignment: node.data.props.alignment,
    paddingTop: node.data.props.paddingTop,
    paddingBottom: node.data.props.paddingBottom,
  }));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="text-xs font-bold !text-dash-textMuted block">Thickness ({weight}px)</Label>
        <input
          type="range"
          min="1"
          max="10"
          value={weight || 1}
          onChange={(e) => setProp((props: any) => props.weight = Number(e.target.value))}
          className="w-full accent-dash-accent"
        />
      </div>

      <ColorPicker
        label="Line color"
        value={color || '#e5e7eb'}
        onChange={(val) => setProp((props: any) => props.color = val)}
      />

      <div className="space-y-2 border-t border-dash-border pt-4">
        <Label className="text-xs font-bold !text-dash-textMuted block">Length (width)</Label>
        <Input
          value={width || '100%'}
          onChange={(e) => setProp((props: any) => props.width = e.target.value)}
          className="h-9 text-xs bg-white border-dash-border"
          placeholder="100% or 200px"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold !text-dash-textMuted block">Alignment</Label>
        <div className="flex bg-dash-surface p-1 rounded-md border border-dash-border">
          {['left', 'center', 'right'].map((align) => (
            <button
              key={align}
              onClick={() => setProp((props: any) => props.alignment = align)}
              className={`flex-1 text-[10px] py-1.5 rounded capitalize font-bold transition-colors motion-reduce:transition-none ${alignment === align ? 'bg-dash-accent text-white shadow' : '!text-dash-textMuted hover:!text-dash-text'}`}
            >
              {align}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-dash-border">
        <Label className="text-xs font-bold !text-dash-textMuted block">Vertical spacing</Label>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-[10px] !text-dash-textMuted">Top (px)</Label>
            <Input
              type="number"
              value={paddingTop || 0}
              onChange={(e) => setProp((props: any) => props.paddingTop = Number(e.target.value))}
              className="h-8 text-xs bg-white border-dash-border"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] !text-dash-textMuted">Bottom (px)</Label>
            <Input
              type="number"
              value={paddingBottom || 0}
              onChange={(e) => setProp((props: any) => props.paddingBottom = Number(e.target.value))}
              className="h-8 text-xs bg-white border-dash-border"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
