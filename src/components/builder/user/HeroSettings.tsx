"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Layout, Maximize, Palette, Image as ImageIcon, AlignCenter, Columns2, Monitor } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ColorPicker } from '../ColorPicker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

import { useResponsiveSetProp } from '@/lib/builder/hooks';
import { useBuilder } from '../BuilderContext';

export const HeroSettings = () => {
  const { actions: { setProp }, props } = useNode((node) => ({
    props: node.data.props,
  }));
  const { viewMode } = useBuilder();
  const { setResponsiveValue } = useResponsiveSetProp();

  const {
    layout,
    minHeight,
    backgroundColor,
    backgroundImage,
    overlayOpacity,
    padding,
    gap,
    contentAlignment,
    contentMaxWidth,
    gradientOverlay,
    gradientColor1,
    gradientColor2,
    showScrollIndicator,
    useGlassmorphism,
    backgroundVideo,
    heightPreset,
    animation,
    showSecondaryButton
  } = props;

  // Helper to get current display value for a prop
  const getDisplayValue = (propName: string, baseValue: any) => {
    if (viewMode === 'mobile') return props[`${propName}_mobile`] ?? baseValue;
    if (viewMode === 'tablet') return props[`${propName}_tablet`] ?? baseValue;
    return baseValue;
  };

  return (
    <Tabs defaultValue="layout" className="w-full">
      <TabsList className="grid w-full grid-cols-2 bg-dash-surface p-1 mb-4">
        <TabsTrigger value="layout" className="text-[10px] font-bold gap-2">
          <Layout size={12} /> Structure
        </TabsTrigger>
        <TabsTrigger value="design" className="text-[10px] font-bold gap-2">
          <Palette size={12} /> Design
        </TabsTrigger>
      </TabsList>

      <TabsContent value="layout" className="space-y-6">
        <div className="space-y-3">
          <Label className="text-xs font-bold !text-dash-textMuted">Hero layout</Label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'split', icon: Columns2, label: 'Split' },
              { id: 'centered', icon: AlignCenter, label: 'Center' },
              { id: 'background', icon: Monitor, label: 'BG image' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setProp((p: any) => p.layout = item.id)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all motion-reduce:transition-none ${layout === item.id ? 'bg-primary/10 border-primary text-primary' : 'bg-dash-surface border-dash-border !text-dash-textMuted hover:bg-dash-border/60'}`}
              >
                <item.icon size={18} />
                <span className="text-[9px] font-bold">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Label className="text-[10px] font-bold !text-dash-textMuted">Content alignment</Label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'start', label: 'Top' },
              { id: 'center', label: 'Middle' },
              { id: 'end', label: 'Bottom' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setProp((p: any) => p.contentAlignment = item.id)}
                className={`p-2 text-[10px] font-bold rounded-lg border transition-all motion-reduce:transition-none ${contentAlignment === item.id ? 'bg-primary text-white border-transparent' : 'bg-dash-surface border-dash-border hover:bg-dash-border/60'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Label className="text-[10px] font-bold !text-dash-textMuted">Hero height</Label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'full', label: 'Full' },
              { id: 'large', label: 'Large' },
              { id: 'compact', label: 'Small' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setProp((p: any) => p.heightPreset = item.id)}
                className={`p-2 text-[10px] font-bold rounded-lg border transition-all motion-reduce:transition-none ${heightPreset === item.id ? 'bg-primary text-white border-transparent' : 'bg-dash-surface border-dash-border hover:bg-dash-border/60'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <Label className="text-[10px] font-bold !text-dash-textMuted">Entrance animation</Label>
          <select
            value={animation}
            onChange={(e) => setProp((p: any) => p.animation = e.target.value)}
            className="w-full bg-white border border-dash-border rounded h-9 text-[11px] px-2 outline-none !text-dash-text focus:border-dash-accent"
          >
            <option value="none">None</option>
            <option value="fade-in">Fade in</option>
            <option value="slide-up">Slide up</option>
          </select>
        </div>

        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-medium">Show scroll arrow</Label>
            <Switch checked={showScrollIndicator} onCheckedChange={(val) => setProp((p: any) => p.showScrollIndicator = val)} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-medium">Secondary button</Label>
            <Switch checked={showSecondaryButton} onCheckedChange={(val) => setProp((p: any) => p.showSecondaryButton = val)} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-medium">Use glassmorphism</Label>
            <Switch checked={useGlassmorphism} onCheckedChange={(val) => setProp((p: any) => p.useGlassmorphism = val)} />
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
             <Label className="text-[10px] font-bold !text-dash-textMuted flex justify-between">
              <span>Content max width</span>
              <span className="text-primary">{getDisplayValue('contentMaxWidth', contentMaxWidth)}px</span>
             </Label>
             <input
              type="range" min="400" max="1400" step="50"
              value={getDisplayValue('contentMaxWidth', contentMaxWidth)}
              onChange={(e) => setResponsiveValue('contentMaxWidth', Number(e.target.value))}
              className="w-full accent-primary"
             />
          </div>
          <div className="space-y-2">
             <Label className="text-[10px] font-bold !text-dash-textMuted flex justify-between">
              <span>Section padding</span>
              <span className="text-primary">{getDisplayValue('padding', padding)}px</span>
             </Label>
             <input
              type="range" min="20" max="200" step="10"
              value={getDisplayValue('padding', padding)}
              onChange={(e) => setResponsiveValue('padding', Number(e.target.value))}
              className="w-full accent-primary"
             />
          </div>
          <div className="space-y-2">
             <Label className="text-[10px] font-bold !text-dash-textMuted flex justify-between">
              <span>Inner gap</span>
              <span className="text-primary">{getDisplayValue('gap', gap)}px</span>
             </Label>
             <input
              type="range" min="0" max="100" step="8"
              value={getDisplayValue('gap', gap)}
              onChange={(e) => setResponsiveValue('gap', Number(e.target.value))}
              className="w-full accent-primary"
             />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="design" className="space-y-6">
        <div className="space-y-4">
          <h4 className="text-[10px] font-bold !text-dash-textMuted border-b border-dash-border pb-2">Background</h4>
          <ColorPicker label="Background color" value={backgroundColor} onChange={(val) => setProp((p: any) => p.backgroundColor = val)} />
          <div className="space-y-2 pt-2">
            <Label className="text-[10px] font-bold !text-dash-textMuted">Video background URL</Label>
            <Input
              value={backgroundVideo}
              onChange={(e) => setProp((p: any) => p.backgroundVideo = e.target.value)}
              className="h-9 bg-white border-dash-border text-xs"
              placeholder="https://...mp4"
            />
          </div>
          <div className="space-y-2 pt-2">
             <Label className="text-[10px] font-bold !text-dash-textMuted">Image / media URL</Label>
            <Input
              value={backgroundImage}
              onChange={(e) => setProp((p: any) => p.backgroundImage = e.target.value)}
              className="h-9 bg-white border-dash-border text-xs"
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2 pt-2">
            <Label className="text-[10px] font-bold !text-dash-textMuted">Overlay strategy</Label>
            <div className="flex items-center justify-between p-3 bg-dash-surface rounded-xl">
              <Label className="text-[11px]">Use gradient</Label>
              <Switch checked={gradientOverlay} onCheckedChange={(val) => setProp((p: any) => p.gradientOverlay = val)} />
            </div>
          </div>

          {gradientOverlay ? (
            <div className="space-y-4 p-4 bg-dash-surface rounded-xl border border-dash-border">
              <ColorPicker label="Gradient top" value={gradientColor1} onChange={(val) => setProp((p: any) => p.gradientColor1 = val)} />
              <ColorPicker label="Gradient bottom" value={gradientColor2} onChange={(val) => setProp((p: any) => p.gradientColor2 = val)} />
            </div>
          ) : (
            layout === 'background' && (
              <div className="space-y-2 pt-2">
                <Label className="text-[10px] font-bold !text-dash-textMuted">Overlay opacity ({overlayOpacity}%)</Label>
                <input type="range" min="0" max="90" step="5" value={overlayOpacity} onChange={(e) => setProp((p: any) => p.overlayOpacity = Number(e.target.value))} className="w-full accent-primary" />
              </div>
            )
          )}
        </div>

        <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
          <p className="text-[10px] text-primary font-medium leading-relaxed">
            Tip: Drop Text and Buttons into the canvas area of the Hero to build your specific conversion story.
          </p>
        </div>
      </TabsContent>
    </Tabs>
  );
};
