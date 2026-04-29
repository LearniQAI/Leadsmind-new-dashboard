"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ColorPicker } from '../ColorPicker';
import { IconPicker } from '../IconPicker';
import { Switch } from '@/components/ui/switch';

export const IconSettings = () => {
    const { actions: { setProp }, name, size, color, strokeWidth, alignment, fill } = useNode((node) => ({
        name: node.data.props.name,
        size: node.data.props.size,
        color: node.data.props.color,
        strokeWidth: node.data.props.strokeWidth,
        alignment: node.data.props.alignment,
        fill: node.data.props.fill,
    }));

    return (
        <div className="space-y-6">
            <div className="space-y-3">
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">Select Icon</Label>
                <IconPicker 
                    value={name || 'Star'}
                    onChange={(newName) => setProp((props: any) => props.name = newName)}
                />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5">
                <div className="space-y-0.5">
                    <Label className="text-xs font-bold text-white">Solid Fill</Label>
                    <p className="text-[10px] text-muted-foreground">Switch between outline and filled</p>
                </div>
                <Switch 
                    checked={fill || false}
                    onCheckedChange={(checked) => setProp((props: any) => props.fill = checked)}
                />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">Size ({size}px)</Label>
                    <Input 
                        type="number"
                        value={size || 24}
                        onChange={(e) => setProp((props: any) => props.size = Number(e.target.value))}
                        className="h-8 text-xs bg-white/5 border-white/10"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">Stroke ({strokeWidth})</Label>
                    <Input 
                        type="number"
                        step="0.5"
                        value={strokeWidth || 2}
                        onChange={(e) => setProp((props: any) => props.strokeWidth = Number(e.target.value))}
                        className="h-8 text-xs bg-white/5 border-white/10"
                    />
                </div>
            </div>

            <ColorPicker 
                label="Icon Color"
                value={color || '#000000'}
                onChange={(val) => setProp((props: any) => props.color = val)}
            />

            <div className="space-y-2 pt-2 border-t border-white/5">
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">Alignment</Label>
                <div className="flex bg-muted p-1 rounded-md border border-white/5">
                    {['left', 'center', 'right'].map((align) => (
                        <button
                            key={align}
                            onClick={() => setProp((props: any) => props.alignment = align)}
                            className={`flex-1 text-[10px] py-1.5 rounded capitalize font-bold ${alignment === align ? 'bg-primary text-white shadow' : 'text-muted-foreground hover:text-white'}`}
                        >
                            {align}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
