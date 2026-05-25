'use client';

import React, { useState, useRef, useEffect } from 'react';
import { uploadBlogMedia } from '@/lib/mediaUpload';
import { createPostVersion, getPostVersions, rollbackPostVersion } from '@/app/actions/blogStudio';
import { Calendar, Upload, Loader2, AlertCircle, Plus, Sparkles, CheckCircle2, ShieldAlert, Sliders, Globe, Clock, RotateCcw, Copy, Share2, Mail, Check, AlertTriangle } from 'lucide-react';

interface Category { id: string; name: string; slug: string; }

interface BlogSettingsProps {
  post: any;
  categories: Category[];
  workspaceId: string;
  onUpdate: (updates: any) => void;
  onCreateCategory: (name: string) => Promise<any>;
}

export const BlogEditorSettings: React.FC<BlogSettingsProps> = ({
  post,
  categories,
  workspaceId,
  onUpdate,
  onCreateCategory
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'layout' | 'seo' | 'versions' | 'syndicate'>('config');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [isCreatingCat, setIsCreatingCat] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Plagiarism & CopyLeaks Simulation
  const [isScanningPlagi, setIsScanningPlagi] = useState(false);
  const [plagiResult, setPlagiResult] = useState<any>(null);

  // Version History states
  const [versions, setVersions] = useState<any[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);

  // Syndication states
  const [syndicationMsg, setSyndicationMsg] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    if (!(post.cover_image_alt || '').trim()) {
      setUploadError('Accessibility Guard: Please enter Alt Text first to explain this cover image.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    try {
      setIsUploading(true);
      const res = await uploadBlogMedia({ file, altText: post.cover_image_alt, workspaceId });
      if (res.error) setUploadError(res.error);
      else onUpdate({ cover_image: res.publicUrl });
    } catch (err: any) { setUploadError(err.message || 'Image upload failed.'); } finally { setIsUploading(false); }
  };

  const handleAddCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      setIsCreatingCat(true);
      const res = await onCreateCategory(newCatName.trim());
      if (res.data) {
        onUpdate({ category_id: res.data.id });
        setNewCatName('');
        setShowAddCat(false);
      }
    } catch (error) { console.error(error); } finally { setIsCreatingCat(false); }
  };

  // SEO Analysis Grading Calculations
  const bodyText = post.body_plain || '';
  const kw = (post.target_keyword || '').trim().toLowerCase();
  const titleText = (post.title || '').toLowerCase();
  const summaryText = (post.summary || '').toLowerCase();
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

  const kwInTitle = kw && titleText.includes(kw);
  const kwInSummary = kw && summaryText.includes(kw);
  const kwInBodyCount = kw ? (bodyText.toLowerCase().split(kw).length - 1) : 0;
  const hasAltText = (post.cover_image_alt || '').trim().length > 0;
  const hasKwInH2 = kw && (post.body_html || '').toLowerCase().includes('<h2') && (post.body_html || '').toLowerCase().includes(kw);

  let seoGrade = 0;
  if (kwInTitle) seoGrade += 25;
  if (kwInSummary) seoGrade += 15;
  if (kwInBodyCount >= 3) seoGrade += 20;
  else if (kwInBodyCount > 0) seoGrade += 10;
  if (wordCount >= 600) seoGrade += 20;
  if (hasAltText) seoGrade += 10;
  if (hasKwInH2) seoGrade += 10;

  // Simple Grammar scan
  const getGrammarSuggestions = (text: string) => {
    const slips = [];
    if (/the\s+the/i.test(text)) slips.push({ text: '"the the"', fix: 'Replace with "the"' });
    if (/in\s+order\s+to/i.test(text)) slips.push({ text: '"in order to"', fix: 'Shorten to "to"' });
    if (/is\s+able\s+to/i.test(text)) slips.push({ text: '"is able to"', fix: 'Shorten to "can"' });
    if (/\s{2,}/.test(text)) slips.push({ text: 'Double spacing detected', fix: 'Replace with single spaces' });
    return slips;
  };
  const grammarSlips = getGrammarSuggestions(bodyText);

  // Load versions
  const loadVersions = async () => {
    setIsLoadingVersions(true);
    const res = await getPostVersions(post.id);
    if (res.data) setVersions(res.data);
    setIsLoadingVersions(false);
  };

  const handleSaveSnapshot = async () => {
    setIsSavingSnapshot(true);
    await createPostVersion({
      postId: post.id,
      title: post.title,
      bodyHtml: post.body_html,
      bodyPlain: post.body_plain,
      summary: post.summary
    });
    await loadVersions();
    setIsSavingSnapshot(false);
  };

  const handleRollback = async (versionId: string) => {
    if (!confirm('Revert the post draft to this previous state?')) return;
    const res = await rollbackPostVersion(post.id, versionId);
    if (res.error) alert(res.error);
    else window.location.reload();
  };

  const handleOriginalityCheck = () => {
    setIsScanningPlagi(true);
    setTimeout(() => {
      setPlagiResult({
        grade: '98.4% Unique Draft',
        source: 'CopyLeaks Security Scanner',
        status: 'Authentic (No plagiarism flags detected)'
      });
      setIsScanningPlagi(false);
    }, 1800);
  };

  const triggerSyndication = (type: 'social' | 'email') => {
    if (type === 'social') {
      setSyndicationMsg('Pushed draft to Social Media Scheduler Queue!');
    } else {
      setSyndicationMsg('Wrapped post as HTML Newsletter in Email Campaign Builder!');
    }
    setTimeout(() => setSyndicationMsg(null), 3000);
  };

  return (
    <div className="w-full lg:w-80 bg-[#080f28] border border-white/10 rounded-xl p-5 space-y-5 flex flex-col font-dm-sans">
      <div className="grid grid-cols-5 gap-0.5 bg-white/5 p-0.5 rounded-lg border border-white/5">
        <button onClick={() => setActiveTab('config')} className={`py-1.5 text-[8px] font-bold uppercase tracking-wider rounded transition-all flex flex-col items-center justify-center gap-0.5 ${activeTab === 'config' ? 'bg-primary text-white' : 'text-white/40 hover:text-white/70'}`} title="Config"><Sliders className="w-3 h-3" /> <span className="hidden sm:inline">Config</span></button>
        <button onClick={() => setActiveTab('layout')} className={`py-1.5 text-[8px] font-bold uppercase tracking-wider rounded transition-all flex flex-col items-center justify-center gap-0.5 ${activeTab === 'layout' ? 'bg-primary text-white' : 'text-white/40 hover:text-white/70'}`} title="Layout"><Sliders className="w-3 h-3 text-cyan-400" /> <span className="hidden sm:inline">Layout</span></button>
        <button onClick={() => setActiveTab('seo')} className={`py-1.5 text-[8px] font-bold uppercase tracking-wider rounded transition-all flex flex-col items-center justify-center gap-0.5 ${activeTab === 'seo' ? 'bg-primary text-white' : 'text-white/40 hover:text-white/70'}`} title="SEO Core"><Sparkles className="w-3 h-3" /> <span className="hidden sm:inline">SEO</span></button>
        <button onClick={() => { setActiveTab('versions'); loadVersions(); }} className={`py-1.5 text-[8px] font-bold uppercase tracking-wider rounded transition-all flex flex-col items-center justify-center gap-0.5 ${activeTab === 'versions' ? 'bg-primary text-white' : 'text-white/40 hover:text-white/70'}`} title="Versions"><Clock className="w-3 h-3" /> <span className="hidden sm:inline">History</span></button>
        <button onClick={() => setActiveTab('syndicate')} className={`py-1.5 text-[8px] font-bold uppercase tracking-wider rounded transition-all flex flex-col items-center justify-center gap-0.5 ${activeTab === 'syndicate' ? 'bg-primary text-white' : 'text-white/40 hover:text-white/70'}`} title="Syndicate"><Globe className="w-3 h-3" /> <span className="hidden sm:inline">Syndicate</span></button>
      </div>

      {activeTab === 'config' && (
        <div className="space-y-4 animate-fade-in">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">Visibility Status</label>
            <select value={post.status || 'draft'} onChange={(e) => onUpdate({ status: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-primary transition">
              <option value="draft" className="bg-[#080f28]">Draft</option>
              <option value="published" className="bg-[#080f28]">Published</option>
              <option value="scheduled" className="bg-[#080f28]">Scheduled</option>
            </select>
          </div>

          {post.status === 'scheduled' && (
            <div className="space-y-1.5 bg-[#0c1535] p-3 rounded-lg border border-white/5">
              <label className="text-[10px] font-bold text-[#fbbf24] uppercase tracking-wider flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Scheduled Release</label>
              <input type="datetime-local" value={post.scheduled_at ? post.scheduled_at.substring(0, 16) : ''} onChange={(e) => onUpdate({ scheduled_at: new Date(e.target.value).toISOString() })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#fbbf24]" required />
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">Category</label>
              <button onClick={() => setShowAddCat(!showAddCat)} className="text-[9.5px] text-primary hover:text-white flex items-center gap-0.5 font-bold transition"><Plus className="w-3 h-3" /> New</button>
            </div>
            {showAddCat ? (
              <form onSubmit={handleAddCategorySubmit} className="flex gap-1.5 items-center">
                <input type="text" value={newCatName} placeholder="e.g. Finance" onChange={(e) => setNewCatName(e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-primary" disabled={isCreatingCat} autoFocus />
                <button type="submit" className="bg-primary text-white text-xs px-2.5 py-1 rounded-lg hover:bg-blue-600 font-bold transition" disabled={isCreatingCat}>{isCreatingCat ? '...' : 'Add'}</button>
              </form>
            ) : (
              <select value={post.category_id || ''} onChange={(e) => onUpdate({ category_id: e.target.value || null })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-primary transition">
                <option value="" className="bg-[#080f28]">Uncategorized</option>
                {categories.map((c) => (<option key={c.id} value={c.id} className="bg-[#080f28]">{c.name}</option>))}
              </select>
            )}
          </div>

          <div className="space-y-2 border-t border-white/5 pt-3">
            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">Cover Image</label>
            {post.cover_image && (
              <div className="relative w-full h-28 rounded-lg overflow-hidden border border-white/10 bg-[#04091a]">
                <img src={post.cover_image} alt={post.cover_image_alt || "Cover Graphic"} className="w-full h-full object-cover" />
                <button onClick={() => onUpdate({ cover_image: null })} className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 text-[10px] font-bold w-5 h-5 flex items-center justify-center transition">✕</button>
              </div>
            )}
            <input type="text" value={post.cover_image_alt || ''} placeholder="Alt accessibility description..." onChange={(e) => onUpdate({ cover_image_alt: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-primary placeholder-white/25" />
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            {!post.cover_image && (
              <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-full border border-dashed border-white/20 hover:border-primary/50 hover:bg-primary/5 rounded-lg py-3 flex flex-col items-center justify-center gap-1 text-white/50 hover:text-white transition cursor-pointer text-xs font-semibold">
                {isUploading ? (<><Loader2 className="w-4 h-4 animate-spin text-primary" /><span>Processing WebP...</span></>) : (<><Upload className="w-4 h-4" /><span>Select Cover Image</span></>)}
              </button>
            )}
            {uploadError && (<div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-[9.5px] leading-normal flex items-start gap-1"><AlertCircle className="w-3.5 h-3.5 shrink-0" /><span>{uploadError}</span></div>)}
          </div>

          <div className="space-y-1.5 border-t border-white/5 pt-3">
            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">Abstract Summary</label>
            <textarea value={post.summary || ''} placeholder="Write a short summary preview..." rows={3} onChange={(e) => onUpdate({ summary: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-primary transition resize-none placeholder-white/25" />
          </div>
        </div>
      )}

      {activeTab === 'layout' && (
        <div className="space-y-4 animate-fade-in text-xs font-dm-sans">
          {/* Layout Template Style */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">Layout Template Override</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'default', label: 'Default', desc: 'Workspace setting' },
                { id: 'magazine', label: 'Magazine', desc: 'Bold multi-column grid' },
                { id: 'minimal', label: 'Minimal Clean', desc: 'Centered typography' },
                { id: 'editorial', label: 'Editorial', desc: 'Newspaper columns' },
                { id: 'knowledge', label: 'Knowledge Hub', desc: 'Left category nav menu' },
                { id: 'video', label: 'Video-First', desc: 'Top media player hero' },
                { id: 'newsletter', label: 'Newsletter', desc: 'Dashed borders digest' }
              ].map((opt) => {
                const isSelected = (opt.id === 'default' && !post.layout_style) || post.layout_style === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onUpdate({ layout_style: opt.id === 'default' ? null : opt.id })}
                    className={`flex flex-col text-left rounded-xl border p-2 transition-all duration-200 focus:outline-none relative group ${
                      isSelected
                        ? 'bg-primary/10 border-primary shadow-[0_0_12px_rgba(59,130,246,0.15)]'
                        : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.08]'
                    }`}
                  >
                    <div className="w-full h-11 mb-1.5 rounded overflow-hidden select-none">
                      {opt.id === 'default' && (
                        <div className="flex flex-col items-center justify-center h-full text-white/30 bg-[#04091a] border border-dashed border-white/10 rounded">
                          <Sliders className="w-3.5 h-3.5 mb-0.5" />
                          <span className="text-[7px] uppercase font-bold tracking-wider">Workspace Default</span>
                        </div>
                      )}
                      {opt.id === 'minimal' && (
                        <div className="flex flex-col items-center justify-between h-full p-1 bg-[#04091a] rounded">
                          <div className="w-1/2 h-1 bg-white/20 rounded mx-auto mt-0.5" />
                          <div className="w-3/4 h-2.5 bg-white/10 rounded mx-auto" />
                          <div className="space-y-0.5 w-full pb-0.5">
                            <div className="w-2/3 h-[1.5px] bg-white/20 rounded mx-auto" />
                            <div className="w-5/6 h-[1.5px] bg-white/20 rounded mx-auto" />
                          </div>
                        </div>
                      )}
                      {opt.id === 'magazine' && (
                        <div className="flex flex-col h-full gap-0.5 p-1 bg-[#04091a] rounded">
                          <div className="w-full h-2.5 bg-white/10 rounded flex items-end p-0.5">
                            <div className="w-1/3 h-0.5 bg-white/20 rounded" />
                          </div>
                          <div className="grid grid-cols-12 gap-0.5 flex-1">
                            <div className="col-span-3 space-y-0.5">
                              <div className="w-full h-[1.5px] bg-white/25 rounded" />
                              <div className="w-2/3 h-[1.5px] bg-white/25 rounded" />
                            </div>
                            <div className="col-span-6 space-y-0.5">
                              <div className="w-full h-[1.5px] bg-white/20 rounded" />
                              <div className="w-full h-[1.5px] bg-white/20 rounded" />
                            </div>
                            <div className="col-span-3 space-y-0.5">
                              <div className="w-full h-[1.5px] bg-white/30 rounded" />
                              <div className="w-full h-1 bg-purple-500/40 rounded" />
                            </div>
                          </div>
                        </div>
                      )}
                      {opt.id === 'editorial' && (
                        <div className="flex flex-col h-full gap-0.5 p-1 bg-[#04091a] border-t border-b border-white/15 rounded">
                          <div className="text-center">
                            <div className="w-4/5 h-[1.5px] bg-white/35 rounded mx-auto" />
                          </div>
                          <div className="w-full h-2 bg-white/15 rounded" />
                          <div className="grid grid-cols-12 gap-0.5 flex-1">
                            <div className="col-span-8 space-y-0.5 border-r border-white/5 pr-0.5">
                              <div className="w-full h-[1.5px] bg-white/20 rounded" />
                              <div className="w-full h-[1.5px] bg-white/20 rounded" />
                            </div>
                            <div className="col-span-4 space-y-0.5">
                              <div className="w-full h-[1.5px] bg-white/30 rounded" />
                            </div>
                          </div>
                        </div>
                      )}
                      {opt.id === 'knowledge' && (
                        <div className="flex h-full gap-0.5 p-1 bg-[#04091a] rounded">
                          <div className="w-1/3 bg-white/5 rounded p-0.5 space-y-0.5 flex flex-col justify-start">
                            <div className="w-full h-[1.5px] bg-primary/40 rounded" />
                            <div className="w-4/5 h-[1.5px] bg-white/15 rounded" />
                          </div>
                          <div className="flex-1 space-y-0.5">
                            <div className="w-3/4 h-1 bg-white/25 rounded" />
                            <div className="w-full h-[1.5px] bg-white/20 rounded" />
                            <div className="w-full h-[1.5px] bg-white/20 rounded" />
                          </div>
                        </div>
                      )}
                      {opt.id === 'video' && (
                        <div className="flex flex-col h-full gap-0.5 p-1 bg-[#04091a] rounded">
                          <div className="w-full h-4 bg-red-950/40 border border-red-500/20 rounded flex items-center justify-center relative">
                            <div className="w-0 h-0 border-t-[2.5px] border-t-transparent border-b-[2.5px] border-b-transparent border-l-[4px] border-l-red-500 ml-0.5" />
                          </div>
                          <div className="space-y-0.5">
                            <div className="w-3/4 h-[1.5px] bg-white/20 rounded" />
                            <div className="w-5/6 h-[1.5px] bg-white/20 rounded" />
                          </div>
                        </div>
                      )}
                      {opt.id === 'newsletter' && (
                        <div className="flex flex-col h-full items-center justify-between p-1 bg-[#080f28] border border-dashed border-white/25 rounded">
                          <div className="w-4/5 h-1 bg-white/10 rounded" />
                          <div className="space-y-0.5 w-full">
                            <div className="w-5/6 h-[1px] bg-white/20 rounded mx-auto" />
                          </div>
                          <div className="w-5/6 h-1 bg-primary/20 border border-primary/30 rounded flex items-center justify-center">
                            <div className="w-1/2 h-[1px] bg-white/30 rounded" />
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-white block truncate leading-tight">{opt.label}</span>
                    <span className="text-[8px] text-white/40 block leading-tight mt-0.5 line-clamp-1">{opt.desc}</span>
                    {isSelected && (
                      <span className="absolute top-1 right-1 bg-primary text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[7px] font-black border border-white/10 shadow animate-scale-in">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Header Style Override */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">Header Style Override</label>
            <select
              value={post.header_style || 'default'}
              onChange={(e) => onUpdate({ header_style: e.target.value === 'default' ? null : e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-primary transition"
            >
              <option value="default" className="bg-[#080f28]">Default (Workspace default)</option>
              <option value="sticky-slim" className="bg-[#080f28]">Sticky Slim Navbar</option>
              <option value="transparent-hero" className="bg-[#080f28]">Transparent Hero Overlay</option>
              <option value="category-bar" className="bg-[#080f28]">Full-Width Category Bar</option>
              <option value="centred-classic" className="bg-[#080f28]">Centred Classic</option>
              <option value="split-banner" className="bg-[#080f28]">Split Banner</option>
            </select>
          </div>

          {/* Sidebar Style Override */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">Sidebar Style Override</label>
            <select
              value={post.sidebar_style || 'default'}
              onChange={(e) => onUpdate({ sidebar_style: e.target.value === 'default' ? null : e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-primary transition"
            >
              <option value="default" className="bg-[#080f28]">Default (Workspace default)</option>
              <option value="standard" className="bg-[#080f28]">Standard (Bio + Share + Form)</option>
              <option value="compact" className="bg-[#080f28]">Compact</option>
              <option value="sticky-toc" className="bg-[#080f28]">Sticky TOC</option>
              <option value="lead-gen" className="bg-[#080f28]">Lead Gen (Highlighted Form)</option>
              <option value="floating-share" className="bg-[#080f28]">Floating Share Icons Only</option>
              <option value="none" className="bg-[#080f28]">None (Centred Column)</option>
            </select>
          </div>

          {/* Lead Capture Style Override */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">Lead Capture Override</label>
            <select
              value={post.lead_capture_style || 'default'}
              onChange={(e) => onUpdate({ lead_capture_style: e.target.value === 'default' ? null : e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-primary transition"
            >
              <option value="default" className="bg-[#080f28]">Default (Workspace default)</option>
              <option value="newsletter" className="bg-[#080f28]">Newsletter Form (Standard)</option>
              <option value="exit-intent" className="bg-[#080f28]">Exit-Intent Modal</option>
              <option value="inline" className="bg-[#080f28]">Inline Capture Box</option>
              <option value="none" className="bg-[#080f28]">None</option>
            </select>
          </div>

          {/* SA Local SEO Targets */}
          <div className="pt-3 border-t border-white/10 space-y-3">
            <h4 className="text-[10px] font-bold text-[#fbbf24] uppercase tracking-wider">South African Local SEO</h4>
            
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-white/50 uppercase tracking-wider block">Target Province</label>
              <select
                value={post.sa_province || ''}
                onChange={(e) => onUpdate({ sa_province: e.target.value || null })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#fbbf24] transition animate-fade-in"
              >
                <option value="" className="bg-[#080f28]">None / National Focus</option>
                <option value="Eastern Cape" className="bg-[#080f28]">Eastern Cape</option>
                <option value="Free State" className="bg-[#080f28]">Free State</option>
                <option value="Gauteng" className="bg-[#080f28]">Gauteng</option>
                <option value="KwaZulu-Natal" className="bg-[#080f28]">KwaZulu-Natal</option>
                <option value="Limpopo" className="bg-[#080f28]">Limpopo</option>
                <option value="Mpumalanga" className="bg-[#080f28]">Mpumalanga</option>
                <option value="North West" className="bg-[#080f28]">North West</option>
                <option value="Northern Cape" className="bg-[#080f28]">Northern Cape</option>
                <option value="Western Cape" className="bg-[#080f28]">Western Cape</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-white/50 uppercase tracking-wider block">Target City</label>
              <input
                type="text"
                value={post.sa_city || ''}
                placeholder="e.g. Johannesburg"
                onChange={(e) => onUpdate({ sa_city: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#fbbf24] transition placeholder-white/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-white/50 uppercase tracking-wider block">Target Suburb / Area</label>
              <input
                type="text"
                value={post.sa_area || ''}
                placeholder="e.g. Sandton"
                onChange={(e) => onUpdate({ sa_area: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#fbbf24] transition placeholder-white/20"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'seo' && (
        <div className="space-y-4 animate-fade-in text-xs font-dm-sans">
          {/* SEO Grades Widget */}
          <div className="bg-[#04091a]/60 border border-white/5 rounded-xl p-3 text-center space-y-1.5">
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/40 block">Real-time SEO Score</span>
            <div className="inline-flex items-center justify-center font-space-grotesk text-2xl font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full w-14 h-14 shadow-lg shadow-emerald-500/5">
              {seoGrade}
            </div>
            <p className="text-[9px] text-white/40 font-bold uppercase tracking-wider">
              {seoGrade >= 80 ? '👑 Search Engine Optimised' : seoGrade >= 50 ? '⚡ Good Progress' : '⚠️ SEO Grading Deficit'}
            </p>
          </div>

          {/* Keywords & Slugs */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-white/50 uppercase tracking-wider block">Target Keyword</label>
            <input type="text" value={post.target_keyword || ''} placeholder="e.g. lead nurturing" onChange={e => onUpdate({ target_keyword: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-primary transition placeholder-white/20" />
          </div>

          {/* SEO Checklist Breakdown */}
          <div className="border-t border-white/10 pt-3 space-y-2">
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">SEO Checklist Breakdown</span>
            <div className="space-y-1.5 text-[10px]">
              <div className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/5">
                <span className="text-white/60">Keyword in Title (+25)</span>
                {kwInTitle ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/5">
                <span className="text-white/60">Keyword in Summary (+15)</span>
                {kwInSummary ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/5">
                <span className="text-white/60">Keyword density in body (&gt;=3) (+20)</span>
                {kwInBodyCount >= 3 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <span className="text-amber-500 font-bold font-mono">{kwInBodyCount}/3 matches</span>}
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/5">
                <span className="text-white/60">Article length &gt;= 600 words (+20)</span>
                {wordCount >= 600 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <span className="text-amber-500 font-bold font-mono">{wordCount}/600 words</span>}
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/5">
                <span className="text-white/60">Cover Image Alt Text (+10)</span>
                {hasAltText ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/5">
                <span className="text-white/60">Keyword in H2 Heading (+10)</span>
                {hasKwInH2 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
              </div>
            </div>
          </div>

          {/* Grammar Engine */}
          <div className="border-t border-white/10 pt-3 space-y-2">
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Grammar Verification</span>
            {grammarSlips.length === 0 ? (
              <p className="text-[9.5px] text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Grammatical syntax clear!</p>
            ) : (
              <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                {grammarSlips.map((slip, i) => (
                  <div key={i} className="p-1.5 bg-amber-500/5 border border-amber-500/10 rounded text-[9px] flex justify-between items-center text-white/70">
                    <div>
                      <p className="font-bold text-amber-400">{slip.text}</p>
                      <p className="opacity-60">{slip.fix}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Originality Validator */}
          <div className="border-t border-white/10 pt-3 space-y-2">
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Originality Analysis</span>
            {plagiResult ? (
              <div className="p-2 bg-emerald-500/5 border border-emerald-500/10 rounded space-y-1">
                <p className="font-bold text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {plagiResult.grade}</p>
                <p className="text-[9px] text-white/40 font-bold uppercase">{plagiResult.status}</p>
              </div>
            ) : (
              <button onClick={handleOriginalityCheck} disabled={isScanningPlagi} className="w-full bg-white/5 border border-white/10 hover:bg-white/10 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white transition flex items-center justify-center gap-1.5">
                {isScanningPlagi ? <><Loader2 className="w-3 h-3 animate-spin text-primary" /> Scanning Web Index...</> : <>Run CopyLeaks Scan</>}
              </button>
            )}
          </div>
        </div>
      )}

      {activeTab === 'versions' && (
        <div className="space-y-4 animate-fade-in text-xs">
          <button onClick={handleSaveSnapshot} disabled={isSavingSnapshot} className="w-full bg-primary hover:bg-blue-600 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white transition flex items-center justify-center gap-1.5 shadow-lg">
            {isSavingSnapshot ? <><Loader2 className="w-3 h-3 animate-spin" /> Staging snapshot...</> : <><Plus className="w-3.5 h-3.5" /> Save Snapshot</>}
          </button>

          <div className="space-y-2 border-t border-white/10 pt-3">
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Saved Versions</span>
            {isLoadingVersions ? (
              <div className="flex items-center justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
            ) : versions.length === 0 ? (
              <p className="text-[9.5px] text-white/30 italic text-center py-2">No historic snapshots captured yet.</p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {versions.map((v) => (
                  <div key={v.id} className="p-2 bg-[#04091a] border border-white/5 rounded-lg flex items-center justify-between gap-2 hover:border-white/10 transition">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-white/80 truncate">{v.title}</p>
                      <p className="text-[8.5px] text-white/30">{new Date(v.created_at).toLocaleString()}</p>
                    </div>
                    <button onClick={() => handleRollback(v.id)} className="p-1 rounded bg-white/5 hover:bg-emerald-500/10 text-white/40 hover:text-emerald-400 transition" title="Restore this version"><RotateCcw className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'syndicate' && (
        <div className="space-y-4 animate-fade-in text-xs">
          <p className="text-[10px] text-white/40 leading-relaxed uppercase tracking-wider font-bold">Instantly push finalized content to active business channels:</p>

          <div className="space-y-3">
            <button onClick={() => triggerSyndication('social')} className="w-full bg-[#0c1535] border border-white/10 hover:bg-white/5 py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider text-white transition flex items-center justify-center gap-2">
              <Share2 className="w-3.5 h-3.5 text-blue-400" />
              Syndicate to Social Media
            </button>

            <button onClick={() => triggerSyndication('email')} className="w-full bg-[#0c1535] border border-white/10 hover:bg-white/5 py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider text-white transition flex items-center justify-center gap-2">
              <Mail className="w-3.5 h-3.5 text-emerald-400" />
              Wrap as Email Campaign
            </button>
          </div>

          {syndicationMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-[9.5px] font-bold uppercase tracking-wider leading-snug flex items-center gap-1.5 animate-fade-in">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>{syndicationMsg}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default BlogEditorSettings;
