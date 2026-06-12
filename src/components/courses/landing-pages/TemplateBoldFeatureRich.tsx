'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Play, Lock, Eye, Star, Plus, Minus, CheckCircle2 } from 'lucide-react';

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
      router.push(`/student/checkout/${course.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#04091a] text-t1 font-sans antialiased py-16 px-6 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto space-y-20 relative">
        
        {/* HERO SECTION */}
        {isSectionVisible('hero') && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pb-12 border-b border-white/10">
            <div className="lg:col-span-7 space-y-6 text-left">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-accent2 bg-accent/10 border border-accent/20">
                ⭐ Premium Course Node
              </span>
              <h1 className="text-4xl md:text-6xl font-display font-black tracking-tight text-white uppercase leading-none">
                {pageTitle.split(' ').map((word: string, i: number) => (
                  <span key={i} className={i === 1 ? "text-accent2" : ""}>
                    {word}{' '}
                  </span>
                ))}
              </h1>
              <p className="text-sm md:text-base text-t2 font-medium leading-relaxed max-w-xl">
                {tagline}
              </p>
              <div className="pt-2">
                <button 
                  onClick={handleEnroll}
                  className="w-full sm:w-auto bg-gradient-to-r from-accent to-accent2 hover:opacity-95 text-white font-black text-xs uppercase tracking-widest px-10 py-4 rounded-xl shadow-xl shadow-accent/20 transition-all hover:-translate-y-0.5 active:scale-95"
                >
                  🚀 Start Learning Now
                </button>
              </div>
            </div>
            
            <div className="lg:col-span-5">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-accent to-purple rounded-2xl blur opacity-30 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
                <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-n800 aspect-video shadow-2xl">
                  {course?.thumbnail_url ? (
                    <img 
                      src={course.thumbnail_url} 
                      alt={pageTitle}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#0c1535] flex items-center justify-center">
                      <BookOpen size={48} className="text-accent2 animate-pulse" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* OUTCOMES SECTION */}
        {isSectionVisible('outcomes') && outcomes.length > 0 && (
          <section className="space-y-8">
            <div className="text-center space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-accent2">Competency Checklist</span>
              <h2 className="text-2xl md:text-3xl font-display font-black text-white uppercase">What You Will Achieve</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {outcomes.map((outcome: string, idx: number) => (
                <div key={idx} className="flex items-start gap-4 bg-n800 border border-white/5 p-5 rounded-2xl hover:border-white/10 hover:bg-[#0c1535]/80 transition-all hover:-translate-y-0.5 shadow-lg">
                  <CheckCircle2 className="w-5 h-5 text-green mt-0.5 shrink-0" />
                  <span className="text-xs md:text-sm text-t2 font-medium leading-relaxed">{outcome}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CURRICULUM SECTION */}
        {isSectionVisible('curriculum') && modules.length > 0 && (
          <section className="space-y-8">
            <div className="text-center space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-purple">Interactive Roadmap</span>
              <h2 className="text-2xl md:text-3xl font-display font-black text-white uppercase">Course Syllabus</h2>
            </div>
            <div className="space-y-4 max-w-4xl mx-auto">
              {modules.map((mod: any) => {
                const modLessons = lessons.filter(l => l.module_id === mod.id);
                const isExpanded = !!expandedModules[mod.id];
                return (
                  <div key={mod.id} className="bg-n800 border border-white/10 rounded-2xl overflow-hidden shadow-xl transition-all">
                    <button 
                      onClick={() => setExpandedModules(prev => ({ ...prev, [mod.id]: !prev[mod.id] }))}
                      className="w-full p-5 flex items-center justify-between text-left hover:bg-[#0c1535] transition-all"
                    >
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-accent2">MODULE {mod.position || ''}</span>
                        <h3 className="text-base font-bold text-white uppercase tracking-tight">{mod.title}</h3>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-t3 font-black uppercase bg-n900/60 px-3 py-1 rounded-full border border-white/5">{modLessons.length} LECTURES</span>
                        {isExpanded ? <Minus className="w-4 h-4 text-white" /> : <Plus className="w-4 h-4 text-white" />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-white/5 divide-y divide-white/5 bg-[#04091a]/40">
                        {modLessons.length === 0 ? (
                          <div className="p-5 text-xs text-t3 italic text-center">No lectures populated in this module.</div>
                        ) : (
                          modLessons.map((les: any) => (
                            <div key={les.id} className="p-4 px-6 flex items-center justify-between text-xs hover:bg-white/[0.02] transition-colors">
                              <div className="flex items-center gap-3">
                                <BookOpen className="w-4 h-4 text-t3" />
                                <span className="text-t2 font-medium">{les.title}</span>
                              </div>
                              <div>
                                {les.is_preview ? (
                                  <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-green bg-green/10 px-3 py-1 rounded border border-green/20">
                                    <Eye className="w-3 h-3" /> Preview
                                  </span>
                                ) : (
                                  <Lock className="w-4 h-4 text-t4" />
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
          <section className="bg-gradient-to-r from-n800 to-[#0c1535] border border-white/10 p-8 rounded-3xl flex flex-col md:flex-row items-center md:items-start gap-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-2xl pointer-events-none" />
            {instructorAvatar ? (
              <img 
                src={instructorAvatar} 
                alt={instructorName}
                className="w-20 h-20 rounded-2xl border border-white/10 object-cover shrink-0 bg-n700 shadow-lg"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl border border-white/10 bg-n700 flex items-center justify-center shrink-0 text-white font-black text-2xl uppercase font-display shadow-lg">
                {instructorName.charAt(0)}
              </div>
            )}
            <div className="space-y-3 text-center md:text-left">
              <span className="text-[10px] font-black uppercase tracking-widest text-accent2 bg-accent/10 px-3 py-1 rounded-full border border-accent/20">Mastermind Instructor</span>
              <h3 className="text-lg font-display font-black text-white uppercase mt-1">{instructorName}</h3>
              <p className="text-xs md:text-sm text-t2 leading-relaxed max-w-2xl">{instructorBio}</p>
            </div>
          </section>
        )}

        {/* REVIEWS SECTION */}
        {isSectionVisible('reviews') && reviews.length > 0 && (
          <section className="space-y-8">
            <div className="text-center space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-accent2">Student Validation</span>
              <h2 className="text-2xl md:text-3xl font-display font-black text-white uppercase">Verified Class Reviews</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {reviews.map((rev: any, idx: number) => (
                <div key={idx} className="bg-n800 border border-white/5 p-6 rounded-2xl space-y-4 hover:border-white/10 hover:bg-[#0c1535]/80 transition-all shadow-lg relative">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">{rev.name}</span>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-3.5 h-3.5 ${i < Math.floor(rev.rating) ? 'text-amber fill-amber' : 'text-t4'}`} 
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs md:text-sm text-t2 italic leading-relaxed">"{rev.text}"</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PRICING & FAQ SECTION */}
        {isSectionVisible('pricing') && (
          <section className="bg-gradient-to-br from-[#0c1535] to-n800 border-2 border-accent/30 p-10 rounded-3xl text-center space-y-6 shadow-2xl relative overflow-hidden max-w-3xl mx-auto">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-accent2 to-transparent" />
            <span className="text-[10px] font-black uppercase tracking-widest text-amber">Immediate Access Node</span>
            <h3 className="text-4xl md:text-5xl font-display font-black text-white">
              {course?.price ? `$${course.price}` : 'Free Enrollment'}
            </h3>
            <p className="text-xs md:text-sm text-t2 max-w-md mx-auto leading-relaxed">
              Unlock the entire curriculum database node instantly. Contains video streams, worksheets, cohort sync channels, and certificate verification.
            </p>
            <div className="pt-2">
              <button 
                onClick={handleEnroll}
                className="w-full sm:w-auto bg-gradient-to-r from-accent to-accent2 hover:opacity-95 text-white font-black text-xs uppercase tracking-widest px-10 py-4 rounded-xl shadow-xl shadow-accent/20 transition-all hover:-translate-y-0.5 active:scale-95"
              >
                ⚡ Get Instant Access
              </button>
            </div>
          </section>
        )}

        {/* FAQ SECTION */}
        {isSectionVisible('faq') && faqs.length > 0 && (
          <section className="space-y-8">
            <div className="text-center space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-accent2">Support Matrix</span>
              <h2 className="text-2xl md:text-3xl font-display font-black text-white uppercase">Frequently Asked Questions</h2>
            </div>
            <div className="space-y-4 max-w-3xl mx-auto">
              {faqs.map((faq: any, idx: number) => {
                const isActive = activeFaq === idx;
                return (
                  <div key={idx} className="bg-n800 border border-white/5 rounded-2xl overflow-hidden shadow-md">
                    <button 
                      onClick={() => setActiveFaq(isActive ? null : idx)}
                      className="w-full p-5 flex items-center justify-between text-left text-xs md:text-sm font-bold text-white uppercase hover:bg-n700/30 transition-all"
                    >
                      <span>{faq.question}</span>
                      {isActive ? <Minus className="w-4 h-4 text-t3" /> : <Plus className="w-4 h-4 text-t3" />}
                    </button>
                    {isActive && (
                      <div className="p-5 pt-0 border-t border-white/5 text-xs md:text-sm text-t2 leading-relaxed bg-[#04091a]/30">
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
