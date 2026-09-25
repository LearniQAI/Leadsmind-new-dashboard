"use client";

import React from 'react';
import { useNode } from '@craftjs/core';

import { DividerSettings } from './DividerSettings';
import { useSpacingStyle } from '@/lib/builder/hooks';
import { omitSpacingProps, SPACING_DEFAULTS } from '@/lib/builder/spacing';

export interface DividerProps {
 weight: number;
 color: string;
 width: string;
 alignment: 'left' | 'center' | 'right';
 paddingTop: number;
 paddingBottom: number;
}

export const Divider = ({ 
  weight, 
  color, 
  width, 
  alignment, 
  paddingTop, 
  paddingBottom, 
  dragRef,
  ...props 
}: DividerProps & any) => {
 const { connectors: { connect, drag } } = useNode();
 // Universal spacing controls (shared resolver); 16px top/bottom is Divider's historical default.
 const spacing = useSpacingStyle({ ...props, paddingTop, paddingBottom }, SPACING_DEFAULTS.Divider);
 
 let alignStyle = 'mx-auto';
 if (alignment === 'left') alignStyle = 'ml-0 mr-auto';
 if (alignment === 'right') alignStyle = 'ml-auto mr-0';

 return (
  <div
   {...omitSpacingProps(props)}
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
   className={`w-full outline-dashed outline-1 outline-transparent hover:outline-blue-500/50 transition-all ${props.className || ''}`}
   style={spacing}
  >
    <div 
      className={alignStyle}
      style={{
        height: `${weight}px`,
        backgroundColor: color,
        width: width,
      }}
    />
  </div>
 );
};

Divider.craft = {
 displayName: 'Divider',
 isCanvas: false,
 props: {
  weight: 1,
  color: '#e5e7eb',
  width: '100%',
  alignment: 'center',
  paddingTop: 16,
  paddingBottom: 16,
 },
 related: {
  settings: DividerSettings,
 },
 rules: {
  canDrag: () => true,
  canMoveIn: () => false,
 },
};
