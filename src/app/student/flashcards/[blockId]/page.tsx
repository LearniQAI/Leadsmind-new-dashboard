import React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getFlashcardSet } from '@/app/actions/studentFlashcards';
import FlashcardSessionClient from './FlashcardSessionClient';

export const dynamic = 'force-dynamic';

export default async function FlashcardSessionPage({ params }: { params: { blockId: string } }) {
  const res = await getFlashcardSet(params.blockId);

  if ('error' in res) {
    return (
      <div className="mx-auto mt-20 max-w-md rounded-2xl border border-dash-border bg-white p-8 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <h1 className="font-display text-[16px] font-semibold !text-dash-text">
          Flashcard set unavailable
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed !text-dash-textMuted">{res.error}</p>
        <Link
          href="/student/flashcards"
          className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-dash-accent px-5 text-[13px] font-semibold text-white transition-colors hover:bg-dash-accent/90"
        >
          <ChevronLeft size={14} /> Back to flashcards
        </Link>
      </div>
    );
  }

  return <FlashcardSessionClient set={res.data} />;
}
