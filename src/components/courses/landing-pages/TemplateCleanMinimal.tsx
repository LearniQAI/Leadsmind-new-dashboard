'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Lock, Eye, Star, Plus, Minus, Check, ArrowRight } from 'lucide-react';
import { COURSE_THEMES } from '@/lib/courses/courseThemeTokens';
import { ThemeGlowWrap } from '@/components/courses/theme/ThemeSignature';
import { getPricingView, getCourseFacts } from './landingHelpers';

// EMBER — warm, minimal, spacious. Near-true-white page (NOT the cliché cream), fully
// rounded shape language, a rounded humanist display face, and the ONE signature move — a
// soft warm glow — used once, behind the hero image. Structure vs. the other two: a calm
// LEFT-ALIGNED editorial hero (not Bold's split slab, not Cohort's centered badge stack),
// generous vertical rhythm, and pricing shown as a single quiet line rather than a slab.
const theme = COURSE_THEMES.clean_minimal;

interface TemplateProps {
  course: any;
  modules: any[];
  lessons: any[];
  previewData?: any;
}

export default function TemplateCleanMinimal({ course, modules, lessons, previewData }: TemplateProps) {
  const router = useRouter();
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const settings = course?.landing_page_settings || {};

  // Real data only — no fabricated fallbacks. A section with no real content is not rendered
  // on the published page (the editor preview still shows section stubs via visible_sections).
  const pageTitle = previewData?.title || course?.title || 'Course title';
  const tagline = previewData?.tagline || settings.tagline || course?.description || '';
  const outcomes: string[] = previewData?.outcomes ?? settings.outcomes ?? [];
  const reviews: any[] = previewData?.reviews ?? settings.reviews ?? [];
  const faqs: any[] = previewData?.faq ?? settings.faq ?? [];

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

  // Real enrollment flow — /student/checkout/[courseId] runs the actual free-enroll or
  // Stripe Connect checkout. Known gap (out of scope this pass): the checkout page calls
  // requireAuth(), so a logged-out visitor is bounced to sign-in before paying.
  const handleEnroll = () => {
    if (course?.id) router.push(`/student/checkout/${course.id}`);
  };

  const curriculumSummary = [
    facts.moduleCount ? `${facts.moduleCount} module${facts.moduleCount === 1 ? '' : 's'}` : null,
    facts.lessonCount ? `${facts.lessonCount} lesson${facts.lessonCount === 1 ? '' : 's'}` : null,
    facts.previewCount ? `${facts.previewCount} free preview${facts.previewCount === 1 ? '' : 's'}` : null,
  ].filter(Boolean).join('  ·  ');

  return (
    <div
      className={`min-h-screen py-20 px-6 ${theme.bodyFontClass}`}
      style={{ background: theme.pageBgHex, color: theme.pageTextPrimaryHex }}
    >
      <div className="max-w-3xl mx-auto space-y-20">

        {/* HERO — left-aligned, calm, editorial */}
        {isSectionVisible('hero') && (
          <section className="space-y-7">
            <h1 className={`text-4xl md:text-[3.25rem] leading-[1.08] ${theme.headingFontClass} ${theme.headingWeightClass} tracking-tight`}>
              {pageTitle}
            </h1>
            {tagline && (
              <p className="text-lg leading-relaxed max-w-2xl" style={{ color: theme.pageTextSecondaryHex }}>
                {tagline}
              </p>
            )}

            {instructorName && (
              <div className="flex items-center gap-3">
                {instructorAvatar ? (
                  <img src={instructorAvatar} alt={instructorName} className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold uppercase" style={{ background: theme.primaryHex }}>
                    {instructorName.charAt(0)}
                  </div>
                )}
                <span className="text-sm" style={{ color: theme.pageTextSecondaryHex }}>
                  with <span className="font-semibold" style={{ color: theme.pageTextPrimaryHex }}>{instructorName}</span>
                </span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center gap-5 pt-1">
              <button
                onClick={handleEnroll}
                className={`inline-flex items-center justify-center gap-2 text-white font-bold text-sm px-8 py-4 ${theme.landingRadiusClass} transition-transform hover:-translate-y-0.5`}
                style={{ background: theme.primaryHex, boxShadow: `0 14px 34px -14px ${theme.primaryHex}80` }}
              >
                {pricing.cta} <ArrowRight className="w-4 h-4" />
              </button>
              {curriculumSummary && (
                <span className="text-xs" style={{ color: theme.pageTextSecondaryHex }}>{curriculumSummary}</span>
              )}
            </div>

            {thumbnailUrl && (
              <ThemeGlowWrap theme={theme} className="pt-6">
                <div className={`overflow-hidden aspect-video ${theme.landingRadiusClass}`} style={{ background: theme.pageSurfaceHex, border: `1px solid ${theme.pageBorderHex}` }}>
                  <img src={thumbnailUrl} alt={pageTitle} className="w-full h-full object-cover" />
                </div>
              </ThemeGlowWrap>
            )}
          </section>
        )}

        {/* OUTCOMES */}
        {isSectionVisible('outcomes') && outcomes.length > 0 && (
          <section className="space-y-7">
            <h2 className={`text-2xl ${theme.headingFontClass} font-bold`}>What you'll learn</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              {outcomes.map((outcome, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <Check className="w-4 h-4 mt-1 shrink-0" style={{ color: theme.primaryHex }} />
                  <span className="text-sm leading-relaxed" style={{ color: theme.pageTextSecondaryHex }}>{outcome}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CURRICULUM — real modules/lessons, live */}
        {isSectionVisible('curriculum') && modules.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-baseline justify-between">
              <h2 className={`text-2xl ${theme.headingFontClass} font-bold`}>Course syllabus</h2>
              {curriculumSummary && (
                <span className="text-xs hidden sm:block" style={{ color: theme.pageTextSecondaryHex }}>{curriculumSummary}</span>
              )}
            </div>
            <div className="space-y-2.5">
              {modules.map((mod: any, index: number) => {
                const modLessons = lessons.filter((l) => l.module_id === mod.id);
                const isExpanded = !!expandedModules[mod.id];
                return (
                  <div key={mod.id} className={`overflow-hidden ${theme.landingRadiusClass}`} style={{ background: theme.pageSurfaceHex, border: `1px solid ${theme.pageBorderHex}` }}>
                    <button
                      onClick={() => setExpandedModules((prev) => ({ ...prev, [mod.id]: !prev[mod.id] }))}
                      className="w-full p-5 flex items-center justify-between text-left hover:bg-black/[0.015] transition-colors"
                    >
                      <div className="flex items-baseline gap-3">
                        <span className="text-xs font-bold tabular-nums" style={{ color: theme.primaryHex }}>
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <h3 className="text-sm font-semibold">{mod.title}</h3>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px]" style={{ color: theme.pageTextSecondaryHex }}>{modLessons.length} lesson{modLessons.length === 1 ? '' : 's'}</span>
                        {isExpanded ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t" style={{ borderColor: theme.pageBorderHex }}>
                        {modLessons.length === 0 ? (
                          <div className="p-5 text-xs italic" style={{ color: theme.pageTextSecondaryHex }}>No lessons in this module yet.</div>
                        ) : (
                          modLessons.map((les: any) => (
                            <div key={les.id} className="py-3 px-5 flex items-center justify-between text-xs border-t first:border-t-0" style={{ borderColor: theme.pageBorderHex }}>
                              <div className="flex items-center gap-2.5">
                                <BookOpen className="w-3.5 h-3.5" style={{ color: theme.pageTextSecondaryHex }} />
                                <span style={{ color: theme.pageTextPrimaryHex }}>{les.title}</span>
                              </div>
                              {les.is_preview ? (
                                <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: `${theme.primaryHex}14`, color: theme.primaryHex }}>
                                  <Eye className="w-2.5 h-2.5" /> Preview
                                </span>
                              ) : (
                                <Lock className="w-3.5 h-3.5" style={{ color: theme.pageTextSecondaryHex }} />
                              )}
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

        {/* INSTRUCTOR — only when a real name is set */}
        {isSectionVisible('instructor') && instructorName && (
          <section className="space-y-4">
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: theme.primaryHex }}>Your instructor</span>
            <div className="flex flex-col sm:flex-row gap-6">
              {instructorAvatar ? (
                <img src={instructorAvatar} alt={instructorName} className="w-16 h-16 rounded-full object-cover shrink-0" style={{ border: `2px solid ${theme.primaryHex}44` }} />
              ) : (
                <div className="w-16 h-16 rounded-full flex items-center justify-center shrink-0 font-bold text-xl uppercase text-white" style={{ background: theme.primaryHex }}>
                  {instructorName.charAt(0)}
                </div>
              )}
              <div className="space-y-2">
                <h3 className={`text-lg ${theme.headingFontClass} font-bold`}>{instructorName}</h3>
                {instructorBio && (
                  <p className="text-sm leading-relaxed" style={{ color: theme.pageTextSecondaryHex }}>{instructorBio}</p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* REVIEWS — only real, admin-entered */}
        {isSectionVisible('reviews') && reviews.length > 0 && (
          <section className="space-y-7">
            <h2 className={`text-2xl ${theme.headingFontClass} font-bold`}>What students say</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {reviews.map((rev: any, idx: number) => (
                <div key={idx} className={`p-5 space-y-3 ${theme.landingRadiusClass}`} style={{ background: theme.pageSurfaceHex, border: `1px solid ${theme.pageBorderHex}` }}>
                  <p className="text-sm leading-relaxed" style={{ color: theme.pageTextPrimaryHex }}>"{rev.text}"</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold" style={{ color: theme.pageTextSecondaryHex }}>{rev.name}</span>
                    {rev.rating != null && (
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3" style={{ color: theme.primaryHex, fill: theme.primaryHex }} />
                        <span className="text-[11px] font-bold" style={{ color: theme.primaryHex }}>{rev.rating}</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PRICING — a single quiet line, not a slab */}
        {isSectionVisible('pricing') && (
          <section className={`p-8 ${theme.landingRadiusClass}`} style={{ background: theme.pageSurfaceHex, border: `1px solid ${theme.pageBorderHex}` }}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: theme.primaryHex }}>{pricing.modelLabel}</span>
                <div className="flex items-baseline gap-2">
                  <span className={`text-4xl ${theme.headingFontClass} font-bold`}>{pricing.headline}</span>
                  {pricing.qualifier && (
                    <span className="text-xs" style={{ color: theme.pageTextSecondaryHex }}>{pricing.qualifier}</span>
                  )}
                </div>
              </div>
              <button
                onClick={handleEnroll}
                className={`inline-flex items-center justify-center gap-2 text-white font-bold text-sm px-8 py-4 shrink-0 ${theme.landingRadiusClass} transition-transform hover:-translate-y-0.5`}
                style={{ background: theme.primaryHex, boxShadow: `0 14px 34px -14px ${theme.primaryHex}80` }}
              >
                {pricing.cta} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </section>
        )}

        {/* FAQ — only real */}
        {isSectionVisible('faq') && faqs.length > 0 && (
          <section className="space-y-6">
            <h2 className={`text-2xl ${theme.headingFontClass} font-bold`}>Frequently asked questions</h2>
            <div className="space-y-2.5">
              {faqs.map((faq: any, idx: number) => {
                const isActive = activeFaq === idx;
                return (
                  <div key={idx} className={`overflow-hidden ${theme.landingRadiusClass}`} style={{ background: theme.pageSurfaceHex, border: `1px solid ${theme.pageBorderHex}` }}>
                    <button
                      onClick={() => setActiveFaq(isActive ? null : idx)}
                      className="w-full p-5 flex items-center justify-between text-left text-sm font-semibold hover:bg-black/[0.015] transition-colors"
                    >
                      <span>{faq.question}</span>
                      {isActive ? <Minus className="w-3.5 h-3.5 shrink-0" /> : <Plus className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                    {isActive && (
                      <div className="px-5 pb-5 -mt-1 text-sm leading-relaxed" style={{ color: theme.pageTextSecondaryHex }}>
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* CLOSING CTA — calm one-liner */}
        {isSectionVisible('pricing') && (
          <section className="text-center space-y-5 pt-4">
            <p className={`text-xl ${theme.headingFontClass} font-bold`}>Ready to start?</p>
            <button
              onClick={handleEnroll}
              className={`inline-flex items-center justify-center gap-2 text-white font-bold text-sm px-9 py-4 ${theme.landingRadiusClass} transition-transform hover:-translate-y-0.5`}
              style={{ background: theme.primaryHex, boxShadow: `0 14px 34px -14px ${theme.primaryHex}80` }}
            >
              {pricing.cta} <ArrowRight className="w-4 h-4" />
            </button>
          </section>
        )}

      </div>
    </div>
  );
}
