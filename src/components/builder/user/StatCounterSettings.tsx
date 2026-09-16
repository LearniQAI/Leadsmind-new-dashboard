"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ColorPicker } from '../ColorPicker';
import { SliderWithInput } from '../inspector/primitives';

export const StatCounterSettings = () => {
  const { actions: { setProp }, props } = useNode((node) => ({
    props: node.data.props,
  }));

  const { stats, numberColor, labelColor, accentColor, backgroundColor, duration } = props;

  const addStat = () => {
    setProp((p: any) => {
      p.stats.push({ value: 100, suffix: '+', label: 'New Stat' });
    });
  };

  const removeStat = (index: number) => {
    setProp((p: any) => {
      p.stats.splice(index, 1);
    });
  };

  const updateStat = (index: number, key: string, value: any) => {
    setProp((p: any) => {
      p.stats[index][key] = value;
    });
  };

  return (
    <div className="space-y-0">
      <div className="mb-7 space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-[13px] font-bold text-slate-900">Stats</Label>
          <Button variant="ghost" size="icon" onClick={addStat} className="h-7 w-7 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-3">
          {stats.map((stat: any, i: number) => (
            <div key={i} className="p-3 bg-slate-100 rounded-xl border border-transparent space-y-2 relative group">
              <button
                onClick={() => removeStat(i)}
                className="absolute -top-2 -right-2 p-1.5 bg-red text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity motion-reduce:transition-none z-10"
              >
                <Trash2 className="w-3 h-3" />
              </button>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  value={stat.value}
                  onChange={(e) => updateStat(i, 'value', Number(e.target.value))}
                  className="h-8 bg-white border-slate-200 rounded-xl text-xs text-slate-700 focus-visible:border-slate-300"
                  placeholder="Value"
                />
                <Input
                  value={stat.suffix || ''}
                  onChange={(e) => updateStat(i, 'suffix', e.target.value)}
                  className="h-8 bg-white border-slate-200 rounded-xl text-xs text-slate-700 focus-visible:border-slate-300"
                  placeholder="Suffix (e.g. +)"
                />
              </div>
              <Input
                value={stat.label}
                onChange={(e) => updateStat(i, 'label', e.target.value)}
                className="h-8 bg-white border-slate-200 rounded-xl text-xs text-slate-700 focus-visible:border-slate-300"
                placeholder="Label"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mb-7 last:mb-0 pt-4 border-t border-slate-200 space-y-4">
        <Label className="text-[13px] font-bold text-slate-900">Appearance</Label>
        <ColorPicker label="Number color" value={numberColor} onChange={(val) => setProp((p: any) => p.numberColor = val)} />
        <ColorPicker label="Suffix / accent color" value={accentColor} onChange={(val) => setProp((p: any) => p.accentColor = val)} />
        <ColorPicker label="Label color" value={labelColor} onChange={(val) => setProp((p: any) => p.labelColor = val)} />
        <ColorPicker label="Background" value={backgroundColor === 'transparent' ? '' : (backgroundColor || '')} onChange={(val) => setProp((p: any) => p.backgroundColor = val)} />
        <SliderWithInput label="Count-up duration (s)" value={duration} onChange={(val) => setProp((p: any) => p.duration = val)} min={0.5} max={5} step={0.5} numeric />
      </div>
    </div>
  );
};
