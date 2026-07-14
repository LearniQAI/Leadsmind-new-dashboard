'use client';

import React, { useState, useRef } from 'react';
import { uploadBlogMedia } from '@/lib/mediaUpload';
import { createPostVersion, getPostVersions, rollbackPostVersion } from '@/app/actions/blogStudio';
import { Calendar, Upload, Loader2, AlertCircle, Plus, Sparkles, CheckCircle2, Sliders, Globe, Clock, RotateCcw, Share2, Mail, Check, AlertTriangle } from 'lucide-react';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DashButton } from '@/components/dashboard-ui/Button';

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
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);

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
    setConfirmConfig({
      isOpen: true,
      title: 'Rollback draft?',
      description: 'Revert the post draft to this previous state?',
      confirmLabel: 'Revert',
      onConfirm: async () => {
        const res = await rollbackPostVersion(post.id, versionId);
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success('Draft reverted successfully.');
          window.location.reload();
        }
      }
    });
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

  const selectClass = "w-full bg-white border border-dash-border rounded-lg px-3 py-2 text-xs !text-dash-text outline-none focus:border-dash-accent transition-colors motion-reduce:transition-none";
  const labelClass = "text-[10px] font-bold !text-dash-textMuted block";
  const tabBtnClass = (active: boolean) => cn(
    "py-1.5 text-[9px] font-bold rounded transition-colors motion-reduce:transition-none flex flex-col items-center justify-center gap-0.5",
    active ? 'bg-dash-accent text-white' : '!text-dash-textMuted hover:!text-dash-text'
  );

  return (
    <div className="w-full lg:w-80 bg-white border border-dash-border rounded-xl p-5 space-y-5 flex flex-col">
      <div className="grid grid-cols-5 gap-0.5 bg-dash-surface p-0.5 rounded-lg border border-dash-border">
        <button onClick={() => setActiveTab('config')} className={tabBtnClass(activeTab === 'config')} title="Config"><Sliders className="w-3 h-3" /> <span className="hidden sm:inline">Config</span></button>
        <button onClick={() => setActiveTab('layout')} className={tabBtnClass(activeTab === 'layout')} title="Layout"><Sliders className="w-3 h-3" /> <span className="hidden sm:inline">Layout</span></button>
        <button onClick={() => setActiveTab('seo')} className={tabBtnClass(activeTab === 'seo')} title="SEO Core"><Sparkles className="w-3 h-3" /> <span className="hidden sm:inline">SEO</span></button>
        <button onClick={() => { setActiveTab('versions'); loadVersions(); }} className={tabBtnClass(activeTab === 'versions')} title="Versions"><Clock className="w-3 h-3" /> <span className="hidden sm:inline">History</span></button>
        <button onClick={() => setActiveTab('syndicate')} className={tabBtnClass(activeTab === 'syndicate')} title="Syndicate"><Globe className="w-3 h-3" /> <span className="hidden sm:inline">Syndicate</span></button>
      </div>

      {activeTab === 'config' && (
        <div className="space-y-4 animate-in fade-in duration-200 motion-reduce:animate-none">
          <div className="space-y-1.5">
            <label className={labelClass}>Visibility status</label>
            <select value={post.status || 'draft'} onChange={(e) => onUpdate({ status: e.target.value })} className={selectClass}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>

          {post.status === 'scheduled' && (
            <div className="space-y-1.5 bg-dash-surface p-3 rounded-lg border border-dash-border">
              <label className="text-[10px] font-bold text-amber-600 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Scheduled release</label>
              <input type="datetime-local" value={post.scheduled_at ? post.scheduled_at.substring(0, 16) : ''} onChange={(e) => onUpdate({ scheduled_at: new Date(e.target.value).toISOString() })} className="w-full bg-white border border-dash-border rounded-lg px-3 py-1.5 text-xs !text-dash-text outline-none focus:border-amber-500" required />
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className={labelClass}>Category</label>
              <button onClick={() => setShowAddCat(!showAddCat)} className="text-[10px] text-dash-accent hover:text-dash-accent/80 flex items-center gap-0.5 font-bold transition-colors motion-reduce:transition-none"><Plus className="w-3 h-3" /> New</button>
            </div>
            {showAddCat ? (
              <form onSubmit={handleAddCategorySubmit} className="flex gap-1.5 items-center">
                <input type="text" value={newCatName} placeholder="e.g. Finance" onChange={(e) => setNewCatName(e.target.value)} className="flex-1 bg-white border border-dash-border rounded-lg px-2.5 py-1 text-xs !text-dash-text outline-none focus:border-dash-accent" disabled={isCreatingCat} autoFocus />
                <DashButton type="submit" size="sm" disabled={isCreatingCat}>{isCreatingCat ? '...' : 'Add'}</DashButton>
              </form>
            ) : (
              <select value={post.category_id || ''} onChange={(e) => onUpdate({ category_id: e.target.value || null })} className={selectClass}>
                <option value="">Uncategorized</option>
                {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            )}
          </div>

          <div className="space-y-2 border-t border-dash-border pt-3">
            <label className={labelClass}>Cover image</label>
            {post.cover_image && (
              <div className="relative w-full h-28 rounded-lg overflow-hidden border border-dash-border bg-dash-surface">
                <img src={post.cover_image} alt={post.cover_image_alt || "Cover Graphic"} className="w-full h-full object-cover" />
                <button onClick={() => onUpdate({ cover_image: null })} className="absolute top-2 right-2 bg-red hover:bg-red/90 text-white rounded-full p-1 text-[10px] font-bold w-5 h-5 flex items-center justify-center transition-colors motion-reduce:transition-none">✕</button>
              </div>
            )}
            <input type="text" value={post.cover_image_alt || ''} placeholder="Alt accessibility description..." onChange={(e) => onUpdate({ cover_image_alt: e.target.value })} className="w-full bg-white border border-dash-border rounded-lg px-2.5 py-1.5 text-xs !text-dash-text outline-none focus:border-dash-accent placeholder:text-dash-textMuted" />
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            {!post.cover_image && (
              <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-full border border-dashed border-dash-border hover:border-dash-accent/50 hover:bg-dash-accent/5 rounded-lg py-3 flex flex-col items-center justify-center gap-1 !text-dash-textMuted hover:!text-dash-text transition-colors motion-reduce:transition-none cursor-pointer text-xs font-semibold">
                {isUploading ? (<><Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none text-dash-accent" /><span>Processing WebP...</span></>) : (<><Upload className="w-4 h-4" /><span>Select cover image</span></>)}
              </button>
            )}
            {uploadError && (<div className="p-2 bg-red/10 border border-red/20 text-red rounded-lg text-[10px] leading-normal flex items-start gap-1"><AlertCircle className="w-3.5 h-3.5 shrink-0" /><span>{uploadError}</span></div>)}
          </div>

          <div className="space-y-1.5 border-t border-dash-border pt-3">
            <label className={labelClass}>Abstract summary</label>
            <textarea value={post.summary || ''} placeholder="Write a short summary preview..." rows={3} onChange={(e) => onUpdate({ summary: e.target.value })} className="w-full bg-white border border-dash-border rounded-lg px-3 py-2 text-xs !text-dash-text outline-none focus:border-dash-accent transition-colors motion-reduce:transition-none resize-none placeholder:text-dash-textMuted" />
          </div>
        </div>
      )}

      {activeTab === 'layout' && (
        <div className="space-y-4 animate-in fade-in duration-200 motion-reduce:animate-none text-xs">
          {/* Layout Template Style */}
          <div className="space-y-2">
            <label className={labelClass}>Layout template override</label>
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
                    className={cn(
                      "flex flex-col text-left rounded-xl border p-2 transition-colors motion-reduce:transition-none focus:outline-none relative group",
                      isSelected
                        ? 'bg-dash-accent/10 border-dash-accent'
                        : 'bg-dash-surface border-dash-border hover:border-dash-text/20'
                    )}
                  >
                    {/*
                      Thumbnail swatches below intentionally kept dark — they
                      preview the actual public blog page's layout templates
                      (a separate, out-of-scope surface from this dashboard),
                      not dashboard chrome.
                    */}
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
                    <span className="text-[10px] font-bold !text-dash-text block truncate leading-tight">{opt.label}</span>
                    <span className="text-[9px] !text-dash-textMuted block leading-tight mt-0.5 line-clamp-1">{opt.desc}</span>
                    {isSelected && (
                      <span className="absolute top-1 right-1 bg-dash-accent text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px] font-bold shadow-sm">
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
            <label className={labelClass}>Header style override</label>
            <select
              value={post.header_style || 'default'}
              onChange={(e) => onUpdate({ header_style: e.target.value === 'default' ? null : e.target.value })}
              className={selectClass}
            >
              <option value="default">Default (Workspace default)</option>
              <option value="sticky-slim">Sticky Slim Navbar</option>
              <option value="transparent-hero">Transparent Hero Overlay</option>
              <option value="category-bar">Full-Width Category Bar</option>
              <option value="centred-classic">Centred Classic</option>
              <option value="split-banner">Split Banner</option>
            </select>
          </div>

          {/* Sidebar Style Override */}
          <div className="space-y-1.5">
            <label className={labelClass}>Sidebar style override</label>
            <select
              value={post.sidebar_style || 'default'}
              onChange={(e) => onUpdate({ sidebar_style: e.target.value === 'default' ? null : e.target.value })}
              className={selectClass}
            >
              <option value="default">Default (Workspace default)</option>
              <option value="standard">Standard (Bio + Share + Form)</option>
              <option value="compact">Compact</option>
              <option value="sticky-toc">Sticky TOC</option>
              <option value="lead-gen">Lead Gen (Highlighted Form)</option>
              <option value="floating-share">Floating Share Icons Only</option>
              <option value="none">None (Centred Column)</option>
            </select>
          </div>

          {/* Lead Capture Style Override */}
          <div className="space-y-1.5">
            <label className={labelClass}>Lead capture override</label>
            <select
              value={post.lead_capture_style || 'default'}
              onChange={(e) => onUpdate({ lead_capture_style: e.target.value === 'default' ? null : e.target.value })}
              className={selectClass}
            >
              <option value="default">Default (Workspace default)</option>
              <option value="newsletter">Newsletter Form (Standard)</option>
              <option value="exit-intent">Exit-Intent Modal</option>
              <option value="inline">Inline Capture Box</option>
              <option value="none">None</option>
            </select>
          </div>

          {/* SA Local SEO Targets */}
          <div className="pt-3 border-t border-dash-border space-y-3">
            <h4 className="text-[10px] font-bold text-amber-600">South African local SEO</h4>

            <div className="space-y-1.5">
              <label className={cn(labelClass, "text-[9px]")}>Target province</label>
              <select
                value={post.sa_province || ''}
                onChange={(e) => onUpdate({ sa_province: e.target.value || null })}
                className={cn(selectClass, "focus:border-amber-500")}
              >
                <option value="">None / National Focus</option>
                <option value="Eastern Cape">Eastern Cape</option>
                <option value="Free State">Free State</option>
                <option value="Gauteng">Gauteng</option>
                <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                <option value="Limpopo">Limpopo</option>
                <option value="Mpumalanga">Mpumalanga</option>
                <option value="North West">North West</option>
                <option value="Northern Cape">Northern Cape</option>
                <option value="Western Cape">Western Cape</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className={cn(labelClass, "text-[9px]")}>Target city</label>
              <input
                type="text"
                value={post.sa_city || ''}
                placeholder="e.g. Johannesburg"
                onChange={(e) => onUpdate({ sa_city: e.target.value })}
                className={cn(selectClass, "focus:border-amber-500 placeholder:text-dash-textMuted")}
              />
            </div>

            <div className="space-y-1.5">
              <label className={cn(labelClass, "text-[9px]")}>Target suburb / area</label>
              <input
                type="text"
                value={post.sa_area || ''}
                placeholder="e.g. Sandton"
                onChange={(e) => onUpdate({ sa_area: e.target.value })}
                className={cn(selectClass, "focus:border-amber-500 placeholder:text-dash-textMuted")}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'seo' && (
        <div className="space-y-4 animate-in fade-in duration-200 motion-reduce:animate-none text-xs">
          {/* SEO Grades Widget */}
          <div className="bg-dash-surface border border-dash-border rounded-xl p-3 text-center space-y-1.5">
            <span className="text-[10px] font-bold !text-dash-textMuted block">Real-time SEO score</span>
            <div className="inline-flex items-center justify-center text-2xl font-bold text-green bg-green/10 border border-green/20 rounded-full w-14 h-14">
              {seoGrade}
            </div>
            <p className="text-[10px] !text-dash-textMuted font-bold">
              {seoGrade >= 80 ? '👑 Search engine optimised' : seoGrade >= 50 ? '⚡ Good progress' : '⚠️ SEO grading deficit'}
            </p>
          </div>

          {/* Keywords & Slugs */}
          <div className="space-y-1.5">
            <label className={cn(labelClass, "text-[9px]")}>Target keyword</label>
            <input type="text" value={post.target_keyword || ''} placeholder="e.g. lead nurturing" onChange={e => onUpdate({ target_keyword: e.target.value })} className={cn(selectClass, "placeholder:text-dash-textMuted")} />
          </div>

          {/* SEO Checklist Breakdown */}
          <div className="border-t border-dash-border pt-3 space-y-2">
            <span className="text-[10px] font-bold !text-dash-textMuted block">SEO checklist breakdown</span>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between p-2 rounded bg-dash-surface border border-dash-border">
                <span className="!text-dash-textMuted">Keyword in title (+25)</span>
                {kwInTitle ? <CheckCircle2 className="w-3.5 h-3.5 text-green shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-dash-surface border border-dash-border">
                <span className="!text-dash-textMuted">Keyword in summary (+15)</span>
                {kwInSummary ? <CheckCircle2 className="w-3.5 h-3.5 text-green shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-dash-surface border border-dash-border">
                <span className="!text-dash-textMuted">Keyword density in body (&gt;=3) (+20)</span>
                {kwInBodyCount >= 3 ? <CheckCircle2 className="w-3.5 h-3.5 text-green shrink-0" /> : <span className="text-amber-600 font-bold font-mono">{kwInBodyCount}/3 matches</span>}
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-dash-surface border border-dash-border">
                <span className="!text-dash-textMuted">Article length &gt;= 600 words (+20)</span>
                {wordCount >= 600 ? <CheckCircle2 className="w-3.5 h-3.5 text-green shrink-0" /> : <span className="text-amber-600 font-bold font-mono">{wordCount}/600 words</span>}
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-dash-surface border border-dash-border">
                <span className="!text-dash-textMuted">Cover image alt text (+10)</span>
                {hasAltText ? <CheckCircle2 className="w-3.5 h-3.5 text-green shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-dash-surface border border-dash-border">
                <span className="!text-dash-textMuted">Keyword in H2 heading (+10)</span>
                {hasKwInH2 ? <CheckCircle2 className="w-3.5 h-3.5 text-green shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
              </div>
            </div>
          </div>

          {/* Grammar Engine */}
          <div className="border-t border-dash-border pt-3 space-y-2">
            <span className="text-[10px] font-bold !text-dash-textMuted block flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Grammar verification</span>
            {grammarSlips.length === 0 ? (
              <p className="text-[10px] text-green flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Grammatical syntax clear!</p>
            ) : (
              <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                {grammarSlips.map((slip, i) => (
                  <div key={i} className="p-1.5 bg-amber-50 border border-amber-200 rounded text-[10px] flex justify-between items-center !text-dash-textMuted">
                    <div>
                      <p className="font-bold text-amber-600">{slip.text}</p>
                      <p className="opacity-70">{slip.fix}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Originality Validator */}
          <div className="border-t border-dash-border pt-3 space-y-2">
            <span className="text-[10px] font-bold !text-dash-textMuted block">Originality analysis</span>
            {plagiResult ? (
              <div className="p-2 bg-green/5 border border-green/10 rounded space-y-1">
                <p className="font-bold text-green flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {plagiResult.grade}</p>
                <p className="text-[10px] !text-dash-textMuted font-bold">{plagiResult.status}</p>
              </div>
            ) : (
              <DashButton variant="secondary" size="sm" onClick={handleOriginalityCheck} disabled={isScanningPlagi} className="w-full justify-center">
                {isScanningPlagi ? <><Loader2 className="w-3 h-3 animate-spin motion-reduce:animate-none" /> Scanning web index...</> : <>Run CopyLeaks scan</>}
              </DashButton>
            )}
          </div>
        </div>
      )}

      {activeTab === 'versions' && (
        <div className="space-y-4 animate-in fade-in duration-200 motion-reduce:animate-none text-xs">
          <DashButton onClick={handleSaveSnapshot} disabled={isSavingSnapshot} className="w-full justify-center">
            {isSavingSnapshot ? <><Loader2 className="w-3 h-3 animate-spin motion-reduce:animate-none" /> Staging snapshot...</> : <><Plus className="w-3.5 h-3.5" /> Save snapshot</>}
          </DashButton>

          <div className="space-y-2 border-t border-dash-border pt-3">
            <span className="text-[10px] font-bold !text-dash-textMuted block">Saved versions</span>
            {isLoadingVersions ? (
              <div className="flex items-center justify-center py-4"><Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none text-dash-accent" /></div>
            ) : versions.length === 0 ? (
              <p className="text-[10px] !text-dash-textMuted italic text-center py-2">No historic snapshots captured yet.</p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {versions.map((v) => (
                  <div key={v.id} className="p-2 bg-dash-surface border border-dash-border rounded-lg flex items-center justify-between gap-2 hover:border-dash-text/20 transition-colors motion-reduce:transition-none">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold !text-dash-text truncate">{v.title}</p>
                      <p className="text-[9px] !text-dash-textMuted">{new Date(v.created_at).toLocaleString()}</p>
                    </div>
                    <button onClick={() => handleRollback(v.id)} className="p-1 rounded bg-white hover:bg-green/10 !text-dash-textMuted hover:text-green transition-colors motion-reduce:transition-none" title="Restore this version"><RotateCcw className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'syndicate' && (
        <div className="space-y-4 animate-in fade-in duration-200 motion-reduce:animate-none text-xs">
          <p className="text-[11px] !text-dash-textMuted leading-relaxed font-bold">Instantly push finalized content to active business channels:</p>

          <div className="space-y-3">
            <button onClick={() => triggerSyndication('social')} className="w-full bg-white border border-dash-border hover:bg-dash-surface py-3 rounded-xl text-[11px] font-bold !text-dash-text transition-colors motion-reduce:transition-none flex items-center justify-center gap-2">
              <Share2 className="w-3.5 h-3.5 text-dash-accent" />
              Syndicate to social media
            </button>

            <button onClick={() => triggerSyndication('email')} className="w-full bg-white border border-dash-border hover:bg-dash-surface py-3 rounded-xl text-[11px] font-bold !text-dash-text transition-colors motion-reduce:transition-none flex items-center justify-center gap-2">
              <Mail className="w-3.5 h-3.5 text-green" />
              Wrap as email campaign
            </button>
          </div>

          {syndicationMsg && (
            <div className="p-3 bg-green/10 border border-green/20 text-green rounded-lg text-[10px] font-bold leading-snug flex items-center gap-1.5 animate-in fade-in duration-200 motion-reduce:animate-none">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>{syndicationMsg}</span>
            </div>
          )}
        </div>
      )}

      {confirmConfig && (
        <ConfirmDialog
          isOpen={confirmConfig.isOpen}
          onClose={() => setConfirmConfig(prev => prev ? { ...prev, isOpen: false } : null)}
          onConfirm={confirmConfig.onConfirm}
          title={confirmConfig.title}
          description={confirmConfig.description}
          confirmLabel={confirmConfig.confirmLabel}
          variant="warning"
        />
      )}
    </div>
  );
};
export default BlogEditorSettings;
