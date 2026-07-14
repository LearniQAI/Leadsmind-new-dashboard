'use client';

import React, { useState, useEffect } from 'react';
import { sendMessage } from '@/app/actions/messaging';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ConversationList } from '@/components/conversations/ConversationList';
import { ConversationThread } from '@/components/conversations/ConversationThread';
import { ContactInfoPanel } from '@/components/conversations/ContactInfoPanel';

export default function ConversationsClient({ initialConversations }: { initialConversations: any[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPanel, setShowPanel] = useState(false);

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

  useEffect(() => {
    if (consolidatedConversations.length > 0 && !activeConvId) {
      setActiveConvId(consolidatedConversations[0].id);
    }
  }, [consolidatedConversations, activeConvId]);

  // Realtime Subscription
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => {
          router.refresh();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router]);

  // Notifications Subscription
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const channel = supabase
      .channel('new-message-notify')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as any;
          if (msg.direction === 'inbound') {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('New message', {
                body: msg.content || 'New inbound message received',
                icon: '/favicon.ico'
              });
            } else if ('Notification' in window && Notification.permission !== 'denied') {
              Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                  new Notification('New message', {
                    body: msg.content || 'New inbound message received',
                    icon: '/favicon.ico'
                  });
                }
              });
            }
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

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

  return (
    <div className="flex h-[calc(100vh-140px)] bg-white rounded-[24px] overflow-hidden border border-dash-border shadow-sm mx-6">
      {/* 1. Conversation List (280px) */}
      <ConversationList 
        conversations={filteredConversations}
        activeId={activeConvId}
        onSelect={setActiveConvId}
        filter={filter}
        onFilterChange={setFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        assigneeFilter={assigneeFilter}
        onAssigneeFilterChange={setAssigneeFilter}
      />

      {/* 2. Main Thread (flex: 1) */}
      <ConversationThread 
        conversation={activeConv}
        onSendMessage={handleSend}
        isSending={isSending}
        onTogglePanel={() => setShowPanel(p => !p)}
      />

      {/* 3. Contact Info Panel (240px) */}
      {activeConv && activeConv.contacts && showPanel && (
        <ContactInfoPanel contact={activeConv.contacts} conversation={activeConv} />
      )}
    </div>
  );
}
