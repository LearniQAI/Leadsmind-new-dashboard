'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Lock, Eye, Star, Plus, Minus, Check } from 'lucide-react';
import { COURSE_THEMES } from '@/lib/courses/courseThemeTokens';
import { ThemeGlowWrap } from '@/components/courses/theme/ThemeSignature';

// EMBER — warm, energetic, human. Near-true-white page (NOT the cliché cream), fully
// rounded shape language, a rounded humanist display face, and the ONE signature move — a
// soft warm glow — used once, behind the hero video thumbnail, where the brief calls for it.
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

  // Merge database values with preview/override values
  const pageTitle = previewData?.title || course?.title || 'Course Title';
  const tagline = previewData?.tagline || course?.landing_page_settings?.tagline || 'Master this subject with our comprehensive training.';
  const outcomes = previewData?.outcomes || course?.landing_page_settings?.outcomes || [
    'Gain comprehensive knowledge of the core concepts',
    'Apply practical exercises to build real-world skills',
    'Get direct access to expert instructor insights',
    'Obtain a certificate of completion'
  ];

  const isSectionVisible = (secName: string) => {
    if (previewData?.visible_sections) {
      return !!previewData.visible_sections[secName];
    }
    return course?.landing_page_settings?.visible_sections?.[secName] !== false;
  };

  const instructorName = previewData?.instructor?.name || course?.landing_page_settings?.instructor?.name || 'Leadsmind Coach';
  const instructorBio = previewData?.instructor?.bio || course?.landing_page_settings?.instructor?.bio || 'Expert educator dedicated to teaching real-world skills.';
  const instructorAvatar = previewData?.instructor?.avatar_url || course?.landing_page_settings?.instructor?.avatar_url || '';

  const reviews = previewData?.reviews || course?.landing_page_settings?.reviews || [
    { name: 'Alex M.', rating: 5, text: 'This course was incredibly detailed and helpful!' },
    { name: 'Elena R.', rating: 4.8, text: 'Fantastic layout and clear voice instructions.' }
  ];

  const faqs = previewData?.faq || course?.landing_page_settings?.faq || [
    { question: 'When does the course start?', answer: 'It is a completely self-paced online course—you start and finish whenever you want.' },
    { question: 'Are there any prerequisites?', answer: 'No prior experience is necessary. We start from the absolute basics.' }
  ];

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

        {/* HERO SECTION */}
        {isSectionVisible('hero') && (
          <section className="text-center space-y-6">
            <h1 className={`text-4xl md:text-5xl ${theme.headingFontClass} ${theme.headingWeightClass} tracking-tight max-w-2xl mx-auto`}>
              {pageTitle}
            </h1>
            <p className="text-base max-w-xl mx-auto leading-relaxed" style={{ color: theme.pageTextSecondaryHex }}>
              {tagline}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <button
                onClick={handleEnroll}
                className={`w-full sm:w-auto text-white font-bold text-xs uppercase tracking-widest px-9 py-4 ${theme.landingRadiusClass} shadow-lg transition-transform hover:-translate-y-0.5`}
                style={{ background: theme.primaryHex, boxShadow: `0 12px 30px -12px ${theme.primaryHex}66` }}
              >
                Enroll in Course
              </button>
            </div>
            {course?.thumbnail_url && (
              <ThemeGlowWrap theme={theme} className="mt-8 max-w-2xl mx-auto">
                <div className={`overflow-hidden aspect-video ${theme.landingRadiusClass}`} style={{ background: theme.pageSurfaceHex, border: `1px solid ${theme.pageBorderHex}` }}>
                  <img src={course.thumbnail_url} alt={pageTitle} className="w-full h-full object-cover" />
                </div>
              </ThemeGlowWrap>
            )}
          </section>
        )}

        {/* OUTCOMES SECTION */}
        {isSectionVisible('outcomes') && outcomes.length > 0 && (
          <section className="space-y-6">
            <h2 className={`text-xl ${theme.headingFontClass} font-bold`}>What you will learn</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {outcomes.map((outcome: string, idx: number) => (
                <div key={idx} className={`flex items-start gap-3 p-4 ${theme.landingRadiusClass}`} style={{ background: theme.pageSurfaceHex, border: `1px solid ${theme.pageBorderHex}` }}>
                  <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: theme.pageSuccessHex }} />
                  <span className="text-xs leading-relaxed" style={{ color: theme.pageTextSecondaryHex }}>{outcome}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CURRICULUM SECTION */}
        {isSectionVisible('curriculum') && modules.length > 0 && (
          <section className="space-y-6">
            <h2 className={`text-xl ${theme.headingFontClass} font-bold`}>Course syllabus</h2>
            <div className="space-y-3">
              {modules.map((mod: any) => {
                const modLessons = lessons.filter(l => l.module_id === mod.id);
                const isExpanded = !!expandedModules[mod.id];
                return (
                  <div key={mod.id} className={`overflow-hidden ${theme.landingRadiusClass}`} style={{ background: theme.pageSurfaceHex, border: `1px solid ${theme.pageBorderHex}` }}>
                    <button
                      onClick={() => setExpandedModules(prev => ({ ...prev, [mod.id]: !prev[mod.id] }))}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-black/[0.02] transition-colors"
                    >
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: theme.primaryHex }}>Module</span>
                        <h3 className="text-sm font-semibold">{mod.title}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase" style={{ color: theme.pageTextSecondaryHex }}>{modLessons.length} lessons</span>
                        {isExpanded ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t" style={{ borderColor: theme.pageBorderHex }}>
                        {modLessons.length === 0 ? (
                          <div className="p-4 text-xs italic" style={{ color: theme.pageTextSecondaryHex }}>No lessons in this module yet.</div>
                        ) : (
                          modLessons.map((les: any) => (
                            <div key={les.id} className="p-3 px-4 flex items-center justify-between text-xs border-t" style={{ borderColor: theme.pageBorderHex }}>
                              <div className="flex items-center gap-2">
                                <BookOpen className="w-3.5 h-3.5" style={{ color: theme.pageTextSecondaryHex }} />
                                <span style={{ color: theme.pageTextPrimaryHex }}>{les.title}</span>
                              </div>
                              <div>
                                {les.is_preview ? (
                                  <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: `${theme.pageSuccessHex}1A`, color: theme.pageSuccessHex }}>
                                    <Eye className="w-2.5 h-2.5" /> Preview
                                  </span>
                                ) : (
                                  <Lock className="w-3.5 h-3.5" style={{ color: theme.pageTextSecondaryHex }} />
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

        {/* INSTRUCTOR SECTION */}
        {isSectionVisible('instructor') && (
          <section className={`p-6 flex flex-col md:flex-row items-center md:items-start gap-6 ${theme.landingRadiusClass}`} style={{ background: theme.pageSurfaceHex, border: `1px solid ${theme.pageBorderHex}` }}>
            {instructorAvatar ? (
              <img src={instructorAvatar} alt={instructorName} className="w-16 h-16 rounded-full object-cover shrink-0" style={{ border: `2px solid ${theme.primaryHex}55` }} />
            ) : (
              <div className="w-16 h-16 rounded-full flex items-center justify-center shrink-0 font-bold text-xl uppercase text-white" style={{ background: theme.primaryHex }}>
                {instructorName.charAt(0)}
              </div>
            )}
            <div className="space-y-2 text-center md:text-left">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: theme.primaryHex }}>Your Instructor</span>
              <h3 className={`text-base ${theme.headingFontClass} font-bold`}>{instructorName}</h3>
              <p className="text-xs leading-relaxed max-w-xl" style={{ color: theme.pageTextSecondaryHex }}>{instructorBio}</p>
            </div>
          </section>
        )}

        {/* REVIEWS SECTION */}
        {isSectionVisible('reviews') && reviews.length > 0 && (
          <section className="space-y-6">
            <h2 className={`text-xl ${theme.headingFontClass} font-bold`}>Student reviews</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map((rev: any, idx: number) => (
                <div key={idx} className={`p-4 space-y-2 ${theme.landingRadiusClass}`} style={{ background: theme.pageSurfaceHex, border: `1px solid ${theme.pageBorderHex}` }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">{rev.name}</span>
                    <div className="flex items-center gap-0.5">
                      <Star className="w-3 h-3" style={{ color: '#E8A33D', fill: '#E8A33D' }} />
                      <span className="text-[10px] font-bold" style={{ color: '#E8A33D' }}>{rev.rating}</span>
                    </div>
                  </div>
                  <p className="text-xs italic leading-relaxed" style={{ color: theme.pageTextSecondaryHex }}>"{rev.text}"</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PRICING & FAQ SECTION */}
        {isSectionVisible('pricing') && (
          <section className={`p-8 text-center space-y-4 ${theme.landingRadiusClass}`} style={{ background: `linear-gradient(135deg, ${theme.pageSurfaceHex}, #FFF3E8)`, border: `1px solid ${theme.pageBorderHex}` }}>
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: theme.primaryHex }}>Enrollment Access</span>
            <h3 className={`text-3xl ${theme.headingFontClass} font-bold`}>
              {course?.price ? `$${course.price}` : 'Free Access'}
            </h3>
            <p className="text-xs max-w-md mx-auto" style={{ color: theme.pageTextSecondaryHex }}>
              Get lifetime access to all core modules, expandable lessons, direct Q&A, and certification.
            </p>
            <button
              onClick={handleEnroll}
              className={`text-white font-bold text-xs uppercase tracking-widest px-9 py-4 ${theme.landingRadiusClass} shadow-lg transition-transform hover:-translate-y-0.5 mt-2`}
              style={{ background: theme.primaryHex }}
            >
              Get Instant Access
            </button>
          </section>
        )}

        {/* FAQ SECTION */}
        {isSectionVisible('faq') && faqs.length > 0 && (
          <section className="space-y-6">
            <h2 className={`text-xl ${theme.headingFontClass} font-bold`}>Frequently asked questions</h2>
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
                      {isActive ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    </button>
                    {isActive && (
                      <div className="p-4 pt-0 border-t text-xs leading-relaxed" style={{ borderColor: theme.pageBorderHex, color: theme.pageTextSecondaryHex }}>
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
