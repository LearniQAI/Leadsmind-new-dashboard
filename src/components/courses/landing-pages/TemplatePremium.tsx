'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Lock, Eye, Star, ChevronDown, Check, PlayCircle } from 'lucide-react';
import { getPricingView, getCourseFacts, formatDuration } from './landingHelpers';

// The single public marketing / sales page every course uses (see LandingPageRenderer). This
// is the PUBLIC page only — the in-course player keeps its own Signal/Ember/Grove theming
// (courseThemeTokens.ts), untouched, elsewhere.
//
// Light, premium, brand-native look: LeadsMind's real palette (navy #0B1367 wordmark, royal
// blue #1359FF, and the logo's warm accent-dot gradient used once as a price underline) on a
// warm off-white page. Type is Space Grotesk (display) + DM Sans (body), both already loaded
// app-wide.
//
// Every section below renders real LeadsMind data or is omitted outright — nothing here is a
// placeholder for data this codebase doesn't have. The per-section comments say exactly what
// was checked and why it is / isn't shown.

const INK = '#0B1367'; // brand navy (wordmark)
const INK_SOFT = '#5A6478'; // secondary text
const PAPER = '#FBFAF7'; // warm page base
const LINE = '#E8E4DC'; // warm hairline
const BRAND = '#1359FF'; // royal blue — actions

interface ViewerState {
  /** Signed-in student's real, current enrolment for this course, if any. */
  enrolled: boolean;
  /** isEnrolmentActive() on that real enrolment row — false covers cancelled/suspended/expired. */
  active: boolean;
}

interface TemplateProps {
  course: any;
  modules: any[];
  lessons: any[];
  previewData?: any;
  /** null = not signed in, or signed in with no enrolment for this course. */
  viewerState?: ViewerState | null;
}

export default function TemplatePremium({ course, modules, lessons, previewData, viewerState = null }: TemplateProps) {
  const router = useRouter();
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const heroSentinelRef = useRef<HTMLDivElement>(null);

  const settings = course?.landing_page_settings || {};

  const pageTitle = previewData?.title || course?.title || 'Course title';
  const tagline = previewData?.tagline || settings.tagline || course?.description || '';
  const outcomes: string[] = previewData?.outcomes ?? settings.outcomes ?? [];
  const requirements: string[] = previewData?.requirements ?? settings.requirements ?? [];
  const reviews: any[] = previewData?.reviews ?? settings.reviews ?? [];
  const faqs: any[] = previewData?.faq ?? settings.faq ?? [];
  const fullDescription: string = course?.description || '';

  const instructorName = previewData?.instructor?.name ?? settings.instructor?.name ?? '';
  const instructorBio = previewData?.instructor?.bio ?? settings.instructor?.bio ?? '';
  const instructorAvatar = previewData?.instructor?.avatar_url ?? settings.instructor?.avatar_url ?? '';

  const thumbnailUrl = previewData?.thumbnail_url || course?.thumbnail_url || '';
  const facts = getCourseFacts(course, modules, lessons);
  const pricing = getPricingView(course, previewData);

  const isSectionVisible = (secName: string) => {
    if (previewData?.visible_sections) return !!previewData.visible_sections[secName];
    return settings.visible_sections?.[secName] !== false;
  };

  // Real enrollment/checkout logic, unchanged: /checkout/[courseId] is the one real public
  // flow (guest name+email or guest Stripe Checkout for a logged-out visitor; the existing
  // authenticated flow otherwise) — see src/app/checkout/[courseId]/page.tsx.
  const handleEnroll = () => {
    if (course?.id) router.push(`/checkout/${course.id}`);
  };
  const goToCourse = () => {
    if (course?.id) router.push(`/student/courses/${course.id}`);
  };

  useEffect(() => {
    const el = heroSentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => setPastHero(!entry.isIntersecting), { threshold: 0 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // course.updated_at is a real column written on every course edit.
  const lastUpdated = course?.updated_at
    ? new Date(course.updated_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  // Plain-language curriculum summary — no middle-dot metadata string. totalMinutes is only a
  // real number when EVERY lesson carries an estimate (see getCourseFacts); otherwise omitted.
  const summaryBits: string[] = [];
  if (facts.moduleCount) summaryBits.push(`${facts.moduleCount} module${facts.moduleCount === 1 ? '' : 's'}`);
  if (facts.lessonCount) summaryBits.push(`${facts.lessonCount} lesson${facts.lessonCount === 1 ? '' : 's'}`);
  if (facts.totalMinutes != null) summaryBits.push(`${formatDuration(facts.totalMinutes)} of material`);
  const summaryText =
    summaryBits.length === 0
      ? ''
      : summaryBits.length === 1
      ? summaryBits[0]
      : `${summaryBits.slice(0, -1).join(', ')} and ${summaryBits[summaryBits.length - 1]}`;

  const DESC_TRUNCATE_LEN = 400;
  const descIsLong = fullDescription.length > DESC_TRUNCATE_LEN;
  const descShown = !descIsLong || descExpanded ? fullDescription : fullDescription.slice(0, DESC_TRUNCATE_LEN) + '…';

  // ---- Purchase card — shared by the sticky hero-side card and the scrolled top bar -------
  const PurchaseCard = ({ compact = false, hideThumb = false }: { compact?: boolean; hideThumb?: boolean }) => {
    const cta = (
      <>
        {viewerState?.enrolled && viewerState.active ? (
          <button
            onClick={goToCourse}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            <PlayCircle className="h-4 w-4" /> Continue learning
          </button>
        ) : viewerState?.enrolled && !viewerState.active ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
            Your enrolment for this course is paused. Contact support to restore access.
          </div>
        ) : (
          <button
            onClick={handleEnroll}
            style={{ backgroundColor: INK }}
            className="inline-flex w-full items-center justify-center rounded-xl px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1359FF] focus-visible:ring-offset-2"
          >
            {pricing.cta}
          </button>
        )}
      </>
    );

    if (compact) {
      return (
        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="font-display text-xl font-bold" style={{ color: INK }}>
              {pricing.headline}
            </span>
          </div>
          <div className="min-w-[180px] flex-1">{cta}</div>
        </div>
      );
    }

    return (
      <div className="overflow-hidden rounded-2xl border bg-white shadow-[0_20px_50px_-20px_rgba(11,19,103,0.28)]" style={{ borderColor: LINE }}>
        {/* No per-course trailer/preview-video field exists in this schema (checked: no
            preview_video_url / intro_video_url / promo_video). The thumbnail is shown as a
            still, never dressed up as a video player. A preview-flagged LESSON is handled in
            the curriculum list below, not here. */}
        {thumbnailUrl && !hideThumb && (
          <div className="aspect-video overflow-hidden" style={{ background: PAPER }}>
            <img src={thumbnailUrl} alt={pageTitle} className="h-full w-full object-cover" />
          </div>
        )}

        <div className="space-y-4 p-6">
          <div className="space-y-1.5">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold" style={{ color: INK }}>
                {pricing.headline}
              </span>
            </div>
            <div className="h-[3px] w-12 rounded-full bg-gradient-to-r from-[#FF7A00] to-[#FF3CAC]" />
            {pricing.qualifier && (
              <p className="pt-1 text-[13px]" style={{ color: INK_SOFT }}>
                {pricing.qualifier}
              </p>
            )}
          </div>

          {cta}

          {/* Discount / "was $X" pricing: omitted — getPricingView has no sale-price concept
              in this codebase; a struck-through price would misstate the real one. */}

          {summaryText && (
            <p className="text-center text-[12px]" style={{ color: INK_SOFT }}>
              This course includes {summaryText}.
            </p>
          )}
          {/* Money-back-guarantee / standalone "lifetime access" policy lines: omitted — no
              real refund-window or access-duration policy setting exists to state as fact.
              getPricingView's own one_time qualifier ("one-time payment · lifetime access")
              is existing shipped copy tied to that pricing model and is left as-is. */}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen font-body" style={{ background: PAPER, color: INK }}>
      {/* Scrolled top bar — slides in once the hero title leaves the viewport */}
      <div
        className={`fixed inset-x-0 top-0 z-40 border-b bg-[#FBFAF7]/95 backdrop-blur transition-transform duration-200 ${
          pastHero ? 'translate-y-0' : '-translate-y-full'
        }`}
        style={{ borderColor: LINE }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-3">
          <span className="truncate font-display text-sm font-semibold" style={{ color: INK }}>
            {pageTitle}
          </span>
          <div className="hidden w-[360px] shrink-0 sm:block">
            <PurchaseCard compact />
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-12 px-6 pb-28 pt-14 lg:grid-cols-[1fr_380px] lg:pb-14">
        {/* ---------------- LEFT COLUMN: hero + everything below ---------------- */}
        <div className="space-y-14">
          <div ref={heroSentinelRef} className="space-y-5">
            {/* Category breadcrumb: omitted — no real course-category/taxonomy exists on the
                courses table to build one from. */}
            <h1 className="font-display text-[clamp(2rem,5vw,2.75rem)] font-bold leading-[1.1] tracking-tight" style={{ color: INK }}>
              {pageTitle}
            </h1>
            {tagline && (
              <p className="max-w-2xl text-lg leading-relaxed" style={{ color: INK_SOFT }}>
                {tagline}
              </p>
            )}

            {/* Bestseller / Highest-rated badges: omitted — no enrolment-count or rating
                threshold exists to earn them; a badge with no basis is a fabricated claim. */}

            <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-sm" style={{ color: INK_SOFT }}>
              {instructorName && (
                <span>
                  Created by <span className="font-semibold" style={{ color: INK }}>{instructorName}</span>
                </span>
              )}
              {lastUpdated && <span>Updated {lastUpdated}</span>}
              {/* Language / rating summary: omitted — no language field is tracked, and there
                  is no real aggregated rating anywhere in this codebase. */}
            </div>

            {/* Mobile only — the sticky bottom bar carries the price + CTA, so the hero just
                needs the qualifier and what's-included line for context. Desktop shows all of
                this in the sticky side card instead. */}
            <div className="space-y-1 pt-1 lg:hidden">
              {pricing.qualifier && (
                <p className="text-[14px] font-medium" style={{ color: INK }}>
                  {pricing.headline} — {pricing.qualifier}
                </p>
              )}
              {summaryText && (
                <p className="text-[13px]" style={{ color: INK_SOFT }}>
                  Includes {summaryText}.
                </p>
              )}
            </div>
          </div>

          {/* ---------------- BELOW-HERO CONTENT ---------------- */}
          {isSectionVisible('outcomes') && outcomes.length > 0 && (
            <section className="space-y-6">
              <h2 className="font-display text-[22px] font-semibold" style={{ color: INK }}>
                What you'll learn
              </h2>
              <div className="grid grid-cols-1 gap-x-8 gap-y-3.5 sm:grid-cols-2">
                {outcomes.map((o, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: BRAND }} />
                    <span className="text-[15px] leading-relaxed" style={{ color: INK_SOFT }}>
                      {o}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {isSectionVisible('curriculum') && modules.length > 0 && (
            <section className="space-y-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-[22px] font-semibold" style={{ color: INK }}>
                  Course content
                </h2>
                {summaryText && (
                  <span className="text-[13px]" style={{ color: INK_SOFT }}>
                    {summaryText}
                  </span>
                )}
              </div>
              <div className="divide-y overflow-hidden rounded-2xl border bg-white" style={{ borderColor: LINE }}>
                {modules.map((mod: any, index: number) => {
                  const modLessons = lessons.filter((l) => l.module_id === mod.id);
                  const isExpanded = !!expandedModules[mod.id];
                  const modAllHaveEstimates =
                    modLessons.length > 0 && modLessons.every((l) => typeof l.time_estimate_minutes === 'number');
                  const modMinutes = modAllHaveEstimates
                    ? modLessons.reduce((s, l) => s + (l.time_estimate_minutes || 0), 0)
                    : null;
                  return (
                    <div key={mod.id} style={{ borderColor: LINE }}>
                      <button
                        onClick={() => setExpandedModules((prev) => ({ ...prev, [mod.id]: !prev[mod.id] }))}
                        aria-expanded={isExpanded}
                        className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-[#FBFAF7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset"
                        style={{ ['--tw-ring-color' as any]: BRAND }}
                      >
                        <div className="flex items-baseline gap-3.5">
                          {/* Curriculum IS sequential, so module numbers stay — quiet navy
                              numerals, not accent chips. */}
                          <span className="font-display text-sm font-semibold tabular-nums" style={{ color: INK, opacity: 0.35 }}>
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <h3 className="text-[15px] font-semibold" style={{ color: INK }}>
                            {mod.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-3" style={{ color: INK_SOFT }}>
                          <span className="hidden text-[12px] sm:inline">
                            {modLessons.length} lesson{modLessons.length === 1 ? '' : 's'}
                            {modMinutes != null ? `, ${formatDuration(modMinutes)}` : ''}
                          </span>
                          <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="border-t" style={{ borderColor: LINE }}>
                          {modLessons.length === 0 ? (
                            <div className="p-5 text-[13px] italic" style={{ color: INK_SOFT }}>
                              No lessons in this module yet.
                            </div>
                          ) : (
                            modLessons.map((les: any) => (
                              <div
                                key={les.id}
                                className="flex items-center justify-between border-t px-5 py-3 text-[13px] first:border-t-0"
                                style={{ borderColor: LINE }}
                              >
                                <div className="flex items-center gap-2.5">
                                  <BookOpen className="h-3.5 w-3.5 shrink-0" style={{ color: INK_SOFT }} />
                                  <span style={{ color: INK_SOFT }}>{les.title}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  {typeof les.time_estimate_minutes === 'number' && (
                                    <span className="text-[11px]" style={{ color: INK_SOFT, opacity: 0.7 }}>
                                      {formatDuration(les.time_estimate_minutes)}
                                    </span>
                                  )}
                                  {les.is_preview ? (
                                    // Real read-only preview for an unenrolled visitor — see
                                    // student/courses/[id]/page.tsx no-enrollment branch +
                                    // PreviewLessonClient.
                                    <a
                                      href={`/preview/courses/${course.id}?lessonId=${les.id}`}
                                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors"
                                      style={{ color: BRAND, backgroundColor: 'rgba(19,89,255,0.1)' }}
                                    >
                                      <Eye className="h-2.5 w-2.5" /> Preview
                                    </a>
                                  ) : (
                                    <Lock className="h-3.5 w-3.5" style={{ color: INK_SOFT, opacity: 0.5 }} />
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {requirements.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-display text-[22px] font-semibold" style={{ color: INK }}>
                Requirements
              </h2>
              <ul className="list-inside list-disc space-y-2 text-[15px]" style={{ color: INK_SOFT }}>
                {requirements.map((r, idx) => (
                  <li key={idx}>{r}</li>
                ))}
              </ul>
            </section>
          )}

          {fullDescription && (
            <section className="space-y-4">
              <h2 className="font-display text-[22px] font-semibold" style={{ color: INK }}>
                About this course
              </h2>
              <p className="whitespace-pre-line text-[15px] leading-relaxed" style={{ color: INK_SOFT }}>
                {descShown}
              </p>
              {descIsLong && (
                <button
                  onClick={() => setDescExpanded((v) => !v)}
                  className="text-[14px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  style={{ color: BRAND }}
                >
                  {descExpanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </section>
          )}

          {isSectionVisible('instructor') && instructorName && (
            <section className="space-y-4">
              <h2 className="font-display text-[22px] font-semibold" style={{ color: INK }}>
                Instructor
              </h2>
              <div className="flex flex-col gap-5 sm:flex-row">
                {instructorAvatar ? (
                  <img
                    src={instructorAvatar}
                    alt={instructorName}
                    className="h-16 w-16 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full font-display text-xl font-bold uppercase text-white"
                    style={{ backgroundColor: INK }}
                  >
                    {instructorName.charAt(0)}
                  </div>
                )}
                <div className="space-y-1.5">
                  <h3 className="text-[17px] font-semibold" style={{ color: INK }}>
                    {instructorName}
                  </h3>
                  {/* Bio: shown only when the admin has actually set one in
                      landing_page_settings.instructor.bio — never fabricated. */}
                  {instructorBio && (
                    <p className="text-[15px] leading-relaxed" style={{ color: INK_SOFT }}>
                      {instructorBio}
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Reviews: real, admin-authored testimonials with a real per-review star rating —
              NOT a computed aggregate. No average-rating / review-count number appears
              anywhere on this page because there is no real aggregated review system yet. */}
          {isSectionVisible('reviews') && reviews.length > 0 && (
            <section className="space-y-6">
              <h2 className="font-display text-[22px] font-semibold" style={{ color: INK }}>
                What students say
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {reviews.map((rev: any, idx: number) => (
                  <div key={idx} className="space-y-3 rounded-2xl border bg-white p-5" style={{ borderColor: LINE }}>
                    <p className="text-[15px] leading-relaxed" style={{ color: INK_SOFT }}>
                      &ldquo;{rev.text}&rdquo;
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold" style={{ color: INK }}>
                        {rev.name}
                      </span>
                      {rev.rating != null && (
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3" style={{ color: '#FF8A00', fill: '#FF8A00' }} />
                          <span className="text-[12px] font-semibold" style={{ color: INK }}>
                            {rev.rating}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {isSectionVisible('faq') && faqs.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-display text-[22px] font-semibold" style={{ color: INK }}>
                Frequently asked questions
              </h2>
              <div className="divide-y overflow-hidden rounded-2xl border bg-white" style={{ borderColor: LINE }}>
                {faqs.map((faq: any, idx: number) => {
                  const isActive = activeFaq === idx;
                  return (
                    <div key={idx} style={{ borderColor: LINE }}>
                      <button
                        onClick={() => setActiveFaq(isActive ? null : idx)}
                        aria-expanded={isActive}
                        className="flex w-full items-center justify-between gap-4 p-5 text-left text-[15px] font-semibold transition-colors hover:bg-[#FBFAF7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset"
                        style={{ color: INK, ['--tw-ring-color' as any]: BRAND }}
                      >
                        <span>{faq.question}</span>
                        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isActive ? 'rotate-180' : ''}`} />
                      </button>
                      {isActive && (
                        <div className="px-5 pb-5 text-[15px] leading-relaxed" style={{ color: INK_SOFT }}>
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* "Students also bought" / related courses: omitted — no real category or
              recommendation mechanism exists; a hardcoded set would be fabricated. */}
        </div>

        {/* ---------------- STICKY PURCHASE CARD (desktop) ---------------- */}
        <div className="hidden lg:sticky lg:top-8 lg:block">
          <PurchaseCard />
        </div>
      </div>

      {/* ---------------- MOBILE: fixed bottom action bar ---------------- */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 px-5 py-3 backdrop-blur lg:hidden"
        style={{ borderColor: LINE }}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          <div className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="font-display text-lg font-bold" style={{ color: INK }}>
              {pricing.headline}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            {viewerState?.enrolled && viewerState.active ? (
              <button
                onClick={goToCourse}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              >
                <PlayCircle className="h-4 w-4" /> Continue learning
              </button>
            ) : viewerState?.enrolled && !viewerState.active ? (
              <span className="block text-center text-xs font-medium text-amber-700">Enrolment paused</span>
            ) : (
              <button
                onClick={handleEnroll}
                style={{ backgroundColor: INK }}
                className="inline-flex w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold text-white hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                {pricing.cta}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
