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
            <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 mb-4">
                <TabsTrigger value="content" className="text-[10px] font-bold uppercase tracking-widest gap-2">
                    <Layout size={12} /> Structure
                </TabsTrigger>
                <TabsTrigger value="style" className="text-[10px] font-bold uppercase tracking-widest gap-2">
                    <Palette size={12} /> Style
                </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-6">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-medium">Full Width Layout</Label>
                        <Switch checked={!!fullWidth} onCheckedChange={(val) => setProp((p: any) => p.fullWidth = val)} />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Grid Columns ({columnsCount})</Label>
                        <input type="range" min="1" max="4" step="1" value={columnsCount} onChange={(e) => setProp((p: any) => p.columnsCount = Number(e.target.value))} className="w-full accent-primary" />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-medium">Show Newsletter</Label>
                        <Switch checked={!!showNewsletter} onCheckedChange={(val) => setProp((p: any) => p.showNewsletter = val)} />
                    </div>
                    {showNewsletter && (
                        <div className="space-y-3 p-3 bg-primary/5 rounded-xl border border-primary/10">
                            <div className="space-y-1">
                                <Label className="text-[9px] uppercase font-bold text-muted-foreground">Form Title</Label>
                                <Input value={newsletterTitle} onChange={(e) => setProp((p: any) => p.newsletterTitle = e.target.value)} className="h-8 bg-white/5" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[9px] uppercase font-bold text-muted-foreground">Description</Label>
                                <textarea 
                                    value={newsletterDescription} 
                                    onChange={(e) => setProp((p: any) => p.newsletterDescription = e.target.value)} 
                                    className="w-full bg-white/5 border border-white/5 rounded p-2 text-[10px] h-14 outline-none" 
                                />
                            </div>
                        </div>
                    )}
                    <div className="space-y-1 pt-2">
                        <Label className="text-[9px] uppercase font-bold text-muted-foreground">Brand Name</Label>
                        <Input value={brandName} onChange={(e) => setProp((p: any) => p.brandName = e.target.value)} className="h-8 bg-black/20" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[9px] uppercase font-bold text-muted-foreground">Tagline</Label>
                        <textarea
                            value={description}
                            onChange={(e) => setProp((p: any) => p.description = e.target.value)}
                            className="w-full bg-black/20 border border-white/5 rounded p-2 text-xs h-20 outline-none"
                        />
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between">
                         <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Social Presence</h4>
                         <Switch checked={!!showSocial} onCheckedChange={(val) => setProp((p: any) => p.showSocial = val)} />
                    </div>
                    
                    {showSocial && (
                        <div className="space-y-3">
                            {['twitter', 'linkedin', 'facebook', 'instagram'].map((platform) => {
                                const link = socialLinks.find((s: any) => s.platform === platform);
                                return (
                                    <div key={platform} className="space-y-1">
                                        <Label className="text-[9px] uppercase font-bold text-muted-foreground">{platform}</Label>
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
                                            className="h-8 bg-black/20"
                                        />
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Footer Columns</Label>
                        <Button variant="ghost" size="icon" onClick={addColumn} className="h-6 w-6">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="space-y-6">
                        {columns.map((col: any, i: number) => (
                            <div key={i} className="p-4 bg-muted/30 rounded-xl border border-white/5 space-y-4 relative group">
                                <button
                                    onClick={() => removeColumn(i)}
                                    className="absolute -top-2 -right-2 p-1.5 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={12} />
                                </button>

                                <div className="space-y-1">
                                    <Label className="text-[9px] uppercase font-bold text-muted-foreground">Col Title</Label>
                                    <Input
                                        value={col.title}
                                        onChange={(e) => setProp((p: any) => p.columns[i].title = e.target.value)}
                                        className="h-8 bg-black/20 font-black"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-[9px] uppercase font-bold text-muted-foreground">Links</Label>
                                        <button onClick={() => addLink(i)} className="text-[9px] text-primary hover:underline font-bold uppercase tracking-widest">+ Add</button>
                                    </div>
                                    {col.links.map((link: any, j: number) => (
                                        <div key={j} className="flex gap-1">
                                            <Input
                                                value={link.label}
                                                onChange={(e) => setProp((p: any) => p.columns[i].links[j].label = e.target.value)}
                                                className="h-7 bg-black/10 text-[10px]"
                                            />
                                            <Input
                                                value={link.href}
                                                onChange={(e) => setProp((p: any) => p.columns[i].links[j].href = e.target.value)}
                                                className="h-7 bg-black/10 text-[9px]"
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
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Footer Padding ({padding}px)</Label>
                        <input type="range" min="40" max="160" step="8" value={padding} onChange={(e) => setProp((p: any) => p.padding = Number(e.target.value))} className="w-full accent-primary" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Border Top ({borderTopWidth}px)</Label>
                        <input type="range" min="0" max="10" step="1" value={borderTopWidth} onChange={(e) => setProp((p: any) => p.borderTopWidth = Number(e.target.value))} className="w-full accent-primary" />
                    </div>
                    <ColorPicker label="Background" value={backgroundColor} onChange={(val) => setProp((p: any) => p.backgroundColor = val)} />
                    <ColorPicker label="Text Color" value={textColor} onChange={(val) => setProp((p: any) => p.textColor = val)} />
                    <ColorPicker label="Accent Color" value={accentColor} onChange={(val) => setProp((p: any) => p.accentColor = val)} />
                    <ColorPicker label="Border Color" value={borderTopColor} onChange={(val) => setProp((p: any) => p.borderTopColor = val)} />
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 pb-2">Footer Typography</h4>
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Title Size ({titleFontSize}px)</Label>
                        <input type="range" min="8" max="24" step="1" value={titleFontSize} onChange={(e) => setProp((p: any) => p.titleFontSize = Number(e.target.value))} className="w-full accent-primary" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Link Size ({linkFontSize}px)</Label>
                        <input type="range" min="8" max="24" step="1" value={linkFontSize} onChange={(e) => setProp((p: any) => p.linkFontSize = Number(e.target.value))} className="w-full accent-primary" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Title Weight</Label>
                        <select
                            value={titleFontWeight}
                            onChange={(e) => setProp((p: any) => p.titleFontWeight = e.target.value)}
                            className="w-full bg-black/20 border border-white/5 rounded h-8 text-[10px] outline-none"
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
