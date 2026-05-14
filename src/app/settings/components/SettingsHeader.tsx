"use client";
import React from 'react';

interface SettingsHeaderProps {
  title: string;
  description: string;
}

export default function SettingsHeader({ title, description }: SettingsHeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-n900/80 backdrop-blur-md px-8 py-6 border-b border-white/5 flex items-center justify-between">
      <div className="flex flex-col">
        <h3 className="text-[18px] font-space font-bold text-t1 uppercase tracking-tight">
          {title} <span className="text-accent2">Settings</span>
        </h3>
        <p className="text-[11px] text-t3 uppercase font-black tracking-widest mt-0.5">
          {description}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-t2 hover:text-t1 rounded-xl text-[11px] font-bold transition-all border border-white/5 uppercase tracking-widest">
          Need Help?
        </button>
      </div>
    </div>
  );
}
