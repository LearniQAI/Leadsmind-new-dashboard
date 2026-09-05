'use client';

import React, { useState, useEffect, useRef } from 'react';
import { sendMessage, getMetaAuthUrl } from '@/app/actions/messaging';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

// Graph error codes / types that mean "this account's token is dead" — a send
// failing with one of these is what lights the top-of-inbox re-auth banner.
const AUTH_ERROR_CODES = new Set([10, 102, 190, 200]);
const META_MESSAGING = ['facebook', 'instagram', 'whatsapp'];
const CHANNEL_LABEL: Record<string, string> = { facebook: 'Messenger', instagram: 'Instagram', whatsapp: 'WhatsApp' };
// Every channel tab always renders (regardless of connection/conversation
// history) so an agent can always see what's available and what still needs
// connecting — fixed order, not derived from whatever happens to exist today.
const ALL_CHANNELS = ['instagram', 'facebook', 'whatsapp', 'email', 'sms'];
import { ConversationList } from '@/components/conversations/ConversationList';
import { ConversationThread } from '@/components/conversations/ConversationThread';
import { ContactInfoPanel } from '@/components/conversations/ContactInfoPanel';
import { ComposeEmailModal } from '@/components/conversations/ComposeEmailModal';

export default function ConversationsClient({
  initialConversations,
  connectedPlatforms = [],
  workspaceId = null,
}: {
  initialConversations: any[];
  connectedPlatforms?: { platform: string; status: string }[];
  workspaceId?: string | null;
}) {
  const router = useRouter();
  // Create the browser client once per mount. Calling createClient() in the
  // render body returns a fresh instance every render, which would make the
  // realtime effects below tear down and resubscribe on every state change.
  const [supabase] = useState(() => createClient());
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPanel, setShowPanel] = useState(false);
  // Mobile/tablet layout: only one pane is visible at a time below `lg`.
  const [mobileView, setMobileView] = useState<'list' | 'thread'>('list');

  // Live per-message status overlay (Message Delivery Reliability Part 3). Realtime
  // UPDATEs on `messages` land here keyed by message id and are merged over the
  // server-rendered rows in the memo below — so a bubble goes
  // sending -> sent -> delivered -> read (or -> retrying -> failed) in place, with
  // NO full-page router.refresh() flash. INSERTs / new conversations still refresh.
  const [liveMessagePatches, setLiveMessagePatches] = useState<Map<string, any>>(() => new Map());

  // A fresh server render is authoritative — drop stale overlays when it arrives.
  useEffect(() => {
    setLiveMessagePatches(new Map());
  }, [initialConversations]);

  // Compose ("New email") gap fix — a brand-new conversation has no prior
  // message to carry a subject line, so the subject picked in the Compose
  // modal is stashed here and applied to exactly the FIRST send into that
  // conversation (via handleSend below), then cleared. Every other channel/
  // every subsequent reply is unaffected — MessageInput/ConversationThread
  // need no changes at all for this.
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [pendingComposeSubject, setPendingComposeSubject] = useState<{ conversationId: string; subject: string } | null>(null);

  // Fetch current user on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setCurrentUser(data.user);
      }
    });
  }, [supabase]);

  // Consolidate conversations by contact_id
  const consolidatedConversations = React.useMemo(() => {
    const contactMap: Record<string, any> = {};
    const singleConvs: any[] = [];

    // Merge any live status overlay onto a raw message row. Identity is preserved
    // for unpatched rows so React only re-renders the bubbles that actually moved.
    const withPatch = (m: any) => {
      const p = m?.id ? liveMessagePatches.get(m.id) : undefined;
      return p ? { ...m, ...p } : m;
    };

    initialConversations.forEach((conv) => {
      const contact = Array.isArray(conv.contacts) ? conv.contacts[0] : conv.contacts;
      const contactId = contact?.id;

      if (!contactId) {
        singleConvs.push({
          ...conv,
          contacts: contact,
          isConsolidated: false,
          availablePlatforms: [{ platform: conv.platform, conversationId: conv.id }],
          messages: (conv.messages || []).map((m: any) => ({
            ...withPatch(m),
            platform: conv.platform,
            conversationId: conv.id
          })),
          tags: conv.tags || [],
          status: conv.status || 'open',
          assigned_to: conv.assigned_to
        });
        return;
      }

      if (!contactMap[contactId]) {
        contactMap[contactId] = {
          id: `contact:${contactId}`,
          contact_id: contactId,
          contacts: contact,
          title: conv.title,
          last_message_at: conv.last_message_at,
          platform: conv.platform,
          isConsolidated: true,
          unread_count: 0,
          availablePlatforms: [],
          messages: [],
          tags: conv.tags || [],
          status: conv.status || 'open',
          assigned_to: conv.assigned_to,
          last_customer_message_at: conv.last_customer_message_at
        };
      }

      const entry = contactMap[contactId];
      if (new Date(conv.last_message_at).getTime() > new Date(entry.last_message_at).getTime()) {
        entry.last_message_at = conv.last_message_at;
        entry.platform = conv.platform;
        entry.title = conv.title;
        entry.status = conv.status || entry.status;
        entry.assigned_to = conv.assigned_to || entry.assigned_to;
        if (conv.last_customer_message_at) {
          entry.last_customer_message_at = conv.last_customer_message_at;
        }
      }
      entry.unread_count += (conv.unread_count || 0);
      
      // Merge tags
      if (conv.tags && Array.isArray(conv.tags)) {
        const merged = new Set([...entry.tags, ...conv.tags]);
        entry.tags = Array.from(merged);
      }

      // Prevent duplicate platform connections
      if (!entry.availablePlatforms.some((p: any) => p.platform === conv.platform)) {
        entry.availablePlatforms.push({ platform: conv.platform, conversationId: conv.id });
      }

      const convMessages = (conv.messages || []).map((m: any) => ({
        ...withPatch(m),
        platform: conv.platform,
        conversationId: conv.id
      }));
      entry.messages.push(...convMessages);
    });

    const allConsolidated = [...Object.values(contactMap), ...singleConvs];

    // Sort messages in chronological order (oldest first for display in list from bottom)
    allConsolidated.forEach((conv) => {
      conv.messages.sort((a: any, b: any) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime());
    });

    return allConsolidated.sort((a: any, b: any) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
  }, [initialConversations, liveMessagePatches]);

  // Channels whose token looks dead — either the connection row is in 'error', or
  // a visible outbound message failed with a Graph auth error. Drives the
  // top-of-inbox re-auth banner (PRD 5.4).
  const reauthPlatforms = React.useMemo(() => {
    const set = new Set<string>();
    connectedPlatforms.forEach((c) => {
      if (c.status === 'error' && META_MESSAGING.includes(c.platform)) set.add(c.platform);
    });
    consolidatedConversations.forEach((conv: any) => {
      (conv.messages || []).forEach((m: any) => {
        if (m.direction !== 'outbound' || m.status !== 'failed') return;
        const code = m.metadata?.error_code;
        if (m.metadata?.error_type === 'OAuthException' || (typeof code === 'number' && AUTH_ERROR_CODES.has(code))) {
          const p = m.platform || conv.platform;
          if (META_MESSAGING.includes(p)) set.add(p);
        }
      });
    });
    return Array.from(set);
  }, [connectedPlatforms, consolidatedConversations]);

  // Channel tabs ALWAYS render, regardless of connection status or existing
  // conversation history — an agent needs to see every channel to know what's
  // available and what still needs connecting, not just the ones that already
  // happen to have data. (Previously this only showed a channel once it had a
  // live platform_connections row or at least one conversation — which meant
  // Email, needing neither, could never be discovered before a first
  // conversation existed. Fixed uniformly for all channels, not as an
  // Email-only special case.)
  //
  // Capped to the messaging channels actually built for this hub — LinkedIn/
  // TikTok/YouTube are social-publishing integrations (Social Planner), not
  // messaging channels here, and were explicitly not built for the
  // Communications Hub. Stray/legacy conversation rows on those platforms
  // must never surface a tab for a channel that doesn't exist here.
  const activeChannels = ALL_CHANNELS;

  // Real per-channel connection status, used to pick the right empty state
  // (a "Connect" prompt vs. a plain "no conversations yet"):
  //  - facebook/instagram/whatsapp: platform_connections.status.
  //  - sms: synthesized in getConnectedPlatforms() from workspaces.twilio_number
  //    (there's no platform_connections row for SMS today).
  //  - email: needs no external connection at all — just the workspace's
  //    existing send configuration — so it's never "disconnected" here; its
  //    empty state is the Compose prompt, not a connect prompt.
  const channelStatus = React.useMemo(() => {
    const status: Record<string, 'connected' | 'disconnected'> = { email: 'connected' };
    for (const platform of ['facebook', 'instagram', 'whatsapp', 'sms']) {
      const row = connectedPlatforms.find((c: any) => c.platform === platform);
      status[platform] = row?.status === 'connected' ? 'connected' : 'disconnected';
    }
    return status;
  }, [connectedPlatforms]);

  useEffect(() => {
    if (consolidatedConversations.length > 0 && !activeConvId) {
      setActiveConvId(consolidatedConversations[0].id);
    }
  }, [consolidatedConversations, activeConvId]);

  // Realtime Subscription — live message delivery for the Communications Hub.
  //
  // Every `postgres_changes` binding is filtered to `workspace_id=eq.<active
  // workspace>` so a subscriber only ever receives changes for their own
  // workspace's conversations. This is defence-in-depth on top of the RLS
  // policies (`check_workspace_access(workspace_id)` on both tables), which
  // Realtime already enforces per subscriber JWT — a tampered cookie value
  // simply yields zero events because RLS rejects the non-member.
  //
  // The channel name is workspace-scoped so two workspaces open in the same
  // browser (multi-account) never share a channel.
  //
  // messages UPDATE  -> targeted per-bubble patch (status/metadata), no refresh.
  // messages INSERT   -> debounced router.refresh() (a new row needs the contact
  //                      join + re-consolidation the patch overlay can't do).
  // conversations *   -> debounced router.refresh().
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!workspaceId) return;
    if (typeof window === 'undefined') return;

    const wsFilter = `workspace_id=eq.${workspaceId}`;

    const scheduleRefresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => router.refresh(), 300);
    };

    const notifyInbound = (msg: any) => {
      if (!msg || msg.direction !== 'inbound') return;
      if (!('Notification' in window)) return;
      if (Notification.permission === 'granted') {
        new Notification('New message', {
          body: msg.content || 'New inbound message received',
          icon: '/favicon.ico',
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            new Notification('New message', {
              body: msg.content || 'New inbound message received',
              icon: '/favicon.ico',
            });
          }
        });
      }
    };

    const channel = supabase
      .channel(`conversations-hub:${workspaceId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: wsFilter },
        (payload) => {
          notifyInbound(payload.new);
          scheduleRefresh();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: wsFilter },
        (payload) => {
          const row: any = payload.new;
          if (!row?.id) { scheduleRefresh(); return; }
          setLiveMessagePatches((prev) => {
            const next = new Map(prev);
            next.set(row.id, { status: row.status, metadata: row.metadata, external_id: row.external_id });
            return next;
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations', filter: wsFilter },
        () => scheduleRefresh()
      )
      .subscribe();

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      supabase.removeChannel(channel);
    };
  }, [supabase, router, workspaceId]);

  const filteredConversations = consolidatedConversations.filter(c => {
    const matchesFilter = filter === 'all' || c.availablePlatforms.some((p: any) => p.platform === filter);
    const matchesSearch = !searchQuery || 
      c.contacts?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contacts?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title?.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesAssignment = true;
    if (assigneeFilter === 'me') {
      matchesAssignment = c.assigned_to === currentUser?.id;
    } else if (assigneeFilter === 'unassigned') {
      matchesAssignment = !c.assigned_to;
    }

    return matchesFilter && matchesSearch && matchesAssignment;
  });

  const activeConv = consolidatedConversations.find(c => c.id === activeConvId);

  const handleSend = async (text: string, targetConvId: string, audioUrl?: string, transcript?: string, clientMessageUuid?: string) => {
    if (!targetConvId) return;
    setIsSending(true);
    // Compose gap fix: a subject picked in the "New email" modal applies only
    // to the very first send into that brand-new conversation, then clears —
    // every other channel and every subsequent reply is untouched.
    const composeSubject = pendingComposeSubject?.conversationId === targetConvId ? pendingComposeSubject.subject : undefined;
    if (composeSubject !== undefined) setPendingComposeSubject(null);
    const res = await sendMessage(targetConvId, text, audioUrl, transcript, clientMessageUuid, composeSubject);
    if (res.error) {
      toast.error(res.error);
    } else {
      if ((res as { retrying?: boolean }).retrying) {
        // Recoverable send hiccup — a background retry is queued. Keep it low-key.
        toast('Delivery is taking longer than usual — retrying automatically.');
      }
      setSearchQuery('');
      router.refresh();
    }
    setIsSending(false);
  };

  const handleSelectConversation = (id: string) => {
    setActiveConvId(id);
    setMobileView('thread');
  };

  // Compose gap fix — the modal only creates the real contact + conversation;
  // the actual message (text or voice note) is composed exactly like any
  // other conversation, through the existing ConversationThread/MessageInput
  // UI, once we switch to it.
  const handleComposeStarted = ({ conversationId, contactId, subject }: { conversationId: string; contactId: string; subject: string }) => {
    if (subject) setPendingComposeSubject({ conversationId, subject });
    // Consolidated list entries are keyed by `contact:${contactId}` for any
    // conversation with a real contact (see consolidatedConversations above) —
    // matching that convention is what makes the new thread selectable
    // immediately once router.refresh() below lands it in initialConversations.
    setActiveConvId(`contact:${contactId}`);
    setMobileView('thread');
    router.refresh();
  };

  // One-tap retry on a failed bubble: re-send the SAME text through the SAME
  // path with the SAME client_message_uuid (Part 1 reactivates the failed row in
  // place — no duplicate, no retype).
  const handleRetryMessage = (msg: any) => {
    if (!msg?.conversationId || !msg?.content) return;
    if (msg.id) {
      // Optimistic flip to 'sending' so the bubble responds instantly.
      setLiveMessagePatches((prev) => {
        const next = new Map(prev);
        next.set(msg.id, { status: 'sending', metadata: { ...(msg.metadata || {}), error_message: null }, external_id: msg.external_id ?? null });
        return next;
      });
    }
    void handleSend(msg.content, msg.conversationId, undefined, undefined, msg.metadata?.client_message_uuid);
  };

  const handleReconnect = async (platform: string) => {
    try {
      const url = await getMetaAuthUrl(platform);
      if (url) window.location.href = url;
      else toast.error('Could not start reconnection — open Settings → Integrations.');
    } catch {
      toast.error('Could not start reconnection — open Settings → Integrations.');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      {/* Re-auth banner — top of inbox, PRD 5.4. Shown when a channel's token
          looks dead so the agent sees it once, not once per failed message. */}
      {reauthPlatforms.length > 0 && (
        <div className="mx-6 mt-3 rounded-2xl bg-[#FFF4E5] border border-[#FDE4BB] px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <AlertTriangle className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" />
            <p className="text-[12.5px] text-[#B45309] leading-snug">
              {reauthPlatforms.map((p) => CHANNEL_LABEL[p] || p).join(' & ')}{' '}
              {reauthPlatforms.length > 1 ? 'connections need' : 'connection needs'} re-authorization — new messages on{' '}
              {reauthPlatforms.length > 1 ? 'these channels' : 'this channel'} may fail to send until you reconnect.
            </p>
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap">
            {reauthPlatforms.map((p) => (
              <button
                key={p}
                onClick={() => handleReconnect(p)}
                className="text-[11.5px] font-semibold bg-white hover:bg-[#FDE4BB]/40 text-[#B45309] border border-[#FDE4BB] rounded-full px-3 py-1.5 transition-colors motion-reduce:transition-none"
              >
                Reconnect {CHANNEL_LABEL[p] || p}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={cn(
        "flex flex-1 min-h-0 bg-white rounded-[24px] overflow-hidden border border-[#EFEFEF] shadow-sm mx-6 relative",
        reauthPlatforms.length > 0 && "mt-3"
      )}>
      {/* 1. Conversation List — full-width takeover below lg, fixed rail above it */}
      <div className={cn(
        "w-full lg:w-[320px] lg:shrink-0",
        mobileView === 'thread' ? "hidden lg:flex" : "flex"
      )}>
        <ConversationList
          conversations={filteredConversations}
          activeId={activeConvId}
          onSelect={handleSelectConversation}
          filter={filter}
          onFilterChange={setFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          assigneeFilter={assigneeFilter}
          onAssigneeFilterChange={setAssigneeFilter}
          activeChannels={activeChannels}
          channelStatus={channelStatus}
          onComposeEmail={() => setShowComposeModal(true)}
          onConnectChannel={handleReconnect}
        />
      </div>

      {/* 2. Main Thread */}
      <div className={cn(
        "flex-1 min-w-0",
        mobileView === 'list' ? "hidden lg:flex" : "flex"
      )}>
        <ConversationThread
          conversation={activeConv}
          onSendMessage={handleSend}
          onRetryMessage={handleRetryMessage}
          isSending={isSending}
          onTogglePanel={() => setShowPanel(p => !p)}
          onBack={() => setMobileView('list')}
        />
      </div>

      {/* 3. Contact Info Panel — inline rail on xl+, slide-in overlay below it */}
      {activeConv && activeConv.contacts && showPanel && (
        <>
          <div
            className="fixed inset-0 bg-dash-text/20 backdrop-blur-[1px] z-30 xl:hidden"
            onClick={() => setShowPanel(false)}
          />
          <div className="fixed right-0 top-0 bottom-0 z-40 xl:static xl:z-auto animate-in slide-in-from-right duration-200 motion-reduce:animate-none">
            <ContactInfoPanel contact={activeConv.contacts} conversation={activeConv} onClose={() => setShowPanel(false)} />
          </div>
        </>
      )}
      </div>

      <ComposeEmailModal
        open={showComposeModal}
        onOpenChange={setShowComposeModal}
        onStarted={handleComposeStarted}
      />
    </div>
  );
}
