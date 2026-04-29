"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Plus, Trash2, List, Palette, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ColorPicker } from '../ColorPicker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

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
            <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 mb-4">
                <TabsTrigger value="content" className="text-[10px] font-bold uppercase tracking-widest gap-2">
                    <Navigation size={12} /> Branding
                </TabsTrigger>
                <TabsTrigger value="style" className="text-[10px] font-bold uppercase tracking-widest gap-2">
                    <Palette size={12} /> Styling
                </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-6">
                <div className="p-4 bg-primary/10 rounded-xl border border-primary/20 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-[11px] font-bold uppercase tracking-tight">Global Sync</Label>
                            <p className="text-[9px] text-muted-foreground italic">Syncs this header across all pages</p>
                        </div>
                        <Switch 
                            checked={!!isGlobal} 
                            onCheckedChange={(val) => setProp((p: any) => p.isGlobal = val)}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Header Layout</Label>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { id: 'side', label: 'Side' },
                            { id: 'split', label: 'Split' },
                            { id: 'stacked', label: 'Stacked' },
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setProp((p: any) => p.layoutType = item.id)}
                                className={`p-2 text-[10px] font-bold uppercase rounded-lg border transition-all ${layoutType === item.id ? 'bg-primary text-white' : 'bg-muted/30 hover:bg-muted/50'}`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Navigation Source</Label>
                    <select 
                        value={navigationSource} 
                        onChange={(e) => setProp((p: any) => p.navigationSource = e.target.value)}
                        className="w-full bg-black/20 border border-white/5 rounded h-9 text-[11px] px-2 outline-none"
                    >
                        <option value="none">Manual Links</option>
                        <option value="website">Auto (Current Website)</option>
                    </select>
                </div>

                <div className="space-y-4">
                     <div className="space-y-1">
                        <Label className="text-[9px] uppercase font-bold text-muted-foreground">Brand Name</Label>
                        <Input value={brandName} onChange={(e) => setProp((p: any) => p.brandName = e.target.value)} className="h-8 bg-black/20" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[9px] uppercase font-bold text-muted-foreground">Logo URL</Label>
                        <Input value={logo} onChange={(e) => setProp((p: any) => p.logo = e.target.value)} className="h-8 bg-black/20" />
                    </div>
                </div>

                {navigationSource === 'none' && (
                    <div className="space-y-4 pt-4">
                        <div className="flex items-center justify-between border-t border-white/5 pt-4">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Menu Links</Label>
                            <Button variant="ghost" size="icon" onClick={addLink} className="h-6 w-6">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="space-y-3">
                            {links.map((link: any, i: number) => (
                                <div key={i} className="flex flex-col gap-2 p-3 bg-muted/30 rounded-xl border border-white/5 relative group">
                                    <button 
                                        onClick={() => removeLink(i)}
                                        className="absolute -top-2 -right-2 p-1 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                    >
                                        <Trash2 size={10} />
                                    </button>
                                    <Input 
                                        value={link.label} 
                                        onChange={(e) => updateLink(i, 'label', e.target.value)} 
                                        className="h-7 bg-black/20 text-[10px] font-bold"
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
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 border-b border-white/5 pb-2">Global Bar</h4>
                    <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-medium">Sticky Header</Label>
                        <Switch checked={!!sticky} onCheckedChange={(val) => setProp((p: any) => p.sticky = val)} />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-medium">Full Width Layout</Label>
                        <Switch checked={!!fullWidth} onCheckedChange={(val) => setProp((p: any) => p.fullWidth = val)} />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Bar Padding ({padding}px)</Label>
                        <input type="range" min="8" max="48" step="4" value={padding} onChange={(e) => setProp((p: any) => p.padding = Number(e.target.value))} className="w-full accent-primary" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Border Bottom ({borderBottomWidth}px)</Label>
                        <input type="range" min="0" max="10" step="1" value={borderBottomWidth} onChange={(e) => setProp((p: any) => p.borderBottomWidth = Number(e.target.value))} className="w-full accent-primary" />
                    </div>
                    <ColorPicker label="Background" value={backgroundColor} onChange={(val) => setProp((p: any) => p.backgroundColor = val)} />
                    <ColorPicker label="Text Color" value={textColor} onChange={(val) => setProp((p: any) => p.textColor = val)} />
                    <ColorPicker label="Border Color" value={borderBottomColor} onChange={(val) => setProp((p: any) => p.borderBottomColor = val)} />
                </div>

                <div className="space-y-4 pt-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 border-b border-white/5 pb-2">Menu Typography</h4>
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Font Size ({fontSize}px)</Label>
                        <input type="range" min="8" max="24" step="1" value={fontSize} onChange={(e) => setProp((p: any) => p.fontSize = Number(e.target.value))} className="w-full accent-primary" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Font Weight</Label>
                        <select 
                            value={fontWeight} 
                            onChange={(e) => setProp((p: any) => p.fontWeight = e.target.value)}
                            className="w-full bg-black/20 border border-white/5 rounded h-8 text-[10px] outline-none"
                        >
                            <option value="400">Regular (400)</option>
                            <option value="500">Medium (500)</option>
                            <option value="700">Bold (700)</option>
                            <option value="900">Black (900)</option>
                        </select>
                    </div>
                    <ColorPicker label="Link Hover Color" value={linkHoverColor} onChange={(val) => setProp((p: any) => p.linkHoverColor = val)} />
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 pb-2">Mobile Theme</h4>
                    <ColorPicker label="Hamburger Icon" value={hamburgerColor} onChange={(val) => setProp((p: any) => p.hamburgerColor = val)} />
                    <ColorPicker label="Mobile Overlay" value={mobileOverlayColor} onChange={(val) => setProp((p: any) => p.mobileOverlayColor = val)} />
                </div>

                <div className="space-y-4 pt-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 border-b border-white/5 pb-2">Call to Action</h4>
                    <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-medium">Show Button</Label>
                        <Switch checked={!!showButton} onCheckedChange={(val) => setProp((p: any) => p.showButton = val)} />
                    </div>
                    {showButton && (
                        <>
                            <Input value={buttonText} onChange={(e) => setProp((p: any) => p.buttonText = e.target.value)} className="h-8 bg-black/20 text-xs" />
                            <ColorPicker label="Button BG" value={buttonBg} onChange={(val) => setProp((p: any) => p.buttonBg = val)} />
                            <ColorPicker label="Button Text" value={buttonTextColor} onChange={(val) => setProp((p: any) => p.buttonTextColor = val)} />
                        </>
                    )}
                </div>
            </TabsContent>
        </Tabs>
    );
};
