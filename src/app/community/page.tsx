'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MessageSquare, Send, Plus,
  HelpCircle, Megaphone, ShieldCheck, Sparkles,
  BookMarked, ChevronRight, X, Loader2, Search, Clock, ArrowRight, LifeBuoy, Bot
} from 'lucide-react';
import { createForumPost, getForumPosts, getPostDetails, addCommentToPost } from '@/app/actions/forum';

// `id` is persisted to forum_posts.board (DB CHECK constraint) — do not change.
const BOARDS = [
  { id: 'Ask a Question', icon: HelpCircle, desc: 'Technical and setup questions' },
  { id: 'Show and Tell Showcase', icon: Sparkles, desc: "Show what you've built" },
  { id: 'SA Business Tax & Continuity Strategy', icon: ShieldCheck, desc: 'Tax and compliance for South African businesses' },
  { id: 'Feature Request Voting', icon: Megaphone, desc: 'Suggest and vote on new features' },
  { id: 'Verified Automation Recipes', icon: BookMarked, desc: 'Proven automation setups' }
];

export default function PublicCommunityPage() {
  const [activeBoard, setActiveBoard] = useState('Ask a Question');
  const [posts, setPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [postDetails, setPostDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [visitorCommentName, setVisitorCommentName] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [visitorPostName, setVisitorPostName] = useState('');
  const [submittingPost, setSubmittingPost] = useState(false);

  const fetchPosts = async () => {
    setLoadingPosts(true);
    try {
      const res = await getForumPosts(activeBoard);
      if (res.data) setPosts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPosts(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [activeBoard]);

  const fetchPostDetails = async (id: string) => {
    setLoadingDetails(true);
    try {
      const res = await getPostDetails(id);
      if (res.data) setPostDetails(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (selectedPostId) {
      fetchPostDetails(selectedPostId);
    } else {
      setPostDetails(null);
    }
  }, [selectedPostId]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostTitle.trim() || !newPostContent.trim()) return;

    setSubmittingPost(true);
    try {
      const res = await createForumPost(
        activeBoard,
        newPostTitle,
        newPostContent,
        visitorPostName || 'Anonymous Client'
      );
      if (res.success) {
        setNewPostTitle('');
        setNewPostContent('');
        setVisitorPostName('');
        setIsCreatingPost(false);
        await fetchPosts();
        if (res.post?.id) {
          setSelectedPostId(res.post.id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedPostId) return;

    setSubmittingComment(true);
    try {
      const res = await addCommentToPost(
        selectedPostId,
        newComment,
        visitorCommentName || 'Anonymous Client'
      );
      if (res.success) {
        setNewComment('');
        await fetchPostDetails(selectedPostId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const filteredPosts = posts.filter(post => {
    const q = searchQuery.toLowerCase();
    return (
      post.title?.toLowerCase().includes(q) ||
      post.content?.toLowerCase().includes(q) ||
      post.author_name?.toLowerCase().includes(q)
    );
  });

  const initials = (name?: string) =>
    (name || 'M').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join('') || 'M';

  const inputCls =
    'h-10 w-full rounded-lg border border-dash-border bg-white px-3 text-[13px] text-dash-text placeholder:text-dash-textMuted outline-none transition-colors focus:border-sky-500 focus:ring-4 focus:ring-sky-500/12';

  return (
    <div className="min-h-screen bg-dash-surface text-dash-text">

      {/* Public header */}
      <header className="sticky top-0 z-[1000] border-b border-dash-border bg-white/90 px-4 py-3 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-[13px] font-bold text-white">
              LM
            </div>
            <span className="text-[14px] font-semibold tracking-tight text-dash-text">
              LeadsMind <span className="text-sky-600">Community</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/articles"
              className="inline-flex items-center gap-1.5 rounded-lg border border-dash-border bg-white px-3 py-2 text-[12px] font-semibold text-dash-textMuted transition-colors hover:text-dash-text [&_svg]:size-3.5"
            >
              <LifeBuoy /> Help center
            </Link>
            <Link
              href="/community/forums"
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3.5 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-sky-600 [&_svg]:size-3.5"
            >
              Open dashboard <ArrowRight />
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:px-8">

        {/* Page header */}
        <div className="flex flex-col gap-4 border-b border-dash-border pb-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-600">
              <span className="h-1 w-1 rounded-full bg-sky-500" />
              Community
            </div>
            <h1 className="font-display text-[26px] font-semibold leading-tight tracking-[-0.02em] text-dash-text md:text-[30px]">
              Community Forums
            </h1>
            <p className="max-w-2xl text-[13px] leading-relaxed text-dash-textMuted">
              Ask questions, share what you&rsquo;ve built, and get help from other members.
            </p>
          </div>

          <button
            onClick={() => setIsCreatingPost(true)}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-sky-500 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-sky-600 [&_svg]:size-4"
          >
            <Plus /> New discussion
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

          {/* Channel switcher */}
          <nav className="lg:col-span-4 lg:sticky lg:top-20 lg:self-start">
            <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-dash-textMuted/70">
              Channels
            </div>
            <div className="space-y-0.5">
              {BOARDS.map((board) => {
                const Icon = board.icon;
                const isActive = activeBoard === board.id;
                return (
                  <button
                    key={board.id}
                    onClick={() => {
                      setActiveBoard(board.id);
                      setSelectedPostId(null);
                    }}
                    className={`group flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors outline-none focus-visible:ring-4 focus-visible:ring-sky-500/20 ${
                      isActive ? 'bg-sky-50 ring-1 ring-inset ring-sky-500/20' : 'hover:bg-white'
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors [&_svg]:size-4 ${
                        isActive
                          ? 'border-sky-200 bg-white text-sky-600'
                          : 'border-dash-border bg-white text-dash-textMuted group-hover:text-dash-text'
                      }`}
                    >
                      <Icon />
                    </span>
                    <span className="min-w-0 flex-1 space-y-0.5">
                      <span className={`block text-[13px] font-semibold ${isActive ? 'text-sky-700' : 'text-dash-text'}`}>
                        {board.id}
                      </span>
                      <span className="block text-[12px] leading-relaxed text-dash-textMuted">
                        {board.desc}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Thread list */}
          <div className="space-y-4 lg:col-span-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-dash-textMuted" />
                <input
                  type="text"
                  placeholder="Search discussions…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={inputCls + ' pl-9'}
                />
              </div>
              <span className="shrink-0 text-[12px] font-medium text-dash-textMuted">
                {filteredPosts.length} {filteredPosts.length === 1 ? 'discussion' : 'discussions'}
              </span>
            </div>

            {loadingPosts ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dash-border bg-white py-20">
                <Loader2 className="size-6 animate-spin text-sky-500 motion-reduce:animate-none" />
                <span className="text-[12px] font-medium text-dash-textMuted">Loading discussions…</span>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-dash-border bg-white px-6 py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-dash-border bg-white text-dash-textMuted [&_svg]:size-5">
                  <MessageSquare />
                </div>
                <h4 className="mt-4 text-[14px] font-semibold text-dash-text">No discussions yet</h4>
                <p className="mt-1 max-w-sm text-[12px] leading-relaxed text-dash-textMuted">
                  Be the first to start a discussion in this channel.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPosts.map((post) => (
                  <button
                    key={post.id}
                    onClick={() => setSelectedPostId(post.id)}
                    className="group block w-full rounded-2xl border border-dash-border bg-white p-5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04),0_1px_3px_rgba(15,23,42,0.03)] transition-colors hover:border-slate-300"
                  >
                    <div className="mb-3 flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-[11px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-500/15">
                        {initials(post.author_name)}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-[12px] font-semibold text-dash-text">{post.author_name || 'Member'}</div>
                        <div className="flex items-center gap-1 text-[11px] text-dash-textMuted">
                          <Clock className="size-3" />
                          {new Date(post.created_at).toLocaleDateString('en-ZA', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </div>
                      </div>
                      <span className="ml-auto shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-500/20">
                        {post.board}
                      </span>
                    </div>
                    <h3 className="text-[14px] font-semibold leading-snug text-dash-text">{post.title}</h3>
                    <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-dash-textMuted">{post.content}</p>
                    <div className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-sky-600">
                      View discussion
                      <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create discussion modal */}
      {isCreatingPost && (
        <div className="fixed inset-0 z-[2050] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-dash-border bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-dash-border px-6 py-4">
              <h4 className="text-[15px] font-semibold text-dash-text">Start a discussion</h4>
              <button
                onClick={() => setIsCreatingPost(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-dash-textMuted transition-colors hover:bg-dash-surface hover:text-dash-text"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4 px-6 py-6">
              <div className="space-y-1.5">
                <label className="block text-[12px] font-semibold text-dash-text">Channel</label>
                <div className="relative">
                  <select
                    value={activeBoard}
                    onChange={(e) => setActiveBoard(e.target.value)}
                    className="h-10 w-full appearance-none rounded-lg border border-dash-border bg-white px-3 pr-9 text-[13px] text-dash-text outline-none transition-colors focus:border-sky-500 focus:ring-4 focus:ring-sky-500/12"
                  >
                    {BOARDS.map((b) => (
                      <option key={b.id} value={b.id}>{b.id}</option>
                    ))}
                  </select>
                  <ChevronRight className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 rotate-90 text-dash-textMuted" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[12px] font-semibold text-dash-text">Your name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={visitorPostName}
                  onChange={(e) => setVisitorPostName(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[12px] font-semibold text-dash-text">Title</label>
                <input
                  type="text"
                  required
                  placeholder="What's your question or topic?"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[12px] font-semibold text-dash-text">Details</label>
                <textarea
                  required
                  rows={5}
                  placeholder="Add any details that will help others understand and respond. If a help center article matches, an automated answer will be posted."
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  className="w-full rounded-lg border border-dash-border bg-white px-3 py-2.5 text-[13px] leading-relaxed text-dash-text placeholder:text-dash-textMuted outline-none transition-colors focus:border-sky-500 focus:ring-4 focus:ring-sky-500/12"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreatingPost(false)}
                  className="inline-flex h-10 items-center rounded-lg border border-dash-border bg-white px-4 text-[13px] font-semibold text-dash-text transition-colors hover:bg-dash-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPost}
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-sky-500 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-sky-600 disabled:opacity-60 [&_svg]:size-4"
                >
                  {submittingPost && <Loader2 className="animate-spin" />}
                  Post discussion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Thread detail drawer */}
      {selectedPostId && postDetails && (
        <div className="fixed inset-0 z-[2000] flex justify-end bg-slate-900/40 backdrop-blur-sm">
          <div className="flex h-full w-full max-w-xl flex-col border-l border-dash-border bg-white shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-dash-border px-6 py-4">
              <div className="min-w-0 space-y-1">
                <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-500/20">
                  {postDetails.post.board}
                </span>
                <h4 className="truncate text-[15px] font-semibold text-dash-text">{postDetails.post.title}</h4>
              </div>
              <button
                onClick={() => setSelectedPostId(null)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-dash-textMuted transition-colors hover:bg-dash-surface hover:text-dash-text"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
              <div className="rounded-2xl border border-dash-border bg-dash-surface/50 p-4">
                <div className="mb-2 flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-[11px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-500/15">
                    {initials(postDetails.post.author_name)}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold text-dash-text">{postDetails.post.author_name || 'Member'}</div>
                    <div className="text-[11px] text-dash-textMuted">{new Date(postDetails.post.created_at).toLocaleString('en-ZA')}</div>
                  </div>
                  <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.1em] text-dash-textMuted">Original post</span>
                </div>
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-dash-text">{postDetails.post.content}</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-dash-border" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-dash-textMuted">
                  {postDetails.comments.length} {postDetails.comments.length === 1 ? 'reply' : 'replies'}
                </span>
                <div className="h-px flex-1 bg-dash-border" />
              </div>

              <div className="space-y-3">
                {postDetails.comments.map((comment: any) => (
                  <div
                    key={comment.id}
                    className={`rounded-2xl border p-4 ${
                      comment.is_lena ? 'border-violet-200 bg-violet-50/60' : 'border-dash-border bg-white'
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      {comment.is_lena ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700 ring-1 ring-inset ring-violet-600/20 [&_svg]:size-3">
                          <Bot /> AI answer
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-dash-text">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-50 text-[10px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-500/15">
                            {initials(comment.author_name)}
                          </span>
                          {comment.author_name || 'Member'}
                        </span>
                      )}
                      <span className="text-[11px] text-dash-textMuted">
                        {new Date(comment.created_at).toLocaleString('en-ZA')}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-dash-text">{comment.content}</p>
                  </div>
                ))}
                {postDetails.comments.length === 0 && (
                  <p className="py-4 text-center text-[12px] text-dash-textMuted">
                    No replies yet — be the first to respond.
                  </p>
                )}
              </div>
            </div>

            <form onSubmit={handleAddComment} className="flex gap-2 border-t border-dash-border px-4 py-3">
              <input
                type="text"
                required
                placeholder="Your name"
                value={visitorCommentName}
                onChange={(e) => setVisitorCommentName(e.target.value)}
                className={inputCls + ' w-1/3'}
              />
              <input
                type="text"
                required
                placeholder="Write a reply…"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className={inputCls + ' flex-1'}
              />
              <button
                type="submit"
                disabled={submittingComment}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500 text-white transition-colors hover:bg-sky-600 disabled:opacity-60"
              >
                {submittingComment ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
