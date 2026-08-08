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
        <div className="flex items-center gap-1.5 text-[13px] font-medium">
          <span className="!text-dash-textMuted">Settings</span>
          <span className="!text-dash-textMuted opacity-50">/</span>
          <span className="!text-dash-text font-semibold">{title}</span>
        </div>
        <p className="text-[12px] !text-dash-textMuted mt-1">
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
