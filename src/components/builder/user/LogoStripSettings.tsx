"use client"; // FB-FORCE-REFRESH


import React from 'react';
import { useNode } from '@craftjs/core';
import { Plus, Trash2, Image as ImageIcon, Settings2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { ColorPicker } from '../ColorPicker';
import { Switch } from '../../ui/switch';
import { SliderWithInput } from '../inspector/primitives';

export const LogoStripSettings = () => {
  const { actions: { setProp }, props } = useNode((node) => ({
    props: node.data.props,
  }));

  const { logos, backgroundColor, grayscale, opacity, gap, height, padding } = props;

  const addLogo = () => {
    setProp((p: any) => {
      p.logos.push({ src: 'https://via.placeholder.com/150x50', alt: 'Brand' });
    });
  };

  const removeLogo = (index: number) => {
    setProp((p: any) => {
      p.logos.splice(index, 1);
    });
  };

  const updateLogo = (index: number, val: string) => {
    setProp((p: any) => {
      p.logos[index].src = val;
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold !text-dash-textMuted">Logos</Label>
          <Button variant="ghost" size="icon" onClick={addLogo} className="h-6 w-6">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-3">
          {logos.map((logo: any, i: number) => (
            <div key={i} className="flex items-center gap-2">
               <Input
                value={logo.src}
                onChange={(e) => updateLogo(i, e.target.value)}
                className="h-8 bg-white border-dash-border text-[10px]"
                placeholder="Logo URL"
              />
               <Button
                variant="ghost"
                size="icon"
                onClick={() => removeLogo(i)}
                className="h-8 w-8 text-red hover:bg-red/10"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 pt-2">
        <Label className="text-xs font-bold !text-dash-textMuted">Appearance</Label>
        <ColorPicker label="Background" value={backgroundColor} onChange={(val) => setProp((p: any) => p.backgroundColor = val)} />
        <div className="flex items-center justify-between">
          <Label className="text-[11px] font-medium !text-dash-text">Grayscale filter</Label>
          <Switch checked={grayscale} onCheckedChange={(val) => setProp((p: any) => p.grayscale = val)} />
        </div>
        <SliderWithInput label="Opacity" value={opacity} onChange={(val) => setProp((p: any) => p.opacity = val)} min={10} max={100} step={5} unit="%" numeric />
        <SliderWithInput label="Logo height" value={height} onChange={(val) => setProp((p: any) => p.height = val)} min={16} max={100} step={4} numeric />
        <SliderWithInput label="Gap between" value={gap} onChange={(val) => setProp((p: any) => p.gap = val)} min={16} max={128} step={8} numeric />
      </div>
    </div>
  );
};
