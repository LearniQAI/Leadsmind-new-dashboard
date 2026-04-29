"use client";

import React, { useState, useEffect } from 'react';
import { useNode } from '@craftjs/core';
import Editor, { loader } from '@monaco-editor/react';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';

// Force CDN Worker Loading in Settings too
if (typeof window !== 'undefined') {
  loader.config({
    paths: {
      vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.43.0/min/vs'
    },
  });
}

// Local Error Boundary for Monaco Editor
class MonacoErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-[400px] w-full flex flex-col items-center justify-center bg-zinc-900 rounded-xl border border-red-500/20 text-center p-6 gap-3">
          <AlertCircle className="w-8 h-8 text-red-500 opacity-50" />
          <h4 className="text-xs font-bold text-white uppercase tracking-widest">Editor Failed to Load</h4>
          <p className="text-[10px] text-muted-foreground leading-relaxed max-w-[200px]">
            There was a conflict with the code editor worker. Please try refreshing the page.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export const CodeBlockSettings = () => {
  const [isMounted, setIsMounted] = useState(false);
  const { actions: { setProp }, customCode } = useNode((node) => ({
    customCode: node.data.props.customCode,
  }));

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <div className="h-[400px] w-full bg-zinc-900 animate-pulse rounded-xl border border-white/5" />;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground flex items-center justify-between">
          <span>HTML / CSS / JS</span>
          <span className="text-primary animate-pulse">● Live Edit</span>
        </Label>
        
        <div className="rounded-xl overflow-hidden border border-white/10 h-[400px] bg-[#1e1e1e]">
          <MonacoErrorBoundary>
            <Editor
              height="100%"
              defaultLanguage="html"
              theme="vs-dark"
              value={customCode}
              loading={<div className="h-full w-full bg-zinc-900 animate-pulse flex items-center justify-center text-[10px] text-white/20 font-bold uppercase tracking-widest">Initializing Editor...</div>}
              onChange={(value) => setProp((props: any) => props.customCode = value)}
              options={{
                minimap: { enabled: false },
                fontSize: 12,
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                readOnly: false,
                automaticLayout: true,
                padding: { top: 16, bottom: 16 },
              }}
            />
          </MonacoErrorBoundary>
        </div>
        <p className="text-[10px] text-muted-foreground/60 leading-relaxed italic">
          * Scripts will be executed in the final published site. Use sparingly to avoid performance issues.
        </p>
      </div>
    </div>
  );
};
