"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '@/components/ui/label';
import { ColorPicker } from '../ColorPicker';

export const TextSettings = () => {
    const { actions: { setProp }, fontSize, textAlign, color } = useNode((node) => ({
        fontSize: node.data.props.fontSize,
        textAlign: node.data.props.textAlign,
        color: node.data.props.color,
    }));

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">Font Size ({fontSize}px)</Label>
                <input 
                    type="range" 
                    min="10" 
                    max="100" 
                    value={fontSize || 16}
                    onChange={(e) => setProp((props: any) => props.fontSize = Number(e.target.value))}
                    className="w-full"
                />
            </div>
            
            <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">Text Align</Label>
                <div className="flex bg-muted p-1 rounded-md border border-white/5">
                    {['left', 'center', 'right', 'justify'].map((align) => (
                        <button
                            key={align}
                            onClick={() => setProp((props: any) => props.textAlign = align)}
                            className={`flex-1 text-[10px] py-1 rounded capitalize ${textAlign === align ? 'bg-primary text-white shadow font-bold' : 'text-muted-foreground hover:text-white'}`}
                        >
                            {align}
                        </button>
                    ))}
                </div>
            </div>

            <ColorPicker 
                label="Text Color"
                value={color || '#000000'}
                onChange={(val) => setProp((props: any) => props.color = val)}
            />
        </div>
    );
};
