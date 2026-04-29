"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { SpacerSettings } from './SpacerSettings';

export interface SpacerProps {
  height: number;
}

export const Spacer = ({ height, canvas, isCanvas, dragRef, ...props }: SpacerProps & any) => {
  const { connectors: { connect, drag } } = useNode();
  
  return (
    <div
      {...props}
      ref={(el) => {
        if (el) {
            connect(el);
            drag(el);
            if (dragRef) {
              if (typeof dragRef === 'function') dragRef(el);
              else dragRef.current = el;
            }
        }
      }}
      className={`w-full outline-dashed outline-1 outline-transparent hover:outline-blue-500/50 transition-all ${props.className || ''}`}
      style={{
        height: `${height}px`,
        minHeight: '10px'
      }}
    />
  );
};

Spacer.craft = {
  displayName: 'Spacer',
  isCanvas: false,
  props: {
    height: 32,
  },
  related: {
    settings: SpacerSettings,
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
