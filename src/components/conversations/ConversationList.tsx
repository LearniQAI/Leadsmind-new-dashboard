'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ConversationListProps {
  conversations: any[];
  activeId: string | null;
  onSelect: (id: string) => void;
  filter: string;
  onFilterChange: (filter: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const CHANNELS = [
  { id: 'all', icon: 'fa-solid fa-layer-group', label: 'All', color: '#2563eb' },
  { id: 'sms', icon: 'fa-solid fa-comment-dots', label: 'SMS', color: '#10b981' },
  { id: 'email', icon: 'fa-solid fa-envelope', label: 'Email', color: '#3b82f6' },
  { id: 'facebook', icon: 'fa-brands fa-facebook-messenger', label: 'Facebook', color: '#3b82f6' },
  { id: 'instagram', icon: 'fa-brands fa-instagram', label: 'Instagram', color: '#ec4899' },
  { id: 'whatsapp', icon: 'fa-brands fa-whatsapp', label: 'WhatsApp', color: '#25d366' },
];

export function ConversationList({ 
  conversations, 
  activeId, 
  onSelect, 
  filter, 
  onFilterChange,
  searchQuery,
  onSearchChange
}: ConversationListProps) {

  const getPlatformIcon = (platform: string) => {
    const channel = CHANNELS.find(c => c.id === platform);
    return channel?.icon || 'fa-comment';
  };

  return (
    <div className="w-[280px] border-r border-white/5 flex flex-col bg-[#080f28] h-full shrink-0">
      {/* Header & Tabs */}
      <div className="p-5 border-b border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-[15px] font-semibold text-[#eef2ff] font-space-grotesk uppercase tracking-tight">
            Conversations
          </h1>
          <span className="bg-[#2563eb] text-white text-[10px] font-bold px-2 py-0.5 rounded-full font-dm-sans">
            {conversations.length}
          </span>
        </div>

        <div className="flex gap-1 overflow-x-auto common-scrollbar pb-2">
          {CHANNELS.map(c => (
            <button
              key={c.id}
              onClick={() => onFilterChange(c.id)}
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0",
                filter === c.id 
                  ? "bg-[#2563eb] text-white" 
                  : "bg-white/5 text-[#4a5a82] hover:text-[#eef2ff] hover:bg-white/10"
              )}
              title={c.label}
            >
              {c.id === 'all' ? (
                <span className="text-[9px] font-black uppercase">All</span>
              ) : (
                <i className={cn(c.icon, "text-[12px]")}></i>
              )}
            </button>
          ))}
        </div>

        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-[#4a5a82]"></i>
          <input
            type="text"
            placeholder="Search threads..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-white/5 border border-white/5 rounded-[12px] pl-9 pr-4 py-2 text-[13px] text-[#eef2ff] placeholder:text-[#4a5a82] focus:outline-none focus:border-[#2563eb]/40 transition-all font-dm-sans"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto common-scrollbar">
        {conversations.map(conv => {
          const isActive = activeId === conv.id;
          const sortedMessages = conv.messages?.slice().sort((a: any, b: any) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());
          const latestMessage = sortedMessages?.[0];
          const unread = conv.unread_count > 0;

          return (
            <div
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={cn(
                "p-4 border-b border-white/5 cursor-pointer transition-all relative group",
                isActive 
                  ? "bg-[#2563eb]/10 border-l-[3px] border-l-[#2563eb]" 
                  : "hover:bg-white/[0.03] border-l-[3px] border-l-transparent"
              )}
            >
              {unread && (
                <div className="absolute left-[2px] top-1/2 -translate-y-1/2 w-[5px] h-[5px] rounded-full bg-[#3b82f6]" />
              )}
              
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#eef2ff] font-bold text-[13px] shrink-0 font-space-grotesk overflow-hidden">
                  {conv.contacts?.avatar_url ? (
                    <img src={conv.contacts.avatar_url} className="w-full h-full object-cover" />
                  ) : (
                    conv.contacts?.first_name?.[0] || 'U'
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <h4 className="text-[13px] font-semibold text-[#eef2ff] truncate font-dm-sans">
                      {conv.contacts ? `${conv.contacts.first_name} ${conv.contacts.last_name}` : conv.title}
                    </h4>
                    <span className="text-[10px] text-[#4a5a82] font-medium font-space-grotesk shrink-0 ml-2">
                      {format(new Date(conv.last_message_at), 'hh:mm a')}
                    </span>
                  </div>
                  
                  <p className="text-[12px] text-[#94a3c8] truncate font-dm-sans mb-1">
                    {latestMessage?.content || 'No messages yet'}
                  </p>
                  
                  <div className="flex items-center gap-1.5 opacity-60">
                    <i className={cn(getPlatformIcon(conv.platform), "text-[10px] text-[#3b82f6]")}></i>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#4a5a82]">
                      {conv.platform}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
