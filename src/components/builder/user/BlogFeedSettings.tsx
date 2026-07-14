"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { LayoutGrid, Palette } from 'lucide-react';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { ColorPicker } from '../ColorPicker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Switch } from '../../ui/switch';

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
      <TabsList className="grid w-full grid-cols-2 bg-dash-surface p-1 mb-4">
        <TabsTrigger value="grid" className="text-[10px] font-bold gap-2">
          <LayoutGrid size={12} /> Layout
        </TabsTrigger>
        <TabsTrigger value="style" className="text-[10px] font-bold gap-2">
          <Palette size={12} /> Design
        </TabsTrigger>
      </TabsList>

      <TabsContent value="grid" className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold !text-dash-textMuted">Grid columns ({columns})</Label>
            <input type="range" min="1" max="4" step="1" value={columns} onChange={(e) => setProp((p: any) => p.columns = Number(e.target.value))} className="w-full accent-primary" />
          </div>
        </div>

        <div className="space-y-4">
          <Label className="text-[10px] font-bold !text-dash-textMuted">Query logic</Label>
          <select
            value={queryLogic}
            onChange={(e) => setProp((p: any) => p.queryLogic = e.target.value as any)}
            className="w-full bg-white border border-dash-border rounded h-9 text-[11px] px-2 outline-none !text-dash-text focus:border-dash-accent"
          >
            <option value="recent">Most recent</option>
            <option value="category">By category</option>
          </select>
        </div>

        {queryLogic === 'category' && (
          <div className="space-y-2">
            <Label className="text-[10px] font-bold !text-dash-textMuted">Filter category</Label>
            <Input value={category} onChange={(e) => setProp((p: any) => p.category = e.target.value)} placeholder="e.g. Technology" className="h-9 bg-white border-dash-border" />
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-[10px] font-bold !text-dash-textMuted">Post count ({postCount})</Label>
          <input type="range" min="3" max="12" step="3" value={postCount} onChange={(e) => setProp((p: any) => p.postCount = Number(e.target.value))} className="w-full accent-primary" />
        </div>

        <div className="space-y-4 pt-2 border-t border-dash-border">
          <h4 className="text-[10px] font-bold !text-dash-textMuted">Display components</h4>
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-medium !text-dash-textMuted">Featured image</Label>
            <Switch checked={showFeaturedImage} onCheckedChange={(val) => setProp((p: any) => p.showFeaturedImage = val)} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-medium !text-dash-textMuted">Author info</Label>
            <Switch checked={showAuthor} onCheckedChange={(val) => setProp((p: any) => p.showAuthor = val)} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-medium !text-dash-textMuted">Read time</Label>
            <Switch checked={showReadTime} onCheckedChange={(val) => setProp((p: any) => p.showReadTime = val)} />
          </div>
        </div>

        <div className="space-y-4 pt-2 border-t border-dash-border">
          <Label className="text-[10px] font-bold !text-dash-textMuted">Pagination style</Label>
          <select
            value={paginationType}
            onChange={(e) => setProp((p: any) => p.paginationType = e.target.value as any)}
            className="w-full bg-white border border-dash-border rounded h-9 text-[11px] px-2 outline-none !text-dash-text focus:border-dash-accent"
          >
            <option value="none">No pagination</option>
            <option value="load_more">Load more button</option>
            <option value="numbers">Page numbers</option>
          </select>
        </div>
      </TabsContent>

      <TabsContent value="style" className="space-y-6">
        <div className="space-y-4">
          <ColorPicker label="Background color" value={backgroundColor} onChange={(val) => setProp((p: any) => p.backgroundColor = val)} />
          <ColorPicker label="Text color" value={textColor} onChange={(val) => setProp((p: any) => p.textColor = val)} />
        </div>

        <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
          <p className="text-[10px] text-primary font-medium leading-relaxed">
            Tip: This feed pulls real-time data from your 'blog_posts' pages once correctly configured in settings.
          </p>
        </div>
      </TabsContent>
    </Tabs>
  );
};
