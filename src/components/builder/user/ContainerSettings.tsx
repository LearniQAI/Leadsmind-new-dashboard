"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ColorPicker } from '../ColorPicker';

import { useResponsiveSetProp } from '@/lib/builder/hooks';
import { useBuilder } from '../BuilderContext';

export const ContainerSettings = () => {
    const { actions: { setProp }, props } = useNode((node) => ({
        props: node.data.props,
    }));
    const { viewMode } = useBuilder();
    const { setResponsiveValue } = useResponsiveSetProp();

    const { layoutType, maxWidth, backgroundColor, padding } = props;

    // Helper to get current display value for a prop
    const getDisplayValue = (propName: string, baseValue: any) => {
        if (viewMode === 'mobile') return props[`${propName}_mobile`] ?? baseValue;
        if (viewMode === 'tablet') return props[`${propName}_tablet`] ?? baseValue;
        return baseValue;
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">Container Type</Label>
                <div className="grid grid-cols-2 bg-muted p-1 rounded-md border border-white/5">
                    {['fixed', 'fluid'].map((type) => (
                        <button
                            key={type}
                            onClick={() => setProp((props: any) => props.layoutType = type)}
                            className={`text-[10px] py-1.5 rounded capitalize font-bold ${layoutType === type ? 'bg-primary text-white shadow' : 'text-muted-foreground hover:text-white'}`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            {layoutType === 'fixed' && (
                <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">Max Width</Label>
                    <Input 
                        value={getDisplayValue('maxWidth', maxWidth)}
                        onChange={(e) => setResponsiveValue('maxWidth', e.target.value)}
                        className="h-9 text-xs bg-white/5 border-white/10"
                        placeholder="e.g. 1200px or 90%"
                    />
                </div>
            )}

            <ColorPicker 
                label="Background Color"
                value={backgroundColor === 'transparent' ? '' : backgroundColor}
                onChange={(val) => setProp((props: any) => props.backgroundColor = val)}
            />

            <div className="space-y-2 pt-2 border-t border-white/5">
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block flex justify-between">
                    <span>Internal Padding</span>
                    <span className="text-primary">{getDisplayValue('padding', padding)}px</span>
                </Label>
                <input 
                    type="range" min="0" max="128" step="4"
                    value={getDisplayValue('padding', padding) || 0}
                    onChange={(e) => setResponsiveValue('padding', Number(e.target.value))}
                    className="w-full accent-primary"
                />
            </div>
        </div>
    );
};
