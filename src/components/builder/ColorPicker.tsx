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
          <Label className="text-[12px] font-medium text-slate-700">{label}</Label>
        )}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="relative h-6 w-6 rounded-full border border-slate-200 ring-1 ring-inset ring-black/5 shadow-[0_1px_2px_rgba(0,0,0,0.12)] shrink-0 overflow-hidden transition-transform duration-150 motion-reduce:transition-none hover:scale-110 active:scale-95"
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
          <PopoverContent className="w-auto p-3 bg-white border-slate-200 rounded-2xl shadow-xl">
            <div className="space-y-4 pt-2">
              <HexColorPicker color={color.startsWith('#') ? color.substring(0, 7) : '#6c47ff'} onChange={onChange} />
              <div className="grid grid-cols-6 gap-1 mt-2">
                {presets.map((preset) => (
                  <button
                    key={preset}
                    className="w-6 h-6 rounded-lg border border-slate-200 hover:border-slate-300 transition-transform motion-reduce:transition-none hover:scale-110"
                    style={{ backgroundColor: preset }}
                    onClick={() => onChange(preset)}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="text-[10px] font-mono text-slate-500">Hex</div>
                <Input
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className="h-8 text-[10px] bg-white border-slate-200 rounded-xl text-slate-700 font-mono focus-visible:border-slate-300"
                />
                <button
                  type="button"
                  onClick={() => onChange('transparent')}
                  className="text-[9px] font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 px-1.5 py-1 rounded-lg border border-slate-200 shrink-0 transition-colors motion-reduce:transition-none"
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
        <Label className="text-[12px] font-medium text-slate-700 block">
          {label}
        </Label>
      )}
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="w-10 h-10 rounded-xl border-2 border-slate-200 shadow-sm transition-all motion-reduce:transition-none hover:scale-105 hover:border-slate-300 active:scale-95 flex items-center justify-center overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')]"
              style={{ backgroundColor: color }}
            >
              <div className="w-full h-full border border-black/5 rounded-lg" style={{ backgroundColor: color }} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3 bg-white border-slate-200 rounded-2xl shadow-xl">
            <div className="space-y-4 pt-2">
              <HexColorPicker color={color.startsWith('#') ? color.substring(0, 7) : '#6c47ff'} onChange={onChange} />

              <div className="grid grid-cols-6 gap-1 mt-2">
                {presets.map((preset) => (
                  <button
                    key={preset}
                    className="w-6 h-6 rounded-lg border border-slate-200 hover:border-slate-300 transition-transform motion-reduce:transition-none hover:scale-110"
                    style={{ backgroundColor: preset }}
                    onClick={() => onChange(preset)}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2 mt-2">
                <div className="text-[10px] font-mono text-slate-500">Hex</div>
                <Input
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className="h-8 text-[10px] bg-white border-slate-200 rounded-xl text-slate-700 font-mono focus-visible:border-slate-300"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
        <div className="flex-1">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 text-xs bg-white border-slate-200 rounded-xl text-slate-700 font-mono focus-visible:border-slate-300"
          />
        </div>
      </div>
    </div>
  );
};
