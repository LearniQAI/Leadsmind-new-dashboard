"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { Plus, Trash2, GripVertical, List, Palette, Navigation } from 'lucide-react';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { ColorPicker } from '../ColorPicker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Switch } from '../../ui/switch';

import { LinkSelector } from '../LinkSelector';
import { SliderWithInput } from '../inspector/primitives';
import { LogoUploadField } from './LogoUploadField';

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

  const reorderLinks = (result: DropResult) => {
    if (!result.destination) return;
    setProp((p: any) => {
      const [moved] = p.links.splice(result.source.index, 1);
      p.links.splice(result.destination!.index, 0, moved);
    });
  };

  return (
    <Tabs defaultValue="content" className="w-full">
      <TabsList className="grid w-full grid-cols-2 bg-slate-100 rounded-full p-1 mb-4 h-auto">
        <TabsTrigger value="content" className="text-[12px] font-medium gap-2 rounded-full text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm h-9">
          <Navigation size={14} /> Branding
        </TabsTrigger>
        <TabsTrigger value="style" className="text-[12px] font-medium gap-2 rounded-full text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm h-9">
          <Palette size={14} /> Styling
        </TabsTrigger>
      </TabsList>

      <TabsContent value="content" className="space-y-0">
        <div className="mb-7 p-4 bg-slate-100 rounded-2xl border border-transparent space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-[12px] font-medium text-slate-700">Global sync</Label>
              <p className="text-[11px] text-slate-500">Syncs this header across all pages</p>
            </div>
            <Switch
              checked={!!isGlobal}
              onCheckedChange={(val) => setProp((p: any) => p.isGlobal = val)}
            />
          </div>
        </div>

        <div className="mb-7 space-y-3">
          <Label className="text-[13px] font-bold text-slate-900">Header layout</Label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'side', label: 'Side' },
              { id: 'split', label: 'Split' },
              { id: 'stacked', label: 'Stacked' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setProp((p: any) => p.layoutType = item.id)}
                className={`p-2 text-[12px] font-medium rounded-xl border transition-all motion-reduce:transition-none ${layoutType === item.id ? 'bg-slate-900 text-white border-transparent' : 'bg-slate-100 border-transparent text-slate-600 hover:bg-slate-200'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-7 space-y-1.5">
          <Label className="text-[12px] font-medium text-slate-700">Navigation source</Label>
          <select
            value={navigationSource}
            onChange={(e) => setProp((p: any) => p.navigationSource = e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl h-9 text-[12px] px-3 outline-none text-slate-700 focus:border-slate-300"
          >
            <option value="none">Manual links</option>
            <option value="website">Auto (current website)</option>
          </select>
        </div>

        <div className="mb-7 space-y-4">
           <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-slate-700">Brand name</Label>
            <Input value={brandName} onChange={(e) => setProp((p: any) => p.brandName = e.target.value)} className="h-9 bg-white border-slate-200 rounded-xl text-slate-700 focus-visible:border-slate-300" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-slate-700">Logo</Label>
            <LogoUploadField value={logo} onChange={(url) => setProp((p: any) => p.logo = url)} />
          </div>
        </div>

        {navigationSource === 'none' && (
          <div className="mb-7 last:mb-0 pt-4 border-t border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-[13px] font-bold text-slate-900">Menu links</Label>
              <Button variant="ghost" size="icon" onClick={addLink} className="h-7 w-7 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <DragDropContext onDragEnd={reorderLinks}>
              <Droppable droppableId="navbar-links">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                    {links.map((link: any, i: number) => (
                      <Draggable key={i} draggableId={`navbar-link-${i}`} index={i}>
                        {(dragProvided, snapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            className={`flex flex-col gap-2 p-3 bg-slate-100 rounded-xl border relative group ${snapshot.isDragging ? 'border-slate-300 shadow-lg bg-white' : 'border-transparent'}`}
                          >
                            <button
                              onClick={() => removeLink(i)}
                              className="absolute -top-2 -right-2 p-1 bg-red text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity motion-reduce:transition-none z-10"
                            >
                              <Trash2 size={10} />
                            </button>
                            <div className="flex items-center gap-2">
                              <div {...dragProvided.dragHandleProps} className="text-slate-400 hover:text-slate-600 cursor-grab shrink-0">
                                <GripVertical size={14} />
                              </div>
                              <Input
                                value={link.label}
                                onChange={(e) => updateLink(i, 'label', e.target.value)}
                                className="h-8 bg-white border-slate-200 rounded-lg text-[12px] font-medium text-slate-700 focus-visible:border-slate-300"
                                placeholder="Label"
                              />
                            </div>
                            <LinkSelector
                              value={link.href}
                              onChange={(val) => updateLink(i, 'href', val)}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        )}
      </TabsContent>

      <TabsContent value="style" className="space-y-0">
         <div className="mb-7 space-y-4">
          <h4 className="text-[13px] font-bold text-slate-900">Global bar</h4>
          <div className="flex items-center justify-between">
            <Label className="text-[12px] font-medium text-slate-700">Sticky header</Label>
            <Switch checked={!!sticky} onCheckedChange={(val) => setProp((p: any) => p.sticky = val)} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-[12px] font-medium text-slate-700">Full width layout</Label>
            <Switch checked={!!fullWidth} onCheckedChange={(val) => setProp((p: any) => p.fullWidth = val)} />
          </div>
          <SliderWithInput label="Bar padding" value={padding} onChange={(val) => setProp((p: any) => p.padding = val)} min={8} max={48} step={4} numeric />
          <SliderWithInput label="Border bottom" value={borderBottomWidth} onChange={(val) => setProp((p: any) => p.borderBottomWidth = val)} min={0} max={10} numeric />
          <ColorPicker label="Background" value={backgroundColor} onChange={(val) => setProp((p: any) => p.backgroundColor = val)} />
          <ColorPicker label="Text color" value={textColor} onChange={(val) => setProp((p: any) => p.textColor = val)} />
          <ColorPicker label="Border color" value={borderBottomColor} onChange={(val) => setProp((p: any) => p.borderBottomColor = val)} />
        </div>

        <div className="mb-7 pt-4 border-t border-slate-200 space-y-4">
          <h4 className="text-[13px] font-bold text-slate-900">Menu typography</h4>
          <SliderWithInput label="Font size" value={fontSize} onChange={(val) => setProp((p: any) => p.fontSize = val)} min={8} max={24} numeric />
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-slate-700">Font weight</Label>
            <select
              value={fontWeight}
              onChange={(e) => setProp((p: any) => p.fontWeight = e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl h-9 text-[12px] outline-none text-slate-700 focus:border-slate-300"
            >
              <option value="400">Regular (400)</option>
              <option value="500">Medium (500)</option>
              <option value="700">Bold (700)</option>
              <option value="900">Black (900)</option>
            </select>
          </div>
          <ColorPicker label="Link hover color" value={linkHoverColor} onChange={(val) => setProp((p: any) => p.linkHoverColor = val)} />
        </div>

        <div className="mb-7 pt-4 border-t border-slate-200 space-y-4">
          <h4 className="text-[13px] font-bold text-slate-900">Mobile theme</h4>
          <ColorPicker label="Hamburger icon" value={hamburgerColor} onChange={(val) => setProp((p: any) => p.hamburgerColor = val)} />
          <ColorPicker label="Mobile overlay" value={mobileOverlayColor} onChange={(val) => setProp((p: any) => p.mobileOverlayColor = val)} />
        </div>

        <div className="mb-7 last:mb-0 pt-4 border-t border-slate-200 space-y-4">
          <h4 className="text-[13px] font-bold text-slate-900">Call to action</h4>
          <div className="flex items-center justify-between">
            <Label className="text-[12px] font-medium text-slate-700">Show button</Label>
            <Switch checked={!!showButton} onCheckedChange={(val) => setProp((p: any) => p.showButton = val)} />
          </div>
          {showButton && (
            <>
              <Input value={buttonText} onChange={(e) => setProp((p: any) => p.buttonText = e.target.value)} className="h-9 bg-white border-slate-200 rounded-xl text-slate-700 text-xs focus-visible:border-slate-300" />
              <ColorPicker label="Button BG" value={buttonBg} onChange={(val) => setProp((p: any) => p.buttonBg = val)} />
              <ColorPicker label="Button text" value={buttonTextColor} onChange={(val) => setProp((p: any) => p.buttonTextColor = val)} />
            </>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
};
