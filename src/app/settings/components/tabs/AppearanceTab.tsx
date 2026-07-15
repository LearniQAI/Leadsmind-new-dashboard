"use client";
import React from 'react';
import { Palette, Zap, Monitor, AlignLeft, AlignRight } from 'lucide-react';

interface AppearanceTabProps {
  theme: string;
  toggleTheme: () => void;
  direction: string;
  toggleDirection: () => void;
}

export default function AppearanceTab({
  theme,
  toggleTheme,
  direction,
  toggleDirection
}: AppearanceTabProps) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 motion-reduce:animate-none">
      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white border border-dash-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2 px-2">
            <Palette className="text-dash-accent w-5 h-5" />
            <h4 className="text-[13px] font-bold !text-dash-text">Interface theme</h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => theme === 'dark' && toggleTheme()}
              className={`p-5 rounded-xl border-2 transition-all motion-reduce:transition-none flex flex-col items-center gap-3 ${theme === 'light' ? 'border-dash-accent bg-dash-accent/5 text-dash-accent' : 'border-dash-border bg-dash-surface !text-dash-textMuted hover:border-dash-accent/30'}`}
            >
              <Zap size={24} className={theme === 'light' ? 'fill-dash-accent' : ''} />
              <span className="text-[10px] font-bold">Light mode</span>
            </button>
            <button
              onClick={() => theme === 'light' && toggleTheme()}
              className={`p-5 rounded-xl border-2 transition-all motion-reduce:transition-none flex flex-col items-center gap-3 ${theme === 'dark' ? 'border-dash-accent bg-dash-accent/5 text-dash-accent shadow-sm' : 'border-dash-border bg-dash-surface !text-dash-textMuted hover:border-dash-accent/30'}`}
            >
              <Monitor size={24} />
              <span className="text-[10px] font-bold">Dark mode</span>
            </button>
          </div>
        </div>

        <div className="bg-white border border-dash-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2 px-2">
            <AlignLeft className="text-dash-accent w-5 h-5" />
            <h4 className="text-[13px] font-bold !text-dash-text">Layout direction</h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => direction !== 'ltr' && toggleDirection()}
              className={`p-5 rounded-xl border-2 transition-all motion-reduce:transition-none flex flex-col items-center gap-3 ${direction === 'ltr' ? 'border-dash-accent bg-dash-accent/5 text-dash-accent shadow-sm' : 'border-dash-border bg-dash-surface !text-dash-textMuted hover:border-dash-accent/30'}`}
            >
              <AlignLeft size={24} />
              <span className="text-[10px] font-bold">Left to right</span>
            </button>
            <button
              onClick={() => direction !== 'rtl' && toggleDirection()}
              className={`p-5 rounded-xl border-2 transition-all motion-reduce:transition-none flex flex-col items-center gap-3 ${direction === 'rtl' ? 'border-dash-accent bg-dash-accent/5 text-dash-accent shadow-sm' : 'border-dash-border bg-dash-surface !text-dash-textMuted hover:border-dash-accent/30'}`}
            >
              <AlignRight size={24} />
              <span className="text-[10px] font-bold">Right to left</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
