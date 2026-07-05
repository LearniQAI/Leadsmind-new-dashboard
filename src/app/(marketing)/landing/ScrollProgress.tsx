'use client';

import React from 'react';
import { useScrollProgress } from './hooks';

export default function ScrollProgress() {
  const progress = useScrollProgress();

  return (
    <div className="fixed top-0 left-0 right-0 h-[3px] z-[70] bg-transparent">
      <div
        className="h-full bg-[linear-gradient(90deg,#4F46E5_0%,#7C3AED_50%,#0891B2_100%)] transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
