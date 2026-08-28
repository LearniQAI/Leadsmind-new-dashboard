'use client';

import React, { useState, useEffect, useRef } from 'react';
import { sendMessage } from '@/app/actions/messaging';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { ConversationList } from '@/components/conversations/ConversationList';
import { ConversationThread } from '@/components/conversations/ConversationThread';
import { ContactInfoPanel } from '@/components/conversations/ContactInfoPanel';

// Messaging channels actually built for the Communications Hub. LinkedIn/
// TikTok/YouTube are Social Planner (publishing) integrations, not
// messaging channels here — kept out of the derived tab set below even if
// stray conversation/connection rows exist for them.
const SUPPORTED_MESSAGING_CHANNELS = new Set(['facebook', 'instagram', 'whatsapp', 'email', 'sms']);

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
            ...m,
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
        ...m,
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
  }, [initialConversations]);

  // Channel tabs are derived, not hardcoded: a platform shows up only if the
  // workspace has it live-connected (platform_connections) OR there's already
  // real conversation history on it. This is what naturally hides an unused
  // channel (e.g. SMS/Email with no active bridge) without us guessing.
  //
  // Capped to the messaging channels actually built for this hub — LinkedIn/
  // TikTok/YouTube are social-publishing integrations (Social Planner), not
  // messaging channels here, and were explicitly not built for the
  // Communications Hub. Stray/legacy conversation rows on those platforms
  // must never surface a tab for a channel that doesn't exist here.
  const activeChannels = React.useMemo(() => {
    const set = new Set<string>();
    connectedPlatforms.forEach((c) => {
      if (c.status === 'connected' && SUPPORTED_MESSAGING_CHANNELS.has(c.platform)) set.add(c.platform);
    });
    initialConversations.forEach((c: any) => {
      if (c.platform && SUPPORTED_MESSAGING_CHANNELS.has(c.platform)) set.add(c.platform);
    });
    return Array.from(set);
  }, [connectedPlatforms, initialConversations]);

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
  // browser (multi-account) never share a channel. On any insert/update we
  // debounce a single `router.refresh()` — `sendMessage` writes several status
  // updates ('sending' -> 'sent' -> 'delivered') in quick succession and we
  // don't want a refresh storm.
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
        () => scheduleRefresh()
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

  const handleSend = async (text: string, targetConvId: string, audioUrl?: string, transcript?: string) => {
    if (!targetConvId) return;
    setIsSending(true);
    const res = await sendMessage(targetConvId, text, audioUrl, transcript);
    if (res.error) {
      toast.error(res.error);
    } else {
      setSearchQuery('');
      router.refresh();
    }
    setIsSending(false);
  };

  const handleSelectConversation = (id: string) => {
    setActiveConvId(id);
    setMobileView('thread');
  };

  return (
    <div className="flex h-[calc(100vh-140px)] bg-white rounded-[24px] overflow-hidden border border-[#EFEFEF] shadow-sm mx-6 relative">
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
  );
}
