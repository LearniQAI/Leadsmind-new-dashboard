'use client';

// One live source of unread counts for the whole dashboard (nav badges + the Conversations list).
//
// Counts always come from the database (getUnreadCounts -> conversation_unread_counts), so they
// reflect real read state. Realtime only says WHEN to re-count: the same postgres_changes feed the
// Communications Hub uses — any INSERT into `messages` for this workspace (Meta webhooks, Twilio, the
// Resend inbound webhook and Gmail sync all write there) and this user's `conversation_reads` rows
// (another tab / device reading a thread). One subscription per page, however many badges mount.

import { useSyncExternalStore } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getUnreadCounts, type UnreadCounts } from '@/app/actions/conversationReads';

type State = UnreadCounts & { loaded: boolean };

let state: State = { total: 0, byConversation: {}, loaded: false };
const listeners = new Set<() => void>();
let started: string | null = null;
let channel: any = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let inFlight = false;
let again = false;

/** The conversation ids open on screen right now (a consolidated contact entry = several). */
let activeConversationIds: string[] = [];

function emit() {
  for (const l of listeners) l();
}

async function refresh() {
  if (inFlight) {
    again = true;
    return;
  }
  inFlight = true;
  try {
    const next = await getUnreadCounts();
    state = { ...next, loaded: true };
    emit();
  } finally {
    inFlight = false;
    if (again) {
      again = false;
      void refresh();
    }
  }
}

export function scheduleUnreadRefresh(delayMs = 250) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void refresh();
  }, delayMs);
}

export function startUnreadStore(workspaceId: string | null | undefined) {
  if (!workspaceId || typeof window === 'undefined' || started === workspaceId) return;
  const supabase = createClient();
  if (channel) supabase.removeChannel(channel);
  started = workspaceId;
  state = { total: 0, byConversation: {}, loaded: false };
  void refresh();

  supabase.auth.getUser().then(({ data }) => {
    const userId = data.user?.id;
    channel = supabase
      .channel(`unread-${workspaceId}-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `workspace_id=eq.${workspaceId}` }, (payload: any) => {
        if (payload.new?.direction === 'inbound') scheduleUnreadRefresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_reads', filter: userId ? `user_id=eq.${userId}` : undefined }, () => scheduleUnreadRefresh())
      .subscribe();
  });

  // A backgrounded tab can miss realtime events (socket suspended): re-count on return.
  const onVisible = () => {
    if (document.visibilityState === 'visible') scheduleUnreadRefresh(0);
  };
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('focus', onVisible);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useUnreadCounts(): State {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

/** Optimistic local clear when this user opens a thread; the server write + realtime confirm it. */
export function markReadLocally(conversationIds: string[]) {
  let removed = 0;
  const byConversation = { ...state.byConversation };
  for (const id of conversationIds) {
    removed += byConversation[id] || 0;
    delete byConversation[id];
  }
  if (!removed) return;
  state = { ...state, byConversation, total: Math.max(0, state.total - removed) };
  emit();
}

export function setActiveConversationIds(ids: string[]) {
  activeConversationIds = ids;
}

export function isConversationOnScreen(conversationId: string | null | undefined): boolean {
  return !!conversationId
    && activeConversationIds.includes(conversationId)
    && typeof document !== 'undefined'
    && document.visibilityState === 'visible'
    && window.location.pathname.startsWith('/conversations');
}
