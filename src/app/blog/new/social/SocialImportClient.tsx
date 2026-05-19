'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { expandSocialPostToBlog } from '@/app/actions/socialImport';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import VoiceRecorder from '@/components/blog/editor/VoiceRecorder';
import { Sparkles, Mic, ArrowLeft, Loader2, Link2, Facebook, Instagram, Linkedin, Twitter, MessageSquare, Video } from 'lucide-react';

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
    { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'text-blue-400 border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10' },
    { id: 'twitter', label: 'Twitter/X', icon: Twitter, color: 'text-sky-300 border-sky-500/30 bg-sky-500/5 hover:bg-sky-500/10' },
    { id: 'facebook', label: 'Facebook', icon: Facebook, color: 'text-blue-500 border-blue-600/30 bg-blue-600/5 hover:bg-blue-600/10' },
    { id: 'instagram', label: 'Instagram', icon: Instagram, color: 'text-pink-400 border-pink-500/30 bg-pink-500/5 hover:bg-pink-500/10' },
    { id: 'tiktok', label: 'TikTok', icon: Video, color: 'text-teal-400 border-teal-500/30 bg-teal-500/5 hover:bg-teal-500/10' },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10' }
  ] as const;

  return (
    <MetaData pageTitle="Expander Studio">
      <Wrapper>
        <div className="flex flex-col min-h-screen bg-[#04091a] text-white font-dm-sans py-12 px-6">
          <div className="max-w-3xl mx-auto w-full space-y-8 animate-fade-in">
            
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button onClick={() => router.push('/blog/manage')} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h1 className="font-space-grotesk text-2xl font-bold text-white uppercase tracking-tight">
                    Expander <span className="text-primary">Studio</span>
                  </h1>
                  <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-semibold mt-0.5">
                    Conversion Suite for Blurbs, Captions, & Spoken Ideas
                  </p>
                </div>
              </div>

              {/* Dynamic Double Tabs */}
              <div className="bg-white/5 p-1 rounded-xl border border-white/5 flex items-center gap-1">
                <button
                  onClick={() => { setActiveTab('social'); setErrorMessage(null); }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition flex items-center gap-1.5 ${
                    activeTab === 'social' ? 'bg-primary text-white' : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" /> Social Post
                </button>
                <button
                  onClick={() => { setActiveTab('voice'); setErrorMessage(null); }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition flex items-center gap-1.5 ${
                    activeTab === 'voice' ? 'bg-primary text-white' : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" /> Voice Capture
                </button>
              </div>
            </div>

            {activeTab === 'social' ? (
              <div className="bg-[#080f28] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

                {/* Scraper Console */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">Import from Social URL (Optional)</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Link2 className="w-3.5 h-3.5 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="url"
                        value={sourceUrl}
                        onChange={(e) => setSourceUrl(e.target.value)}
                        placeholder="e.g. https://www.linkedin.com/posts/..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-white/30 outline-none focus:border-primary transition"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleScrapeUrl}
                      disabled={isScraping || !sourceUrl.trim()}
                      className="bg-white/5 border border-white/10 hover:bg-white/10 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isScraping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Fetch Details'}
                    </button>
                  </div>
                </div>

                {/* Platform Selector Grid */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">Source Platform Format</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {platforms.map(p => {
                      const Icon = p.icon;
                      const active = platform === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPlatform(p.id)}
                          className={`border rounded-xl p-3 flex flex-col items-center gap-1.5 transition text-center ${
                            active
                              ? 'border-primary bg-primary/10 text-white ring-2 ring-primary/20 scale-[1.02]'
                              : p.color
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">{p.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Input Text Area */}
                <form onSubmit={handleExpandSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">Social Post Captions / Ideas</label>
                    <textarea
                      value={sourceText}
                      onChange={(e) => setSourceText(e.target.value)}
                      placeholder="Paste your brief social post blurb, draft sentences, or conceptual notes here..."
                      rows={6}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-white/30 outline-none focus:border-primary transition resize-none leading-relaxed"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isExpanding || !sourceText.trim()}
                    className="w-full bg-primary hover:bg-blue-600 text-white font-bold text-xs py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    {isExpanding ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Expanding into 1,000 Word Article...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 fill-current" />
                        <span>Generate SEO Article</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Error Log */}
                {errorMessage && (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-start gap-2.5">
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>
            ) : (
              <VoiceRecorder />
            )}

          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}
