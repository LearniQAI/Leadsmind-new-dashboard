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
          }))
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
          messages: []
        };
      }

      const entry = contactMap[contactId];
      if (new Date(conv.last_message_at).getTime() > new Date(entry.last_message_at).getTime()) {
        entry.last_message_at = conv.last_message_at;
        entry.platform = conv.platform;
        entry.title = conv.title;
      }
      entry.unread_count += (conv.unread_count || 0);
      
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

  const [activeConvId, setActiveConvId] = useState<string | null>(null);

  useEffect(() => {
    if (consolidatedConversations.length > 0 && !activeConvId) {
      setActiveConvId(consolidatedConversations[0].id);
    }
  }, [consolidatedConversations, activeConvId]);

  const [isSending, setIsSending] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Realtime Subscription
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router]);

  const filteredConversations = consolidatedConversations.filter(c => {
    const matchesFilter = filter === 'all' || c.availablePlatforms.some((p: any) => p.platform === filter);
    const matchesSearch = !searchQuery || 
      c.contacts?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contacts?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const activeConv = consolidatedConversations.find(c => c.id === activeConvId);

  const handleSend = async (text: string, targetConvId: string) => {
    if (!targetConvId) return;
    setIsSending(true);
    const res = await sendMessage(targetConvId, text);
    if (res.error) {
      toast.error(res.error);
    } else {
      setSearchQuery('');
      router.refresh();
    }
    setIsSending(false);
  };

  return (
    <div className="flex h-[calc(100vh-140px)] bg-[#04091a] rounded-[24px] overflow-hidden border border-white/5 shadow-2xl mx-6">
      {/* 1. Conversation List (280px) */}
      <ConversationList 
        conversations={filteredConversations}
        activeId={activeConvId}
        onSelect={setActiveConvId}
        filter={filter}
        onFilterChange={setFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* 2. Main Thread (flex: 1) */}
      <ConversationThread 
        conversation={activeConv}
        onSendMessage={handleSend}
        isSending={isSending}
      />

      {/* 3. Contact Info Panel (240px) */}
      {activeConv && activeConv.contacts && (
        <ContactInfoPanel contact={activeConv.contacts} />
      )}
    </div>
  );
}
