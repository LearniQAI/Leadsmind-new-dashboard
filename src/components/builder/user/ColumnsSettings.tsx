"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '@/components/ui/label';

export const ColumnsSettings = () => {
    const { actions: { setProp }, layout, gap, padding } = useNode((node) => ({
        layout: node.data.props.layout,
        gap: node.data.props.gap,
        padding: node.data.props.padding,
    }));

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">Column Layout</Label>
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { id: '1', label: '1 Column' },
                        { id: '2', label: '2 Columns' },
                        { id: '3', label: '3 Columns' },
                        { id: '4', label: '4 Columns' },
                        { id: '1/3-2/3', label: '1/3 + 2/3' },
                        { id: '2/3-1/3', label: '2/3 + 1/3' },
                    ].map((l) => (
                        <button
                            key={l.id}
                            onClick={() => setProp((props: any) => props.layout = l.id)}
                            className={`text-[10px] py-2 rounded font-bold transition-all border border-white/5 ${layout === l.id ? 'bg-primary text-white shadow-lg' : 'bg-muted text-muted-foreground hover:text-white'}`}
                        >
                            {l.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4 pt-2 border-t border-white/5">
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Gap Spacing ({gap}px)</Label>
                    </div>
                    <input 
                        type="range" min="0" max="64" step="4"
                        value={gap || 0}
                        onChange={(e) => setProp((props: any) => props.gap = Number(e.target.value))}
                        className="w-full accent-primary"
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Internal Padding ({padding}px)</Label>
                    </div>
                    <input 
                        type="range" min="0" max="64" step="4"
                        value={padding || 0}
                        onChange={(e) => setProp((props: any) => props.padding = Number(e.target.value))}
                        className="w-full accent-primary"
                    />
                </div>
            </div>
        </div>
    );
};
