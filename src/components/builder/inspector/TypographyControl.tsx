"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ColorPicker } from '../ColorPicker';
import { useResponsiveSetProp } from '@/lib/builder/hooks';
import { useBuilder } from '../BuilderContext';
import { AlignLeft, AlignCenter, AlignRight, AlignJustify, ChevronDown, ChevronRight } from 'lucide-react';

export const TypographyControl = () => {
  const { props } = useNode((node) => ({
    props: node.data.props,
  }));
  const { viewMode } = useBuilder();
  const { setResponsiveValue } = useResponsiveSetProp();

  const [isOpen, setIsOpen] = React.useState(false);

  const getDisplayValue = (propName: string, baseValue: any) => {
    if (viewMode === 'mobile') return props[`${propName}_mobile`] ?? baseValue;
    if (viewMode === 'tablet') return props[`${propName}_tablet`] ?? baseValue;
    return props[propName] ?? baseValue;
  };

  const fontFamily = getDisplayValue('fontFamily', 'Inter');
  const fontSize = getDisplayValue('fontSize', '');
  const fontWeight = getDisplayValue('fontWeight', 'normal');
  const textAlign = getDisplayValue('textAlign', 'left');
  const lineHeight = getDisplayValue('lineHeight', '');
  const letterSpacing = getDisplayValue('letterSpacing', '');
  const color = getDisplayValue('color', '');

  const fonts = [
    'Inter', 'Poppins', 'Montserrat', 'Roboto', 'Open Sans', 'Lato', 
    'Playfair Display', 'Georgia', 'system-ui', 'monospace'
  ];

  const weights = [
    { value: 'normal', label: 'Normal' },
    { value: 'medium', label: 'Medium' },
    { value: 'semibold', label: 'Semi' },
    { value: 'bold', label: 'Bold' },
    { value: 'black', label: 'Black' }
  ];

  const alignments = [
    { value: 'left', icon: AlignLeft },
    { value: 'center', icon: AlignCenter },
    { value: 'right', icon: AlignRight },
    { value: 'justify', icon: AlignJustify }
  ];

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-1.5 hover:bg-white/[0.02] transition-colors group text-left"
      >
        <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground group-hover:text-white transition-colors">
          Typography
        </span>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-white transition-colors" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-white transition-colors" />
        )}
      </button>

      {isOpen && (
        <div className="space-y-4 pt-1">
          {/* Font Family */}
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground block">Font Family</Label>
            <select 
              value={fontFamily}
              onChange={(e) => setResponsiveValue('fontFamily', e.target.value)}
              className="w-full h-9 text-xs bg-white/5 border border-white/10 rounded-lg text-white px-2 focus:border-primary outline-none"
            >
              {fonts.map((f) => (
                <option key={f} value={f} className="bg-[#12121c] text-white">{f}</option>
              ))}
            </select>
          </div>

          {/* Font Size & Weight */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground block">Font Size</Label>
              <Input 
                value={fontSize}
                onChange={(e) => setResponsiveValue('fontSize', e.target.value)}
                className="h-9 text-xs bg-white/5 border-white/10"
                placeholder="e.g. 16px or 1.25rem"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground block">Font Weight</Label>
              <select 
                value={fontWeight}
                onChange={(e) => setResponsiveValue('fontWeight', e.target.value)}
                className="w-full h-9 text-xs bg-white/5 border border-white/10 rounded-lg text-white px-2 focus:border-primary outline-none"
              >
                {weights.map((w) => (
                  <option key={w.value} value={w.value} className="bg-[#12121c] text-white">{w.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Alignment */}
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground block">Alignment</Label>
            <div className="flex bg-white/5 p-1 rounded-lg border border-white/10 max-w-fit gap-1">
              {alignments.map((item) => {
                const Icon = item.icon;
                const active = textAlign === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setResponsiveValue('textAlign', item.value)}
                    className={`p-1.5 rounded transition-all ${
                      active 
                        ? 'bg-primary text-white shadow' 
                        : 'text-muted-foreground hover:text-white hover:bg-white/5'
                    }`}
                    title={`Align ${item.value}`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Line Height & Letter Spacing */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground block">Line Height</Label>
              <Input 
                value={lineHeight}
                onChange={(e) => setResponsiveValue('lineHeight', e.target.value)}
                className="h-9 text-xs bg-white/5 border-white/10"
                placeholder="e.g. 1.5 or 24px"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground block">Letter Spacing</Label>
              <Input 
                value={letterSpacing}
                onChange={(e) => setResponsiveValue('letterSpacing', e.target.value)}
                className="h-9 text-xs bg-white/5 border-white/10"
                placeholder="e.g. 0.05em or 1px"
              />
            </div>
          </div>

          {/* Color Picker */}
          <ColorPicker 
            label="Text Color"
            value={color === 'transparent' ? '' : color}
            onChange={(val) => setResponsiveValue('color', val)}
          />
        </div>
      )}
    </div>
  );
};
