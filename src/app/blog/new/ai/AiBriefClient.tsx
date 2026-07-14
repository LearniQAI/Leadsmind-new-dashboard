'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateAiBriefArticle } from '@/app/actions/blogStudio';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import { Sparkles, ArrowLeft, Loader2, Key, Target, Clock, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashFormField, DashInput, DashTextarea } from '@/components/dashboard-ui/FormField';

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
        <div className="flex flex-col min-h-screen bg-white py-12 px-6">
          <div className="max-w-3xl mx-auto w-full space-y-8 animate-in fade-in duration-300 motion-reduce:animate-none">

            {/* Header Block */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/blog/manage')}
                className="p-2 rounded-lg bg-dash-surface hover:bg-dash-border/60 !text-dash-textMuted hover:!text-dash-text transition-colors motion-reduce:transition-none"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-2xl font-bold !text-dash-text">
                  Brief <span className="text-dash-accent">studio</span>
                </h1>
                <p className="text-[10px] !text-dash-textMuted font-semibold mt-0.5">
                  AI brief-to-article specifications wizard
                </p>
              </div>
            </div>

            {isCompiling ? (
              /* Progressive loading interface */
              <DashCard padding="default" className="space-y-8 text-center relative overflow-hidden my-12">
                <div className="space-y-4">
                  <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                    <Loader2 className="w-12 h-12 text-dash-accent animate-spin motion-reduce:animate-none" />
                    <Sparkles className="w-5 h-5 text-dash-accent absolute animate-pulse motion-reduce:animate-none" />
                  </div>
                  <h3 className="text-lg font-bold !text-dash-text">
                    Synthesizing article draft
                  </h3>
                </div>

                <div className="max-w-md mx-auto space-y-3">
                  {steps.map((stepText, idx) => {
                    const active = idx === currentStep;
                    const completed = idx < currentStep;
                    return (
                      <div
                        key={idx}
                        className={cn(
                          "flex items-center gap-3 text-left transition-all duration-500 motion-reduce:transition-none text-xs",
                          active ? 'text-dash-accent font-bold' : completed ? 'text-green/80' : '!text-dash-textMuted opacity-50'
                        )}
                      >
                        <div className={cn(
                          "w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[8px] font-bold shrink-0",
                          active ? 'border-dash-accent bg-dash-accent/20 text-dash-accent animate-pulse motion-reduce:animate-none' : completed ? 'border-green bg-green/20 text-green' : 'border-dash-border !text-dash-textMuted'
                        )}>
                          {completed ? '✓' : idx + 1}
                        </div>
                        <span>{stepText}</span>
                      </div>
                    );
                  })}
                </div>
              </DashCard>
            ) : (
              /* Specification form */
              <DashCard padding="default" className="space-y-6">

                <form onSubmit={handleBriefSubmit} className="space-y-6">
                  {/* Keywords */}
                  <DashFormField label="Focus keywords" required>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold !text-dash-textMuted mb-1"><Key className="w-3.5 h-3.5" /></div>
                    <DashInput
                      type="text"
                      value={keywords}
                      onChange={e => setKeywords(e.target.value)}
                      placeholder="e.g. lead nurturing, artificial intelligence, email campaign"
                      required
                    />
                  </DashFormField>

                  {/* Audience Category */}
                  <DashFormField label="Target audience segment">
                    <DashInput
                      type="text"
                      value={audienceCategory}
                      onChange={e => setAudienceCategory(e.target.value)}
                      placeholder="e.g. startup founders, ecommerce marketers, enterprise tech officers"
                    />
                  </DashFormField>

                  {/* Length parameters */}
                  <DashFormField label="Target article length">
                    <div className="grid grid-cols-3 gap-3">
                      {(['short', 'medium', 'long'] as const).map(l => (
                        <button
                          key={l}
                          type="button"
                          onClick={() => setTargetLength(l)}
                          className={cn(
                            "border rounded-xl p-3 flex flex-col items-center gap-1.5 transition-colors motion-reduce:transition-none text-center capitalize",
                            targetLength === l
                              ? 'border-dash-accent bg-dash-accent/10 !text-dash-text'
                              : '!text-dash-textMuted border-dash-border bg-dash-surface hover:bg-dash-border/40 hover:!text-dash-text'
                          )}
                        >
                          <span className="text-xs font-bold">{l}</span>
                          <span className="text-[9px] opacity-70">
                            {l === 'short' ? '600-800 words' : l === 'medium' ? '800-1100 words' : '1100-1500 words'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </DashFormField>

                  {/* Key Informational Points */}
                  <DashFormField label="Key discussion points" required>
                    <DashTextarea
                      value={keyPoints}
                      onChange={e => setKeyPoints(e.target.value)}
                      placeholder="State the core details, arguments, or data points you want the AI to elaborate on..."
                      rows={5}
                      className="resize-none leading-relaxed"
                      required
                    />
                  </DashFormField>

                  <DashButton type="submit" className="w-full justify-center">
                    <Sparkles className="w-4 h-4" />
                    <span>Initialize AI spec generation</span>
                  </DashButton>
                </form>

                {errorMessage && (
                  <div className="mt-4 p-4 bg-red/10 border border-red/20 text-red rounded-xl text-xs">
                    {errorMessage}
                  </div>
                )}
              </DashCard>
            )}

          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}
