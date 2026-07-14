"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { ColorPicker } from '../ColorPicker';
import { Label } from '@/components/ui/label';

import { useResponsiveSetProp } from '@/lib/builder/hooks';
import { useBuilder } from '../BuilderContext';

export const HeadingSettings = () => {
  const { actions: { setProp }, props } = useNode((node) => ({
    props: node.data.props,
  }));
  const { viewMode } = useBuilder();
  const { setResponsiveValue } = useResponsiveSetProp();

  const { level, fontWeight, textAlign, color, fontSize } = props;

  // Helper to get current display value for a prop
  const getDisplayValue = (propName: string, baseValue: any) => {
    if (viewMode === 'mobile') return props[`${propName}_mobile`] ?? baseValue;
    if (viewMode === 'tablet') return props[`${propName}_tablet`] ?? baseValue;
    return baseValue;
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-bold !text-dash-textMuted block">Heading level</Label>
        <div className="grid grid-cols-3 bg-dash-surface p-1 rounded-md border border-dash-border">
          {['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((l) => (
            <button
              key={l}
              onClick={() => setProp((props: any) => props.level = l)}
              className={`text-[10px] py-1 rounded uppercase font-bold transition-colors motion-reduce:transition-none ${level === l ? 'bg-primary text-white shadow' : '!text-dash-textMuted hover:!text-dash-text'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold !text-dash-textMuted block">Font weight</Label>
        <div className="flex bg-dash-surface p-1 rounded-md border border-dash-border">
          {['normal', 'medium', 'semibold', 'bold', 'black'].map((w) => (
            <button
              key={w}
              onClick={() => setResponsiveValue('fontWeight', w)}
              className={`flex-1 text-[9px] py-1.5 rounded capitalize transition-colors motion-reduce:transition-none ${getDisplayValue('fontWeight', fontWeight) === w ? 'bg-primary text-white shadow font-bold' : '!text-dash-textMuted hover:!text-dash-text'}`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <ColorPicker
          label="Text color"
          value={color || '#111827'}
          onChange={(val) => setProp((props: any) => props.color = val)}
        />

        <div className="space-y-2">
          <Label className="text-xs font-bold !text-dash-textMuted flex justify-between">
            <span>Size custom override (px)</span>
            <span className="text-primary">{getDisplayValue('fontSize', fontSize) || 'Auto'}</span>
          </Label>
          <input
            type="number"
            placeholder="Auto"
            value={getDisplayValue('fontSize', fontSize) || ''}
            onChange={(e) => setResponsiveValue('fontSize', e.target.value ? Number(e.target.value) : undefined)}
            className="w-full h-8 bg-white border border-dash-border rounded px-2 text-xs !text-dash-text"
          />
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-dash-border">
        <Label className="text-xs font-bold !text-dash-textMuted block mt-2">Text align</Label>
        <div className="flex bg-dash-surface p-1 rounded-md border border-dash-border">
          {['left', 'center', 'right', 'justify'].map((align) => (
            <button
              key={align}
              onClick={() => setResponsiveValue('textAlign', align)}
              className={`flex-1 text-[10px] py-1 rounded capitalize transition-colors motion-reduce:transition-none ${getDisplayValue('textAlign', textAlign) === align ? 'bg-primary text-white shadow font-bold' : '!text-dash-textMuted hover:!text-dash-text'}`}
            >
              {align}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
