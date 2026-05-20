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
        <HelpCircle className="w-5 h-5 text-primary shrink-0" />
        <h3 className="text-lg font-bold text-white uppercase tracking-wider font-space-grotesk">Frequently Asked Questions</h3>
      </div>
      <div className="space-y-3">
        {faqItems.map((item, index) => {
          const isOpen = !!openIndexes[index];
          return (
            <div
              key={index}
              className="bg-[#080f28]/60 border border-white/5 rounded-xl overflow-hidden shadow-md transition-all duration-250"
            >
              <button
                onClick={() => toggleIndex(index)}
                className="w-full flex items-center justify-between px-5 py-4 text-left font-bold text-white text-xs sm:text-sm hover:bg-white/[0.02] transition"
              >
                <span>{item.q}</span>
                <ChevronDown className={`w-4 h-4 text-white/40 shrink-0 transition-transform duration-250 ${isOpen ? 'rotate-180 text-primary' : ''}`} />
              </button>
              {isOpen && (
                <div className="px-5 pb-4.5 pt-1 border-t border-white/[0.03] text-xs sm:text-sm text-white/60 leading-relaxed animate-fade-in">
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
