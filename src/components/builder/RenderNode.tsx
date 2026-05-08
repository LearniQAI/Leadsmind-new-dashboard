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

  useEffect(() => {
    if (isHovered) console.log(`DEBUG: Hovering over ${name} (ID: ${id}, Canvas: ${isCanvas})`);
    console.log(`DEBUG: Rendering Node ${id} (${name})`);
  }, [isHovered, name, id, isCanvas]);


  const { isEnabled } = useEditor((state) => ({
    isEnabled: state.options.enabled,
  }));

  const handleRef = useCallback((ref: HTMLElement | null) => {
    if (ref) {
        // We can attach custom logic here if needed
    }
  }, []);

  useEffect(() => {
    if (dom) {
      if (isActive || isHovered) dom.classList.add('component-selected');
      else dom.classList.remove('component-selected');
    }
  }, [dom, isActive, isHovered]);

  const { connectors: { connect, drag } } = useNode();

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
            isActive && "ring-2 ring-primary ring-offset-2 ring-offset-bgBody z-20 shadow-2xl shadow-primary/20",
            isHovered && !isActive && "ring-2 ring-primary/30 ring-dashed z-10"
        )}
    >
      {isHovered && isCanvas && (
        <div className="absolute top-4 right-4 bg-primary/20 backdrop-blur-md border border-primary/30 text-primary text-[8px] font-black px-3 py-1.5 rounded-full animate-pulse z-30 uppercase tracking-[0.2em]">
            Neural Node Ready
        </div>
      )}
      {isActive && (
        <div className="absolute -top-7 left-0 bg-primary text-white text-[9px] px-4 py-1.5 rounded-t-xl flex items-center gap-2 z-30 animate-in fade-in slide-in-from-bottom-2 duration-500 shadow-lg shadow-primary/30">
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className="font-black uppercase italic tracking-tighter">{name} <span className="opacity-40 ml-1 italic tracking-widest">({nodesCount})</span></span>
        </div>
      )}
      {render}
    </div>

  );
};
