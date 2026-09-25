"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Layout, Palette, AlignCenter, Columns2, Monitor } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ColorPicker } from '../ColorPicker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { SliderWithInput } from '../inspector/primitives';
import { LinkSelector } from '../LinkSelector';

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
      <TabsList className="grid w-full grid-cols-2 bg-slate-100 rounded-full p-1 mb-4 h-auto">
        <TabsTrigger value="layout" className="text-[12px] font-medium gap-2 rounded-full text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm h-9">
          <Layout size={14} /> Structure
        </TabsTrigger>
        <TabsTrigger value="design" className="text-[12px] font-medium gap-2 rounded-full text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm h-9">
          <Palette size={14} /> Design
        </TabsTrigger>
      </TabsList>

      <TabsContent value="layout" className="space-y-0">
        <div className="mb-7 space-y-2">
          <Label className="text-[12px] font-medium text-slate-700">Hero layout</Label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'split', icon: Columns2, label: 'Split' },
              { id: 'centered', icon: AlignCenter, label: 'Center' },
              { id: 'background', icon: Monitor, label: 'BG image' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setProp((p: any) => p.layout = item.id)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all motion-reduce:transition-none ${layout === item.id ? 'bg-slate-900 text-white border-transparent' : 'bg-slate-100 border-transparent text-slate-600 hover:bg-slate-200'}`}
              >
                <item.icon size={18} />
                <span className="text-[11px] font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-7 space-y-2">
          <Label className="text-[12px] font-medium text-slate-700">Content alignment</Label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'start', label: 'Top' },
              { id: 'center', label: 'Middle' },
              { id: 'end', label: 'Bottom' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setProp((p: any) => p.contentAlignment = item.id)}
                className={`p-2 text-[12px] font-medium rounded-xl border transition-all motion-reduce:transition-none ${contentAlignment === item.id ? 'bg-slate-900 text-white border-transparent' : 'bg-slate-100 border-transparent text-slate-600 hover:bg-slate-200'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-7 space-y-2">
          <Label className="text-[12px] font-medium text-slate-700">Hero height</Label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'full', label: 'Full' },
              { id: 'large', label: 'Large' },
              { id: 'compact', label: 'Small' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setProp((p: any) => p.heightPreset = item.id)}
                className={`p-2 text-[12px] font-medium rounded-xl border transition-all motion-reduce:transition-none ${heightPreset === item.id ? 'bg-slate-900 text-white border-transparent' : 'bg-slate-100 border-transparent text-slate-600 hover:bg-slate-200'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-7 space-y-1.5">
          <Label className="text-[12px] font-medium text-slate-700">Entrance animation</Label>
          <select
            value={animation}
            onChange={(e) => setProp((p: any) => p.animation = e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl h-9 text-[12px] px-3 outline-none text-slate-700 focus:border-slate-300"
          >
            <option value="none">None</option>
            <option value="fade-in">Fade in</option>
            <option value="slide-up">Slide up</option>
          </select>
        </div>

        <div className="mb-7 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-[12px] font-medium text-slate-700">Show scroll arrow</Label>
            <Switch checked={showScrollIndicator} onCheckedChange={(val) => setProp((p: any) => p.showScrollIndicator = val)} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-[12px] font-medium text-slate-700">Secondary button</Label>
            <Switch checked={showSecondaryButton} onCheckedChange={(val) => setProp((p: any) => p.showSecondaryButton = val)} />
          </div>
          {showSecondaryButton && <SecondaryButtonFields props={props} setProp={setProp} />}
          <div className="flex items-center justify-between">
            <Label className="text-[12px] font-medium text-slate-700">Use glassmorphism</Label>
            <Switch checked={useGlassmorphism} onCheckedChange={(val) => setProp((p: any) => p.useGlassmorphism = val)} />
          </div>
        </div>

        <div className="mb-7 last:mb-0 space-y-4">
          <SliderWithInput
            label="Content max width"
            value={getDisplayValue('contentMaxWidth', contentMaxWidth)}
            onChange={(val) => setResponsiveValue('contentMaxWidth', val)}
            min={400}
            max={1400}
            step={50}
            numeric
          />
          <SliderWithInput
            label="Section padding"
            value={getDisplayValue('padding', padding)}
            onChange={(val) => setResponsiveValue('padding', val)}
            min={20}
            max={200}
            step={10}
            numeric
          />
          <SliderWithInput
            label="Inner gap"
            value={getDisplayValue('gap', gap)}
            onChange={(val) => setResponsiveValue('gap', val)}
            min={0}
            max={100}
            step={8}
            numeric
          />
        </div>
      </TabsContent>

      <TabsContent value="design" className="space-y-0">
        <div className="mb-7 space-y-4">
          <h4 className="text-[13px] font-bold text-slate-900">Background</h4>
          <ColorPicker label="Background color" value={backgroundColor} onChange={(val) => setProp((p: any) => p.backgroundColor = val)} />
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-slate-700">Video background URL</Label>
            <Input
              value={backgroundVideo}
              onChange={(e) => setProp((p: any) => p.backgroundVideo = e.target.value)}
              className="h-9 bg-white border-slate-200 rounded-xl text-slate-700 text-xs focus-visible:border-slate-300"
              placeholder="https://...mp4"
            />
          </div>
          <div className="space-y-1.5">
             <Label className="text-[12px] font-medium text-slate-700">Image / media URL</Label>
            <Input
              value={backgroundImage}
              onChange={(e) => setProp((p: any) => p.backgroundImage = e.target.value)}
              className="h-9 bg-white border-slate-200 rounded-xl text-slate-700 text-xs focus-visible:border-slate-300"
              placeholder="https://..."
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-slate-700">Overlay strategy</Label>
            <div className="flex items-center justify-between p-3 bg-slate-100 rounded-xl border border-transparent">
              <Label className="text-[12px] font-medium text-slate-700">Use gradient</Label>
              <Switch checked={gradientOverlay} onCheckedChange={(val) => setProp((p: any) => p.gradientOverlay = val)} />
            </div>
          </div>

          {gradientOverlay ? (
            <div className="space-y-4 p-4 bg-slate-100 rounded-xl border border-transparent">
              <ColorPicker label="Gradient top" value={gradientColor1} onChange={(val) => setProp((p: any) => p.gradientColor1 = val)} />
              <ColorPicker label="Gradient bottom" value={gradientColor2} onChange={(val) => setProp((p: any) => p.gradientColor2 = val)} />
            </div>
          ) : (
            layout === 'background' && (
              <SliderWithInput label="Overlay opacity" value={overlayOpacity} onChange={(val) => setProp((p: any) => p.overlayOpacity = val)} min={0} max={90} step={5} unit="%" numeric />
            )
          )}
        </div>

        <div className="mb-7 last:mb-0 p-4 bg-primary/5 rounded-xl border border-primary/10">
          <p className="text-[11px] text-primary font-medium leading-relaxed">
            Tip: Drop Text and Buttons into the canvas area of the Hero to build your specific conversion story.
          </p>
        </div>
      </TabsContent>
    </Tabs>
  );
};

// The Hero's secondary button: the same options as a Button block (text, link, style, colours,
// corners, size), plus where it sits under the Hero's content.
const SEG = (active: boolean) =>
  `py-1.5 rounded-xl text-[11px] font-medium capitalize border transition-all motion-reduce:transition-none ${active ? 'bg-slate-900 text-white border-transparent' : 'bg-slate-100 border-transparent text-slate-600 hover:bg-slate-200'}`;

function SecondaryButtonFields({ props, setProp }: { props: any; setProp: (cb: (p: any) => void) => void }) {
  const set = (key: string) => (val: any) => setProp((p: any) => { p[key] = val; });
  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-3" data-testid="hero-secondary-button-fields">
      <div className="space-y-1.5">
        <Label className="text-[12px] font-medium text-slate-700 block">Button text</Label>
        <Input value={props.secondaryButtonText ?? ''} onChange={(e) => set('secondaryButtonText')(e.target.value)} className="h-9 text-xs bg-white" placeholder="Learn more" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[12px] font-medium text-slate-700 block">Link destination</Label>
        <LinkSelector value={props.secondaryButtonLink} onChange={set('secondaryButtonLink')} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[12px] font-medium text-slate-700 block">Style</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {['primary', 'outline', 'ghost'].map((v) => (
            <button key={v} type="button" className={SEG((props.secondaryButtonVariant ?? 'outline') === v)} onClick={() => set('secondaryButtonVariant')(v)}>{v === 'primary' ? 'solid' : v}</button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-[12px] font-medium text-slate-700 block">Size</Label>
        <div className="grid grid-cols-4 gap-1.5">
          {['sm', 'md', 'lg', 'xl'].map((v) => (
            <button key={v} type="button" className={SEG((props.secondaryButtonSize ?? 'md') === v)} onClick={() => set('secondaryButtonSize')(v)}>{v}</button>
          ))}
        </div>
      </div>
      <ColorPicker label="Button colour (fill, or border for outline)" value={props.secondaryButtonColor} onChange={set('secondaryButtonColor')} />
      <ColorPicker label="Text colour" value={props.secondaryButtonTextColor} onChange={set('secondaryButtonTextColor')} />
      <SliderWithInput label="Corner radius" value={props.secondaryButtonRadius ?? 12} onChange={set('secondaryButtonRadius')} min={0} max={50} numeric />
      <div className="space-y-1.5">
        <Label className="text-[12px] font-medium text-slate-700 block">Position</Label>
        <div className="grid grid-cols-4 gap-1.5">
          {['auto', 'left', 'center', 'right'].map((v) => (
            <button key={v} type="button" className={SEG((props.secondaryButtonAlign ?? 'auto') === v)} onClick={() => set('secondaryButtonAlign')(v)}>{v}</button>
          ))}
        </div>
        <p className="text-[10px] text-slate-500">Auto follows the Hero layout: left for split, centred otherwise. Full width on phones.</p>
      </div>
    </div>
  );
}
