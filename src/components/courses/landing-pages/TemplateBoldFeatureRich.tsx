'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Play, Lock, Eye, Star, Plus, Minus, CheckCircle2 } from 'lucide-react';
import { COURSE_THEMES } from '@/lib/courses/courseThemeTokens';
import { ThemeCompletionIcon } from '@/components/courses/theme/ThemeSignature';

// SIGNAL — sharp, high-contrast, serious. Near-black page with white "stamped" cards
// (deliberately NOT dark-on-dark throughout, which is what keeps this off the "near-black +
// one acid accent" cliché), zero-radius shape language, and the diagonal seal used once, at
// the one real completion-related moment a sales page has: the "Certificate of completion"
// outcome bullet.
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

  const isCertificateOutcome = (outcome: string) => /certificat/i.test(outcome);

  return (
    <div
      className={`min-h-screen py-16 px-6 ${theme.bodyFontClass}`}
      style={{ background: theme.pageBgHex, color: theme.pageTextPrimaryHex }}
    >
      <div className="max-w-5xl mx-auto space-y-20">

        {/* HERO SECTION — a stamped white card overlapping the black page */}
        {isSectionVisible('hero') && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-0 items-stretch">
            <div
              className={`lg:col-span-7 p-10 space-y-6 ${theme.landingRadiusClass}`}
              style={{ background: theme.pageSurfaceHex, color: theme.pageTextPrimaryHex }}
            >
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white"
                style={{ background: theme.primaryHex }}
              >
                Certified Course
              </span>
              <h1 className={`text-4xl md:text-5xl ${theme.headingFontClass} ${theme.headingWeightClass} tracking-tight uppercase leading-[1.02]`}>
                {pageTitle}
              </h1>
              <p className="text-sm md:text-base leading-relaxed max-w-xl" style={{ color: theme.pageTextSecondaryHex }}>
                {tagline}
              </p>
              <div className="pt-2">
                <button
                  onClick={handleEnroll}
                  className={`w-full sm:w-auto text-white font-black text-xs uppercase tracking-widest px-10 py-4 ${theme.landingRadiusClass} transition-transform hover:-translate-y-0.5 active:scale-95`}
                  style={{ background: theme.primaryHex }}
                >
                  Start Learning Now
                </button>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className={`h-full min-h-[280px] overflow-hidden border-2 relative`} style={{ borderColor: theme.primaryHex }}>
                {course?.thumbnail_url ? (
                  <img src={course.thumbnail_url} alt={pageTitle} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: '#161617' }}>
                    <BookOpen size={48} style={{ color: theme.primaryHex }} />
                  </div>
                )}
                <div
                  className="absolute bottom-0 left-0 right-0 py-2 text-center text-[10px] font-black uppercase tracking-widest text-white"
                  style={{ background: theme.primaryHex }}
                >
                  Preview
                </div>
              </div>
            </div>
          </section>
        )}

        {/* OUTCOMES SECTION */}
        {isSectionVisible('outcomes') && outcomes.length > 0 && (
          <section className="space-y-8">
            <div className="space-y-1.5 border-l-4 pl-4" style={{ borderColor: theme.primaryHex }}>
              <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: theme.primaryHex }}>Competency Checklist</span>
              <h2 className={`text-2xl md:text-3xl ${theme.headingFontClass} ${theme.headingWeightClass} uppercase`} style={{ color: '#FFFFFF' }}>What You Will Achieve</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {outcomes.map((outcome: string, idx: number) => (
                <div
                  key={idx}
                  className={`flex items-start gap-4 p-5 ${theme.landingRadiusClass}`}
                  style={{ background: theme.pageSurfaceHex }}
                >
                  {isCertificateOutcome(outcome) ? (
                    <ThemeCompletionIcon theme={theme} size={16} />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" style={{ color: theme.pageSuccessHex }} />
                  )}
                  <span className="text-xs md:text-sm font-medium leading-relaxed" style={{ color: theme.pageTextPrimaryHex }}>{outcome}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CURRICULUM SECTION */}
        {isSectionVisible('curriculum') && modules.length > 0 && (
          <section className="space-y-8">
            <div className="space-y-1.5 border-l-4 pl-4" style={{ borderColor: theme.primaryHex }}>
              <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: theme.primaryHex }}>Interactive Roadmap</span>
              <h2 className={`text-2xl md:text-3xl ${theme.headingFontClass} ${theme.headingWeightClass} uppercase`} style={{ color: '#FFFFFF' }}>Course Syllabus</h2>
            </div>
            <div className="space-y-3 max-w-4xl mx-auto">
              {modules.map((mod: any) => {
                const modLessons = lessons.filter(l => l.module_id === mod.id);
                const isExpanded = !!expandedModules[mod.id];
                return (
                  <div key={mod.id} className={`overflow-hidden`} style={{ background: theme.pageSurfaceHex }}>
                    <button
                      onClick={() => setExpandedModules(prev => ({ ...prev, [mod.id]: !prev[mod.id] }))}
                      className="w-full p-5 flex items-center justify-between text-left transition-colors hover:bg-black/[0.03]"
                    >
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: theme.primaryHex }}>MODULE {mod.position || ''}</span>
                        <h3 className="text-base font-bold uppercase tracking-tight" style={{ color: theme.pageTextPrimaryHex }}>{mod.title}</h3>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black uppercase px-3 py-1" style={{ background: '#0B0B0C', color: '#FFFFFF' }}>{modLessons.length} LECTURES</span>
                        {isExpanded ? <Minus className="w-4 h-4" style={{ color: theme.pageTextPrimaryHex }} /> : <Plus className="w-4 h-4" style={{ color: theme.pageTextPrimaryHex }} />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t" style={{ borderColor: theme.pageBorderHex }}>
                        {modLessons.length === 0 ? (
                          <div className="p-5 text-xs italic text-center" style={{ color: theme.pageTextSecondaryHex }}>No lectures populated in this module.</div>
                        ) : (
                          modLessons.map((les: any) => (
                            <div key={les.id} className="p-4 px-6 flex items-center justify-between text-xs border-t" style={{ borderColor: theme.pageBorderHex }}>
                              <div className="flex items-center gap-3">
                                <BookOpen className="w-4 h-4" style={{ color: theme.pageTextSecondaryHex }} />
                                <span className="font-medium" style={{ color: theme.pageTextPrimaryHex }}>{les.title}</span>
                              </div>
                              <div>
                                {les.is_preview ? (
                                  <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-3 py-1" style={{ background: theme.pageSuccessHex, color: '#FFFFFF' }}>
                                    <Eye className="w-3 h-3" /> Preview
                                  </span>
                                ) : (
                                  <Lock className="w-4 h-4" style={{ color: theme.pageTextSecondaryHex }} />
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
          <section className={`p-8 flex flex-col md:flex-row items-center md:items-start gap-8`} style={{ background: theme.pageSurfaceHex }}>
            {instructorAvatar ? (
              <img src={instructorAvatar} alt={instructorName} className="w-20 h-20 object-cover shrink-0" style={{ border: `2px solid ${theme.primaryHex}` }} />
            ) : (
              <div className="w-20 h-20 flex items-center justify-center shrink-0 text-white font-black text-2xl uppercase" style={{ background: theme.primaryHex }}>
                {instructorName.charAt(0)}
              </div>
            )}
            <div className="space-y-3 text-center md:text-left">
              <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 text-white inline-block" style={{ background: '#0B0B0C' }}>Mastermind Instructor</span>
              <h3 className={`text-lg ${theme.headingFontClass} ${theme.headingWeightClass} uppercase mt-1`} style={{ color: theme.pageTextPrimaryHex }}>{instructorName}</h3>
              <p className="text-xs md:text-sm leading-relaxed max-w-2xl" style={{ color: theme.pageTextSecondaryHex }}>{instructorBio}</p>
            </div>
          </section>
        )}

        {/* REVIEWS SECTION */}
        {isSectionVisible('reviews') && reviews.length > 0 && (
          <section className="space-y-8">
            <div className="space-y-1.5 border-l-4 pl-4" style={{ borderColor: theme.primaryHex }}>
              <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: theme.primaryHex }}>Student Validation</span>
              <h2 className={`text-2xl md:text-3xl ${theme.headingFontClass} ${theme.headingWeightClass} uppercase`} style={{ color: '#FFFFFF' }}>Verified Class Reviews</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map((rev: any, idx: number) => (
                <div key={idx} className="p-6 space-y-4" style={{ background: theme.pageSurfaceHex }}>
                  <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: theme.pageBorderHex }}>
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.pageTextPrimaryHex }}>{rev.name}</span>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5" style={{ color: theme.primaryHex, fill: i < Math.floor(rev.rating) ? theme.primaryHex : 'transparent' }} />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs md:text-sm italic leading-relaxed" style={{ color: theme.pageTextSecondaryHex }}>"{rev.text}"</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PRICING & FAQ SECTION */}
        {isSectionVisible('pricing') && (
          <section className="p-10 text-center space-y-6 max-w-3xl mx-auto" style={{ background: theme.primaryHex }}>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/80">Immediate Access</span>
            <h3 className="text-4xl md:text-5xl font-black text-white">
              {course?.price ? `$${course.price}` : 'Free Enrollment'}
            </h3>
            <p className="text-xs md:text-sm text-white/85 max-w-md mx-auto leading-relaxed">
              Unlock the entire curriculum instantly — video lessons, worksheets, cohort access, and certificate verification.
            </p>
            <div className="pt-2">
              <button
                onClick={handleEnroll}
                className="w-full sm:w-auto bg-white text-[#0B0B0C] font-black text-xs uppercase tracking-widest px-10 py-4 transition-transform hover:-translate-y-0.5 active:scale-95"
              >
                Get Instant Access
              </button>
            </div>
          </section>
        )}

        {/* FAQ SECTION */}
        {isSectionVisible('faq') && faqs.length > 0 && (
          <section className="space-y-8">
            <div className="space-y-1.5 border-l-4 pl-4" style={{ borderColor: theme.primaryHex }}>
              <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: theme.primaryHex }}>Support Matrix</span>
              <h2 className={`text-2xl md:text-3xl ${theme.headingFontClass} ${theme.headingWeightClass} uppercase`} style={{ color: '#FFFFFF' }}>Frequently Asked Questions</h2>
            </div>
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
                      {isActive ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </button>
                    {isActive && (
                      <div className="p-5 pt-0 border-t text-xs md:text-sm leading-relaxed" style={{ borderColor: theme.pageBorderHex, color: theme.pageTextSecondaryHex }}>
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
