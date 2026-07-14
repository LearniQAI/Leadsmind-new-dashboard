'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { initializeYoutubeImportJob } from '@/app/actions/youtubeImport';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import { Youtube, ArrowLeft, Loader2, Play, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashFormField, DashInput } from '@/components/dashboard-ui/FormField';

type StepState = 'idle' | 'fetching' | 'transcribing' | 'generating' | 'completed' | 'failed';

export default function YoutubeImportClient() {
  const router = useRouter();
  const [videoUrl, setVideoUrl] = useState('');
  const [currentStep, setCurrentStep] = useState<StepState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl.trim()) return;

    setErrorMessage(null);
    setCurrentStep('fetching');

    try {
      // Step 2: Fetching Video Metadata & Initializing Job
      const res = await initializeYoutubeImportJob(videoUrl.trim());

      if (res.error) {
        setCurrentStep('failed');
        setErrorMessage(res.error);
        return;
      }

      // Step 5: Completed
      setCurrentStep('completed');

      // Delay routing briefly to let the user see the gorgeous success state!
      setTimeout(() => {
        if (res.data?.postId) {
          router.push(`/blog/editor/${res.data.postId}`);
        } else {
          router.push('/blog/manage');
        }
      }, 1800);

    } catch (err: any) {
      setCurrentStep('failed');
      setErrorMessage(err.message || 'The transformation pipeline encountered a critical system error.');
    }
  };

  const steps = [
    { key: 'fetching', label: 'Video metadata', desc: 'Fetching details & cover graphic' },
    { key: 'transcribing', label: 'Closed captions', desc: 'Stitching timestamped CC text' },
    { key: 'generating', label: 'AI restructuring', desc: 'Structuring post via GPT-4o-mini' }
  ];

  const getStepStatus = (stepKey: string) => {
    if (currentStep === 'failed') return 'failed';
    if (currentStep === 'completed') return 'completed';

    const currentIndex = steps.findIndex(s => s.key === currentStep);
    const stepIndex = steps.findIndex(s => s.key === stepKey);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  return (
    <MetaData pageTitle="YouTube Conversion Machine">
      <Wrapper>
        <div className="flex flex-col min-h-screen bg-white py-12 px-6">
          <div className="max-w-3xl mx-auto w-full space-y-8">

            {/* Header */}
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/blog/manage')} className="p-2 rounded-lg bg-dash-surface hover:bg-dash-border/60 !text-dash-textMuted hover:!text-dash-text transition-colors motion-reduce:transition-none">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-2xl font-bold !text-dash-text">
                  YouTube <span className="text-dash-accent">import</span>
                </h1>
                <p className="text-[10px] !text-dash-textMuted font-semibold mt-0.5">
                  Linguistic translation & automation engine
                </p>
              </div>
            </div>

            {currentStep === 'idle' ? (
              <DashCard padding="default" className="space-y-6 animate-in fade-in duration-300 motion-reduce:animate-none">

                <div className="space-y-2">
                  <h3 className="text-lg font-bold !text-dash-text flex items-center gap-2">
                    <Youtube className="w-5 h-5 text-red animate-pulse motion-reduce:animate-none" /> Conversion machine
                  </h3>
                  <p className="text-xs !text-dash-textMuted leading-relaxed">
                    Transform video assets into fully structured SEO insight articles. Our ingestion scanner extracts closed-captions, translates transcripts, and writes draft content within seconds.
                  </p>
                </div>

                <form onSubmit={handleImportSubmit} className="space-y-4">
                  <DashFormField label="YouTube video link">
                    <DashInput
                      type="url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      required
                    />
                  </DashFormField>

                  <DashButton type="submit" disabled={!videoUrl.trim()} className="w-full justify-center">
                    <Play className="w-4 h-4" /> Initialize conversion process
                  </DashButton>
                </form>

                {/* Info Card */}
                <div className="p-4 bg-dash-accent/5 border border-dash-accent/10 rounded-xl space-y-2">
                  <span className="text-[11px] font-bold text-dash-accent flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> South African spelling active
                  </span>
                  <p className="text-[11px] !text-dash-textMuted leading-relaxed font-semibold">
                    Linguistic constraints enforce SA/UK spellings natively (e.g. colour, organisation, optimised) to ensure regional local branding matches perfectly.
                  </p>
                </div>
              </DashCard>
            ) : (
              <DashCard padding="default" className="space-y-8 animate-in fade-in duration-300 motion-reduce:animate-none">

                <div className="text-center space-y-2">
                  <h3 className="text-lg font-bold !text-dash-text">
                    {currentStep === 'completed' ? 'Conversion successful!' : currentStep === 'failed' ? 'Import failed' : 'Orchestrating pipeline'}
                  </h3>
                  <p className="text-xs !text-dash-textMuted max-w-sm mx-auto leading-relaxed">
                    {currentStep === 'completed' ? 'Redirecting you to the editor workspace shortly...' : currentStep === 'failed' ? 'The background pipeline failed to complete.' : 'Please keep this browser window open while AI ingestion processes transcript details.'}
                  </p>
                </div>

                {/* Connected Pipeline Stepper */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-3 bg-dash-surface p-5 rounded-2xl border border-dash-border">
                  {steps.map((step, index) => {
                    const status = getStepStatus(step.key);
                    return (
                      <React.Fragment key={step.key}>
                        <div className="flex flex-col items-center text-center space-y-2 md:flex-1 relative">
                          <div className={cn(
                            "w-8 h-8 rounded-full border flex items-center justify-center transition-colors motion-reduce:transition-none duration-300",
                            status === 'completed'
                              ? 'bg-green/20 border-green text-green'
                              : status === 'active'
                              ? 'bg-dash-accent/20 border-dash-accent text-dash-accent animate-pulse motion-reduce:animate-none'
                              : status === 'failed'
                              ? 'bg-red/20 border-red text-red'
                              : 'bg-white border-dash-border !text-dash-textMuted'
                          )}>
                            {status === 'completed' ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : status === 'active' ? (
                              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
                            ) : (
                              <span className="text-[10px] font-bold">{index + 1}</span>
                            )}
                          </div>
                          <div>
                            <p className={cn("text-[10px] font-bold", status === 'active' ? 'text-dash-accent' : '!text-dash-textMuted')}>{step.label}</p>
                            <p className="text-[9px] !text-dash-textMuted opacity-70 mt-0.5">{step.desc}</p>
                          </div>
                        </div>
                        {index < steps.length - 1 && (
                          <div className={cn(
                            "hidden md:block w-8 h-[2px] self-center -mt-6 transition-colors motion-reduce:transition-none duration-500",
                            getStepStatus(steps[index + 1].key) === 'completed' || getStepStatus(steps[index + 1].key) === 'active'
                              ? 'bg-dash-accent'
                              : 'bg-dash-border'
                          )} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Error Box */}
                {currentStep === 'failed' && (
                  <div className="p-4 bg-red/10 border border-red/20 text-red rounded-xl space-y-2 animate-in fade-in duration-200 motion-reduce:animate-none flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold">Pipeline exception logged</p>
                      <p className="text-xs mt-0.5 !text-dash-textMuted">{errorMessage}</p>
                      <DashButton size="sm" variant="secondary" onClick={() => setCurrentStep('idle')} className="mt-3">Try another URL</DashButton>
                    </div>
                  </div>
                )}

                {/* Processing Spinner Details */}
                {currentStep !== 'completed' && currentStep !== 'failed' && (
                  <div className="flex justify-center items-center gap-2 text-xs !text-dash-textMuted font-semibold">
                    <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none text-dash-accent" />
                    <span>Synchronising API streams...</span>
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
