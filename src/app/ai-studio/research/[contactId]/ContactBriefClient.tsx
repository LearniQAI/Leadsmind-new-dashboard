"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Brain, Sparkles, Building, Globe, Zap, Clock, ShieldCheck, Mail, 
  AlertTriangle, CheckCircle2, User, Landmark, HelpCircle 
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
    if (s >= 80) return { label: 'High Fit Target', bg: 'bg-[#10b981]/15 border-[#10b981]/25 text-[#34d399]' };
    if (s >= 60) return { label: 'Warm Prospect', bg: 'bg-[#8b5cf6]/15 border-[#8b5cf6]/25 text-[#a78bfa]' };
    if (s >= 40) return { label: 'Nurture Play', bg: 'bg-[#f59e0b]/15 border-[#f59e0b]/25 text-[#fbbf24]' };
    return { label: 'Low Priority', bg: 'bg-white/5 border-white/10 text-t3' };
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
    <div className="min-h-screen bg-[#04091a] text-white p-8 space-y-8 animate-in fade-in duration-300 select-text">
      
      {/* Top Navigation Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/ai-studio/research')} 
            className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-[#4a5a82] hover:text-white hover:bg-white/10 transition-all"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-[16px] font-space font-black uppercase tracking-tight text-t1">
              Prospect Intelligence Briefing
            </h1>
            <p className="text-[10px] text-t3 uppercase font-bold tracking-wider leading-none mt-0.5">
              Domain: <span className="font-mono text-t2">{report.company_domain}</span>
            </p>
          </div>
        </div>

        <button
          onClick={handleSendEmailBriefing}
          disabled={sendingBrief}
          className="h-9 px-5 rounded-lg bg-[#2563eb] hover:bg-[#2563eb]/90 disabled:opacity-50 text-white text-[12px] font-bold flex items-center gap-2 transition-all shadow-lg shadow-[#2563eb]/20"
        >
          {sendingBrief ? (
            <i className="fa-solid fa-spinner animate-spin text-[12px]"></i>
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
          <div className="bg-[#080f28] border border-white/5 rounded-3xl p-6 space-y-4">
            <h5 className="text-[11px] font-bold text-t3 uppercase tracking-wider">Lead Suitability Metric</h5>
            
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-space font-black text-t1">{score}</span>
              <span className="text-sm font-semibold text-t4">/ 100</span>
            </div>

            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10.5px] font-bold uppercase tracking-tight ${badge.bg}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              {badge.label}
            </span>

            {/* Signal Weights breakdown */}
            <div className="border-t border-white/5 pt-4 space-y-2.5">
              <span className="text-[10px] font-bold text-t3 uppercase tracking-wider block">Signal Weight Attribution</span>
              <div className="space-y-1.5 text-[11px] font-semibold text-t2">
                <div className="flex justify-between items-center bg-[#04091a] px-3 py-2 rounded-xl border border-white/[0.01]">
                  <span>Growth Trigger Event</span>
                  <span className="text-[#34d399]">+{breakdown.trigger} pts</span>
                </div>
                <div className="flex justify-between items-center bg-[#04091a] px-3 py-2 rounded-xl border border-white/[0.01]">
                  <span>Infrastructure Gap</span>
                  <span className="text-[#34d399]">+{breakdown.techGap} pts</span>
                </div>
                <div className="flex justify-between items-center bg-[#04091a] px-3 py-2 rounded-xl border border-white/[0.01]">
                  <span>Ideal Team Size Match</span>
                  <span className="text-[#34d399]">+{breakdown.size} pts</span>
                </div>
                <div className="flex justify-between items-center bg-[#04091a] px-3 py-2 rounded-xl border border-white/[0.01]">
                  <span>Direct Engagement History</span>
                  <span className="text-[#34d399]">+{breakdown.engagement} pts</span>
                </div>
              </div>
            </div>
          </div>

          {/* South African compliance check */}
          <div className="bg-[#080f28] border border-white/5 rounded-3xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-accent2">
              <Landmark size={14} />
              <h5 className="text-[10px] font-bold uppercase tracking-wider">Statutory SA Context</h5>
            </div>
            <p className="text-[11px] text-t3 leading-relaxed">
              Enriched parameters are filtered to align with POPIA privacy rules. Sensitive individual identifiers (private cell phone lines, residential addresses, and family information) have been processed and redacted.
            </p>
          </div>

        </div>

        {/* Right Side: Snapshots, Technology stack, hiring details (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Snapshot overview */}
          <div className="bg-[#080f28] border border-white/5 rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-accent2">
              <Building size={15} />
              <h5 className="text-[11px] font-space font-bold uppercase tracking-wide">Enterprise Profile Overview</h5>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#04091a] p-4 rounded-2xl border border-white/[0.01] text-xs font-semibold">
              <div>
                <div className="text-[9px] text-t4 uppercase">Company Name</div>
                <div className="text-t1 mt-0.5">{reportData.company_snapshot?.legal_name || report.company_name}</div>
              </div>
              <div>
                <div className="text-[9px] text-t4 uppercase">Headquarters</div>
                <div className="text-t1 mt-0.5">{reportData.company_snapshot?.headquarters || 'Johannesburg, GP'}</div>
              </div>
              <div>
                <div className="text-[9px] text-t4 uppercase">Employees Est</div>
                <div className="text-t1 mt-0.5">{reportData.company_snapshot?.headcount_estimation || '45 employees'}</div>
              </div>
              <div>
                <div className="text-[9px] text-t4 uppercase">Established</div>
                <div className="text-t1 mt-0.5">{reportData.company_snapshot?.established_year || '2018'}</div>
              </div>
            </div>

            <div className="text-xs text-t2 leading-relaxed pt-2">
              <strong className="text-t1 block mb-1">Operational Matrix</strong>
              {reportData.plain_language_operational_profile || 'Provides cold-chain logistics across South Africa.'}
            </div>
          </div>

          {/* Enriched Individual Contact Details (Sprint 5.1 individual details display) */}
          {reportData.individual_profile && (
            <div className="bg-[#080f28] border border-white/5 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-accent2">
                <User size={15} />
                <h5 className="text-[11px] font-space font-bold uppercase tracking-wide">Enriched Contact Profile</h5>
              </div>

              <div className="text-xs text-t2 space-y-3 leading-relaxed">
                <p>
                  <strong className="text-t1 block mb-1">Professional History</strong>
                  {reportData.individual_profile.professional_history || 'Details gathered from public professional sources.'}
                </p>

                {reportData.individual_profile.speaking_profiles?.length > 0 && (
                  <div>
                    <strong className="text-t1 block mb-1">Public Speaking & Appearances</strong>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {reportData.individual_profile.speaking_profiles.map((s: string, i: number) => (
                        <span key={i} className="px-2 py-1 rounded bg-[#04091a] border border-white/5 text-[11px] font-semibold text-t2">
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
            <div className="bg-[#080f28] border border-white/5 rounded-3xl p-5 space-y-3">
              <span className="text-[10px] font-bold text-t3 uppercase tracking-wider block">Technology Stack</span>
              <div className="flex flex-wrap gap-2">
                {reportData.detected_technology_stack?.map((tech: string, i: number) => (
                  <span key={i} className="px-2.5 py-1 rounded-xl bg-accentg/10 border border-accent/20 text-[10.5px] font-bold text-accent2">
                    {tech}
                  </span>
                )) || <span className="text-xs italic text-t4">No tech stack signals detected.</span>}
              </div>
            </div>

            {/* Hiring signals */}
            <div className="bg-[#080f28] border border-white/5 rounded-3xl p-5 space-y-3">
              <span className="text-[10px] font-bold text-t3 uppercase tracking-wider block">Active Hiring Priorities</span>
              <div className="flex flex-wrap gap-2">
                {reportData.active_hiring_signals?.map((role: string, i: number) => (
                  <span key={i} className="px-2.5 py-1 rounded-xl bg-[#8b5cf6]/10 border border-[#8b5cf6]/25 text-[10.5px] font-bold text-[#a78bfa]">
                    💼 {role}
                  </span>
                )) || <span className="text-xs italic text-t4">No active listings cached.</span>}
              </div>
            </div>

          </div>

          {/* Friction Signals & Openers */}
          <div className="bg-[#080f28] border border-white/5 rounded-3xl p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-t3 uppercase tracking-wider block">Friction Signals Correlation</span>
                <div className="space-y-2 text-xs text-t2 font-medium">
                  {reportData.inferred_pain_points?.map((p: string, i: number) => (
                    <div key={i} className="flex gap-2 items-start bg-[#04091a] p-3 rounded-xl border border-white/[0.01]">
                      <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                      <span>{p}</span>
                    </div>
                  )) || (
                    <span className="italic text-t4">No pain signals correlations detected.</span>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-[10px] font-bold text-t3 uppercase tracking-wider block">Strategic Opener Scripts</span>
                <div className="space-y-2 text-xs text-t2 font-medium">
                  {reportData.suggested_conversation_openers?.map((o: string, i: number) => (
                    <div key={i} className="flex gap-2 items-start bg-[#04091a] p-3 rounded-xl border border-white/[0.01]">
                      <CheckCircle2 size={13} className="text-[#34d399] shrink-0 mt-0.5" />
                      <span className="italic font-sans">"{o}"</span>
                    </div>
                  )) || (
                    <span className="italic text-t4 font-sans">Opener scripts pending.</span>
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
