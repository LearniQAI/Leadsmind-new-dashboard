"use client";
import React, { useState } from 'react';
import { X, Sparkles, Send, Check, RefreshCw, Scissors, Languages } from 'lucide-react';
import { toast } from 'sonner';

interface AISparkDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  contextType: 'blog_post' | 'email_campaign' | 'email_subject' | 'social_post' | 'sms' | 'whatsapp' | 'sales_email' | 'funnel_copy';
  onInsert: (content: string) => void;
  workspaceId: string;
}

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
      {/* Overlay */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-[#04091a]/75 backdrop-blur-[4px] z-[500] transition-opacity"
      />

      {/* Drawer Card */}
      <div className="fixed right-0 top-0 bottom-0 w-[420px] max-w-full bg-[#080f28] border-l border-white/5 z-[501] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-[#0c1535]/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accentg text-accent2 flex items-center justify-center">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="text-[13px] font-space font-bold text-t1 uppercase tracking-wider">LeadsMind AI Writer</h3>
              <p className="text-[10px] text-t3 uppercase font-medium tracking-wide">
                Context: {contextType.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-t3 hover:text-t1 transition-all"
          >
            <X size={14} />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 common-scrollbar">
          
          {/* Brief */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-t3">Brief Input Instructions</label>
            <textarea
              rows={4}
              placeholder="e.g. Write a promotional launch for a winter sale sequence offering 20% off SaaS consulting..."
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              className="w-full bg-n600 border border-white/5 rounded-xl px-4 py-3 text-t1 focus:border-accent/50 transition-all outline-none text-sm resize-none placeholder:text-t4 leading-relaxed"
            />
          </div>

          {/* Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-t3">Tone Preset</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full bg-n600 border border-white/5 rounded-xl px-4 py-3 text-t1 focus:border-accent/50 transition-all outline-none text-sm"
              >
                <option value="Professional">💼 Professional</option>
                <option value="Friendly">😊 Friendly</option>
                <option value="Bold">🔥 Bold</option>
                <option value="Authoritative">⚖️ Authoritative</option>
                <option value="Persuasive">🎯 Persuasive</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-t3">Language Format</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-n600 border border-white/5 rounded-xl px-4 py-3 text-t1 focus:border-accent/50 transition-all outline-none text-sm"
              >
                <option value="en">English (en)</option>
                <option value="af">Afrikaans (af)</option>
                <option value="zu">Zulu (zu)</option>
                <option value="xh">Xhosa (xh)</option>
                <option value="nso">Northern Sotho (nso)</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => handleGenerate()}
            disabled={generating}
            className="w-full bg-accent hover:bg-accent2 text-white font-black uppercase tracking-widest text-[11px] h-11 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-accent/20 transition-all disabled:opacity-50"
          >
            {generating ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                Processing Generation...
              </>
            ) : (
              <>
                <Send size={12} />
                Run Engine Generation
              </>
            )}
          </button>

          {/* Generated output */}
          {output && (
            <div className="border-t border-white/5 pt-6 space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold uppercase tracking-widest text-t3">Preview Content Box</label>
                {tokensUsed && (
                  <span className="text-[10px] font-mono text-t4">
                    Tokens: {tokensUsed}
                  </span>
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
                    <div className="space-y-4">
                      <div className="bg-[#0b0b1e] border border-white/5 rounded-xl p-3 space-y-1 relative">
                        <span className="text-[9px] font-black uppercase text-blue-400">LinkedIn Post</span>
                        <div className="text-t1 text-xs select-all whitespace-pre-wrap">{vars.linkedin}</div>
                        <div className="text-[9px] text-t4 text-right pt-2">{vars.linkedin.length} characters</div>
                      </div>
                      <div className="bg-[#0b0b1e] border border-white/5 rounded-xl p-3 space-y-1 relative">
                        <span className="text-[9px] font-black uppercase text-[#E4405F]">Instagram Post</span>
                        <div className="text-t1 text-xs select-all whitespace-pre-wrap">{vars.instagram}</div>
                        <div className="text-[9px] text-t4 text-right pt-2">{vars.instagram.length} characters</div>
                      </div>
                      <div className="bg-[#0b0b1e] border border-white/5 rounded-xl p-3 space-y-1 relative">
                        <span className="text-[9px] font-black uppercase text-sky-400">Twitter / X Post</span>
                        <div className="text-t1 text-xs select-all whitespace-pre-wrap">{vars.twitter}</div>
                        <div className={`text-[9px] text-right pt-2 ${vars.twitter.length > 280 ? 'text-red font-bold' : 'text-t4'}`}>
                          {vars.twitter.length} / 280 characters
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="bg-[#04091a] border border-white/5 rounded-xl p-4 min-h-32 text-t1 text-sm font-medium leading-relaxed whitespace-pre-wrap select-text selection:bg-accent/30 font-sans">
                  {output}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Sticky Actions Footer */}
        {output && (
          <div className="p-4 border-t border-white/5 bg-[#0c1535]/40 flex flex-wrap gap-2 justify-end">
            <button
              onClick={() => handleOptimize('shorten')}
              disabled={generating}
              className="flex-1 min-w-[90px] h-9 px-3 rounded-lg bg-white/5 border border-white/5 text-[11px] font-bold text-t2 hover:text-t1 hover:bg-white/10 flex items-center justify-center gap-1.5 transition-all"
            >
              <Scissors size={12} />
              Shorten
            </button>
            
            <button
              onClick={() => handleGenerate(tone === 'Friendly' ? 'Bold' : 'Friendly')}
              disabled={generating}
              className="flex-1 min-w-[110px] h-9 px-3 rounded-lg bg-white/5 border border-white/5 text-[11px] font-bold text-t2 hover:text-t1 hover:bg-white/10 flex items-center justify-center gap-1.5 transition-all"
            >
              <RefreshCw size={12} />
              Fresh Tone
            </button>
            
            <button
              onClick={() => {
                onInsert(output);
                onClose();
              }}
              className="flex-1 min-w-[110px] h-9 px-3 rounded-lg bg-accent hover:bg-accent2 text-white text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-accent/15"
            >
              <Check size={12} />
              Insert Inline
            </button>
          </div>
        )}

      </div>
    </>
  );
}
