"use client";

import React, { useEffect, useCallback } from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const RenderNode = ({ render }: { render: React.ReactNode }) => {
 const { id, isCanvas } = useNode((node) => ({
  isCanvas: node.data.isCanvas
 }));

 const { isActive, isHovered, dom, name, nodesCount } = useNode((node) => ({
  isActive: node.events.selected,
  isHovered: node.events.hovered,
  dom: node.dom,
  name: node.data.custom.displayName || node.data.displayName,
  resolvedName: node.data.name,
  nodesCount: node.data.nodes?.length || 0
 }));

 const { isEnabled } = useEditor((state) => ({
  isEnabled: state.options.enabled,
 }));

 const handleRef = useCallback((ref: HTMLElement | null) => {
  if (ref) {
    // Custom logic if needed
  }
 }, []);

 useEffect(() => {
  if (dom && isEnabled) {
   if (isActive || isHovered) dom.classList.add('component-selected');
   else dom.classList.remove('component-selected');
  }
 }, [dom, isActive, isHovered, isEnabled]);

 const { connectors: { connect, drag } } = useNode();

 if (!isEnabled) {
  return <>{render}</>;
 }

 return (
  <div 
    ref={(ref) => { 
      if (ref) {
        if (id === 'ROOT') connect(ref);
        else connect(drag(ref));
      }
    }}
    className={cn(
      "relative transition-all duration-300",
      isActive && "ring-2 ring-primary ring-offset-2 ring-offset-bgBody z-20 shadow-xl",
      isHovered && !isActive && "ring-1 ring-primary/40 ring-dashed z-10"
    )}
  >
   {isActive && id !== 'ROOT' && (
    <div className="absolute -top-6 left-0 bg-primary text-white text-[9px] px-3 py-1 rounded-t-lg flex items-center gap-1.5 z-30 shadow-md pointer-events-none">
      <span className="font-black uppercase tracking-wider">{name}</span>
    </div>
   )}
   {render}
  </div>
 );
};
