'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen, Lock, Eye, Star, Plus, Minus, Check, ArrowRight, PlayCircle, Clock,
} from 'lucide-react';
import { getPricingView, getCourseFacts, formatDuration } from './landingHelpers';

// The single, theme-independent premium description page every course uses for its public
// marketing page (replacing the old per-course Clean/Bold/Cohort choice — see
// LandingPageRenderer). Fixed dark, high-contrast look on purpose: this page's identity does
// NOT come from the course's in-player theme (Signal/Ember/Grove, courseThemeTokens.ts),
// which is untouched and keeps applying inside the actual lesson player.
//
// Every section below either renders real LeadsMind data or is omitted outright — nothing
// here is a placeholder standing in for data this codebase doesn't have yet. See the
// per-section comments for exactly what was checked and why it is/isn't shown.

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

  // No real last-updated / rating basis check needed for this one — course.updated_at is a
  // real column written on every course edit.
  const lastUpdated = course?.updated_at
    ? new Date(course.updated_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  const curriculumSummaryParts = [
    facts.moduleCount ? `${facts.moduleCount} module${facts.moduleCount === 1 ? '' : 's'}` : null,
    facts.lessonCount ? `${facts.lessonCount} lesson${facts.lessonCount === 1 ? '' : 's'}` : null,
    // Only shown when EVERY lesson has a real time estimate (see getCourseFacts) — never a
    // partial sum passed off as the real total.
    facts.totalMinutes != null ? formatDuration(facts.totalMinutes) : null,
  ].filter(Boolean);

  const DESC_TRUNCATE_LEN = 400;
  const descIsLong = fullDescription.length > DESC_TRUNCATE_LEN;
  const descShown = !descIsLong || descExpanded ? fullDescription : fullDescription.slice(0, DESC_TRUNCATE_LEN) + '…';

  // ---- Purchase card (shared between the hero-side sticky card and the scroll-triggered
  // secondary bar) -------------------------------------------------------------------------
  const PurchaseCard = ({ compact = false }: { compact?: boolean }) => (
    <div
      className={compact ? 'flex items-center gap-4' : 'rounded-2xl overflow-hidden'}
      style={compact ? undefined : { background: '#121826', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* Video preview: omitted — there is no real per-course trailer/preview-video field in
          this schema (checked: no preview_video_url / intro_video_url / promo_video on
          courses). Showing a placeholder player here would fake a feature this platform
          doesn't have; a real preview-flagged LESSON is not the same thing as a course
          trailer, so it isn't substituted in either. */}
      {!compact && thumbnailUrl && (
        <div className="aspect-video relative overflow-hidden" style={{ background: '#1a2133' }}>
          <img src={thumbnailUrl} alt={pageTitle} className="w-full h-full object-cover" />
        </div>
      )}

      <div className={compact ? 'flex items-center gap-4' : 'p-6 space-y-4'}>
        <div className={compact ? 'flex items-baseline gap-2' : 'flex items-baseline gap-2'}>
          <span className={`font-bold text-white ${compact ? 'text-xl' : 'text-3xl'}`}>{pricing.headline}</span>
          {pricing.qualifier && <span className="text-xs text-white/50">{pricing.qualifier}</span>}
        </div>

        {/* Discount / strikethrough pricing: omitted — getPricingView has no sale-price or
            discount concept in this codebase today; showing a fake "was $X" would misstate
            the real price. */}

        {viewerState?.enrolled && viewerState.active ? (
          <button
            onClick={goToCourse}
            className="w-full inline-flex items-center justify-center gap-2 text-white font-bold text-sm px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 transition-colors"
          >
            <PlayCircle className="w-4 h-4" /> Continue Learning
          </button>
        ) : viewerState?.enrolled && !viewerState.active ? (
          <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 leading-relaxed">
            Your enrollment for this course is currently paused. Contact support to resolve access.
          </div>
        ) : (
          <button
            onClick={handleEnroll}
            className="w-full inline-flex items-center justify-center gap-2 text-white font-bold text-sm px-6 py-3.5 rounded-xl bg-primary hover:bg-primary/90 transition-colors"
          >
            {pricing.cta} <ArrowRight className="w-4 h-4" />
          </button>
        )}

        {!compact && (
          <>
            {curriculumSummaryParts.length > 0 && (
              <p className="text-[11px] text-white/40 text-center">{curriculumSummaryParts.join(' · ')}</p>
            )}
            {/* Trust-signal rows (money-back guarantee, "lifetime access" as a standalone
                policy line): omitted — there is no real, codified refund-window or access-
                duration policy setting on this platform to state as fact. The one place
                "lifetime access" already appears honestly is getPricingView's own one_time
                qualifier text above, which is real copy already shipped with that pricing
                model — nothing new invented here. */}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      {/* Secondary sticky header — appears once the hero sentinel scrolls out of view */}
      <div
        className={`fixed top-0 inset-x-0 z-40 border-b border-white/10 bg-[#0b0f1a]/95 backdrop-blur transition-transform duration-200 ${
          pastHero ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-6">
          <span className="text-sm font-bold truncate">{pageTitle}</span>
          <div className="w-64 shrink-0">
            <PurchaseCard compact />
          </div>
        </div>
      </div>

      {/* Both grid children span the full content height, so the sticky purchase card (a
          single child of this grid, not confined to a shorter hero-only row) genuinely
          tracks the scroll alongside the full left column — hero AND everything below it are
          one child here on purpose, not two auto-placed grid rows that would only keep the
          card "stuck" for the height of the (short) hero. */}
      <div className="max-w-6xl mx-auto px-6 py-14 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-12 items-start">
        {/* ---------------- LEFT COLUMN: hero + everything below it ---------------- */}
        <div className="space-y-14">
          <div className="space-y-8">
            {/* Category breadcrumb: omitted — no real course-category/taxonomy table exists
                (confirmed: no course_categories, no category field on courses). */}

            <div ref={heroSentinelRef} className="space-y-5">
              <h1 className="text-3xl md:text-4xl font-extrabold leading-tight tracking-tight">{pageTitle}</h1>
              {tagline && <p className="text-base text-white/60 leading-relaxed max-w-2xl">{tagline}</p>}

              {/* Achievement badges (Bestseller / Highest Rated): omitted — no real
                  enrollment-count or rating threshold exists anywhere in this codebase to
                  earn them against; a decorative badge with no basis would be a fabricated
                  claim. */}

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/50">
                {instructorName && (
                  <span>
                    Created by <span className="text-white font-semibold">{instructorName}</span>
                  </span>
                )}
                {/* No real per-instructor profile page exists to link to — the bio is
                    already inline below on this same page, so no link is added. */}
                {lastUpdated && (
                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Last updated {lastUpdated}</span>
                )}
                {/* Language: omitted — no real language/locale field is tracked on courses.
                    Rating summary: omitted here for the same reason as the badges above —
                    see the Reviews section below for what real review data does exist. */}
              </div>
            </div>
          </div>

          {/* ---------------- BELOW-HERO CONTENT ---------------- */}
          {isSectionVisible('outcomes') && outcomes.length > 0 && (
            <section className="space-y-6">
              <h2 className="text-xl font-bold">What you'll learn</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 bg-white/[0.03] border border-white/10 rounded-2xl p-6">
                {outcomes.map((o, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <Check className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                    <span className="text-sm text-white/80 leading-relaxed">{o}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {isSectionVisible('curriculum') && modules.length > 0 && (
            <section className="space-y-5">
              <div className="flex items-baseline justify-between flex-wrap gap-2">
                <h2 className="text-xl font-bold">Course content</h2>
                {curriculumSummaryParts.length > 0 && (
                  <span className="text-xs text-white/40">{curriculumSummaryParts.join(' · ')}</span>
                )}
              </div>
              <div className="rounded-2xl overflow-hidden border border-white/10 divide-y divide-white/10">
                {modules.map((mod: any, index: number) => {
                  const modLessons = lessons.filter((l) => l.module_id === mod.id);
                  const isExpanded = !!expandedModules[mod.id];
                  const modAllHaveEstimates =
                    modLessons.length > 0 && modLessons.every((l) => typeof l.time_estimate_minutes === 'number');
                  const modMinutes = modAllHaveEstimates
                    ? modLessons.reduce((s, l) => s + (l.time_estimate_minutes || 0), 0)
                    : null;
                  return (
                    <div key={mod.id} className="bg-white/[0.02]">
                      <button
                        onClick={() => setExpandedModules((prev) => ({ ...prev, [mod.id]: !prev[mod.id] }))}
                        className="w-full p-5 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors"
                      >
                        <div className="flex items-baseline gap-3">
                          <span className="text-xs font-bold tabular-nums text-primary">{String(index + 1).padStart(2, '0')}</span>
                          <h3 className="text-sm font-semibold">{mod.title}</h3>
                        </div>
                        <div className="flex items-center gap-3 text-white/50">
                          <span className="text-[11px]">
                            {modLessons.length} lecture{modLessons.length === 1 ? '' : 's'}
                            {modMinutes != null ? ` · ${formatDuration(modMinutes)}` : ''}
                          </span>
                          {isExpanded ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="border-t border-white/10">
                          {modLessons.length === 0 ? (
                            <div className="p-5 text-xs italic text-white/40">No lessons in this module yet.</div>
                          ) : (
                            modLessons.map((les: any) => (
                              <div key={les.id} className="py-3 px-5 flex items-center justify-between text-xs border-t border-white/10 first:border-t-0">
                                <div className="flex items-center gap-2.5">
                                  <BookOpen className="w-3.5 h-3.5 text-white/40" />
                                  <span className="text-white/80">{les.title}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  {typeof les.time_estimate_minutes === 'number' && (
                                    <span className="text-[10px] text-white/30">{formatDuration(les.time_estimate_minutes)}</span>
                                  )}
                                  {les.is_preview ? (
                                    // Real click-through (Course Start Methods, Method 3):
                                    // the student route now genuinely renders this exact
                                    // lesson read-only for an unenrolled visitor — see
                                    // student/courses/[id]/page.tsx's no-enrollment branch +
                                    // PreviewLessonClient. Closes the gap this comment used
                                    // to flag as still-open.
                                    <a
                                      href={`/preview/courses/${course.id}?lessonId=${les.id}`}
                                      className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
                                    >
                                      <Eye className="w-2.5 h-2.5" /> Preview
                                    </a>
                                  ) : (
                                    <Lock className="w-3.5 h-3.5 text-white/25" />
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
            <section className="space-y-5">
              <h2 className="text-xl font-bold">Requirements</h2>
              <ul className="space-y-2.5 list-disc list-inside text-sm text-white/70">
                {requirements.map((r, idx) => (
                  <li key={idx}>{r}</li>
                ))}
              </ul>
            </section>
          )}

          {fullDescription && (
            <section className="space-y-5">
              <h2 className="text-xl font-bold">Description</h2>
              <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">{descShown}</p>
              {descIsLong && (
                <button
                  onClick={() => setDescExpanded((v) => !v)}
                  className="text-sm font-bold text-primary hover:text-primary/80 flex items-center gap-1"
                >
                  {descExpanded ? 'Show less' : 'Show more'}
                  <Plus className={`w-3.5 h-3.5 transition-transform ${descExpanded ? 'rotate-45' : ''}`} />
                </button>
              )}
            </section>
          )}

          {isSectionVisible('instructor') && instructorName && (
            <section className="space-y-4">
              <span className="text-[11px] font-bold uppercase tracking-widest text-primary">Your instructor</span>
              <div className="flex flex-col sm:flex-row gap-5">
                {instructorAvatar ? (
                  <img src={instructorAvatar} alt={instructorName} className="w-16 h-16 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-full flex items-center justify-center shrink-0 font-bold text-xl uppercase text-white bg-primary">
                    {instructorName.charAt(0)}
                  </div>
                )}
                <div className="space-y-2">
                  <h3 className="text-lg font-bold">{instructorName}</h3>
                  {instructorBio && <p className="text-sm text-white/60 leading-relaxed">{instructorBio}</p>}
                </div>
              </div>
            </section>
          )}

          {/* Reviews: real, admin-authored testimonials with a real per-review star rating —
              NOT a computed aggregate. No average-rating / review-count number is shown
              anywhere on this page (hero metadata row above included) because this platform
              has no real aggregated review system yet — only admin-entered testimonial text. */}
          {isSectionVisible('reviews') && reviews.length > 0 && (
            <section className="space-y-6">
              <h2 className="text-xl font-bold">What students say</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {reviews.map((rev: any, idx: number) => (
                  <div key={idx} className="p-5 space-y-3 rounded-2xl bg-white/[0.03] border border-white/10">
                    <p className="text-sm text-white/80 leading-relaxed">"{rev.text}"</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white/60">{rev.name}</span>
                      {rev.rating != null && (
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-primary fill-primary" />
                          <span className="text-[11px] font-bold text-primary">{rev.rating}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {isSectionVisible('faq') && faqs.length > 0 && (
            <section className="space-y-5">
              <h2 className="text-xl font-bold">Frequently asked questions</h2>
              <div className="space-y-2.5">
                {faqs.map((faq: any, idx: number) => {
                  const isActive = activeFaq === idx;
                  return (
                    <div key={idx} className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
                      <button
                        onClick={() => setActiveFaq(isActive ? null : idx)}
                        className="w-full p-5 flex items-center justify-between text-left text-sm font-semibold hover:bg-white/[0.03] transition-colors"
                      >
                        <span>{faq.question}</span>
                        {isActive ? <Minus className="w-3.5 h-3.5 shrink-0" /> : <Plus className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                      {isActive && (
                        <div className="px-5 pb-5 -mt-1 text-sm text-white/60 leading-relaxed">{faq.answer}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* "Students also bought" / related courses: omitted entirely — no real category
              system or recommendation mechanism exists to base a real relationship on
              (confirmed alongside the breadcrumb check above). A hardcoded or randomly
              picked set of "related" courses would be fabricated, not real. */}
        </div>

        {/* ---------------- STICKY PURCHASE CARD ---------------- */}
        <div className="lg:sticky lg:top-8">
          <PurchaseCard />
        </div>
      </div>
    </div>
  );
}
