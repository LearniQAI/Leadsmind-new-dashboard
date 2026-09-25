"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ColorPicker } from '../ColorPicker';
import { SliderWithInput } from '../inspector/primitives';

export const DividerSettings = () => {
  const { actions: { setProp }, weight, color, width, alignment } = useNode((node) => ({
    weight: node.data.props.weight,
    color: node.data.props.color,
    width: node.data.props.width,
    alignment: node.data.props.alignment,
  }));

  return (
    <div className="space-y-0">
      <div className="mb-7">
        <SliderWithInput
          label="Thickness"
          value={weight || 1}
          onChange={(val) => setProp((props: any) => props.weight = val)}
          min={1}
          max={10}
          numeric
        />
      </div>

      <div className="mb-7">
        <ColorPicker
          label="Line color"
          value={color || '#e5e7eb'}
          onChange={(val) => setProp((props: any) => props.color = val)}
        />
      </div>

      <div className="mb-7 pt-4 border-t border-slate-200 space-y-1.5">
        <Label className="text-[12px] font-medium text-slate-700">Length (width)</Label>
        <Input
          value={width || '100%'}
          onChange={(e) => setProp((props: any) => props.width = e.target.value)}
          className="h-9 text-xs bg-white border-slate-200 rounded-xl text-slate-700 focus-visible:border-slate-300"
          placeholder="100% or 200px"
        />
      </div>

      <div className="mb-7 space-y-2">
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

      {/* Top/bottom spacing: the universal Spacing section below (inspector/SpacingControls,
          mounted by ElementProperties for every block) edits the same paddingTop/Bottom props,
          now per breakpoint — this panel's old desktop-only inputs were removed, not duplicated. */}
    </div>
  );
};
