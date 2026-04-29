"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { loader } from '@monaco-editor/react';
import { CodeBlockSettings } from './CodeBlockSettings';

// Force CDN Worker Loading (Bypass local worker conflicts)
if (typeof window !== 'undefined') {
  loader.config({
    paths: {
      vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.43.0/min/vs'
    },
  });
}

export interface CodeBlockProps {
  customCode: string;
}

export const CodeBlock = (allProps: CodeBlockProps & any) => {
  const { 
    customCode = '<!-- Add your HTML here -->', 
    dragRef, 
    ...props 
  } = allProps;
  const { connectors: { connect, drag } } = useNode();

  return (
    <div
      {...props}
      ref={(ref) => {
        if (ref) {
          connect(ref);
          drag(ref);
          if (dragRef) {
            if (typeof dragRef === 'function') dragRef(ref);
            else dragRef.current = ref;
          }
        }
      }}
      className="relative group min-h-[50px] outline-dashed outline-1 outline-transparent hover:outline-blue-500/50 transition-all"
    >
      {/* 
        Sandboxed Preview wrapper 
        Crucial: wrap in a pointer-events-none div so the user can still select the CodeBlock
        in the editor without interacting with the custom script/links.
      */}
      <div className="pointer-events-none select-none overflow-hidden relative">
        <div 
          dangerouslySetInnerHTML={{ __html: customCode }} 
        />
        {/* Editor-only overlay hint */}
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-[8px] text-white/40 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
           Sandboxed Code
        </div>
      </div>

      {/* Label for empty state */}
      {!customCode && (
        <div className="p-8 bg-slate-900/5 border border-dashed border-slate-900/10 rounded-xl flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest">
          Embed Code Block
        </div>
      )}
    </div>
  );
};

CodeBlock.craft = {
  displayName: 'Custom Code',
  props: {
    customCode: `
<div style="padding: 40px; background: linear-gradient(135deg, #6c47ff 0%, #3b82f6 100%); border-radius: 24px; color: white; text-align: center;">
  <h2 style="font-weight: 900; text-transform: uppercase; letter-spacing: -0.05em; margin-bottom: 10px;">Custom Code Injection</h2>
  <p style="opacity: 0.8; font-size: 14px;">Edit the HTML/CSS in the properties panel</p>
</div>
    `,
  },
  related: {
    settings: CodeBlockSettings,
  },
};
