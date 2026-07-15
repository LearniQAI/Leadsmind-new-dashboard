"use client";

import React, { useState } from 'react';
import { useEditor, Frame, Element } from '@craftjs/core';
import { Monitor, Tablet, Smartphone, Scale, Plus, Sparkles, Download } from 'lucide-react';
import { Container } from './user/Container';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useBuilder } from './BuilderContext';
import { useParams } from 'next/navigation';

function cn(...inputs: ClassValue[]) {
 return twMerge(clsx(inputs));
}

export const Viewport = ({ children }: { children?: React.ReactNode }) => {
 const { viewMode, setViewMode, websiteData, pages, setSidebarOpen, setIsTemplateDirectoryOpen, setIsImportModalOpen } = useBuilder();
 const { pageId } = useParams();
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
  <div className="flex-1 flex flex-col bg-[#F8FAFC] overflow-hidden relative shadow-[inset_0_0_20px_rgba(0,0,0,0.02)]">
   <link href={googleFontsLink} rel="stylesheet" />
   <style dangerouslySetInnerHTML={{ __html: themeVariablesCss }} />

   {/* Canvas Top Bar */}
   <div className="h-11 border-b border-dash-border bg-white px-6 flex items-center justify-between shrink-0 text-xs !text-dash-textMuted z-10">
     <div className="flex items-center gap-2 font-semibold">
       <span className="!text-dash-text font-bold text-[12px]">{pages?.find((p: any) => p.id === pageId)?.name || 'Home'} Page</span>
       <span className="h-3.5 w-px bg-dash-border mx-1" />
       <span className="px-1.5 py-0.5 rounded-md bg-green/10 text-green text-[10px] border border-green/20 flex items-center gap-1 font-bold">
         <span className="w-1 h-1 rounded-full bg-green animate-pulse motion-reduce:animate-none" />
         Autosave Active
       </span>
     </div>
     <div className="flex items-center gap-1 font-medium !text-dash-textMuted text-[11px]">
       <span>Saved 2 sec ago</span>
     </div>
   </div>

   {/* Canvas Area */}
   <div className={cn(
    "flex-1 overflow-auto w-full flex justify-center p-6 md:p-12 transition-all duration-300 ease-in-out motion-reduce:transition-none"
   )}>
    <div
     className="node-canvas-area bg-[var(--theme-bg)] transition-all duration-300 ease-in-out motion-reduce:transition-none rounded-[20px] overflow-hidden shadow-[0_20px_60px_rgba(15,23,42,0.08)] ring-1 ring-black/5"
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
          <div className="w-[480px] bg-white border border-dash-border rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.04)] p-12 flex flex-col items-center text-center pointer-events-auto">
            <div className="w-16 h-16 rounded-2xl bg-dash-accent/10 flex items-center justify-center mb-6">
              <Sparkles className="w-8 h-8 text-dash-accent" />
            </div>
            <h2 className="text-xl font-bold !text-dash-text mb-2">Start building your website</h2>
            <p className="text-sm !text-dash-textMuted mb-8 max-w-sm">
              Drag and drop elements from the left sidebar, or start quickly with a pre-built section.
            </p>
            <div className="flex flex-col w-full gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="w-full flex items-center justify-center gap-2 h-11 bg-dash-accent text-white rounded-xl font-semibold text-sm hover:bg-dash-accent/90 transition-colors motion-reduce:transition-none shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add Section
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsTemplateDirectoryOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 h-11 bg-dash-surface !text-dash-text border border-dash-border rounded-xl font-semibold text-sm hover:bg-dash-border/60 transition-colors motion-reduce:transition-none"
                >
                  <Sparkles className="w-4 h-4 !text-dash-textMuted" />
                  Templates
                </button>
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 h-11 bg-dash-surface !text-dash-text border border-dash-border rounded-xl font-semibold text-sm hover:bg-dash-border/60 transition-colors motion-reduce:transition-none"
                >
                  <Download className="w-4 h-4 !text-dash-textMuted" />
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
