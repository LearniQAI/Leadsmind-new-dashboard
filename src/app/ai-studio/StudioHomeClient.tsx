"use client";
import React, { useState } from 'react';
import { Sparkles, Brain, Zap, ArrowRight, Eye, ThumbsUp, ThumbsDown, Clock, ShieldCheck, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface StudioHomeClientProps {
  workspaceId: string;
  initialCredits: any;
  initialGenerations: any[];
}

export default function StudioHomeClient({
  workspaceId,
  initialCredits,
  initialGenerations
}: StudioHomeClientProps) {
  const router = useRouter();
  const supabase = createClient();
  
  const [credits, setCredits] = useState(initialCredits);
  const [generations, setGenerations] = useState<any[]>(initialGenerations);
  const [selectedGeneration, setSelectedGeneration] = useState<any | null>(null);
  
  // Feedback states
  const [ratedIds, setRatedIds] = useState<Record<string, 'up' | 'down'>>({});

  const baseCredits = credits?.plan_monthly_credits ?? 100;
  const addonCredits = credits?.credits_purchased_addon ?? 0;
  const totalAllocated = baseCredits + addonCredits;
  const usedCredits = credits?.credits_used_this_period ?? 0;
  
  const percentageUsed = totalAllocated > 0 ? Math.min(Math.round((usedCredits / totalAllocated) * 100), 100) : 0;
  const isHighUsage = percentageUsed >= 80;

  const billingCycleEnd = credits?.billing_cycle_end 
    ? new Date(credits.billing_cycle_end).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'June 14, 2026';

  const handleFeedback = async (genId: string, rating: 'up' | 'down') => {
    try {
      const isPositive = rating === 'up';
      const { error } = await supabase
        .from('ai_quality_feedback')
        .insert({
          workspace_id: workspaceId,
          generation_id: genId,
          is_positive_rating: isPositive,
          user_feedback_notes: `Rated ${rating} from AI Studio home dashboard`
        });

      if (error) throw error;
      
      setRatedIds(prev => ({ ...prev, [genId]: rating }));
      toast.success('Thank you for your quality feedback!');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to submit feedback rating');
    }
  };

  const getGenTypeLabel = (type: string) => {
    return type.replace(/_/g, ' ').toUpperCase();
  };

  return (
    <div className="min-h-screen bg-[#04091a] text-white p-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-[22px] font-space font-black uppercase tracking-tight leading-none mb-1 text-t1">
            LeadsMind <span className="text-[#3b82f6]">AI Operations Studio</span>
          </h1>
          <p className="text-[11px] font-medium text-t3 uppercase tracking-wider">
            Autonomous Content Agents & Customer Footprint Intelligence
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accentg/10 border border-accent/20 text-[11px] font-bold text-accent2 uppercase tracking-wide">
          <ShieldCheck size={12} className="animate-pulse" />
          HubSpot Breeze AI Parity Engine
        </span>
      </div>

      {/* Flattened Layout */}
      <div className="space-y-6">
        
        {/* Credits usage top bar */}
        <div className="bg-[#080f28] border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
              <Zap size={24} />
            </div>
            <div>
              <h5 className="text-[10px] font-bold text-t3 uppercase tracking-widest mb-1">AI Credit Ledger</h5>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-space font-black text-white">{usedCredits}</span>
                <span className="text-xs font-semibold text-t4">/ {totalAllocated} credits used</span>
              </div>
            </div>
          </div>

          <div className="flex-1 w-full max-w-md space-y-2">
            <div className="h-2.5 w-full bg-[#04091a] rounded-full overflow-hidden border border-white/[0.05]">
              <div 
                style={{ width: `${percentageUsed}%` }}
                className={`h-full rounded-full transition-all duration-500 ${
                  percentageUsed >= 100 ? 'bg-[#ef4444]' : isHighUsage ? 'bg-[#f59e0b]' : 'bg-[#3b82f6]'
                }`}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-t4 font-bold uppercase tracking-widest">
              <span>{percentageUsed}% Used</span>
              <span>Resets: {billingCycleEnd}</span>
            </div>
          </div>

          <button
            onClick={() => router.push('/settings?tab=ai-credits')}
            className="w-full md:w-auto px-6 py-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wide transition-all"
          >
            Manage Limits
          </button>
        </div>

        {/* Portals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Content Writer Studio Card */}
          <div 
            onClick={() => router.push('/ai-studio/content')}
            className="bg-[#080f28] border border-white/5 rounded-3xl p-6 flex flex-col justify-between hover:border-accent/30 hover:bg-[#0c1535]/40 transition-all cursor-pointer group relative overflow-hidden h-[180px]"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#3b82f6]/5 rounded-full blur-2xl group-hover:bg-[#3b82f6]/10 transition-all" />
            <div className="space-y-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accentg/10 text-accent2 flex items-center justify-center">
                  <Sparkles size={20} />
                </div>
                <h4 className="text-[15px] font-space font-bold uppercase text-t1 group-hover:text-accent2 transition-all">AI Content Writing Studio</h4>
              </div>
              <p className="text-xs text-t3 leading-relaxed">
                Generate SEO-optimized blog drafts, sales sequences, and platform variations.
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-accent2 uppercase tracking-wider relative z-10">
              Launch Writing Studio
              <ArrowRight size={13} className="transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Research Agent Portal Card */}
          <div 
            onClick={() => router.push('/ai-studio/research')}
            className="bg-[#080f28] border border-white/5 rounded-3xl p-6 flex flex-col justify-between hover:border-[#8b5cf6]/30 hover:bg-[#0c1535]/40 transition-all cursor-pointer group relative overflow-hidden h-[180px]"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#8b5cf6]/5 rounded-full blur-2xl group-hover:bg-[#8b5cf6]/10 transition-all" />
            <div className="space-y-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#8b5cf6]/10 text-[#a78bfa] flex items-center justify-center">
                  <Brain size={20} />
                </div>
                <h4 className="text-[15px] font-space font-bold uppercase text-t1 group-hover:text-[#a78bfa] transition-all">Customer Research Agent</h4>
              </div>
              <p className="text-xs text-t3 leading-relaxed">
                Build structured company snapshots and pre-meeting assessments autonomously.
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-[#a78bfa] uppercase tracking-wider relative z-10">
              Launch Research Portal
              <ArrowRight size={13} className="transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

        </div>
      </div>

      {/* Recent Generations Log table */}
      <div className="bg-[#080f28] border border-white/5 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-t3" />
            <h4 className="text-[13px] font-space font-bold uppercase tracking-wider text-t1">Recent Content Generations</h4>
          </div>
          <span className="text-[10px] text-t4 uppercase font-bold tracking-wider">Log limit: Last 10 operations</span>
        </div>

        {generations.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <Sparkles size={24} className="text-t4 opacity-40" />
            <p className="text-xs text-t3">No recent AI generations logged in this workspace yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold">
              <thead>
                <tr className="border-b border-white/5 text-[9px] uppercase tracking-widest text-t4">
                  <th className="py-3 px-4">Content Type</th>
                  <th className="py-3 px-4">AI Model</th>
                  <th className="py-3 px-4">Tokens Used</th>
                  <th className="py-3 px-4">Created At</th>
                  <th className="py-3 px-4 text-center">Quality Feedback</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03] text-t2">
                {generations.map((gen) => (
                  <tr key={gen.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-3 px-4 font-bold text-t1">{getGenTypeLabel(gen.generation_type)}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#a78bfa]">{gen.model_used}</td>
                    <td className="py-3 px-4 font-mono text-t2">{gen.tokens_used}</td>
                    <td className="py-3 px-4 text-t3">{new Date(gen.created_at).toLocaleDateString('en-ZA')}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => handleFeedback(gen.id, 'up')}
                          disabled={!!ratedIds[gen.id]}
                          className={`p-1.5 rounded-lg border transition-all ${
                            ratedIds[gen.id] === 'up'
                              ? 'bg-[#10b981]/15 border-[#10b981]/30 text-[#34d399]'
                              : 'border-white/5 hover:bg-white/5 text-t3 hover:text-white'
                          }`}
                        >
                          <ThumbsUp size={12} />
                        </button>
                        <button
                          onClick={() => handleFeedback(gen.id, 'down')}
                          disabled={!!ratedIds[gen.id]}
                          className={`p-1.5 rounded-lg border transition-all ${
                            ratedIds[gen.id] === 'down'
                              ? 'bg-[#ef4444]/15 border-[#ef4444]/30 text-red'
                              : 'border-white/5 hover:bg-white/5 text-t3 hover:text-white'
                          }`}
                        >
                          <ThumbsDown size={12} />
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedGeneration(gen)}
                        className="h-7 px-3.5 rounded-lg bg-white/5 hover:bg-white/10 text-t2 hover:text-white text-[11px] font-bold inline-flex items-center gap-1.5 transition-all"
                      >
                        <Eye size={12} />
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect generation full copy modal */}
      {selectedGeneration && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-[#080f28] border border-white/5 w-full max-w-xl rounded-3xl p-6 relative flex flex-col max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setSelectedGeneration(null)} 
              className="absolute top-4 right-4 text-t3 hover:text-white"
            >
              <X size={20} />
            </button>

            <div className="mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#a78bfa] font-mono">
                {selectedGeneration.model_used} • {selectedGeneration.tokens_used} tokens
              </span>
              <h3 className="text-base font-space font-black uppercase text-t1 mt-1">
                {getGenTypeLabel(selectedGeneration.generation_type)} Draft
              </h3>
            </div>

            <div className="bg-[#04091a] border border-white/5 rounded-2xl p-4 overflow-y-auto flex-1 text-xs text-t2 leading-relaxed whitespace-pre-wrap font-sans select-text">
              {selectedGeneration.output_content}
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 flex justify-end gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedGeneration.output_content);
                  toast.success('Copy text copied to clipboard!');
                }}
                className="h-9 px-4 rounded-lg bg-accent hover:bg-accent2 text-white font-bold text-xs uppercase tracking-wider"
              >
                Copy Content
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
