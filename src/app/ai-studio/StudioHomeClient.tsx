"use client";
import React, { useState } from 'react';
import { Sparkles, Brain, Zap, ArrowRight, Eye, ThumbsUp, ThumbsDown, Clock, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { DashCard, DashButton, DashEmptyState, DashStatusPill } from '@/components/dashboard-ui';
import { cn } from '@/lib/utils';

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

  // Sentence case, not shouted: "blog_post" -> "Blog post"
  const getGenTypeLabel = (type: string) => {
    const spaced = type.replace(/_/g, ' ');
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  };

  return (
    <div className="min-h-screen bg-dash-bg p-6 md:p-8 space-y-8 animate-in fade-in duration-300 motion-reduce:animate-none">

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-dash-border pb-6">
        <div>
          <h1 className="text-[22px] font-bold leading-none mb-1.5 !text-dash-text">
            AI Studio
          </h1>
          <p className="text-[13px] font-medium !text-dash-textMuted">
            AI tools for content creation and customer research.
          </p>
        </div>

        <DashStatusPill variant="accent" dot>
          AI-powered
        </DashStatusPill>
      </div>

      {/* Flattened Layout */}
      <div className="space-y-6">

        {/* Credits usage top bar */}
        <DashCard padding="default" className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="w-12 h-12 rounded-xl bg-dash-accent/10 !text-dash-accent flex items-center justify-center shrink-0">
              <Zap size={22} />
            </div>
            <div>
              <h5 className="text-[11px] font-bold !text-dash-textMuted mb-1">AI credit ledger</h5>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold !text-dash-text" style={{ fontVariantNumeric: 'tabular-nums' }}>{usedCredits}</span>
                <span className="text-xs font-semibold !text-dash-textMuted">/ {totalAllocated} credits used</span>
              </div>
            </div>
          </div>

          <div className="flex-1 w-full max-w-md space-y-2">
            <div className="h-2.5 w-full bg-dash-surface rounded-full overflow-hidden border border-dash-border">
              <div
                style={{ width: `${percentageUsed}%` }}
                className={cn(
                  "h-full rounded-full transition-all duration-500 motion-reduce:transition-none",
                  percentageUsed >= 100 ? "bg-red" : isHighUsage ? "bg-amber" : "bg-dash-accent"
                )}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] !text-dash-textMuted font-medium">
              <span>{percentageUsed}% used</span>
              <span>Resets {billingCycleEnd}</span>
            </div>
          </div>

          <DashButton variant="secondary" size="sm" onClick={() => router.push('/settings?tab=ai-credits')}>
            Manage limits
          </DashButton>
        </DashCard>

        {/* Portals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Content Writer Studio Card */}
          <DashCard
            padding="default"
            onClick={() => router.push('/ai-studio/content')}
            className="flex flex-col justify-between cursor-pointer group hover:border-dash-accent/30 h-[172px]"
          >
            <div className="space-y-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-dash-accent/10 !text-dash-accent flex items-center justify-center flex-shrink-0">
                  <Sparkles size={19} />
                </div>
                <h4 className="text-[15px] font-bold !text-dash-text">AI Content Writing Studio</h4>
              </div>
              <p className="text-[13px] !text-dash-textMuted leading-relaxed">
                Generate SEO-optimized blog drafts, sales sequences, and platform variations.
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-[13px] font-bold text-dash-accent">
              Launch writing studio
              <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform motion-reduce:group-hover:translate-x-0" />
            </div>
          </DashCard>

          {/* Research Agent Portal Card */}
          <DashCard
            padding="default"
            onClick={() => router.push('/ai-studio/research')}
            className="flex flex-col justify-between cursor-pointer group hover:border-purple/30 h-[172px]"
          >
            <div className="space-y-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple/10 !text-purple flex items-center justify-center flex-shrink-0">
                  <Brain size={19} />
                </div>
                <h4 className="text-[15px] font-bold !text-dash-text">Customer Research Agent</h4>
              </div>
              <p className="text-[13px] !text-dash-textMuted leading-relaxed">
                Build structured company snapshots and pre-meeting assessments automatically.
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-[13px] font-bold !text-purple">
              Launch research portal
              <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform motion-reduce:group-hover:translate-x-0" />
            </div>
          </DashCard>

        </div>
      </div>

      {/* Recent Generations Log table */}
      <DashCard padding="default">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock size={16} className="!text-dash-textMuted" />
            <h4 className="text-[14px] font-bold !text-dash-text">Recent content generations</h4>
          </div>
          <span className="text-[11px] !text-dash-textMuted font-medium">Showing the last 10</span>
        </div>

        {generations.length === 0 ? (
          <DashEmptyState
            icon={Sparkles}
            title="No generations yet"
            description="AI content and research generations will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-dash-border text-[10px] font-bold !text-dash-textMuted">
                  <th className="py-2.5 px-3">Content type</th>
                  <th className="py-2.5 px-3">AI model</th>
                  <th className="py-2.5 px-3">Tokens used</th>
                  <th className="py-2.5 px-3">Created</th>
                  <th className="py-2.5 px-3 text-center">Feedback</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dash-border">
                {generations.map((gen) => (
                  <tr key={gen.id} className="hover:bg-dash-surface/60 transition-colors motion-reduce:transition-none">
                    <td className="py-3 px-3 font-bold !text-dash-text">{getGenTypeLabel(gen.generation_type)}</td>
                    <td className="py-3 px-3 font-mono text-[11px] !text-purple">{gen.model_used}</td>
                    <td className="py-3 px-3 font-mono !text-dash-textMuted">{gen.tokens_used}</td>
                    <td className="py-3 px-3 !text-dash-textMuted">{new Date(gen.created_at).toLocaleDateString('en-ZA')}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleFeedback(gen.id, 'up')}
                          disabled={!!ratedIds[gen.id]}
                          className={cn(
                            "p-1.5 rounded-lg border transition-all motion-reduce:transition-none",
                            ratedIds[gen.id] === 'up'
                              ? "bg-green/10 border-green/30 !text-green"
                              : "border-dash-border hover:bg-dash-surface !text-dash-textMuted hover:!text-dash-text"
                          )}
                        >
                          <ThumbsUp size={12} />
                        </button>
                        <button
                          onClick={() => handleFeedback(gen.id, 'down')}
                          disabled={!!ratedIds[gen.id]}
                          className={cn(
                            "p-1.5 rounded-lg border transition-all motion-reduce:transition-none",
                            ratedIds[gen.id] === 'down'
                              ? "bg-red/10 border-red/30 !text-red"
                              : "border-dash-border hover:bg-dash-surface !text-dash-textMuted hover:!text-dash-text"
                          )}
                        >
                          <ThumbsDown size={12} />
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setSelectedGeneration(gen)}
                        className="h-7 px-3 rounded-lg bg-dash-surface hover:bg-dash-border/60 !text-dash-textMuted hover:!text-dash-text text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors motion-reduce:transition-none"
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
      </DashCard>

      {/* Inspect generation full copy modal */}
      {selectedGeneration && (
        <div className="fixed inset-0 bg-dash-text/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 motion-reduce:animate-none">
          <div className="bg-white border border-dash-border w-full max-w-xl rounded-2xl shadow-2xl p-6 relative flex flex-col max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-200 motion-reduce:animate-none">
            <button
              onClick={() => setSelectedGeneration(null)}
              className="absolute top-4 right-4 !text-dash-textMuted hover:!text-dash-text"
            >
              <X size={20} />
            </button>

            <div className="mb-4">
              <span className="text-[10px] font-bold !text-purple font-mono">
                {selectedGeneration.model_used} • {selectedGeneration.tokens_used} tokens
              </span>
              <h3 className="text-base font-bold !text-dash-text mt-1">
                {getGenTypeLabel(selectedGeneration.generation_type)} draft
              </h3>
            </div>

            <div className="bg-dash-surface border border-dash-border rounded-2xl p-4 overflow-y-auto flex-1 text-[13px] !text-dash-text leading-relaxed whitespace-pre-wrap select-text">
              {selectedGeneration.output_content}
            </div>

            <div className="mt-4 pt-4 border-t border-dash-border flex justify-end gap-3">
              <DashButton
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(selectedGeneration.output_content);
                  toast.success('Copy text copied to clipboard!');
                }}
              >
                Copy content
              </DashButton>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
