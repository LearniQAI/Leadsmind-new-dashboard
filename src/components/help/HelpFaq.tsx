'use client';

import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FaqItem {
  q: string;
  a: string;
}

interface HelpFaqProps {
  faqItems: FaqItem[];
}

export default function HelpFaq({ faqItems }: HelpFaqProps) {
  const [openIndexes, setOpenIndexes] = useState<Record<number, boolean>>({});

  const toggleIndex = (index: number) => {
    setOpenIndexes(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  if (!faqItems || faqItems.length === 0) return null;

  return (
    <div className="space-y-3.5">
      <div className="flex items-center gap-2.5 mb-4">
        <HelpCircle className="w-5 h-5 text-dash-accent shrink-0" />
        <h3 className="text-lg font-bold !text-dash-text uppercase tracking-wider font-space-grotesk">Frequently Asked Questions</h3>
      </div>
      <div className="space-y-3">
        {faqItems.map((item, index) => {
          const isOpen = !!openIndexes[index];
          return (
            <div
              key={index}
              className="bg-dash-surface border border-dash-border rounded-xl overflow-hidden transition-all duration-250"
            >
              <button
                onClick={() => toggleIndex(index)}
                className="w-full flex items-center justify-between px-5 py-4 text-left font-bold !text-dash-text text-xs sm:text-sm hover:bg-white transition"
              >
                <span>{item.q}</span>
                <ChevronDown className={`w-4 h-4 !text-dash-textMuted shrink-0 transition-transform duration-250 ${isOpen ? 'rotate-180 !text-dash-accent' : ''}`} />
              </button>
              {isOpen && (
                <div className="px-5 pb-4.5 pt-1 border-t border-dash-border text-xs sm:text-sm !text-dash-textMuted leading-relaxed bg-white animate-fade-in">
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
