'use client';

// Premium in-app toast for a new inbound message on any Communications channel.
//
// Driven by the same `notifications` rows the header bell streams (written once per inserted message
// by the on_new_message_notification trigger), so a message can never toast twice: one row, one
// toast. Timing-agnostic on purpose — it appears when the message is stored, whether that came from a
// push channel or Gmail's per-minute sync.
//
// Calm under load: one toast per conversation (a second message replaces the first), a burst of
// several collapses into a single summary, and nothing shows for a thread already open on screen.

import React from 'react';
import { toast } from 'sonner';
import { X, ArrowRight, Mic } from 'lucide-react';
import { PlatformBadge, getPlatformMeta } from '@/components/conversations/platformMeta';
import { isConversationOnScreen } from '@/lib/conversations/unreadStore';

export interface MessageNotification {
  id: string;
  title: string | null;
  message: string | null;
  link: string | null;
  metadata?: {
    conversation_id?: string;
    platform?: string;
    contact_name?: string;
    subject?: string | null;
    has_audio?: boolean;
  } | null;
}

const BURST_WINDOW_MS = 10_000;
const BURST_THRESHOLD = 4;
const recent: number[] = [];

/** Only same-app paths: a notification row is data, never a place to send the user off-site. */
export function safeInternalLink(link: string | null | undefined): string {
  return typeof link === 'string' && link.startsWith('/') && !link.startsWith('//') && !link.includes('\\')
    ? link
    : '/conversations';
}

const initials = (name: string) =>
  name.replace(/[^\p{L}\p{N} ]/gu, ' ').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('') || '?';

function MessageToastCard({ n, onOpen, onClose }: { n: MessageNotification; onOpen: () => void; onClose: () => void }) {
  const meta = n.metadata || {};
  const name = meta.contact_name || n.title || 'New message';
  const channel = getPlatformMeta(meta.platform);
  const preview = meta.has_audio && !n.message ? 'Voice note' : n.message || '';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      aria-label={`New ${channel.label} message from ${name}. Open conversation.`}
      className="group relative w-[360px] max-w-[calc(100vw-32px)] cursor-pointer overflow-hidden rounded-2xl border border-dash-accent/25
        bg-white text-left outline-none focus-visible:ring-2 focus-visible:ring-dash-accent focus-visible:ring-offset-2
        animate-[lm-toast-in_340ms_cubic-bezier(0.2,0.9,0.3,1.15),lm-toast-glow_900ms_ease-out_1] motion-reduce:animate-none
        shadow-[0_18px_40px_-12px_rgba(19,89,255,0.38)]"
    >
      <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-dash-accent" />
      <div className="flex gap-3 py-3.5 pl-4 pr-3">
        <div className="relative flex-shrink-0">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-dash-accent text-[13px] font-bold text-white shadow-[0_4px_12px_-3px_rgba(19,89,255,0.7)]">
            {initials(name)}
          </span>
          <span className="absolute -bottom-1 -right-1 rounded-md ring-2 ring-white">
            <PlatformBadge platform={meta.platform} size={18} />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13.5px] font-bold !text-dash-text">{name}</span>
            <span className="flex-shrink-0 rounded-full bg-dash-accent/10 px-1.5 py-px text-[10px] font-semibold text-dash-accent">
              {channel.label}
            </span>
          </div>
          {meta.subject && meta.platform === 'email' && (
            <p className="mt-0.5 truncate text-[12px] font-semibold !text-dash-text">{meta.subject}</p>
          )}
          <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug !text-dash-textMuted">
            {meta.has_audio && <Mic className="mr-1 inline h-3 w-3 -translate-y-px" aria-hidden />}
            {preview}
          </p>
          <span className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] font-semibold text-dash-accent">
            Open conversation
            <ArrowRight className="h-3 w-3 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
          </span>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="h-6 w-6 flex-shrink-0 rounded-md text-slate-400 hover:bg-dash-surface hover:text-slate-600 flex items-center justify-center"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function BurstToastCard({ count, onOpen, onClose }: { count: number; onOpen: () => void; onClose: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      className="relative w-[360px] max-w-[calc(100vw-32px)] cursor-pointer overflow-hidden rounded-2xl border border-dash-accent/25 bg-white
        animate-[lm-toast-in_340ms_cubic-bezier(0.2,0.9,0.3,1.15)] motion-reduce:animate-none shadow-[0_18px_40px_-12px_rgba(19,89,255,0.38)]"
    >
      <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-dash-accent" />
      <div className="flex items-center gap-3 py-3.5 pl-4 pr-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-dash-accent text-[13px] font-bold text-white tabular-nums">
          {count > 99 ? '99+' : count}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-bold !text-dash-text">{count} new messages</p>
          <p className="text-[12px] !text-dash-textMuted">Across your conversations</p>
        </div>
        <button type="button" aria-label="Dismiss" onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="h-6 w-6 rounded-md text-slate-400 hover:bg-dash-surface hover:text-slate-600 flex items-center justify-center">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

let burstCount = 0;

export function showMessageToast(n: MessageNotification, navigate: (href: string) => void) {
  const conversationId = n.metadata?.conversation_id;
  if (isConversationOnScreen(conversationId)) return;

  const now = Date.now();
  while (recent.length && now - recent[0] > BURST_WINDOW_MS) recent.shift();
  recent.push(now);

  if (recent.length >= BURST_THRESHOLD) {
    burstCount = burstCount && recent.length > BURST_THRESHOLD ? burstCount + 1 : recent.length;
    for (const t of toast.getToasts()) {
      if (typeof t.id === 'string' && t.id.startsWith('lm-msg-') && t.id !== 'lm-msg-burst') toast.dismiss(t.id);
    }
    toast.custom(
      (id) => (
        <BurstToastCard
          count={burstCount}
          onOpen={() => { toast.dismiss(id); navigate('/conversations'); }}
          onClose={() => toast.dismiss(id)}
        />
      ),
      { id: 'lm-msg-burst', duration: 8000, onAutoClose: () => { burstCount = 0; }, onDismiss: () => { burstCount = 0; } },
    );
    return;
  }

  const href = safeInternalLink(n.link);
  toast.custom(
    (id) => (
      <MessageToastCard
        n={n}
        onOpen={() => { toast.dismiss(id); navigate(href); }}
        onClose={() => toast.dismiss(id)}
      />
    ),
    { id: `lm-msg-${conversationId || n.id}`, duration: 7000, unstyled: true },
  );
}

/** Clears the burst window (tests; also safe to call on sign-out / workspace switch). */
export function resetMessageToastState() {
  recent.length = 0;
  burstCount = 0;
}
