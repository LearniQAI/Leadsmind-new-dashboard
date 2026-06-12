'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Play, Lock, Eye, Star, Plus, Minus, Users, MessageSquare } from 'lucide-react';

interface TemplateProps {
  course: any;
  modules: any[];
  lessons: any[];
  previewData?: any;
}

export default function TemplateCommunityCoaching({ course, modules, lessons, previewData }: TemplateProps) {
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
      router.push(`/student/checkout/${course.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-n900 text-t1 font-sans antialiased py-12 px-6">
      <div className="max-w-4xl mx-auto space-y-16">
        
        {/* HERO SECTION */}
        {isSectionVisible('hero') && (
          <section className="text-center space-y-6 pb-6">
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-[#8b5cf6] bg-[#8b5cf6]/10 border border-[#8b5cf6]/20">
                <Users size={12} /> Peer & Mentor Led
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-bold text-t1 tracking-tight max-w-3xl mx-auto leading-tight">
              Join Our Study Cohort: <span className="text-[#8b5cf6]">{pageTitle}</span>
            </h1>
            <p className="text-xs md:text-sm text-t2 max-w-xl mx-auto leading-relaxed">
              {tagline}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <button 
                onClick={handleEnroll}
                className="w-full sm:w-auto bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-bold text-xs uppercase tracking-widest px-8 py-3.5 rounded-xl shadow-lg transition-all"
              >
                Join Cohort & Course
              </button>
            </div>
            {course?.thumbnail_url && (
              <div className="mt-8 rounded-2xl overflow-hidden border border-white/5 bg-n800 aspect-video relative max-w-2xl mx-auto">
                <img 
                  src={course.thumbnail_url} 
                  alt={pageTitle}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </section>
        )}

        {/* OUTCOMES SECTION */}
        {isSectionVisible('outcomes') && outcomes.length > 0 && (
          <section className="space-y-6">
            <h2 className="text-lg font-display font-semibold text-t1 border-l-2 border-[#8b5cf6] pl-3">
              Cohort Outcomes & Focus Areas
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {outcomes.map((outcome: string, idx: number) => (
                <div key={idx} className="flex items-start gap-3 bg-n800 p-4 rounded-xl border border-white/5">
                  <div className="w-5 h-5 rounded-full bg-[#8b5cf6]/10 text-[#8b5cf6] flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">
                    {idx + 1}
                  </div>
                  <span className="text-xs text-t2 leading-relaxed">{outcome}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* INSTRUCTOR SECTION */}
        {isSectionVisible('instructor') && (
          <section className="bg-n800 border border-white/5 p-6 rounded-2xl flex flex-col md:flex-row items-center md:items-start gap-6">
            {instructorAvatar ? (
              <img 
                src={instructorAvatar} 
                alt={instructorName}
                className="w-16 h-16 rounded-full border border-white/10 object-cover shrink-0 bg-n700"
              />
            ) : (
              <div className="w-16 h-16 rounded-full border border-white/10 bg-n700 flex items-center justify-center shrink-0 text-t3 font-black text-xl uppercase font-display">
                {instructorName.charAt(0)}
              </div>
            )}
            <div className="space-y-2 text-center md:text-left">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8b5cf6]">Your Mentor & Coach</span>
              <h3 className="text-base font-display font-semibold text-t1">{instructorName}</h3>
              <p className="text-xs text-t2 leading-relaxed max-w-xl">{instructorBio}</p>
            </div>
          </section>
        )}

        {/* CURRICULUM SECTION */}
        {isSectionVisible('curriculum') && modules.length > 0 && (
          <section className="space-y-6">
            <h2 className="text-lg font-display font-semibold text-t1 border-l-2 border-[#8b5cf6] pl-3">
              Weekly Learning Path
            </h2>
            <div className="space-y-3">
              {modules.map((mod: any, index: number) => {
                const modLessons = lessons.filter(l => l.module_id === mod.id);
                const isExpanded = !!expandedModules[mod.id];
                return (
                  <div key={mod.id} className="bg-n800 border border-white/5 rounded-xl overflow-hidden transition-all">
                    <button 
                      onClick={() => setExpandedModules(prev => ({ ...prev, [mod.id]: !prev[mod.id] }))}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-n700/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b5cf6]">Week {index + 1}</span>
                        <h3 className="text-sm font-semibold text-t1">{mod.title}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-t3 font-bold uppercase">{modLessons.length} lessons</span>
                        {isExpanded ? <Minus className="w-3.5 h-3.5 text-t3" /> : <Plus className="w-3.5 h-3.5 text-t3" />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-white/5 divide-y divide-white/5 bg-n900/40">
                        {modLessons.length === 0 ? (
                          <div className="p-4 text-xs text-t3 italic">No lessons in this module yet.</div>
                        ) : (
                          modLessons.map((les: any) => (
                            <div key={les.id} className="p-3 px-4 flex items-center justify-between text-xs hover:bg-white/[0.02] transition-colors">
                              <div className="flex items-center gap-2">
                                <BookOpen className="w-3.5 h-3.5 text-t3" />
                                <span className="text-t2">{les.title}</span>
                              </div>
                              <div>
                                {les.is_preview ? (
                                  <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-green bg-green/10 px-2 py-0.5 rounded border border-green/20">
                                    <Eye className="w-2.5 h-2.5" /> Preview
                                  </span>
                                ) : (
                                  <Lock className="w-3.5 h-3.5 text-t4" />
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

        {/* REVIEWS SECTION */}
        {isSectionVisible('reviews') && reviews.length > 0 && (
          <section className="space-y-6">
            <h2 className="text-lg font-display font-semibold text-t1 border-l-2 border-[#8b5cf6] pl-3">
              Cohort Testimonials
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map((rev: any, idx: number) => (
                <div key={idx} className="bg-n800 border border-white/5 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-t1">{rev.name}</span>
                    <div className="flex items-center gap-0.5">
                      <Star className="w-3 h-3 text-amber fill-amber" />
                      <span className="text-[10px] text-amber font-bold">{rev.rating}</span>
                    </div>
                  </div>
                  <p className="text-xs text-t2 italic leading-relaxed">"{rev.text}"</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PRICING & FAQ SECTION */}
        {isSectionVisible('pricing') && (
          <section className="bg-gradient-to-br from-n800 to-n900 border border-white/10 p-8 rounded-2xl text-center space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8b5cf6]">Cohort Enrollment</span>
            <h3 className="text-3xl font-display font-bold text-t1">
              {course?.price ? `$${course.price}` : 'Free Access'}
            </h3>
            <p className="text-xs text-t2 max-w-md mx-auto">
              Get lifetime access to the curriculum, weekly group Q&A calls, study channels, and peer chat nodes.
            </p>
            <button 
              onClick={handleEnroll}
              className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-bold text-xs uppercase tracking-widest px-8 py-3.5 rounded-xl shadow-lg transition-all mt-2"
            >
              Get Cohort Pass
            </button>
          </section>
        )}

        {/* FAQ SECTION */}
        {isSectionVisible('faq') && faqs.length > 0 && (
          <section className="space-y-6">
            <h2 className="text-lg font-display font-semibold text-t1 border-l-2 border-[#8b5cf6] pl-3">
              Frequently Asked Questions
            </h2>
            <div className="space-y-3">
              {faqs.map((faq: any, idx: number) => {
                const isActive = activeFaq === idx;
                return (
                  <div key={idx} className="bg-n800 border border-white/5 rounded-xl overflow-hidden">
                    <button 
                      onClick={() => setActiveFaq(isActive ? null : idx)}
                      className="w-full p-4 flex items-center justify-between text-left text-xs font-semibold text-t1 hover:bg-n700/30 transition-colors"
                    >
                      <span>{faq.question}</span>
                      {isActive ? <Minus className="w-3.5 h-3.5 text-t3" /> : <Plus className="w-3.5 h-3.5 text-t3" />}
                    </button>
                    {isActive && (
                      <div className="p-4 pt-0 border-t border-white/5 text-xs text-t2 leading-relaxed">
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
