import React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Layers, CircleCheck, Sparkles } from 'lucide-react';
import { getStudentFlashcardSets } from '@/app/actions/studentFlashcards';
import { DashCard, DashEmptyState } from '@/components/dashboard-ui';

export const dynamic = 'force-dynamic';

export default async function StudentFlashcardsPage() {
  const { data: sets } = await getStudentFlashcardSets();

  const totalCards = sets.reduce((n, s) => n + s.totalCards, 0);
  const totalKnown = sets.reduce((n, s) => n + s.known, 0);
  const totalDue = sets.reduce((n, s) => n + s.dueCount, 0);

  return (
    <div className="mx-auto max-w-4xl space-y-9">
      <header className="space-y-3 border-b border-dash-border pb-7">
        <nav className="flex items-center gap-2 text-[12px] font-medium tracking-tight !text-dash-textMuted">
          <Link
            href="/student"
            className="inline-flex items-center gap-0.5 transition-colors hover:!text-dash-text"
          >
            <ChevronLeft size={13} /> Dashboard
          </Link>
          <span className="!text-dash-border">/</span>
          <span className="font-semibold !text-dash-text">Flashcards</span>
        </nav>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-dash-accent" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] !text-dash-accent">
              Student portal
            </span>
          </div>
          <h1 className="font-display text-[30px] font-semibold leading-[1.08] tracking-[-0.02em] !text-dash-text md:text-[36px]">
            Flashcards
          </h1>
          <p className="text-[13px] leading-relaxed !text-dash-textMuted">
            Review flashcard sets from every course you&apos;re enrolled in. Mark each card
            &ldquo;Got it&rdquo; or &ldquo;Still learning&rdquo; — the ones you&apos;re still
            learning come back around sooner.
          </p>
        </div>
      </header>

      {sets.length > 0 ? (
        <>
          <section className="grid grid-cols-3 gap-4">
            {[
              { label: 'Flashcard sets', value: sets.length },
              { label: 'Cards learned', value: `${totalKnown}/${totalCards}` },
              { label: 'Cards due', value: totalDue },
            ].map((s) => (
              <DashCard key={s.label} padding="none" className="p-5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] !text-dash-textMuted">
                  {s.label}
                </span>
                <div className="mt-3 font-display text-[26px] font-semibold leading-none tracking-tight !text-dash-text">
                  {s.value}
                </div>
              </DashCard>
            ))}
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-dash-border pb-2.5">
              <h2 className="font-display text-[15px] font-semibold tracking-[-0.01em] !text-dash-text">
                Your sets
              </h2>
              <span className="text-[12px] font-medium !text-dash-textMuted">
                {sets.length} {sets.length === 1 ? 'set' : 'sets'}
              </span>
            </div>

            <DashCard padding="none" interactive={false}>
              <div className="divide-y divide-dash-border">
                {sets.map((s) => {
                  const done = s.known >= s.totalCards && s.totalCards > 0;
                  return (
                    <Link
                      key={s.blockId}
                      href={`/student/flashcards/${s.blockId}`}
                      className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-dash-surface/60"
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset [&_svg]:size-4.5 ${
                          done
                            ? 'bg-emerald-50 text-emerald-600 ring-emerald-500/15'
                            : 'bg-dash-accent/10 !text-dash-accent ring-dash-accent/15'
                        }`}
                      >
                        {done ? <CircleCheck /> : <Layers />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-semibold !text-dash-text">
                          {s.lessonTitle}
                        </div>
                        <div className="truncate text-[11.5px] !text-dash-textMuted">
                          {s.courseTitle} · {s.totalCards} cards
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-medium">
                          <span className="text-emerald-600">{s.known} learned</span>
                          <span className="!text-dash-textMuted">{s.learning} still learning</span>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${
                          s.dueCount > 0
                            ? 'bg-amber-50 text-amber-700 ring-amber-600/20'
                            : 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                        }`}
                      >
                        {s.dueCount > 0 ? `${s.dueCount} due` : 'All caught up'}
                      </span>
                      <ChevronRight size={15} className="shrink-0 !text-dash-textMuted" />
                    </Link>
                  );
                })}
              </div>
            </DashCard>
          </section>
        </>
      ) : (
        <DashCard padding="default" interactive={false} className="border-dashed">
          <DashEmptyState
            icon={Sparkles}
            title="No flashcard sets yet"
            description="When a course you're enrolled in includes a flashcard block, it will show up here for review."
          />
        </DashCard>
      )}
    </div>
  );
}
