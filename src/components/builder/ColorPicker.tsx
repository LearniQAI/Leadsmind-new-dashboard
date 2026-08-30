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
  /** Systeme-parity compact style: label on the left, a circular swatch trigger on the
   *  right, no loose hex input. Unset/transparent shows a diagonal "none" line. The popover
   *  picker itself is unchanged. Defaults to the original full-width trigger + hex input. */
  swatch?: boolean;
}

export const ColorPicker = ({ value, onChange, label, swatch }: ColorPickerProps) => {
  // Ensure value is a valid hex, default to transparent/black if missing
  const color = value === 'transparent' ? '#ffffff00' : value || '#000000';
  const unset = !value || value === 'transparent';

  const presets = [
    '#000000', '#ffffff', '#6c47ff', '#f43f5e', '#3b82f6', 
    '#10b981', '#f59e0b', '#6366f1', '#a855f7', '#ec4899',
    '#64748b', '#94a3b8'
  ];

  if (swatch) {
    return (
      <div className="flex items-center justify-between">
        {label && (
          <Label className="text-xs font-bold text-muted-foreground">{label}</Label>
        )}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="relative h-6 w-6 rounded-full border border-dash-border shadow-sm shrink-0 overflow-hidden transition-transform motion-reduce:transition-none hover:scale-110 active:scale-95"
              style={{ backgroundColor: unset ? '#ffffff' : color }}
              aria-label={label || 'Pick colour'}
            >
              {unset && (
                <svg viewBox="0 0 24 24" className="absolute inset-0 h-full w-full text-red-500">
                  <line x1="3" y1="21" x2="21" y2="3" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3 bg-white border-dash-border backdrop-blur-xl shadow-2xl">
            <div className="space-y-4 pt-2">
              <HexColorPicker color={color.startsWith('#') ? color.substring(0, 7) : '#6c47ff'} onChange={onChange} />
              <div className="grid grid-cols-6 gap-1 mt-2">
                {presets.map((preset) => (
                  <button
                    key={preset}
                    className="w-6 h-6 rounded-md border border-dash-border transition-transform motion-reduce:transition-none hover:scale-110"
                    style={{ backgroundColor: preset }}
                    onClick={() => onChange(preset)}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="text-[10px] font-mono text-muted-foreground">Hex</div>
                <Input
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className="h-8 text-[10px] bg-white border-dash-border font-mono"
                />
                <button
                  type="button"
                  onClick={() => onChange('transparent')}
                  className="text-[9px] font-bold text-muted-foreground hover:text-dash-text px-1.5 py-1 rounded border border-dash-border shrink-0"
                >
                  None
                </button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {label && (
        <Label className="text-xs font-bold text-muted-foreground block">
          {label}
        </Label>
      )}
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="w-10 h-10 rounded-lg border-2 border-dash-border shadow-sm transition-all motion-reduce:transition-none hover:scale-105 active:scale-95 flex items-center justify-center overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')]"
              style={{ backgroundColor: color }}
            >
              <div className="w-full h-full border border-black/5 rounded-md" style={{ backgroundColor: color }} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3 bg-white border-dash-border backdrop-blur-xl shadow-2xl">
            <div className="space-y-4 pt-2">
              <HexColorPicker color={color.startsWith('#') ? color.substring(0, 7) : '#6c47ff'} onChange={onChange} />

              <div className="grid grid-cols-6 gap-1 mt-2">
                {presets.map((preset) => (
                  <button
                    key={preset}
                    className="w-6 h-6 rounded-md border border-dash-border transition-transform motion-reduce:transition-none hover:scale-110"
                    style={{ backgroundColor: preset }}
                    onClick={() => onChange(preset)}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2 mt-2">
                <div className="text-[10px] font-mono text-muted-foreground">Hex</div>
                <Input
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className="h-8 text-[10px] bg-white border-dash-border font-mono"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
        <div className="flex-1">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 text-xs bg-white border-dash-border font-mono"
          />
        </div>
      </div>
    </div>
  );
};
