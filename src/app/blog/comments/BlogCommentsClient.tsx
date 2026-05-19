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
    const res = await updateBlogSettings({ comments_engine: engine, disqus_shortname: disqusName, analytics_enabled: analyticsEnabled });
    setSavingSettings(false);
    if (res.error) alert(res.error);
    else { setSettingsSaved(true); setTimeout(() => setSettingsSaved(false), 3000); }
  };

  const filteredComments = comments.filter(c => c.status === activeTab);
  const tabCounts = TABS.reduce((acc, tab) => ({ ...acc, [tab]: comments.filter(c => c.status === tab).length }), {} as Record<string, number>);

  return (
    <div className="flex flex-col min-h-screen bg-[var(--n900)]">

      {/* Page Header */}
      <div className="page-header px-6 py-5 flex-shrink-0 bg-[var(--n900)] border-b border-white/5">
        <div className="ph-left">
          <div className="flex items-center gap-2 mb-0.5">
            <Link href="/blog/manage" className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition">
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
            <h1 className="text-2xl font-black font-space-grotesk text-white uppercase tracking-tight flex items-center gap-2.5">
              <ShieldCheck className="w-6 h-6 text-primary shrink-0" />
              Comments <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-violet-400">&amp; Moderation</span>
            </h1>
          </div>
          <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-semibold mt-1 ml-10">
            Review submissions &amp; configure workspace discussion preferences
          </p>
        </div>
        <div className="ph-right">
          <Link href="/blog/analytics" className="btn-outline !h-9 !px-4 text-[10px] font-bold uppercase tracking-widest gap-1.5">
            Analytics
          </Link>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">

        {/* LEFT — Moderation Queue */}
        <div className="xl:col-span-8 bg-[#080f28] rounded-xl shadow-xl flex flex-col" style={{ minHeight: '600px', maxHeight: 'calc(100vh - 180px)' }}>

          {/* Queue Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-purple-400 shrink-0" />
              <h2 className="text-sm font-bold text-white">Moderation Queue</h2>
            </div>
            <div className="flex bg-[#04091a] p-0.5 rounded-lg border border-white/5">
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-md transition-all capitalize ${activeTab === tab ? 'bg-white/10 text-white shadow' : 'text-white/40 hover:text-white/70'
                    }`}
                >
                  {tab}
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${tab === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                    tab === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                      'bg-rose-500/20 text-rose-400'
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
              <div key={comment.id} className="px-5 py-4 hover:bg-white/[0.015] transition group">
                <div className="flex items-start justify-between gap-3">
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/20 flex items-center justify-center shrink-0 text-xs font-black text-primary mt-0.5">
                    {comment.author_name.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Meta */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-bold text-white">{comment.author_name}</span>
                      {comment.author_email && (
                        <span className="text-[9px] text-white/30">({comment.author_email})</span>
                      )}
                      <span className="w-px h-3 bg-white/10" />
                      <span className="flex items-center gap-0.5 text-[9px] text-white/30">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(comment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    {comment.post && (
                      <Link href={`/blog/${comment.post.slug}`} target="_blank" className="text-[9px] text-primary hover:underline block mb-1.5">
                        On: {comment.post.title}
                      </Link>
                    )}
                    <p className="text-[11px] text-white/65 leading-relaxed border-l-2 border-white/10 pl-3">
                      {comment.content}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                      {activeTab !== 'approved' && (
                        <button
                          onClick={() => handleStatusChange(comment.id, 'approved')}
                          className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-md transition"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Approve
                        </button>
                      )}
                      {activeTab !== 'spam' && (
                        <button
                          onClick={() => handleStatusChange(comment.id, 'spam')}
                          className="flex items-center gap-1 text-[9px] font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-md transition"
                        >
                          <ShieldAlert className="w-3 h-3" /> Spam
                        </button>
                      )}
                      {activeTab !== 'pending' && (
                        <button
                          onClick={() => handleStatusChange(comment.id, 'pending')}
                          className="flex items-center gap-1 text-[9px] font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1 rounded-md transition"
                        >
                          <XCircle className="w-3 h-3" /> Move to Pending
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="flex items-center gap-1 text-[9px] font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1 rounded-md transition ml-auto"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center h-full py-20 text-center px-6">
                <CheckCircle2 className="w-10 h-10 text-white/10 mb-3" />
                <p className="text-xs text-white/30 font-medium capitalize">No {activeTab} comments</p>
                <p className="text-[10px] text-white/20 mt-1">
                  {activeTab === 'pending' ? 'All caught up — no new submissions await review.' : `No comments in the ${activeTab} queue.`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Settings Panel */}
        <div className="xl:col-span-4 bg-[#080f28] rounded-xl shadow-xl">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/5">
            <Settings className="w-4 h-4 text-emerald-400 shrink-0" />
            <h2 className="text-sm font-bold text-white">Workspace Config</h2>
          </div>

          <div className="p-5 space-y-5">

            {/* Engine selector */}
            <div className="space-y-1.5">
              <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest block">Discussion Engine</label>
              <select
                value={engine}
                onChange={(e) => setEngine(e.target.value)}
                className="w-full bg-[#04091a] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50 transition appearance-none cursor-pointer"
              >
                <option value="none">Disabled (No Comments)</option>
                <option value="native">LeadsMind Native (Moderated)</option>
                <option value="disqus">Disqus Integration</option>
              </select>
            </div>

            {/* Disqus shortname */}
            {engine === 'disqus' && (
              <div className="space-y-1.5">
                <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest block">Disqus Shortname</label>
                <input
                  type="text"
                  value={disqusName}
                  onChange={(e) => setDisqusName(e.target.value)}
                  placeholder="your-shortname"
                  className="w-full bg-[#04091a] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50 transition placeholder-white/20"
                />
                <p className="text-[9px] text-amber-400/70">Moderation occurs inside the Disqus portal.</p>
              </div>
            )}

            {/* Analytics toggle */}
            <div className="pt-2 border-t border-white/5 space-y-3">
              <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest">Tracking Preferences</p>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative shrink-0">
                  <input type="checkbox" className="sr-only" checked={analyticsEnabled} onChange={e => setAnalyticsEnabled(e.target.checked)} />
                  <div className={`w-9 h-5 rounded-full transition-colors ${analyticsEnabled ? 'bg-primary' : 'bg-white/10'}`} />
                  <div className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full shadow transition-transform ${analyticsEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
                <div>
                  <span className="text-xs font-bold text-white group-hover:text-primary transition block">Analytics Tracking</span>
                  <span className="text-[9px] text-white/35 leading-snug">Track anonymous impressions, reading time &amp; scroll depth</span>
                </div>
              </label>
            </div>

            {/* Save */}
            <button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${settingsSaved
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-primary hover:bg-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                } disabled:opacity-50`}
            >
              {settingsSaved ? (
                <><CheckCircle2 className="w-3.5 h-3.5" /> Saved Successfully</>
              ) : (
                <><Save className="w-3.5 h-3.5" /> {savingSettings ? 'Saving...' : 'Save Configuration'}</>
              )}
            </button>

            {/* Quick Stats */}
            <div className="pt-3 border-t border-white/5 grid grid-cols-3 gap-2">
              {TABS.map(tab => (
                <div
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-center p-2.5 rounded-lg border cursor-pointer transition ${activeTab === tab ? 'bg-white/5 border-white/15' : 'bg-[#04091a] border-white/5 hover:border-white/10'
                    }`}
                >
                  <div className={`text-lg font-black font-space-grotesk ${tab === 'pending' ? 'text-amber-400' :
                    tab === 'approved' ? 'text-emerald-400' : 'text-rose-400'
                    }`}>{tabCounts[tab]}</div>
                  <div className="text-[8px] text-white/30 uppercase tracking-widest font-bold capitalize mt-0.5">{tab}</div>
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
