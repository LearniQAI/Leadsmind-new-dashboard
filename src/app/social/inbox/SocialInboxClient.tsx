'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { MessagesSquare, Loader2, Send, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DashEmptyState } from '@/components/dashboard-ui/EmptyState';
import { getPlatformMeta, PlatformBadge } from '@/components/conversations/platformMeta';
import { getSocialComments, replyToSocialComment } from '@/app/actions/socialComments';

// Only these three platforms have a real comment read/reply API at our current app tier
// (Task 93 audit) — LinkedIn needs Marketing Developer Platform partner access (same tier
// that blocks LinkedIn refresh tokens) and TikTok's public API has no comment endpoints at
// any tier. Neither is a code problem, so neither gets a filter entry here — showing them
// as disabled would imply a future toggle that doesn't exist.
const PLATFORM_FILTERS: { value: string; label: string; metaKey: string }[] = [
 { value: 'all', label: 'All platforms', metaKey: '' },
 { value: 'facebook', label: 'Facebook', metaKey: 'facebook_page' },
 { value: 'instagram', label: 'Instagram', metaKey: 'instagram' },
 { value: 'youtube', label: 'YouTube', metaKey: 'youtube' },
];

// Comments come from a Facebook *Page*, not the Messenger DM channel, so
// they need the plain "f" mark — `facebook_page` in platformMeta, distinct
// from the Messenger bubble used for `facebook` in the Conversations Hub.
function commentMetaKey(platform: string) {
 return platform === 'facebook' ? 'facebook_page' : platform;
}

type SocialComment = {
 id: string;
 platform: string;
 comment_id: string;
 author_name: string | null;
 author_handle: string | null;
 text: string;
 permalink: string | null;
 status: 'new' | 'replied';
 our_reply_text: string | null;
 replied_at: string | null;
 comment_created_at: string | null;
};

function timeAgo(iso: string | null): string {
 if (!iso) return '';
 const diffMs = Date.now() - new Date(iso).getTime();
 const mins = Math.floor(diffMs / 60000);
 if (mins < 1) return 'now';
 if (mins < 60) return `${mins}m`;
 const hrs = Math.floor(mins / 60);
 if (hrs < 24) return `${hrs}h`;
 return `${Math.floor(hrs / 24)}d`;
}

function CommentRowSkeleton() {
 return (
  <div className="flex items-start gap-3 animate-pulse motion-reduce:animate-none">
   <div className="w-9 h-9 rounded-full bg-[#EFEFEF] shrink-0" />
   <div className="flex-1 min-w-0 space-y-2 pt-1">
    <div className="h-3 w-40 rounded bg-[#EFEFEF]" />
    <div className="h-3 w-full max-w-md rounded bg-[#EFEFEF]" />
   </div>
  </div>
 );
}

function CommentRow({ comment, onReplied }: { comment: SocialComment; onReplied: (id: string, replyText: string) => void }) {
 const [replying, setReplying] = useState(false);
 const [replyText, setReplyText] = useState('');
 const [sending, setSending] = useState(false);
 const composerRef = useRef<HTMLDivElement>(null);
 const meta = getPlatformMeta(commentMetaKey(comment.platform));
 const hasReply = comment.status === 'replied' && !!comment.our_reply_text;

 const cancelReply = useCallback(() => {
  setReplying(false);
  setReplyText('');
 }, []);

 const handleSend = async () => {
  if (!replyText.trim()) return;
  setSending(true);
  const result = await replyToSocialComment(comment.id, replyText.trim());
  setSending(false);
  if (result.error) {
   toast.error(result.error);
   return;
  }
  toast.success('Reply posted.');
  onReplied(comment.id, replyText.trim());
  cancelReply();
 };

 // Escape / click-away collapses the inline composer back to the quiet "Reply" link.
 useEffect(() => {
  if (!replying) return;
  const handleKeyDown = (e: KeyboardEvent) => {
   if (e.key === 'Escape') cancelReply();
  };
  const handleClickOutside = (e: MouseEvent) => {
   if (composerRef.current && !composerRef.current.contains(e.target as Node)) cancelReply();
  };
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('mousedown', handleClickOutside);
  return () => {
   document.removeEventListener('keydown', handleKeyDown);
   document.removeEventListener('mousedown', handleClickOutside);
  };
 }, [replying, cancelReply]);

 return (
  <div className="group/row">
   {/* Parent comment — the primary object */}
   <div className="flex items-start gap-3">
    <div className="relative shrink-0">
     <div className="w-9 h-9 rounded-full bg-[#EFEFEF] flex items-center justify-center text-black font-semibold text-[13px] overflow-hidden">
      {(comment.author_name || comment.author_handle || 'U')[0].toUpperCase()}
     </div>
     <PlatformBadge platform={commentMetaKey(comment.platform)} size={16} className="absolute -bottom-0.5 -right-0.5 ring-2 ring-white" />
    </div>

    <div className="flex-1 min-w-0">
     <div className="flex items-start justify-between gap-2">
      <p className="text-[14px] leading-[1.45]">
       <span className="font-semibold text-black">
        {comment.author_name || comment.author_handle || 'Unknown'}
       </span>
       <span className="text-[#8E8E8E]"> · {timeAgo(comment.comment_created_at)}</span>
       {hasReply && (
        <span className="text-[12px] text-[#8E8E8E] ml-1.5 inline-flex items-center gap-1">
         <span className="w-1 h-1 rounded-full bg-green inline-block" />
         Replied
        </span>
       )}
      </p>

      {comment.permalink && (
       <a
        href={comment.permalink}
        target="_blank"
        rel="noreferrer"
        className="text-[#8E8E8E] hover:text-black opacity-0 group-hover/row:opacity-100 transition-opacity motion-reduce:transition-none shrink-0 mt-0.5"
        title="View on platform"
       >
        <ExternalLink className="w-3.5 h-3.5" />
       </a>
      )}
     </div>

     <p className="text-[14px] text-black leading-[1.45] mt-0.5">{comment.text}</p>

     {comment.status === 'new' && !replying && (
      <button
       onClick={() => setReplying(true)}
       className="text-[13px] text-[#8E8E8E] hover:text-black hover:font-semibold font-medium mt-1 transition-colors motion-reduce:transition-none"
      >
       Reply
      </button>
     )}

     {comment.status === 'new' && replying && (
      <div ref={composerRef} className="mt-2 flex items-center gap-2">
       <div className="flex-1 flex items-center bg-[#EFEFEF] rounded-full pl-4 pr-1.5 py-1.5">
        <input
         type="text"
         value={replyText}
         onChange={(e) => setReplyText(e.target.value)}
         onKeyDown={(e) => {
          if (e.key === 'Enter') {
           e.preventDefault();
           handleSend();
          }
         }}
         placeholder="Reply..."
         autoFocus
         disabled={sending}
         className="flex-1 bg-transparent border-none text-[14px] text-black placeholder:text-[#8E8E8E] focus:outline-none focus:ring-0 disabled:opacity-60"
        />
       </div>
       <button
        onClick={handleSend}
        disabled={sending || !replyText.trim()}
        className={cn(
         "w-8 h-8 shrink-0 rounded-full flex items-center justify-center transition-all motion-reduce:transition-none",
         replyText.trim() ? "bg-[#3797F0] text-white" : "bg-[#EFEFEF] text-[#8E8E8E]"
        )}
        title="Send reply"
       >
        {sending ? <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" /> : <Send className="w-4 h-4" />}
       </button>
      </div>
     )}
    </div>
   </div>

   {/* Nested reply — subordinate to the parent, connected by a thin guideline */}
   {hasReply && (
    <div className="ml-[18px] pl-[22px] border-l-2 border-[#EFEFEF] mt-2 pt-2 -mb-0.5">
     <div className="flex items-start gap-2.5">
      <div className="w-6 h-6 rounded-full bg-dash-accent/10 flex items-center justify-center text-dash-accent font-semibold text-[10px] shrink-0">
       Y
      </div>
      <div className="flex-1 min-w-0">
       <p className="text-[13px] leading-[1.45]">
        <span className="font-semibold text-black">You</span>
        <span className="text-[#8E8E8E]"> · {timeAgo(comment.replied_at)}</span>
       </p>
       <p className="text-[13.5px] text-black leading-[1.45] mt-0.5">{comment.our_reply_text}</p>
      </div>
     </div>
    </div>
   )}
  </div>
 );
}

export default function SocialInboxClient() {
 const [comments, setComments] = useState<SocialComment[]>([]);
 const [loading, setLoading] = useState(true);
 const [filter, setFilter] = useState('all');

 const load = useCallback(async (platform: string) => {
  setLoading(true);
  const result = await getSocialComments(platform === 'all' ? undefined : platform);
  if (result.error) toast.error(result.error);
  setComments((result.data as SocialComment[]) || []);
  setLoading(false);
 }, []);

 useEffect(() => { load(filter); }, [filter, load]);

 const handleReplied = (id: string, replyText: string) => {
  setComments(prev => prev.map(c => c.id === id ? { ...c, status: 'replied', our_reply_text: replyText, replied_at: new Date().toISOString() } : c));
 };

 return (
  <div className="p-6 max-w-3xl mx-auto font-body min-h-[calc(100vh-100px)] bg-white">
   <div className="mb-6">
    <h1 className="text-3xl font-bold !text-dash-text">Social <span className="text-dash-accent">inbox</span></h1>
    <p className="!text-dash-textMuted text-[12px] font-medium mt-2">
     Comments from Facebook, Instagram, and YouTube in one place.
    </p>
    <p className="text-[11.5px] text-green mt-1.5 flex items-center gap-1.5">
     <span className="w-1.5 h-1.5 rounded-full bg-green inline-block shrink-0" />
     Read and reply are live-verified for Facebook, Instagram, and YouTube — real comments, real replies posted back.
    </p>
   </div>

   {/* Platform tabs — bare brand marks, understated underline style, matching
       the Conversations Hub channel tabs for cross-surface consistency. */}
   <div className="flex gap-5 overflow-x-auto common-scrollbar border-b border-[#EFEFEF] mb-6">
    {PLATFORM_FILTERS.map((p) => {
     const isActive = filter === p.value;
     const meta = p.metaKey ? getPlatformMeta(p.metaKey) : null;
     return (
      <button
       key={p.value}
       onClick={() => setFilter(p.value)}
       className={cn(
        "shrink-0 pb-2.5 flex items-center gap-1.5 text-[13.5px] transition-colors motion-reduce:transition-none border-b-2",
        isActive ? "font-semibold text-black border-black" : "font-medium text-[#8E8E8E] border-transparent hover:text-black"
       )}
      >
       {meta ? <meta.Icon className="w-3.5 h-3.5" /> : <MessagesSquare className="w-3.5 h-3.5" />}
       {p.label}
      </button>
     );
    })}
   </div>

   {loading ? (
    <div className="flex flex-col gap-7">
     {Array.from({ length: 5 }).map((_, i) => <CommentRowSkeleton key={i} />)}
    </div>
   ) : comments.length === 0 ? (
    <DashEmptyState
     icon={MessagesSquare}
     title="No comments yet"
     description="Comments on your published Facebook, Instagram, and YouTube posts will appear here shortly after they're posted."
    />
   ) : (
    <div className="flex flex-col gap-7">
     {comments.map(c => (
      <CommentRow key={c.id} comment={c} onReplied={handleReplied} />
     ))}
    </div>
   )}
  </div>
 );
}
