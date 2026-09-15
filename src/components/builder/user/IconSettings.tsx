"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ColorPicker } from '../ColorPicker';
import { IconPicker } from '../IconPicker';
import { Switch } from '@/components/ui/switch';

export const IconSettings = () => {
  const { actions: { setProp }, name, size, color, strokeWidth, alignment, fill } = useNode((node) => ({
    name: node.data.props.name,
    size: node.data.props.size,
    color: node.data.props.color,
    strokeWidth: node.data.props.strokeWidth,
    alignment: node.data.props.alignment,
    fill: node.data.props.fill,
  }));

  return (
    <div className="space-y-0">
      <div className="mb-7 space-y-1.5">
        <Label className="text-[12px] font-medium text-slate-700">Select icon</Label>
        <IconPicker
          value={name || 'Star'}
          onChange={(newName) => setProp((props: any) => props.name = newName)}
        />
      </div>

      <div className="mb-7 flex items-center justify-between p-3 bg-slate-100 rounded-xl border border-transparent">
        <div className="space-y-0.5">
          <Label className="text-[12px] font-medium text-slate-700">Solid fill</Label>
          <p className="text-[11px] text-slate-500">Switch between outline and filled</p>
        </div>
        <Switch
          checked={fill || false}
          onCheckedChange={(checked) => setProp((props: any) => props.fill = checked)}
        />
      </div>

      <div className="mb-7 grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium text-slate-700">Size ({size}px)</Label>
          <Input
            type="number"
            value={size || 24}
            onChange={(e) => setProp((props: any) => props.size = Number(e.target.value))}
            className="h-8 text-xs bg-white border-slate-200 rounded-xl text-slate-700 focus-visible:border-slate-300"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium text-slate-700">Stroke ({strokeWidth})</Label>
          <Input
            type="number"
            step="0.5"
            value={strokeWidth || 2}
            onChange={(e) => setProp((props: any) => props.strokeWidth = Number(e.target.value))}
            className="h-8 text-xs bg-white border-slate-200 rounded-xl text-slate-700 focus-visible:border-slate-300"
          />
        </div>
      </div>

      <div className="mb-7">
        <ColorPicker
          label="Icon color"
          value={color || '#000000'}
          onChange={(val) => setProp((props: any) => props.color = val)}
        />
      </div>

      <div className="mb-7 last:mb-0 space-y-2 pt-4 border-t border-slate-200">
        <Label className="text-[12px] font-medium text-slate-700">Alignment</Label>
        <div className="grid grid-cols-3 gap-2">
          {['left', 'center', 'right'].map((align) => (
            <button
              key={align}
              onClick={() => setProp((props: any) => props.alignment = align)}
              className={`p-2 text-[12px] font-medium rounded-xl border capitalize transition-all motion-reduce:transition-none ${alignment === align ? 'bg-slate-900 text-white border-transparent' : 'bg-slate-100 border-transparent text-slate-600 hover:bg-slate-200'}`}
            >
              {align}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
