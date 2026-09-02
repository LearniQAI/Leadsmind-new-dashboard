'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Lock, Eye, Star, Plus, Minus, Users, ArrowRight } from 'lucide-react';
import { COURSE_THEMES } from '@/lib/courses/courseThemeTokens';
import { getPricingView } from './landingHelpers';

// GROVE — calm, natural, coaching & community-oriented. Pale sage-white page, a warm serif
// display face, organic/irregular-radius shape language. Structure vs. the other two: an
// instructor-forward personal hero (not a feature list) and honest self-paced framing. The
// branch signature is reused once as a growth-motif divider beneath the hero.
const theme = COURSE_THEMES.community_coaching;

interface TemplateProps {
  course: any;
  modules: any[];
  lessons: any[];
  previewData?: any;
}

// The Grove signature: a branching, vein-like divider evoking growth — used once, beneath the
// hero. Static (a sales page has no student progress to show).
function BranchDivider() {
  const forks = 5;
  return (
    <svg viewBox="0 0 200 20" preserveAspectRatio="none" className="w-full max-w-sm mx-auto h-5">
      <line x1="2" y1="10" x2="198" y2="10" stroke={theme.primaryHex} strokeOpacity="0.2" strokeWidth="2" strokeLinecap="round" />
      {Array.from({ length: forks }).map((_, i) => {
        const x = 2 + ((i + 1) / (forks + 1)) * 196;
        return (
          <line
            key={i}
            x1={x}
            y1="10"
            x2={x + (i % 2 === 0 ? -7 : 7)}
            y2={i % 2 === 0 ? '2' : '18'}
            stroke={theme.primaryHex}
            strokeOpacity={0.3}
            strokeWidth="2"
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

export default function TemplateCommunityCoaching({ course, modules, lessons, previewData }: TemplateProps) {
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
  const pricing = getPricingView(course, previewData);

  const isSectionVisible = (secName: string) => {
    if (previewData?.visible_sections) return !!previewData.visible_sections[secName];
    return settings.visible_sections?.[secName] !== false;
  };

  // Real enrollment flow — see the corrected note in TemplateCleanMinimal (Batch 10 / G15):
  // /checkout/[courseId] is the real, public, guest-capable route; the old requireAuth()
  // gate this comment used to flag belonged to a route that no longer exists.
  const handleEnroll = () => {
    if (course?.id) {
      // Public checkout — works for logged-out visitors (guest flow) and authenticated students.
      router.push(`/checkout/${course.id}`);
    }
  };

  return (
    <div
      className={`min-h-screen py-16 px-6 ${theme.bodyFontClass}`}
      style={{ background: theme.pageBgHex, color: theme.pageTextPrimaryHex }}
    >
      <div className="max-w-3xl mx-auto space-y-16">

        {/* HERO — personal, instructor-forward */}
        {isSectionVisible('hero') && (
          <section className="text-center space-y-6">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
              style={{ background: `${theme.primaryHex}14`, color: theme.primaryHex, border: `1px solid ${theme.primaryHex}33` }}
            >
              <Users size={12} /> Coaching &amp; community
            </span>
            <h1 className={`text-3xl md:text-5xl ${theme.headingFontClass} ${theme.headingWeightClass} tracking-tight leading-tight`}>
              {pageTitle}
            </h1>
            {tagline && (
              <p className="text-sm md:text-base max-w-xl mx-auto leading-relaxed" style={{ color: theme.pageTextSecondaryHex }}>{tagline}</p>
            )}

            {instructorName && (
              <div className="flex items-center justify-center gap-3">
                {instructorAvatar ? (
                  <img src={instructorAvatar} alt={instructorName} className="w-10 h-10 rounded-full object-cover" style={{ border: `2px solid ${theme.primaryHex}44` }} />
                ) : (
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold uppercase" style={{ background: theme.primaryHex }}>
                    {instructorName.charAt(0)}
                  </div>
                )}
                <span className="text-sm" style={{ color: theme.pageTextSecondaryHex }}>
                  Guided by <span className="font-semibold" style={{ color: theme.pageTextPrimaryHex }}>{instructorName}</span>
                </span>
              </div>
            )}

            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: theme.primaryHex }}>
              Self-paced — join any time and learn alongside the community
            </p>
            <BranchDivider />

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-1">
              <button
                onClick={handleEnroll}
                className={`inline-flex items-center gap-2 text-white font-bold text-sm px-9 py-4 ${theme.landingRadiusClass} shadow-md transition-transform hover:-translate-y-0.5`}
                style={{ background: theme.primaryHex }}
              >
                {pricing.cta} <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {thumbnailUrl && (
              <div className={`mt-8 overflow-hidden aspect-video relative max-w-2xl mx-auto ${theme.landingRadiusClass}`} style={{ background: theme.pageSurfaceHex, border: `1px solid ${theme.pageBorderHex}` }}>
                <img src={thumbnailUrl} alt={pageTitle} className="w-full h-full object-cover" />
              </div>
            )}
          </section>
        )}

        {/* INSTRUCTOR — placed high; this template is about the person */}
        {isSectionVisible('instructor') && instructorName && (
          <section className={`p-6 flex flex-col md:flex-row items-center md:items-start gap-6 ${theme.landingRadiusClass}`} style={{ background: theme.pageSurfaceHex, border: `1px solid ${theme.pageBorderHex}` }}>
            {instructorAvatar ? (
              <img src={instructorAvatar} alt={instructorName} className="w-16 h-16 rounded-full object-cover shrink-0" style={{ border: `2px solid ${theme.primaryHex}55` }} />
            ) : (
              <div className="w-16 h-16 rounded-full flex items-center justify-center shrink-0 font-bold text-xl uppercase text-white" style={{ background: theme.primaryHex }}>
                {instructorName.charAt(0)}
              </div>
            )}
            <div className="space-y-2 text-center md:text-left">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: theme.primaryHex }}>Your mentor &amp; coach</span>
              <h3 className={`text-base ${theme.headingFontClass} font-semibold`}>{instructorName}</h3>
              {instructorBio && (
                <p className="text-xs leading-relaxed max-w-xl" style={{ color: theme.pageTextSecondaryHex }}>{instructorBio}</p>
              )}
            </div>
          </section>
        )}

        {/* OUTCOMES */}
        {isSectionVisible('outcomes') && outcomes.length > 0 && (
          <section className="space-y-6">
            <h2 className={`text-lg ${theme.headingFontClass} font-semibold`}>What you'll work on together</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {outcomes.map((outcome, idx) => (
                <div key={idx} className={`flex items-start gap-3 p-4 ${theme.landingRadiusClass}`} style={{ background: theme.pageSurfaceHex, border: `1px solid ${theme.pageBorderHex}` }}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5" style={{ background: `${theme.primaryHex}1A`, color: theme.primaryHex }}>
                    {idx + 1}
                  </div>
                  <span className="text-xs leading-relaxed" style={{ color: theme.pageTextSecondaryHex }}>{outcome}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CURRICULUM — real modules/lessons */}
        {isSectionVisible('curriculum') && modules.length > 0 && (
          <section className="space-y-6">
            <h2 className={`text-lg ${theme.headingFontClass} font-semibold`}>Learning path</h2>
            <div className="space-y-3">
              {modules.map((mod: any, index: number) => {
                const modLessons = lessons.filter((l) => l.module_id === mod.id);
                const isExpanded = !!expandedModules[mod.id];
                return (
                  <div key={mod.id} className={`overflow-hidden ${theme.landingRadiusClass}`} style={{ background: theme.pageSurfaceHex, border: `1px solid ${theme.pageBorderHex}` }}>
                    <button
                      onClick={() => setExpandedModules((prev) => ({ ...prev, [mod.id]: !prev[mod.id] }))}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-black/[0.02] transition-colors"
                    >
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: theme.primaryHex }}>
                          Module {index + 1}
                        </span>
                        <h3 className="text-sm font-semibold">{mod.title}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase" style={{ color: theme.pageTextSecondaryHex }}>{modLessons.length} lesson{modLessons.length === 1 ? '' : 's'}</span>
                        {isExpanded ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t" style={{ borderColor: theme.pageBorderHex }}>
                        {modLessons.length === 0 ? (
                          <div className="p-4 text-xs italic" style={{ color: theme.pageTextSecondaryHex }}>No lessons in this module yet.</div>
                        ) : (
                          modLessons.map((les: any) => (
                            <div key={les.id} className="p-3 px-4 flex items-center justify-between text-xs border-t first:border-t-0" style={{ borderColor: theme.pageBorderHex }}>
                              <div className="flex items-center gap-2">
                                <BookOpen className="w-3.5 h-3.5" style={{ color: theme.pageTextSecondaryHex }} />
                                <span style={{ color: theme.pageTextPrimaryHex }}>{les.title}</span>
                              </div>
                              {les.is_preview ? (
                                <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: `${theme.pageSuccessHex}1A`, color: theme.pageSuccessHex }}>
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

        {/* REVIEWS — only real, admin-entered */}
        {isSectionVisible('reviews') && reviews.length > 0 && (
          <section className="space-y-6">
            <h2 className={`text-lg ${theme.headingFontClass} font-semibold`}>Community stories</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map((rev: any, idx: number) => (
                <div key={idx} className={`p-4 space-y-2 ${theme.landingRadiusClass}`} style={{ background: theme.pageSurfaceHex, border: `1px solid ${theme.pageBorderHex}` }}>
                  <p className="text-xs italic leading-relaxed" style={{ color: theme.pageTextSecondaryHex }}>"{rev.text}"</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">{rev.name}</span>
                    {rev.rating != null && (
                      <span className="flex items-center gap-0.5">
                        <Star className="w-3 h-3" style={{ color: theme.primaryHex, fill: theme.primaryHex }} />
                        <span className="text-[10px] font-bold" style={{ color: theme.primaryHex }}>{rev.rating}</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PRICING */}
        {isSectionVisible('pricing') && (
          <section className={`p-8 text-center space-y-4 ${theme.landingRadiusClass}`} style={{ background: `linear-gradient(135deg, ${theme.pageSurfaceHex}, #EFF3EA)`, border: `1px solid ${theme.pageBorderHex}` }}>
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: theme.primaryHex }}>{pricing.modelLabel}</span>
            <h3 className={`text-3xl ${theme.headingFontClass} font-bold`}>{pricing.headline}</h3>
            {pricing.qualifier && (
              <p className="text-xs max-w-md mx-auto" style={{ color: theme.pageTextSecondaryHex }}>{pricing.qualifier}</p>
            )}
            <button
              onClick={handleEnroll}
              className={`inline-flex items-center gap-2 text-white font-bold text-sm px-9 py-4 ${theme.landingRadiusClass} shadow-md transition-transform hover:-translate-y-0.5 mt-2`}
              style={{ background: theme.primaryHex }}
            >
              {pricing.cta} <ArrowRight className="w-4 h-4" />
            </button>
          </section>
        )}

        {/* FAQ — only real */}
        {isSectionVisible('faq') && faqs.length > 0 && (
          <section className="space-y-6">
            <h2 className={`text-lg ${theme.headingFontClass} font-semibold`}>Frequently asked questions</h2>
            <div className="space-y-3">
              {faqs.map((faq: any, idx: number) => {
                const isActive = activeFaq === idx;
                return (
                  <div key={idx} className={`overflow-hidden ${theme.landingRadiusClass}`} style={{ background: theme.pageSurfaceHex, border: `1px solid ${theme.pageBorderHex}` }}>
                    <button
                      onClick={() => setActiveFaq(isActive ? null : idx)}
                      className="w-full p-4 flex items-center justify-between text-left text-xs font-semibold hover:bg-black/[0.02] transition-colors"
                    >
                      <span>{faq.question}</span>
                      {isActive ? <Minus className="w-3.5 h-3.5 shrink-0" /> : <Plus className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                    {isActive && (
                      <div className="px-4 pb-4 -mt-1 text-xs leading-relaxed" style={{ color: theme.pageTextSecondaryHex }}>
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* CLOSING CTA */}
        {isSectionVisible('pricing') && (
          <section className="text-center space-y-4 pt-2">
            <p className={`text-xl ${theme.headingFontClass} font-semibold`}>Join the community</p>
            <button
              onClick={handleEnroll}
              className={`inline-flex items-center gap-2 text-white font-bold text-sm px-9 py-4 ${theme.landingRadiusClass} shadow-md transition-transform hover:-translate-y-0.5`}
              style={{ background: theme.primaryHex }}
            >
              {pricing.cta} <ArrowRight className="w-4 h-4" />
            </button>
          </section>
        )}

      </div>
    </div>
  );
}
