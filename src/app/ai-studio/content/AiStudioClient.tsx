"use client";
import React, { useState } from 'react';
import { ArrowLeft, Save, Sparkles, Wand2, Scissors, Languages, RefreshCw, PlusCircle, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface DocumentBlock {
  id: string;
  text: string;
}

export default function AiStudioClient() {
  const router = useRouter();

  // Inputs
  const [productFocus, setProductFocus] = useState('Enterprise Fleet SaaS');
  const [targetSegment, setTargetSegment] = useState('Transport Operators in Gauteng');
  const [tone, setTone] = useState('Authoritative');
  const [language, setLanguage] = useState('en');

  // Page states
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [blocks, setBlocks] = useState<DocumentBlock[]>([
    {
      id: 'block-1',
      text: '# Strategic Expansion Analysis\n\nThis section covers operational inefficiencies inside regional supply chains...'
    },
    {
      id: 'block-2',
      text: 'Our specialized Enterprise Fleet SaaS platform optimizes routing patterns, enabling transport operators in Gauteng to significantly reduce fuel costs and vehicle wear.'
    }
  ]);
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const handleGenerateDraft = async () => {
    setGenerating(true);
    try {
      const brief = `Generate a structured document draft for ${productFocus} targeted to ${targetSegment}. Tone: ${tone}. Language: ${language}. Include heading, introduction, problem definition, and solution overview.`;

      const response = await fetch('/api/v1/ai/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: '00000000-0000-0000-0000-000000000000', // Mock workspace ID for studio preview
          contextType: 'blog_post', // Long form model trigger
          userBrief: brief,
          toneOverride: tone
        })
      });

      const data = await response.json();
      if (!response.ok) {
        const errorMsg = typeof data.error === 'object' ? JSON.stringify(data.error) : data.error;
        throw new Error(errorMsg || 'Generation failed');
      }

      // Split generated content into blocks by double newlines to make it interactive
      const rawText = data.content || '';
      const paragraphs = rawText.split('\n\n').filter(Boolean);
      const newBlocks = paragraphs.map((p: string, i: number) => ({
        id: `block-gen-${Date.now()}-${i}`,
        text: p
      }));

      setBlocks(newBlocks);
      toast.success('Document draft generated successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error(`Draft generation failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleBlockImprovement = async (blockId: string, operation: 'shorten' | 'lengthen' | 'readability' | 'persuade' | 'translate') => {
    const targetBlock = blocks.find(b => b.id === blockId);
    if (!targetBlock) return;

    setGenerating(true);
    try {
      const response = await fetch('/api/v1/ai/content/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetText: targetBlock.text,
          operationType: operation,
          regionalLanguageTarget: operation === 'translate' ? (language === 'en' ? 'English' : language === 'zu' ? 'Zulu' : 'Xhosa') : undefined
        })
      });

      const data = await response.json();
      if (!response.ok) {
        const errorMsg = typeof data.error === 'object' ? JSON.stringify(data.error) : data.error;
        throw new Error(errorMsg || 'Improvement failed');
      }

      setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, text: data.improvedContent } : b));
      toast.success(`Block updated successfully via ${operation}!`);
    } catch (err: any) {
      console.error(err);
      toast.error(`Block update failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveDocument = async () => {
    setSaving(true);
    try {
      const { saveTextDraftToMedia } = await import('@/app/actions/operations');
      const compiledContent = blocks.map(b => b.text).join('\n\n');
      const docName = `AI Draft - ${new Date().toLocaleDateString()}`;

      const res = await saveTextDraftToMedia(docName, compiledContent);
      if (res.error) {
        toast.error(`Save failed: ${res.error}`);
      } else {
        toast.success('Document drafted and saved to Media Center successfully.');
      }
    } catch (err: any) {
      toast.error('An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  const updateBlockText = (id: string, text: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, text } : b));
  };

  return (
    <div className="flex flex-col min-h-screen bg-dash-bg text-dash-text">

      {/* Sticky Studio Topbar */}
      <div className="h-14 bg-white border-b border-dash-border flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/ai-studio')}
            className="w-8 h-8 rounded-lg bg-dash-surface border border-dash-border flex items-center justify-center text-dash-textMuted hover:text-dash-text hover:bg-dash-border/40 transition-all"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-[14px] font-space font-bold uppercase tracking-wider text-dash-text">
              Content <span className="text-dash-accent">Studio</span>
            </h1>
            <p className="text-[9px] text-dash-textMuted uppercase font-bold tracking-widest leading-none mt-0.5">
              Distraction-Free Long-Form Production
            </p>
          </div>
        </div>

        <button
          onClick={handleSaveDocument}
          disabled={saving}
          className="h-9 px-5 rounded-lg bg-dash-accent hover:bg-dash-accent/90 disabled:opacity-50 text-white text-[12px] font-bold flex items-center gap-2 transition-all shadow-sm"
        >
          {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
          Save Asset
        </button>
      </div>

      {/* Main Studio Split Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

        {/* Left Control Panel: Prompt Design (400px) */}
        <div className="w-full lg:w-[400px] shrink-0 border-r border-dash-border bg-white p-6 space-y-6 overflow-y-auto common-scrollbar">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-dash-accent/10 text-dash-accent flex items-center justify-center">
              <Wand2 size={16} />
            </div>
            <div>
              <h4 className="text-[13px] font-space font-bold text-dash-text uppercase">Prompt Design Panel</h4>
              <p className="text-[10px] text-dash-textMuted uppercase font-medium tracking-wide">Configure document outlines</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-dash-textMuted block">Core Product Focus Area</label>
              <input
                type="text"
                value={productFocus}
                onChange={(e) => setProductFocus(e.target.value)}
                placeholder="e.g. Enterprise Fleet SaaS"
                className="w-full bg-dash-surface border border-dash-border rounded-xl px-4 py-3 text-dash-text focus:border-dash-accent/50 transition-all outline-none text-sm font-semibold"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-dash-textMuted block">Target Segment Demographics</label>
              <input
                type="text"
                value={targetSegment}
                onChange={(e) => setTargetSegment(e.target.value)}
                placeholder="e.g. Transport Operators in GP"
                className="w-full bg-dash-surface border border-dash-border rounded-xl px-4 py-3 text-dash-text focus:border-dash-accent/50 transition-all outline-none text-sm font-semibold"
              />
            </div>

            {/* Tone strategy radios */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-dash-textMuted block">Select Tone Strategy Profile</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'Authoritative', label: '⚖️ Authoritative' },
                  { id: 'Friendly', label: '😊 Friendly' },
                  { id: 'Bold', label: '🔥 Bold' },
                  { id: 'Persuasive', label: '🎯 Persuasive' }
                ].map(t => (
                  <label
                    key={t.id}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                      tone === t.id
                        ? 'bg-dash-accent/10 border-dash-accent/40 text-dash-accent shadow-sm'
                        : 'bg-dash-surface border-dash-border text-dash-textMuted hover:border-dash-text/20 hover:text-dash-text'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tone"
                      value={t.id}
                      checked={tone === t.id}
                      onChange={() => setTone(t.id)}
                      className="hidden"
                    />
                    {t.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Output Language radios */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-dash-textMuted block">Output Language Base Preset</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'en', label: 'English' },
                  { id: 'zu', label: 'Zulu' },
                  { id: 'xh', label: 'Xhosa' }
                ].map(l => (
                  <label
                    key={l.id}
                    className={`flex items-center justify-center py-2.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                      language === l.id
                        ? 'bg-purple-50 border-purple-300 text-purple-700 shadow-sm'
                        : 'bg-dash-surface border-dash-border text-dash-textMuted hover:border-dash-text/20 hover:text-dash-text'
                    }`}
                  >
                    <input
                      type="radio"
                      name="language"
                      value={l.id}
                      checked={language === l.id}
                      onChange={() => setLanguage(l.id)}
                      className="hidden"
                    />
                    {l.label}
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerateDraft}
              disabled={generating}
              className="w-full bg-dash-accent hover:bg-dash-accent/90 text-white font-black uppercase tracking-widest text-[11px] h-11 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
            >
              {generating ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Generating Draft...
                </>
              ) : (
                <>
                  <Sparkles size={12} />
                  Generate Document Draft
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Panel: Document Surface (flex-1) */}
        <div className="flex-1 bg-dash-bg p-8 overflow-y-auto common-scrollbar flex flex-col items-center">
          <div className="w-full max-w-2xl bg-white border border-dash-border rounded-3xl p-8 min-h-[580px] shadow-sm relative">
            <div className="absolute top-0 right-0 w-48 h-48 bg-dash-accent/5 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-4">
              {blocks.map((block) => {
                const isHovered = hoveredBlockId === block.id;
                const isEditing = editingBlockId === block.id;

                return (
                  <div
                    key={block.id}
                    onMouseEnter={() => setHoveredBlockId(block.id)}
                    onMouseLeave={() => setHoveredBlockId(null)}
                    className={`p-4 rounded-xl transition-all relative group ${
                      isEditing
                        ? 'bg-dash-accent/5 border border-dash-accent/40 shadow-sm'
                        : isHovered
                          ? 'bg-dash-surface border border-dash-border'
                          : 'border border-transparent'
                    }`}
                  >
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          rows={3}
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="w-full bg-white border border-dash-border rounded-lg p-2.5 text-dash-text text-sm outline-none focus:border-dash-accent"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingBlockId(null)}
                            className="px-3 py-1 bg-dash-surface border border-dash-border hover:bg-dash-border/40 rounded-lg text-xs font-bold text-dash-textMuted"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              updateBlockText(block.id, editingText);
                              setEditingBlockId(null);
                            }}
                            className="px-3 py-1 bg-dash-accent hover:bg-dash-accent/90 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                          >
                            <Check size={12} /> Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          setEditingBlockId(block.id);
                          setEditingText(block.text);
                        }}
                        className={`text-dash-text text-sm font-medium leading-relaxed cursor-text select-text ${
                          block.text.startsWith('#') ? 'font-space font-extrabold text-[18px]' : ''
                        }`}
                      >
                        {block.text}
                      </div>
                    )}

                    {/* Inline Hover Action Toolbar */}
                    {isHovered && !isEditing && (
                      <div className="absolute right-3 top-[-14px] bg-white border border-dash-border p-1 rounded-lg flex items-center gap-1 shadow-lg z-30 animate-in fade-in zoom-in-95 duration-100">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleBlockImprovement(block.id, 'persuade'); }}
                          className="px-2 py-1 rounded hover:bg-dash-surface text-[9px] font-black uppercase text-purple-600 flex items-center gap-1"
                          title="problem-agitation-solution rewrite"
                        >
                          <Wand2 size={9} />
                          PAS Copy
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleBlockImprovement(block.id, 'shorten'); }}
                          className="px-2 py-1 rounded hover:bg-dash-surface text-[9px] font-black uppercase text-amber-600 flex items-center gap-1"
                        >
                          <Scissors size={9} />
                          Shorten
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleBlockImprovement(block.id, 'translate'); }}
                          className="px-2 py-1 rounded hover:bg-dash-surface text-[9px] font-black uppercase text-sky-600 flex items-center gap-1"
                        >
                          <Languages size={9} />
                          Translate
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => {
                const newId = `block-custom-${Date.now()}`;
                setBlocks([...blocks, { id: newId, text: 'Click to write a new paragraph text...' }]);
                setEditingBlockId(newId);
                setEditingText('Click to write a new paragraph text...');
              }}
              className="mt-6 w-full py-3 border border-dashed border-dash-border hover:border-dash-accent/40 rounded-xl bg-dash-surface/40 hover:bg-dash-accent/5 text-[11px] font-bold text-dash-textMuted hover:text-dash-accent transition-all flex items-center justify-center gap-2"
            >
              <PlusCircle size={14} />
              Add Narrative Copy Block
            </button>

          </div>
        </div>

      </div>

    </div>
  );
}
