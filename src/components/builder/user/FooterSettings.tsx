"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Plus, Trash2, Layout, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ColorPicker } from '../ColorPicker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

export const FooterSettings = () => {
  const { actions: { setProp }, props } = useNode((node) => ({
    props: node.data.props,
  }));

  const {
    brandName,
    description,
    columns,
    backgroundColor,
    textColor,
    accentColor,
    padding,
    fullWidth,
    socialLinks,
    columnsCount,
    showSocial,
    borderTopWidth,
    borderTopColor,
    titleFontSize,
    linkFontSize,
    titleFontWeight,
    showNewsletter,
    newsletterTitle,
    newsletterDescription
  } = props;

  const addColumn = () => {
    setProp((p: any) => {
      p.columns.push({ title: 'New Column', links: [{ label: 'Link 1', href: '#' }] });
    });
  };

  const removeColumn = (index: number) => {
    setProp((p: any) => {
      p.columns.splice(index, 1);
    });
  };

  const addLink = (colIndex: number) => {
    setProp((p: any) => {
      p.columns[colIndex].links.push({ label: 'New Link', href: '#' });
    });
  };

  return (
    <Tabs defaultValue="content" className="w-full">
      <TabsList className="grid w-full grid-cols-2 bg-dash-surface p-1 mb-4">
        <TabsTrigger value="content" className="text-[10px] font-bold gap-2">
          <Layout size={12} /> Structure
        </TabsTrigger>
        <TabsTrigger value="style" className="text-[10px] font-bold gap-2">
          <Palette size={12} /> Style
        </TabsTrigger>
      </TabsList>

      <TabsContent value="content" className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-medium">Full width layout</Label>
            <Switch checked={!!fullWidth} onCheckedChange={(val) => setProp((p: any) => p.fullWidth = val)} />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-bold !text-dash-textMuted">Grid columns ({columnsCount})</Label>
            <input type="range" min="1" max="4" step="1" value={columnsCount} onChange={(e) => setProp((p: any) => p.columnsCount = Number(e.target.value))} className="w-full accent-primary" />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-medium">Show newsletter</Label>
            <Switch checked={!!showNewsletter} onCheckedChange={(val) => setProp((p: any) => p.showNewsletter = val)} />
          </div>
          {showNewsletter && (
            <div className="space-y-3 p-3 bg-primary/5 rounded-xl border border-primary/10">
              <div className="space-y-1">
                <Label className="text-[9px] font-bold !text-dash-textMuted">Form title</Label>
                <Input value={newsletterTitle} onChange={(e) => setProp((p: any) => p.newsletterTitle = e.target.value)} className="h-8 bg-white border-dash-border" />
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] font-bold !text-dash-textMuted">Description</Label>
                <textarea
                  value={newsletterDescription}
                  onChange={(e) => setProp((p: any) => p.newsletterDescription = e.target.value)}
                  className="w-full bg-white border border-dash-border rounded p-2 text-[10px] h-14 outline-none !text-dash-text"
                />
              </div>
            </div>
          )}
          <div className="space-y-1 pt-2">
            <Label className="text-[9px] font-bold !text-dash-textMuted">Brand name</Label>
            <Input value={brandName} onChange={(e) => setProp((p: any) => p.brandName = e.target.value)} className="h-8 bg-white border-dash-border" />
          </div>
          <div className="space-y-1">
            <Label className="text-[9px] font-bold !text-dash-textMuted">Tagline</Label>
            <textarea
              value={description}
              onChange={(e) => setProp((p: any) => p.description = e.target.value)}
              className="w-full bg-white border border-dash-border rounded p-2 text-xs h-20 outline-none !text-dash-text"
            />
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-dash-border">
          <div className="flex items-center justify-between">
             <h4 className="text-[10px] font-bold !text-dash-textMuted">Social presence</h4>
             <Switch checked={!!showSocial} onCheckedChange={(val) => setProp((p: any) => p.showSocial = val)} />
          </div>

          {showSocial && (
            <div className="space-y-3">
              {['twitter', 'linkedin', 'facebook', 'instagram'].map((platform) => {
                const link = socialLinks.find((s: any) => s.platform === platform);
                return (
                  <div key={platform} className="space-y-1">
                    <Label className="text-[9px] font-bold !text-dash-textMuted capitalize">{platform}</Label>
                    <Input
                      value={link?.url || ''}
                      onChange={(e) => {
                        const newLinks = [...socialLinks];
                        const idx = newLinks.findIndex((s: any) => s.platform === platform);
                        if (idx >= 0) newLinks[idx].url = e.target.value;
                        else newLinks.push({ platform: platform as any, url: e.target.value });
                        setProp((p: any) => p.socialLinks = newLinks);
                      }}
                      placeholder={`https://${platform}.com/...`}
                      className="h-8 bg-white border-dash-border"
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="space-y-4 pt-4 border-t border-dash-border">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold !text-dash-textMuted">Footer columns</Label>
            <Button variant="ghost" size="icon" onClick={addColumn} className="h-6 w-6">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-6">
            {columns.map((col: any, i: number) => (
              <div key={i} className="p-4 bg-dash-surface rounded-xl border border-dash-border space-y-4 relative group">
                <button
                  onClick={() => removeColumn(i)}
                  className="absolute -top-2 -right-2 p-1.5 bg-red text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity motion-reduce:transition-none"
                >
                  <Trash2 size={12} />
                </button>

                <div className="space-y-1">
                  <Label className="text-[9px] font-bold !text-dash-textMuted">Col title</Label>
                  <Input
                    value={col.title}
                    onChange={(e) => setProp((p: any) => p.columns[i].title = e.target.value)}
                    className="h-8 bg-white border-dash-border font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[9px] font-bold !text-dash-textMuted">Links</Label>
                    <button onClick={() => addLink(i)} className="text-[9px] text-primary hover:underline font-bold">+ Add</button>
                  </div>
                  {col.links.map((link: any, j: number) => (
                    <div key={j} className="flex gap-1">
                      <Input
                        value={link.label}
                        onChange={(e) => setProp((p: any) => p.columns[i].links[j].label = e.target.value)}
                        className="h-7 bg-white border-dash-border text-[10px]"
                      />
                      <Input
                        value={link.href}
                        onChange={(e) => setProp((p: any) => p.columns[i].links[j].href = e.target.value)}
                        className="h-7 bg-white border-dash-border text-[9px]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="style" className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold !text-dash-textMuted">Footer padding ({padding}px)</Label>
            <input type="range" min="40" max="160" step="8" value={padding} onChange={(e) => setProp((p: any) => p.padding = Number(e.target.value))} className="w-full accent-primary" />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-bold !text-dash-textMuted">Border top ({borderTopWidth}px)</Label>
            <input type="range" min="0" max="10" step="1" value={borderTopWidth} onChange={(e) => setProp((p: any) => p.borderTopWidth = Number(e.target.value))} className="w-full accent-primary" />
          </div>
          <ColorPicker label="Background" value={backgroundColor} onChange={(val) => setProp((p: any) => p.backgroundColor = val)} />
          <ColorPicker label="Text color" value={textColor} onChange={(val) => setProp((p: any) => p.textColor = val)} />
          <ColorPicker label="Accent color" value={accentColor} onChange={(val) => setProp((p: any) => p.accentColor = val)} />
          <ColorPicker label="Border color" value={borderTopColor} onChange={(val) => setProp((p: any) => p.borderTopColor = val)} />
        </div>

        <div className="space-y-4 pt-4 border-t border-dash-border">
          <h4 className="text-[10px] font-bold !text-dash-textMuted pb-2">Footer typography</h4>
          <div className="space-y-2">
            <Label className="text-[10px] font-bold !text-dash-textMuted">Title size ({titleFontSize}px)</Label>
            <input type="range" min="8" max="24" step="1" value={titleFontSize} onChange={(e) => setProp((p: any) => p.titleFontSize = Number(e.target.value))} className="w-full accent-primary" />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-bold !text-dash-textMuted">Link size ({linkFontSize}px)</Label>
            <input type="range" min="8" max="24" step="1" value={linkFontSize} onChange={(e) => setProp((p: any) => p.linkFontSize = Number(e.target.value))} className="w-full accent-primary" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold !text-dash-textMuted">Title weight</Label>
            <select
              value={titleFontWeight}
              onChange={(e) => setProp((p: any) => p.titleFontWeight = e.target.value)}
              className="w-full bg-white border border-dash-border rounded h-8 text-[10px] outline-none !text-dash-text focus:border-dash-accent"
            >
              <option value="400">Regular (400)</option>
              <option value="700">Bold (700)</option>
              <option value="900">Black (900)</option>
            </select>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
};
