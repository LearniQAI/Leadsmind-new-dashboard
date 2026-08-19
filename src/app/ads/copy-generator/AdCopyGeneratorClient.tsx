'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft, Sparkles, Loader2, AlertCircle, Clock, History, Copy, Check,
} from 'lucide-react';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashInput, DashTextarea } from '@/components/dashboard-ui/FormField';
import { DashStatusPill } from '@/components/dashboard-ui/StatusPill';
import { cn } from '@/lib/utils';

type Platform = 'facebook' | 'google' | 'linkedin';

interface CopyField {
  text: string;
  charCount: number;
  limit: number;
  truncated: boolean;
}
interface GoogleCopy { headlines: CopyField[]; descriptions: CopyField[] }
interface FacebookCopy { primaryText: CopyField; headlines: CopyField[]; description: CopyField }
interface LinkedInCopy { introText: CopyField; headlines: CopyField[]; description: CopyField }
type GeneratedCopy = GoogleCopy | FacebookCopy | LinkedInCopy;

interface GenerationRow {
  id: string;
  platform: Platform;
  campaign_id: string | null;
  input_params: { product: string; audience: string; benefit: string; tone: string | null };
  generated_copy: GeneratedCopy;
  created_at: string;
}

const PLATFORM_LABELS: Record<Platform, string> = {
  facebook: 'Facebook / Instagram',
  google: 'Google Search Ads',
  linkedin: 'LinkedIn',
};

function CopyableField({ label, field }: { label: string; field: CopyField }) {
  const [copied, setCopied] = useState(false);
  const overLimit = field.charCount > field.limit || field.truncated;

  const handleCopy = () => {
    navigator.clipboard.writeText(field.text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-dash-border bg-white p-3 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold !text-dash-textMuted uppercase tracking-wide">{label}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn('text-[10px] font-bold', overLimit ? 'text-red' : '!text-dash-textMuted')}>
            {field.charCount}/{field.limit}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            title="Copy to clipboard"
            className="!text-dash-textMuted hover:!text-dash-text"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
      <p className={cn('text-[13px] !text-dash-text leading-snug', overLimit && 'text-red')}>{field.text}</p>
      {field.truncated && (
        <p className="text-[10px] text-red flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> Truncated to fit the platform's real character limit
        </p>
      )}
    </div>
  );
}

export default function AdCopyGeneratorClient({ initialCampaigns }: { initialCampaigns: any[] }) {
  const [platform, setPlatform] = useState<Platform>('google');
  const [product, setProduct] = useState('');
  const [audience, setAudience] = useState('');
  const [benefit, setBenefit] = useState('');
  const [tone, setTone] = useState('');
  const [campaignId, setCampaignId] = useState('');

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);

  const [copy, setCopy] = useState<GeneratedCopy | null>(null);
  const [resultPlatform, setResultPlatform] = useState<Platform | null>(null);

  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<GenerationRow[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (cooldownSeconds === null || cooldownSeconds <= 0) return;
    const t = setTimeout(() => setCooldownSeconds(s => (s !== null ? s - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [cooldownSeconds]);

  const handleGenerate = async () => {
    if (!product.trim() || !audience.trim() || !benefit.trim()) {
      toast.error('Product/service, audience, and key benefit are all required');
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/ads/copy-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: product.trim(),
          audience: audience.trim(),
          benefit: benefit.trim(),
          tone: tone.trim() || undefined,
          platform,
          campaignId: campaignId || undefined,
        }),
      });
      const resBody = await res.json();
      if (!res.ok) {
        if (res.status === 429 && resBody.retryAfterSeconds) {
          setCooldownSeconds(resBody.retryAfterSeconds);
        }
        throw new Error(resBody.error || 'Failed to generate ad copy');
      }
      setCopy(resBody.generated_copy);
      setResultPlatform(resBody.platform);
      toast.success('Ad copy generated');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      toast.error(err.message || 'Failed to generate ad copy');
    } finally {
      setGenerating(false);
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/ads/copy-generator?limit=10');
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to load history');
      setHistory(body.generations || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load past generations');
    } finally {
      setHistoryLoading(false);
    }
  };

  const toggleHistory = () => {
    const next = !showHistory;
    setShowHistory(next);
    if (next && history === null) loadHistory();
  };

  const applyHistoryItem = (gen: GenerationRow) => {
    setCopy(gen.generated_copy);
    setResultPlatform(gen.platform);
    setPlatform(gen.platform);
    setProduct(gen.input_params?.product || '');
    setAudience(gen.input_params?.audience || '');
    setBenefit(gen.input_params?.benefit || '');
    setTone(gen.input_params?.tone || '');
    setCampaignId(gen.campaign_id || '');
    setShowHistory(false);
  };

  const cooldownActive = cooldownSeconds !== null && cooldownSeconds > 0;

  return (
    <div className="space-y-6">
      <Link href="/ads" className="inline-flex items-center gap-1.5 text-[12px] font-semibold !text-dash-textMuted hover:!text-dash-text">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to campaigns
      </Link>

      <div>
        <h1 className="text-[22px] font-bold !text-dash-text flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-dash-accent" />
          Ad Copy <span className="text-dash-accent">Generator</span>
        </h1>
        <p className="text-[12px] font-medium mt-1 !text-dash-textMuted">
          Platform-correct ad copy for Facebook, Google, and LinkedIn — real character limits enforced, nothing to copy-paste-guess.
        </p>
      </div>

      <DashCard padding="default" interactive={false}>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {(Object.keys(PLATFORM_LABELS) as Platform[]).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPlatform(p)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-colors motion-reduce:transition-none',
                  platform === p
                    ? 'bg-dash-accent text-white border-dash-accent'
                    : 'bg-dash-surface !text-dash-textMuted border-dash-border hover:!text-dash-text'
                )}
              >
                {PLATFORM_LABELS[p]}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold !text-dash-textMuted">Product or service</label>
            <DashInput value={product} onChange={(e) => setProduct(e.target.value)} placeholder="e.g. Cloud-based invoicing software for small accounting firms" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold !text-dash-textMuted">Target audience</label>
              <DashInput value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g. Solo bookkeepers in South Africa" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold !text-dash-textMuted">Key benefit / offer</label>
              <DashInput value={benefit} onChange={(e) => setBenefit(e.target.value)} placeholder="e.g. Cuts invoice prep time from 2 hours to 10 minutes" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold !text-dash-textMuted">Tone / style (optional)</label>
              <DashInput value={tone} onChange={(e) => setTone(e.target.value)} placeholder="e.g. plain-spoken, confident, no hype" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold !text-dash-textMuted">Attach to campaign (optional)</label>
              <select
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                className="w-full h-11 rounded-xl border border-dash-border bg-white px-3.5 text-sm !text-dash-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent"
              >
                <option value="">None — standalone</option>
                {initialCampaigns.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <DashButton onClick={handleGenerate} disabled={generating || cooldownActive}>
              {generating ? (
                <><Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" /> Generating…</>
              ) : cooldownActive ? (
                <><Clock className="w-4 h-4" /> Wait {cooldownSeconds}s</>
              ) : (
                <><Sparkles className="w-4 h-4" /> {copy ? 'Regenerate' : 'Generate'}</>
              )}
            </DashButton>
            <button
              type="button"
              onClick={toggleHistory}
              className="text-[11px] font-bold !text-dash-textMuted hover:!text-dash-text flex items-center gap-1.5"
            >
              <History className="w-3.5 h-3.5" /> View past generations
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red/10 border border-red/20 text-red text-[12px] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {showHistory && (
            <div className="rounded-xl border border-dash-border bg-white p-3 space-y-2 max-h-52 overflow-y-auto">
              {historyLoading ? (
                <p className="text-[11px] !text-dash-textMuted">Loading…</p>
              ) : !history || history.length === 0 ? (
                <p className="text-[11px] !text-dash-textMuted">No past generations yet.</p>
              ) : (
                history.map(gen => (
                  <button
                    key={gen.id}
                    type="button"
                    onClick={() => applyHistoryItem(gen)}
                    className="w-full text-left p-2.5 rounded-lg hover:bg-dash-surface transition-colors motion-reduce:transition-none"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-bold !text-dash-text truncate">{gen.input_params?.product || '(no product)'}</span>
                      <DashStatusPill variant="neutral">{PLATFORM_LABELS[gen.platform]}</DashStatusPill>
                    </div>
                    <span className="text-[10px] !text-dash-textMuted">{new Date(gen.created_at).toLocaleString()}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </DashCard>

      {copy && resultPlatform === 'google' && (
        <DashCard padding="default" interactive={false} className="space-y-5">
          <div>
            <h3 className="text-sm font-bold !text-dash-text mb-2">Headlines ({(copy as GoogleCopy).headlines.length} variants)</h3>
            <div className="space-y-2">
              {(copy as GoogleCopy).headlines.map((h, i) => (
                <CopyableField key={i} label={`Headline ${i + 1}`} field={h} />
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold !text-dash-text mb-2">Descriptions ({(copy as GoogleCopy).descriptions.length} variants)</h3>
            <div className="space-y-2">
              {(copy as GoogleCopy).descriptions.map((d, i) => (
                <CopyableField key={i} label={`Description ${i + 1}`} field={d} />
              ))}
            </div>
          </div>
        </DashCard>
      )}

      {copy && resultPlatform === 'facebook' && (
        <DashCard padding="default" interactive={false} className="space-y-5">
          <CopyableField label="Primary text" field={(copy as FacebookCopy).primaryText} />
          <div>
            <h3 className="text-sm font-bold !text-dash-text mb-2">Headline options</h3>
            <div className="space-y-2">
              {(copy as FacebookCopy).headlines.map((h, i) => (
                <CopyableField key={i} label={`Headline ${i + 1}`} field={h} />
              ))}
            </div>
          </div>
          <CopyableField label="Description" field={(copy as FacebookCopy).description} />
        </DashCard>
      )}

      {copy && resultPlatform === 'linkedin' && (
        <DashCard padding="default" interactive={false} className="space-y-5">
          <CopyableField label="Intro text" field={(copy as LinkedInCopy).introText} />
          <div>
            <h3 className="text-sm font-bold !text-dash-text mb-2">Headline options</h3>
            <div className="space-y-2">
              {(copy as LinkedInCopy).headlines.map((h, i) => (
                <CopyableField key={i} label={`Headline ${i + 1}`} field={h} />
              ))}
            </div>
          </div>
          <CopyableField label="Description" field={(copy as LinkedInCopy).description} />
        </DashCard>
      )}

      {!copy && (
        <DashCard padding="default" interactive={false} className="text-center py-12">
          <Sparkles className="w-8 h-8 mx-auto text-dash-textMuted mb-3" />
          <p className="text-[12px] !text-dash-textMuted">Fill in the form above and click "Generate" to get platform-ready ad copy.</p>
        </DashCard>
      )}
    </div>
  );
}
