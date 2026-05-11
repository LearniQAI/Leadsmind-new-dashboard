"use client";

import React, { useState } from 'react';
import { useEditor, Frame, Element } from '@craftjs/core';
import { Monitor, Tablet, Smartphone, Scale } from 'lucide-react';
import { Container } from './user/Container';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useBuilder } from './BuilderContext';

function cn(...inputs: ClassValue[]) {
 return twMerge(clsx(inputs));
}

export const Viewport = ({ children }: { children?: React.ReactNode }) => {
 const { viewMode, setViewMode } = useBuilder();
 const { connectors, actions } = useEditor();

 const getWidth = () => {
  switch(viewMode) {
    case 'mobile': return '375px';
    case 'tablet': return '768px';
    default: return '100%';
  }
 };

 return (
  <div className="flex-1 flex flex-col bg-[#050508] overflow-hidden relative">
   {/* Device Toolbar */}
   <div className="h-14 bg-[#0b0b14]/50 border-b border-white/5 flex items-center justify-center gap-4 px-4 shrink-0 z-10">
    <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
      <button 
        onClick={() => setViewMode('desktop')}
        className={cn(
          "p-2 rounded-lg transition-all",
          viewMode === 'desktop' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-white/30 hover:text-white"
        )}
      >
        <Monitor className="w-4 h-4" />
      </button>
      <button 
        onClick={() => setViewMode('tablet')}
        className={cn(
          "p-2 rounded-lg transition-all",
          viewMode === 'tablet' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-white/30 hover:text-white"
        )}
      >
        <Tablet className="w-4 h-4" />
      </button>
      <button 
        onClick={() => setViewMode('mobile')}
        className={cn(
          "p-2 rounded-lg transition-all",
          viewMode === 'mobile' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-white/30 hover:text-white"
        )}
      >
        <Smartphone className="w-4 h-4" />
      </button>
    </div>
    
    <div className="absolute right-4 flex items-center gap-2">
      <span className="text-[10px] text-white/20 font-black uppercase tracking-widest flex items-center gap-2">
        <Scale className="w-3 h-3 text-primary" />
        {viewMode === 'desktop' ? 'Fluid Canvas' : getWidth()}
      </span>
    </div>
   </div>

   {/* Canvas Area */}
   <div className="flex-1 overflow-auto p-8 flex justify-center items-start transition-all duration-300 scroll-smooth">
    <div 
     className={cn(
      "bg-white shadow-2xl transition-all duration-500 origin-top min-h-full",
      viewMode === 'mobile' && "rounded-[32px] border-[8px] border-slate-900 overflow-hidden",
      viewMode === 'tablet' && "rounded-xl border-4 border-slate-800"
     )}
     style={{ width: getWidth() }}
    >
     <div 
      className="w-full h-full"
     >
      {children}
     </div>
    </div>
   </div>
  </div>
 );
};
