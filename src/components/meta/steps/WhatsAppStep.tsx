'use client';

import React, { useState } from 'react';

interface WhatsAppStepProps {
  mode: 'waba' | 'phone';
  value: string;
  onChange: (val: string) => void;
}

export function WhatsAppStep({ mode, value, onChange }: WhatsAppStepProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const wabaOptions = ["LeadsMind Retail WhatsApp", "LeadsMind Support Line"];
  const phoneOptions = [
    "+1 (555) 019-9999 — LeadsMind Retail",
    "+27 82 000 1234 — LeadsMind SA"
  ];

  const options = mode === 'waba' ? wabaOptions : phoneOptions;
  const label = mode === 'waba' ? "WHATSAPP BUSINESS ACCOUNT" : "WHATSAPP PHONE LINE";
  const displayVal = value || (mode === 'waba' ? "Select a WhatsApp account..." : "Select a phone line...");
  const helperText = mode === 'waba'
    ? "This is the WhatsApp Business Account registered under your Meta portfolio."
    : "This is the number your customers will message on WhatsApp.";

  return (
    <div className="flex flex-col gap-2 font-dm-sans">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-dash-textMuted">
        {label}
      </label>

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full text-left bg-dash-bg border border-dash-border hover:border-dash-accent/40 focus:border-dash-accent rounded-lg px-3.5 py-2.5 text-[13px] text-dash-text flex items-center justify-between transition-all outline-none"
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
            className={`text-dash-textMuted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute z-20 mt-1.5 w-full bg-dash-surface border border-dash-border rounded-lg shadow-xl overflow-hidden py-1 animate-in fade-in slide-in-from-top-1 duration-150">
            {options.map((opt) => (
              <div
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                className="px-4 py-2.5 text-[13px] text-dash-text hover:bg-dash-bg cursor-pointer transition-colors"
              >
                {opt}
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[11px] text-dash-textMuted leading-normal mt-1">
        {helperText}
      </p>
    </div>
  );
}
