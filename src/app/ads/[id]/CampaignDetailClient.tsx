'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Sparkles, RefreshCw, AlertCircle, Clock, ListChecks } from 'lucide-react';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashStatusPill } from '@/components/dashboard-ui/StatusPill';

interface CampaignRecord {
  id: string;
  name: string | null;
  platform: string | null;
  status: string | null;
  budget_daily: number | null;
  spend_to_date: number | null;
  impressions: number;
  clicks: number;
  conversions: number;
  leads_created: number;
}

interface DerivedMetrics {
  ctrPercent: number | null;
  conversionRatePercent: number | null;
  cpc: number | null;
  cpa: number | null;
}

interface RecommendationItem {
  priority: number;
  metric: string;
  observation: string;
  recommendation: string;
}

interface RecommendationRow {
  id: string;
  created_at: string;
  recommendations: RecommendationItem[];
}

interface RecommendationsGetResponse {
  recommendation: RecommendationRow | null;
  campaign: CampaignRecord;
  derivedMetrics: DerivedMetrics;
  hasEnoughData: boolean;
}

function statCard(label: string, value: string) {
  return (
    <DashCard padding="default">
      <span className="text-[11px] font-bold !text-dash-textMuted block mb-2">{label}</span>
      <span className="text-2xl font-bold !text-dash-text leading-none">{value}</span>
    </DashCard>
  );
}

export default function CampaignDetailClient({ initialCampaign }: { initialCampaign: CampaignRecord }) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);
  const [data, setData] = useState<RecommendationsGetResponse | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ads/campaigns/${initialCampaign.id}/recommendations`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to load recommendations');
      setData(body);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [initialCampaign.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (cooldownSeconds === null || cooldownSeconds <= 0) return;
    const t = setTimeout(() => setCooldownSeconds(s => (s !== null ? s - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [cooldownSeconds]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/ads/campaigns/${initialCampaign.id}/recommendations`, { method: 'POST' });
      const body = await res.json();
      if (!res.ok) {
        if (res.status === 429 && body.retryAfterSeconds) {
          setCooldownSeconds(body.retryAfterSeconds);
        }
        throw new Error(body.error || 'Failed to generate recommendations');
      }
      toast.success('New recommendations generated');
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      toast.error(err.message || 'Failed to generate recommendations');
    } finally {
      setGenerating(false);
    }
  };

  const campaign = data?.campaign ?? initialCampaign;
  const derived = data?.derivedMetrics;

  return (
    <div className="space-y-6">
      <Link href="/ads" className="inline-flex items-center gap-1.5 text-[12px] font-semibold !text-dash-textMuted hover:!text-dash-text">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to campaigns
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold !text-dash-text">{campaign.name}</h1>
          <div className="flex items-center gap-2 mt-1.5">
            <DashStatusPill variant="neutral">{campaign.platform}</DashStatusPill>
            <DashStatusPill variant={campaign.status === 'active' ? 'success' : campaign.status === 'paused' ? 'warning' : 'neutral'}>
              {campaign.status}
            </DashStatusPill>
          </div>
        </div>
        <DashButton
          onClick={handleGenerate}
          disabled={generating || loading || (cooldownSeconds !== null && cooldownSeconds > 0) || !(data?.hasEnoughData ?? false)}
        >
          {generating ? (
            <><RefreshCw className="w-4 h-4 animate-spin motion-reduce:animate-none" /> Generating…</>
          ) : cooldownSeconds !== null && cooldownSeconds > 0 ? (
            <><Clock className="w-4 h-4" /> Wait {Math.ceil(cooldownSeconds / 60)}m</>
          ) : (
            <><Sparkles className="w-4 h-4" /> {data?.recommendation ? 'Regenerate recommendations' : 'Generate recommendations'}</>
          )}
        </DashButton>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red/10 border border-red/20 text-red text-[12px] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCard('Spend to date', `$${Number(campaign.spend_to_date ?? 0).toLocaleString()}`)}
        {statCard('Impressions', Number(campaign.impressions ?? 0).toLocaleString())}
        {statCard('Clicks', Number(campaign.clicks ?? 0).toLocaleString())}
        {statCard('Conversions', Number(campaign.conversions ?? 0).toLocaleString())}
        {statCard('CTR', derived?.ctrPercent != null ? `${derived.ctrPercent}%` : '—')}
        {statCard('Conversion rate', derived?.conversionRatePercent != null ? `${derived.conversionRatePercent}%` : '—')}
        {statCard('CPC', derived?.cpc != null ? `$${derived.cpc}` : '—')}
        {statCard('CPA', derived?.cpa != null ? `$${derived.cpa}` : '—')}
      </div>

      {loading ? (
        <div className="h-[220px] rounded-2xl bg-dash-surface animate-pulse motion-reduce:animate-none" />
      ) : !data?.hasEnoughData ? (
        <DashCard padding="default" interactive={false} className="text-center py-12">
          <ListChecks className="w-8 h-8 mx-auto text-dash-textMuted mb-3" />
          <h3 className="text-sm font-bold !text-dash-text mb-1">Not enough data yet</h3>
          <p className="text-[12px] !text-dash-textMuted max-w-md mx-auto">
            This campaign has no recorded spend, impressions, or clicks. Update its metrics to generate recommendations.
          </p>
        </DashCard>
      ) : !data?.recommendation ? (
        <DashCard padding="default" interactive={false} className="text-center py-12">
          <Sparkles className="w-8 h-8 mx-auto text-dash-textMuted mb-3" />
          <p className="text-[12px] !text-dash-textMuted">No recommendations generated yet. Click "Generate recommendations" above.</p>
        </DashCard>
      ) : (
        <DashCard padding="default" interactive={false}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold !text-dash-text">AI recommendations</h3>
            <span className="text-[11px] !text-dash-textMuted">
              Generated {new Date(data.recommendation.created_at).toLocaleString()}
            </span>
          </div>
          <ol className="space-y-4">
            {(data.recommendation.recommendations ?? [])
              .slice()
              .sort((a, b) => a.priority - b.priority)
              .map((rec, i) => (
                <li key={i} className="flex gap-3 p-4 rounded-xl bg-dash-surface/60 border border-dash-border">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-dash-accent text-white text-[11px] font-bold flex items-center justify-center">
                    {rec.priority ?? i + 1}
                  </span>
                  <div className="space-y-1">
                    <DashStatusPill variant="accent" className="uppercase">{rec.metric}</DashStatusPill>
                    <p className="text-[13px] !text-dash-text"><span className="font-semibold">Observation:</span> {rec.observation}</p>
                    <p className="text-[13px] !text-dash-text"><span className="font-semibold">Recommendation:</span> {rec.recommendation}</p>
                  </div>
                </li>
              ))}
          </ol>
        </DashCard>
      )}
    </div>
  );
}
