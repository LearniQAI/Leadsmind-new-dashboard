"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { Plus, Trash2, GripVertical, Layout, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ColorPicker } from '../ColorPicker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { SliderWithInput } from '../inspector/primitives';
import { LogoUploadField } from './LogoUploadField';

export const FooterSettings = () => {
  const { actions: { setProp }, props } = useNode((node) => ({
    props: node.data.props,
  }));

  const {
    logo,
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

  const removeLink = (colIndex: number, linkIndex: number) => {
    setProp((p: any) => {
      p.columns[colIndex].links.splice(linkIndex, 1);
    });
  };

  const reorderLinks = (colIndex: number, result: DropResult) => {
    if (!result.destination) return;
    setProp((p: any) => {
      const links = p.columns[colIndex].links;
      const [moved] = links.splice(result.source.index, 1);
      links.splice(result.destination!.index, 0, moved);
    });
  };

  return (
    <Tabs defaultValue="content" className="w-full">
      <TabsList className="grid w-full grid-cols-2 bg-slate-100 rounded-full p-1 mb-4 h-auto">
        <TabsTrigger value="content" className="text-[12px] font-medium gap-2 rounded-full text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm h-9">
          <Layout size={14} /> Structure
        </TabsTrigger>
        <TabsTrigger value="style" className="text-[12px] font-medium gap-2 rounded-full text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm h-9">
          <Palette size={14} /> Style
        </TabsTrigger>
      </TabsList>

      <TabsContent value="content" className="space-y-0">
        <div className="mb-7 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-[12px] font-medium text-slate-700">Full width layout</Label>
            <Switch checked={!!fullWidth} onCheckedChange={(val) => setProp((p: any) => p.fullWidth = val)} />
          </div>
          <SliderWithInput label="Grid columns" value={columnsCount} onChange={(val) => setProp((p: any) => p.columnsCount = val)} min={1} max={4} unit="" numeric />
          <div className="flex items-center justify-between">
            <Label className="text-[12px] font-medium text-slate-700">Show newsletter</Label>
            <Switch checked={!!showNewsletter} onCheckedChange={(val) => setProp((p: any) => p.showNewsletter = val)} />
          </div>
          {showNewsletter && (
            <div className="space-y-3 p-3 bg-slate-100 rounded-xl border border-transparent">
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium text-slate-700">Form title</Label>
                <Input value={newsletterTitle} onChange={(e) => setProp((p: any) => p.newsletterTitle = e.target.value)} className="h-9 bg-white border-slate-200 rounded-xl text-slate-700 focus-visible:border-slate-300" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium text-slate-700">Description</Label>
                <textarea
                  value={newsletterDescription}
                  onChange={(e) => setProp((p: any) => p.newsletterDescription = e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-[12px] h-14 outline-none text-slate-700 focus:border-slate-300"
                />
              </div>
            </div>
          )}
          <div className="space-y-1.5 pt-2">
            <Label className="text-[12px] font-medium text-slate-700">Logo</Label>
            <LogoUploadField value={logo} onChange={(url) => setProp((p: any) => p.logo = url)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-slate-700">Brand name</Label>
            <Input value={brandName} onChange={(e) => setProp((p: any) => p.brandName = e.target.value)} className="h-9 bg-white border-slate-200 rounded-xl text-slate-700 focus-visible:border-slate-300" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-slate-700">Tagline</Label>
            <textarea
              value={description}
              onChange={(e) => setProp((p: any) => p.description = e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-sm h-20 outline-none text-slate-700 focus:border-slate-300"
            />
          </div>
        </div>

        <div className="mb-7 pt-4 border-t border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
             <h4 className="text-[13px] font-bold text-slate-900">Social presence</h4>
             <Switch checked={!!showSocial} onCheckedChange={(val) => setProp((p: any) => p.showSocial = val)} />
          </div>

          {showSocial && (
            <div className="space-y-3">
              {['twitter', 'linkedin', 'facebook', 'instagram'].map((platform) => {
                const link = socialLinks.find((s: any) => s.platform === platform);
                return (
                  <div key={platform} className="space-y-1.5">
                    <Label className="text-[12px] font-medium text-slate-700 capitalize">{platform}</Label>
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
                      className="h-9 bg-white border-slate-200 rounded-xl text-slate-700 focus-visible:border-slate-300"
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="mb-7 last:mb-0 pt-4 border-t border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-[13px] font-bold text-slate-900">Footer columns</Label>
            <Button variant="ghost" size="icon" onClick={addColumn} className="h-7 w-7 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            {columns.map((col: any, i: number) => (
              <div key={i} className="p-4 bg-slate-100 rounded-xl border border-transparent space-y-4 relative group">
                <button
                  onClick={() => removeColumn(i)}
                  className="absolute -top-2 -right-2 p-1.5 bg-red text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity motion-reduce:transition-none"
                >
                  <Trash2 size={12} />
                </button>

                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-slate-700">Col title</Label>
                  <Input
                    value={col.title}
                    onChange={(e) => setProp((p: any) => p.columns[i].title = e.target.value)}
                    className="h-9 bg-white border-slate-200 rounded-xl text-slate-900 font-bold focus-visible:border-slate-300"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[12px] font-medium text-slate-700">Links</Label>
                    <button onClick={() => addLink(i)} className="text-[11px] text-slate-700 hover:text-slate-900 hover:underline font-bold">+ Add</button>
                  </div>
                  <DragDropContext onDragEnd={(result) => reorderLinks(i, result)}>
                    <Droppable droppableId={`footer-col-${i}-links`}>
                      {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-1.5">
                          {col.links.map((link: any, j: number) => (
                            <Draggable key={j} draggableId={`footer-col-${i}-link-${j}`} index={j}>
                              {(dragProvided, snapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  className={`flex items-center gap-1 ${snapshot.isDragging ? 'bg-white rounded-lg shadow-lg' : ''}`}
                                >
                                  <div {...dragProvided.dragHandleProps} className="text-slate-400 hover:text-slate-600 cursor-grab shrink-0">
                                    <GripVertical size={12} />
                                  </div>
                                  <Input
                                    value={link.label}
                                    onChange={(e) => setProp((p: any) => p.columns[i].links[j].label = e.target.value)}
                                    className="h-8 bg-white border-slate-200 rounded-lg text-[12px] text-slate-700 focus-visible:border-slate-300"
                                  />
                                  <Input
                                    value={link.href}
                                    onChange={(e) => setProp((p: any) => p.columns[i].links[j].href = e.target.value)}
                                    className="h-8 bg-white border-slate-200 rounded-lg text-[11px] text-slate-700 focus-visible:border-slate-300"
                                  />
                                  <button
                                    onClick={() => removeLink(i, j)}
                                    className="text-slate-400 hover:text-red shrink-0 p-1"
                                  >
                                    <Trash2 size={11} />
                                  </button>
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
              </div>
            ))}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="style" className="space-y-0">
        <div className="mb-7 space-y-4">
          <SliderWithInput label="Footer padding" value={padding} onChange={(val) => setProp((p: any) => p.padding = val)} min={40} max={160} step={8} numeric />
          <SliderWithInput label="Border top" value={borderTopWidth} onChange={(val) => setProp((p: any) => p.borderTopWidth = val)} min={0} max={10} numeric />
          <ColorPicker label="Background" value={backgroundColor} onChange={(val) => setProp((p: any) => p.backgroundColor = val)} />
          <ColorPicker label="Text color" value={textColor} onChange={(val) => setProp((p: any) => p.textColor = val)} />
          <ColorPicker label="Accent color" value={accentColor} onChange={(val) => setProp((p: any) => p.accentColor = val)} />
          <ColorPicker label="Border color" value={borderTopColor} onChange={(val) => setProp((p: any) => p.borderTopColor = val)} />
        </div>

        <div className="mb-7 last:mb-0 pt-4 border-t border-slate-200 space-y-4">
          <h4 className="text-[13px] font-bold text-slate-900">Footer typography</h4>
          <SliderWithInput label="Title size" value={titleFontSize} onChange={(val) => setProp((p: any) => p.titleFontSize = val)} min={8} max={24} numeric />
          <SliderWithInput label="Link size" value={linkFontSize} onChange={(val) => setProp((p: any) => p.linkFontSize = val)} min={8} max={24} numeric />
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-slate-700">Title weight</Label>
            <select
              value={titleFontWeight}
              onChange={(e) => setProp((p: any) => p.titleFontWeight = e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl h-9 text-[12px] outline-none text-slate-700 focus:border-slate-300"
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
