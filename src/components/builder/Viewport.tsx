"use client";

import React, { useState } from 'react';
import { useEditor, Frame, Element } from '@craftjs/core';
import { Monitor, Tablet, Smartphone, Scale, Plus, Sparkles, Download } from 'lucide-react';
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
 const backgroundColor = config.backgroundColor || '#ffffff'; // Default to white
 const headingFont = config.headingFont || 'Space Grotesk';
 const bodyFont = config.bodyFont || 'DM Sans';

 const { nodes } = useEditor((state) => ({
   nodes: state.nodes
 }));
 
 const rootNode = nodes['ROOT'];
 const isEmpty = rootNode && rootNode.data.nodes.length === 0;

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
     case 'mobile': return '390px';
     case 'tablet': return '768px';
     default: return '100%'; // max-width handles the 1440px limit
   }
  };

  return (
  <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden relative shadow-[inset_0_0_20px_rgba(0,0,0,0.02)]">
   <link href={googleFontsLink} rel="stylesheet" />
   <style dangerouslySetInnerHTML={{ __html: themeVariablesCss }} />

   {/* Canvas Area */}
   <div className={cn(
    "flex-1 overflow-auto w-full flex justify-center p-4 md:p-8 transition-all duration-300 ease-in-out motion-reduce:transition-none"
   )}>
    <div
     className="node-canvas-area bg-[var(--theme-bg)] transition-all duration-300 ease-in-out motion-reduce:transition-none rounded-[16px] overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.08)] ring-1 ring-black/5"
     style={{
      width: getWidth(),
      maxWidth: viewMode === 'desktop' ? '1440px' : 'none',
      minHeight: '100%'
     }}
    >
     <div 
      className="w-full h-full node-canvas-area relative"
     >
      {isEmpty && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
          <div className="w-[480px] bg-white border border-slate-200/60 rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.04)] p-12 flex flex-col items-center text-center pointer-events-auto">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Start building your website</h2>
            <p className="text-sm text-slate-500 mb-8 max-w-sm">
              Drag and drop elements from the left sidebar, or start quickly with a pre-built section.
            </p>
            <div className="flex flex-col w-full gap-3">
              <button 
                onClick={() => {
                  const el = document.querySelector('[title="Toggle Elements Sidebar"]') as HTMLButtonElement;
                  if (el) el.click();
                }}
                className="w-full flex items-center justify-center gap-2 h-11 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add Section
              </button>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    const el = document.querySelector('[title="Open Template Directory"]') as HTMLButtonElement;
                    if (el) el.click();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 h-11 bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-semibold text-sm hover:bg-slate-100 transition-all"
                >
                  <Sparkles className="w-4 h-4 text-slate-400" />
                  Templates
                </button>
                <button 
                  onClick={() => {
                    const el = document.querySelector('[title="Import JSON Template"]') as HTMLButtonElement;
                    if (el) el.click();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 h-11 bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-semibold text-sm hover:bg-slate-100 transition-all"
                >
                  <Download className="w-4 h-4 text-slate-400" />
                  Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {children}
     </div>
    </div>
   </div>
  </div>
 );
};
