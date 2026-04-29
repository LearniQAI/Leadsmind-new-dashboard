"use client";

import React from 'react';
import { HexColorPicker } from 'react-colorful';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ColorPickerProps {
    value: string;
    onChange: (color: string) => void;
    label?: string;
}

export const ColorPicker = ({ value, onChange, label }: ColorPickerProps) => {
    // Ensure value is a valid hex, default to transparent/black if missing
    const color = value === 'transparent' ? '#ffffff00' : value || '#000000';

    const presets = [
        '#000000', '#ffffff', '#6c47ff', '#f43f5e', '#3b82f6', 
        '#10b981', '#f59e0b', '#6366f1', '#a855f7', '#ec4899',
        '#64748b', '#94a3b8'
    ];

    return (
        <div className="space-y-2">
            {label && (
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">
                    {label}
                </Label>
            )}
            <div className="flex items-center gap-2">
                <Popover>
                    <PopoverTrigger asChild>
                        <button 
                            className="w-10 h-10 rounded-lg border-2 border-white/10 shadow-sm transition-all hover:scale-105 active:scale-95 flex items-center justify-center overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')]"
                            style={{ backgroundColor: color }}
                        >
                            <div className="w-full h-full border border-black/5 rounded-md" style={{ backgroundColor: color }} />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-3 bg-black/90 border-white/10 backdrop-blur-xl shadow-2xl">
                        <div className="space-y-4 pt-2">
                            <HexColorPicker color={color.startsWith('#') ? color.substring(0, 7) : '#6c47ff'} onChange={onChange} />
                            
                            <div className="grid grid-cols-6 gap-1 mt-2">
                                {presets.map((preset) => (
                                    <button
                                        key={preset}
                                        className="w-6 h-6 rounded-md border border-white/10 transition-transform hover:scale-110"
                                        style={{ backgroundColor: preset }}
                                        onClick={() => onChange(preset)}
                                    />
                                ))}
                            </div>

                            <div className="flex items-center gap-2 mt-2">
                                <div className="text-[10px] font-mono text-muted-foreground uppercase">Hex</div>
                                <Input 
                                    value={value}
                                    onChange={(e) => onChange(e.target.value)}
                                    className="h-8 text-[10px] bg-white/5 border-white/10 font-mono"
                                />
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
                <div className="flex-1">
                    <Input 
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="h-9 text-xs bg-white/5 border-white/10 font-mono"
                    />
                </div>
            </div>
        </div>
    );
};
