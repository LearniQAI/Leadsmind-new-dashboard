'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, RotateCcw, Check, RefreshCw, PartyPopper } from 'lucide-react';
import { toast } from 'sonner';
import { DashCard } from '@/components/dashboard-ui';
import {
  recordFlashcardReview,
  type FlashcardSetDetail,
} from '@/app/actions/studentFlashcards';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function FlashcardSessionClient({ set }: { set: FlashcardSetDetail }) {
  const { blockId, cards, courseTitle, lessonTitle } = set;

  const reviewByIndex = useMemo(() => {
    const m = new Map<number, { status: 'learning' | 'known'; next_due_at: string | null }>();
    set.reviews.forEach((r) => m.set(r.card_index, { status: r.status, next_due_at: r.next_due_at }));
    return m;
  }, [set.reviews]);

  // A card is "due" if never reviewed, past its next_due_at, or still marked 'learning'.
  const buildQueue = useCallback(
    (mode: 'due' | 'all') => {
      const now = Date.now();
      const allIdx = cards.map((_, i) => i);
      if (mode === 'all') return shuffle(allIdx);
      const due = allIdx.filter((i) => {
        const r = reviewByIndex.get(i);
        if (!r) return true;
        if (r.status === 'learning') return true;
        return !r.next_due_at || new Date(r.next_due_at).getTime() <= now;
      });
      return shuffle(due.length > 0 ? due : allIdx);
    },
    [cards, reviewByIndex]
  );

  const [queue, setQueue] = useState<number[]>(() => buildQueue('due'));
  const [initialCount, setInitialCount] = useState(() => queue.length);
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [saving, setSaving] = useState(false);
  const requeuedOnce = useRef<Set<number>>(new Set());
  const gotIt = useRef<Set<number>>(new Set());
  const stillLearning = useRef<Set<number>>(new Set());
  const [tally, setTally] = useState<{ known: number; learning: number }>({
    known: set.reviews.filter((r) => r.status === 'known').length,
    learning: set.reviews.filter((r) => r.status === 'learning').length,
  });

  const done = pos >= queue.length;
  const currentIdx = done ? -1 : queue[pos];
  const seen = Math.min(pos + (done ? 0 : 1), initialCount);

  const restart = (mode: 'due' | 'all') => {
    const q = buildQueue(mode);
    requeuedOnce.current = new Set();
    gotIt.current = new Set();
    stillLearning.current = new Set();
    setQueue(q);
    setInitialCount(q.length);
    setPos(0);
    setFlipped(false);
  };

  const mark = async (status: 'learning' | 'known') => {
    if (done || currentIdx < 0 || saving) return;
    setSaving(true);
    const idx = currentIdx;
    const res = await recordFlashcardReview({ blockId, cardIndex: idx, status });
    setSaving(false);
    if ('error' in res) {
      toast.error(res.error);
      return;
    }
    setTally({ known: res.known, learning: res.learning });

    if (status === 'known') {
      gotIt.current.add(idx);
      stillLearning.current.delete(idx);
    } else {
      stillLearning.current.add(idx);
      // resurface once within this same session
      if (!requeuedOnce.current.has(idx)) {
        requeuedOnce.current.add(idx);
        setQueue((q) => [...q, idx]);
      }
    }
    setFlipped(false);
    setPos((p) => p + 1);
  };

  // Space / Enter flips; when flipped, arrows / 1-2 answer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done) return;
      if ((e.key === ' ' || e.key === 'Enter') && !flipped) {
        e.preventDefault();
        setFlipped(true);
      } else if (flipped && (e.key === 'ArrowRight' || e.key === '1')) {
        e.preventDefault();
        mark('known');
      } else if (flipped && (e.key === 'ArrowLeft' || e.key === '2')) {
        e.preventDefault();
        mark('learning');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped, done, currentIdx, saving]);

  return (
    <div className="mx-auto max-w-2xl space-y-7">
      <header className="space-y-3 border-b border-dash-border pb-6">
        <Link
          href="/student/flashcards"
          className="inline-flex items-center gap-0.5 text-[12px] font-medium tracking-tight !text-dash-textMuted transition-colors hover:!text-dash-text"
        >
          <ChevronLeft size={13} /> All flashcards
        </Link>
        <div className="space-y-1">
          <h1 className="font-display text-[22px] font-semibold tracking-[-0.01em] !text-dash-text">
            {lessonTitle}
          </h1>
          <p className="text-[12.5px] !text-dash-textMuted">
            {courseTitle} · {cards.length} cards · {tally.known} learned · {tally.learning} still
            learning
          </p>
        </div>
      </header>

      {done ? (
        <DashCard padding="none" interactive={false} className="p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-500/15 [&_svg]:size-6">
            <PartyPopper />
          </div>
          <h2 className="mt-4 font-display text-[18px] font-semibold !text-dash-text">
            Session complete
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed !text-dash-textMuted">
            You got <strong className="!text-dash-text">{gotIt.current.size}</strong>{' '}
            {gotIt.current.size === 1 ? 'card' : 'cards'} this session
            {stillLearning.current.size > 0 ? (
              <>
                {' '}
                and <strong className="!text-dash-text">{stillLearning.current.size}</strong> still
                need work — they&apos;ll be back sooner.
              </>
            ) : (
              '. Nice run.'
            )}
          </p>
          <p className="mt-3 text-[12px] !text-dash-textMuted">
            Overall: <strong className="text-emerald-600">{tally.known} learned</strong> ·{' '}
            {tally.learning} still learning ({cards.length} total)
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => restart('all')}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-dash-accent px-5 text-[12px] font-semibold text-white transition-colors hover:bg-dash-accent/90 [&_svg]:size-3.5"
            >
              <RefreshCw /> Review all again
            </button>
            <Link
              href="/student/flashcards"
              className="inline-flex h-10 items-center rounded-lg border border-dash-border bg-white px-5 text-[12px] font-semibold !text-dash-text transition-colors hover:bg-dash-surface"
            >
              Back to flashcards
            </Link>
          </div>
        </DashCard>
      ) : (
        <div className="space-y-5">
          {/* progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[12px] font-medium !text-dash-textMuted">
              <span>
                Card {seen} of {initialCount}
              </span>
              <span>
                {gotIt.current.size} got it · {stillLearning.current.size} learning
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-dash-surface">
              <div
                className="h-full rounded-full bg-dash-accent transition-all duration-300"
                style={{ width: `${initialCount ? (pos / initialCount) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* card */}
          <button
            type="button"
            onClick={() => !flipped && setFlipped(true)}
            className={`flex min-h-[280px] w-full flex-col items-center justify-center gap-3 rounded-2xl border bg-white p-8 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors ${
              flipped ? 'border-dash-accent/30' : 'cursor-pointer border-dash-border hover:border-dash-accent/30'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] !text-dash-accent">
              {flipped ? 'Answer' : 'Prompt'}
            </span>
            <p className="text-[17px] font-semibold leading-relaxed !text-dash-text">
              {flipped
                ? cards[currentIdx]?.back || '(no answer on this card)'
                : cards[currentIdx]?.front || '(no prompt on this card)'}
            </p>
            {!flipped && (
              <span className="pt-1 text-[11px] uppercase tracking-[0.14em] !text-dash-textMuted/70">
                Tap or press space to flip
              </span>
            )}
          </button>

          {/* actions */}
          {flipped ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => mark('learning')}
                disabled={saving}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 text-[13px] font-semibold text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-60 [&_svg]:size-4"
              >
                <RotateCcw /> Still learning
              </button>
              <button
                onClick={() => mark('known')}
                disabled={saving}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 text-[13px] font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60 [&_svg]:size-4"
              >
                <Check /> Got it
              </button>
            </div>
          ) : (
            <button
              onClick={() => setFlipped(true)}
              className="h-11 w-full rounded-lg bg-dash-accent text-[13px] font-semibold text-white transition-colors hover:bg-dash-accent/90"
            >
              Reveal answer
            </button>
          )}
        </div>
      )}
    </div>
  );
}
