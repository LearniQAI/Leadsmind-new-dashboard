"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export const CountdownSettings = () => {
  const { actions: { setProp }, endDate, title } = useNode((node) => ({
    endDate: node.data.props.endDate,
    title: node.data.props.title,
  }));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="text-xs font-bold !text-dash-textMuted block">Timer title</Label>
        <Input
          value={title}
          onChange={(e) => setProp((props: any) => props.title = e.target.value)}
          className="h-9 bg-white border-dash-border text-xs"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold !text-dash-textMuted block">Target date & time</Label>
        <Input
          type="datetime-local"
          value={endDate ? endDate.substring(0, 16) : ''}
          onChange={(e) => setProp((props: any) => props.endDate = new Date(e.target.value).toISOString())}
          className="h-9 bg-white border-dash-border text-xs !text-dash-text"
        />
      </div>

      <p className="p-3 rounded bg-dash-surface border border-dash-border text-[10px] !text-dash-textMuted leading-relaxed">
        Note: Evergreen mode (visitor-specific timers) will be available in the pro automation layer. This timer currently targets a fixed global date.
      </p>
    </div>
  );
};
