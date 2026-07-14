"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Plus, Trash2, List, Palette, Navigation } from 'lucide-react';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { ColorPicker } from '../ColorPicker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Switch } from '../../ui/switch';

import { LinkSelector } from '../LinkSelector';

export const NavbarSettings = () => {
  const { actions: { setProp }, props } = useNode((node) => ({
    props: node.data.props,
  }));

  const {
    logo,
    brandName,
    links,
    backgroundColor,
    textColor,
    sticky,
    padding,
    showButton,
    buttonText,
    buttonBg,
    buttonTextColor,
    fullWidth,
    borderBottomWidth,
    borderBottomColor,
    linkHoverColor,
    fontSize,
    fontWeight,
    layoutType,
    navigationSource,
    mobileOverlayColor,
    hamburgerColor,
    isGlobal,
    globalId
  } = props;



  const addLink = () => {
    setProp((p: any) => {
      p.links.push({ label: 'New Link', href: { type: 'url', value: '#' } });
    });
  };

  const removeLink = (index: number) => {
    setProp((p: any) => {
      p.links.splice(index, 1);
    });
  };

  const updateLink = (index: number, key: string, val: any) => {
    setProp((p: any) => {
      p.links[index][key] = val;
    });
  };

  return (
    <Tabs defaultValue="content" className="w-full">
      <TabsList className="grid w-full grid-cols-2 bg-dash-surface p-1 mb-4">
        <TabsTrigger value="content" className="text-[10px] font-bold gap-2">
          <Navigation size={12} /> Branding
        </TabsTrigger>
        <TabsTrigger value="style" className="text-[10px] font-bold gap-2">
          <Palette size={12} /> Styling
        </TabsTrigger>
      </TabsList>

      <TabsContent value="content" className="space-y-6">
        <div className="p-4 bg-primary/10 rounded-xl border border-primary/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-[11px] font-bold">Global sync</Label>
              <p className="text-[9px] !text-dash-textMuted">Syncs this header across all pages</p>
            </div>
            <Switch
              checked={!!isGlobal}
              onCheckedChange={(val) => setProp((p: any) => p.isGlobal = val)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <Label className="text-[10px] font-bold !text-dash-textMuted">Header layout</Label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'side', label: 'Side' },
              { id: 'split', label: 'Split' },
              { id: 'stacked', label: 'Stacked' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setProp((p: any) => p.layoutType = item.id)}
                className={`p-2 text-[10px] font-bold rounded-lg border transition-all motion-reduce:transition-none ${layoutType === item.id ? 'bg-primary text-white border-transparent' : 'bg-dash-surface border-dash-border hover:bg-dash-border/60'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-bold !text-dash-textMuted">Navigation source</Label>
          <select
            value={navigationSource}
            onChange={(e) => setProp((p: any) => p.navigationSource = e.target.value)}
            className="w-full bg-white border border-dash-border rounded h-9 text-[11px] px-2 outline-none !text-dash-text focus:border-dash-accent"
          >
            <option value="none">Manual links</option>
            <option value="website">Auto (current website)</option>
          </select>
        </div>

        <div className="space-y-4">
           <div className="space-y-1">
            <Label className="text-[9px] font-bold !text-dash-textMuted">Brand name</Label>
            <Input value={brandName} onChange={(e) => setProp((p: any) => p.brandName = e.target.value)} className="h-8 bg-white border-dash-border" />
          </div>
          <div className="space-y-1">
            <Label className="text-[9px] font-bold !text-dash-textMuted">Logo URL</Label>
            <Input value={logo} onChange={(e) => setProp((p: any) => p.logo = e.target.value)} className="h-8 bg-white border-dash-border" />
          </div>
        </div>

        {navigationSource === 'none' && (
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between border-t border-dash-border pt-4">
              <Label className="text-xs font-bold !text-dash-textMuted">Menu links</Label>
              <Button variant="ghost" size="icon" onClick={addLink} className="h-6 w-6">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-3">
              {links.map((link: any, i: number) => (
                <div key={i} className="flex flex-col gap-2 p-3 bg-dash-surface rounded-xl border border-dash-border relative group">
                  <button
                    onClick={() => removeLink(i)}
                    className="absolute -top-2 -right-2 p-1 bg-red text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity motion-reduce:transition-none z-10"
                  >
                    <Trash2 size={10} />
                  </button>
                  <Input
                    value={link.label}
                    onChange={(e) => updateLink(i, 'label', e.target.value)}
                    className="h-7 bg-white border-dash-border text-[10px] font-bold"
                    placeholder="Label"
                  />
                  <LinkSelector
                    value={link.href}
                    onChange={(val) => updateLink(i, 'href', val)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </TabsContent>

      <TabsContent value="style" className="space-y-6">
         <div className="space-y-4">
          <h4 className="text-[10px] font-bold !text-dash-textMuted border-b border-dash-border pb-2">Global bar</h4>
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-medium">Sticky header</Label>
            <Switch checked={!!sticky} onCheckedChange={(val) => setProp((p: any) => p.sticky = val)} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-medium">Full width layout</Label>
            <Switch checked={!!fullWidth} onCheckedChange={(val) => setProp((p: any) => p.fullWidth = val)} />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-bold !text-dash-textMuted">Bar padding ({padding}px)</Label>
            <input type="range" min="8" max="48" step="4" value={padding} onChange={(e) => setProp((p: any) => p.padding = Number(e.target.value))} className="w-full accent-primary" />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-bold !text-dash-textMuted">Border bottom ({borderBottomWidth}px)</Label>
            <input type="range" min="0" max="10" step="1" value={borderBottomWidth} onChange={(e) => setProp((p: any) => p.borderBottomWidth = Number(e.target.value))} className="w-full accent-primary" />
          </div>
          <ColorPicker label="Background" value={backgroundColor} onChange={(val) => setProp((p: any) => p.backgroundColor = val)} />
          <ColorPicker label="Text color" value={textColor} onChange={(val) => setProp((p: any) => p.textColor = val)} />
          <ColorPicker label="Border color" value={borderBottomColor} onChange={(val) => setProp((p: any) => p.borderBottomColor = val)} />
        </div>

        <div className="space-y-4 pt-4">
          <h4 className="text-[10px] font-bold !text-dash-textMuted border-b border-dash-border pb-2">Menu typography</h4>
          <div className="space-y-2">
            <Label className="text-[10px] font-bold !text-dash-textMuted">Font size ({fontSize}px)</Label>
            <input type="range" min="8" max="24" step="1" value={fontSize} onChange={(e) => setProp((p: any) => p.fontSize = Number(e.target.value))} className="w-full accent-primary" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold !text-dash-textMuted">Font weight</Label>
            <select
              value={fontWeight}
              onChange={(e) => setProp((p: any) => p.fontWeight = e.target.value)}
              className="w-full bg-white border border-dash-border rounded h-8 text-[10px] outline-none !text-dash-text focus:border-dash-accent"
            >
              <option value="400">Regular (400)</option>
              <option value="500">Medium (500)</option>
              <option value="700">Bold (700)</option>
              <option value="900">Black (900)</option>
            </select>
          </div>
          <ColorPicker label="Link hover color" value={linkHoverColor} onChange={(val) => setProp((p: any) => p.linkHoverColor = val)} />
        </div>

        <div className="space-y-4 pt-4 border-t border-dash-border">
          <h4 className="text-[10px] font-bold !text-dash-textMuted pb-2">Mobile theme</h4>
          <ColorPicker label="Hamburger icon" value={hamburgerColor} onChange={(val) => setProp((p: any) => p.hamburgerColor = val)} />
          <ColorPicker label="Mobile overlay" value={mobileOverlayColor} onChange={(val) => setProp((p: any) => p.mobileOverlayColor = val)} />
        </div>

        <div className="space-y-4 pt-4">
          <h4 className="text-[10px] font-bold !text-dash-textMuted border-b border-dash-border pb-2">Call to action</h4>
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-medium">Show button</Label>
            <Switch checked={!!showButton} onCheckedChange={(val) => setProp((p: any) => p.showButton = val)} />
          </div>
          {showButton && (
            <>
              <Input value={buttonText} onChange={(e) => setProp((p: any) => p.buttonText = e.target.value)} className="h-8 bg-white border-dash-border text-xs" />
              <ColorPicker label="Button BG" value={buttonBg} onChange={(val) => setProp((p: any) => p.buttonBg = val)} />
              <ColorPicker label="Button text" value={buttonTextColor} onChange={(val) => setProp((p: any) => p.buttonTextColor = val)} />
            </>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
};
