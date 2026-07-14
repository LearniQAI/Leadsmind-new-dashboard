"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '@/components/ui/label';
import { ColorPicker } from '../ColorPicker';

import { useResponsiveSetProp } from '@/lib/builder/hooks';
import { useBuilder } from '../BuilderContext';

export const ParagraphSettings = () => {
  const { actions: { setProp }, props } = useNode((node) => ({
    props: node.data.props,
  }));
  const { viewMode } = useBuilder();
  const { setResponsiveValue } = useResponsiveSetProp();

  const { fontSize, textAlign, color, lineHeight } = props;

  // Helper to get current display value for a prop
  const getDisplayValue = (propName: string, baseValue: any) => {
    if (viewMode === 'mobile') return props[`${propName}_mobile`] ?? baseValue;
    if (viewMode === 'tablet') return props[`${propName}_tablet`] ?? baseValue;
    return baseValue;
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-bold !text-dash-textMuted block flex justify-between">
          <span>Font size</span>
          <span className="text-primary">{getDisplayValue('fontSize', fontSize)}px</span>
        </Label>
        <input
          type="range"
          min="10"
          max="72"
          value={getDisplayValue('fontSize', fontSize) || 16}
          onChange={(e) => setResponsiveValue('fontSize', Number(e.target.value))}
          className="w-full accent-primary"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold !text-dash-textMuted block">Line height</Label>
        <div className="flex bg-dash-surface p-1 rounded-md border border-dash-border">
          {['tight', 'normal', 'relaxed', 'loose'].map((lh) => (
            <button
              key={lh}
              onClick={() => setResponsiveValue('lineHeight', lh)}
              className={`flex-1 text-[9px] py-1.5 rounded capitalize transition-colors motion-reduce:transition-none ${getDisplayValue('lineHeight', lineHeight) === lh ? 'bg-primary text-white shadow font-bold' : '!text-dash-textMuted hover:!text-dash-text'}`}
            >
              {lh}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-2">
        <ColorPicker
          label="Text color"
          value={color || '#4b5563'}
          onChange={(val) => setProp((props: any) => props.color = val)}
        />
      </div>

      <div className="space-y-2 pt-4 border-t border-dash-border">
        <Label className="text-xs font-bold !text-dash-textMuted block">Text align</Label>
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
