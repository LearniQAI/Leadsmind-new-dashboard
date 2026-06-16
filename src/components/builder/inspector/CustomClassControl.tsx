"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useResponsiveSetProp } from '@/lib/builder/hooks';
import { ChevronDown, ChevronRight } from 'lucide-react';

export const CustomClassControl = () => {
  const { actions: { setProp }, props } = useNode((node) => ({
    props: node.data.props,
  }));

  const [isOpen, setIsOpen] = React.useState(false);

  const customClasses = props.customClasses || '';

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-1.5 hover:bg-white/[0.02] transition-colors group text-left"
      >
        <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground group-hover:text-white transition-colors">
          Custom Classes
        </span>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-white transition-colors" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-white transition-colors" />
        )}
      </button>

      {isOpen && (
        <div className="space-y-2 pt-1">
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
      )}
    </div>
  );
};
