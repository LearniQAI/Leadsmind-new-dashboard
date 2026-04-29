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
            "relative transition-all duration-200",
            isActive && "outline-2 outline-solid outline-[#6c47ff] ring-2 ring-[#6c47ff] ring-offset-2 z-20",
            isHovered && !isActive && "outline-2 outline-dashed outline-[#6c47ff]/40 z-10",
            isHovered && isCanvas && "bg-[#6c47ff]/5 outline-4 outline-dotted outline-[#6c47ff]"
        )}
    >
      {isHovered && isCanvas && (
        <div className="absolute top-2 right-2 bg-[#6c47ff]/20 text-[#6c47ff] text-[8px] font-bold px-2 py-1 rounded-full animate-pulse z-30">
            DROP ZONE READY
        </div>
      )}
      {isActive && (
        <div className="absolute -top-6 left-0 bg-[#6c47ff] text-white text-[10px] px-2 py-0.5 rounded-t-sm flex items-center gap-1 z-30 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <span className="font-bold uppercase tracking-tighter">{name} ({nodesCount})</span>
        </div>
      )}
      {render}
    </div>

  );
};
