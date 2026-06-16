"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useResponsiveSetProp } from '@/lib/builder/hooks';
import { useBuilder } from '../BuilderContext';
import { EyeOff, LayoutGrid, Square, Rows, Columns, AlignStartVertical, AlignCenterVertical, AlignEndVertical, StretchVertical, Baseline, ChevronDown, ChevronRight } from 'lucide-react';

export const FlexboxControl = () => {
  const { props } = useNode((node) => ({
    props: node.data.props,
  }));
  const { viewMode } = useBuilder();
  const { setResponsiveValue } = useResponsiveSetProp();

  const [isOpen, setIsOpen] = React.useState(true);

  const getDisplayValue = (propName: string, baseValue: any) => {
    if (viewMode === 'mobile') return props[`${propName}_mobile`] ?? baseValue;
    if (viewMode === 'tablet') return props[`${propName}_tablet`] ?? baseValue;
    return props[propName] ?? baseValue;
  };

  const display = getDisplayValue('display', 'block');
  const flexDirection = getDisplayValue('flexDirection', 'row');
  const justifyContent = getDisplayValue('justifyContent', 'flex-start');
  const alignItems = getDisplayValue('alignItems', 'stretch');
  const gap = getDisplayValue('gap', '');

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-1.5 hover:bg-white/[0.02] transition-colors group text-left"
      >
        <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground group-hover:text-white transition-colors">
          Layout (Flexbox)
        </span>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-white transition-colors" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-white transition-colors" />
        )}
      </button>

      {isOpen && (
        <div className="space-y-4 pt-1">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">Display Mode</Label>
            <div className="grid grid-cols-4 bg-white/5 p-1 rounded-lg border border-white/10">
              {[
                { id: 'block', label: 'Block', icon: Square },
                { id: 'flex', label: 'Flex', icon: Columns },
                { id: 'grid', label: 'Grid', icon: LayoutGrid },
                { id: 'hidden', label: 'Hide', icon: EyeOff }
              ].map((item) => {
                const Icon = item.icon;
                const active = display === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setResponsiveValue('display', item.id)}
                    className={`flex flex-col items-center justify-center py-1.5 rounded transition-all ${
                      active 
                        ? 'bg-primary text-white shadow font-bold' 
                        : 'text-muted-foreground hover:text-white hover:bg-white/5'
                    }`}
                    title={item.label}
                  >
                    <Icon className="w-3.5 h-3.5 mb-1" />
                    <span className="text-[9px] uppercase tracking-wider font-bold">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {display === 'flex' && (
            <div className="space-y-3 p-3 rounded-lg bg-white/5 border border-white/5">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground block">Flex Direction</Label>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { id: 'row', label: 'Row', arrow: '→' },
                    { id: 'row-reverse', label: 'Rev Row', arrow: '←' },
                    { id: 'column', label: 'Column', arrow: '↓' },
                    { id: 'column-reverse', label: 'Rev Col', arrow: '↑' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setResponsiveValue('flexDirection', item.id)}
                      className={`text-[9px] py-1.5 rounded border font-bold transition-all ${
                        flexDirection === item.id 
                          ? 'bg-primary border-primary text-white' 
                          : 'border-white/5 text-muted-foreground hover:text-white bg-white/5'
                      }`}
                    >
                      <span className="block text-xs">{item.arrow}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground block">Justify Content</Label>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: 'flex-start', label: 'Start' },
                    { id: 'center', label: 'Center' },
                    { id: 'flex-end', label: 'End' },
                    { id: 'space-between', label: 'Between' },
                    { id: 'space-around', label: 'Around' },
                    { id: 'space-evenly', label: 'Evenly' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setResponsiveValue('justifyContent', item.id)}
                      className={`text-[9px] py-1.5 rounded border font-bold transition-all ${
                        justifyContent === item.id 
                          ? 'bg-primary border-primary text-white' 
                          : 'border-white/5 text-muted-foreground hover:text-white bg-white/5'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground block">Align Items</Label>
                <div className="grid grid-cols-5 gap-1">
                  {[
                    { id: 'flex-start', label: 'Start' },
                    { id: 'center', label: 'Center' },
                    { id: 'flex-end', label: 'End' },
                    { id: 'stretch', label: 'Stretch' },
                    { id: 'baseline', label: 'Base' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setResponsiveValue('alignItems', item.id)}
                      className={`text-[9px] py-1.5 rounded border font-bold transition-all ${
                        alignItems === item.id 
                          ? 'bg-primary border-primary text-white' 
                          : 'border-white/5 text-muted-foreground hover:text-white bg-white/5'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(display === 'flex' || display === 'grid') && (
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">Gap</Label>
              <Input 
                value={gap}
                onChange={(e) => setResponsiveValue('gap', e.target.value)}
                className="h-9 text-xs bg-white/5 border-white/10"
                placeholder="e.g. 16px or 1rem"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
