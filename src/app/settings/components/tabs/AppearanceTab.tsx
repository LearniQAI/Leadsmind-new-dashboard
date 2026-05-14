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
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-n800 border border-white/5 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2 px-2">
            <Palette className="text-accent w-5 h-5" />
            <h4 className="text-[13px] font-black text-t1 uppercase tracking-widest">Interface Theme</h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => theme === 'dark' && toggleTheme()}
              className={`p-5 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${theme === 'light' ? 'border-accent bg-accent/5 text-accent' : 'border-white/5 bg-n900 text-t4 hover:border-white/10'}`}
            >
              <Zap size={24} className={theme === 'light' ? 'fill-accent' : ''} />
              <span className="text-[10px] font-black uppercase tracking-widest">Solar Mode</span>
            </button>
            <button
              onClick={() => theme === 'light' && toggleTheme()}
              className={`p-5 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${theme === 'dark' ? 'border-accent bg-accent/5 text-accent shadow-lg shadow-accent/10' : 'border-white/5 bg-n900 text-t4 hover:border-white/10'}`}
            >
              <Monitor size={24} />
              <span className="text-[10px] font-black uppercase tracking-widest">Neural Dark</span>
            </button>
          </div>
        </div>

        <div className="bg-n800 border border-white/5 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2 px-2">
            <AlignLeft className="text-accent w-5 h-5" />
            <h4 className="text-[13px] font-black text-t1 uppercase tracking-widest">Layout Direction</h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => direction !== 'ltr' && toggleDirection()}
              className={`p-5 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${direction === 'ltr' ? 'border-accent bg-accent/5 text-accent shadow-lg shadow-accent/10' : 'border-white/5 bg-n900 text-t4 hover:border-white/10'}`}
            >
              <AlignLeft size={24} />
              <span className="text-[10px] font-black uppercase tracking-widest">Left to Right</span>
            </button>
            <button
              onClick={() => direction !== 'rtl' && toggleDirection()}
              className={`p-5 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${direction === 'rtl' ? 'border-accent bg-accent/5 text-accent shadow-lg shadow-accent/10' : 'border-white/5 bg-n900 text-t4 hover:border-white/10'}`}
            >
              <AlignRight size={24} />
              <span className="text-[10px] font-black uppercase tracking-widest">Right to Left</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
