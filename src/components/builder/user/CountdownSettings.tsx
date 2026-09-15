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
    <div>
      <div className="mb-7 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium text-slate-700 block">Timer title</Label>
          <Input
            value={title}
            onChange={(e) => setProp((props: any) => props.title = e.target.value)}
            className="h-9 bg-white border-slate-200 rounded-xl text-slate-700 text-xs focus-visible:border-slate-300"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium text-slate-700 block">Target date & time</Label>
          <Input
            type="datetime-local"
            value={endDate ? endDate.substring(0, 16) : ''}
            onChange={(e) => setProp((props: any) => props.endDate = new Date(e.target.value).toISOString())}
            className="h-9 bg-white border-slate-200 rounded-xl text-slate-700 text-xs focus-visible:border-slate-300"
          />
        </div>
      </div>

      <p className="mb-7 last:mb-0 p-3 rounded-xl bg-slate-100 border border-transparent text-[12px] text-slate-500 leading-relaxed">
        Note: Evergreen mode (visitor-specific timers) will be available in the pro automation layer. This timer currently targets a fixed global date.
      </p>
    </div>
  );
};
