"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { SectionSettings } from './SectionSettings';
import { useResponsiveValue } from '@/lib/builder/hooks';
import { useBuilder } from '../BuilderContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface SectionProps {
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  backgroundColor: string;
  children?: React.ReactNode;
  canvas?: boolean;
}

export const Section = (allProps: SectionProps & any) => {
    const { 
        backgroundColor,
        paddingTop: _pt,
        paddingBottom: _pb,
        paddingLeft: _pl,
        paddingRight: _pr,
        paddingTop_mobile,
        paddingTop_tablet,
        paddingBottom_mobile,
        paddingBottom_tablet,
        paddingLeft_mobile,
        paddingLeft_tablet,
        paddingRight_mobile,
        paddingRight_tablet,
        children, 
        canvas, 
        dragRef,
        ...props 
    } = allProps;
  const { connectors: { connect, drag } } = useNode();
  const { viewMode } = useBuilder();

  // Responsive values
  const paddingTop = useResponsiveValue(allProps, 'paddingTop', 64);
  const paddingBottom = useResponsiveValue(allProps, 'paddingBottom', 64);
  const paddingLeft = useResponsiveValue(allProps, 'paddingLeft', 24);
  const paddingRight = useResponsiveValue(allProps, 'paddingRight', 24);
  
  return (
    <section
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
      className="w-full relative"
      style={{
        paddingTop: `${paddingTop}px`,
        paddingBottom: `${paddingBottom}px`,
        paddingLeft: `${paddingLeft}px`,
        paddingRight: `${paddingRight}px`,
        backgroundColor,
      }}
    >
      {children}
    </section>
  );
};

Section.craft = {
  displayName: 'Section',
  isCanvas: true,
  props: {
    paddingTop: 64,
    paddingBottom: 64,
    paddingLeft: 24,
    paddingRight: 24,
    backgroundColor: 'transparent',
  },
  related: {
    settings: SectionSettings,
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => true,
  },
};
