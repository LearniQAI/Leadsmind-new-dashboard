"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { AlignLeft, AlignCenter, AlignRight, Star } from 'lucide-react';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { ColorPicker } from '../ColorPicker';
import { Button } from '../../ui/button';
import { Switch } from '../../ui/switch';
import { SliderWithInput } from '../inspector/primitives';

export const StarRatingSettings = () => {
  const { actions: { setProp }, props } = useNode((node) => ({
    props: node.data.props,
  }));

  const { rating, size, color, count, alignment, showLabel, labelText } = props;

  return (
    <div className="w-full">
      <div className="mb-7 space-y-3">
        <div className="flex flex-col gap-3">
          <SliderWithInput
            label="Rating"
            value={rating}
            onChange={(val) => setProp((p: any) => p.rating = val)}
            min={0}
            max={count}
            step={0.5}
            unit=""
            numeric
          />
          <div className="flex justify-between items-center px-1">
             <Button
              variant="ghost"
              size="icon"
              onClick={() => setProp((p: any) => p.count = Math.max(1, p.count - 1))}
              className="h-6 w-6 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100"
             >
               -
             </Button>
             <span className="text-[11px] font-medium text-slate-500">{count} total stars</span>
             <Button
              variant="ghost"
              size="icon"
              onClick={() => setProp((p: any) => p.count = Math.min(10, p.count + 1))}
              className="h-6 w-6 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100"
             >
               +
             </Button>
          </div>
        </div>
      </div>

      <div className="mb-7 pt-4 border-t border-slate-200 space-y-3">
        <Label className="text-[13px] font-bold text-slate-900">Appearance</Label>
        <ColorPicker label="Star color" value={color} onChange={(val) => setProp((p: any) => p.color = val)} />
        <SliderWithInput label="Star size" value={size} onChange={(val) => setProp((p: any) => p.size = val)} min={12} max={64} step={2} numeric />
      </div>

      <div className="mb-7 last:mb-0 pt-4 border-t border-slate-200 space-y-3">
        <Label className="text-[13px] font-bold text-slate-900">Layout &amp; label</Label>
        <div className="flex bg-slate-100 p-1 rounded-full border border-transparent">
          {[
            { id: 'left', icon: AlignLeft },
            { id: 'center', icon: AlignCenter },
            { id: 'right', icon: AlignRight },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setProp((p: any) => p.alignment = item.id)}
              className={`flex-1 flex justify-center py-1.5 rounded-full transition-all motion-reduce:transition-none ${alignment === item.id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <item.icon size={16} />
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2">
          <Label className="text-[12px] font-medium text-slate-700">Show sub-label</Label>
          <Switch checked={showLabel} onCheckedChange={(val) => setProp((p: any) => p.showLabel = val)} />
        </div>

        {showLabel && (
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-slate-700">Label text</Label>
            <Input
              value={labelText}
              onChange={(e) => setProp((p: any) => p.labelText = e.target.value)}
              className="h-8 bg-white border-slate-200 rounded-xl text-slate-700 text-[11px] focus-visible:border-slate-300"
              placeholder="e.g. Based on 500+ happy clients"
            />
          </div>
        )}
      </div>
    </div>
  );
};
