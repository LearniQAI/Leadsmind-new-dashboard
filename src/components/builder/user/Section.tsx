"use client";

import React from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { SectionSettings } from './SectionSettings';
import { useResponsiveValue } from '@/lib/builder/hooks';
import { useBuilder } from '../BuilderContext';
import { formatPseudoClasses } from '@/lib/builder/utils';

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
 const { enabled } = useEditor((state) => ({
   enabled: state.options.enabled
 }));

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
    className={cn(
      "w-full relative",
      formatPseudoClasses(allProps.customClasses, allProps.hoverClasses, allProps.focusClasses)
    )}
   style={{
    paddingTop: `${paddingTop}px`,
    paddingBottom: `${paddingBottom}px`,
    paddingLeft: `${paddingLeft}px`,
    paddingRight: `${paddingRight}px`,
    backgroundColor,
   }}
  >
    {React.Children.count(children) === 0 && enabled ? (
      <div className="w-full min-h-[120px] bg-slate-900/5 border border-dashed border-slate-900/10 flex items-center justify-center rounded-2xl p-6">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pointer-events-none">Empty Section</span>
      </div>
    ) : children}
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
  customClasses: '',
  hoverClasses: '',
  focusClasses: '',
 },
 related: {
  settings: SectionSettings,
 },
 rules: {
  canDrag: () => true,
  canMoveIn: () => true,
 },
};
