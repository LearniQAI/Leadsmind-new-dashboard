"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ColumnsSettings } from './ColumnsSettings';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ColumnsProps {
  layout: '1' | '2' | '3' | '4' | '1/3-2/3' | '2/3-1/3';
  gap: number;
  padding: number;
  children?: React.ReactNode;
}

export const Columns = ({ 
    layout, 
    gap, 
    padding, 
    children, 
    canvas,
    isCanvas,
    dragRef,
    ...props 
}: ColumnsProps & any) => {
  const { connectors: { connect, drag } } = useNode();
  
  let gridStyle = "grid-cols-1";
  let inlineGrid = undefined;

  switch (layout) {
    case '2': gridStyle = "grid-cols-1 md:grid-cols-2"; break;
    case '3': gridStyle = "grid-cols-1 md:grid-cols-3"; break;
    case '4': gridStyle = "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"; break;
    case '1/3-2/3': inlineGrid = { gridTemplateColumns: '1fr 2fr' }; gridStyle = ""; break;
    case '2/3-1/3': inlineGrid = { gridTemplateColumns: '2fr 1fr' }; gridStyle = ""; break;
  }

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
      className={cn("w-full grid transition-all", gridStyle, props.className)}
      style={{
        gap: `${gap}px`,
        padding: `${padding}px`,
        ...inlineGrid
      }}
    >
      {children}
    </div>
  );
};

Columns.craft = {
  displayName: 'Columns',
  isCanvas: true,
  props: {
    layout: '2',
    gap: 16,
    padding: 16,
  },
  related: {
    settings: ColumnsSettings,
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => true,
  },
};
