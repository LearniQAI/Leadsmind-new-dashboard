'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Sparkles, ChevronDown, ChevronUp, Loader2, AlertCircle, Clock, X as XIcon,
  Plus, History, Wand2,
} from 'lucide-react';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashInput, DashTextarea } from '@/components/dashboard-ui/FormField';
import { DashStatusPill } from '@/components/dashboard-ui/StatusPill';
import { cn } from '@/lib/utils';

type ScriptPlatform = 'tiktok' | 'instagram_reels' | 'youtube_shorts';

const PLATFORM_LABELS: Record<ScriptPlatform, string> = {
  tiktok: 'TikTok',
  instagram_reels: 'Instagram Reels',
  youtube_shorts: 'YouTube Shorts',
};

interface GeneratedScript {
  hook: string;
  body_beats: string[];
  cta: string;
}

interface GenerationRow {
  id: string;
  platform: ScriptPlatform;
  input_params: { topic: string; platform: ScriptPlatform; tone: string | null };
  generated_script: GeneratedScript;
  generated_hashtags: string[];
  created_at: string;
}

function composerPlatformsToScriptPlatform(selectedPlatforms: string[]): ScriptPlatform {
  if (selectedPlatforms.includes('tiktok')) return 'tiktok';
  if (selectedPlatforms.includes('instagram')) return 'instagram_reels';
  if (selectedPlatforms.includes('youtube')) return 'youtube_shorts';
  return 'tiktok';
}

function buildInsertText(script: GeneratedScript, hashtags: string[]): string {
  const parts = [
    script.hook.trim(),
    script.body_beats.map(b => b.trim()).filter(Boolean).join('\n\n'),
    script.cta.trim(),
  ].filter(Boolean);
  const body = parts.join('\n\n');
  const tagLine = hashtags.length ? hashtags.map(h => `#${h.replace(/^#/, '')}`).join(' ') : '';
  return tagLine ? `${body}\n\n${tagLine}` : body;
}

export default function VideoScriptGenerator({
  selectedPlatforms,
  onInsert,
}: {
  selectedPlatforms: string[];
  onInsert: (text: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState<ScriptPlatform>(() => composerPlatformsToScriptPlatform(selectedPlatforms));
  const [tone, setTone] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);

  const [script, setScript] = useState<GeneratedScript | null>(null);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [newHashtag, setNewHashtag] = useState('');
  const [inserted, setInserted] = useState(false);

  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<GenerationRow[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Keep the platform selector in sync with the composer's own platform
  // picks, but only until the user has generated something for this session
  // — once they have a result in hand, switching composer platforms
  // shouldn't yank the script platform out from under them.
  useEffect(() => {
    if (!script) {
      setPlatform(composerPlatformsToScriptPlatform(selectedPlatforms));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlatforms.join(',')]);

  useEffect(() => {
    if (cooldownSeconds === null || cooldownSeconds <= 0) return;
    const t = setTimeout(() => setCooldownSeconds(s => (s !== null ? s - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [cooldownSeconds]);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error('Add a topic or idea first');
      return;
    }
    setGenerating(true);
    setError(null);
    setInserted(false);
    try {
      const res = await fetch('/api/social/video-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), platform, tone: tone.trim() || undefined }),
      });
      const resBody = await res.json();
      if (!res.ok) {
        if (res.status === 429 && resBody.retryAfterSeconds) {
          setCooldownSeconds(resBody.retryAfterSeconds);
        }
        throw new Error(resBody.error || 'Failed to generate script');
      }
      setScript(resBody.generated_script);
      setHashtags(resBody.generated_hashtags || []);
      toast.success('Script generated');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      toast.error(err.message || 'Failed to generate script');
    } finally {
      setGenerating(false);
    }
  };

  const handleInsert = () => {
    if (!script) return;
    onInsert(buildInsertText(script, hashtags));
    setInserted(true);
    toast.success('Inserted into post');
  };

  const removeHashtag = (tag: string) => setHashtags(prev => prev.filter(h => h !== tag));
  const addHashtag = () => {
    const clean = newHashtag.trim().replace(/^#/, '').replace(/\s+/g, '');
    if (!clean) return;
    if (!hashtags.includes(clean)) setHashtags(prev => [...prev, clean]);
    setNewHashtag('');
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/social/video-script?limit=10');
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
    setScript(gen.generated_script);
    setHashtags(gen.generated_hashtags || []);
    setPlatform(gen.platform);
    setTopic(gen.input_params?.topic || '');
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
          Generate script &amp; hashtags with AI
          {inserted && <DashStatusPill variant="success" className="ml-1">Inserted</DashStatusPill>}
        </span>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-dash-accent" /> : <ChevronDown className="w-4 h-4 text-dash-accent" />}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-dash-accent/10 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-[11px] font-bold !text-dash-textMuted">Topic or idea</label>
              <DashInput
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. 3 mistakes SMEs make with invoicing"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold !text-dash-textMuted">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as ScriptPlatform)}
                className="w-full h-11 rounded-xl border border-dash-border bg-white px-3.5 text-sm !text-dash-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent"
              >
                {(Object.keys(PLATFORM_LABELS) as ScriptPlatform[]).map(p => (
                  <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold !text-dash-textMuted">Tone / style (optional)</label>
            <DashInput
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              placeholder="e.g. playful, no-nonsense, high-energy..."
            />
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <DashButton
              type="button"
              size="sm"
              onClick={handleGenerate}
              disabled={generating || cooldownActive}
            >
              {generating ? (
                <><Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" /> Generating…</>
              ) : cooldownActive ? (
                <><Clock className="w-4 h-4" /> Wait {cooldownSeconds}s</>
              ) : (
                <><Sparkles className="w-4 h-4" /> {script ? 'Regenerate' : 'Generate'}</>
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
                      <span className="text-[12px] font-bold !text-dash-text truncate">{gen.input_params?.topic || '(no topic)'}</span>
                      <DashStatusPill variant="neutral">{PLATFORM_LABELS[gen.platform]}</DashStatusPill>
                    </div>
                    <span className="text-[10px] !text-dash-textMuted">{new Date(gen.created_at).toLocaleString()}</span>
                  </button>
                ))
              )}
            </div>
          )}

          {script && (
            <div className="space-y-4 rounded-xl border border-dash-border bg-white p-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold !text-dash-textMuted">Hook</label>
                <DashTextarea
                  value={script.hook}
                  onChange={(e) => setScript(s => (s ? { ...s, hook: e.target.value } : s))}
                  className="h-16 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold !text-dash-textMuted">Body beats</label>
                <div className="space-y-2">
                  {script.body_beats.map((beat, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="mt-2.5 text-[10px] font-bold !text-dash-textMuted w-4 shrink-0">{i + 1}.</span>
                      <DashTextarea
                        value={beat}
                        onChange={(e) => setScript(s => {
                          if (!s) return s;
                          const nextBeats = [...s.body_beats];
                          nextBeats[i] = e.target.value;
                          return { ...s, body_beats: nextBeats };
                        })}
                        className="h-14 resize-none flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => setScript(s => (s ? { ...s, body_beats: s.body_beats.filter((_, bi) => bi !== i) } : s))}
                        className="mt-2.5 !text-dash-textMuted hover:!text-red shrink-0"
                        title="Remove beat"
                      >
                        <XIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <DashButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setScript(s => (s ? { ...s, body_beats: [...s.body_beats, ''] } : s))}
                  >
                    <Plus className="w-3.5 h-3.5" /> Add beat
                  </DashButton>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold !text-dash-textMuted">Call-to-action</label>
                <DashTextarea
                  value={script.cta}
                  onChange={(e) => setScript(s => (s ? { ...s, cta: e.target.value } : s))}
                  className="h-16 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold !text-dash-textMuted flex items-center gap-1.5">
                  AI-suggested hashtags
                  <span className="font-normal normal-case !text-dash-textMuted/70">(topic-relevant, not live trending data)</span>
                </label>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {hashtags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-dash-accent/10 text-dash-accent text-[11px] font-bold"
                    >
                      #{tag}
                      <button type="button" onClick={() => removeHashtag(tag)} title="Remove hashtag">
                        <XIcon className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <div className="flex items-center gap-1">
                    <input
                      value={newHashtag}
                      onChange={(e) => setNewHashtag(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addHashtag(); } }}
                      placeholder="add tag"
                      className="w-24 h-7 px-2 rounded-full border border-dash-border text-[11px] !text-dash-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent"
                    />
                    <button
                      type="button"
                      onClick={addHashtag}
                      className="w-6 h-6 rounded-full bg-dash-surface flex items-center justify-center !text-dash-textMuted hover:!text-dash-text"
                      title="Add hashtag"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className={cn('flex items-center justify-end pt-1', 'border-t border-dash-border')}>
                <DashButton type="button" size="sm" onClick={handleInsert}>
                  {inserted ? 'Update post content' : 'Insert into post'}
                </DashButton>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
