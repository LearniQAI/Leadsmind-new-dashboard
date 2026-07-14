"use client";

import React, { useState } from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ColorPicker } from '../ColorPicker';
import { useResponsiveSetProp } from '@/lib/builder/hooks';
import { useBuilder } from '../BuilderContext';
import { ChevronDown, ChevronRight } from 'lucide-react';

export const BackgroundBorderControl = () => {
  const { actions: { setProp }, props } = useNode((node) => ({
    props: node.data.props,
  }));

  const roundedPresets = [
    'rounded-none',
    'rounded-sm',
    'rounded',
    'rounded-md',
    'rounded-lg',
    'rounded-xl',
    'rounded-2xl',
    'rounded-3xl',
    'rounded-full'
  ];

  const customClasses = props.customClasses || '';
  const currentRounded = roundedPresets.find(p => customClasses.split(/\s+/).includes(p)) || 'rounded-none';
  const currentRoundedIdx = roundedPresets.indexOf(currentRounded);

  const handleRoundedChange = (idx: number) => {
    const nextPreset = roundedPresets[idx];
    setProp((props: any) => {
      let classes = props.customClasses || '';
      // Remove any existing rounded-* classes
      roundedPresets.forEach(preset => {
        classes = classes.replace(new RegExp(`\\b${preset}\\b`, 'g'), '');
      });
      classes = `${classes} ${nextPreset}`.replace(/\s+/g, ' ').trim();
      props.customClasses = classes;
    });
  };
  const { viewMode } = useBuilder();
  const { setResponsiveValue } = useResponsiveSetProp();

  const [isOpen, setIsOpen] = useState(false);

  const getDisplayValue = (propName: string, baseValue: any) => {
    if (viewMode === 'mobile') return props[`${propName}_mobile`] ?? baseValue;
    if (viewMode === 'tablet') return props[`${propName}_tablet`] ?? baseValue;
    return props[propName] ?? baseValue;
  };

  // Background Props
  const backgroundColor = getDisplayValue('backgroundColor', 'transparent');
  const backgroundGradient = getDisplayValue('backgroundGradient', false);
  const gradientColor1 = getDisplayValue('gradientColor1', '#2563eb');
  const gradientColor2 = getDisplayValue('gradientColor2', '#7c3aed');
  const gradientAngle = getDisplayValue('gradientAngle', '90');

  // Border Props
  const borderWidth = getDisplayValue('borderWidth', '');
  const borderStyle = getDisplayValue('borderStyle', 'none');
  const borderColor = getDisplayValue('borderColor', '');
  const borderRadius = getDisplayValue('borderRadius', '');
  const borderRadiusIndividual = getDisplayValue('borderRadiusIndividual', false);

  const btlr = getDisplayValue('borderTopLeftRadius', '');
  const btrr = getDisplayValue('borderTopRightRadius', '');
  const bbrr = getDisplayValue('borderBottomRightRadius', '');
  const bblr = getDisplayValue('borderBottomLeftRadius', '');

  // Shadow preset
  const boxShadow = getDisplayValue('boxShadow', 'none');

  const borderStyles = ['none', 'solid', 'dashed', 'dotted'];
  const shadows = ['none', 'sm', 'md', 'lg', 'xl'];

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-1.5 hover:bg-dash-surface transition-colors motion-reduce:transition-none group text-left"
      >
        <span className="text-xs font-bold !text-dash-textMuted group-hover:!text-dash-text transition-colors motion-reduce:transition-none">
          Background & border
        </span>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 !text-dash-textMuted group-hover:!text-dash-text transition-colors motion-reduce:transition-none" />
        ) : (
          <ChevronRight className="w-4 h-4 !text-dash-textMuted group-hover:!text-dash-text transition-colors motion-reduce:transition-none" />
        )}
      </button>

      {isOpen && (
        <div className="space-y-4 pt-1">
          {/* Background Color */}
          {!backgroundGradient && (
            <ColorPicker
              label="Background color"
              value={backgroundColor === 'transparent' ? '' : backgroundColor}
              onChange={(val) => setResponsiveValue('backgroundColor', val)}
            />
          )}

          {/* Gradient Builder */}
          <div className="space-y-3 p-3 rounded-lg bg-dash-surface border border-dash-border">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-bold !text-dash-textMuted">Use linear gradient</Label>
              <input
                type="checkbox"
                checked={backgroundGradient}
                onChange={(e) => setResponsiveValue('backgroundGradient', e.target.checked)}
                className="accent-dash-accent h-4 w-4 rounded border-dash-border"
              />
            </div>

            {backgroundGradient && (
              <div className="space-y-3 pt-2 border-t border-dash-border">
                <div className="grid grid-cols-2 gap-2">
                  <ColorPicker
                    label="Stop 1"
                    value={gradientColor1}
                    onChange={(val) => setResponsiveValue('gradientColor1', val)}
                  />
                  <ColorPicker
                    label="Stop 2"
                    value={gradientColor2}
                    onChange={(val) => setResponsiveValue('gradientColor2', val)}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[9px] font-bold !text-dash-textMuted block flex justify-between">
                    <span>Angle</span>
                    <span>{gradientAngle}°</span>
                  </Label>
                  <input
                    type="range" min="0" max="360" step="5"
                    value={gradientAngle}
                    onChange={(e) => setResponsiveValue('gradientAngle', e.target.value)}
                    className="w-full accent-dash-accent"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Border Width & Style */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold !text-dash-textMuted block">Border width</Label>
              <Input
                value={borderWidth}
                onChange={(e) => setResponsiveValue('borderWidth', e.target.value)}
                className="h-9 text-xs bg-white border-dash-border"
                placeholder="e.g. 1px or 2px"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold !text-dash-textMuted block">Border style</Label>
              <select
                value={borderStyle}
                onChange={(e) => setResponsiveValue('borderStyle', e.target.value)}
                className="w-full h-9 text-xs bg-white border border-dash-border rounded-lg !text-dash-text px-2 focus:border-dash-accent outline-none"
              >
                {borderStyles.map((s) => (
                  <option key={s} value={s} className="bg-white text-dash-text capitalize">{s}</option>
                ))}
              </select>
            </div>
          </div>

          {borderStyle !== 'none' && (
            <ColorPicker
              label="Border color"
              value={borderColor}
              onChange={(val) => setResponsiveValue('borderColor', val)}
            />
          )}

          {/* Border Radius */}
          <div className="space-y-3 p-3 rounded-lg bg-dash-surface border border-dash-border">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-bold !text-dash-textMuted">Individual corners</Label>
              <input
                type="checkbox"
                checked={borderRadiusIndividual}
                onChange={(e) => setResponsiveValue('borderRadiusIndividual', e.target.checked)}
                className="accent-dash-accent h-4 w-4 rounded border-dash-border"
              />
            </div>

            {!borderRadiusIndividual ? (
              <div className="space-y-2">
                <Label className="text-[10px] font-bold !text-dash-textMuted block flex justify-between">
                  <span>Tailwind roundness</span>
                  <span className="text-dash-accent font-bold text-[9px]">{currentRounded.replace('rounded-', '') || 'none'}</span>
                </Label>
                <input
                  type="range" min="0" max="8" step="1"
                  value={currentRoundedIdx !== -1 ? currentRoundedIdx : 0}
                  onChange={(e) => handleRoundedChange(Number(e.target.value))}
                  className="w-full accent-dash-accent"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-dash-border">
                <div className="space-y-1">
                  <Label className="text-[9px] font-bold !text-dash-textMuted block">Top-left</Label>
                  <Input
                    value={btlr}
                    onChange={(e) => setResponsiveValue('borderTopLeftRadius', e.target.value)}
                    className="h-8 text-xs bg-white border-dash-border"
                    placeholder="0px"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-bold !text-dash-textMuted block">Top-right</Label>
                  <Input
                    value={btrr}
                    onChange={(e) => setResponsiveValue('borderTopRightRadius', e.target.value)}
                    className="h-8 text-xs bg-white border-dash-border"
                    placeholder="0px"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-bold !text-dash-textMuted block">Bottom-right</Label>
                  <Input
                    value={bbrr}
                    onChange={(e) => setResponsiveValue('borderBottomRightRadius', e.target.value)}
                    className="h-8 text-xs bg-white border-dash-border"
                    placeholder="0px"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-bold !text-dash-textMuted block">Bottom-left</Label>
                  <Input
                    value={bblr}
                    onChange={(e) => setResponsiveValue('borderBottomLeftRadius', e.target.value)}
                    className="h-8 text-xs bg-white border-dash-border"
                    placeholder="0px"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Shadow Preset */}
          <div className="space-y-2">
            <Label className="text-xs font-bold !text-dash-textMuted block">Box shadow</Label>
            <div className="grid grid-cols-5 bg-dash-surface p-1 rounded-lg border border-dash-border">
              {shadows.map((preset) => {
                const active = boxShadow === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setResponsiveValue('boxShadow', preset)}
                    className={`py-1 rounded text-[10px] font-bold transition-all motion-reduce:transition-none capitalize ${
                      active
                        ? 'bg-dash-accent text-white shadow'
                        : '!text-dash-textMuted hover:!text-dash-text hover:bg-white'
                    }`}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
