"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { LayoutGrid, Palette } from 'lucide-react';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { ColorPicker } from '../ColorPicker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Switch } from '../../ui/switch';
import { SliderWithInput } from '../inspector/primitives';

export const BlogFeedSettings = () => {
  const { actions: { setProp }, props } = useNode((node) => ({
    props: node.data.props,
  }));

  const {
    columns,
    postCount,
    backgroundColor,
    textColor,
    queryLogic,
    category,
    showFeaturedImage,
    showAuthor,
    showReadTime,
    paginationType
  } = props;

  return (
    <Tabs defaultValue="grid" className="w-full">
      <TabsList className="grid w-full grid-cols-2 bg-slate-100 rounded-full p-1 mb-4 h-auto">
        <TabsTrigger value="grid" className="text-[12px] font-medium gap-2 rounded-full text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm h-9">
          <LayoutGrid size={14} /> Layout
        </TabsTrigger>
        <TabsTrigger value="style" className="text-[12px] font-medium gap-2 rounded-full text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm h-9">
          <Palette size={14} /> Design
        </TabsTrigger>
      </TabsList>

      <TabsContent value="grid" className="space-y-0">
        <div className="mb-7 space-y-4">
          <SliderWithInput label="Grid columns" value={columns} onChange={(val) => setProp((p: any) => p.columns = val)} min={1} max={4} unit="" numeric />

          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-slate-700">Query logic</Label>
            <select
              value={queryLogic}
              onChange={(e) => setProp((p: any) => p.queryLogic = e.target.value as any)}
              className="w-full bg-white border border-slate-200 rounded-xl h-9 text-[12px] px-3 outline-none text-slate-700 focus:border-slate-300"
            >
              <option value="recent">Most recent</option>
              <option value="category">By category</option>
            </select>
          </div>

          {queryLogic === 'category' && (
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-slate-700">Filter category</Label>
              <Input value={category} onChange={(e) => setProp((p: any) => p.category = e.target.value)} placeholder="e.g. Technology" className="h-9 bg-white border-slate-200 rounded-xl text-slate-700 focus-visible:border-slate-300" />
            </div>
          )}

          <SliderWithInput label="Post count" value={postCount} onChange={(val) => setProp((p: any) => p.postCount = val)} min={3} max={12} step={3} unit="" numeric />
        </div>

        <div className="mb-7 pt-4 border-t border-slate-200 space-y-4">
          <h4 className="text-[13px] font-bold text-slate-900">Display components</h4>
          <div className="flex items-center justify-between">
            <Label className="text-[12px] font-medium text-slate-700">Featured image</Label>
            <Switch checked={showFeaturedImage} onCheckedChange={(val) => setProp((p: any) => p.showFeaturedImage = val)} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-[12px] font-medium text-slate-700">Author info</Label>
            <Switch checked={showAuthor} onCheckedChange={(val) => setProp((p: any) => p.showAuthor = val)} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-[12px] font-medium text-slate-700">Read time</Label>
            <Switch checked={showReadTime} onCheckedChange={(val) => setProp((p: any) => p.showReadTime = val)} />
          </div>
        </div>

        <div className="mb-7 last:mb-0 pt-4 border-t border-slate-200 space-y-1.5">
          <Label className="text-[12px] font-medium text-slate-700">Pagination style</Label>
          <select
            value={paginationType}
            onChange={(e) => setProp((p: any) => p.paginationType = e.target.value as any)}
            className="w-full bg-white border border-slate-200 rounded-xl h-9 text-[12px] px-3 outline-none text-slate-700 focus:border-slate-300"
          >
            <option value="none">No pagination</option>
            <option value="load_more">Load more button</option>
            <option value="numbers">Page numbers</option>
          </select>
        </div>
      </TabsContent>

      <TabsContent value="style" className="space-y-0">
        <div className="mb-7 space-y-4">
          <ColorPicker label="Background color" value={backgroundColor} onChange={(val) => setProp((p: any) => p.backgroundColor = val)} />
          <ColorPicker label="Text color" value={textColor} onChange={(val) => setProp((p: any) => p.textColor = val)} />
        </div>

        <div className="mb-7 last:mb-0 p-4 bg-slate-100 rounded-xl border border-transparent">
          <p className="text-[12px] text-slate-700 font-medium leading-relaxed">
            Tip: This feed pulls real-time data from your 'blog_posts' pages once correctly configured in settings.
          </p>
        </div>
      </TabsContent>
    </Tabs>
  );
};
