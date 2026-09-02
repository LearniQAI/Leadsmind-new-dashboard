'use client';

import React from 'react';
import { BookOpen, Clock, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LockedLessonPlaceholderProps {
  activeLockReason: {
    type: string;
    message?: string;
    diffDays?: number;
    unlockAt?: string;
  };
  courseId: string;
  onUpgradeRedirect: () => void;
}

/**
 * Turns a drip unlock timestamp into calm, student-facing copy. "0 days remaining" must
 * never coexist with a locked state (see lock-utils): a lesson unlocking in a few hours
 * reads as "later today", the next calendar day as "tomorrow", anything further out as a
 * plain whole-day count.
 */
function formatUnlockTiming(unlockAt?: string, diffDays?: number): string {
  if (unlockAt) {
    const unlock = new Date(unlockAt);
    if (!Number.isNaN(unlock.getTime())) {
      const now = new Date();
      const startOfDay = (d: Date) =>
        new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const dayDiff = Math.round(
        (startOfDay(unlock) - startOfDay(now)) / (1000 * 60 * 60 * 24)
      );
      if (dayDiff <= 0) return 'It unlocks later today';
      if (dayDiff === 1) return 'It unlocks tomorrow';
      return `It unlocks in ${dayDiff} days`;
    }
  }
  if (typeof diffDays === 'number' && diffDays > 0) {
    return `It unlocks in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
  }
  return 'It unlocks soon';
}

/** Compact, quietly-styled inline notice — matches the restraint of the other lesson-body
 *  banners in the player rather than a full-width alarm card. */
function LockedRow({
  icon,
  primary,
  secondary,
}: {
  icon: React.ReactNode;
  primary: string;
  secondary?: string;
}) {
  return (
    <div className="mx-auto flex max-w-xl items-center gap-3 rounded-xl border border-dash-border bg-dash-surface/60 px-4 py-3.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-inset ring-dash-border [&_svg]:size-4">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold !text-dash-text">{primary}</p>
        {secondary && (
          <p className="mt-0.5 text-[12px] leading-relaxed !text-dash-textMuted">{secondary}</p>
        )}
      </div>
    </div>
  );
}

export default function LockedLessonPlaceholder({
  activeLockReason,
  courseId,
  onUpgradeRedirect,
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

  if (activeLockReason.type === 'dripped') {
    return (
      <LockedRow
        icon={<Clock />}
        primary="This lesson isn't available yet"
        secondary={`${formatUnlockTiming(activeLockReason.unlockAt, activeLockReason.diffDays)} — it's released gradually as you move through the course.`}
      />
    );
  }

  // coming_soon / prerequisite — reuse the reason's own friendly message.
  return (
    <LockedRow
      icon={<Lock />}
      primary="This lesson isn't available yet"
      secondary={activeLockReason.message || 'It unlocks a little later in the course.'}
    />
  );
}
