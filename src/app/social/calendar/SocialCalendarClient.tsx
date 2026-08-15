'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Instagram, Facebook, Linkedin, TikTok, YouTube } from '@/components/icons/BrandIcons';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashButton } from '@/components/dashboard-ui/Button';
import { cn } from '@/lib/utils';

const PLATFORM_ICON: Record<string, React.ReactNode> = {
 facebook: <Facebook className="w-full h-full" />,
 instagram: <Instagram className="w-full h-full" />,
 linkedin: <Linkedin className="w-full h-full" />,
 tiktok: <TikTok className="w-full h-full" />,
 youtube: <YouTube className="w-full h-full" />,
};

const STATUS_DOT: Record<string, string> = {
 scheduled: 'bg-dash-accent',
 publishing: 'bg-dash-accent',
 published: 'bg-green',
 failed: 'bg-red',
 cancelled: 'bg-dash-textMuted',
 draft: 'bg-dash-textMuted',
};

// Every post shown on the calendar has to have a real date it belongs on —
// scheduled posts by when they'll fire, published posts by when they actually
// went out, everything else by when it was created. No post is silently dropped.
function postDate(post: any): string {
 return post.scheduled_at || post.published_at || post.created_at;
}

export default function SocialCalendarClient({ posts }: { posts: any[] }) {
 const [cursor, setCursor] = useState(() => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
 });

 const postsByDay = useMemo(() => {
  const map = new Map<string, any[]>();
  for (const post of posts) {
   const d = postDate(post);
   if (!d) continue;
   const key = new Date(d).toDateString();
   if (!map.has(key)) map.set(key, []);
   map.get(key)!.push(post);
  }
  return map;
 }, [posts]);

 const year = cursor.getFullYear();
 const month = cursor.getMonth();
 const firstOfMonth = new Date(year, month, 1);
 const startOffset = firstOfMonth.getDay();
 const daysInMonth = new Date(year, month + 1, 0).getDate();
 const today = new Date();

 const cells: (Date | null)[] = [
  ...Array(startOffset).fill(null),
  ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
 ];
 while (cells.length % 7 !== 0) cells.push(null);

 return (
  <DashCard padding="default">
   <div className="flex items-center justify-between mb-6">
    <h2 className="text-lg font-bold !text-dash-text">
     {cursor.toLocaleString('default', { month: 'long' })} {year}
    </h2>
    <div className="flex items-center gap-2">
     <DashButton variant="ghost" size="sm" onClick={() => setCursor(new Date(year, month - 1, 1))}>
      <ChevronLeft className="w-4 h-4" />
     </DashButton>
     <DashButton variant="ghost" size="sm" onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
      Today
     </DashButton>
     <DashButton variant="ghost" size="sm" onClick={() => setCursor(new Date(year, month + 1, 1))}>
      <ChevronRight className="w-4 h-4" />
     </DashButton>
    </div>
   </div>

   <div className="grid grid-cols-7 gap-2 mb-2">
    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
     <div key={d} className="text-[11px] font-bold !text-dash-textMuted text-center py-1">{d}</div>
    ))}
   </div>

   <div className="grid grid-cols-7 gap-2">
    {cells.map((date, i) => {
     if (!date) return <div key={i} className="min-h-[96px]" />;
     const dayPosts = postsByDay.get(date.toDateString()) || [];
     const isToday = date.toDateString() === today.toDateString();
     return (
      <div
       key={i}
       className={cn(
        'min-h-[96px] rounded-xl border p-2 flex flex-col gap-1',
        isToday ? 'border-dash-accent bg-dash-accent/5' : 'border-dash-border bg-dash-surface'
       )}
      >
       <span className={cn('text-[11px] font-bold', isToday ? 'text-dash-accent' : '!text-dash-textMuted')}>
        {date.getDate()}
       </span>
       <div className="space-y-1 overflow-hidden">
        {dayPosts.slice(0, 3).map(post => (
         <div
          key={post.id}
          title={`${post.status} — ${post.content?.slice(0, 80) || ''}`}
          className="flex items-center gap-1 bg-white border border-dash-border rounded-md px-1.5 py-1"
         >
          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', STATUS_DOT[post.status] || 'bg-dash-textMuted')} />
          <div className="flex -space-x-1">
           {(post.platforms || []).slice(0, 3).map((p: string) => (
            <div key={p} className="w-3 h-3 rounded overflow-hidden shrink-0">{PLATFORM_ICON[p]}</div>
           ))}
          </div>
          <span className="text-[10px] !text-dash-text truncate">{post.content?.slice(0, 24) || '(empty)'}</span>
         </div>
        ))}
        {dayPosts.length > 3 && (
         <span className="text-[10px] font-bold !text-dash-textMuted">+{dayPosts.length - 3} more</span>
        )}
       </div>
      </div>
     );
    })}
   </div>

   <div className="flex items-center gap-4 mt-6 pt-4 border-t border-dash-border text-[11px] font-medium !text-dash-textMuted">
    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-dash-accent" /> Scheduled</span>
    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green" /> Published</span>
    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red" /> Failed</span>
    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-dash-textMuted" /> Cancelled/Draft</span>
    <Link href="/social" className="ml-auto text-dash-accent font-bold hover:text-dash-accent/80">
     Open composer →
    </Link>
   </div>
  </DashCard>
 );
}
