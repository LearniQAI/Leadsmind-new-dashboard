'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { importWebPageAction } from '@/app/actions/webImport';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import { Globe, ArrowLeft, Loader2, Sparkles, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashFormField, DashInput } from '@/components/dashboard-ui/FormField';

type StepState = 'idle' | 'fetching' | 'generating' | 'completed' | 'failed';

export default function WebImportClient() {
  const router = useRouter();
  const [targetUrl, setTargetUrl] = useState('');
  const [currentStep, setCurrentStep] = useState<StepState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl.trim()) return;

    setErrorMessage(null);
    setCurrentStep('fetching');

    // Simulate progress transitions since it's a single server-side invocation
    const timer = setTimeout(() => {
      setCurrentStep('generating');
    }, 4000);

    try {
      const res = await importWebPageAction(targetUrl.trim());
      clearTimeout(timer);

      if (res.error) {
        setCurrentStep('failed');
        setErrorMessage(res.error);
        return;
      }

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
      clearTimeout(timer);
      setCurrentStep('failed');
      setErrorMessage(err.message || 'The web import pipeline encountered a critical system error.');
    }
  };

  const steps = [
    { key: 'fetching', label: 'Document ingestion', desc: 'Fetching page metadata & cleaning tags' },
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
    <MetaData pageTitle="Cross-Domain Web Importer">
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
                  Web <span className="text-dash-accent">import</span>
                </h1>
                <p className="text-[10px] !text-dash-textMuted font-semibold mt-0.5">
                  Cross-domain document & web importer
                </p>
              </div>
            </div>

            {currentStep === 'idle' ? (
              <DashCard padding="default" className="space-y-6 animate-in fade-in duration-300 motion-reduce:animate-none">

                <div className="space-y-2">
                  <h3 className="text-lg font-bold !text-dash-text flex items-center gap-2">
                    <Globe className="w-5 h-5 text-dash-accent animate-pulse motion-reduce:animate-none" /> Document & URL scraper
                  </h3>
                  <p className="text-xs !text-dash-textMuted leading-relaxed">
                    Import content from any remote URL or a public Google Docs document link. The ingestion pipeline strips headers, footers, and scripts, leaving clean core prose parsed and structured by AI.
                  </p>
                </div>

                <form onSubmit={handleImportSubmit} className="space-y-4">
                  <DashFormField label="Document or web page link">
                    <DashInput
                      type="url"
                      value={targetUrl}
                      onChange={(e) => setTargetUrl(e.target.value)}
                      placeholder="https://example.com/article or https://docs.google.com/document/d/..."
                      required
                    />
                  </DashFormField>

                  <DashButton type="submit" disabled={!targetUrl.trim()} className="w-full justify-center">
                    <FileText className="w-4 h-4" /> Ingest and structure document
                  </DashButton>
                </form>

                {/* Legal and Compliance Warning Banner */}
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                  <span className="text-[11px] font-bold text-amber-600 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Legal disclaimer
                  </span>
                  <p className="text-[11px] !text-dash-textMuted leading-relaxed font-semibold">
                    Ensure you hold the copyright or reuse permissions for any external URLs or documents imported into the workspace.
                  </p>
                </div>

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
                    {currentStep === 'completed' ? 'Web ingestion successful!' : currentStep === 'failed' ? 'Import failed' : 'Orchestrating ingestion'}
                  </h3>
                  <p className="text-xs !text-dash-textMuted max-w-sm mx-auto leading-relaxed">
                    {currentStep === 'completed' ? 'Redirecting you to the editor workspace shortly...' : currentStep === 'failed' ? 'The background pipeline failed to complete.' : 'Please keep this browser window open while AI ingestion parses document details.'}
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
