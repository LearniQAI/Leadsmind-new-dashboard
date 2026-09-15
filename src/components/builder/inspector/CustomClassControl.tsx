"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronRight } from 'lucide-react';

export const CustomClassControl = () => {
  const { actions: { setProp }, props } = useNode((node) => ({
    props: node.data.props,
  }));

  const [isOpen, setIsOpen] = React.useState(false);
  const [pseudoState, setPseudoState] = React.useState<'normal' | 'hover' | 'focus'>('normal');

  const customClasses = props.customClasses || '';
  const hoverClasses = props.hoverClasses || '';
  const focusClasses = props.focusClasses || '';

  const getActiveValue = () => {
    if (pseudoState === 'hover') return hoverClasses;
    if (pseudoState === 'focus') return focusClasses;
    return customClasses;
  };

  const handleValueChange = (val: string) => {
    setProp((props: any) => {
      if (pseudoState === 'hover') props.hoverClasses = val;
      else if (pseudoState === 'focus') props.focusClasses = val;
      else props.customClasses = val;
    });
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-1.5 hover:bg-slate-100 transition-colors motion-reduce:transition-none group text-left"
      >
        <span className="text-xs font-bold text-slate-500 group-hover:text-slate-900 transition-colors motion-reduce:transition-none">
          Tailwind class inspector
        </span>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-slate-900 transition-colors motion-reduce:transition-none" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-900 transition-colors motion-reduce:transition-none" />
        )}
      </button>

      {isOpen && (
        <div className="space-y-3 pt-1">
          {/* State Selectors */}
          <div className="grid grid-cols-3 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            {(['normal', 'hover', 'focus'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setPseudoState(s)}
                className={`py-1 text-[9px] font-bold rounded capitalize transition-all motion-reduce:transition-none ${
                  pseudoState === s
                    ? 'bg-slate-900 text-white shadow'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="space-y-1">
            <Label className="text-[9px] font-bold text-slate-500 block">
              {pseudoState} classes
            </Label>
            <Input
              value={getActiveValue()}
              onChange={(e) => handleValueChange(e.target.value)}
              className="h-9 text-xs bg-white border-slate-200"
              placeholder={
                pseudoState === 'hover'
                  ? 'e.g. scale-105 border-primary shadow-xl'
                  : pseudoState === 'focus'
                  ? 'e.g. border-blue-500 ring-2'
                  : 'e.g. shadow-lg transition duration-300'
              }
            />
          </div>

          <span className="text-[10px] text-slate-500 block leading-tight">
            Tailwind classes will merge into the element style tree. Hover/focus states are automatically prefixed.
          </span>
        </div>
      )}
    </div>
  );
};
