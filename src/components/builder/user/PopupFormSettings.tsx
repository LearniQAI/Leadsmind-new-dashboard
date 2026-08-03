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
        <Label className="text-xs font-bold !text-dash-textMuted block">Display mode</Label>
        <select
          value={displayMode}
          onChange={(e) => setProp((p: any) => p.displayMode = e.target.value)}
          className="w-full bg-white border border-dash-border rounded h-9 text-[11px] px-2 outline-none font-bold !text-dash-text focus:border-dash-accent"
        >
          <option value="inline">Inline — embedded directly in the page</option>
          <option value="popup">Popup — shown in a modal, based on a trigger</option>
        </select>
      </div>

      {displayMode === 'popup' && (
        <>
          <div className="space-y-2">
            <Label className="text-xs font-bold !text-dash-textMuted block">Show popup</Label>
            <select
              value={triggerType}
              onChange={(e) => setProp((p: any) => p.triggerType = e.target.value)}
              className="w-full bg-white border border-dash-border rounded h-9 text-[11px] px-2 outline-none font-bold !text-dash-text focus:border-dash-accent"
            >
              {TRIGGER_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {selectedTrigger?.helpsWithValue && (
            <div className="space-y-2">
              <Label className="text-xs font-bold !text-dash-textMuted block">{selectedTrigger.valueLabel}</Label>
              <Input
                type="number"
                min={0}
                value={triggerValue}
                onChange={(e) => setProp((p: any) => p.triggerValue = parseFloat(e.target.value) || 0)}
                className="h-9 bg-white border-dash-border text-xs"
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
            <Label htmlFor="popup-close-button" className="text-xs font-bold !text-dash-textMuted cursor-pointer">
              Show close button
            </Label>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold !text-dash-textMuted">Overlay color</Label>
            <ColorPicker value={overlayColor} onChange={(val) => setProp((p: any) => p.overlayColor = val)} />
          </div>
        </>
      )}

      <p className="text-[10px] !text-dash-textMuted leading-relaxed pt-2 border-t border-dash-border">
        Drop a Form widget inside this container — it renders normally in the
        editor either way; the popup/trigger behavior only applies on the live page.
      </p>
    </div>
  );
};
