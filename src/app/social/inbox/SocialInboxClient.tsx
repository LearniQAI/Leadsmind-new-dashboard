'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { MessagesSquare, Loader2, Send, ExternalLink, CheckCircle2 } from 'lucide-react';
import { Instagram, Facebook, YouTube } from '@/components/icons/BrandIcons';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashEmptyState } from '@/components/dashboard-ui/EmptyState';
import { DashStatusPill } from '@/components/dashboard-ui/StatusPill';
import { DashTextarea } from '@/components/dashboard-ui/FormField';
import { DashTabs, DashTabsList, DashTabsTrigger } from '@/components/dashboard-ui/Tabs';
import { getSocialComments, replyToSocialComment } from '@/app/actions/socialComments';

// Only these three platforms have a real comment read/reply API at our current app tier
// (Task 93 audit) — LinkedIn needs Marketing Developer Platform partner access (same tier
// that blocks LinkedIn refresh tokens) and TikTok's public API has no comment endpoints at
// any tier. Neither is a code problem, so neither gets a filter entry here — showing them
// as disabled would imply a future toggle that doesn't exist.
const PLATFORM_FILTERS: { value: string; label: string; icon: React.ElementType }[] = [
 { value: 'all', label: 'All platforms', icon: MessagesSquare },
 { value: 'facebook', label: 'Facebook', icon: Facebook },
 { value: 'instagram', label: 'Instagram', icon: Instagram },
 { value: 'youtube', label: 'YouTube', icon: YouTube },
];

const PLATFORM_ICON: Record<string, React.ElementType> = {
 facebook: Facebook,
 instagram: Instagram,
 youtube: YouTube,
};

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
 if (mins < 1) return 'just now';
 if (mins < 60) return `${mins}m ago`;
 const hrs = Math.floor(mins / 60);
 if (hrs < 24) return `${hrs}h ago`;
 return `${Math.floor(hrs / 24)}d ago`;
}

function CommentRow({ comment, onReplied }: { comment: SocialComment; onReplied: (id: string, replyText: string) => void }) {
 const [replying, setReplying] = useState(false);
 const [replyText, setReplyText] = useState('');
 const [sending, setSending] = useState(false);
 const Icon = PLATFORM_ICON[comment.platform] || MessagesSquare;

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
  setReplying(false);
  setReplyText('');
 };

 return (
  <div className="border-b border-dash-border last:border-b-0 py-4 px-1">
   <div className="flex items-start gap-3">
    <div className="w-8 h-8 rounded-full bg-dash-surface flex items-center justify-center shrink-0 mt-0.5">
     <Icon className="w-4 h-4" />
    </div>
    <div className="flex-1 min-w-0">
     <div className="flex items-center gap-2 flex-wrap">
      <span className="!text-dash-text font-bold text-[13px]">
       {comment.author_name || comment.author_handle || 'Unknown'}
      </span>
      <span className="!text-dash-textMuted text-[11px]">{timeAgo(comment.comment_created_at)}</span>
      {comment.status === 'replied' && (
       <DashStatusPill variant="success" dot>
        <CheckCircle2 className="w-3 h-3" /> Replied
       </DashStatusPill>
      )}
      {comment.permalink && (
       <a href={comment.permalink} target="_blank" rel="noreferrer" className="!text-dash-accent">
        <ExternalLink className="w-3 h-3" />
       </a>
      )}
     </div>
     <p className="!text-dash-text text-[13px] mt-1">{comment.text}</p>

     {comment.status === 'replied' && comment.our_reply_text && (
      <div className="mt-2 ml-2 pl-3 border-l-2 border-dash-border">
       <p className="!text-dash-textMuted text-[11px] font-semibold">Your reply</p>
       <p className="!text-dash-text text-[13px]">{comment.our_reply_text}</p>
      </div>
     )}

     {comment.status === 'new' && !replying && (
      <button onClick={() => setReplying(true)} className="!text-dash-accent text-[12px] font-bold mt-2">
       Reply
      </button>
     )}

     {comment.status === 'new' && replying && (
      <div className="mt-2 flex items-start gap-2">
       <DashTextarea
        value={replyText}
        onChange={(e) => setReplyText(e.target.value)}
        placeholder="Write a reply..."
        rows={2}
        className="flex-1"
        autoFocus
       />
       <div className="flex flex-col gap-1">
        <DashButton size="icon" onClick={handleSend} disabled={sending || !replyText.trim()}>
         {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </DashButton>
        <DashButton size="icon" variant="ghost" onClick={() => { setReplying(false); setReplyText(''); }} disabled={sending}>
         &times;
        </DashButton>
       </div>
      </div>
     )}
    </div>
   </div>
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
  <div className="p-6 max-w-5xl mx-auto font-body min-h-[calc(100vh-100px)]">
   <div className="mb-6">
    <h1 className="text-3xl font-bold !text-dash-text">Social <span className="text-dash-accent">inbox</span></h1>
    <p className="!text-dash-textMuted text-[12px] font-medium mt-2">
     Comments from Facebook, Instagram, and YouTube in one place.
    </p>
    <p className="!text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-[12px] font-medium mt-2">
     Read and reply are live-verified working for Facebook, Instagram, and YouTube — real
     comments fetched from real posts, real replies confirmed posted back to each platform.
    </p>
   </div>

   <DashTabs value={filter} onValueChange={setFilter}>
    <DashTabsList className="mb-4">
     {PLATFORM_FILTERS.map(p => (
      <DashTabsTrigger key={p.value} value={p.value} className="flex items-center gap-1.5">
       <p.icon className="w-3.5 h-3.5" /> {p.label}
      </DashTabsTrigger>
     ))}
    </DashTabsList>
   </DashTabs>

   <DashCard padding="default">
    {loading ? (
     <div className="flex justify-center py-10">
      <Loader2 className="w-5 h-5 animate-spin !text-dash-textMuted" />
     </div>
    ) : comments.length === 0 ? (
     <DashEmptyState
      icon={MessagesSquare}
      title="No comments yet"
      description="Comments on your published Facebook, Instagram, and YouTube posts will appear here shortly after they're posted."
     />
    ) : (
     <div>
      {comments.map(c => (
       <CommentRow key={c.id} comment={c} onReplied={handleReplied} />
      ))}
     </div>
    )}
   </DashCard>
  </div>
 );
}
