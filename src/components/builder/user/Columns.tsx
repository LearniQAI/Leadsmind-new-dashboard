"use client";

import React from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ColumnsSettings } from './ColumnsSettings';
import { useBuilder } from '../BuilderContext';

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
 const { enabled } = useEditor((state) => ({
   enabled: state.options.enabled
 }));
 const { viewMode } = useBuilder();

 // Real Tailwind breakpoint classes (md:/lg:) — correct on every real device, since they key
 // off the actual browser viewport width. Also the asymmetric splits used to unconditionally
 // apply a fixed 2-column `gridTemplateColumns` inline style with NO responsive behavior at
 // all — they never stacked on real mobile. Now real classes, same as every other layout.
 let gridStyle = "grid-cols-1";
 switch (layout) {
  case '2': gridStyle = "grid-cols-1 md:grid-cols-2"; break;
  case '3': gridStyle = "grid-cols-1 md:grid-cols-3"; break;
  case '4': gridStyle = "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"; break;
  case '1/3-2/3': gridStyle = "grid-cols-1 md:[grid-template-columns:1fr_2fr]"; break;
  case '2/3-1/3': gridStyle = "grid-cols-1 md:[grid-template-columns:2fr_1fr]"; break;
 }

 // The editor's Desktop/Tablet/Mobile toggle narrows a container div, not the real browser
 // window — so Tailwind's md:/lg: classes above (keyed to real viewport width, not any
 // ancestor's width) don't respond to it: the real window stays desktop-wide, so those
 // classes keep winning in the compiled CSS regardless of class order, and multi-column
 // grids never visually stack in Tablet/Mobile preview even though they'd correctly stack on
 // an actual device. A plain same-order class can't fix this (a later `grid-cols-1` still
 // loses to an earlier `md:grid-cols-2` in the real stylesheet), so this REPLACES gridStyle
 // entirely rather than appending to it — editor-preview-only, production always uses the
 // real breakpoint classes above.
 //
 // This per-component JS override is the ACCEPTED PERMANENT PATTERN for this problem, not a
 // stopgap — a real fix (rendering the canvas in an iframe with its own true viewport) was
 // investigated and reverted, since it breaks every canvas interaction that depends on native
 // DOM events (select, drag-reorder, inline-edit, block insertion) once content crosses an
 // iframe document boundary. See the long comment on Viewport.tsx's `getWidth()` for the full
 // reasoning. Copy this same pattern into any other multi-column component only if/when its
 // own preview-stacking is actually reported wrong — not a batch retrofit.
 const viewModeColsOverride: Record<string, Partial<Record<string, string>>> = {
  mobile: { '2': 'grid-cols-1', '3': 'grid-cols-1', '4': 'grid-cols-1', '1/3-2/3': 'grid-cols-1', '2/3-1/3': 'grid-cols-1' },
  tablet: { '4': 'grid-cols-2' }, // '2'/'3' already show their md: column count at tablet width for real
 };
 const previewOverride = enabled ? viewModeColsOverride[viewMode]?.[layout] : undefined;

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
      "w-full grid transition-all",
      enabled && "outline-dashed outline-1 outline-transparent hover:outline-black/10",
      previewOverride || gridStyle,
      props.className
    )}
   style={{
    gap: `${gap}px`,
    padding: `${padding}px`,
   }}
  >
    {React.Children.count(children) === 0 && enabled ? (
      <div className="col-span-full w-full min-h-[80px] bg-dash-surface border border-dashed border-dash-border flex items-center justify-center rounded-xl p-4">
        <span className="text-[10px] font-bold text-dash-textMuted uppercase tracking-widest pointer-events-none">Empty Columns Grid</span>
      </div>
    ) : children}
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
