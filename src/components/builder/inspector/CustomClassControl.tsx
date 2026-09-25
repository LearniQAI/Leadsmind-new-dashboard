"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { CUSTOM_CLASS_GROUPS, checkCustomClasses } from '@/lib/builder/customClasses';

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

  const check = checkCustomClasses(getActiveValue(), pseudoState);
  const activeSet = new Set(getActiveValue().split(/s+/).filter(Boolean).map((c: string) => c.replace(/^(hover|focus):/, '')));
  const toggleClass = (cls: string) => {
    const current = getActiveValue().split(/s+/).filter(Boolean);
    const without = current.filter((c: string) => c.replace(/^(hover|focus):/, '') !== cls);
    handleValueChange((without.length === current.length ? [...current, cls] : without).join(' '));
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

          {check.unsupported.length > 0 && (
            <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-2 py-1.5 text-[10px] leading-snug text-amber-800">
              <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
              <span>
                Won&apos;t apply on live pages: <strong>{check.unsupported.join(' ')}</strong>. Only the classes
                below are included in the site&apos;s stylesheet.
              </span>
            </p>
          )}

          {/* The accepted vocabulary (customClassVocabulary.json) — the exact list tailwind.config.js
              safelists, so anything picked here is guaranteed to exist in the built CSS. */}
          <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
            {CUSTOM_CLASS_GROUPS.map((g) => (
              <div key={g.label} className="space-y-1">
                <span className="block text-[9px] font-bold uppercase tracking-wide text-slate-500">{g.label}</span>
                <div className="flex flex-wrap gap-1">
                  {g.classes.map((cls) => (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => toggleClass(cls)}
                      aria-pressed={activeSet.has(cls)}
                      className={`rounded border px-1.5 py-0.5 font-mono text-[9px] transition-colors motion-reduce:transition-none ${
                        activeSet.has(cls) ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                      }`}
                    >
                      {cls}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <span className="text-[10px] text-slate-500 block leading-tight">
            Classes apply to this container; hover/focus states are prefixed automatically.
          </span>
        </div>
      )}
    </div>
  );
};
