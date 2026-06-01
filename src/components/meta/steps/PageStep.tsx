'use client';

import React, { useState } from 'react';

interface PageStepProps {
  value: string;
  onChange: (val: string) => void;
}

export function PageStep({ value, onChange }: PageStepProps) {
  const [isOpen, setIsOpen] = useState(false);
  const options = [
    { name: "LeadsMind Retail Page", slug: "facebook.com/leadsmind-retail" },
    { name: "LeadsMind Support Page", slug: "facebook.com/leadsmind-support" }
  ];
  const displayVal = value || "Select a page...";

  return (
    <div className="flex flex-col gap-2 font-dm-sans">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-[#4a5a82]">
        FACEBOOK PAGE
      </label>

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full text-left bg-white/5 border border-white/7 hover:border-white/13 focus:border-[#2563eb] rounded-lg px-3.5 py-2.5 text-[13px] text-[#eef2ff] flex items-center justify-between transition-all outline-none"
        >
          <span>{displayVal}</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-[#4a5a82] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute z-20 mt-1.5 w-full bg-[#0c1538] border border-white/10 rounded-lg shadow-2xl overflow-hidden py-1 animate-in fade-in slide-in-from-top-1 duration-150">
            {options.map((opt) => (
              <div
                key={opt.name}
                onClick={() => {
                  onChange(opt.name);
                  setIsOpen(false);
                }}
                className="px-4 py-2.5 hover:bg-white/5 cursor-pointer transition-colors flex flex-col gap-0.5"
              >
                <span className="text-[13px] font-medium text-[#eef2ff]">{opt.name}</span>
                <span className="text-[11px] text-[#4a5a82]">{opt.slug}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[11px] text-[#4a5a82] leading-normal mt-1">
        Choose the Facebook Page you want to connect to the Unified Inbox.
      </p>
    </div>
  );
}
