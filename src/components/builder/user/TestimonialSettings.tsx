"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { AlignLeft, AlignCenter, User, Palette, Quote } from 'lucide-react';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { ColorPicker } from '../ColorPicker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { SliderWithInput } from '../inspector/primitives';

export const TestimonialSettings = () => {
  const { actions: { setProp }, props } = useNode((node) => ({
    props: node.data.props,
  }));

  const { 
    quote, 
    author, 
    title, 
    image, 
    backgroundColor, 
    textColor, 
    accentColor, 
    borderRadius, 
    padding,
    textAlign,
    borderOpacity
  } = props;

  return (
    <Tabs defaultValue="content" className="w-full">
      <TabsList className="grid w-full grid-cols-2 bg-slate-100 rounded-full p-1 mb-4 h-auto">
        <TabsTrigger value="content" className="text-[12px] font-medium gap-2 rounded-full text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm h-9">
          <User size={14} /> Content
        </TabsTrigger>
        <TabsTrigger value="style" className="text-[12px] font-medium gap-2 rounded-full text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm h-9">
          <Palette size={14} /> Style
        </TabsTrigger>
      </TabsList>

      <TabsContent value="content" className="space-y-0">
        <div className="mb-7 space-y-1.5">
          <Label className="text-[12px] font-medium text-slate-700">Avatar image URL</Label>
          <Input
            value={image}
            onChange={(e) => setProp((p: any) => p.image = e.target.value)}
            className="h-9 bg-white border-slate-200 rounded-xl text-slate-700 text-xs focus-visible:border-slate-300"
          />
        </div>

        <div className="mb-7 last:mb-0 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-slate-700">Author name</Label>
            <Input value={author} onChange={(e) => setProp((p: any) => p.author = e.target.value)} className="h-8 bg-white border-slate-200 rounded-lg text-slate-700 focus-visible:border-slate-300" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-slate-700">Title / company</Label>
            <Input value={title} onChange={(e) => setProp((p: any) => p.title = e.target.value)} className="h-8 bg-white border-slate-200 rounded-lg text-slate-700 focus-visible:border-slate-300" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-slate-700">Testimonial quote</Label>
            <textarea
              value={quote}
              onChange={(e) => setProp((p: any) => p.quote = e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-700 h-32 outline-none focus:border-slate-300"
            />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="style" className="space-y-0">
        <div className="mb-7 space-y-4">
          <h4 className="text-[13px] font-bold text-slate-900">Layout</h4>
          <div className="flex bg-slate-100 p-1 rounded-full border border-transparent">
            {[
              { id: 'left', icon: AlignLeft },
              { id: 'center', icon: AlignCenter },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setProp((p: any) => p.textAlign = item.id)}
                className={`flex-1 flex justify-center py-1.5 rounded-full transition-all motion-reduce:transition-none ${textAlign === item.id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <item.icon size={16} />
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <SliderWithInput label="Radius" value={borderRadius} onChange={(val) => setProp((p: any) => p.borderRadius = val)} min={0} max={100} step={4} numeric />
            <SliderWithInput label="Padding" value={padding} onChange={(val) => setProp((p: any) => p.padding = val)} min={16} max={128} step={8} numeric />
          </div>
        </div>

        <div className="mb-7 last:mb-0 pt-4 border-t border-slate-200 space-y-4">
          <h4 className="text-[13px] font-bold text-slate-900">Colors</h4>
          <ColorPicker label="Background" value={backgroundColor} onChange={(val) => setProp((p: any) => p.backgroundColor = val)} />
          <ColorPicker label="Text color" value={textColor} onChange={(val) => setProp((p: any) => p.textColor = val)} />
          <ColorPicker label="Accent color" value={accentColor} onChange={(val) => setProp((p: any) => p.accentColor = val)} />
        </div>
      </TabsContent>
    </Tabs>
  );
};
