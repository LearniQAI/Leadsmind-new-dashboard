'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateAiBriefArticle } from '@/app/actions/blogStudio';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import { Sparkles, ArrowLeft, Loader2, Key, Target, Clock, MessageSquare } from 'lucide-react';

export default function AiBriefClient() {
  const router = useRouter();
  const [keywords, setKeywords] = useState('');
  const [audienceCategory, setAudienceCategory] = useState('');
  const [targetLength, setTargetLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [keyPoints, setKeyPoints] = useState('');

  // Execution state
  const [isCompiling, setIsCompiling] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const steps = [
    'Staging parameters & outline...',
    'Loading workspace brand voice parameters...',
    'Injecting CRM settings & target audience profile...',
    'Expanding concepts via GPT-4o-mini intelligence...',
    'Formulating H2 structures & SA/UK spellings...',
    'Deploying draft post to database...'
  ];

  const handleBriefSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keywords.trim() || !keyPoints.trim()) return;

    setErrorMessage(null);
    setIsCompiling(true);
    setCurrentStep(0);

    // Step-by-step telemetry simulator to delight the writer
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < steps.length - 1) return prev + 1;
        return prev;
      });
    }, 1800);

    try {
      const res = await generateAiBriefArticle({
        keywords: keywords.trim(),
        audienceCategory: audienceCategory.trim() || 'General business audience',
        targetLength,
        keyPoints: keyPoints.trim()
      });

      clearInterval(stepInterval);

      if (res.error) throw new Error(res.error);

      if (res.data?.postId) {
        router.push(`/blog/editor/${res.data.postId}`);
      } else {
        router.push('/blog/manage');
      }
    } catch (err: any) {
      clearInterval(stepInterval);
      setErrorMessage(err.message || 'Brief generation aborted due to a pipeline mismatch.');
      setIsCompiling(false);
    }
  };

  return (
    <MetaData pageTitle="AI Brief Studio">
      <Wrapper>
        <div className="flex flex-col min-h-screen bg-[#04091a] text-white font-dm-sans py-12 px-6">
          <div className="max-w-3xl mx-auto w-full space-y-8 animate-fade-in">
            
            {/* Header Block */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => router.push('/blog/manage')} 
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="font-space-grotesk text-2xl font-bold text-white uppercase tracking-tight">
                  Brief <span className="text-primary">Studio</span>
                </h1>
                <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-semibold mt-0.5">
                  AI Brief-to-Article Specifications Wizard
                </p>
              </div>
            </div>

            {isCompiling ? (
              /* Progressive loading interface */
              <div className="bg-[#080f28] border border-white/10 rounded-2xl p-8 space-y-8 shadow-2xl text-center relative overflow-hidden my-12">
                <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                <div className="space-y-4">
                  <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <Sparkles className="w-5 h-5 text-blue-400 absolute animate-pulse" />
                  </div>
                  <h3 className="font-space-grotesk text-lg font-bold tracking-wider uppercase text-white animate-pulse">
                    Synthesizing Article Draft
                  </h3>
                </div>

                <div className="max-w-md mx-auto space-y-3">
                  {steps.map((stepText, idx) => {
                    const active = idx === currentStep;
                    const completed = idx < currentStep;
                    return (
                      <div 
                        key={idx} 
                        className={`flex items-center gap-3 text-left transition-all duration-500 text-xs ${
                          active ? 'text-primary font-bold scale-[1.01]' : completed ? 'text-emerald-400/70' : 'text-white/20'
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[8px] font-bold ${
                          active ? 'border-primary bg-primary/20 animate-pulse text-white' : completed ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : 'border-white/10 text-white/20'
                        }`}>
                          {completed ? '✓' : idx + 1}
                        </div>
                        <span>{stepText}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Specification form */
              <div className="bg-[#080f28] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                
                <form onSubmit={handleBriefSubmit} className="space-y-6">
                  {/* Keywords */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-1.5"><Key className="w-3.5 h-3.5" /> Focus Keywords</label>
                    <input
                      type="text"
                      value={keywords}
                      onChange={e => setKeywords(e.target.value)}
                      placeholder="e.g. lead nurturing, artificial intelligence, email campaign"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 outline-none focus:border-primary transition"
                      required
                    />
                  </div>

                  {/* Audience Category */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> Target Audience Segment</label>
                    <input
                      type="text"
                      value={audienceCategory}
                      onChange={e => setAudienceCategory(e.target.value)}
                      placeholder="e.g. startup founders, ecommerce marketers, enterprise tech officers"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 outline-none focus:border-primary transition"
                    />
                  </div>

                  {/* Length parameters */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Target Article Length</label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['short', 'medium', 'long'] as const).map(l => (
                        <button
                          key={l}
                          type="button"
                          onClick={() => setTargetLength(l)}
                          className={`border rounded-xl p-3 flex flex-col items-center gap-1.5 transition text-center capitalize ${
                            targetLength === l
                              ? 'border-primary bg-primary/10 text-white ring-2 ring-primary/20 scale-[1.02]'
                              : 'text-white/40 border-white/10 bg-white/5 hover:bg-white/10 hover:text-white/80'
                          }`}
                        >
                          <span className="text-xs font-bold">{l}</span>
                          <span className="text-[9px] uppercase tracking-wider opacity-60">
                            {l === 'short' ? '600-800 words' : l === 'medium' ? '800-1100 words' : '1100-1500 words'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Key Informational Points */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> Key Discussion Points</label>
                    <textarea
                      value={keyPoints}
                      onChange={e => setKeyPoints(e.target.value)}
                      placeholder="State the core details, arguments, or data points you want the AI to elaborate on..."
                      rows={5}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-white/30 outline-none focus:border-primary transition resize-none leading-relaxed"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-primary hover:bg-blue-600 text-white font-bold text-xs py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Sparkles className="w-4 h-4 fill-current" />
                    <span>Initialize AI Spec Generation</span>
                  </button>
                </form>

                {errorMessage && (
                  <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs">
                    {errorMessage}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}
