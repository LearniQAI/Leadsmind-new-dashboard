"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '@/components/ui/label';
import { ColorPicker } from '../ColorPicker';
import { useResponsiveSetProp } from '@/lib/builder/hooks';
import { useBuilder } from '../BuilderContext';
import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';
import { PropertyGroup, SliderWithInput, PropertySelect } from './primitives';

export const TypographyControl = () => {
  const { props } = useNode((node) => ({
    props: node.data.props,
  }));
  const { viewMode } = useBuilder();
  const { setResponsiveValue } = useResponsiveSetProp();

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
    <PropertyGroup title="Typography" defaultOpen={false}>
      {/* Font size & line height — sliders, matching the reference design */}
      <div className="grid grid-cols-2 gap-2">
        <SliderWithInput
          label="Font size"
          value={fontSize}
          onChange={(val) => setResponsiveValue('fontSize', val)}
          min={8}
          max={120}
          unit="px"
        />
        <SliderWithInput
          label="Line height"
          value={lineHeight}
          onChange={(val) => setResponsiveValue('lineHeight', val)}
          min={0}
          max={100}
          unit="px"
        />
      </div>

      {/* Font family */}
      <PropertySelect
        label="Font family"
        value={fontFamily}
        options={fonts.map((f) => ({ value: f, label: f }))}
        onChange={(val) => setResponsiveValue('fontFamily', val)}
      />
      <PropertySelect
        label="Font style"
        value={fontWeight}
        options={weights}
        onChange={(val) => setResponsiveValue('fontWeight', val)}
      />

      {/* Alignment */}
      <div className="space-y-2">
        <Label className="text-[10px] font-bold !text-dash-textMuted block">Alignment</Label>
        <div className="flex bg-dash-surface p-1 rounded-lg border border-dash-border max-w-fit gap-1">
          {alignments.map((item) => {
            const Icon = item.icon;
            const active = textAlign === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setResponsiveValue('textAlign', item.value)}
                className={`p-1.5 rounded transition-all motion-reduce:transition-none ${
                  active
                    ? 'bg-dash-accent text-white shadow'
                    : '!text-dash-textMuted hover:!text-dash-text hover:bg-white'
                }`}
                title={`Align ${item.value}`}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Letter spacing */}
      <SliderWithInput
        label="Letter spacing"
        value={letterSpacing}
        onChange={(val) => setResponsiveValue('letterSpacing', val)}
        min={-5}
        max={20}
        step={0.1}
        unit="px"
      />

      {/* Color Picker */}
      <ColorPicker
        label="Text color"
        value={color === 'transparent' ? '' : color}
        onChange={(val) => setResponsiveValue('color', val)}
      />
    </PropertyGroup>
  );
};
