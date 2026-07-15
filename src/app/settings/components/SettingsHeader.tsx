"use client";
import React from 'react';

interface SettingsHeaderProps {
  title: string;
  description: string;
}

export default function SettingsHeader({ title, description }: SettingsHeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-dash-bg/80 backdrop-blur-md px-8 py-6 border-b border-dash-border flex items-center justify-between">
      <div className="flex flex-col">
        <h3 className="text-[18px] font-bold !text-dash-text tracking-tight">
          {title} <span className="text-dash-accent">Settings</span>
        </h3>
        <p className="text-[11px] !text-dash-textMuted font-medium mt-0.5">
          {description}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button className="px-4 py-2 bg-dash-surface hover:bg-dash-border/60 !text-dash-textMuted hover:!text-dash-text rounded-xl text-[11px] font-bold transition-all motion-reduce:transition-none border border-dash-border">
          Need help?
        </button>
      </div>
    </div>
  );
}
