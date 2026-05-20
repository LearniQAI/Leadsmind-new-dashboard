'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Cpu, Heart, CheckCircle2, HelpCircle, Activity } from 'lucide-react';
import { EnvironmentHealthChecker, HealthReport } from '@/lib/launch/EnvironmentHealthChecker';
import { ReleaseValidator, ValidationItem } from '@/lib/launch/ReleaseValidator';
import { FeedbackCollector, FeedbackSubmission } from '@/lib/launch/FeedbackCollector';

export function BetaHealthDashboard({ formId }: { formId: string }) {
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [deployChecks, setDeployChecks] = useState<ValidationItem[]>([]);
  const [feedback, setFeedback] = useState<FeedbackSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  const runVerificationSuite = async () => {
    // 1. Audit env setup variables
    const rep = EnvironmentHealthChecker.checkHealth();
    setHealth(rep);

    // 2. Audit database migration connectivity checks
    const checks = await ReleaseValidator.verifyDeployment();
    setDeployChecks(checks);

    // 3. Load user beta feedback logs
    const items = await FeedbackCollector.getTimeline(formId);
    setFeedback(items);

    setLoading(false);
  };

  useEffect(() => {
    runVerificationSuite();
  }, [formId]);

  if (loading) {
    return (
      <div className="py-12 flex justify-center items-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-dm-sans text-white">
      
      {/* 1. Environment & Config Health checks */}
      <div className="bg-[#0c1535] border border-white/5 p-5 rounded-2xl flex flex-col gap-4">
        <span className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82] flex items-center gap-1.5 border-b border-white/5 pb-2.5">
          <Heart size={12} className="text-rose-400" /> Environment Health Checker
        </span>

        <div className="flex flex-col gap-3">
          {[
            { label: 'Supabase Sync Connection', status: health?.supabase },
            { label: 'Resend SMTP Configuration', status: health?.email },
            { label: 'Stripe Adapter Integration', status: health?.payment },
            { label: 'AI Suggestion Caching Layer', status: health?.ai }
          ].map((item, idx) => (
            <div key={idx} className="flex justify-between items-center text-xs p-2.5 bg-white/2 border border-white/5 rounded-xl">
              <span className="text-white/70">{item.label}</span>
              <span className={`text-[8px] px-2 py-0.5 rounded font-black border uppercase tracking-wider ${
                item.status ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}>
                {item.status ? 'Active' : 'Missing'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Migration Checks / deployment checks */}
      <div className="bg-[#0c1535] border border-white/5 p-5 rounded-2xl flex flex-col gap-4">
        <span className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82] flex items-center gap-1.5 border-b border-white/5 pb-2.5">
          <Cpu size={12} className="text-blue-400" /> Deployment Checks
        </span>

        <div className="flex flex-col gap-3">
          {deployChecks.map((check) => (
            <div key={check.id} className="flex flex-col gap-1 p-2.5 bg-white/2 border border-white/5 rounded-xl text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold">{check.name}</span>
                <span className={`text-[8px] px-2 py-0.5 rounded font-black border uppercase tracking-wider ${
                  check.passed ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}>
                  {check.passed ? 'passed' : 'failed'}
                </span>
              </div>
              <p className="text-[10px] text-white/50">{check.message}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Feedback Feed logs */}
      <div className="bg-[#0c1535] border border-white/5 p-5 rounded-2xl flex flex-col gap-4">
        <span className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82] flex items-center gap-1.5 border-b border-white/5 pb-2.5">
          <HelpCircle size={12} className="text-purple-400" /> Beta Feedback Logs
        </span>

        <div className="flex flex-col gap-3 max-h-[220px] overflow-y-auto pr-1">
          {feedback.map((item) => (
            <div key={item.id} className="p-3 bg-white/2 border border-white/5 rounded-xl flex flex-col gap-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[#a78bfa]">{item.user_email}</span>
                <span className="text-[8px] bg-purple-500/10 border border-purple-500/20 text-purple-400 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                  {item.type}
                </span>
              </div>
              <p className="text-white/80">{item.message}</p>
            </div>
          ))}

          {feedback.length === 0 && (
            <div className="py-6 flex flex-col items-center justify-center text-center text-white/30 gap-1.5">
              <CheckCircle2 size={20} className="text-emerald-400/50" />
              <span className="text-[9px] font-black uppercase tracking-wider">No Bugs Reported</span>
              <p className="text-[8px] text-[#4a5a82]">Everything is stable.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
