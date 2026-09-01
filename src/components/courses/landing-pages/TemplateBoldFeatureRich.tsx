'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Lock, Eye, Plus, Minus, CheckCircle2, Award } from 'lucide-react';
import { COURSE_THEMES } from '@/lib/courses/courseThemeTokens';
import { ThemeCompletionIcon } from '@/components/courses/theme/ThemeSignature';
import { getPricingView, getCourseFacts } from './landingHelpers';

// SIGNAL — sharp, high-contrast, feature-forward. Near-black page with white "stamped" cards
// (deliberately NOT dark-on-dark throughout), zero-radius shape language, a heavy grotesque
// display face, and the diagonal seal used at real completion moments only. Structure vs. the
// other two: a split slab hero, and a "WHAT'S INCLUDED" wall of big-number fact tiles built
// from REAL course data (module/lecture/preview counts, certificate) — concrete claims, not
// marketing fluff, and not a feature the other two templates have.
const theme = COURSE_THEMES.bold_feature_rich;

interface TemplateProps {
  course: any;
  modules: any[];
  lessons: any[];
  previewData?: any;
}

export default function TemplateBoldFeatureRich({ course, modules, lessons, previewData }: TemplateProps) {
  const router = useRouter();
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const settings = course?.landing_page_settings || {};

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

  // Real enrollment flow — see note in TemplateCleanMinimal. requireAuth() gate for
  // logged-out visitors is a known, out-of-scope gap for this pass.
  const handleEnroll = () => {
    if (course?.id) {
      // Public checkout — works for logged-out visitors (guest flow) and authenticated students.
      router.push(`/checkout/${course.id}`);
    }
  };

  const isCertificateOutcome = (o: string) => /certificat/i.test(o);

  // Concrete, real "what's included" tiles — every value comes from actual course data.
  const includeTiles = [
    facts.moduleCount ? { n: facts.moduleCount, label: facts.moduleCount === 1 ? 'MODULE' : 'MODULES' } : null,
    facts.lessonCount ? { n: facts.lessonCount, label: facts.lessonCount === 1 ? 'LECTURE' : 'LECTURES' } : null,
    facts.previewCount ? { n: facts.previewCount, label: 'FREE TO PREVIEW' } : null,
    facts.hasCertificate ? { n: '✓', label: 'CERTIFICATE OF COMPLETION' } : null,
  ].filter(Boolean) as { n: number | string; label: string }[];

  const SectionHead = ({ eyebrow, title }: { eyebrow: string; title: string }) => (
    <div className="space-y-1.5 border-l-4 pl-4" style={{ borderColor: theme.primaryHex }}>
      <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: theme.primaryHex }}>{eyebrow}</span>
      <h2 className={`text-2xl md:text-3xl ${theme.headingFontClass} ${theme.headingWeightClass} uppercase`} style={{ color: '#FFFFFF' }}>{title}</h2>
    </div>
  );

  return (
    <div
      className={`min-h-screen py-16 px-6 ${theme.bodyFontClass}`}
      style={{ background: theme.pageBgHex, color: theme.pageTextPrimaryHex }}
    >
      <div className="max-w-5xl mx-auto space-y-20">

        {/* HERO — split slab, white card overlapping the black page */}
        {isSectionVisible('hero') && (
          <section className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
            <div className="lg:col-span-7 p-10 space-y-6" style={{ background: theme.pageSurfaceHex, color: theme.pageTextPrimaryHex }}>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white" style={{ background: theme.primaryHex }}>
                {facts.hasCertificate ? 'Certified Course' : 'Flagship Course'}
              </span>
              <h1 className={`text-4xl md:text-[3.5rem] ${theme.headingFontClass} ${theme.headingWeightClass} tracking-tight uppercase leading-[0.98]`}>
                {pageTitle}
              </h1>
              {tagline && (
                <p className="text-sm md:text-base leading-relaxed max-w-xl" style={{ color: theme.pageTextSecondaryHex }}>{tagline}</p>
              )}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={handleEnroll}
                  className="text-white font-black text-xs uppercase tracking-widest px-10 py-4 transition-transform hover:-translate-y-0.5 active:scale-95"
                  style={{ background: theme.primaryHex }}
                >
                  {pricing.cta}
                </button>
                <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: theme.pageTextSecondaryHex }}>
                  {pricing.headline}{pricing.isFree ? '' : ` · ${pricing.modelLabel}`}
                </span>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="h-full min-h-[300px] overflow-hidden border-2 relative" style={{ borderColor: theme.primaryHex }}>
                {thumbnailUrl ? (
                  <img src={thumbnailUrl} alt={pageTitle} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: '#161617' }}>
                    <BookOpen size={48} style={{ color: theme.primaryHex }} />
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* WHAT'S INCLUDED — real-number fact tiles (Signal-only section) */}
        {isSectionVisible('outcomes') && (includeTiles.length > 0 || outcomes.length > 0) && (
          <section className="space-y-8">
            <SectionHead eyebrow="No fluff" title="What's Included" />
            {includeTiles.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: theme.pageBorderHex }}>
                {includeTiles.map((t, idx) => (
                  <div key={idx} className="p-6 text-center space-y-2" style={{ background: theme.pageSurfaceHex }}>
                    <div className={`text-4xl ${theme.headingFontClass} font-black tabular-nums`} style={{ color: theme.primaryHex }}>{t.n}</div>
                    <div className="text-[10px] font-black uppercase tracking-widest leading-tight" style={{ color: theme.pageTextSecondaryHex }}>{t.label}</div>
                  </div>
                ))}
              </div>
            )}
            {outcomes.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {outcomes.map((outcome, idx) => (
                  <div key={idx} className="flex items-start gap-4 p-5" style={{ background: theme.pageSurfaceHex }}>
                    {isCertificateOutcome(outcome)
                      ? <ThemeCompletionIcon theme={theme} size={16} />
                      : <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" style={{ color: theme.pageSuccessHex }} />}
                    <span className="text-xs md:text-sm font-medium leading-relaxed" style={{ color: theme.pageTextPrimaryHex }}>{outcome}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* CURRICULUM — real modules/lessons */}
        {isSectionVisible('curriculum') && modules.length > 0 && (
          <section className="space-y-8">
            <SectionHead eyebrow="The roadmap" title="Course Syllabus" />
            <div className="space-y-3">
              {modules.map((mod: any, index: number) => {
                const modLessons = lessons.filter((l) => l.module_id === mod.id);
                const isExpanded = !!expandedModules[mod.id];
                return (
                  <div key={mod.id} className="overflow-hidden" style={{ background: theme.pageSurfaceHex }}>
                    <button
                      onClick={() => setExpandedModules((prev) => ({ ...prev, [mod.id]: !prev[mod.id] }))}
                      className="w-full p-5 flex items-center justify-between text-left transition-colors hover:bg-black/[0.03]"
                    >
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: theme.primaryHex }}>MODULE {String(index + 1).padStart(2, '0')}</span>
                        <h3 className="text-base font-bold uppercase tracking-tight" style={{ color: theme.pageTextPrimaryHex }}>{mod.title}</h3>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black uppercase px-3 py-1" style={{ background: '#0B0B0C', color: '#FFFFFF' }}>{modLessons.length} LECTURE{modLessons.length === 1 ? '' : 'S'}</span>
                        {isExpanded ? <Minus className="w-4 h-4" style={{ color: theme.pageTextPrimaryHex }} /> : <Plus className="w-4 h-4" style={{ color: theme.pageTextPrimaryHex }} />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t" style={{ borderColor: theme.pageBorderHex }}>
                        {modLessons.length === 0 ? (
                          <div className="p-5 text-xs italic text-center" style={{ color: theme.pageTextSecondaryHex }}>No lectures in this module yet.</div>
                        ) : (
                          modLessons.map((les: any) => (
                            <div key={les.id} className="p-4 px-6 flex items-center justify-between text-xs border-t first:border-t-0" style={{ borderColor: theme.pageBorderHex }}>
                              <div className="flex items-center gap-3">
                                <BookOpen className="w-4 h-4" style={{ color: theme.pageTextSecondaryHex }} />
                                <span className="font-medium" style={{ color: theme.pageTextPrimaryHex }}>{les.title}</span>
                              </div>
                              {les.is_preview ? (
                                <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-3 py-1" style={{ background: theme.pageSuccessHex, color: '#FFFFFF' }}>
                                  <Eye className="w-3 h-3" /> Preview
                                </span>
                              ) : (
                                <Lock className="w-4 h-4" style={{ color: theme.pageTextSecondaryHex }} />
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
          <section className="p-8 flex flex-col md:flex-row items-center md:items-start gap-8" style={{ background: theme.pageSurfaceHex }}>
            {instructorAvatar ? (
              <img src={instructorAvatar} alt={instructorName} className="w-20 h-20 object-cover shrink-0" style={{ border: `2px solid ${theme.primaryHex}` }} />
            ) : (
              <div className="w-20 h-20 flex items-center justify-center shrink-0 text-white font-black text-2xl uppercase" style={{ background: theme.primaryHex }}>
                {instructorName.charAt(0)}
              </div>
            )}
            <div className="space-y-3 text-center md:text-left">
              <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 text-white inline-block" style={{ background: '#0B0B0C' }}>Instructor</span>
              <h3 className={`text-lg ${theme.headingFontClass} ${theme.headingWeightClass} uppercase mt-1`} style={{ color: theme.pageTextPrimaryHex }}>{instructorName}</h3>
              {instructorBio && (
                <p className="text-xs md:text-sm leading-relaxed max-w-2xl" style={{ color: theme.pageTextSecondaryHex }}>{instructorBio}</p>
              )}
            </div>
          </section>
        )}

        {/* REVIEWS — only real, admin-entered. Labelled honestly (no "verified" claim). */}
        {isSectionVisible('reviews') && reviews.length > 0 && (
          <section className="space-y-8">
            <SectionHead eyebrow="In their words" title="Student Feedback" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map((rev: any, idx: number) => (
                <div key={idx} className="p-6 space-y-4" style={{ background: theme.pageSurfaceHex }}>
                  <p className="text-xs md:text-sm italic leading-relaxed" style={{ color: theme.pageTextSecondaryHex }}>"{rev.text}"</p>
                  <div className="border-t pt-3 text-xs font-bold uppercase tracking-wider" style={{ borderColor: theme.pageBorderHex, color: theme.pageTextPrimaryHex }}>{rev.name}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PRICING — assertive solid-red slab */}
        {isSectionVisible('pricing') && (
          <section className="p-10 text-center space-y-6 max-w-3xl mx-auto" style={{ background: theme.primaryHex }}>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/85">
              {facts.hasCertificate && <Award className="w-3.5 h-3.5" />} {pricing.modelLabel}
            </span>
            <h3 className="text-5xl md:text-6xl font-black text-white">{pricing.headline}</h3>
            {pricing.qualifier && (
              <p className="text-xs md:text-sm text-white/85">{pricing.qualifier}</p>
            )}
            <div className="pt-2">
              <button
                onClick={handleEnroll}
                className="bg-white text-[#0B0B0C] font-black text-xs uppercase tracking-widest px-10 py-4 transition-transform hover:-translate-y-0.5 active:scale-95"
              >
                {pricing.cta}
              </button>
            </div>
          </section>
        )}

        {/* FAQ — only real */}
        {isSectionVisible('faq') && faqs.length > 0 && (
          <section className="space-y-8">
            <SectionHead eyebrow="Before you ask" title="Frequently Asked Questions" />
            <div className="space-y-3 max-w-3xl mx-auto">
              {faqs.map((faq: any, idx: number) => {
                const isActive = activeFaq === idx;
                return (
                  <div key={idx} className="overflow-hidden" style={{ background: theme.pageSurfaceHex }}>
                    <button
                      onClick={() => setActiveFaq(isActive ? null : idx)}
                      className="w-full p-5 flex items-center justify-between text-left text-xs md:text-sm font-bold uppercase transition-colors hover:bg-black/[0.03]"
                      style={{ color: theme.pageTextPrimaryHex }}
                    >
                      <span>{faq.question}</span>
                      {isActive ? <Minus className="w-4 h-4 shrink-0" /> : <Plus className="w-4 h-4 shrink-0" />}
                    </button>
                    {isActive && (
                      <div className="px-5 pb-5 -mt-1 text-xs md:text-sm leading-relaxed" style={{ color: theme.pageTextSecondaryHex }}>
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* CLOSING CTA — full-width red bar */}
        {isSectionVisible('pricing') && (
          <section className="text-center py-10 px-6 space-y-5" style={{ background: theme.primaryHex }}>
            <p className={`text-2xl md:text-3xl ${theme.headingFontClass} font-black uppercase text-white`}>Enroll today</p>
            <button
              onClick={handleEnroll}
              className="bg-white text-[#0B0B0C] font-black text-xs uppercase tracking-widest px-10 py-4 transition-transform hover:-translate-y-0.5 active:scale-95"
            >
              {pricing.cta}
            </button>
          </section>
        )}

      </div>
    </div>
  );
}
