"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import * as LucideIcons from 'lucide-react';
import { IconSettings } from './IconSettings';

export interface IconProps {
  name: string;
  size: number;
  color: string;
  strokeWidth: number;
  alignment: 'left' | 'center' | 'right';
  fill?: boolean;
}

export const Icon = ({ name, size, color, strokeWidth, alignment, fill, dragRef, ...props }: IconProps & any) => {
  const { connectors: { connect, drag } } = useNode();
  
  // Dynamically resolve the Lucide icon by name
  // @ts-ignore
  const IconComponent = LucideIcons[name] || LucideIcons.HelpCircle;

  const alignments: Record<'left' | 'center' | 'right', string> = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  };

  return (
    <div
      {...props}
      ref={(ref) => {
        if (ref) {
            connect(ref);
            drag(ref);
            if (dragRef) {
                if (typeof dragRef === 'function') dragRef(ref);
                else dragRef.current = ref;
            }
        }
      }}
      className={`inline-flex outline-dashed outline-1 outline-transparent hover:outline-blue-500/50 transition-all ${alignments[alignment as keyof typeof alignments]} ${props.className || ''}`}
    >
        <div style={{ color }}>
            <IconComponent 
                size={size} 
                strokeWidth={strokeWidth} 
                color="currentColor" 
                fill={fill ? 'currentColor' : 'none'}
            />
        </div>
    </div>
  );
};

Icon.craft = {
  displayName: 'Icon',
  props: {
    name: 'Star',
    size: 24,
    color: '#000000',
    strokeWidth: 2,
    alignment: 'center',
    fill: false,
  },
  related: {
    settings: IconSettings,
  },
  rules: {
    canDrag: () => true,
  },
};
