"use client";
import React, { useState } from 'react';
import { X, Sparkles, Send, Check, RefreshCw, Scissors } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashFormField, DashTextarea } from '@/components/dashboard-ui/FormField';

interface AISparkDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  contextType: 'blog_post' | 'email_campaign' | 'email_subject' | 'social_post' | 'sms' | 'whatsapp' | 'sales_email' | 'funnel_copy';
  onInsert: (content: string) => void;
  workspaceId: string;
}

const TONE_OPTIONS = [
  { value: 'Professional', label: '💼 Professional' },
  { value: 'Friendly', label: '😊 Friendly' },
  { value: 'Bold', label: '🔥 Bold' },
  { value: 'Authoritative', label: '⚖️ Authoritative' },
  { value: 'Persuasive', label: '🎯 Persuasive' },
];

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English (en)' },
  { value: 'af', label: 'Afrikaans (af)' },
  { value: 'zu', label: 'Zulu (zu)' },
  { value: 'xh', label: 'Xhosa (xh)' },
  { value: 'nso', label: 'Northern Sotho (nso)' },
];

// Same dash-* selectBase treatment DashInput/DashTextarea use — no dedicated DashSelect
// primitive exists yet (see FormField.tsx's header comment), so native <select> is styled
// to match rather than introducing a one-off control.
const selectBase =
  "w-full h-11 rounded-xl border border-dash-border bg-white px-3.5 text-sm !text-dash-text transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent";

export default function AISparkDrawer({
  isOpen,
  onClose,
  contextType,
  onInsert,
  workspaceId
}: AISparkDrawerProps) {
  const [brief, setBrief] = useState('');
  const [tone, setTone] = useState('Professional');
  const [language, setLanguage] = useState('en');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [tokensUsed, setTokensUsed] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async (toneOverride?: string) => {
    if (!brief.trim()) {
      toast.error('Please enter a generation brief');
      return;
    }
    setGenerating(true);
    try {
      const response = await fetch('/api/v1/ai/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          contextType,
          userBrief: brief,
          toneOverride: toneOverride || tone
        })
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.message || body.error || 'Generation failed');
      }

      setOutput(body.content);
      setTokensUsed(body.tokensUsed);
      toast.success('Content generated successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error(`Generation failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleOptimize = async (operation: 'shorten' | 'persuade') => {
    if (!output.trim()) {
      toast.error('No generated content to optimize');
      return;
    }
    setGenerating(true);
    try {
      const response = await fetch('/api/v1/ai/content/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetText: output,
          operationType: operation
        })
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || 'Optimization failed');
      }

      setOutput(body.improvedContent);
      toast.success(`Content ${operation}ed successfully!`);
    } catch (err: any) {
      console.error(err);
      toast.error(`Optimization failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      {/* Overlay — same treatment as DashModal's overlay (dash-text/40 + blur) */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-dash-text/40 backdrop-blur-sm z-[1001] animate-in fade-in duration-300 motion-reduce:animate-none"
      />

      {/* Centered modal card — matches DashModalContent's positioning/animation */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] max-w-[calc(100vw-2rem)] max-h-[85vh] bg-white border border-dash-border rounded-2xl z-[1002] shadow-xl flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-200 motion-reduce:animate-none">

        {/* Header */}
        <div className="px-6 py-5 border-b border-dash-border flex items-center justify-between bg-dash-surface shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-dash-accent/10 text-dash-accent flex items-center justify-center shrink-0">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold !text-dash-text">Write with AI</h3>
              <p className="text-[11px] font-medium !text-dash-textMuted capitalize">
                {contextType.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white border border-dash-border flex items-center justify-center !text-dash-textMuted hover:!text-dash-text transition-colors motion-reduce:transition-none"
          >
            <X size={14} />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 common-scrollbar">

          <DashFormField label="What should this content be about?">
            <DashTextarea
              rows={4}
              placeholder="e.g. Write a promotional launch for a winter sale sequence offering 20% off SaaS consulting..."
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              className="resize-none"
            />
          </DashFormField>

          <div className="grid grid-cols-2 gap-4">
            <DashFormField label="Tone">
              <select value={tone} onChange={(e) => setTone(e.target.value)} className={selectBase}>
                {TONE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </DashFormField>

            <DashFormField label="Language">
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className={selectBase}>
                {LANGUAGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </DashFormField>
          </div>

          <DashButton onClick={() => handleGenerate()} disabled={generating} className="w-full">
            {generating ? (
              <>
                <RefreshCw size={14} className="animate-spin motion-reduce:animate-none" />
                Generating...
              </>
            ) : (
              <>
                <Send size={14} />
                Generate content
              </>
            )}
          </DashButton>

          {/* Generated output */}
          {output && (
            <div className="border-t border-dash-border pt-6 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold uppercase tracking-wide !text-dash-textMuted">Preview</span>
                {tokensUsed && (
                  <span className="text-[11px] font-medium !text-dash-textMuted">{tokensUsed} tokens</span>
                )}
              </div>

              {contextType === 'social_post' ? (
                (() => {
                  const parseSocialVariations = (text: string) => {
                    const sections = { linkedin: '', instagram: '', twitter: '' };
                    const lines = text.split('\n');
                    let currentSection: 'linkedin' | 'instagram' | 'twitter' | null = null;

                    for (const line of lines) {
                      const lower = line.toLowerCase();
                      if (lower.startsWith('linkedin') || lower.includes('linkedin:')) {
                        currentSection = 'linkedin';
                      } else if (lower.startsWith('instagram') || lower.includes('instagram:')) {
                        currentSection = 'instagram';
                      } else if (lower.startsWith('twitter') || lower.includes('twitter:') || lower.startsWith('x:') || lower.includes('x:')) {
                        currentSection = 'twitter';
                      } else {
                        if (currentSection) {
                          sections[currentSection] += line + '\n';
                        } else {
                          sections.linkedin += line + '\n';
                        }
                      }
                    }

                    sections.linkedin = sections.linkedin.replace(/^(linkedin:|linkedin\s*-\s*)/gi, '').trim();
                    sections.instagram = sections.instagram.replace(/^(instagram:|instagram\s*-\s*)/gi, '').trim();
                    sections.twitter = sections.twitter.replace(/^(twitter:|twitter\s*-\s*|x:|x\s*-\s*)/gi, '').trim();

                    if (!sections.instagram && !sections.twitter) {
                      sections.linkedin = text;
                      sections.instagram = text;
                      sections.twitter = text.slice(0, 275);
                    }

                    return sections;
                  };
                  const vars = parseSocialVariations(output);
                  return (
                    <div className="space-y-3">
                      <div className="bg-dash-surface border border-dash-border rounded-xl p-3 space-y-1.5">
                        <span className="text-[10px] font-bold uppercase text-[#0A66C2]">LinkedIn post</span>
                        <div className="!text-dash-text text-xs select-all whitespace-pre-wrap leading-relaxed">{vars.linkedin}</div>
                        <div className="text-[10px] !text-dash-textMuted text-right pt-1">{vars.linkedin.length} characters</div>
                      </div>
                      <div className="bg-dash-surface border border-dash-border rounded-xl p-3 space-y-1.5">
                        <span className="text-[10px] font-bold uppercase text-[#E4405F]">Instagram post</span>
                        <div className="!text-dash-text text-xs select-all whitespace-pre-wrap leading-relaxed">{vars.instagram}</div>
                        <div className="text-[10px] !text-dash-textMuted text-right pt-1">{vars.instagram.length} characters</div>
                      </div>
                      <div className="bg-dash-surface border border-dash-border rounded-xl p-3 space-y-1.5">
                        <span className="text-[10px] font-bold uppercase text-sky-500">Twitter / X post</span>
                        <div className="!text-dash-text text-xs select-all whitespace-pre-wrap leading-relaxed">{vars.twitter}</div>
                        <div className={cn('text-[10px] text-right pt-1', vars.twitter.length > 280 ? 'text-red font-bold' : '!text-dash-textMuted')}>
                          {vars.twitter.length} / 280 characters
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="bg-dash-surface border border-dash-border rounded-xl p-4 min-h-32 !text-dash-text text-sm font-medium leading-relaxed whitespace-pre-wrap select-text selection:bg-dash-accent/20">
                  {output}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Sticky Actions Footer */}
        {output && (
          <div className="p-4 border-t border-dash-border bg-dash-surface flex flex-wrap gap-2 justify-end">
            <DashButton variant="secondary" size="sm" onClick={() => handleOptimize('shorten')} disabled={generating} className="flex-1 min-w-[90px]">
              <Scissors size={12} />
              Shorten
            </DashButton>

            <DashButton
              variant="secondary"
              size="sm"
              onClick={() => handleGenerate(tone === 'Friendly' ? 'Bold' : 'Friendly')}
              disabled={generating}
              className="flex-1 min-w-[110px]"
            >
              <RefreshCw size={12} />
              Fresh tone
            </DashButton>

            <DashButton
              size="sm"
              onClick={() => {
                onInsert(output);
                onClose();
              }}
              className="flex-1 min-w-[110px]"
            >
              <Check size={12} />
              Insert
            </DashButton>
          </div>
        )}

      </div>
    </>
  );
}
