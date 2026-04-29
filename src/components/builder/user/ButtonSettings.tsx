"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ColorPicker } from '../ColorPicker';
import { IconPicker } from '../IconPicker';
import { LinkSelector } from '../LinkSelector';

export const ButtonSettings = () => {
    const { actions: { setProp }, text, size, variant, color, textColor, borderRadius, width, link, icon, iconPosition } = useNode((node) => ({
        ...node.data.props
    }));

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">Button Text</Label>
                <Input 
                    value={text}
                    onChange={(e) => setProp((props: any) => props.text = e.target.value)}
                    className="h-9 bg-white/5 border-white/10 text-xs"
                />
            </div>

            <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">Link Destination</Label>
                <LinkSelector 
                    value={link}
                    onChange={(val) => setProp((props: any) => props.link = val)}
                />
            </div>

            <div className="space-y-2 pt-2 border-t border-white/5">
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">Size</Label>
                <div className="grid grid-cols-4 bg-muted p-1 rounded-md border border-white/5">
                    {['sm', 'md', 'lg', 'xl'].map((s) => (
                        <button
                            key={s}
                            onClick={() => setProp((props: any) => props.size = s)}
                            className={`text-[10px] py-1.5 rounded uppercase font-bold transition-all ${size === s ? 'bg-primary text-white shadow' : 'text-muted-foreground hover:text-white'}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">Width</Label>
                <div className="grid grid-cols-2 bg-muted p-1 rounded-md border border-white/5">
                    {['fit', 'full'].map((w) => (
                        <button
                            key={w}
                            onClick={() => setProp((props: any) => props.width = w)}
                            className={`text-[10px] py-1.5 rounded capitalize font-bold transition-all ${width === w ? 'bg-primary text-white shadow' : 'text-muted-foreground hover:text-white'}`}
                        >
                            {w} Content
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4 pt-2 border-t border-white/5">
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">Colors</Label>
                <ColorPicker label="Background" value={color} onChange={(val) => setProp((props: any) => props.color = val)} />
                <ColorPicker label="Text Color" value={textColor} onChange={(val) => setProp((props: any) => props.textColor = val)} />
            </div>

            <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">Border Radius ({borderRadius}px)</Label>
                <input 
                    type="range" min="0" max="50" step="2"
                    value={borderRadius || 0}
                    onChange={(e) => setProp((props: any) => props.borderRadius = Number(e.target.value))}
                    className="w-full accent-primary"
                />
            </div>

            <div className="space-y-3 pt-2 border-t border-white/5">
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">Icon</Label>
                <IconPicker 
                    value={icon || ''}
                    onChange={(val) => setProp((props: any) => props.icon = val)}
                />
                
                {icon && (
                    <div className="grid grid-cols-2 bg-muted p-1 rounded-md border border-white/5">
                        {['left', 'right'].map((pos) => (
                            <button
                                key={pos}
                                onClick={() => setProp((props: any) => props.iconPosition = pos)}
                                className={`text-[10px] py-1.5 rounded capitalize font-bold ${iconPosition === pos ? 'bg-primary text-white shadow' : 'text-muted-foreground hover:text-white'}`}
                            >
                                {pos}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
