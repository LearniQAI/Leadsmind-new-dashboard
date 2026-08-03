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
      <TabsList className="grid w-full grid-cols-2 bg-dash-surface p-1 mb-4">
        <TabsTrigger value="details" className="text-[10px] font-bold gap-2">
          <Calendar size={12} /> Session
        </TabsTrigger>
        <TabsTrigger value="style" className="text-[10px] font-bold gap-2">
          <Palette size={12} /> Style
        </TabsTrigger>
      </TabsList>

      <TabsContent value="details" className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-bold !text-dash-textMuted block">Session title</Label>
          <Input
            value={sessionTitle}
            onChange={(e) => setProp((p: any) => p.sessionTitle = e.target.value)}
            className="h-9 bg-white border-dash-border text-xs"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label className="text-xs font-bold !text-dash-textMuted block">Date &amp; time</Label>
            <Input
              type="datetime-local"
              value={sessionDateTime}
              onChange={(e) => setProp((p: any) => p.sessionDateTime = e.target.value)}
              className="h-9 bg-white border-dash-border text-xs"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold !text-dash-textMuted block">Duration (min)</Label>
            <Input
              type="number"
              min={15}
              step="15"
              value={durationMinutes}
              onChange={(e) => setProp((p: any) => p.durationMinutes = parseInt(e.target.value) || 60)}
              className="h-9 bg-white border-dash-border text-xs"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold !text-dash-textMuted block">Description</Label>
          <textarea
            value={description}
            onChange={(e) => setProp((p: any) => p.description = e.target.value)}
            className="w-full bg-white border border-dash-border rounded p-2 text-xs h-20 outline-none !text-dash-text"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold !text-dash-textMuted block">Button text</Label>
          <Input
            value={buttonText}
            onChange={(e) => setProp((p: any) => p.buttonText = e.target.value)}
            className="h-9 bg-white border-dash-border text-xs"
          />
        </div>

        <p className="text-[10px] !text-dash-textMuted leading-relaxed">
          Every registrant for this step joins the same live video room at the
          session time above (real video, powered by the same engine as 1:1
          meetings) — not a placeholder link. External Zoom/Google Meet/Teams
          integration isn&apos;t available yet.
        </p>
      </TabsContent>

      <TabsContent value="style" className="space-y-4">
        <div className="space-y-2">
          <Label className="text-[10px] font-bold !text-dash-textMuted">Background</Label>
          <ColorPicker value={backgroundColor} onChange={(val) => setProp((p: any) => p.backgroundColor = val)} />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-bold !text-dash-textMuted">Label / text color</Label>
          <ColorPicker value={labelColor} onChange={(val) => setProp((p: any) => p.labelColor = val)} />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-bold !text-dash-textMuted">Button background</Label>
          <ColorPicker value={buttonBg} onChange={(val) => setProp((p: any) => p.buttonBg = val)} />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-bold !text-dash-textMuted">Button text color</Label>
          <ColorPicker value={buttonTextColor} onChange={(val) => setProp((p: any) => p.buttonTextColor = val)} />
        </div>
      </TabsContent>
    </Tabs>
  );
};
