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
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">Timer Title</Label>
                <Input 
                    value={title}
                    onChange={(e) => setProp((props: any) => props.title = e.target.value)}
                    className="h-9 bg-white/5 border-white/10 text-xs"
                />
            </div>

            <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">Target Date & Time</Label>
                <Input 
                    type="datetime-local"
                    value={endDate ? endDate.substring(0, 16) : ''}
                    onChange={(e) => setProp((props: any) => props.endDate = new Date(e.target.value).toISOString())}
                    className="h-9 bg-white/5 border-white/10 text-xs text-white scheme-dark"
                />
            </div>

            <p className="p-3 rounded bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-400 leading-relaxed italic">
                Note: Evergreen mode (visitor-specific timers) will be available in the pro automation layer. This timer currently targets a fixed global date.
            </p>
        </div>
    );
};
