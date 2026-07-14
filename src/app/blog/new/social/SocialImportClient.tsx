'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { expandSocialPostToBlog } from '@/app/actions/socialImport';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import VoiceRecorder from '@/components/blog/editor/VoiceRecorder';
import { Sparkles, Mic, ArrowLeft, Loader2, Link2, Facebook, Instagram, Linkedin, Twitter, MessageSquare, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashFormField, DashInput, DashTextarea } from '@/components/dashboard-ui/FormField';

type TabState = 'social' | 'voice';
type PlatformState = 'facebook' | 'instagram' | 'linkedin' | 'twitter' | 'tiktok' | 'whatsapp';

export default function SocialImportClient() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabState>('social');
  const [platform, setPlatform] = useState<PlatformState>('linkedin');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceText, setSourceText] = useState('');

  // States
  const [isScraping, setIsScraping] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dynamic Open Graph Scraper
  const handleScrapeUrl = async () => {
    if (!sourceUrl.trim()) return;
    setErrorMessage(null);
    setIsScraping(true);

    try {
      const res = await fetch('/api/blog/social-import/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: sourceUrl.trim() })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Server failed to scrape URL.');
      }

      if (data.description) {
        setSourceText(data.description);
      } else if (data.title) {
        setSourceText(data.title);
      } else {
        throw new Error('No public captions or descriptive Open Graph tags resolved.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Scraper failed to bypass walls or fetch meta tags.');
    } finally {
      setIsScraping(false);
    }
  };

  // GPT-4o-mini Expansion Ingestion
  const handleExpandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceText.trim()) return;

    setErrorMessage(null);
    setIsExpanding(true);

    try {
      const res = await expandSocialPostToBlog({
        sourceText: sourceText.trim(),
        platform,
        sourceUrl: sourceUrl.trim() || undefined
      });

      if (res.error) {
        throw new Error(res.error);
      }

      if (res.data?.postId) {
        router.push(`/blog/editor/${res.data.postId}`);
      } else {
        router.push('/blog/manage');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'The expansion process failed.');
      setIsExpanding(false);
    }
  };

  const platforms = [
    { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'text-dash-accent border-dash-accent/30 bg-dash-accent/5 hover:bg-dash-accent/10' },
    { id: 'twitter', label: 'Twitter/X', icon: Twitter, color: '!text-dash-textMuted border-dash-border bg-dash-surface hover:bg-dash-border/40' },
    { id: 'facebook', label: 'Facebook', icon: Facebook, color: 'text-dash-accent border-dash-accent/30 bg-dash-accent/5 hover:bg-dash-accent/10' },
    { id: 'instagram', label: 'Instagram', icon: Instagram, color: 'text-pink-500 border-pink-300 bg-pink-50 hover:bg-pink-100' },
    { id: 'tiktok', label: 'TikTok', icon: Video, color: 'text-purple-600 border-purple-300 bg-purple-50 hover:bg-purple-100' },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'text-green border-green/30 bg-green/5 hover:bg-green/10' }
  ] as const;

  return (
    <MetaData pageTitle="Expander Studio">
      <Wrapper>
        <div className="flex flex-col min-h-screen bg-white py-12 px-6">
          <div className="max-w-3xl mx-auto w-full space-y-8 animate-in fade-in duration-300 motion-reduce:animate-none">

            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <button onClick={() => router.push('/blog/manage')} className="p-2 rounded-lg bg-dash-surface hover:bg-dash-border/60 !text-dash-textMuted hover:!text-dash-text transition-colors motion-reduce:transition-none">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold !text-dash-text">
                    Expander <span className="text-dash-accent">studio</span>
                  </h1>
                  <p className="text-[10px] !text-dash-textMuted font-semibold mt-0.5">
                    Conversion suite for blurbs, captions, & spoken ideas
                  </p>
                </div>
              </div>

              {/* Dynamic Double Tabs */}
              <div className="bg-dash-surface p-1 rounded-xl border border-dash-border flex items-center gap-1">
                <button
                  onClick={() => { setActiveTab('social'); setErrorMessage(null); }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors motion-reduce:transition-none flex items-center gap-1.5",
                    activeTab === 'social' ? 'bg-dash-accent text-white' : '!text-dash-textMuted hover:!text-dash-text'
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5" /> Social post
                </button>
                <button
                  onClick={() => { setActiveTab('voice'); setErrorMessage(null); }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors motion-reduce:transition-none flex items-center gap-1.5",
                    activeTab === 'voice' ? 'bg-dash-accent text-white' : '!text-dash-textMuted hover:!text-dash-text'
                  )}
                >
                  <Mic className="w-3.5 h-3.5" /> Voice capture
                </button>
              </div>
            </div>

            {activeTab === 'social' ? (
              <DashCard padding="default" className="space-y-6">

                {/* Scraper Console */}
                <DashFormField label="Import from social URL (optional)">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Link2 className="w-3.5 h-3.5 !text-dash-textMuted absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <DashInput
                        type="url"
                        value={sourceUrl}
                        onChange={(e) => setSourceUrl(e.target.value)}
                        placeholder="e.g. https://www.linkedin.com/posts/..."
                        className="pl-9"
                      />
                    </div>
                    <DashButton
                      type="button"
                      variant="secondary"
                      onClick={handleScrapeUrl}
                      disabled={isScraping || !sourceUrl.trim()}
                    >
                      {isScraping ? <Loader2 className="w-3.5 h-3.5 animate-spin motion-reduce:animate-none" /> : 'Fetch details'}
                    </DashButton>
                  </div>
                </DashFormField>

                {/* Platform Selector Grid */}
                <DashFormField label="Source platform format">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {platforms.map(p => {
                      const Icon = p.icon;
                      const active = platform === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPlatform(p.id)}
                          className={cn(
                            "border rounded-xl p-3 flex flex-col items-center gap-1.5 transition-colors motion-reduce:transition-none text-center",
                            active ? 'border-dash-accent bg-dash-accent/10 !text-dash-text' : p.color
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-[10px] font-bold">{p.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </DashFormField>

                {/* Input Text Area */}
                <form onSubmit={handleExpandSubmit} className="space-y-4">
                  <DashFormField label="Social post captions / ideas">
                    <DashTextarea
                      value={sourceText}
                      onChange={(e) => setSourceText(e.target.value)}
                      placeholder="Paste your brief social post blurb, draft sentences, or conceptual notes here..."
                      rows={6}
                      className="resize-none leading-relaxed"
                      required
                    />
                  </DashFormField>

                  <DashButton type="submit" disabled={isExpanding || !sourceText.trim()} className="w-full justify-center">
                    {isExpanding ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
                        <span>Expanding into 1,000 word article...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Generate SEO article</span>
                      </>
                    )}
                  </DashButton>
                </form>

                {/* Error Log */}
                {errorMessage && (
                  <div className="p-4 bg-red/10 border border-red/20 text-red rounded-xl text-xs flex items-start gap-2.5">
                    <span>{errorMessage}</span>
                  </div>
                )}
              </DashCard>
            ) : (
              <VoiceRecorder />
            )}

          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}
