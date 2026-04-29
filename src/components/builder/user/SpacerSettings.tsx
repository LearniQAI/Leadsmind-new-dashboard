"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '@/components/ui/label';

export const SpacerSettings = () => {
    const { actions: { setProp }, height } = useNode((node) => ({
        height: node.data.props.height,
    }));

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">Spacer Height ({height}px)</Label>
                <input 
                    type="range" min="0" max="500" step="8"
                    value={height || 32}
                    onChange={(e) => setProp((props: any) => props.height = Number(e.target.value))}
                    className="w-full accent-primary"
                />
            </div>
        </div>
    );
};
