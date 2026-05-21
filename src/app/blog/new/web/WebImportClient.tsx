'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { importWebPageAction } from '@/app/actions/webImport';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import { Globe, ArrowLeft, Loader2, Sparkles, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';

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
    { key: 'fetching', label: 'Document Ingestion', desc: 'Fetching page metadata & cleaning tags' },
    { key: 'generating', label: 'AI Restructuring', desc: 'Structuring post via GPT-4o-mini' }
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
        <div className="flex flex-col min-h-screen bg-[#04091a] text-white font-dm-sans py-12 px-6">
          <div className="max-w-3xl mx-auto w-full space-y-8">
            
            {/* Header */}
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/blog/manage')} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="font-space-grotesk text-2xl font-bold text-white uppercase tracking-tight">
                  Web <span className="text-primary">Import</span>
                </h1>
                <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-semibold mt-0.5">
                  Cross-Domain Document & Web Importer
                </p>
              </div>
            </div>

            {currentStep === 'idle' ? (
              <div className="bg-[#080f28] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden animate-fade-in">
                <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="space-y-2">
                  <h3 className="font-space-grotesk text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary animate-pulse" /> Document & URL Scraper
                  </h3>
                  <p className="text-xs text-white/50 leading-relaxed">
                    Import content from any remote URL or a public Google Docs document link. The ingestion pipeline strips headers, footers, and scripts, leaving clean core prose parsed and structured by AI.
                  </p>
                </div>

                <form onSubmit={handleImportSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">Document or Web Page Link</label>
                    <input
                      type="url"
                      value={targetUrl}
                      onChange={(e) => setTargetUrl(e.target.value)}
                      placeholder="https://example.com/article or https://docs.google.com/document/d/..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-primary transition"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!targetUrl.trim()}
                    className="w-full bg-primary hover:bg-blue-600 text-white font-bold text-xs py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4" /> Ingest and Structure Document
                  </button>
                </form>

                {/* Legal and Compliance Warning Banner */}
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Legal Disclaimer
                  </span>
                  <p className="text-[10px] text-white/40 leading-relaxed font-semibold uppercase">
                    Ensure you hold the copyright or reuse permissions for any external URLs or documents imported into the workspace.
                  </p>
                </div>

                {/* Info Card */}
                <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl space-y-2">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest block flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> South African Spelling Active
                  </span>
                  <p className="text-[10px] text-white/40 leading-relaxed font-semibold uppercase">
                    Linguistic constraints enforce SA/UK spellings natively (e.g. colour, organisation, optimised) to ensure regional local branding matches perfectly.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-[#080f28] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-8 shadow-2xl animate-fade-in relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="text-center space-y-2">
                  <h3 className="font-space-grotesk text-lg font-bold text-white uppercase tracking-wider">
                    {currentStep === 'completed' ? 'Web Ingestion Successful!' : currentStep === 'failed' ? 'Import Failed' : 'Orchestrating Ingestion'}
                  </h3>
                  <p className="text-xs text-white/50 max-w-sm mx-auto leading-relaxed">
                    {currentStep === 'completed' ? 'Redirecting you to the editor workspace shortly...' : currentStep === 'failed' ? 'The background pipeline failed to complete.' : 'Please keep this browser window open while AI ingestion parses document details.'}
                  </p>
                </div>

                {/* Connected Pipeline Stepper */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-3 bg-[#04091a]/80 p-5 rounded-2xl border border-white/5 shadow-inner">
                  {steps.map((step, index) => {
                    const status = getStepStatus(step.key);
                    return (
                      <React.Fragment key={step.key}>
                        <div className="flex flex-col items-center text-center space-y-2 md:flex-1 relative">
                          <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 ${
                            status === 'completed'
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                              : status === 'active'
                              ? 'bg-primary/20 border-primary text-primary animate-pulse'
                              : status === 'failed'
                              ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                              : 'bg-white/5 border-white/10 text-white/20'
                          }`}>
                            {status === 'completed' ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : status === 'active' ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <span className="text-[10px] font-bold">{index + 1}</span>
                            )}
                          </div>
                          <div>
                            <p className={`text-[10px] font-bold uppercase tracking-wider ${status === 'active' ? 'text-primary' : 'text-white/60'}`}>{step.label}</p>
                            <p className="text-[9px] text-white/30 mt-0.5">{step.desc}</p>
                          </div>
                        </div>
                        {index < steps.length - 1 && (
                          <div className={`hidden md:block w-8 h-[2px] self-center -mt-6 transition-all duration-500 ${
                            getStepStatus(steps[index + 1].key) === 'completed' || getStepStatus(steps[index + 1].key) === 'active'
                              ? 'bg-primary'
                              : 'bg-white/10'
                          }`} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Error Box */}
                {currentStep === 'failed' && (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl space-y-2 animate-fade-in flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider">Pipeline Exception Logged</p>
                      <p className="text-xs mt-0.5 text-white/60">{errorMessage}</p>
                      <button onClick={() => setCurrentStep('idle')} className="mt-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition">Try Another URL</button>
                    </div>
                  </div>
                )}

                {/* Processing Spinner Details */}
                {currentStep !== 'completed' && currentStep !== 'failed' && (
                  <div className="flex justify-center items-center gap-2 text-xs text-white/40 font-semibold uppercase tracking-wider">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span>Synchronising API Streams...</span>
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
