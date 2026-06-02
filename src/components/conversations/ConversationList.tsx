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
  assigneeFilter: string;
  onAssigneeFilterChange: (filter: string) => void;
}

const CHANNELS = [
  { id: 'all', icon: 'fa-solid fa-layer-group', label: 'All', color: '#2563eb' },
  { id: 'sms', icon: 'fa-solid fa-comment-dots', label: 'SMS', color: '#10b981' },
  { id: 'email', icon: 'fa-solid fa-envelope', label: 'Email', color: '#3b82f6' },
  { id: 'facebook', icon: 'fa-brands fa-facebook-messenger', label: 'Facebook', color: '#3b82f6' },
  { id: 'instagram', icon: 'fa-brands fa-instagram', label: 'Instagram', color: '#ec4899' },
  { id: 'whatsapp', icon: 'fa-brands fa-whatsapp', label: 'WhatsApp', color: '#25d366' },
];

const STATUS_PILLS: Record<string, string> = {
  open: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  in_progress: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  waiting_for_client: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  resolved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  spam: 'bg-red-500/10 text-red-400 border-red-500/20'
};

export function ConversationList({ 
  conversations, 
  activeId, 
  onSelect, 
  filter, 
  onFilterChange,
  searchQuery,
  onSearchChange,
  assigneeFilter,
  onAssigneeFilterChange
}: ConversationListProps) {

  const getPlatformIcon = (platform: string) => {
    const channel = CHANNELS.find(c => c.id === platform);
    return channel?.icon || 'fa-comment';
  };

  return (
    <div className="w-[280px] border-r border-white/5 flex flex-col bg-[#080f28] h-full shrink-0">
      {/* Header & Tabs */}
      <div className="p-4 border-b border-white/5 space-y-3.5">
        <div className="flex items-center justify-between">
          <h1 className="text-[13px] font-bold text-[#eef2ff] font-space-grotesk uppercase tracking-widest">
            Inbox Channels
          </h1>
          <span className="bg-[#2563eb]/20 text-[#3b82f6] border border-[#2563eb]/30 text-[10px] font-bold px-2 py-0.5 rounded-full font-dm-sans">
            {conversations.length}
          </span>
        </div>

        {/* 1. Channel Filter Scroll */}
        <div className="flex gap-1 overflow-x-auto common-scrollbar pb-1.5">
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

        {/* 2. Assignee Segment Control */}
        <div className="grid grid-cols-3 bg-white/5 p-0.5 rounded-lg border border-white/5 text-[10.5px]">
          <button
            onClick={() => onAssigneeFilterChange('all')}
            className={cn(
              "py-1 font-bold rounded-md transition-all uppercase tracking-wide",
              assigneeFilter === 'all' ? "bg-[#2563eb] text-white" : "text-[#4a5a82] hover:text-white"
            )}
          >
            All
          </button>
          <button
            onClick={() => onAssigneeFilterChange('me')}
            className={cn(
              "py-1 font-bold rounded-md transition-all uppercase tracking-wide",
              assigneeFilter === 'me' ? "bg-[#2563eb] text-white" : "text-[#4a5a82] hover:text-white"
            )}
          >
            Mine
          </button>
          <button
            onClick={() => onAssigneeFilterChange('unassigned')}
            className={cn(
              "py-1 font-bold rounded-md transition-all uppercase tracking-wide",
              assigneeFilter === 'unassigned' ? "bg-[#2563eb] text-white" : "text-[#4a5a82] hover:text-white"
            )}
          >
            Unassigned
          </button>
        </div>

        {/* 3. Search Input */}
        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-[#4a5a82]"></i>
          <input
            type="text"
            placeholder="Search threads..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-white/5 border border-white/5 rounded-[12px] pl-9 pr-4 py-1.5 text-[12px] text-[#eef2ff] placeholder:text-[#4a5a82] focus:outline-none focus:border-[#2563eb]/40 transition-all font-dm-sans"
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

          // Compute SLA breached state for indicators
          let isBreached = false;
          if (latestMessage && latestMessage.direction === 'inbound') {
            const diffMins = (Date.now() - new Date(latestMessage.sent_at).getTime()) / (1000 * 60);
            if (diffMins > 15) {
              isBreached = true;
            }
          }

          const status = conv.status || 'open';

          return (
            <div
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={cn(
                "p-3.5 border-b border-white/5 cursor-pointer transition-all relative group",
                isActive 
                  ? "bg-[#2563eb]/10 border-l-[3px] border-l-[#2563eb]" 
                  : "hover:bg-white/[0.03] border-l-[3px] border-l-transparent"
              )}
            >
              {unread && (
                <div className="absolute left-[2px] top-1/2 -translate-y-1/2 w-[5px] h-[5px] rounded-full bg-[#3b82f6]" />
              )}
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#eef2ff] font-bold text-[12px] shrink-0 font-space-grotesk overflow-hidden mt-0.5">
                  {conv.contacts?.avatar_url ? (
                    <img src={conv.contacts.avatar_url} className="w-full h-full object-cover" />
                  ) : (
                    conv.contacts?.first_name?.[0] || 'U'
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <h4 className="text-[12.5px] font-bold text-[#eef2ff] truncate font-dm-sans">
                      {conv.contacts ? `${conv.contacts.first_name} ${conv.contacts.last_name}` : conv.title}
                    </h4>
                    <span className="text-[9.5px] text-[#4a5a82] font-semibold font-space-grotesk shrink-0 ml-2">
                      {format(new Date(conv.last_message_at), 'hh:mm a')}
                    </span>
                  </div>
                  
                  <p className="text-[11.5px] text-[#94a3c8] truncate font-dm-sans mb-1.5">
                    {latestMessage?.content || 'No messages yet'}
                  </p>
                  
                  {/* Status, SLA & Tag row */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Platform */}
                    <div className="flex items-center gap-1 opacity-60">
                      <i className={cn(getPlatformIcon(conv.platform), "text-[9px] text-[#3b82f6]")}></i>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-[#4a5a82]">
                        {conv.platform}
                      </span>
                    </div>

                    {/* Status Pill */}
                    <span className={cn("text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border scale-90 origin-left", STATUS_PILLS[status])}>
                      {status.replace('_', ' ')}
                    </span>

                    {/* SLA alert */}
                    {isBreached && (
                      <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse">
                        Overdue
                      </span>
                    )}

                    {/* First tag display */}
                    {conv.tags && conv.tags.length > 0 && (
                      <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        {conv.tags[0]}
                      </span>
                    )}
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
