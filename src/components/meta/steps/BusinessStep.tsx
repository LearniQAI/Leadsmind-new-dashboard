'use client';

import React, { useState } from 'react';

interface BusinessStepProps {
  value: string;
  onChange: (val: string) => void;
}

export function BusinessStep({ value, onChange }: BusinessStepProps) {
  const [isOpen, setIsOpen] = useState(false);
  const options = ["LeadsMind Corporate Business", "GulfBridge Ventures"];
  const displayVal = value || "Select a business...";

  return (
    <div className="flex flex-col gap-2 font-dm-sans">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-[#4a5a82]">
        META BUSINESS PORTFOLIO
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
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                className="px-4 py-2.5 text-[13px] text-[#eef2ff]/90 hover:bg-white/5 hover:text-white cursor-pointer transition-colors"
              >
                {opt}
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[11px] text-[#4a5a82] leading-normal mt-1">
        This is your Meta Business Manager portfolio. All your Pages and WhatsApp accounts live inside it.
      </p>
    </div>
  );
}
