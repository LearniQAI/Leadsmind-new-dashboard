'use client';

import React, { useState } from 'react';
import { MessageSquare, Settings, ShieldCheck, ShieldAlert, Trash2, CheckCircle2, Save, XCircle, ArrowLeft, Clock } from 'lucide-react';
import { updateCommentStatus, deleteComment, updateBlogSettings } from '@/app/actions/blogCommentsAdmin';
import Link from 'next/link';

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
      alert(res.error);
      setComments(original);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Permanently delete this comment?')) return;
    const original = [...comments];
    setComments(comments.filter(c => c.id !== id));
    const res = await deleteComment(id);
    if (res.error) {
      alert(res.error);
      setComments(original);
    }
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
    if (res.error) alert(res.error);
    else { setSettingsSaved(true); setTimeout(() => setSettingsSaved(false), 3000); }
  };

  const filteredComments = comments.filter(c => c.status === activeTab);
  const tabCounts = TABS.reduce((acc, tab) => ({ ...acc, [tab]: comments.filter(c => c.status === tab).length }), {} as Record<string, number>);

  return (
    <div className="flex flex-col min-h-screen bg-[var(--n900)]">

      {/* Page Header */}
      <div className="page-header px-8 py-6 flex-shrink-0 bg-[var(--n900)] border-b border-white/5">
        <div className="ph-left">
          <div className="flex items-center gap-3.5 mb-1">
            <Link href="/blog/manage" className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all duration-200">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-space-grotesk text-white uppercase tracking-tight flex items-center gap-3">
              <ShieldCheck className="w-7 h-7 text-primary shrink-0" />
              Comments <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-violet-400">&amp; Moderation</span>
            </h1>
          </div>
          <p className="text-xs font-medium text-white/50 tracking-wide mt-1.5 ml-14">
            Review submissions &amp; configure workspace discussion preferences
          </p>
        </div>
        <div className="ph-right">
          <Link href="/blog/analytics" className="btn-outline !h-10 !px-5 text-xs font-bold uppercase tracking-widest gap-2 rounded-xl">
            Analytics
          </Link>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-8 sm:p-10 grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

        {/* LEFT — Moderation Queue */}
        <div className="xl:col-span-8 bg-[#080f28] border border-white/5 rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ minHeight: '600px', maxHeight: 'calc(100vh - 180px)' }}>

          {/* Queue Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-5 border-b border-white/5 gap-4 shrink-0">
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-5 h-5 text-purple-400 shrink-0" />
              <h2 className="text-base font-bold text-white tracking-wide">Moderation Queue</h2>
            </div>
            <div className="flex bg-[#04091a] p-1 rounded-xl border border-white/10">
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-lg transition-all capitalize ${activeTab === tab ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white/70'
                    }`}
                >
                  {tab}
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${tab === 'pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' :
                    tab === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' :
                      'bg-rose-500/20 text-rose-400 border border-rose-500/20'
                    }`}>
                    {tabCounts[tab]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Comment List */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
            {filteredComments.length > 0 ? filteredComments.map(comment => (
              <div key={comment.id} className="px-6 py-6 hover:bg-white/[0.015] transition-all duration-200 group">
                <div className="flex items-start justify-between gap-4">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                    {comment.author_name.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Meta */}
                    <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                      <span className="text-sm font-bold text-white">{comment.author_name}</span>
                      {comment.author_email && (
                        <span className="text-xs text-white/40">({comment.author_email})</span>
                      )}
                      <span className="w-px h-3 bg-white/10" />
                      <span className="flex items-center gap-1 text-xs text-white/40">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(comment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    {comment.post && (
                      <Link href={`/blog/${comment.post.slug}`} target="_blank" className="text-xs text-primary/80 hover:text-primary font-medium block mb-2">
                        On article: {comment.post.title}
                      </Link>
                    )}
                    <p className="text-sm text-white/70 leading-relaxed border-l-2 border-white/10 pl-4 py-0.5 mb-3">
                      {comment.content}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-4 flex-wrap">
                      {activeTab !== 'approved' && (
                        <button
                          onClick={() => handleStatusChange(comment.id, 'approved')}
                          className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-3.5 py-1.5 rounded-lg transition"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </button>
                      )}
                      {activeTab !== 'spam' && (
                        <button
                          onClick={() => handleStatusChange(comment.id, 'spam')}
                          className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-3.5 py-1.5 rounded-lg transition"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" /> Spam
                        </button>
                      )}
                      {activeTab !== 'pending' && (
                        <button
                          onClick={() => handleStatusChange(comment.id, 'pending')}
                          className="flex items-center gap-1.5 text-xs font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-3.5 py-1.5 rounded-lg transition"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Move to Pending
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="flex items-center gap-1.5 text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 px-3.5 py-1.5 rounded-lg transition ml-auto"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center h-full py-24 text-center px-6">
                <CheckCircle2 className="w-12 h-12 text-white/10 mb-4 animate-pulse" />
                <p className="text-sm text-white/40 font-bold uppercase tracking-wider capitalize">No {activeTab} comments</p>
                <p className="text-xs text-white/20 mt-1.5">
                  {activeTab === 'pending' ? 'All caught up — no new submissions await review.' : `No comments in the ${activeTab} queue.`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Settings Panel */}
        <div className="xl:col-span-4 bg-[#080f28] border border-white/5 rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center gap-2.5 px-6 py-5 border-b border-white/5">
            <Settings className="w-5 h-5 text-emerald-400 shrink-0" />
            <h2 className="text-base font-bold text-white tracking-wide">Workspace Config</h2>
          </div>

          <div className="p-6 space-y-6">

            {/* Engine selector */}
            <div className="space-y-2">
              <label className="text-xs text-white/50 font-bold uppercase tracking-wider block">Discussion Engine</label>
              <select
                value={engine}
                onChange={(e) => setEngine(e.target.value)}
                className="w-full bg-[#04091a] border border-white/10 rounded-xl px-4 py-3 text-xs sm:text-sm text-white focus:outline-none focus:border-primary/50 transition appearance-none cursor-pointer"
              >
                <option value="none">Disabled (No Comments)</option>
                <option value="native">LeadsMind Native (Moderated)</option>
                <option value="disqus">Disqus Integration</option>
              </select>
            </div>

            {/* Disqus shortname */}
            {engine === 'disqus' && (
              <div className="space-y-2 animate-fade-in">
                <label className="text-xs text-white/50 font-bold uppercase tracking-wider block">Disqus Shortname</label>
                <input
                  type="text"
                  value={disqusName}
                  onChange={(e) => setDisqusName(e.target.value)}
                  placeholder="your-shortname"
                  className="w-full bg-[#04091a] border border-white/10 rounded-xl px-4 py-3 text-xs sm:text-sm text-white focus:outline-none focus:border-primary/50 transition placeholder-white/20"
                />
                <p className="text-xs text-amber-400/80 leading-relaxed">
                  Note: Moderation of Disqus comments occurs directly inside the Disqus publisher portal.
                </p>
              </div>
            )}

            {/* Layout Configuration */}
            <div className="pt-4 border-t border-white/5 space-y-4">
              <p className="text-xs text-white/50 font-bold uppercase tracking-wider">Default Layout Config</p>
              
              <div className="space-y-2.5">
                <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider block">Default Blog Layout</label>
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
                        className={`flex flex-col text-left rounded-xl border p-2 transition-all duration-200 focus:outline-none relative group ${
                          isSelected
                            ? 'bg-primary/10 border-primary shadow-[0_0_12px_rgba(59,130,246,0.15)]'
                            : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.08]'
                        }`}
                      >
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

              <div className="space-y-2">
                <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider block">Default Header Style</label>
                <select
                  value={headerStyle}
                  onChange={(e) => setHeaderStyle(e.target.value)}
                  className="w-full bg-[#04091a] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50 transition appearance-none cursor-pointer"
                >
                  <option value="sticky-slim">Sticky Slim Navbar</option>
                  <option value="transparent-hero">Transparent Hero Overlay</option>
                  <option value="category-bar">Full-Width Category Bar</option>
                  <option value="centred-classic">Centred Classic</option>
                  <option value="split-banner">Split Banner</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider block">Default Sidebar Style</label>
                <select
                  value={sidebarStyle}
                  onChange={(e) => setSidebarStyle(e.target.value)}
                  className="w-full bg-[#04091a] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50 transition appearance-none cursor-pointer"
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
                <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider block">Default Lead Capture</label>
                <select
                  value={leadCaptureStyle}
                  onChange={(e) => setLeadCaptureStyle(e.target.value)}
                  className="w-full bg-[#04091a] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50 transition appearance-none cursor-pointer"
                >
                  <option value="newsletter">Newsletter Form (Standard)</option>
                  <option value="exit-intent">Exit-Intent Modal</option>
                  <option value="inline">Inline Capture Box</option>
                  <option value="none">None</option>
                </select>
              </div>

              {/* SA SEO Defaults */}
              <div className="space-y-3 pt-2">
                <p className="text-[10px] text-[#fbbf24] font-bold uppercase tracking-wider">South African Local SEO defaults</p>
                <div className="space-y-1.5">
                  <label className="text-[9px] text-white/40 font-bold uppercase tracking-wider block">Default Province</label>
                  <select
                    value={saProvince}
                    onChange={(e) => setSaProvince(e.target.value)}
                    className="w-full bg-[#04091a] border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#fbbf24] transition appearance-none cursor-pointer"
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
                  <label className="text-[9px] text-white/40 font-bold uppercase tracking-wider block">Default City</label>
                  <input
                    type="text"
                    value={saCity}
                    placeholder="e.g. Johannesburg"
                    onChange={(e) => setSaCity(e.target.value)}
                    className="w-full bg-[#04091a] border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#fbbf24] transition placeholder-white/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] text-white/40 font-bold uppercase tracking-wider block">Default Suburb / Area</label>
                  <input
                    type="text"
                    value={saArea}
                    placeholder="e.g. Sandton"
                    onChange={(e) => setSaArea(e.target.value)}
                    className="w-full bg-[#04091a] border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#fbbf24] transition placeholder-white/20"
                  />
                </div>
              </div>
            </div>

            {/* Analytics toggle */}
            <div className="pt-4 border-t border-white/5 space-y-4">
              <p className="text-xs text-white/50 font-bold uppercase tracking-wider">Tracking Preferences</p>
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative shrink-0 mt-0.5">
                  <input type="checkbox" className="sr-only" checked={analyticsEnabled} onChange={e => setAnalyticsEnabled(e.target.checked)} />
                  <div className={`w-9 h-5 rounded-full transition-colors ${analyticsEnabled ? 'bg-primary' : 'bg-white/10'}`} />
                  <div className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full shadow transition-transform ${analyticsEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
                <div>
                  <span className="text-sm font-bold text-white group-hover:text-primary transition block">Analytics Tracking</span>
                  <span className="text-xs text-white/40 leading-relaxed block mt-0.5">Track anonymous impressions, reading time &amp; scroll depth</span>
                </div>
              </label>
            </div>

            {/* Save */}
            <button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className={`w-full py-3.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 ${settingsSaved
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-primary hover:bg-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                } disabled:opacity-50`}
            >
              {settingsSaved ? (
                <><CheckCircle2 className="w-4 h-4" /> Saved Successfully</>
              ) : (
                <><Save className="w-4 h-4" /> {savingSettings ? 'Saving...' : 'Save Configuration'}</>
              )}
            </button>

            {/* Quick Stats */}
            <div className="pt-4 border-t border-white/5 grid grid-cols-3 gap-3">
              {TABS.map(tab => (
                <div
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-center p-3 rounded-xl border cursor-pointer transition ${activeTab === tab ? 'bg-white/5 border-white/15' : 'bg-[#04091a] border-white/5 hover:border-white/10'
                    }`}
                >
                  <div className={`text-xl font-extrabold font-space-grotesk ${tab === 'pending' ? 'text-amber-400' :
                    tab === 'approved' ? 'text-emerald-400' : 'text-rose-400'
                    }`}>{tabCounts[tab]}</div>
                  <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold capitalize mt-1">{tab}</div>
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
