"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { ColorPicker } from '../ColorPicker';

export const ThankYouSettings = () => {
  const { actions: { setProp }, props } = useNode((node) => ({
    props: node.data.props,
  }));

  const { heading, message, showOrderSummary, backgroundColor, headingColor, textColor, accentColor } = props;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-bold !text-dash-textMuted block">Heading</Label>
        <Input
          value={heading}
          onChange={(e) => setProp((p: any) => p.heading = e.target.value)}
          className="h-9 bg-white border-dash-border text-xs"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-bold !text-dash-textMuted block">Message</Label>
        <textarea
          value={message}
          onChange={(e) => setProp((p: any) => p.message = e.target.value)}
          className="w-full bg-white border border-dash-border rounded p-2 text-xs h-20 outline-none !text-dash-text"
        />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <input
          type="checkbox"
          id="show-order-summary"
          checked={showOrderSummary}
          onChange={(e) => setProp((p: any) => p.showOrderSummary = e.target.checked)}
          className="w-4 h-4 rounded accent-primary"
        />
        <Label htmlFor="show-order-summary" className="text-xs font-bold !text-dash-textMuted cursor-pointer">
          Show order summary (original + any add-ons)
        </Label>
      </div>

      <div className="space-y-2 pt-2">
        <Label className="text-[10px] font-bold !text-dash-textMuted">Background</Label>
        <ColorPicker value={backgroundColor} onChange={(val) => setProp((p: any) => p.backgroundColor = val)} />
      </div>
      <div className="space-y-2">
        <Label className="text-[10px] font-bold !text-dash-textMuted">Heading color</Label>
        <ColorPicker value={headingColor} onChange={(val) => setProp((p: any) => p.headingColor = val)} />
      </div>
      <div className="space-y-2">
        <Label className="text-[10px] font-bold !text-dash-textMuted">Text color</Label>
        <ColorPicker value={textColor} onChange={(val) => setProp((p: any) => p.textColor = val)} />
      </div>
      <div className="space-y-2">
        <Label className="text-[10px] font-bold !text-dash-textMuted">Accent color</Label>
        <ColorPicker value={accentColor} onChange={(val) => setProp((p: any) => p.accentColor = val)} />
      </div>
    </div>
  );
};
