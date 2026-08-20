'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Sparkles, ChevronDown, ChevronUp, Loader2, AlertCircle, Clock, History,
  Download, ImageIcon, Wand2,
} from 'lucide-react';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashTextarea } from '@/components/dashboard-ui/FormField';
import { cn } from '@/lib/utils';

type AspectRatio = 'square' | 'portrait' | 'landscape';

const ASPECT_OPTIONS: { value: AspectRatio; label: string; hint: string }[] = [
  { value: 'square', label: 'Square', hint: '1:1 — Instagram feed' },
  { value: 'portrait', label: 'Portrait', hint: '2:3 — Story / Reel cover' },
  { value: 'landscape', label: 'Landscape', hint: '3:2 — banner / link preview' },
];

const STYLE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'No style preference' },
  { value: 'photorealistic', label: 'Photorealistic' },
  { value: 'illustration', label: 'Flat illustration' },
  { value: 'minimal', label: 'Minimalist' },
  { value: 'bold', label: 'Bold marketing graphic' },
];

interface GenerationRow {
  id: string;
  prompt: string;
  style_params: { aspectRatio: AspectRatio; style: string | null };
  public_url: string;
  created_at: string;
}

export default function ImageGenerator({ onInsert }: { onInsert: (url: string) => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('square');
  const [style, setStyle] = useState('');

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);

  const [result, setResult] = useState<GenerationRow | null>(null);
  const [inserted, setInserted] = useState(false);

  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<GenerationRow[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (cooldownSeconds === null || cooldownSeconds <= 0) return;
    const t = setTimeout(() => setCooldownSeconds(s => (s !== null ? s - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [cooldownSeconds]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Describe the image you want first');
      return;
    }
    setGenerating(true);
    setError(null);
    setInserted(false);
    try {
      const res = await fetch('/api/ai/image-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), aspectRatio, style: style || undefined }),
      });
      const body = await res.json();
      if (!res.ok) {
        if (res.status === 429 && body.retryAfterSeconds) {
          setCooldownSeconds(body.retryAfterSeconds);
        }
        throw new Error(body.error || 'Failed to generate image');
      }
      setResult(body);
      toast.success('Image generated');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      toast.error(err.message || 'Failed to generate image');
    } finally {
      setGenerating(false);
    }
  };

  const handleInsert = () => {
    if (!result) return;
    onInsert(result.public_url);
    setInserted(true);
    toast.success('Image attached to this post');
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/ai/image-generator?limit=12');
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
    setResult(gen);
    setPrompt(gen.prompt);
    setAspectRatio(gen.style_params?.aspectRatio || 'square');
    setStyle(gen.style_params?.style || '');
    setInserted(false);
    setShowHistory(false);
  };

  const cooldownActive = cooldownSeconds !== null && cooldownSeconds > 0;

  return (
    <div className="rounded-2xl border border-dash-accent/20 bg-dash-accent/[0.03] overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(v => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-dash-accent">
          <Wand2 className="w-4 h-4" />
          Generate an image with AI
        </span>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-dash-accent" /> : <ChevronDown className="w-4 h-4 text-dash-accent" />}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-dash-accent/10 pt-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold !text-dash-textMuted">Describe the image</label>
            <DashTextarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. A clean product shot of an invoice app dashboard on a laptop screen, soft studio lighting, teal accent color"
              className="h-20 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold !text-dash-textMuted">Aspect ratio</label>
              <div className="flex gap-1.5">
                {ASPECT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAspectRatio(opt.value)}
                    title={opt.hint}
                    className={cn(
                      'flex-1 px-2 py-2 rounded-lg text-[11px] font-bold border transition-colors motion-reduce:transition-none',
                      aspectRatio === opt.value
                        ? 'bg-dash-accent text-white border-dash-accent'
                        : 'bg-white !text-dash-textMuted border-dash-border hover:!text-dash-text'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold !text-dash-textMuted">Style (optional)</label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="w-full h-9 rounded-lg border border-dash-border bg-white px-3 text-[12px] !text-dash-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent"
              >
                {STYLE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <DashButton type="button" size="sm" onClick={handleGenerate} disabled={generating || cooldownActive}>
              {generating ? (
                <><Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" /> Generating…</>
              ) : cooldownActive ? (
                <><Clock className="w-4 h-4" /> Wait {cooldownSeconds}s</>
              ) : (
                <><Sparkles className="w-4 h-4" /> {result ? 'Regenerate' : 'Generate'}</>
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

          {generating && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-dash-accent/5 border border-dash-accent/20 text-[12px] !text-dash-text">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none text-dash-accent shrink-0" />
              Generating your image… this can take up to 30 seconds.
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red/10 border border-red/20 text-red text-[12px] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {showHistory && (
            <div className="rounded-xl border border-dash-border bg-white p-3">
              {historyLoading ? (
                <p className="text-[11px] !text-dash-textMuted">Loading…</p>
              ) : !history || history.length === 0 ? (
                <p className="text-[11px] !text-dash-textMuted">No past generations yet.</p>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto">
                  {history.map(gen => (
                    <button
                      key={gen.id}
                      type="button"
                      onClick={() => applyHistoryItem(gen)}
                      title={gen.prompt}
                      className="aspect-square rounded-lg overflow-hidden border border-dash-border hover:border-dash-accent transition-colors motion-reduce:transition-none"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={gen.public_url} alt={gen.prompt} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {result && (
            <div className="space-y-3 rounded-xl border border-dash-border bg-white p-3">
              <div className="rounded-lg overflow-hidden border border-dash-border bg-dash-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={result.public_url} alt={result.prompt} className="w-full max-h-80 object-contain" />
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <a
                  href={result.public_url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold !text-dash-textMuted hover:!text-dash-text"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
                <DashButton type="button" size="sm" onClick={handleInsert}>
                  <ImageIcon className="w-3.5 h-3.5" /> {inserted ? 'Attached to post' : 'Use this image'}
                </DashButton>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
