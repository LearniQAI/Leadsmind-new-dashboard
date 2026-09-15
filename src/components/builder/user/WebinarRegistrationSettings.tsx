"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { ColorPicker } from '../ColorPicker';
import { Calendar, Palette } from 'lucide-react';

export const WebinarRegistrationSettings = () => {
  const { actions: { setProp }, props } = useNode((node) => ({
    props: node.data.props,
  }));

  const {
    sessionTitle, sessionDateTime, durationMinutes, description, buttonText,
    backgroundColor, buttonBg, buttonTextColor, labelColor,
  } = props;

  return (
    <Tabs defaultValue="details" className="w-full">
      <TabsList className="grid w-full grid-cols-2 bg-slate-100 rounded-full p-1 mb-4 h-auto">
        <TabsTrigger value="details" className="text-[12px] font-medium gap-2 rounded-full text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm h-9">
          <Calendar size={14} /> Session
        </TabsTrigger>
        <TabsTrigger value="style" className="text-[12px] font-medium gap-2 rounded-full text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm h-9">
          <Palette size={14} /> Style
        </TabsTrigger>
      </TabsList>

      <TabsContent value="details" className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium text-slate-700">Session title</Label>
          <Input
            value={sessionTitle}
            onChange={(e) => setProp((p: any) => p.sessionTitle = e.target.value)}
            className="h-9 bg-white border-slate-200 rounded-xl text-slate-700 text-xs focus-visible:border-slate-300"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-slate-700">Date &amp; time</Label>
            <Input
              type="datetime-local"
              value={sessionDateTime}
              onChange={(e) => setProp((p: any) => p.sessionDateTime = e.target.value)}
              className="h-9 bg-white border-slate-200 rounded-xl text-slate-700 text-xs focus-visible:border-slate-300"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-slate-700">Duration (min)</Label>
            <Input
              type="number"
              min={15}
              step="15"
              value={durationMinutes}
              onChange={(e) => setProp((p: any) => p.durationMinutes = parseInt(e.target.value) || 60)}
              className="h-9 bg-white border-slate-200 rounded-xl text-slate-700 text-xs focus-visible:border-slate-300"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium text-slate-700">Description</Label>
          <textarea
            value={description}
            onChange={(e) => setProp((p: any) => p.description = e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs h-20 outline-none text-slate-700 focus:border-slate-300"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium text-slate-700">Button text</Label>
          <Input
            value={buttonText}
            onChange={(e) => setProp((p: any) => p.buttonText = e.target.value)}
            className="h-9 bg-white border-slate-200 rounded-xl text-slate-700 text-xs focus-visible:border-slate-300"
          />
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed">
          Every registrant for this step joins the same live video room at the
          session time above (real video, powered by the same engine as 1:1
          meetings) — not a placeholder link. External Zoom/Google Meet/Teams
          integration isn&apos;t available yet.
        </p>
      </TabsContent>

      <TabsContent value="style" className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium text-slate-700">Background</Label>
          <ColorPicker value={backgroundColor} onChange={(val) => setProp((p: any) => p.backgroundColor = val)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium text-slate-700">Label / text color</Label>
          <ColorPicker value={labelColor} onChange={(val) => setProp((p: any) => p.labelColor = val)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium text-slate-700">Button background</Label>
          <ColorPicker value={buttonBg} onChange={(val) => setProp((p: any) => p.buttonBg = val)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium text-slate-700">Button text color</Label>
          <ColorPicker value={buttonTextColor} onChange={(val) => setProp((p: any) => p.buttonTextColor = val)} />
        </div>
      </TabsContent>
    </Tabs>
  );
};
