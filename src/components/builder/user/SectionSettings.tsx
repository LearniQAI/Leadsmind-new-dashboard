"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '@/components/ui/label';
import { ColorPicker } from '../ColorPicker';
import { Button } from '@/components/ui/button';
import { Ghost } from 'lucide-react';

import { useResponsiveSetProp } from '@/lib/builder/hooks';
import { useBuilder } from '../BuilderContext';

export const SectionSettings = () => {
    const { actions: { setProp }, props } = useNode((node) => ({
        props: node.data.props,
    }));
    const { viewMode } = useBuilder();
    const { setResponsiveValue } = useResponsiveSetProp();

    const { paddingTop, paddingBottom, paddingLeft, paddingRight, backgroundColor } = props;

    // Helper to get current display value for a prop
    const getDisplayValue = (propName: string, baseValue: any) => {
        if (viewMode === 'mobile') return props[`${propName}_mobile`] ?? baseValue;
        if (viewMode === 'tablet') return props[`${propName}_tablet`] ?? baseValue;
        return baseValue;
    };

    return (
        <div className="space-y-6">
            <div className="space-y-4 border-b border-white/5 pb-6">
                <div className="flex items-center justify-between">
                    <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">Background</Label>
                    <Button 
                         variant="ghost"
                         size="sm"
                         onClick={() => setProp((props: any) => props.backgroundColor = 'transparent')}
                         className="h-6 text-[9px] uppercase font-bold text-muted-foreground hover:text-white px-2 py-0 bg-white/5 rounded"
                    >
                        Transparent
                    </Button>
                </div>
                
                <ColorPicker 
                    value={backgroundColor === 'transparent' ? '' : backgroundColor}
                    onChange={(val) => setProp((props: any) => props.backgroundColor = val)}
                />
            </div>

            <div className="space-y-4">
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">Vertical Spacing</Label>
                
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Label className="text-[10px] text-muted-foreground">Top Padding (px)</Label>
                        <span className="text-[10px] font-mono font-bold text-primary">{getDisplayValue('paddingTop', paddingTop)}</span>
                    </div>
                    <input 
                        type="range" min="0" max="256" step="8"
                        value={getDisplayValue('paddingTop', paddingTop) || 0}
                        onChange={(e) => setResponsiveValue('paddingTop', Number(e.target.value))}
                        className="w-full accent-primary"
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Label className="text-[10px] text-muted-foreground">Bottom Padding (px)</Label>
                        <span className="text-[10px] font-mono font-bold text-primary">{getDisplayValue('paddingBottom', paddingBottom)}</span>
                    </div>
                    <input 
                        type="range" min="0" max="256" step="8"
                        value={getDisplayValue('paddingBottom', paddingBottom) || 0}
                        onChange={(e) => setResponsiveValue('paddingBottom', Number(e.target.value))}
                        className="w-full accent-primary"
                    />
                </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">Horizontal Padding</Label>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                         <Label className="text-[10px] text-muted-foreground">Left (px)</Label>
                         <input 
                            type="number" 
                            value={getDisplayValue('paddingLeft', paddingLeft) || 0}
                            onChange={(e) => setResponsiveValue('paddingLeft', Number(e.target.value))}
                            className="w-full h-8 bg-white/5 border border-white/10 rounded px-2 text-xs text-white"
                        />
                    </div>
                    <div className="space-y-2">
                         <Label className="text-[10px] text-muted-foreground">Right (px)</Label>
                         <input 
                            type="number" 
                            value={getDisplayValue('paddingRight', paddingRight) || 0}
                            onChange={(e) => setResponsiveValue('paddingRight', Number(e.target.value))}
                            className="w-full h-8 bg-white/5 border border-white/10 rounded px-2 text-xs text-white"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
