"use client";
import React, { useState, useEffect } from 'react';
import { Brain, Sparkles, TrendingUp, AlertTriangle, ShieldCheck, HelpCircle, Linkedin, Building, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface IntelligenceTabProps {
  contactId: string;
  workspaceId: string;
  companyDomain?: string;
}

export default function IntelligenceTab({
  contactId,
  workspaceId,
  companyDomain = 'zafrologistics.co.za'
}: IntelligenceTabProps) {
  const supabase = createClient();
  const [compiling, setCompiling] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [score, setScore] = useState<number | null>(null);
  const [breakdown, setBreakdown] = useState<any>(null);

  useEffect(() => {
    async function loadIntelligence() {
      if (!contactId) return;
      try {
        const { data, error } = await supabase
          .from('ai_research_reports')
          .select('*')
          .eq('contact_id', contactId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setReport(data.report_json);
          setScore(data.lead_score);
          setBreakdown(data.lead_score_breakdown || {
            size: 20,
            industry: 15,
            techGap: 20,
            trigger: 25,
            pain: 10,
            engagement: 10
          });
        }
      } catch (err) {
        console.error('Error loading intelligence:', err);
      }
    }
    loadIntelligence();
  }, [contactId, supabase]);

  const handleCompileResearch = async () => {
    setCompiling(true);
    toast.info('Autonomous research agent dispatched to scan target domain...');
    try {
      const response = await fetch('/api/v1/ai/research/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactIds: [contactId],
          workspaceId,
          domain: companyDomain
        })
      });

      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Research compile failed');

      // Refresh data
      const { data } = await supabase
        .from('ai_research_reports')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setReport(data.report_json);
        setScore(data.lead_score);
        setBreakdown(data.lead_score_breakdown || {
          size: 20,
          industry: 15,
          techGap: 20,
          trigger: 25,
          pain: 10,
          engagement: 10
        });
        toast.success('AI enrichment compilation complete.');
      } else {
        toast.success('Research completed, refresh to reload.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(`Research compiler failed: ${err.message}`);
    } finally {
      setCompiling(false);
    }
  };

  // Badge warmth color mappings (Sprint 5.4 rule)
  const getWarmthBadge = (s: number) => {
    if (s >= 80) return { label: 'High Fit Target', bg: 'bg-[#10b981]/15 border-[#10b981]/25 text-[#34d399]' };
    if (s >= 60) return { label: 'Warm Prospect', bg: 'bg-[#8b5cf6]/15 border-[#8b5cf6]/25 text-[#a78bfa]' };
    if (s >= 40) return { label: 'Nurture Play', bg: 'bg-[#f59e0b]/15 border-[#f59e0b]/25 text-[#fbbf24]' };
    return { label: 'Low Priority', bg: 'bg-dash-surface border-dash-border !text-dash-textMuted' };
  };

  const badge = getWarmthBadge(score || 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner Control */}
      <div className="bg-white border border-dash-border rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-dash-accent/10 text-dash-accent flex items-center justify-center">
            <Brain size={20} />
          </div>
          <div>
            <h4 className="text-[14px] font-bold !text-dash-text">Tactical Relationship Intelligence</h4>
            <p className="text-[10px] !text-dash-textMuted font-medium tracking-wider">Deep prospect footprint compilation</p>
          </div>
        </div>

        <button
          onClick={handleCompileResearch}
          disabled={compiling}
          className="h-9 px-4 rounded-[8px] bg-dash-accent hover:bg-dash-accent/90 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-dash-accent/15"
        >
          {compiling ? (
            <>
              <Loader2 size={11} className="animate-spin motion-reduce:animate-none" />
              Compiling...
            </>
          ) : (
            <>
              <Sparkles size={12} className="animate-pulse" />
              Automated AI Research Compiler
            </>
          )}
        </button>
      </div>

      {score !== null && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Suitability Score details (1/3) */}
          <div className="bg-white border border-dash-border rounded-2xl p-6 space-y-4">
            <h5 className="text-[11px] font-bold !text-dash-textMuted tracking-wider">Lead Suitability Metric</h5>
            
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black !text-dash-text">{score}</span>
              <span className="text-sm font-semibold !text-dash-textMuted">/ 100</span>
            </div>

            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10.5px] font-bold tracking-tight ${badge.bg}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              {badge.label}
            </span>

            {/* Metrics Breakdown popover styled (Sprint 5.4 popover requirement) */}
            <div className="border-t border-dash-border pt-4 space-y-2.5">
              <span className="text-[10px] font-bold !text-dash-textMuted tracking-widest block">Computational Matrix</span>
              <div className="space-y-1.5 text-[11px] font-semibold !text-dash-textMuted">
                <div className="flex justify-between items-center bg-dash-surface px-2 py-1.5 rounded border border-dash-border">
                  <span>Growth Trigger Event</span>
                  <span className="text-[#34d399]">+{breakdown?.trigger || 0} pts</span>
                </div>
                <div className="flex justify-between items-center bg-dash-surface px-2 py-1.5 rounded border border-dash-border">
                  <span>Infrastructure Gap</span>
                  <span className="text-[#34d399]">+{breakdown?.techGap || 0} pts</span>
                </div>
                <div className="flex justify-between items-center bg-dash-surface px-2 py-1.5 rounded border border-dash-border">
                  <span>Ideal Team Size Match</span>
                  <span className="text-[#34d399]">+{breakdown?.size || 0} pts</span>
                </div>
                <div className="flex justify-between items-center bg-dash-surface px-2 py-1.5 rounded border border-dash-border">
                  <span>Engagement History</span>
                  <span className="text-[#34d399]">+{breakdown?.engagement || 0} pts</span>
                </div>
              </div>
            </div>
          </div>

          {/* Enrichment Profile Data (2/3) */}
          <div className="lg:col-span-2 bg-white border border-dash-border rounded-2xl p-6 space-y-6">
            
            {/* Enterprise Snapshot */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-dash-accent">
                <Building size={14} />
                <h5 className="text-[11px] font-bold tracking-wide">Enterprise Profile</h5>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-dash-surface p-4 rounded-xl border border-dash-border text-xs font-semibold">
                <div>
                  <div className="text-[9px] !text-dash-textMuted">Company Name</div>
                  <div className="!text-dash-text mt-0.5">{report?.company_snapshot?.legal_name || 'Zafro Logistics'}</div>
                </div>
                <div>
                  <div className="text-[9px] !text-dash-textMuted">Headquarters</div>
                  <div className="!text-dash-text mt-0.5">{report?.company_snapshot?.headquarters || 'Johannesburg, GP'}</div>
                </div>
                <div>
                  <div className="text-[9px] !text-dash-textMuted">Headcount Est</div>
                  <div className="!text-dash-text mt-0.5">{report?.company_snapshot?.headcount_estimation || '45 employees'}</div>
                </div>
                <div>
                  <div className="text-[9px] !text-dash-textMuted">Established</div>
                  <div className="!text-dash-text mt-0.5">{report?.company_snapshot?.established_year || '2018'}</div>
                </div>
              </div>

              <div className="text-xs !text-dash-textMuted leading-relaxed pt-2">
                <strong className="!text-dash-text block mb-1">Operational Profile Matrix</strong>
                {report?.plain_language_operational_profile || 'Provides logistics and route coordination across South Africa.'}
              </div>
            </div>

            {/* Strategic signals / Friction */}
            <div className="border-t border-dash-border pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-[10px] font-bold !text-dash-textMuted tracking-wider block">Friction Signals Detected</span>
                <div className="space-y-1.5 text-xs !text-dash-textMuted font-medium">
                  {report?.inferred_pain_points?.map((p: string, i: number) => (
                    <div key={i} className="flex gap-1.5 items-start">
                      <AlertTriangle size={12} className="text-amber-500 shrink-0 mt-0.5" />
                      <span>{p}</span>
                    </div>
                  )) || (
                    <span className="italic !text-dash-textMuted">No pain signals enriched yet.</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold !text-dash-textMuted tracking-wider block">Suggested Openers & Scripts</span>
                <div className="space-y-1.5 text-xs !text-dash-textMuted font-medium">
                  {report?.suggested_conversation_openers?.map((o: string, i: number) => (
                    <div key={i} className="flex gap-1.5 items-start">
                      <CheckCircle2 size={12} className="text-[#34d399] shrink-0 mt-0.5" />
                      <span className="italic font-sans">"{o}"</span>
                    </div>
                  )) || (
                    <span className="italic !text-dash-textMuted">Opener scripts pending database compilation.</span>
                  )}
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {score === null && (
        <div className="py-12 bg-white border border-dash-border rounded-2xl flex flex-col items-center justify-center text-center p-6 space-y-4">
          <Brain size={32} className="!text-dash-textMuted opacity-40 animate-pulse" />
          <div>
            <h5 className="text-[13px] font-bold !text-dash-textMuted">No Intelligence Profile Found</h5>
            <p className="text-[11px] !text-dash-textMuted max-w-[320px] mt-1">
              Automated research profiling has not run for this prospect domain yet. Dispatch the autonomous compiler above to scan live indicators.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
