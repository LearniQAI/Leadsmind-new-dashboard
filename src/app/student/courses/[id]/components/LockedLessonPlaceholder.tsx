'use client';

import React from 'react';
import { BookOpen, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LockedLessonPlaceholderProps {
  activeLockReason: {
    type: string;
    diffDays?: number;
  };
  courseId: string;
  onUpgradeRedirect: () => void;
}

export default function LockedLessonPlaceholder({ 
  activeLockReason, 
  courseId,
  onUpgradeRedirect 
}: LockedLessonPlaceholderProps) {
  if (activeLockReason.type === 'paid_locked') {
    return (
      <div className="bg-[#080f28]/80 border border-white/5 p-12 rounded-2xl max-w-xl mx-auto text-center space-y-6 backdrop-blur-md shadow-2xl py-16 flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-[#2563eb]/10 border border-primary/20 text-primary rounded-full flex items-center justify-center animate-pulse">
          <BookOpen size={28} />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-space-grotesk font-black uppercase text-white tracking-tight">Unlock this lesson</h3>
          <p className="text-xs text-white/50 leading-relaxed max-w-sm">
            This lecture is reserved for premium tier members. Upgrade now to gain instant access.
          </p>
        </div>
        <Button
          onClick={onUpgradeRedirect}
          className="bg-primary hover:bg-primary/95 text-white rounded-xl uppercase tracking-wider text-[10px] font-black h-11 px-8 shadow-lg shadow-primary/20"
        >
          Redirect to Upgrade Checkout
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-[#080f28]/80 border border-white/5 p-12 rounded-2xl max-w-xl mx-auto text-center space-y-6 shadow-2xl py-16 flex flex-col items-center justify-center">
      <div className="w-16 h-16 bg-amber-500/10 border border-yellow-500/20 text-yellow-400 rounded-full flex items-center justify-center">
        <Clock size={28} />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-space-grotesk font-black uppercase text-white tracking-tight">Dripped Content Node</h3>
        <p className="text-xs text-white/50 leading-relaxed max-w-sm">
          This lesson is part of a scheduled drip syllabus feed. It will be released relative to your enrollment date.
        </p>
      </div>
      <div className="bg-[#111d47]/20 border border-white/5 rounded-xl px-6 py-3 text-sm font-mono font-black text-amber-400 uppercase tracking-widest">
        Unlocks in {activeLockReason.diffDays || 0} day{activeLockReason.diffDays === 1 ? '' : 's'}
      </div>
    </div>
  );
}
