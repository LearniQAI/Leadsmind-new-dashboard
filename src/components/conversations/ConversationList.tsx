'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { Search, MessagesSquare, SquarePen } from 'lucide-react';
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
  /** Real per-channel unread totals (same live store as the list's own badges), keyed by raw
   *  conversation.platform — drives the badge on each channel tab. */
  channelUnread?: Record<string, number>;
  /** Real per-channel connection status — drives which empty state a channel
   *  tab shows (a "Connect" prompt vs. plain "no conversations yet"). email
   *  needs no external connection, so it's never 'disconnected' here. */
  channelStatus?: Record<string, 'connected' | 'disconnected'>;
  /** Only meaningful for the email channel — Instagram/Messenger/WhatsApp
   *  don't support cold-messaging a stranger the way email does, so there is
   *  no equivalent "start fresh" action for them. */
  onComposeEmail?: () => void;
  /** Reuses the real existing Meta OAuth connect flow (facebook/instagram/
   *  whatsapp). SMS has no OAuth step — its empty state links to Settings. */
  onConnectChannel?: (platform: string) => void;
}

const OAUTH_CHANNELS = new Set(['facebook', 'instagram', 'whatsapp']);

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
  channelUnread = {},
  channelStatus = {},
  onComposeEmail,
  onConnectChannel,
}: ConversationListProps) {
  const allUnread = Object.values(channelUnread).reduce((n, c) => n + c, 0);
  const channelTabs = [
    { id: 'all', label: 'All', unread: allUnread },
    ...activeChannels.map((id) => ({ id, label: getPlatformMeta(id).label, unread: channelUnread[id] || 0 })),
  ];

  return (
    <div className="w-full border-r border-[#EFEFEF] flex flex-col bg-white h-full shrink-0">
      {/* Header & Tabs */}
      <div className="px-4 pt-4 pb-2 space-y-3">
        {/* Search — pill, no border. Compose is email-only: Instagram/
            Messenger/WhatsApp don't support cold-messaging a stranger the
            way email does, so there's no equivalent action for them. */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-[#8E8E8E]" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-[#EFEFEF] border-none rounded-full pl-10 pr-4 py-2 text-[14px] text-black placeholder:text-[#8E8E8E] focus:outline-none focus:ring-1 focus:ring-black/10 transition-all motion-reduce:transition-none"
            />
          </div>
          {filter === 'email' && onComposeEmail && (
            <button
              onClick={onComposeEmail}
              title="New email"
              className="shrink-0 w-9 h-9 rounded-full bg-black hover:bg-black/85 text-white flex items-center justify-center transition-colors motion-reduce:transition-none"
            >
              <SquarePen className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Channel tabs — icon-first pills that wrap to a new row instead of scrolling/truncating,
            so every channel stays fully visible & labeled regardless of how many exist. */}
        <div className="flex flex-wrap gap-1.5">
          {channelTabs.map((c) => {
            const isActive = filter === c.id;
            const meta = c.id === 'all' ? null : getPlatformMeta(c.id);
            const Icon = meta?.Icon;
            return (
              <button
                key={c.id}
                onClick={() => onFilterChange(c.id)}
                style={
                  isActive && meta
                    ? { backgroundColor: meta.soft, color: meta.color, borderColor: meta.border }
                    : undefined
                }
                className={cn(
                  "inline-flex items-center gap-1.5 shrink-0 h-8 pl-2.5 pr-3 rounded-full border text-[12.5px] font-semibold",
                  "transition-all duration-200 motion-reduce:transition-none",
                  isActive
                    ? meta
                      ? "border-transparent"
                      : "bg-black text-white border-transparent"
                    : "bg-transparent text-[#8E8E8E] border-[#EFEFEF] hover:text-black hover:border-[#D8D8D8] hover:bg-[#FAFAFA]"
                )}
              >
                {Icon && <Icon width={15} height={15} className="shrink-0" />}
                <span>{c.label}</span>
                {c.unread > 0 && (
                  <span
                    className={cn(
                      "shrink-0 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center leading-none",
                      isActive ? "bg-white/70" : "bg-[#EFEFEF] text-[#6B6B6B]"
                    )}
                    style={isActive && meta ? { color: meta.color } : undefined}
                  >
                    {c.unread > 99 ? '99+' : c.unread}
                  </span>
                )}
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
          searchQuery ? (
            <DashEmptyState
              icon={MessagesSquare}
              title="No conversations found"
              description="Try a different search term or clear your filters."
              className="mt-4"
            />
          ) : filter === 'email' ? (
            <DashEmptyState
              icon={getPlatformMeta('email').Icon}
              title="No email conversations yet"
              description="Start a new conversation with any email address — no connection needed."
              actionLabel="New email"
              onAction={onComposeEmail}
              className="mt-4"
            />
          ) : filter === 'sms' && channelStatus.sms !== 'connected' ? (
            <DashEmptyState
              icon={getPlatformMeta('sms').Icon}
              title="SMS isn't configured yet"
              description="Add a Twilio number in Settings to send and receive text messages here."
              actionLabel="Go to Settings"
              actionHref="/settings"
              className="mt-4"
            />
          ) : OAUTH_CHANNELS.has(filter) && channelStatus[filter] !== 'connected' ? (
            <DashEmptyState
              icon={getPlatformMeta(filter).Icon}
              title={`${getPlatformMeta(filter).label} isn't connected yet`}
              description={`Connect your ${getPlatformMeta(filter).label} account to start sending and receiving messages here.`}
              actionLabel={`Connect ${getPlatformMeta(filter).label}`}
              onAction={onConnectChannel ? () => onConnectChannel(filter) : undefined}
              className="mt-4"
            />
          ) : filter === 'all' ? (
            <DashEmptyState
              icon={MessagesSquare}
              title="No conversations found"
              description="New messages from your connected channels will show up here."
              className="mt-4"
            />
          ) : (
            <DashEmptyState
              icon={getPlatformMeta(filter).Icon}
              title="No conversations yet"
              description={`Messages on ${getPlatformMeta(filter).label} will show up here.`}
              className="mt-4"
            />
          )
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
