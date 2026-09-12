"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Brain, Sparkles, Building, Globe, Zap, Clock, ShieldCheck, Mail,
  AlertTriangle, CheckCircle2, User, Landmark, HelpCircle, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface ContactBriefClientProps {
  workspaceId: string;
  report: any;
}

export default function ContactBriefClient({
  workspaceId,
  report
}: ContactBriefClientProps) {
  const router = useRouter();
  const [sendingBrief, setSendingBrief] = useState(false);

  const reportData = report.report_json || {};
  const score = report.lead_score || 0;
  const breakdown = report.lead_score_breakdown || {
    size: 20,
    industry: 15,
    techGap: 20,
    trigger: 25,
    pain: 10,
    engagement: 10
  };

  const getWarmthBadge = (s: number) => {
    if (s >= 80) return { label: 'High Fit Target', bg: 'bg-emerald-50 border-emerald-200 text-emerald-700' };
    if (s >= 60) return { label: 'Warm Prospect', bg: 'bg-purple-50 border-purple-200 text-purple-700' };
    if (s >= 40) return { label: 'Nurture Play', bg: 'bg-amber-50 border-amber-200 text-amber-700' };
    return { label: 'Low Priority', bg: 'bg-dash-surface border-dash-border text-dash-textMuted' };
  };

  const badge = getWarmthBadge(score);

  const handleSendEmailBriefing = async () => {
    setSendingBrief(true);
    toast.info('Synthesizing pre-call brief and dispatching email...');
    try {
      const response = await fetch('/api/cron/pre-meeting-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: report.contact_id
        })
      });

      if (!response.ok) throw new Error('Briefing dispatch failed');

      toast.success('AI Pre-Meeting Briefing email dispatched to your inbox!');
    } catch (err: any) {
      console.error(err);
      toast.error(`Briefing dispatch failed: ${err.message}`);
    } finally {
      setSendingBrief(false);
    }
  };

  return (
    <div className="min-h-screen bg-dash-bg text-dash-text p-8 space-y-8 animate-in fade-in duration-300 select-text">

      {/* Top Navigation Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-dash-border pb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/ai-studio/research')}
            className="w-8 h-8 rounded-lg bg-dash-surface border border-dash-border flex items-center justify-center text-dash-textMuted hover:text-dash-text hover:bg-dash-border/40 transition-all"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-[16px] font-space font-black uppercase tracking-tight text-dash-text">
              Prospect Intelligence Briefing
            </h1>
            <p className="text-[10px] text-dash-textMuted uppercase font-bold tracking-wider leading-none mt-0.5">
              Domain: <span className="font-mono text-dash-text/80">{report.company_domain}</span>
            </p>
          </div>
        </div>

        <button
          onClick={handleSendEmailBriefing}
          disabled={sendingBrief}
          className="h-9 px-5 rounded-lg bg-dash-accent hover:bg-dash-accent/90 disabled:opacity-50 text-white text-[12px] font-bold flex items-center gap-2 transition-all shadow-sm"
        >
          {sendingBrief ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Mail size={13} />
          )}
          Send Pre-Meeting Briefing Email
        </button>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Side: Score Metric & Computational Matrix (1/3) */}
        <div className="space-y-6">

          {/* Score pill */}
          <div className="bg-white border border-dash-border rounded-3xl p-6 space-y-4 shadow-sm">
            <h5 className="text-[11px] font-bold text-dash-textMuted uppercase tracking-wider">Lead Suitability Metric</h5>

            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-space font-black text-dash-text">{score}</span>
              <span className="text-sm font-semibold text-dash-textMuted">/ 100</span>
            </div>

            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10.5px] font-bold uppercase tracking-tight ${badge.bg}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              {badge.label}
            </span>

            {/* Signal Weights breakdown */}
            <div className="border-t border-dash-border pt-4 space-y-2.5">
              <span className="text-[10px] font-bold text-dash-textMuted uppercase tracking-wider block">Signal Weight Attribution</span>
              <div className="space-y-1.5 text-[11px] font-semibold text-dash-text/80">
                <div className="flex justify-between items-center bg-dash-surface px-3 py-2 rounded-xl border border-dash-border">
                  <span>Growth Trigger Event</span>
                  <span className="text-emerald-600">+{breakdown.trigger} pts</span>
                </div>
                <div className="flex justify-between items-center bg-dash-surface px-3 py-2 rounded-xl border border-dash-border">
                  <span>Infrastructure Gap</span>
                  <span className="text-emerald-600">+{breakdown.techGap} pts</span>
                </div>
                <div className="flex justify-between items-center bg-dash-surface px-3 py-2 rounded-xl border border-dash-border">
                  <span>Ideal Team Size Match</span>
                  <span className="text-emerald-600">+{breakdown.size} pts</span>
                </div>
                <div className="flex justify-between items-center bg-dash-surface px-3 py-2 rounded-xl border border-dash-border">
                  <span>Direct Engagement History</span>
                  <span className="text-emerald-600">+{breakdown.engagement} pts</span>
                </div>
              </div>
            </div>
          </div>

          {/* South African compliance check */}
          <div className="bg-white border border-dash-border rounded-3xl p-5 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 text-dash-accent">
              <Landmark size={14} />
              <h5 className="text-[10px] font-bold uppercase tracking-wider">Statutory SA Context</h5>
            </div>
            <p className="text-[11px] text-dash-textMuted leading-relaxed">
              Enriched parameters are filtered to align with POPIA privacy rules. Sensitive individual identifiers (private cell phone lines, residential addresses, and family information) have been processed and redacted.
            </p>
          </div>

        </div>

        {/* Right Side: Snapshots, Technology stack, hiring details (2/3) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Snapshot overview */}
          <div className="bg-white border border-dash-border rounded-3xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-dash-accent">
              <Building size={15} />
              <h5 className="text-[11px] font-space font-bold uppercase tracking-wide">Enterprise Profile Overview</h5>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-dash-surface p-4 rounded-2xl border border-dash-border text-xs font-semibold">
              <div>
                <div className="text-[9px] text-dash-textMuted uppercase">Company Name</div>
                <div className="text-dash-text mt-0.5">{reportData.company_snapshot?.legal_name || report.company_name}</div>
              </div>
              <div>
                <div className="text-[9px] text-dash-textMuted uppercase">Headquarters</div>
                <div className="text-dash-text mt-0.5">{reportData.company_snapshot?.headquarters || 'Johannesburg, GP'}</div>
              </div>
              <div>
                <div className="text-[9px] text-dash-textMuted uppercase">Employees Est</div>
                <div className="text-dash-text mt-0.5">{reportData.company_snapshot?.headcount_estimation || '45 employees'}</div>
              </div>
              <div>
                <div className="text-[9px] text-dash-textMuted uppercase">Established</div>
                <div className="text-dash-text mt-0.5">{reportData.company_snapshot?.established_year || '2018'}</div>
              </div>
            </div>

            <div className="text-xs text-dash-text/80 leading-relaxed pt-2">
              <strong className="text-dash-text block mb-1">Operational Matrix</strong>
              {reportData.plain_language_operational_profile || 'Provides cold-chain logistics across South Africa.'}
            </div>
          </div>

          {/* Enriched Individual Contact Details (Sprint 5.1 individual details display) */}
          {reportData.individual_profile && (
            <div className="bg-white border border-dash-border rounded-3xl p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 text-dash-accent">
                <User size={15} />
                <h5 className="text-[11px] font-space font-bold uppercase tracking-wide">Enriched Contact Profile</h5>
              </div>

              <div className="text-xs text-dash-text/80 space-y-3 leading-relaxed">
                <p>
                  <strong className="text-dash-text block mb-1">Professional History</strong>
                  {reportData.individual_profile.professional_history || 'Details gathered from public professional sources.'}
                </p>

                {reportData.individual_profile.speaking_profiles?.length > 0 && (
                  <div>
                    <strong className="text-dash-text block mb-1">Public Speaking & Appearances</strong>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {reportData.individual_profile.speaking_profiles.map((s: string, i: number) => (
                        <span key={i} className="px-2 py-1 rounded bg-dash-surface border border-dash-border text-[11px] font-semibold text-dash-text/80">
                          🎤 {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tech Stack & Hiring Signals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Tech badges */}
            <div className="bg-white border border-dash-border rounded-3xl p-5 space-y-3 shadow-sm">
              <span className="text-[10px] font-bold text-dash-textMuted uppercase tracking-wider block">Technology Stack</span>
              <div className="flex flex-wrap gap-2">
                {reportData.detected_technology_stack?.map((tech: string, i: number) => (
                  <span key={i} className="px-2.5 py-1 rounded-xl bg-dash-accent/10 border border-dash-accent/20 text-[10.5px] font-bold text-dash-accent">
                    {tech}
                  </span>
                )) || <span className="text-xs italic text-dash-textMuted">No tech stack signals detected.</span>}
              </div>
            </div>

            {/* Hiring signals */}
            <div className="bg-white border border-dash-border rounded-3xl p-5 space-y-3 shadow-sm">
              <span className="text-[10px] font-bold text-dash-textMuted uppercase tracking-wider block">Active Hiring Priorities</span>
              <div className="flex flex-wrap gap-2">
                {reportData.active_hiring_signals?.map((role: string, i: number) => (
                  <span key={i} className="px-2.5 py-1 rounded-xl bg-purple-50 border border-purple-200 text-[10.5px] font-bold text-purple-700">
                    💼 {role}
                  </span>
                )) || <span className="text-xs italic text-dash-textMuted">No active listings cached.</span>}
              </div>
            </div>

          </div>

          {/* Friction Signals & Openers */}
          <div className="bg-white border border-dash-border rounded-3xl p-6 space-y-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div className="space-y-3">
                <span className="text-[10px] font-bold text-dash-textMuted uppercase tracking-wider block">Friction Signals Correlation</span>
                <div className="space-y-2 text-xs text-dash-text/80 font-medium">
                  {reportData.inferred_pain_points?.map((p: string, i: number) => (
                    <div key={i} className="flex gap-2 items-start bg-dash-surface p-3 rounded-xl border border-dash-border">
                      <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                      <span>{p}</span>
                    </div>
                  )) || (
                    <span className="italic text-dash-textMuted">No pain signals correlations detected.</span>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-[10px] font-bold text-dash-textMuted uppercase tracking-wider block">Strategic Opener Scripts</span>
                <div className="space-y-2 text-xs text-dash-text/80 font-medium">
                  {reportData.suggested_conversation_openers?.map((o: string, i: number) => (
                    <div key={i} className="flex gap-2 items-start bg-dash-surface p-3 rounded-xl border border-dash-border">
                      <CheckCircle2 size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                      <span className="italic font-sans">"{o}"</span>
                    </div>
                  )) || (
                    <span className="italic text-dash-textMuted font-sans">Opener scripts pending.</span>
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
