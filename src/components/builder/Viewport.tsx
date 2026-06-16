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
 const { viewMode, setViewMode, websiteData } = useBuilder();
 const { connectors, actions } = useEditor();

 const config = websiteData?.config || {};
 const primaryColor = config.primaryColor || '#6c47ff';
 const secondaryColor = config.secondaryColor || '#3b82f6';
 const accentColor = config.accentColor || '#fbbf24';
 const backgroundColor = config.backgroundColor || '#050508';
 const headingFont = config.headingFont || 'Space Grotesk';
 const bodyFont = config.bodyFont || 'DM Sans';

 const googleFontsLink = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(headingFont)}:wght@400;700;900&family=${encodeURIComponent(bodyFont)}:wght@400;500;700&display=swap`;

 const themeVariablesCss = `
   :root {
     --theme-primary: ${primaryColor};
     --theme-secondary: ${secondaryColor};
     --theme-accent: ${accentColor};
     --theme-bg: ${backgroundColor};
     --font-heading: '${headingFont}', sans-serif;
     --font-body: '${bodyFont}', sans-serif;
   }
   
   .node-canvas-area h1, .node-canvas-area h2, .node-canvas-area h3, .node-canvas-area h4, .node-canvas-area h5, .node-canvas-area h6 {
     font-family: var(--font-heading) !important;
   }
   
   .node-canvas-area p, .node-canvas-area span, .node-canvas-area a, .node-canvas-area button, .node-canvas-area input, .node-canvas-area textarea {
     font-family: var(--font-body) !important;
   }
 `;

 const getWidth = () => {
  switch(viewMode) {
    case 'mobile': return '375px';
    case 'tablet': return '768px';
    default: return '100%';
  }
 };

 return (
  <div className="flex-1 flex flex-col bg-[#050508] overflow-hidden relative">
   <link href={googleFontsLink} rel="stylesheet" />
   <style dangerouslySetInnerHTML={{ __html: themeVariablesCss }} />
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
   <div className={cn(
      "flex-1 overflow-auto flex justify-center items-start transition-all duration-300 scroll-smooth",
      viewMode === 'desktop' ? "p-0" : "p-8"
   )}>
    <div 
     className={cn(
      "transition-all duration-500 origin-top min-h-full",
      viewMode === 'desktop' ? "" : "bg-[var(--theme-bg)] shadow-2xl",
      viewMode === 'mobile' && "rounded-[32px] border-[8px] border-slate-900 overflow-hidden",
      viewMode === 'tablet' && "rounded-xl border-4 border-slate-800"
     )}
     style={{ width: getWidth() }}
    >
     <div 
      className="w-full h-full node-canvas-area"
     >
      {children}
     </div>
    </div>
   </div>
  </div>
 );
};
