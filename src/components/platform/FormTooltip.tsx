'use client';

import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface FormTooltipProps {
  text: string;
}

export default function FormTooltip({ text }: FormTooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative inline-flex items-center ml-1.5 group select-none">
      <button
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        className="text-white/30 hover:text-primary transition-colors focus:outline-none"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {visible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 bg-[#060b1f] border border-white/15 text-white/80 text-[10px] sm:text-[11px] leading-relaxed rounded-xl shadow-2xl z-[2200] pointer-events-none animate-fade-in text-center font-dm-sans">
          <div className="font-light">{text}</div>
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1.5 border-4 border-transparent border-t-[#060b1f]" />
        </div>
      )}
    </div>
  );
}
