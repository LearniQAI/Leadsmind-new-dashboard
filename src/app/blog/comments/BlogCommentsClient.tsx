'use client';

import React, { useState } from 'react';
import { MessageSquare, Settings, ShieldCheck, ShieldAlert, Trash2, CheckCircle2, Save, XCircle, ArrowLeft, Clock } from 'lucide-react';
import { updateCommentStatus, deleteComment, updateBlogSettings } from '@/app/actions/blogCommentsAdmin';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashButton } from '@/components/dashboard-ui/Button';

interface Comment {
  id: string;
  author_name: string;
  author_email: string;
  content: string;
  status: 'pending' | 'approved' | 'spam' | 'rejected';
  created_at: string;
  post: { id: string; title: string; slug: string; } | null;
}

interface CommentsProps {
  initialComments: Comment[];
  settings: any;
  workspaceId: string;
}

const TABS = ['pending', 'approved', 'spam'] as const;

export default function BlogCommentsClient({ initialComments, settings, workspaceId }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('pending');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);

  const [engine, setEngine] = useState(settings?.comments_engine || 'native');
  const [disqusName, setDisqusName] = useState(settings?.disqus_shortname || '');
  const [analyticsEnabled, setAnalyticsEnabled] = useState(settings?.analytics_enabled ?? true);

  const [layoutStyle, setLayoutStyle] = useState(settings?.layout_style || 'minimal');
  const [headerStyle, setHeaderStyle] = useState(settings?.header_style || 'sticky-slim');
  const [sidebarStyle, setSidebarStyle] = useState(settings?.sidebar_style || 'standard');
  const [leadCaptureStyle, setLeadCaptureStyle] = useState(settings?.lead_capture_style || 'newsletter');
  const [saProvince, setSaProvince] = useState(settings?.sa_province || '');
  const [saCity, setSaCity] = useState(settings?.sa_city || '');
  const [saArea, setSaArea] = useState(settings?.sa_area || '');

  const handleStatusChange = async (id: string, newStatus: 'approved' | 'spam' | 'rejected' | 'pending') => {
    const original = [...comments];
    setComments(comments.map(c => c.id === id ? { ...c, status: newStatus } : c));
    const res = await updateCommentStatus(id, newStatus);
    if (res.error) {
      toast.error(res.error);
      setComments(original);
    } else {
      toast.success(`Comment status updated to ${newStatus}`);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete comment?',
      description: 'Permanently delete this comment?',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        const original = [...comments];
        setComments(comments.filter(c => c.id !== id));
        const res = await deleteComment(id);
        if (res.error) {
          toast.error(res.error);
          setComments(original);
        } else {
          toast.success('Comment deleted successfully.');
        }
      }
    });
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    const res = await updateBlogSettings({
      comments_engine: engine,
      disqus_shortname: disqusName,
      analytics_enabled: analyticsEnabled,
      layout_style: layoutStyle,
      header_style: headerStyle,
      sidebar_style: sidebarStyle,
      lead_capture_style: leadCaptureStyle,
      sa_province: saProvince,
      sa_city: saCity,
      sa_area: saArea
    });
    setSavingSettings(false);
    if (res.error) toast.error(res.error);
    else {
      toast.success('Settings saved successfully.');
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    }
  };

  const filteredComments = comments.filter(c => c.status === activeTab);
  const tabCounts = TABS.reduce((acc, tab) => ({ ...acc, [tab]: comments.filter(c => c.status === tab).length }), {} as Record<string, number>);

  const selectClass = "w-full bg-white border border-dash-border rounded-xl px-4 py-3 text-xs sm:text-sm !text-dash-text focus:outline-none focus:border-dash-accent transition-colors motion-reduce:transition-none appearance-none cursor-pointer";
  const labelClass = "text-xs !text-dash-textMuted font-bold block";

  return (
    <div className="flex flex-col min-h-screen bg-white">

      {/* Page Header */}
      <div className="px-8 py-6 flex-shrink-0 bg-white border-b border-dash-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3.5 mb-1">
            <Link href="/blog/manage" className="p-2.5 rounded-xl bg-dash-surface hover:bg-dash-border/60 !text-dash-textMuted hover:!text-dash-text transition-colors motion-reduce:transition-none">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold !text-dash-text flex items-center gap-3">
              <ShieldCheck className="w-7 h-7 text-dash-accent shrink-0" />
              Comments <span className="text-dash-accent">&amp; moderation</span>
            </h1>
          </div>
          <p className="text-xs font-medium !text-dash-textMuted mt-1.5 ml-14">
            Review submissions &amp; configure workspace discussion preferences
          </p>
        </div>
        <DashButton asChild variant="secondary">
          <Link href="/blog/analytics">Analytics</Link>
        </DashButton>
      </div>

      {/* Body */}
      <div className="flex-1 p-8 sm:p-10 grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

        {/* LEFT — Moderation Queue */}
        <DashCard padding="none" className="xl:col-span-8 flex flex-col overflow-hidden" style={{ minHeight: '600px', maxHeight: 'calc(100vh - 180px)' }}>

          {/* Queue Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-5 border-b border-dash-border gap-4 shrink-0">
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-5 h-5 text-purple-600 shrink-0" />
              <h2 className="text-base font-bold !text-dash-text">Moderation queue</h2>
            </div>
            <div className="flex bg-dash-surface p-1 rounded-xl border border-dash-border">
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-lg transition-colors motion-reduce:transition-none capitalize",
                    activeTab === tab ? 'bg-white !text-dash-text shadow-sm' : '!text-dash-textMuted hover:!text-dash-text'
                  )}
                >
                  {tab}
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full",
                    tab === 'pending' ? 'bg-amber-100 text-amber-600 border border-amber-200' :
                    tab === 'approved' ? 'bg-green/10 text-green border border-green/20' :
                      'bg-red/10 text-red border border-red/20'
                  )}>
                    {tabCounts[tab]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Comment List */}
          <div className="flex-1 overflow-y-auto divide-y divide-dash-border">
            {filteredComments.length > 0 ? filteredComments.map(comment => (
              <div key={comment.id} className="px-6 py-6 hover:bg-dash-surface transition-colors motion-reduce:transition-none group">
                <div className="flex items-start justify-between gap-4">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl bg-dash-accent/10 border border-dash-accent/20 flex items-center justify-center shrink-0 text-sm font-bold text-dash-accent">
                    {comment.author_name.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Meta */}
                    <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                      <span className="text-sm font-bold !text-dash-text">{comment.author_name}</span>
                      {comment.author_email && (
                        <span className="text-xs !text-dash-textMuted">({comment.author_email})</span>
                      )}
                      <span className="w-px h-3 bg-dash-border" />
                      <span className="flex items-center gap-1 text-xs !text-dash-textMuted">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(comment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    {comment.post && (
                      <Link href={`/blog/${comment.post.slug}`} target="_blank" className="text-xs text-dash-accent/80 hover:text-dash-accent font-medium block mb-2">
                        On article: {comment.post.title}
                      </Link>
                    )}
                    <p className="text-sm !text-dash-textMuted leading-relaxed border-l-2 border-dash-border pl-4 py-0.5 mb-3">
                      {comment.content}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-4 flex-wrap">
                      {activeTab !== 'approved' && (
                        <button
                          onClick={() => handleStatusChange(comment.id, 'approved')}
                          className="flex items-center gap-1.5 text-xs font-bold text-green bg-green/10 hover:bg-green/20 px-3.5 py-1.5 rounded-lg transition-colors motion-reduce:transition-none"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </button>
                      )}
                      {activeTab !== 'spam' && (
                        <button
                          onClick={() => handleStatusChange(comment.id, 'spam')}
                          className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 px-3.5 py-1.5 rounded-lg transition-colors motion-reduce:transition-none"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" /> Spam
                        </button>
                      )}
                      {activeTab !== 'pending' && (
                        <button
                          onClick={() => handleStatusChange(comment.id, 'pending')}
                          className="flex items-center gap-1.5 text-xs font-bold text-dash-accent bg-dash-accent/10 hover:bg-dash-accent/20 px-3.5 py-1.5 rounded-lg transition-colors motion-reduce:transition-none"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Move to pending
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="flex items-center gap-1.5 text-xs font-bold text-red bg-red/10 hover:bg-red/20 px-3.5 py-1.5 rounded-lg transition-colors motion-reduce:transition-none ml-auto"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center h-full py-24 text-center px-6">
                <CheckCircle2 className="w-12 h-12 !text-dash-textMuted opacity-30 mb-4" />
                <p className="text-sm !text-dash-textMuted font-bold capitalize">No {activeTab} comments</p>
                <p className="text-xs !text-dash-textMuted opacity-70 mt-1.5">
                  {activeTab === 'pending' ? 'All caught up — no new submissions await review.' : `No comments in the ${activeTab} queue.`}
                </p>
              </div>
            )}
          </div>
        </DashCard>

        {/* RIGHT — Settings Panel */}
        <DashCard padding="none" className="xl:col-span-4 overflow-hidden">
          <div className="flex items-center gap-2.5 px-6 py-5 border-b border-dash-border">
            <Settings className="w-5 h-5 text-green shrink-0" />
            <h2 className="text-base font-bold !text-dash-text">Workspace config</h2>
          </div>

          <div className="p-6 space-y-6">

            {/* Engine selector */}
            <div className="space-y-2">
              <label className={labelClass}>Discussion engine</label>
              <select
                value={engine}
                onChange={(e) => setEngine(e.target.value)}
                className={selectClass}
              >
                <option value="none">Disabled (No Comments)</option>
                <option value="native">LeadsMind Native (Moderated)</option>
                <option value="disqus">Disqus Integration</option>
              </select>
            </div>

            {/* Disqus shortname */}
            {engine === 'disqus' && (
              <div className="space-y-2 animate-in fade-in duration-200 motion-reduce:animate-none">
                <label className={labelClass}>Disqus shortname</label>
                <input
                  type="text"
                  value={disqusName}
                  onChange={(e) => setDisqusName(e.target.value)}
                  placeholder="your-shortname"
                  className={selectClass}
                />
                <p className="text-xs text-amber-600 leading-relaxed">
                  Note: Moderation of Disqus comments occurs directly inside the Disqus publisher portal.
                </p>
              </div>
            )}

            {/* Layout Configuration */}
            <div className="pt-4 border-t border-dash-border space-y-4">
              <p className={labelClass}>Default layout config</p>

              <div className="space-y-2.5">
                <label className={cn(labelClass, "text-[10px]")}>Default blog layout</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'magazine', label: 'Magazine', desc: 'Bold multi-column grid' },
                    { id: 'minimal', label: 'Minimal Clean', desc: 'Centered typography' },
                    { id: 'editorial', label: 'Editorial', desc: 'Newspaper columns' },
                    { id: 'knowledge', label: 'Knowledge Hub', desc: 'Left category nav menu' },
                    { id: 'video', label: 'Video-First', desc: 'Top media player hero' },
                    { id: 'newsletter', label: 'Newsletter', desc: 'Dashed borders digest' }
                  ].map((opt) => {
                    const isSelected = layoutStyle === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setLayoutStyle(opt.id)}
                        className={cn(
                          "flex flex-col text-left rounded-xl border p-2 transition-colors motion-reduce:transition-none focus:outline-none relative group",
                          isSelected
                            ? 'bg-dash-accent/10 border-dash-accent'
                            : 'bg-dash-surface border-dash-border hover:border-dash-text/20'
                        )}
                      >
                        {/*
                          Thumbnail swatches below intentionally kept dark —
                          they preview the actual public blog page's layout
                          templates (a separate, out-of-scope surface from
                          this dashboard), not dashboard chrome.
                        */}
                        <div className="w-full h-11 mb-1.5 rounded overflow-hidden select-none">
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

              <div className="space-y-2">
                <label className={cn(labelClass, "text-[10px]")}>Default header style</label>
                <select
                  value={headerStyle}
                  onChange={(e) => setHeaderStyle(e.target.value)}
                  className={cn(selectClass, "py-2.5")}
                >
                  <option value="sticky-slim">Sticky Slim Navbar</option>
                  <option value="transparent-hero">Transparent Hero Overlay</option>
                  <option value="category-bar">Full-Width Category Bar</option>
                  <option value="centred-classic">Centred Classic</option>
                  <option value="split-banner">Split Banner</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className={cn(labelClass, "text-[10px]")}>Default sidebar style</label>
                <select
                  value={sidebarStyle}
                  onChange={(e) => setSidebarStyle(e.target.value)}
                  className={cn(selectClass, "py-2.5")}
                >
                  <option value="standard">Standard (Bio + Share + Form)</option>
                  <option value="compact">Compact</option>
                  <option value="sticky-toc">Sticky TOC</option>
                  <option value="lead-gen">Lead Gen (Highlighted Form)</option>
                  <option value="floating-share">Floating Share Icons Only</option>
                  <option value="none">None (Centred Column)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className={cn(labelClass, "text-[10px]")}>Default lead capture</label>
                <select
                  value={leadCaptureStyle}
                  onChange={(e) => setLeadCaptureStyle(e.target.value)}
                  className={cn(selectClass, "py-2.5")}
                >
                  <option value="newsletter">Newsletter Form (Standard)</option>
                  <option value="exit-intent">Exit-Intent Modal</option>
                  <option value="inline">Inline Capture Box</option>
                  <option value="none">None</option>
                </select>
              </div>

              {/* SA SEO Defaults */}
              <div className="space-y-3 pt-2">
                <p className="text-[10px] text-amber-600 font-bold">South African local SEO defaults</p>
                <div className="space-y-1.5">
                  <label className={cn(labelClass, "text-[9px]")}>Default province</label>
                  <select
                    value={saProvince}
                    onChange={(e) => setSaProvince(e.target.value)}
                    className={cn(selectClass, "py-2 focus:border-amber-500")}
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
                  <label className={cn(labelClass, "text-[9px]")}>Default city</label>
                  <input
                    type="text"
                    value={saCity}
                    placeholder="e.g. Johannesburg"
                    onChange={(e) => setSaCity(e.target.value)}
                    className={cn(selectClass, "py-2 focus:border-amber-500")}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className={cn(labelClass, "text-[9px]")}>Default suburb / area</label>
                  <input
                    type="text"
                    value={saArea}
                    placeholder="e.g. Sandton"
                    onChange={(e) => setSaArea(e.target.value)}
                    className={cn(selectClass, "py-2 focus:border-amber-500")}
                  />
                </div>
              </div>
            </div>

            {/* Analytics toggle */}
            <div className="pt-4 border-t border-dash-border space-y-4">
              <p className={labelClass}>Tracking preferences</p>
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative shrink-0 mt-0.5">
                  <input type="checkbox" className="sr-only" checked={analyticsEnabled} onChange={e => setAnalyticsEnabled(e.target.checked)} />
                  <div className={cn("w-9 h-5 rounded-full transition-colors motion-reduce:transition-none", analyticsEnabled ? 'bg-dash-accent' : 'bg-dash-border')} />
                  <div className={cn("absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full shadow transition-transform motion-reduce:transition-none", analyticsEnabled ? 'translate-x-4' : 'translate-x-0')} />
                </div>
                <div>
                  <span className="text-sm font-bold !text-dash-text group-hover:text-dash-accent transition-colors motion-reduce:transition-none block">Analytics tracking</span>
                  <span className="text-xs !text-dash-textMuted leading-relaxed block mt-0.5">Track anonymous impressions, reading time &amp; scroll depth</span>
                </div>
              </label>
            </div>

            {/* Save */}
            <button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className={cn(
                "w-full py-3.5 rounded-xl text-xs sm:text-sm font-bold transition-colors motion-reduce:transition-none flex items-center justify-center gap-2 disabled:opacity-50",
                settingsSaved
                  ? 'bg-green/10 text-green border border-green/30'
                  : 'bg-dash-accent hover:bg-dash-accent/90 text-white'
              )}
            >
              {settingsSaved ? (
                <><CheckCircle2 className="w-4 h-4" /> Saved successfully</>
              ) : (
                <><Save className="w-4 h-4" /> {savingSettings ? 'Saving...' : 'Save configuration'}</>
              )}
            </button>

            {/* Quick Stats */}
            <div className="pt-4 border-t border-dash-border grid grid-cols-3 gap-3">
              {TABS.map(tab => (
                <div
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "text-center p-3 rounded-xl border cursor-pointer transition-colors motion-reduce:transition-none",
                    activeTab === tab ? 'bg-dash-surface border-dash-text/15' : 'bg-white border-dash-border hover:border-dash-text/20'
                  )}
                >
                  <div className={cn(
                    "text-xl font-bold",
                    tab === 'pending' ? 'text-amber-600' :
                    tab === 'approved' ? 'text-green' : 'text-red'
                  )}>{tabCounts[tab]}</div>
                  <div className="text-[10px] !text-dash-textMuted font-bold capitalize mt-1">{tab}</div>
                </div>
              ))}
            </div>

          </div>
        </DashCard>

      </div>

      {confirmConfig && (
        <ConfirmDialog
          isOpen={confirmConfig.isOpen}
          onClose={() => setConfirmConfig(prev => prev ? { ...prev, isOpen: false } : null)}
          onConfirm={confirmConfig.onConfirm}
          title={confirmConfig.title}
          description={confirmConfig.description}
          confirmLabel={confirmConfig.confirmLabel}
          variant="danger"
        />
      )}
    </div>
  );
}
