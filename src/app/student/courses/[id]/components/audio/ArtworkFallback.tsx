"use client";

import React from 'react';

interface ArtworkFallbackProps {
  gradientClass: string;
  className?: string;
}

// No admin-set artwork — a designed fallback (abstracted waveform motif over the course's own
// theme gradient) rather than a broken-image icon or a gray box.
export default function ArtworkFallback({ gradientClass, className = '' }: ArtworkFallbackProps) {
  const bars = [40, 65, 45, 80, 55, 90, 50, 70, 42, 60];
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${gradientClass} ${className}`}>
      <div className="absolute inset-0 flex items-center justify-center gap-[3px] opacity-40">
        {bars.map((h, i) => (
          <div key={i} className="w-[3px] rounded-full bg-white" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}
