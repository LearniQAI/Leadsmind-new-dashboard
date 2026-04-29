"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ContainerSettings } from './ContainerSettings';
import { useResponsiveValue } from '@/lib/builder/hooks';
import { useBuilder } from '../BuilderContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ContainerProps {
  layoutType: 'fluid' | 'fixed';
  maxWidth: string;
  backgroundColor: string;
  padding: number;
  children?: React.ReactNode;
}

export const Container = (allProps: ContainerProps & any) => {
    const { 
        layoutType,
        backgroundColor,
        padding: _p,
        padding_mobile,
        padding_tablet,
        maxWidth: _mw,
        maxWidth_mobile,
        maxWidth_tablet,
        children, 
        canvas, 
        isCanvas,
        dragRef,
        ...props 
    } = allProps;
  const { connectors: { connect, drag } } = useNode();
  const { viewMode } = useBuilder();

  // Responsive values
  const padding = useResponsiveValue(allProps, 'padding', 16);
  const maxWidth = useResponsiveValue(allProps, 'maxWidth', '1200px');
  
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
      className={cn(
        "transition-all duration-200 outline-dashed outline-1 outline-transparent hover:outline-black/10",
        layoutType === 'fixed' ? "mx-auto" : "w-full",
        props.className
      )}
      style={{
        maxWidth: layoutType === 'fixed' ? maxWidth : '100%',
        backgroundColor,
        padding: `${padding}px`,
      }}
    >
      {children}
    </div>
  );
};

Container.craft = {
  displayName: 'Container',
  isCanvas: true,
  props: {
    layoutType: 'fixed',
    maxWidth: '1200px',
    backgroundColor: 'transparent',
    padding: 16,
  },
  related: {
    settings: ContainerSettings,
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => true,
  },
};
