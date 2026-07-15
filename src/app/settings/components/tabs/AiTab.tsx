"use client";
import React, { useState, useEffect } from 'react';
import { Sparkles, X, Plus, AlertCircle, Play, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface AiTabProps {
  workspaceId: string;
}

export default function AiTab({ workspaceId }: AiTabProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Form Fields
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  const [servicesDescription, setServicesDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [brandPersonality, setBrandPersonality] = useState('');
  const [primaryLanguage, setPrimaryLanguage] = useState<'en' | 'af' | 'zu' | 'nso' | 'xh'>('en');
  const [secondaryLanguage, setSecondaryLanguage] = useState<'en' | 'af' | 'zu' | 'nso' | 'xh' | ''>('');
  
  // Tag Inputs
  const [toneAdjectives, setToneAdjectives] = useState<string[]>([]);
  const [toneInput, setToneInput] = useState('');
  
  const [wordsToUse, setWordsToUse] = useState<string[]>([]);
  const [useInput, setUseInput] = useState('');
  
  const [wordsToAvoid, setWordsToAvoid] = useState<string[]>([]);
  const [avoidInput, setAvoidInput] = useState('');

  // Sample Copy
  const [sampleContent1, setSampleContent1] = useState('');
  const [sampleContent2, setSampleContent2] = useState('');
  const [sampleContent3, setSampleContent3] = useState('');

  // Sandbox State
  const [testBrief, setTestBrief] = useState('Write a promotional launch for a winter sale sequence.');
  const [previewPrompt, setPreviewPrompt] = useState<{ system: string; user: string } | null>(null);
  const [previewOutput, setPreviewOutput] = useState('');

  useEffect(() => {
    async function loadBrandVoice() {
      if (!workspaceId) return;
      try {
        const { data, error } = await supabase
          .from('workspace_brand_voice')
          .select('*')
          .eq('workspace_id', workspaceId)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setBusinessName(data.business_name || '');
          setIndustry(data.industry || '');
          setServicesDescription(data.services_description || '');
          setTargetAudience(data.target_audience || '');
          setBrandPersonality(data.brand_personality || '');
          setToneAdjectives(data.tone_adjectives || []);
          setWordsToUse(data.words_to_use || []);
          setWordsToAvoid(data.words_to_avoid || []);
          setSampleContent1(data.sample_content_1 || '');
          setSampleContent2(data.sample_content_2 || '');
          setSampleContent3(data.sample_content_3 || '');
          setPrimaryLanguage(data.primary_language || 'en');
          setSecondaryLanguage(data.secondary_language || '');
        }
      } catch (err: any) {
        console.error('Error loading brand voice:', err);
        toast.error('Failed to load brand voice settings');
      } finally {
        setLoading(false);
      }
    }
    loadBrandVoice();
  }, [workspaceId, supabase]);

  // Tag helper logic
  const handleAddTag = (
    e: React.KeyboardEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>,
    input: string,
    setInput: React.Dispatch<React.SetStateAction<string>>,
    tags: string[],
    setTags: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (e.type === 'keydown') {
      const ke = e as React.KeyboardEvent<HTMLInputElement>;
      if (ke.key !== 'Enter' && ke.key !== ',') return;
      ke.preventDefault();
    }
    const val = input.trim().replace(/,/g, '');
    if (val && !tags.includes(val)) {
      setTags([...tags, val]);
      setInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string, tags: string[], setTags: React.Dispatch<React.SetStateAction<string[]>>) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        workspace_id: workspaceId,
        business_name: businessName,
        industry: industry,
        services_description: servicesDescription,
        target_audience: targetAudience,
        brand_personality: brandPersonality,
        tone_adjectives: toneAdjectives,
        words_to_use: wordsToUse,
        words_to_avoid: wordsToAvoid,
        sample_content_1: sampleContent1,
        sample_content_2: sampleContent2,
        sample_content_3: sampleContent3,
        primary_language: primaryLanguage,
        secondary_language: secondaryLanguage || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('workspace_brand_voice')
        .upsert(payload, { onConflict: 'workspace_id' });

      if (error) throw error;
      toast.success('Brand voice profile saved successfully!');
    } catch (err: any) {
      console.error('Error saving brand voice:', err);
      toast.error(err.message || 'Failed to save brand voice settings');
    } finally {
      setSaving(false);
    }
  };

  const handleRunSandbox = async () => {
    if (!testBrief.trim()) {
      toast.error('Please enter a test brief first');
      return;
    }
    setTesting(true);
    setPreviewOutput('Compiling prompts and invoking generation engine...');
    try {
      // 1. Compile locally for preview
      const system = [
        'You are the advanced, production-grade LeadsMind AI Assistant, explicitly optimized to match the architectural output quality of HubSpot Breeze AI.',
        'Your core assignment is to create content and synthesize intelligence profiles for South African enterprise sectors and SMEs.',
        '',
        '=== STRICT COMPLIANCE BRAND PROFILE ===',
        `Operating Entity Name: ${businessName || '[Unsaved Name]'}`,
        `Vertical Industry Domain: ${industry || '[Unsaved Industry]'}`,
        `Core Offerings/Services Portfolio: ${servicesDescription || '[Unsaved Services]'}`,
        `Target Buyer Persona Audience: ${targetAudience || '[Unsaved Audience]'}`,
        `Primary Personality/Archetype: ${brandPersonality || '[Unsaved Personality]'}`,
        `Approved Stylistic Tone Adjectives: ${toneAdjectives.join(', ') || 'none'}`,
        `Mandatory Vocabulary Tokens to Include: ${wordsToUse.join(', ') || 'none'}`,
        `Forbidden Vocabulary Tokens to Omit: ${wordsToAvoid.join(', ') || 'none'}`,
        `Output Target Language Formulation: ${primaryLanguage}`,
        '',
        '=== SPECIFIC EXECUTION DIRECTIVE ===',
        'Generate short, direct, punchy, conversational outreach copy.',
        '',
        '=== REGIONAL SOUTH AFRICAN LOCALIZATION MATRIX ===',
        'You must contextualize outputs natively for South Africa.',
        '- Convert syntax references to local infrastructure landmarks, geographic regions, and cities where applicable.',
        '- Display financial currency indices using the South African Rand format exclusively (e.g., R15,000 or R2.5 Million).',
        '- Demonstrate alignment with national baseline statutory constraints including POPIA (Protection of Personal Information Act), SARS compliance metrics, and basic B-BBEE structural vernacular.',
        '- Avoid generic North American default templates or phrasing.'
      ].join('\n');

      const user = `=== INDIVIDUAL USER GENERATION BRIEF ===\n${testBrief}`;
      setPreviewPrompt({ system, user });

      // 2. Call Content Generation API endpoint
      const response = await fetch('/api/v1/ai/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          contextType: 'sms', // Default short/quick type
          userBrief: testBrief,
          toneOverride: brandPersonality
        })
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.message || body.error || 'Generation failed');
      }

      setPreviewOutput(body.content || 'Engine response was empty');
    } catch (err: any) {
      console.error('Sandbox error:', err);
      setPreviewOutput(`⚠️ Execution Failed: ${err.message}`);
      toast.error(`Sandbox execution failed: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 bg-white border border-dash-border rounded-2xl shadow-sm">
        <i className="fa-solid fa-spinner animate-spin motion-reduce:animate-none text-[24px] text-dash-accent"></i>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in slide-in-from-right-4 duration-500 motion-reduce:animate-none">

      {/* Left side: Voice Form (60%) */}
      <div className="flex-1 space-y-6">
        <div className="bg-white border border-dash-border rounded-2xl p-8 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 w-1 h-full bg-dash-accent"></div>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-dash-accent/10 flex items-center justify-center text-dash-accent">
              <Sparkles size={20} />
            </div>
            <div>
              <h4 className="text-[15px] font-bold !text-dash-text">Core brand voice profile</h4>
              <p className="text-[11px] !text-dash-textMuted font-medium">Train LeadsMind AI on your corporate identity</p>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold !text-dash-textMuted">Business legal name</label>
                <input
                  type="text"
                  placeholder="e.g. Cape Tax Pros"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full bg-white border border-dash-border rounded-xl px-4 py-3 !text-dash-text font-bold focus:border-dash-accent transition-all motion-reduce:transition-none outline-none text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold !text-dash-textMuted">Vertical industry domain</label>
                <input
                  type="text"
                  placeholder="e.g. Financial Advisory"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full bg-white border border-dash-border rounded-xl px-4 py-3 !text-dash-text font-bold focus:border-dash-accent transition-all motion-reduce:transition-none outline-none text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold !text-dash-textMuted">Core offerings & services portfolio</label>
              <textarea
                rows={3}
                placeholder="Provide a comprehensive breakdown of the products, licenses, packages, or services your firm distributes..."
                value={servicesDescription}
                onChange={(e) => setServicesDescription(e.target.value)}
                className="w-full bg-white border border-dash-border rounded-xl px-4 py-3 !text-dash-text focus:border-dash-accent transition-all motion-reduce:transition-none outline-none text-sm resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold !text-dash-textMuted">Target buyer persona audience</label>
              <textarea
                rows={2}
                placeholder="Define your typical enterprise client or consumer demographics (e.g. SME VAT owners in Western Cape)..."
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full bg-white border border-dash-border rounded-xl px-4 py-3 !text-dash-text focus:border-dash-accent transition-all motion-reduce:transition-none outline-none text-sm resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold !text-dash-textMuted">Brand archetype/personality</label>
                <input
                  type="text"
                  placeholder="e.g. Professional yet warm"
                  value={brandPersonality}
                  onChange={(e) => setBrandPersonality(e.target.value)}
                  className="w-full bg-white border border-dash-border rounded-xl px-4 py-3 !text-dash-text focus:border-dash-accent transition-all motion-reduce:transition-none outline-none text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold !text-dash-textMuted">Primary language</label>
                <select
                  value={primaryLanguage}
                  onChange={(e) => setPrimaryLanguage(e.target.value as any)}
                  className="w-full bg-white border border-dash-border rounded-xl px-4 py-3 !text-dash-text focus:border-dash-accent transition-all motion-reduce:transition-none outline-none text-sm"
                >
                  <option value="en">English (en)</option>
                  <option value="af">Afrikaans (af)</option>
                  <option value="zu">Zulu (zu)</option>
                  <option value="xh">Xhosa (xh)</option>
                  <option value="nso">Northern Sotho (nso)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold !text-dash-textMuted">Secondary language (optional)</label>
                <select
                  value={secondaryLanguage}
                  onChange={(e) => setSecondaryLanguage(e.target.value as any)}
                  className="w-full bg-white border border-dash-border rounded-xl px-4 py-3 !text-dash-text focus:border-dash-accent transition-all motion-reduce:transition-none outline-none text-sm"
                >
                  <option value="">None</option>
                  <option value="en">English (en)</option>
                  <option value="af">Afrikaans (af)</option>
                  <option value="zu">Zulu (zu)</option>
                  <option value="xh">Xhosa (xh)</option>
                  <option value="nso">Northern Sotho (nso)</option>
                </select>
              </div>
            </div>

            {/* Token Chips Array: Style Adjectives */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold !text-dash-textMuted">Approved style adjectives</label>
              <div className="min-h-12 w-full bg-white border border-dash-border rounded-xl p-2 flex flex-wrap gap-2 items-center">
                {toneAdjectives.map(tag => (
                  <span key={tag} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-dash-accent/10 text-dash-accent border border-dash-accent/20 text-[11px] font-bold">
                    {tag}
                    <button type="button" onClick={() => handleRemoveTag(tag, toneAdjectives, setToneAdjectives)} className="hover:text-red">
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  placeholder={toneAdjectives.length === 0 ? "Type adjective and press Enter or comma..." : ""}
                  value={toneInput}
                  onChange={(e) => setToneInput(e.target.value)}
                  onKeyDown={(e) => handleAddTag(e, toneInput, setToneInput, toneAdjectives, setToneAdjectives)}
                  onBlur={(e) => handleAddTag(e, toneInput, setToneInput, toneAdjectives, setToneAdjectives)}
                  className="flex-1 bg-transparent border-none outline-none !text-dash-text text-sm min-w-[120px] px-2"
                />
              </div>
            </div>

            {/* Token Chips Array: words_to_use */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold !text-dash-textMuted">Approved lexicon (words to use)</label>
              <div className="min-h-12 w-full bg-white border border-dash-border rounded-xl p-2 flex flex-wrap gap-2 items-center">
                {wordsToUse.map(tag => (
                  <span key={tag} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green/10 text-green border border-green/20 text-[11px] font-bold">
                    {tag}
                    <button type="button" onClick={() => handleRemoveTag(tag, wordsToUse, setWordsToUse)} className="hover:text-red">
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  placeholder={wordsToUse.length === 0 ? "Type word and press Enter or comma..." : ""}
                  value={useInput}
                  onChange={(e) => setUseInput(e.target.value)}
                  onKeyDown={(e) => handleAddTag(e, useInput, setUseInput, wordsToUse, setWordsToUse)}
                  onBlur={(e) => handleAddTag(e, useInput, setUseInput, wordsToUse, setWordsToUse)}
                  className="flex-1 bg-transparent border-none outline-none !text-dash-text text-sm min-w-[120px] px-2"
                />
              </div>
            </div>

            {/* Token Chips Array: words_to_avoid */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold !text-dash-textMuted">Excluded lexicon (words to avoid)</label>
              <div className="min-h-12 w-full bg-white border border-dash-border rounded-xl p-2 flex flex-wrap gap-2 items-center">
                {wordsToAvoid.map(tag => (
                  <span key={tag} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red/10 text-red border border-red/20 text-[11px] font-bold">
                    {tag}
                    <button type="button" onClick={() => handleRemoveTag(tag, wordsToAvoid, setWordsToAvoid)} className="hover:text-red">
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  placeholder={wordsToAvoid.length === 0 ? "Type word and press Enter or comma..." : ""}
                  value={avoidInput}
                  onChange={(e) => setAvoidInput(e.target.value)}
                  onKeyDown={(e) => handleAddTag(e, avoidInput, setAvoidInput, wordsToAvoid, setWordsToAvoid)}
                  onBlur={(e) => handleAddTag(e, avoidInput, setAvoidInput, wordsToAvoid, setWordsToAvoid)}
                  className="flex-1 bg-transparent border-none outline-none !text-dash-text text-sm min-w-[120px] px-2"
                />
              </div>
            </div>

            <div className="border-t border-dash-border pt-6 space-y-4">
              <h5 className="text-[12px] font-bold !text-dash-textMuted">Brand copy library</h5>
              <p className="text-[11px] !text-dash-textMuted">Upload sample copywriting slots to anchor the LLM temperature style</p>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold !text-dash-textMuted">Reference document slot 1 (social copy, SMS, etc.)</label>
                  <textarea
                    rows={2}
                    value={sampleContent1}
                    onChange={(e) => setSampleContent1(e.target.value)}
                    className="w-full bg-white border border-dash-border rounded-xl px-4 py-3 !text-dash-text focus:border-dash-accent transition-all motion-reduce:transition-none outline-none text-sm resize-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold !text-dash-textMuted">Reference document slot 2 (outreach emails)</label>
                  <textarea
                    rows={2}
                    value={sampleContent2}
                    onChange={(e) => setSampleContent2(e.target.value)}
                    className="w-full bg-white border border-dash-border rounded-xl px-4 py-3 !text-dash-text focus:border-dash-accent transition-all motion-reduce:transition-none outline-none text-sm resize-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold !text-dash-textMuted">Reference document slot 3 (corporate press/funnels)</label>
                  <textarea
                    rows={2}
                    value={sampleContent3}
                    onChange={(e) => setSampleContent3(e.target.value)}
                    className="w-full bg-white border border-dash-border rounded-xl px-4 py-3 !text-dash-text focus:border-dash-accent transition-all motion-reduce:transition-none outline-none text-sm resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-dash-accent hover:bg-dash-accent/90 text-white font-bold text-[11px] h-11 px-8 rounded-xl shadow-lg shadow-dash-accent/20 transition-all motion-reduce:transition-none disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Sync voice config'}
            </button>
          </div>
        </div>
      </div>

      {/* Right side: Sticky Live Preview Sandbox (40%) */}
      <div className="w-full lg:w-[360px] flex-shrink-0">
        <div className="sticky top-20 bg-white border border-dash-border rounded-2xl p-6 space-y-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-dash-accent/10 text-dash-accent flex items-center justify-center">
              <Eye size={16} />
            </div>
            <div>
              <h4 className="text-[13px] font-bold !text-dash-text">Live preview sandbox</h4>
              <p className="text-[10px] !text-dash-textMuted font-medium">Test prompting alignment in real-time</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold !text-dash-textMuted">Direct generation test brief</label>
            <textarea
              rows={3}
              value={testBrief}
              onChange={(e) => setTestBrief(e.target.value)}
              className="w-full bg-white border border-dash-border rounded-xl px-3 py-2 !text-dash-text focus:border-dash-accent transition-all motion-reduce:transition-none outline-none text-xs resize-none font-medium"
            />
          </div>

          <button
            onClick={handleRunSandbox}
            disabled={testing}
            className="w-full bg-dash-accent hover:bg-dash-accent/90 text-white font-bold text-[10px] h-10 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-dash-accent/15 transition-all motion-reduce:transition-none disabled:opacity-50"
          >
            {testing ? (
              <>
                <i className="fa-solid fa-spinner animate-spin motion-reduce:animate-none text-[10px]"></i>
                Executing...
              </>
            ) : (
              <>
                <Play size={12} fill="white" />
                Run engine generation
              </>
            )}
          </button>

          {previewPrompt && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold !text-dash-textMuted">Compiled system instructions</label>
              <div className="bg-dash-surface border border-dash-border rounded-xl p-3 h-32 overflow-y-auto text-[10px] font-mono !text-dash-textMuted space-y-2 common-scrollbar whitespace-pre-wrap select-all">
                {previewPrompt.system}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-bold !text-dash-textMuted">Output preview document content</label>
            <div className="bg-dash-surface border border-dash-border rounded-xl p-3 min-h-24 max-h-40 overflow-y-auto text-[11px] !text-dash-textMuted font-medium common-scrollbar whitespace-pre-wrap leading-relaxed select-text">
              {previewOutput || <span className="italic !text-dash-textMuted">Compiled AI response displays here...</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
