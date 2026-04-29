"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { AlignLeft, AlignCenter, User, Palette, Quote } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ColorPicker } from '../ColorPicker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
            <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 mb-4">
                <TabsTrigger value="content" className="text-[10px] font-bold uppercase tracking-widest gap-2">
                    <User size={12} /> Content
                </TabsTrigger>
                <TabsTrigger value="style" className="text-[10px] font-bold uppercase tracking-widest gap-2">
                    <Palette size={12} /> Style
                </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-6">
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider block">Avatar Image URL</Label>
                    <Input 
                        value={image} 
                        onChange={(e) => setProp((p: any) => p.image = e.target.value)}
                        className="h-9 bg-white/5 border-white/10 text-xs"
                    />
                </div>
                
                <div className="space-y-4 pt-2">
                    <div className="space-y-1">
                        <Label className="text-[9px] uppercase font-bold text-muted-foreground">Author Name</Label>
                        <Input value={author} onChange={(e) => setProp((p: any) => p.author = e.target.value)} className="h-8 bg-black/20" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[9px] uppercase font-bold text-muted-foreground">Title / Company</Label>
                        <Input value={title} onChange={(e) => setProp((p: any) => p.title = e.target.value)} className="h-8 bg-black/20" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[9px] uppercase font-bold text-muted-foreground">Testimonial Quote</Label>
                        <textarea 
                            value={quote} 
                            onChange={(e) => setProp((p: any) => p.quote = e.target.value)} 
                            className="w-full bg-black/20 border border-white/10 rounded p-2 text-xs h-32 outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                </div>
            </TabsContent>

            <TabsContent value="style" className="space-y-6">
                <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 border-b border-white/5 pb-2">Layout</h4>
                    <div className="flex bg-muted/50 p-1 rounded-lg">
                        {[
                            { id: 'left', icon: AlignLeft },
                            { id: 'center', icon: AlignCenter },
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setProp((p: any) => p.textAlign = item.id)}
                                className={`flex-1 flex justify-center py-1.5 rounded-md transition-all ${textAlign === item.id ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-white'}`}
                            >
                                <item.icon size={16} />
                            </button>
                        ))}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                             <Label className="text-[10px] uppercase font-bold text-muted-foreground">Radius ({borderRadius}px)</Label>
                             <input type="range" min="0" max="100" step="4" value={borderRadius} onChange={(e) => setProp((p: any) => p.borderRadius = Number(e.target.value))} className="w-full accent-primary" />
                        </div>
                        <div className="space-y-2">
                             <Label className="text-[10px] uppercase font-bold text-muted-foreground">Padding ({padding}px)</Label>
                             <input type="range" min="16" max="128" step="8" value={padding} onChange={(e) => setProp((p: any) => p.padding = Number(e.target.value))} className="w-full accent-primary" />
                        </div>
                    </div>
                </div>

                <div className="space-y-4 pt-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 border-b border-white/5 pb-2">Colors</h4>
                    <ColorPicker label="Background" value={backgroundColor} onChange={(val) => setProp((p: any) => p.backgroundColor = val)} />
                    <ColorPicker label="Text Color" value={textColor} onChange={(val) => setProp((p: any) => p.textColor = val)} />
                    <ColorPicker label="Accent Color" value={accentColor} onChange={(val) => setProp((p: any) => p.accentColor = val)} />
                </div>
            </TabsContent>
        </Tabs>
    );
};
