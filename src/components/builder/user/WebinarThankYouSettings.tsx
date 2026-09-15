"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { ColorPicker } from '../ColorPicker';

export const WebinarThankYouSettings = () => {
  const { actions: { setProp }, props } = useNode((node) => ({
    props: node.data.props,
  }));

  const { heading, message, joinButtonText, backgroundColor, headingColor, textColor, accentColor } = props;

  return (
    <div className="w-full">
      <div className="mb-7 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium text-slate-700">Heading</Label>
          <Input
            value={heading}
            onChange={(e) => setProp((p: any) => p.heading = e.target.value)}
            className="h-9 bg-white border-slate-200 rounded-xl text-slate-700 text-xs focus-visible:border-slate-300"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium text-slate-700">Message</Label>
          <textarea
            value={message}
            onChange={(e) => setProp((p: any) => p.message = e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs h-20 outline-none text-slate-700 focus:border-slate-300"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium text-slate-700">Join button text</Label>
          <Input
            value={joinButtonText}
            onChange={(e) => setProp((p: any) => p.joinButtonText = e.target.value)}
            className="h-9 bg-white border-slate-200 rounded-xl text-slate-700 text-xs focus-visible:border-slate-300"
          />
        </div>
      </div>

      <div className="mb-7 last:mb-0 pt-4 border-t border-slate-200 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium text-slate-700">Background</Label>
          <ColorPicker value={backgroundColor} onChange={(val) => setProp((p: any) => p.backgroundColor = val)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium text-slate-700">Heading color</Label>
          <ColorPicker value={headingColor} onChange={(val) => setProp((p: any) => p.headingColor = val)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium text-slate-700">Text color</Label>
          <ColorPicker value={textColor} onChange={(val) => setProp((p: any) => p.textColor = val)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium text-slate-700">Accent color</Label>
          <ColorPicker value={accentColor} onChange={(val) => setProp((p: any) => p.accentColor = val)} />
        </div>
      </div>
    </div>
  );
};
