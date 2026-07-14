"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { AlignLeft, AlignCenter, AlignRight, Star } from 'lucide-react';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { ColorPicker } from '../ColorPicker';
import { Button } from '../../ui/button';
import { Switch } from '../../ui/switch';

export const StarRatingSettings = () => {
  const { actions: { setProp }, props } = useNode((node) => ({
    props: node.data.props,
  }));

  const { rating, size, color, count, alignment, showLabel, labelText } = props;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label className="text-xs font-bold !text-dash-textMuted">Rating ({rating})</Label>
        <div className="flex flex-col gap-3">
           <input
            type="range"
            min="0"
            max={count}
            step="0.5"
            value={rating}
            onChange={(e) => setProp((p: any) => p.rating = Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between items-center px-1">
             <Button
              variant="ghost"
              size="icon"
              onClick={() => setProp((p: any) => p.count = Math.max(1, p.count - 1))}
              className="h-6 w-6 border"
             >
               -
             </Button>
             <span className="text-[10px] font-bold !text-dash-textMuted">{count} total stars</span>
             <Button
              variant="ghost"
              size="icon"
              onClick={() => setProp((p: any) => p.count = Math.min(10, p.count + 1))}
              className="h-6 w-6 border"
             >
               +
             </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Label className="text-xs font-bold !text-dash-textMuted">Appearance</Label>
        <ColorPicker label="Star color" value={color} onChange={(val) => setProp((p: any) => p.color = val)} />
        <div className="space-y-2">
           <Label className="text-[10px] font-bold !text-dash-textMuted">Star size ({size}px)</Label>
           <input type="range" min="12" max="64" step="2" value={size} onChange={(e) => setProp((p: any) => p.size = Number(e.target.value))} className="w-full accent-primary" />
        </div>
      </div>

      <div className="space-y-4">
        <Label className="text-xs font-bold !text-dash-textMuted">Layout & label</Label>
        <div className="flex bg-dash-surface p-1 rounded-lg border border-dash-border">
          {[
            { id: 'left', icon: AlignLeft },
            { id: 'center', icon: AlignCenter },
            { id: 'right', icon: AlignRight },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setProp((p: any) => p.alignment = item.id)}
              className={`flex-1 flex justify-center py-1.5 rounded-md transition-all motion-reduce:transition-none ${alignment === item.id ? 'bg-white shadow-sm text-primary' : '!text-dash-textMuted hover:!text-dash-text'}`}
            >
              <item.icon size={16} />
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2">
          <Label className="text-[11px] font-medium">Show sub-label</Label>
          <Switch checked={showLabel} onCheckedChange={(val) => setProp((p: any) => p.showLabel = val)} />
        </div>

        {showLabel && (
          <div className="space-y-1">
            <Label className="text-[9px] font-bold !text-dash-textMuted">Label text</Label>
            <Input
              value={labelText}
              onChange={(e) => setProp((p: any) => p.labelText = e.target.value)}
              className="h-8 bg-white border-dash-border text-[11px]"
              placeholder="e.g. Based on 500+ happy clients"
            />
          </div>
        )}
      </div>
    </div>
  );
};
