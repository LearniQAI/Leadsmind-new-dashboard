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
 const { viewMode, setViewMode, websiteData, pages, setLeftPanelOpen, setLeftPanelTab, setIsTemplateDirectoryOpen, setIsImportModalOpen } = useBuilder();
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

   /* The admin dashboard theme's global CSS (public/assets/scss/components/_theme.scss)
      applies its own color directly to bare h1-h6/p tag selectors — including
      a dark: variant (near-white/pale, meant for the dashboard's own dark mode)
      that leaks into rendered site content whenever the dashboard is in dark
      mode, since the canvas shares the same document/'.dark' scope. Each block
      component sets an inline color:inherit as a defense against this, which
      should already win per CSS cascade rules, but this makes it unconditional
      and independent of every individual block component getting that right —
      same rationale as the font-family !important rules above.
      Falls back to normal inheritance (each block's own color prop when set,
      or .node-canvas-area's own color default otherwise), it does not force
      a fixed color itself. */
   .node-canvas-area h1, .node-canvas-area h2, .node-canvas-area h3, .node-canvas-area h4, .node-canvas-area h5, .node-canvas-area h6,
   .node-canvas-area p, .node-canvas-area span, .node-canvas-area a {
     color: inherit !important;
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
  <div className="flex-1 min-h-0 flex flex-col bg-[#F8FAFC] overflow-hidden relative shadow-[inset_0_0_20px_rgba(0,0,0,0.02)]">
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
    // items-start (not the flex default of stretch): without this, the
    // .node-canvas-area child below is forced to exactly this container's
    // height regardless of its own content — combined with its own
    // overflow-hidden (needed for the rounded-corner frame effect), that
    // silently clipped any page content taller than the visible canvas
    // before it ever reached this div's own overflow-auto. items-start lets
    // .node-canvas-area grow to its real content height (its minHeight:100%
    // inline style still makes it fill the visible area when content is
    // short), so tall pages actually overflow here — where overflow-auto
    // can do its job — instead of being clipped one level too early.
    "flex-1 min-h-0 overflow-auto w-full flex items-start justify-center p-3 md:p-6 transition-all duration-300 ease-in-out motion-reduce:transition-none light-scrollbar"
   )}>
    <div
     className="node-canvas-area bg-[var(--theme-bg)] transition-all duration-300 ease-in-out motion-reduce:transition-none rounded-[20px] overflow-hidden shadow-[0_20px_60px_rgba(15,23,42,0.08)] ring-1 ring-black/5"
     style={{
      // Blocks (Heading/Paragraph/Text) with no explicit `color` prop render
      // with no inline color at all, so they inherit up the DOM — and since the
      // canvas renders inside the same document as the dashboard shell, that
      // inheritance reaches globals.css's `body { color: var(--t1) }` (a pale
      // near-white meant for the dashboard's own dark theme), rendering as
      // near-invisible faint text on the website canvas's light background.
      // This establishes a sane default for rendered site content, matching
      // --theme-bg's existing role as the content-side background default.
      color: '#111827',
      width: getWidth(),
      // Desktop mode is fluid (fills available editor width), matching how the
      // published site actually renders responsively — there's no fixed "real"
      // desktop viewport to simulate, unlike tablet/mobile which get a fixed
      // simulated width above via getWidth(). Previously this re-capped desktop
      // at a hard 1440px regardless of available space, which is what made the
      // canvas look like a narrow strip on wide monitors.
      maxWidth: 'none',
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
                onClick={() => { setLeftPanelTab('elements'); setLeftPanelOpen(true); }}
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
