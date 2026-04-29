"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ColorPicker } from '../ColorPicker';
import { Switch } from '@/components/ui/switch';

export const ProgressBarSettings = () => {
    const { actions: { setProp }, value, color, height, showLabel, label, borderRadius } = useNode((node) => ({
        value: node.data.props.value,
        color: node.data.props.color,
        height: node.data.props.height,
        showLabel: node.data.props.showLabel,
        label: node.data.props.label,
        borderRadius: node.data.props.borderRadius,
    }));

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Progress ({value}%)</Label>
                </div>
                <input 
                    type="range" min="0" max="100" 
                    value={value || 0}
                    onChange={(e) => setProp((props: any) => props.value = Number(e.target.value))}
                    className="w-full accent-primary"
                />
            </div>

            <ColorPicker 
                label="Bar Color"
                value={color}
                onChange={(val) => setProp((props: any) => props.color = val)}
            />

            <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between">
                    <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Show Label</Label>
                    <Switch 
                        checked={showLabel}
                        onCheckedChange={(val) => setProp((props: any) => props.showLabel = val)}
                    />
                </div>
                {showLabel && (
                    <Input 
                        value={label}
                        onChange={(e) => setProp((props: any) => props.label = e.target.value)}
                        className="h-8 bg-white/5 border-white/10 text-xs mt-2"
                        placeholder="e.g. Step 1 of 3"
                    />
                )}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">Thickness (px)</Label>
                    <Input 
                        type="number"
                        value={height}
                        onChange={(e) => setProp((props: any) => props.height = Number(e.target.value))}
                        className="h-8 bg-white/5 border-white/10 text-xs"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">Radius (px)</Label>
                    <Input 
                        type="number"
                        value={borderRadius}
                        onChange={(e) => setProp((props: any) => props.borderRadius = Number(e.target.value))}
                        className="h-8 bg-white/5 border-white/10 text-xs"
                    />
                </div>
            </div>
        </div>
    );
};
