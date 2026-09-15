"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { ColorPicker } from '../ColorPicker';

const TRIGGER_OPTIONS: { value: string; label: string; helpsWithValue: boolean; valueLabel?: string }[] = [
  { value: 'page-load', label: 'Immediately on page load', helpsWithValue: false },
  { value: 'time-delay', label: 'After a time delay', helpsWithValue: true, valueLabel: 'Seconds' },
  { value: 'exit-intent', label: 'On exit intent (mouse leaves page)', helpsWithValue: false },
  { value: 'scroll', label: 'After scrolling a percentage', helpsWithValue: true, valueLabel: 'Scroll %' },
];

export const PopupFormSettings = () => {
  const { actions: { setProp }, props } = useNode((node) => ({
    props: node.data.props,
  }));

  const { displayMode, triggerType, triggerValue, overlayColor, showCloseButton } = props;
  const selectedTrigger = TRIGGER_OPTIONS.find((t) => t.value === triggerType);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-[12px] font-medium text-slate-700 block">Display mode</Label>
        <select
          value={displayMode}
          onChange={(e) => setProp((p: any) => p.displayMode = e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl h-9 text-[11px] px-2 outline-none font-bold text-slate-700 focus:border-slate-300"
        >
          <option value="inline">Inline — embedded directly in the page</option>
          <option value="popup">Popup — shown in a modal, based on a trigger</option>
        </select>
      </div>

      {displayMode === 'popup' && (
        <>
          <div className="space-y-2">
            <Label className="text-[12px] font-medium text-slate-700 block">Show popup</Label>
            <select
              value={triggerType}
              onChange={(e) => setProp((p: any) => p.triggerType = e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl h-9 text-[11px] px-2 outline-none font-bold text-slate-700 focus:border-slate-300"
            >
              {TRIGGER_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {selectedTrigger?.helpsWithValue && (
            <div className="space-y-2">
              <Label className="text-[12px] font-medium text-slate-700 block">{selectedTrigger.valueLabel}</Label>
              <Input
                type="number"
                min={0}
                value={triggerValue}
                onChange={(e) => setProp((p: any) => p.triggerValue = parseFloat(e.target.value) || 0)}
                className="h-9 bg-white border-slate-200 rounded-xl text-xs text-slate-700 focus-visible:border-slate-300"
              />
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="popup-close-button"
              checked={showCloseButton}
              onChange={(e) => setProp((p: any) => p.showCloseButton = e.target.checked)}
              className="w-4 h-4 rounded accent-primary"
            />
            <Label htmlFor="popup-close-button" className="text-[12px] font-medium text-slate-700 cursor-pointer">
              Show close button
            </Label>
          </div>

          <div className="space-y-2">
            <Label className="text-[12px] font-medium text-slate-700">Overlay color</Label>
            <ColorPicker value={overlayColor} onChange={(val) => setProp((p: any) => p.overlayColor = val)} />
          </div>
        </>
      )}

      <p className="text-[11px] text-slate-500 leading-relaxed pt-2 border-t border-slate-200">
        Drop a Form widget inside this container — it renders normally in the
        editor either way; the popup/trigger behavior only applies on the live page.
      </p>
    </div>
  );
};
