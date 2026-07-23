"use client";
import React, { useState, useEffect } from 'react';
import { Sparkles, AlertTriangle, ShieldCheck, Zap, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { ENFORCE_PLAN_LIMITS } from '@/lib/config/flags';

interface AiCreditsTabProps {
  workspaceId: string;
}

export default function AiCreditsTab({ workspaceId }: AiCreditsTabProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState<any>(null);

  async function loadCredits() {
    if (!workspaceId) return;
    try {
      const { data, error } = await supabase
        .from('ai_usage_credits')
        .select('*')
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (error) throw error;
      setCredits(data);
    } catch (err: any) {
      console.error('Error loading credits:', err);
      toast.error('Failed to load credit details');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCredits();
  }, [workspaceId]);

  const handleUpgradeTier = () => {
    toast.success('Redirecting to subscription plans portal...');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 bg-white border border-dash-border rounded-2xl">
        <i className="fa-solid fa-spinner animate-spin motion-reduce:animate-none text-[24px] text-dash-accent"></i>
      </div>
    );
  }

  const baseCredits = credits?.plan_monthly_credits ?? 100;
  const addonCredits = credits?.credits_purchased_addon ?? 0;
  const totalAllocated = baseCredits + addonCredits;
  const usedCredits = credits?.credits_used_this_period ?? 0;
  
  const percentageUsed = totalAllocated > 0 ? Math.min(Math.round((usedCredits / totalAllocated) * 100), 100) : 0;
  const isHighUsage = ENFORCE_PLAN_LIMITS && percentageUsed >= 80;
  const isFullyDepleted = ENFORCE_PLAN_LIMITS && usedCredits >= totalAllocated;

  const billingCycleEnd = credits?.billing_cycle_end 
    ? new Date(credits.billing_cycle_end).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'June 14, 2026';

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-300">
      
      {/* Top Ledger Overview Card */}
      <div className="bg-white border border-dash-border rounded-2xl p-6 relative overflow-hidden shadow-sm group">
        <div className="absolute top-0 left-0 w-1 h-full bg-dash-accent"></div>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-10 h-10 rounded-xl bg-dash-accent/10 text-dash-accent flex items-center justify-center">
            <Zap size={20} className="text-dash-accent" />
          </div>
          <div>
            <h4 className="text-[15px] font-bold !text-dash-text">AI balance manager</h4>
            <p className="text-[11px] !text-dash-textMuted font-medium">Monitor token consumption &amp; ledger limits</p>
          </div>
        </div>

        {/* Speedometer Bar Visualizer */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="!text-dash-textMuted">Active plan consumption velocity</span>
            <span className="!text-dash-text">{percentageUsed}% used</span>
          </div>

          <div className="h-3 w-full bg-dash-surface rounded-full overflow-hidden border border-dash-border">
            <div
              style={{ width: `${percentageUsed}%` }}
              className={`h-full rounded-full transition-all duration-500 motion-reduce:transition-none ${
                isFullyDepleted ? 'bg-red' : isHighUsage ? 'bg-amber-600' : 'bg-dash-accent'
              }`}
            />
          </div>

          <div className="flex justify-between items-center text-[11px] !text-dash-textMuted font-semibold">
            <span>{usedCredits} / {totalAllocated} allocated base credits expended</span>
            <span>Auto-refresh target date: <strong className="!text-dash-text">{billingCycleEnd}</strong></span>
          </div>
        </div>
      </div>

      {/* Warning Box Trigger */}
      {isFullyDepleted ? (
        <div className="bg-red/10 border border-red/20 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="text-red shrink-0 mt-0.5" size={16} />
          <div>
            <h5 className="text-xs font-bold text-red">Usage limit reached</h5>
            <p className="text-[11px] !text-dash-textMuted mt-0.5">
              This workspace has depleted 100% of its assigned AI credits. Downstream intelligence synthesis and content generation workflows are blocked.
            </p>
          </div>
        </div>
      ) : isHighUsage ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={16} />
          <div>
            <h5 className="text-xs font-bold text-amber-600">High usage</h5>
            <p className="text-[11px] !text-dash-textMuted mt-0.5">
              This workspace has consumed more than 80% of its base credits. Purchase addon credits or upgrade platform tiers to avoid interruptions.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-green/10 border border-green/20 rounded-2xl p-4 flex items-start gap-3">
          <ShieldCheck className="text-green shrink-0 mt-0.5" size={16} />
          <div>
            <h5 className="text-xs font-bold text-green">Credits healthy</h5>
            <p className="text-[11px] !text-dash-textMuted mt-0.5">
              Downstream OpenAI engines and enrichment processes are running normally. No warnings triggered.
            </p>
          </div>
        </div>
      )}

      {/* Pricing / Tiers Matrix cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: Addon package */}
        <div className="bg-white border border-dash-border rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-sm">
          <div>
            <div className="text-[10px] font-bold text-dash-accent">Top-up bundle</div>
            <h5 className="text-[15px] font-bold !text-dash-text mt-1">Purchase add-on credits</h5>
            <p className="text-xs !text-dash-textMuted leading-relaxed mt-2">
              Instantly credit your account ledger with 100 high-performance AI tokens for immediate execution tasks. Credits do not expire.
            </p>
            <div className="text-xl font-bold !text-dash-text mt-4">
              R99 <span className="text-xs font-bold !text-dash-textMuted">/ 100 credits</span>
            </div>
          </div>

          {/* Self-serve top-up is not wired to a real payment flow yet — the button is
              inert (no onClick, no network call) rather than left as an unpaid credit grant. */}
          <button
            disabled
            title="Add-on top-ups are not available yet — contact your account manager"
            className="w-full h-10 rounded-xl bg-dash-surface border border-dash-border !text-dash-textMuted font-bold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed opacity-60"
          >
            Available soon
          </button>
        </div>

        {/* Card 2: Upgrade tier */}
        <div className="bg-white border border-dash-border rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-sm">
          <div>
            <div className="text-[10px] font-bold text-green">Enterprise scaling</div>
            <h5 className="text-[15px] font-bold !text-dash-text mt-1">Upgrade platform tier</h5>
            <p className="text-xs !text-dash-textMuted leading-relaxed mt-2">
              Unlock larger base plans with increased limits, custom compliance guidelines, custom templates, and direct CRM workflow integrations.
            </p>
            <div className="text-xl font-bold !text-dash-text mt-4">
              R499 <span className="text-xs font-bold !text-dash-textMuted">/ month (Pro plan)</span>
            </div>
          </div>

          <button
            onClick={handleUpgradeTier}
            className="w-full h-10 rounded-xl bg-dash-surface border border-dash-border !text-dash-text hover:bg-dash-border/60 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors motion-reduce:transition-none"
          >
            Upgrade platform tier
            <ArrowUpRight size={14} />
          </button>
        </div>

      </div>

    </div>
  );
}
