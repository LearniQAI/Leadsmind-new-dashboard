"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { AlignLeft, AlignCenter, AlignRight, Star } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ColorPicker } from '../ColorPicker';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

export const StarRatingSettings = () => {
    const { actions: { setProp }, props } = useNode((node) => ({
        props: node.data.props,
    }));

    const { rating, size, color, count, alignment, showLabel, labelText } = props;

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Rating ({rating})</Label>
                <div className="flex flex-col gap-3">
                     <input 
                        type="range" 
                        min="0" 
                        max={count} 
                        step="0.5" 
                        value={rating} 
                        onChange={(e) => setProp((p: any) => p.rating = Number(e.target.value))} 
                        className="w-full accent-primary" 
                    />
                    <div className="flex justify-between items-center px-1">
                         <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setProp((p: any) => p.count = Math.max(1, p.count - 1))}
                            className="h-6 w-6 border"
                         >
                             -
                         </Button>
                         <span className="text-[10px] font-bold text-muted-foreground uppercase">{count} Total Stars</span>
                         <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setProp((p: any) => p.count = Math.min(10, p.count + 1))}
                            className="h-6 w-6 border"
                         >
                             +
                         </Button>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Appearance</Label>
                <ColorPicker label="Star Color" value={color} onChange={(val) => setProp((p: any) => p.color = val)} />
                <div className="space-y-2">
                     <Label className="text-[10px] uppercase font-bold text-muted-foreground">Star Size ({size}px)</Label>
                     <input type="range" min="12" max="64" step="2" value={size} onChange={(e) => setProp((p: any) => p.size = Number(e.target.value))} className="w-full accent-primary" />
                </div>
            </div>

            <div className="space-y-4">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Layout & Label</Label>
                <div className="flex bg-muted/50 p-1 rounded-lg">
                    {[
                        { id: 'left', icon: AlignLeft },
                        { id: 'center', icon: AlignCenter },
                        { id: 'right', icon: AlignRight },
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setProp((p: any) => p.alignment = item.id)}
                            className={`flex-1 flex justify-center py-1.5 rounded-md transition-all ${alignment === item.id ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-white'}`}
                        >
                            <item.icon size={16} />
                        </button>
                    ))}
                </div>

                <div className="flex items-center justify-between pt-2">
                    <Label className="text-[11px] font-medium">Show Sub-Label</Label>
                    <Switch checked={showLabel} onCheckedChange={(val) => setProp((p: any) => p.showLabel = val)} />
                </div>

                {showLabel && (
                    <div className="space-y-1">
                        <Label className="text-[9px] uppercase font-bold text-muted-foreground">Label Text</Label>
                        <Input 
                            value={labelText}
                            onChange={(e) => setProp((p: any) => p.labelText = e.target.value)}
                            className="h-8 bg-black/20 border-white/10 text-[11px]"
                            placeholder="e.g. Based on 500+ happy clients"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
