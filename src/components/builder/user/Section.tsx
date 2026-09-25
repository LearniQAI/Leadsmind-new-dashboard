"use client";

import React from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { SectionSettings } from './SectionSettings';
import { useResponsiveValue, useSpacingStyle } from '@/lib/builder/hooks';
import { omitSpacingProps, SPACING_DEFAULTS } from '@/lib/builder/spacing';
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
 // Top/bottom padding + margins: the universal spacing controls (shared resolver, same
 // 64px historical default as before). Left/right stay Section's own horizontal padding.
 const spacing = useSpacingStyle(allProps, SPACING_DEFAULTS.Section);
 const paddingLeft = useResponsiveValue(allProps, 'paddingLeft', 24);
 const paddingRight = useResponsiveValue(allProps, 'paddingRight', 24);
 
 return (
  <section
   {...omitSpacingProps(props)}
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
      // scroll-mt-24: when a Navbar/Footer link scrolls here via `#id` (resolveLink's
      // 'section' case), landing exactly at this section's top edge tucks its own heading
      // behind a sticky Navbar (every template here uses sticky:true) — this offsets the
      // scroll target upward by the same amount, a generic value close enough to each
      // template's actual navbar height (~70-90px) without needing a per-template constant.
      "w-full relative scroll-mt-24",
      formatPseudoClasses(allProps.customClasses, allProps.hoverClasses, allProps.focusClasses)
    )}
   style={{
    ...spacing,
    paddingLeft: `${paddingLeft}px`,
    paddingRight: `${paddingRight}px`,
    backgroundColor,
   }}
  >
    {React.Children.count(children) === 0 && enabled ? (
      <div className="w-full min-h-[120px] bg-dash-surface border border-dashed border-dash-border flex items-center justify-center rounded-2xl p-6">
        <span className="text-[10px] font-bold text-dash-textMuted uppercase tracking-widest pointer-events-none">Empty Section</span>
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
