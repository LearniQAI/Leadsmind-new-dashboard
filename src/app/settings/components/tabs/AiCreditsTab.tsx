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
  const [purchasing, setPurchasing] = useState(false);
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

  const handlePurchaseAddon = async () => {
    setPurchasing(true);
    toast.info('Initiating secure purchase process for credit top-up...');
    try {
      // Simulate top-up in database
      const currentAddon = credits?.credits_purchased_addon || 0;
      const { error } = await supabase
        .from('ai_usage_credits')
        .update({
          credits_purchased_addon: currentAddon + 100,
          updated_at: new Date().toISOString()
        })
        .eq('workspace_id', workspaceId);

      if (error) throw error;
      toast.success('Successfully added 100 top-up credits to balance!');
      await loadCredits();
    } catch (err: any) {
      toast.error(`Purchase failed: ${err.message}`);
    } finally {
      setPurchasing(false);
    }
  };

  const handleUpgradeTier = () => {
    toast.success('Redirecting to subscription plans portal...');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 bg-n800 border border-white/5 rounded-2xl">
        <i className="fa-solid fa-spinner animate-spin text-[24px] text-accent"></i>
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
      <div className="bg-n800 border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-accent"></div>
        
        <div className="flex items-center gap-4 mb-6">
          <div className="w-10 h-10 rounded-xl bg-accentg text-accent2 flex items-center justify-center">
            <Zap size={20} className="text-accent2" />
          </div>
          <div>
            <h4 className="text-[15px] font-space font-bold text-t1 uppercase">AI Balance Manager</h4>
            <p className="text-[11px] text-t3 font-medium uppercase tracking-widest">Monitor token consumption & ledger limits</p>
          </div>
        </div>

        {/* Speedometer Bar Visualizer */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
            <span className="text-t3">Active Plan Consumption Velocity</span>
            <span className="text-t1">{percentageUsed}% Used</span>
          </div>

          <div className="h-3 w-full bg-n600 rounded-full overflow-hidden border border-white/[0.02]">
            <div 
              style={{ width: `${percentageUsed}%` }}
              className={`h-full rounded-full transition-all duration-500 ${
                isFullyDepleted ? 'bg-[#ef4444]' : isHighUsage ? 'bg-[#f59e0b]' : 'bg-accent'
              }`}
            />
          </div>

          <div className="flex justify-between items-center text-[11px] text-t3 font-semibold">
            <span>{usedCredits} / {totalAllocated} Allocated Base Credits Expended</span>
            <span>Auto-refresh target date: <strong className="text-t2">{billingCycleEnd}</strong></span>
          </div>
        </div>
      </div>

      {/* Warning Box Trigger */}
      {isFullyDepleted ? (
        <div className="bg-red/10 border border-red/20 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="text-red shrink-0 mt-0.5" size={16} />
          <div>
            <h5 className="text-xs font-bold text-red uppercase">Usage Throttling Active</h5>
            <p className="text-[11px] text-t2 mt-0.5">
              This workspace has depleted 100% of its assigned AI credits. Downstream intelligence synthesis and content generation workflows are blocked.
            </p>
          </div>
        </div>
      ) : isHighUsage ? (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
          <div>
            <h5 className="text-xs font-bold text-amber-500 uppercase">Usage Alert: High Consumption</h5>
            <p className="text-[11px] text-t2 mt-0.5">
              This workspace has consumed more than 80% of its base credits. Purchase addon credits or upgrade platform tiers to avoid interruptions.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-[#10b981]/10 border border-[#10b981]/20 rounded-2xl p-4 flex items-start gap-3">
          <ShieldCheck className="text-[#34d399] shrink-0 mt-0.5" size={16} />
          <div>
            <h5 className="text-xs font-bold text-[#34d399] uppercase">Credit Ledger Standing: Healthy</h5>
            <p className="text-[11px] text-t2 mt-0.5">
              Downstream OpenAI engines and enrichment processes are running normally. No warnings triggered.
            </p>
          </div>
        </div>
      )}

      {/* Pricing / Tiers Matrix cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: Addon package */}
        <div className="bg-n800 border border-white/5 rounded-2xl p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-accent2">Top-Up Bundle</div>
            <h5 className="text-[15px] font-space font-bold text-t1 uppercase mt-1">Purchase Add-on Credits</h5>
            <p className="text-xs text-t3 leading-relaxed mt-2">
              Instantly credit your account ledger with 100 high-performance AI tokens for immediate execution tasks. Credits do not expire.
            </p>
            <div className="text-xl font-space font-black text-t1 mt-4">
              R99 <span className="text-xs font-bold text-t4">/ 100 Credits</span>
            </div>
          </div>

          <button
            onClick={handlePurchaseAddon}
            disabled={purchasing}
            className="w-full h-10 rounded-xl bg-accent hover:bg-accent2 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
          >
            {purchasing ? (
              <>
                <i className="fa-solid fa-spinner animate-spin text-[11px]"></i>
                Purchasing...
              </>
            ) : (
              <>
                Purchase 100 Add-on Credits
                <ArrowUpRight size={14} />
              </>
            )}
          </button>
        </div>

        {/* Card 2: Upgrade tier */}
        <div className="bg-n800 border border-white/5 rounded-2xl p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#10b981]">Enterprise Scaling</div>
            <h5 className="text-[15px] font-space font-bold text-t1 uppercase mt-1">Upgrade Platform Tiers</h5>
            <p className="text-xs text-t3 leading-relaxed mt-2">
              Unlock larger base plans with increased limits, custom compliance guidelines, custom templates, and direct CRM workflow integrations.
            </p>
            <div className="text-xl font-space font-black text-t1 mt-4">
              R499 <span className="text-xs font-bold text-t4">/ month (Pro Plan)</span>
            </div>
          </div>

          <button
            onClick={handleUpgradeTier}
            className="w-full h-10 rounded-xl bg-n600 border border-white/10 text-t1 hover:bg-n600/80 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
          >
            Upgrade Core Platform Tiers
            <ArrowUpRight size={14} />
          </button>
        </div>

      </div>

    </div>
  );
}
