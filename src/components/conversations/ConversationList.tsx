'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { Search, MessagesSquare } from 'lucide-react';
import { DashEmptyState } from '@/components/dashboard-ui/EmptyState';
import { getPlatformMeta, PlatformBadge, type ConversationPlatform } from './platformMeta';

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
  activeChannels?: string[];
}

function formatThreadTimestamp(dateStr: string) {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, 'hh:mm a');
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d');
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  filter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  assigneeFilter,
  onAssigneeFilterChange,
  activeChannels = [],
}: ConversationListProps) {
  const channelTabs = [
    { id: 'all', label: 'All' },
    ...activeChannels.map((id) => ({ id, label: getPlatformMeta(id).label })),
  ];

  return (
    <div className="w-full border-r border-[#EFEFEF] flex flex-col bg-white h-full shrink-0">
      {/* Header & Tabs */}
      <div className="px-4 pt-4 pb-2 space-y-3">
        {/* Search — pill, no border */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-[#8E8E8E]" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-[#EFEFEF] border-none rounded-full pl-10 pr-4 py-2 text-[14px] text-black placeholder:text-[#8E8E8E] focus:outline-none focus:ring-1 focus:ring-black/10 transition-all motion-reduce:transition-none"
          />
        </div>

        {/* Channel tabs — text-forward, Instagram tab-bar style */}
        <div className="flex gap-4 overflow-x-auto common-scrollbar">
          {channelTabs.map((c) => {
            const isActive = filter === c.id;
            return (
              <button
                key={c.id}
                onClick={() => onFilterChange(c.id)}
                className={cn(
                  "shrink-0 pb-2 text-[13.5px] transition-colors motion-reduce:transition-none border-b-2",
                  isActive
                    ? "font-semibold text-black border-black"
                    : "font-medium text-[#8E8E8E] border-transparent hover:text-black"
                )}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Assignee segmented control — kept independent from the channel
            filter (the two compose: e.g. "Mine" + "Instagram"), restyled onto
            the neutral black/grey palette instead of the brand-blue accent. */}
        <div className="grid grid-cols-3 bg-[#EFEFEF] p-0.5 rounded-full text-[11px] h-7">
          <button
            onClick={() => onAssigneeFilterChange('all')}
            className={cn(
              "font-semibold rounded-full transition-all motion-reduce:transition-none h-full flex items-center justify-center",
              assigneeFilter === 'all' ? "bg-white text-black shadow-sm" : "text-[#8E8E8E] hover:text-black"
            )}
          >
            All
          </button>
          <button
            onClick={() => onAssigneeFilterChange('me')}
            className={cn(
              "font-semibold rounded-full transition-all motion-reduce:transition-none h-full flex items-center justify-center",
              assigneeFilter === 'me' ? "bg-white text-black shadow-sm" : "text-[#8E8E8E] hover:text-black"
            )}
          >
            Mine
          </button>
          <button
            onClick={() => onAssigneeFilterChange('unassigned')}
            className={cn(
              "font-semibold rounded-full transition-all motion-reduce:transition-none h-full flex items-center justify-center",
              assigneeFilter === 'unassigned' ? "bg-white text-black shadow-sm" : "text-[#8E8E8E] hover:text-black"
            )}
          >
            Unassigned
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto common-scrollbar">
        {conversations.length === 0 ? (
          <DashEmptyState
            icon={MessagesSquare}
            title="No conversations found"
            description={searchQuery ? "Try a different search term or clear your filters." : "New messages from your connected channels will show up here."}
            className="mt-4"
          />
        ) : (
          conversations.map((conv) => {
            const isActive = activeId === conv.id;
            const sortedMessages = conv.messages?.slice().sort((a: any, b: any) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());
            const latestMessage = sortedMessages?.[0];
            const unread = conv.unread_count > 0;
            const primaryPlatform: ConversationPlatform = conv.availablePlatforms?.[0]?.platform || conv.platform;
            const contactName = conv.contacts ? `${conv.contacts.first_name} ${conv.contacts.last_name || ''}`.trim() : conv.title;

            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={cn(
                  "w-full text-left px-4 py-[10px] transition-colors motion-reduce:transition-none",
                  isActive ? "bg-[#EFEFEF]" : "hover:bg-[#FAFAFA]"
                )}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar with platform badge overlay */}
                  <div className="relative shrink-0">
                    <div className="w-14 h-14 rounded-full bg-[#EFEFEF] flex items-center justify-center text-black font-semibold text-[16px] overflow-hidden">
                      {conv.contacts?.avatar_url ? (
                        <img src={conv.contacts.avatar_url} alt={contactName || 'Contact avatar'} className="w-full h-full object-cover" />
                      ) : (
                        (contactName?.[0] || 'U').toUpperCase()
                      )}
                    </div>
                    <PlatformBadge
                      platform={primaryPlatform}
                      size={18}
                      className="absolute -bottom-0.5 -right-0.5 ring-2 ring-white"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline gap-2">
                      <h4 className="text-[14px] font-semibold text-black truncate">
                        {contactName || 'Unknown contact'}
                      </h4>
                      <span className="text-[12px] text-[#8E8E8E] shrink-0">
                        {formatThreadTimestamp(conv.last_message_at)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className={cn(
                        "text-[14px] truncate flex-1",
                        unread ? "text-black font-medium" : "text-[#8E8E8E] font-normal"
                      )}>
                        {latestMessage?.direction === 'outbound' && <span>You: </span>}
                        {latestMessage?.content || 'No messages yet'}
                      </p>
                      {unread && (
                        conv.unread_count > 1 ? (
                          <span className="shrink-0 min-w-[18px] h-[18px] px-1.5 rounded-full bg-[#3797F0] text-white text-[10px] font-semibold flex items-center justify-center">
                            {conv.unread_count > 9 ? '9+' : conv.unread_count}
                          </span>
                        ) : (
                          <span className="shrink-0 w-2 h-2 rounded-full bg-[#3797F0]" />
                        )
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
