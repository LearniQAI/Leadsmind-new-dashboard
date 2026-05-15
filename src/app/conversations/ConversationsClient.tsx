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
  const [activeConvId, setActiveConvId] = useState<string | null>(initialConversations[0]?.id || null);
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

  const filteredConversations = initialConversations.filter(c => {
    const matchesFilter = filter === 'all' || c.platform === filter;
    const matchesSearch = !searchQuery || 
      c.contacts?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contacts?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const activeConv = initialConversations.find(c => c.id === activeConvId);

  const handleSend = async (text: string) => {
    if (!activeConvId) return;
    setIsSending(true);
    const res = await sendMessage(activeConvId, text);
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
