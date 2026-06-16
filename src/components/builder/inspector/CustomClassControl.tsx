"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useResponsiveSetProp } from '@/lib/builder/hooks';

export const CustomClassControl = () => {
  const { actions: { setProp }, props } = useNode((node) => ({
    props: node.data.props,
  }));

  const customClasses = props.customClasses || '';

  return (
    <div className="space-y-2 pt-4 border-t border-white/5">
      <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">Custom Classes</Label>
      <Input 
        value={customClasses}
        onChange={(e) => setProp((props: any) => props.customClasses = e.target.value)}
        className="h-9 text-xs bg-white/5 border-white/10"
        placeholder="e.g. shadow-lg hover:scale-105 transition"
      />
      <span className="text-[10px] text-muted-foreground block leading-tight">
        Add custom Tailwind utility classes here. They will be merged with the component styles.
      </span>
    </div>
  );
};
