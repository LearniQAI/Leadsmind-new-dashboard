"use client";

import React, { useState } from 'react';
import { useEditor } from '@craftjs/core';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Sparkles, Loader2, AlertCircle, Clock, History, X as XIcon, Plus } from 'lucide-react';
import { RESOLVER } from '@/lib/builder/resolver';

interface CopySection {
  heading: string;
  body: string;
}

interface GeneratedCopy {
  headline: string;
  subheadline: string;
  sections: CopySection[];
  cta: string;
}

interface GenerationRow {
  id: string;
  input_params: { product: string; audience: string; benefit: string; tone: string | null };
  generated_copy: GeneratedCopy;
  created_at: string;
}

interface AILandingCopyModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Builds a real, editable craft.js subtree from the generated copy — a Section
 * containing a centered headline/subheadline, one Container per body section,
 * and a CTA button. Same component shapes (RESOLVER.Section/Container/Heading/
 * Paragraph/Button) already used throughout src/lib/builder/templates/*.ts. */
function buildCopyElement(copy: GeneratedCopy) {
  return (
    <RESOLVER.Section canvas paddingTop={64} paddingBottom={64} paddingLeft={24} paddingRight={24} backgroundColor="transparent">
      <RESOLVER.Container canvas layoutType="fixed" maxWidth="900px" padding={16}>
        <RESOLVER.Heading text={copy.headline} level="h1" fontWeight="bold" textAlign="center" color="#111827" />
        <RESOLVER.Paragraph text={copy.subheadline} fontSize={18} textAlign="center" color="#4b5563" lineHeight="relaxed" />
        {copy.sections.map((section, i) => (
          <RESOLVER.Container key={i} canvas layoutType="fixed" maxWidth="900px" padding={16}>
            <RESOLVER.Heading text={section.heading} level="h3" fontWeight="bold" textAlign="left" color="#111827" />
            <RESOLVER.Paragraph text={section.body} fontSize={16} textAlign="left" color="#4b5563" lineHeight="relaxed" />
          </RESOLVER.Container>
        ))}
        <RESOLVER.Button text={copy.cta} size="lg" variant="primary" />
      </RESOLVER.Container>
    </RESOLVER.Section>
  );
}

export function AILandingCopyModal({ isOpen, onOpenChange }: AILandingCopyModalProps) {
  const { actions, query } = useEditor();

  const [product, setProduct] = useState('');
  const [audience, setAudience] = useState('');
  const [benefit, setBenefit] = useState('');
  const [tone, setTone] = useState('');

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);

  const [copy, setCopy] = useState<GeneratedCopy | null>(null);

  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<GenerationRow[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  React.useEffect(() => {
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
      const res = await fetch('/api/builder/landing-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: product.trim(),
          audience: audience.trim(),
          benefit: benefit.trim(),
          tone: tone.trim() || undefined,
        }),
      });
      const resBody = await res.json();
      if (!res.ok) {
        if (res.status === 429 && resBody.retryAfterSeconds) {
          setCooldownSeconds(resBody.retryAfterSeconds);
        }
        throw new Error(resBody.error || 'Failed to generate copy');
      }
      setCopy(resBody.generated_copy);
      toast.success('Copy generated');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      toast.error(err.message || 'Failed to generate copy');
    } finally {
      setGenerating(false);
    }
  };

  const handleInsert = () => {
    if (!copy) return;
    try {
      const element = buildCopyElement(copy);
      const nodeTree = query.parseReactElement(element).toNodeTree();
      actions.addNodeTree(nodeTree, 'ROOT');
      toast.success('Inserted into page — scroll down to find it, then drag to reposition if needed.');
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to insert AI copy into canvas:', err);
      toast.error('Could not insert the generated copy into the page.');
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/builder/landing-copy?limit=10');
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
    setProduct(gen.input_params?.product || '');
    setAudience(gen.input_params?.audience || '');
    setBenefit(gen.input_params?.benefit || '');
    setTone(gen.input_params?.tone || '');
    setShowHistory(false);
  };

  const cooldownActive = cooldownSeconds !== null && cooldownSeconds > 0;

  const updateSection = (index: number, field: 'heading' | 'body', value: string) => {
    setCopy(c => {
      if (!c) return c;
      const next = [...c.sections];
      next[index] = { ...next[index], [field]: value };
      return { ...c, sections: next };
    });
  };

  const removeSection = (index: number) => {
    setCopy(c => (c ? { ...c, sections: c.sections.filter((_, i) => i !== index) } : c));
  };

  const addSection = () => {
    setCopy(c => (c ? { ...c, sections: [...c.sections, { heading: '', body: '' }] } : c));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white border-dash-border !text-dash-text rounded-3xl p-0 overflow-hidden shadow-2xl z-[9999]">
        <div className="flex flex-col max-h-[85vh]">
          <DialogHeader className="p-6 pb-4 border-b border-dash-border">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Generate landing page copy with <span className="text-primary">AI</span>
            </DialogTitle>
            <DialogDescription className="text-xs !text-dash-textMuted font-medium mt-1">
              Describe what you're promoting — headline, subheadline, body sections, and a CTA get inserted directly onto the canvas as editable blocks.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold !text-dash-textMuted">Product or service</Label>
              <Input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="e.g. Cloud-based invoicing software for small accounting firms" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold !text-dash-textMuted">Target audience</Label>
                <Input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g. Solo bookkeepers in South Africa" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold !text-dash-textMuted">Key benefit</Label>
                <Input value={benefit} onChange={(e) => setBenefit(e.target.value)} placeholder="e.g. Cuts invoice prep time from 2 hours to 10 minutes" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold !text-dash-textMuted">Tone / style (optional)</Label>
              <Input value={tone} onChange={(e) => setTone(e.target.value)} placeholder="e.g. plain-spoken, confident, no hype" />
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
              <Button
                onClick={handleGenerate}
                disabled={generating || cooldownActive}
                className="bg-primary hover:bg-primary/95 text-white rounded-xl font-bold text-xs px-6 h-10"
              >
                {generating ? (
                  <><Loader2 className="w-4 h-4 mr-1.5 animate-spin motion-reduce:animate-none" /> Generating…</>
                ) : cooldownActive ? (
                  <><Clock className="w-4 h-4 mr-1.5" /> Wait {cooldownSeconds}s</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-1.5" /> {copy ? 'Regenerate' : 'Generate'}</>
                )}
              </Button>
              <button
                type="button"
                onClick={toggleHistory}
                className="text-[11px] font-bold !text-dash-textMuted hover:!text-dash-text flex items-center gap-1.5"
              >
                <History className="w-3.5 h-3.5" /> View past generations
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-[12px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            {showHistory && (
              <div className="rounded-xl border border-dash-border bg-white p-3 space-y-2 max-h-48 overflow-y-auto">
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
                      <span className="text-[12px] font-bold !text-dash-text block truncate">
                        {gen.generated_copy?.headline || gen.input_params?.product || '(no headline)'}
                      </span>
                      <span className="text-[10px] !text-dash-textMuted">{new Date(gen.created_at).toLocaleString()}</span>
                    </button>
                  ))
                )}
              </div>
            )}

            {copy && (
              <div className="space-y-4 rounded-xl border border-dash-border bg-dash-surface/40 p-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold !text-dash-textMuted">Headline</Label>
                  <Input
                    value={copy.headline}
                    onChange={(e) => setCopy(c => (c ? { ...c, headline: e.target.value } : c))}
                    className="font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold !text-dash-textMuted">Subheadline</Label>
                  <Textarea
                    value={copy.subheadline}
                    onChange={(e) => setCopy(c => (c ? { ...c, subheadline: e.target.value } : c))}
                    className="min-h-[60px] resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-bold !text-dash-textMuted">Body sections</Label>
                  {copy.sections.map((section, i) => (
                    <div key={i} className="rounded-lg border border-dash-border bg-white p-3 space-y-2 relative">
                      <button
                        type="button"
                        onClick={() => removeSection(i)}
                        className="absolute top-2 right-2 !text-dash-textMuted hover:!text-red-600"
                        title="Remove section"
                      >
                        <XIcon className="w-3.5 h-3.5" />
                      </button>
                      <Input
                        value={section.heading}
                        onChange={(e) => updateSection(i, 'heading', e.target.value)}
                        placeholder="Section heading"
                        className="font-semibold text-sm pr-6"
                      />
                      <Textarea
                        value={section.body}
                        onChange={(e) => updateSection(i, 'body', e.target.value)}
                        className="min-h-[56px] resize-none text-sm"
                      />
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" onClick={addSection} className="text-xs">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add section
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold !text-dash-textMuted">Call-to-action</Label>
                  <Input
                    value={copy.cta}
                    onChange={(e) => setCopy(c => (c ? { ...c, cta: e.target.value } : c))}
                  />
                </div>

                <div className="flex justify-end pt-1 border-t border-dash-border">
                  <Button onClick={handleInsert} className="bg-primary hover:bg-primary/95 text-white rounded-xl font-bold text-xs px-6 h-10">
                    Insert into page
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
