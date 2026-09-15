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
        className="flex items-center justify-between w-full py-1.5 hover:bg-slate-100 transition-colors motion-reduce:transition-none group text-left"
      >
        <span className="text-xs font-bold text-slate-500 group-hover:text-slate-900 transition-colors motion-reduce:transition-none">
          Layout (flexbox)
        </span>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-slate-900 transition-colors motion-reduce:transition-none" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-900 transition-colors motion-reduce:transition-none" />
        )}
      </button>

      {isOpen && (
        <div className="space-y-4 pt-1">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 block">Display mode</Label>
            <div className="grid grid-cols-4 bg-slate-100 p-1 rounded-lg border border-slate-200">
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
                    className={`flex flex-col items-center justify-center py-1.5 rounded transition-all motion-reduce:transition-none ${
                      active
                        ? 'bg-slate-900 text-white shadow font-bold'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-white'
                    }`}
                    title={item.label}
                  >
                    <Icon className="w-3.5 h-3.5 mb-1" />
                    <span className="text-[9px] font-bold">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {display === 'flex' && (
            <div className="space-y-3 p-3 rounded-lg bg-slate-100 border border-slate-200">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-500 block">Flex direction</Label>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { id: 'row', label: 'Row', arrow: '→' },
                    { id: 'row-reverse', label: 'Rev row', arrow: '←' },
                    { id: 'column', label: 'Column', arrow: '↓' },
                    { id: 'column-reverse', label: 'Rev col', arrow: '↑' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setResponsiveValue('flexDirection', item.id)}
                      className={`text-[9px] py-1.5 rounded border font-bold transition-all motion-reduce:transition-none ${
                        flexDirection === item.id
                          ? 'bg-slate-900 border-transparent text-white'
                          : 'border-slate-200 text-slate-500 hover:text-slate-900 bg-white'
                      }`}
                    >
                      <span className="block text-xs">{item.arrow}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-500 block">Justify content</Label>
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
                      className={`text-[9px] py-1.5 rounded border font-bold transition-all motion-reduce:transition-none ${
                        justifyContent === item.id
                          ? 'bg-slate-900 border-transparent text-white'
                          : 'border-slate-200 text-slate-500 hover:text-slate-900 bg-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-500 block">Align items</Label>
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
                      className={`text-[9px] py-1.5 rounded border font-bold transition-all motion-reduce:transition-none ${
                        alignItems === item.id
                          ? 'bg-slate-900 border-transparent text-white'
                          : 'border-slate-200 text-slate-500 hover:text-slate-900 bg-white'
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
              <Label className="text-xs font-bold text-slate-500 block">Gap</Label>
              <Input
                value={gap}
                onChange={(e) => setResponsiveValue('gap', e.target.value)}
                className="h-9 text-xs bg-white border-slate-200"
                placeholder="e.g. 16px or 1rem"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
